/* ==========================================================
   search.js — Smart Search.
   Semantic (MiniLM embeddings) → keyword fallback → demo data.
   Facet filters for type and date are fully wired up.
   ========================================================== */

const searchInputEl = document.getElementById('searchInput');
const searchBtnEl   = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const resultsList   = document.getElementById('resultsList');

let searchTimeouts   = [];
let allResults       = []; // unfiltered results from last search
let activeFacets     = { type: null, date: null };
let searchMode       = 'semantic';

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/* ---- Substring fallback ---- */
function buildKeywordResult(doc, query) {
  if (!doc.text) return null;
  const terms = query.split(/\s+/).filter(Boolean);
  if (!terms.length) return null;

  const lower = doc.text.toLowerCase();
  let total = 0, firstIdx = -1, firstLen = 0;
  for (const t of terms) {
    const tl = t.toLowerCase();
    let idx = 0;
    while ((idx = lower.indexOf(tl, idx)) !== -1) {
      total++;
      if (firstIdx === -1 || idx < firstIdx) { firstIdx = idx; firstLen = t.length; }
      idx += tl.length;
    }
  }
  if (total === 0) return null;

  const ctx = 100;
  const start   = Math.max(0, firstIdx - ctx);
  const end     = Math.min(doc.text.length, firstIdx + firstLen + ctx);
  let snippet   = doc.text.slice(start, end).replace(/\s+/g, ' ').trim();
  snippet       = escapeHTML(snippet).replace(
    new RegExp(`(${terms.map(escapeRe).join('|')})`, 'ig'),
    '<mark>$1</mark>'
  );
  snippet = (start > 0 ? '… ' : '') + snippet + (end < doc.text.length ? ' …' : '');

  let pageRef = '—';
  if (doc.pageMap) {
    const hit = doc.pageMap.find(p => firstIdx >= p.start && firstIdx < p.end);
    if (hit) pageRef = `p. ${hit.page}`;
  }
  return {
    type: doc.type,
    title: doc.name,
    score: Math.min(99, Math.round(60 + Math.log2(1 + total) * 12)) + '%',
    snippet,
    page: pageRef,
    section: `${total} keyword match${total === 1 ? '' : 'es'}`,
    mode: 'keyword',
    savedAt: doc.savedAt || 0
  };
}

/* ---- Semantic retrieval ---- */
async function semanticTopK(query, k = 8) {
  if (typeof window.embedText !== 'function' || typeof window.cosineSim !== 'function') return null;
  const docs = (typeof SYNAPSE_DOCS !== 'undefined' ? SYNAPSE_DOCS : [])
    .filter(d => Array.isArray(d.embeddings) && Array.isArray(d.chunks)
              && d.embeddings.length === d.chunks.length);
  if (!docs.length) return null;

  let qVec;
  try { qVec = await window.embedText(query); }
  catch (e) { console.warn('[synapse] query embed failed:', e); return null; }

  const all = [];
  for (const d of docs) {
    for (let i = 0; i < d.chunks.length; i++) {
      all.push({ doc: d, chunk: d.chunks[i], sim: window.cosineSim(qVec, d.embeddings[i]) });
    }
  }
  all.sort((a, b) => b.sim - a.sim);
  return all.slice(0, k);
}

function buildSemanticResult({ doc, chunk, sim }, query) {
  const terms = query.split(/\s+/).filter(t => t.length > 1);
  let snippet = chunk.text.replace(/\s+/g, ' ').trim();
  if (snippet.length > 280) snippet = snippet.slice(0, 280) + ' …';
  snippet = escapeHTML(snippet);
  if (terms.length) {
    snippet = snippet.replace(new RegExp(`(${terms.map(escapeRe).join('|')})`, 'ig'), '<mark>$1</mark>');
  }

  let pageRef = '—';
  if (doc.pageMap && doc.text) {
    const charStart = doc.text.indexOf(chunk.text.slice(0, 30));
    if (charStart >= 0) {
      const hit = doc.pageMap.find(p => charStart >= p.start && charStart < p.end);
      if (hit) pageRef = `p. ${hit.page}`;
    }
  }
  return {
    type: doc.type,
    title: doc.name,
    score: Math.round(Math.max(0, Math.min(1, sim)) * 100) + '%',
    snippet,
    page: pageRef,
    section: 'Semantic match (MiniLM)',
    mode: 'semantic',
    savedAt: doc.savedAt || 0
  };
}

/* ---- Facet filter ---- */
const TYPE_FACET_MAP = {
  '📄 PDF':    'pdf',
  '📘 DOCX':   'docx',
  '📊 XLSX':   'xlsx',
  '📝 TXT/MD': 'txt'
};

const DATE_RANGES = {
  'This week':  7,
  'This month': 30,
  'This year':  365,
  'All time':   Infinity
};

function matchesDate(result, label) {
  if (label === 'All time') return true;
  if (!result.savedAt) return true; // demo result — don't hide it
  const days = DATE_RANGES[label];
  if (!days) return true;
  return Date.now() - result.savedAt < days * 86400000;
}

function applyFacets() {
  let filtered = allResults;

  if (activeFacets.type) {
    const targetType = TYPE_FACET_MAP[activeFacets.type];
    if (targetType) filtered = filtered.filter(r => r.type === targetType);
  }
  if (activeFacets.date) {
    filtered = filtered.filter(r => matchesDate(r, activeFacets.date));
  }

  resultsList.innerHTML = '';
  if (!filtered.length) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:12px;color:var(--text-faint);padding:6px 4px;';
    hint.textContent = 'No results match the active filters.';
    resultsList.appendChild(hint);
    return;
  }
  filtered.forEach((r, i) => {
    const t = setTimeout(() => resultsList.appendChild(renderResultCard(r)), i * 60);
    searchTimeouts.push(t);
  });
}

