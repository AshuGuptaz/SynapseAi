/* ==========================================================
   documents.js — renders the document grid and handles the
                  drag-and-drop upload + real text extraction
   ========================================================== */

const docsGridEl     = document.getElementById('docsGrid');
const uploadZoneEl   = document.getElementById('uploadZone');
const fileInputEl    = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');

let activeDocTab = 'All';

function getTabFilteredDocs() {
  switch (activeDocTab) {
    case 'Recent':
      return SYNAPSE_DOCS.filter(d => /min|hour|just now|yesterday|[2-3] day/i.test(d.date || ''));
    case 'Starred': return SYNAPSE_DOCS.filter(d => d.starred);
    case 'Shared':  return SYNAPSE_DOCS.filter(d => d.shared);
    case 'Trash':   return SYNAPSE_DOCS.filter(d => d.deleted);
    default:        return SYNAPSE_DOCS;
  }
}

const TEXT_LIKE_EXTS = ['txt', 'md', 'csv', 'log', 'json', 'html', 'xml', 'js', 'ts', 'css'];
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

let workerBlobUrl = null;
let workerReady   = null; // Promise that resolves when pdf.js worker is configured
let uploadGen = 0;        // bumped each batch; finishes from older batches are ignored

const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* ---------- pdf.js worker setup ----------
   Cross-origin Workers can't be created from a file:// page directly.
   The most robust path is: fetch the worker source (CORS-allowed by cdnjs)
   and serve it from a same-origin blob URL. We try a few strategies and
   fall back gracefully so the failure mode is informative. */
async function setupPdfWorker() {
  if (!window.pdfjsLib) {
    console.warn('[synapse] pdf.js failed to load from CDN — PDFs will not be searchable.');
    return false;
  }

  // Strategy A: fetch the worker code, host it from a same-origin blob.
  // Works on file:// because cdnjs sends Access-Control-Allow-Origin: *.
  try {
    const r = await fetch(PDFJS_WORKER_URL);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const code = await r.text();
    const blob = new Blob([code], { type: 'application/javascript' });
    workerBlobUrl = URL.createObjectURL(blob);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerBlobUrl;
    console.info('[synapse] pdf.js worker via fetch+blob:', pdfjsLib.version || '?');
    return true;
  } catch (e) {
    console.warn('[synapse] worker fetch+blob failed:', e);
  }

  // Strategy B: importScripts wrapper in a same-origin blob worker.
  try {
    const wrapper = `importScripts('${PDFJS_WORKER_URL}');`;
    const blob = new Blob([wrapper], { type: 'application/javascript' });
    workerBlobUrl = URL.createObjectURL(blob);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerBlobUrl;
    console.info('[synapse] pdf.js worker via importScripts blob');
    return true;
  } catch (e) {
    console.warn('[synapse] worker importScripts-blob failed:', e);
  }

  // Strategy C: point straight at the CDN URL (works on https://).
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    console.info('[synapse] pdf.js worker via direct CDN URL');
    return true;
  } catch (e) {
    console.error('[synapse] all worker strategies failed:', e);
  }

  return false;
}
workerReady = setupPdfWorker();

window.addEventListener('pagehide', () => {
  if (workerBlobUrl) URL.revokeObjectURL(workerBlobUrl);
});

/* ---------- Live counters (sidebar badge + KPI) ---------- */
function updateDocCounts() {
  const n = SYNAPSE_DOCS.length;
  const badge = document.getElementById('docsBadge');
  const kpi   = document.getElementById('kpiDocsIndexed');
  if (badge) badge.textContent = n.toLocaleString();
  if (kpi)   kpi.textContent   = n.toLocaleString();
}
window.updateDocCounts = updateDocCounts;

