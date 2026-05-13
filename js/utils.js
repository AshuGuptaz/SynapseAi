/* ==========================================================
   utils.js — shared helpers (loaded first, before everything)
   ========================================================== */

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

/* Strip a leading non-letter prefix (emoji + space) from chip text. */
function stripChipPrefix(s) {
  const sp = s.indexOf(' ');
  return sp > -1 ? s.slice(sp + 1).trim() : s.trim();
}

window.escapeHTML       = escapeHTML;
window.stripChipPrefix  = stripChipPrefix;