function wireFacets() {
  document.querySelectorAll('.facet-card').forEach(card => {
    const title = card.querySelector('.facet-title')?.textContent?.trim();
    card.querySelectorAll('.facet-row').forEach(row => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        const label = row.querySelector('span:first-child')?.textContent?.trim();
        if (!label) return;

        if (title === 'Filter by type') {
          if (activeFacets.type === label) {
            activeFacets.type = null;
            row.classList.remove('facet-active');
          } else {
            card.querySelectorAll('.facet-row').forEach(r => r.classList.remove('facet-active'));
            activeFacets.type = label;
            row.classList.add('facet-active');
          }
        } else if (title === 'Filter by date') {
          if (activeFacets.date === label) {
            activeFacets.date = null;
            row.classList.remove('facet-active');
          } else {
            card.querySelectorAll('.facet-row').forEach(r => r.classList.remove('facet-active'));
            activeFacets.date = label;
            row.classList.add('facet-active');
          }
        } else if (title === 'Top entities') {
          // entity click → set search input and run search
          const entityName = row.querySelector('span:first-child')?.textContent?.trim();
          if (entityName && searchInputEl) {
            searchInputEl.value = entityName;
            runSearch();
          }
          return;
        }
        applyFacets();
      });
    });
  });
}

/* ---- Render result card ---- */
function renderResultCard(r) {
  const card = document.createElement('div');
  card.className = 'result-card';
  card.innerHTML = `
    <div class="result-head">
      <div class="doc-icon ${escapeHTML(r.type)}">${escapeHTML((r.type || '').toUpperCase())}</div>
      <div class="result-title">${escapeHTML(r.title)}</div>
      <div class="result-score" title="${r.mode || ''}">${escapeHTML(r.score)} ${r.mode === 'semantic' ? 'cos' : 'match'}</div>
    </div>
    <div class="result-snippet">${r.snippet}</div>
    <div class="result-foot">
      <span>📍 ${escapeHTML(r.page || '—')}</span>
      <span>📂 ${escapeHTML(r.section || '')}</span>
      <span style="cursor:pointer;color:var(--violet)" onclick="openResultDoc('${escapeHTML(r.title)}')">↗ Open in viewer</span>
    </div>`;
  return card;
}

/* ---- "Open in viewer" — find doc by name and show preview ---- */
window.openResultDoc = function(name) {
  const doc = (typeof SYNAPSE_DOCS !== 'undefined')
    ? SYNAPSE_DOCS.find(d => d.name === name)
    : null;
  if (!doc) return;
  const previewEl    = document.getElementById('docPreview');
  const previewTitle = document.getElementById('docPreviewTitle');
  const previewBody  = document.getElementById('docPreviewBody');
  if (!previewEl) return;
  previewTitle.textContent = doc.name;
  previewBody.textContent  = doc.text
    ? doc.text.slice(0, 4000) + (doc.text.length > 4000 ? '\n\n…(truncated)' : '')
    : `No extracted text for this document.`;
  previewEl.hidden = false;
};

/* ---- Mode toggle ---- */
document.querySelectorAll('.search-mode-btn').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.search-mode-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    searchMode = (b.textContent || '').trim().toLowerCase();
  });
});

/* ---- Suggestion chips ---- */
document.querySelectorAll('.suggestion-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    if (!searchInputEl) return;
    searchInputEl.value = stripChipPrefix(chip.textContent);
    runSearch();
  });
});

/* ---- Run search ---- */
async function runSearch() {
  if (!searchInputEl?.value.trim() || !searchResults || !resultsList) return;
  const q = searchInputEl.value.trim();

  searchTimeouts.forEach(clearTimeout);
  searchTimeouts = [];
  activeFacets = { type: null, date: null };
  document.querySelectorAll('.facet-row').forEach(r => r.classList.remove('facet-active'));

  searchResults.classList.remove('empty');
  resultsList.innerHTML = '';

  const loadingHint = document.createElement('div');
  loadingHint.style.cssText = 'font-size:12px;color:var(--text-faint);padding:6px 4px;';
  loadingHint.textContent = `Searching for "${q}"…`;
  resultsList.appendChild(loadingHint);

  const docs = (typeof SYNAPSE_DOCS !== 'undefined') ? SYNAPSE_DOCS : [];
  let results = [];

  if (searchMode !== 'keyword') {
    const top = await semanticTopK(q, 8);
    if (top?.length) results = top.map(t => buildSemanticResult(t, q));
  }
  if (!results.length) {
    results = docs.map(d => buildKeywordResult(d, q)).filter(Boolean)
      .sort((a, b) => parseInt(b.score) - parseInt(a.score));
  }

  loadingHint.remove();

  if (!results.length) {
    if (docs.some(d => d.text)) {
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:12px;color:var(--text-faint);padding:6px 4px;';
      hint.textContent = `No matches for "${q}" in your uploaded files. Showing sample results.`;
      resultsList.appendChild(hint);
    }
    results = SYNAPSE_SEARCH_RESULTS.map(r => ({ ...r, mode: 'demo', savedAt: 0 }));
  }

  allResults = results;
  results.forEach((r, i) => {
    const t = setTimeout(() => resultsList.appendChild(renderResultCard(r)), i * 80);
    searchTimeouts.push(t);
  });

  // Wire facets after results render
  setTimeout(wireFacets, results.length * 80 + 100);
}
window.runSearch = runSearch;

if (searchBtnEl)   searchBtnEl.addEventListener('click', runSearch);
if (searchInputEl) searchInputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') runSearch();
});
