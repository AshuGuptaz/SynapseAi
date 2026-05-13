/* ==========================================================
   embeddings.js — in-browser semantic embeddings.
   Loads transformers.js + Xenova/all-MiniLM-L6-v2 (quantized,
   ~10 MB) on demand. Exposes `embedText`, `chunkText`,
   `cosineSim`, and `semanticReady` on window so non-module
   scripts can use them.
   ========================================================== */

import {
  pipeline,
  env
} from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm';

// We host nothing locally; let transformers.js fetch from HF and cache in
// the browser's IndexedDB (default behavior).
env.allowLocalModels = false;
env.useBrowserCache  = true;

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
let extractorP = null;

function notifyProgress(p) {
  // Emit a custom event the UI can listen for. Fields: status, file, progress, loaded, total.
  try {
    window.dispatchEvent(new CustomEvent('synapse:model-progress', { detail: p }));
  } catch (_) {}
}

function getExtractor() {
  if (extractorP) return extractorP;
  extractorP = pipeline('feature-extraction', MODEL_ID, {
    quantized: true,
    progress_callback: notifyProgress
  })
    .then(extractor => {
      console.info('[synapse] semantic model ready:', MODEL_ID);
      if (window.showToast) {
        window.showToast(
          'Semantic model loaded',
          'all-MiniLM-L6-v2 is now running in your browser. Search and chat now use real embeddings.'
        );
      }
      window.dispatchEvent(new CustomEvent('synapse:model-ready'));
      return extractor;
    })
    .catch(err => {
      console.error('[synapse] failed to load embedding model:', err);
      if (window.showToast) {
        window.showToast(
          'Semantic model failed',
          'Falling back to keyword search. See console for details.'
        );
      }
      throw err;
    });
  return extractorP;
}

/* L2-normalised mean-pooled sentence embedding → number[] (length 384). */
async function embedText(text) {
  const ext = await getExtractor();
  const out = await ext(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}

/* Word-count chunker with overlap. Returns [{ tokenStart, text }, ...] */
function chunkText(text, words = 180, overlap = 25) {
  const tokens = (text || '').split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const chunks = [];
  const step = Math.max(1, words - overlap);
  for (let i = 0; i < tokens.length; i += step) {
    const slice = tokens.slice(i, i + words).join(' ').trim();
    if (slice.length < 40) break;
    chunks.push({ tokenStart: i, text: slice });
    if (i + words >= tokens.length) break;
  }
  return chunks;
}

/* Cosine similarity for L2-normalised vectors = dot product. */
function cosineSim(a, b) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

window.embedText      = embedText;
window.chunkText      = chunkText;
window.cosineSim      = cosineSim;
window.semanticReady  = getExtractor().then(() => true).catch(() => false);

// Pre-warm the model so it's ready by the time the user searches.
getExtractor();