/* ---------- Render document grid ---------- */
function renderDocs() {
  if (!docsGridEl) return;
  const docs = getTabFilteredDocs();

  if (!docs.length) {
    docsGridEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 24px;color:var(--text-dim);font-size:14px;">No ${activeDocTab.toLowerCase()} documents.</div>`;
    updateDocCounts();
    if (typeof window.renderInsights === 'function')   window.renderInsights();
    if (typeof window.refreshChatContext === 'function') window.refreshChatContext();
    return;
  }

  docsGridEl.innerHTML = docs.map(d => {
    const idx = SYNAPSE_DOCS.indexOf(d);
    const tagsHTML = d.tags
      .map((t, i) => `<span class="doc-tag ${SYNAPSE_TAG_COLORS[i % 4]}">${escapeHTML(t)}</span>`)
      .join('');
    const isProcessing = d.status === 'processing';
    const safeName = escapeHTML(d.name);
    const safeType = escapeHTML(d.type);
    const canDelete = Number.isFinite(d.id);

    return `
      <div class="doc-card" data-doc-idx="${idx}">
        <div class="doc-status ${isProcessing ? 'processing' : ''}">
          <span class="dot"></span>${isProcessing ? 'Indexing' : 'Indexed'}
        </div>
        <div class="doc-icon ${safeType}">${safeType.toUpperCase()}</div>
        <div class="doc-name">${safeName}</div>
        <div class="doc-meta">
          <span>📄 ${d.pages} pg</span>
          <span>💾 ${escapeHTML(d.size)}</span>
          <span>🕒 ${escapeHTML(d.date)}</span>
        </div>
        <div class="doc-tags">${tagsHTML}</div>
        ${canDelete ? `<button type="button" class="doc-delete" data-doc-id="${d.id}" aria-label="Delete">✕</button>` : ''}
      </div>
    `;
  }).join('');
  updateDocCounts();
  if (typeof window.renderInsights === 'function')   window.renderInsights();
  if (typeof window.refreshChatContext === 'function') window.refreshChatContext();
}
renderDocs();

/* ---------- Document tab filtering ---------- */
const tabRowEl = document.querySelector('.docs-toolbar .tab-row');
if (tabRowEl) {
  tabRowEl.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabRowEl.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeDocTab = tab.textContent.trim();
      renderDocs();
    });
  });
}

/* ---------- Hydrate from IndexedDB on startup ---------- */
(async function hydrateFromStorage() {
  if (typeof idbGetAllDocs !== 'function') return;
  const stored = await idbGetAllDocs();
  if (!stored.length) return;
  stored.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  SYNAPSE_DOCS.unshift(...stored);
  renderDocs();

  // For any stored doc that has text but no embeddings yet, compute them.
  for (const d of stored) {
    if (d.text && !d.embeddings) embedDocInBackground(d);
  }
})();

/* ---------- Embed a doc in the background ---------- */
async function embedDocInBackground(docRecord) {
  if (!docRecord.text || !window.embedText || !window.chunkText) return;
  if (docRecord.embeddings && docRecord.chunks) return; // already done
  try {
    const ready = window.semanticReady ? await window.semanticReady : true;
    if (!ready) return;
    const chunks = window.chunkText(docRecord.text, 180, 25);
    if (!chunks.length) return;

    const embeds = [];
    for (const c of chunks) {
      embeds.push(await window.embedText(c.text));
    }
    docRecord.chunks     = chunks;
    docRecord.embeddings = embeds;
    docRecord.embeddedAt = Date.now();

    if (typeof idbPutDoc === 'function' && Number.isFinite(docRecord.id)) {
      await idbPutDoc(docRecord);
    }
    console.info('[synapse] embedded', docRecord.name, '→', chunks.length, 'chunks');
    if (typeof window.refreshChatContext === 'function') window.refreshChatContext();
  } catch (e) {
    console.warn('[synapse] embedDocInBackground failed:', docRecord.name, e);
  }
}
window.embedDocInBackground = embedDocInBackground;

/* ---------- Doc preview modal ---------- */
const previewEl      = document.getElementById('docPreview');
const previewTitleEl = document.getElementById('docPreviewTitle');
const previewBodyEl  = document.getElementById('docPreviewBody');
const previewCloseEl = document.getElementById('docPreviewClose');

