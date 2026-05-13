/* ==========================================================
   storage.js — IndexedDB persistence for uploaded docs.
   Stored shape mirrors a SYNAPSE_DOCS entry, plus an
   auto-incremented `id` and `savedAt` timestamp.
   ========================================================== */

const SYNAPSE_DB_NAME    = 'synapse';
const SYNAPSE_DB_VERSION = 1;
const SYNAPSE_STORE_DOCS = 'docs';

let _dbPromise = null;
function _openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(SYNAPSE_DB_NAME, SYNAPSE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SYNAPSE_STORE_DOCS)) {
        db.createObjectStore(SYNAPSE_STORE_DOCS, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  return _dbPromise;
}

async function idbGetAllDocs() {
  try {
    const db = await _openDb();
    return await new Promise((resolve, reject) => {
      const tx  = db.transaction(SYNAPSE_STORE_DOCS, 'readonly');
      const req = tx.objectStore(SYNAPSE_STORE_DOCS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[synapse] idbGetAllDocs failed:', e);
    return [];
  }
}

/* Returns the assigned id (auto-increment) on success, or null on failure. */
async function idbPutDoc(doc) {
  try {
    const db = await _openDb();
    return await new Promise((resolve, reject) => {
      const tx  = db.transaction(SYNAPSE_STORE_DOCS, 'readwrite');
      const req = tx.objectStore(SYNAPSE_STORE_DOCS).put(doc);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[synapse] idbPutDoc failed:', e);
    if (window.showToast) {
      const quota = e && (e.name === 'QuotaExceededError' || /quota/i.test(String(e.message)));
      window.showToast(
        quota ? 'Storage full' : 'Could not save',
        quota ? 'Browser storage quota reached. Delete some docs and try again.'
              : (e.message || 'Failed to save document for next reload.')
      );
    }
    return null;
  }
}

async function idbDeleteDoc(id) {
  try {
    const db = await _openDb();
    return await new Promise((resolve, reject) => {
      const tx  = db.transaction(SYNAPSE_STORE_DOCS, 'readwrite');
      const req = tx.objectStore(SYNAPSE_STORE_DOCS).delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror   = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[synapse] idbDeleteDoc failed:', e);
    return false;
  }
}

window.idbGetAllDocs = idbGetAllDocs;
window.idbPutDoc     = idbPutDoc;
window.idbDeleteDoc  = idbDeleteDoc;
