/* ==========================================================
   navigation.js — sidebar nav + breadcrumb + view switching
   ========================================================== */

const navItems  = document.querySelectorAll('.nav-item[data-view]');
const views     = document.querySelectorAll('.view');
const crumbEl   = document.getElementById('crumbView');
const sidebarEl = document.querySelector('.sidebar');
const overlayEl = document.getElementById('sidebarOverlay');

function closeMobileSidebar() {
  sidebarEl?.classList.remove('mobile-open');
  overlayEl?.classList.remove('show');
}

const VIEW_LABELS = {
  dashboard: 'Dashboard',
  documents: 'Documents',
  search:    'Smart Search',
  chat:      'AI Chat',
  insights:  'Insights'
};

function goToView(view) {
  if (!VIEW_LABELS[view]) return;
  navItems.forEach(n => n.classList.toggle('active', n.dataset.view === view));
  views.forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  if (crumbEl) crumbEl.textContent = VIEW_LABELS[view];
  const content = document.querySelector('.content');
  if (content) content.scrollTop = 0;

  if (view === 'insights' && typeof window.renderInsights === 'function') {
    window.renderInsights();
  }
  if (window.innerWidth <= 800) closeMobileSidebar();
}

/* Wire up sidebar items */
navItems.forEach(item => {
  item.addEventListener('click', () => goToView(item.dataset.view));
});

/* Wire up dashboard quick-action buttons */
document.querySelectorAll('[data-view-go]').forEach(btn => {
  btn.addEventListener('click', () => goToView(btn.dataset.viewGo));
});

/* Topbar "Upload" button → jump to Documents and open file picker */
const uploadActionBtn = document.querySelector('[data-action="upload"]');
if (uploadActionBtn) {
  uploadActionBtn.addEventListener('click', () => {
    goToView('documents');
    const fi = document.getElementById('fileInput');
    if (fi) fi.click();
  });
}

/* Mobile sidebar toggle */
const toggleBtnEl = document.getElementById('sidebarToggle');
if (toggleBtnEl) {
  toggleBtnEl.addEventListener('click', () => {
    sidebarEl?.classList.toggle('mobile-open');
    overlayEl?.classList.toggle('show');
  });
}
if (overlayEl) overlayEl.addEventListener('click', closeMobileSidebar);

/* Library nav items (no data-view) → toast */
document.querySelectorAll('.nav-item:not([data-view])').forEach(item => {
  item.addEventListener('click', () => {
    if (typeof showToast === 'function') showToast('Coming soon', 'This section isn\'t available in this demo.');
  });
});