function openDocPreview(doc) {
  if (!previewEl) return;
  previewTitleEl.textContent = doc.name;
  if (doc.text && doc.text.length) {
    const slice = doc.text.slice(0, 4000);
    previewBodyEl.textContent = slice + (doc.text.length > 4000 ? '\n\n…(truncated)' : '');
  } else {
    previewBodyEl.textContent =
      `No extracted text for this document. (Format: .${doc.name.split('.').pop()})`;
  }
  previewEl.hidden = false;
}
function closeDocPreview() { if (previewEl) previewEl.hidden = true; }

if (docsGridEl) {
  docsGridEl.addEventListener('click', async e => {
    // Delete X — handled first so it doesn't bubble into a preview open
    const delBtn = e.target.closest('.doc-delete');
    if (delBtn) {
      e.stopPropagation();
      const id = Number(delBtn.dataset.docId);
      if (!Number.isFinite(id)) return;
      const idx = SYNAPSE_DOCS.findIndex(d => d.id === id);
      if (idx === -1) return;
      const removed = SYNAPSE_DOCS.splice(idx, 1)[0];
      renderDocs();
      const ok = (typeof idbDeleteDoc === 'function') ? await idbDeleteDoc(id) : true;
      if (window.showToast) {
        window.showToast(
          ok ? 'Removed from library' : 'Removed (not persisted)',
          removed ? `${removed.name} deleted.` : ''
        );
      }
      return;
    }

    const card = e.target.closest('.doc-card');
    if (!card) return;
    const idx = Number(card.dataset.docIdx);
    if (Number.isFinite(idx) && SYNAPSE_DOCS[idx]) openDocPreview(SYNAPSE_DOCS[idx]);
  });
}
if (previewCloseEl) previewCloseEl.addEventListener('click', closeDocPreview);
if (previewEl) previewEl.addEventListener('click', e => {
  if (e.target === previewEl) closeDocPreview();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && previewEl && !previewEl.hidden) closeDocPreview();
});

/* ---------- Upload zone interactions ---------- */
if (uploadZoneEl && fileInputEl) {
  uploadZoneEl.addEventListener('click', e => {
    if (e.target.tagName !== 'INPUT') fileInputEl.click();
  });

  ['dragenter', 'dragover'].forEach(ev =>
    uploadZoneEl.addEventListener(ev, e => {
      e.preventDefault();
      uploadZoneEl.classList.add('dragging');
    })
  );

  ['dragleave', 'drop'].forEach(ev =>
    uploadZoneEl.addEventListener(ev, e => {
      e.preventDefault();
      uploadZoneEl.classList.remove('dragging');
    })
  );

  uploadZoneEl.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
  fileInputEl.addEventListener('change', e => handleFiles(e.target.files));
}

/* ---------- PDF text extraction with multi-strategy fallback ---------- */
async function readAllPages(pdf) {
  let out = '';
  const pageMap = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const start = out.length;
    out += content.items.map(it => it.str).join(' ') + '\n';
    pageMap.push({ start, end: out.length, page: p });
  }
  return { text: out, pages: pdf.numPages, pageMap };
}

async function extractPdfText(buf) {
  const attempts = [
    { label: 'worker',         opts: { data: buf } },
    { label: 'no-worker',      opts: { data: buf, disableWorker: true } },
    { label: 'no-worker-noeval', opts: { data: buf, disableWorker: true, isEvalSupported: false } },
  ];
  let lastErr;
  for (const { label, opts } of attempts) {
    try {
      const pdf = await pdfjsLib.getDocument(opts).promise;
      if (label !== 'worker') console.warn('[synapse] pdf.js succeeded via', label);
      return await readAllPages(pdf);
    } catch (e) {
      console.warn('[synapse] pdf.js attempt failed:', label, e);
      lastErr = e;
    }
  }
  throw lastErr || new Error('All pdf.js extraction strategies failed.');
}

/* ---------- DOCX extraction (via mammoth) ---------- */
async function extractDocxText(buf) {
  if (!window.mammoth) throw new Error('mammoth.js not loaded');
  const r = await window.mammoth.extractRawText({ arrayBuffer: buf });
  return { text: r.value || '', pages: 1, pageMap: null };
}

