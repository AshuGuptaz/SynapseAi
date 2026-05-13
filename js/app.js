/* ==========================================================
   app.js — global utilities (toast, shortcuts, topbar search)
   ========================================================== */

/* ---------- Toast notification ---------- */
const toastEl      = document.getElementById('toast');
const toastTitleEl = document.getElementById('toastTitle');
const toastSubEl   = document.getElementById('toastSub');
let   toastTimer;

function showToast(title, sub) {
  if (!toastEl) return;
  if (toastTitleEl) toastTitleEl.textContent = title;
  if (toastSubEl)   toastSubEl.textContent   = sub;

  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3500);
}
window.showToast = showToast;

/* ---------- Topbar search → jump to Smart Search ---------- */
const topbarInput = document.getElementById('topbarSearchInput');
if (topbarInput) {
  topbarInput.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = topbarInput.value.trim();
    if (!q) return;
    const main = document.getElementById('searchInput');
    if (main) main.value = q;
    if (typeof goToView === 'function') goToView('search');
    if (typeof runSearch === 'function') runSearch();
  });
}

/* ---------- Dashboard / toolbar action buttons ---------- */
['dashboard-filter', 'dashboard-export', 'grid-toggle', 'sort-toggle'].forEach(action => {
  const el = document.querySelector(`[data-action="${action}"]`);
  if (el) el.addEventListener('click', () => showToast('Coming soon', 'This feature isn\'t available in this demo.'));
});

/* ---------- Keyboard shortcuts ---------- */
document.addEventListener('keydown', e => {
  // ⌘K / Ctrl+K → focus topbar search
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const input = document.querySelector('.topbar-search input');
    if (input) input.focus();
  }
});