/* ---------- XLSX extraction (via SheetJS) ---------- */
async function extractXlsxText(buf) {
  if (!window.XLSX) throw new Error('SheetJS not loaded');
  const wb = window.XLSX.read(buf, { type: 'array' });
  let out = '';
  for (const name of wb.SheetNames) {
    const csv = window.XLSX.utils.sheet_to_csv(wb.Sheets[name], { blankrows: false });
    out += `# ${name}\n${csv}\n\n`;
  }
  return { text: out, pages: wb.SheetNames.length, pageMap: null };
}

/* ---------- Real text extraction ---------- */
async function extractText(file, ext) {
  if (TEXT_LIKE_EXTS.includes(ext)) {
    const text = await file.text();
    return { text, pages: 1, pageMap: null, kind: text.trim() ? 'ok' : 'empty' };
  }
  if (ext === 'pdf') {
    if (!window.pdfjsLib) {
      return { text: '', pages: 0, pageMap: null, kind: 'pdfjs-missing' };
    }
    if (workerReady) await workerReady;
    const buf = await file.arrayBuffer();
    const r = await extractPdfText(buf);
    return { ...r, kind: r.text.trim() ? 'ok' : 'empty' };
  }
  if (ext === 'docx') {
    if (!window.mammoth) {
      return { text: '', pages: 0, pageMap: null, kind: 'lib-missing-docx' };
    }
    const buf = await file.arrayBuffer();
    const r = await extractDocxText(buf);
    return { ...r, kind: r.text.trim() ? 'ok' : 'empty' };
  }
  if (ext === 'xlsx' || ext === 'xls') {
    if (!window.XLSX) {
      return { text: '', pages: 0, pageMap: null, kind: 'lib-missing-xlsx' };
    }
    const buf = await file.arrayBuffer();
    const r = await extractXlsxText(buf);
    return { ...r, kind: r.text.trim() ? 'ok' : 'empty' };
  }
  return { text: '', pages: 0, pageMap: null, kind: 'unsupported' };
}

/* ---------- Indexing pipeline ---------- */
function handleFiles(files) {
  if (!files || !files.length || !uploadProgress) return;

  const myGen = ++uploadGen; // anything older is now stale
  uploadProgress.classList.add('active');
  uploadProgress.innerHTML = '';

  Array.from(files).filter(f => f.size > MAX_UPLOAD_BYTES).forEach(f => {
    if (window.showToast) window.showToast(
      'File too large',
      `${f.name} is ${(f.size / 1024 / 1024).toFixed(1)} MB — limit is ${(MAX_UPLOAD_BYTES / 1024 / 1024)|0} MB.`
    );
  });
  const validFiles = Array.from(files).filter(f => f.size <= MAX_UPLOAD_BYTES);
  if (!validFiles.length) { uploadProgress.classList.remove('active'); return; }
  let batchDone = 0;
  const batchTotal = validFiles.length;

  validFiles.forEach((f, i) => {

    const ext  = (f.name.split('.').pop() || '').toLowerCase();
    const type = SYNAPSE_TYPE_MAP[ext] || 'txt';
    const safeName = escapeHTML(f.name);
    const safeType = escapeHTML(type);

    const row = document.createElement('div');
    row.innerHTML = `
      <div class="upload-progress-row">
        <div class="doc-icon ${safeType}" style="width:28px;height:28px;font-size:9px;border-radius:7px;margin:0;">
          ${safeType.toUpperCase()}
        </div>
        <div class="name">${safeName}</div>
        <div class="size">${(f.size / 1024).toFixed(0)} KB</div>
        <div class="status" style="font-size:11px;color:var(--text-dim);min-width:120px;text-align:right">
          Extracting…
        </div>
      </div>
      <div class="progress-bar"><div class="fill"></div></div>
    `;
    uploadProgress.appendChild(row);

    const fill   = row.querySelector('.fill');
    const status = row.querySelector('.status');

    let extractionResult = null;
    let extractionError  = null;
    const extractionP = extractText(f, ext).then(
      r => { extractionResult = r; },
      e => { extractionError  = e; console.error('[synapse] extraction failed:', f.name, e); }
    );

    let p = 0;
    const tick = setInterval(() => {
      p += 6 + Math.random() * 8;
      if (p >= 100) {
        p = 100;
        clearInterval(tick);
        fill.style.width = '100%';
        status.textContent = 'Embedding…';
        extractionP.then(() => finish());
      } else {
        fill.style.width = p + '%';
      }
    }, 120 + i * 40);

    function finish() {
      // Stale-batch guard: if a newer upload has started, don't add this doc
      // or fire its toast — the user has moved on.
      if (myGen !== uploadGen) return;

      const r    = extractionResult;
      const err  = extractionError;
      const kind = err ? 'error' : (r ? r.kind : 'error');

      let statusText, statusColor, toastTitle, toastSub;
      switch (kind) {
        case 'ok':
          statusText  = '✓ Indexed';
          statusColor = 'var(--green)';
          toastTitle  = 'Indexed successfully';
          toastSub    = `${f.name} is now searchable (${r.text.length.toLocaleString()} chars).`;
          break;
        case 'empty':
          statusText  = '⚠ No text';
          statusColor = 'var(--amber)';
          toastTitle  = 'Added — no extractable text';
          toastSub    = ext === 'pdf'
            ? `${f.name} looks like a scanned PDF. OCR isn't part of this prototype.`
            : `${f.name} contained no readable text.`;
          break;
        case 'pdfjs-missing':
          statusText  = '✗ pdf.js missing';
          statusColor = 'var(--pink)';
          toastTitle  = 'PDF library failed to load';
          toastSub    = 'pdf.js could not be reached. Check the network tab or run a local server.';
          break;
        case 'lib-missing-docx':
          statusText  = '✗ mammoth missing';
          statusColor = 'var(--pink)';
          toastTitle  = 'DOCX library failed to load';
          toastSub    = 'mammoth.js could not be reached from cdnjs.';
          break;
        case 'lib-missing-xlsx':
          statusText  = '✗ SheetJS missing';
          statusColor = 'var(--pink)';
          toastTitle  = 'XLSX library failed to load';
          toastSub    = 'SheetJS could not be reached from cdnjs.';
          break;
        case 'unsupported':
          statusText  = '✓ Added';
          statusColor = 'var(--green)';
          toastTitle  = 'Added to library';
          toastSub    = `Text extraction for ".${ext}" files isn't implemented yet — only PDF, TXT, MD, CSV, JSON, etc.`;
          break;
        case 'error':
        default: {
          statusText  = '✗ Failed';
          statusColor = 'var(--pink)';
          toastTitle  = 'Extraction failed';
          const msg = (err && (err.message || String(err))) || 'unknown error';
          const onFile = location.protocol === 'file:';
          toastSub = onFile
            ? `${msg.slice(0, 100)} — try serving via http (python3 -m http.server) and reload.`
            : `${msg.slice(0, 140)} — see DevTools console for the full stack.`;
        }
      }

      status.textContent = statusText;
      status.style.color = statusColor;

      const docRecord = {
        name: f.name,
        type,
        size: `${(f.size / 1024).toFixed(0)} KB`,
        pages: (r && r.pages) || (1 + Math.floor(Math.random() * 40)),
        date: 'just now',
        tags: ['new', ext || type],
        status: 'ready',
        text:    r ? r.text    : '',
        pageMap: r ? r.pageMap : null,
        savedAt: Date.now()
      };
      SYNAPSE_DOCS.unshift(docRecord);
      renderDocs();

      // Persist to IndexedDB so the doc survives page reload.
      if (typeof idbPutDoc === 'function') {
        idbPutDoc(docRecord).then(id => {
          if (Number.isFinite(id)) {
            docRecord.id = id;
            renderDocs(); // re-render so the delete X appears for this card
          }
        });
      }

      if (window.showToast) window.showToast(toastTitle, toastSub);

      // Compute semantic embeddings in the background (non-blocking).
      // This is what makes Smart Search and Chat actually semantic.
      if (kind === 'ok' && typeof window.embedText === 'function') {
        embedDocInBackground(docRecord);
      }

      batchDone++;
      if (batchDone >= batchTotal) {
        setTimeout(() => {
          if (myGen === uploadGen && uploadProgress) uploadProgress.classList.remove('active');
        }, 2500);
      }
    }
  });
}
