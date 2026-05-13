/* ==========================================================
   chat.js — AI chat powered by Groq + persistent history.
   - Sends doc text (up to 8000 chars) as system context to Groq
   - Maintains conversation history per session (multi-turn)
   - Persists all conversations to localStorage
   - Renders chat sidebar dynamically from history
   ========================================================== */

const chatMessages  = document.getElementById('chatMessages');
const chatInputEl   = document.getElementById('chatInput');
const chatSendBtnEl = document.getElementById('chatSendBtn');
const newChatBtn    = document.querySelector('.new-chat-btn');

const chatCtxIcon = document.getElementById('chatCtxIcon');
const chatCtxName = document.getElementById('chatCtxName');
const chatCtxMeta = document.getElementById('chatCtxMeta');
const chatCtxPill = document.getElementById('chatCtxPill');

const AI_AVATAR_SVG = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6"/></svg>`;

let chatBusy = false;

/* ---- Conversation persistence ---- */
const HISTORY_KEY = 'synapse_chat_history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveHistory(hist) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, 50))); }
  catch {}
}

let currentConv = null; // { id, title, docName, messages:[{role,content}], ts }

function newConvId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---- Grounded doc ---- */
function groundedDoc() {
  if (typeof SYNAPSE_DOCS === 'undefined') return null;
  const candidates = SYNAPSE_DOCS.filter(d => d.text && d.text.trim().length > 0);
  if (!candidates.length) return null;
  candidates.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  return candidates[0];
}

function refreshContextBar() {
  const doc = groundedDoc();
  if (doc) {
    if (chatCtxIcon) { chatCtxIcon.className = 'doc-icon ' + doc.type; chatCtxIcon.textContent = (doc.type || '').toUpperCase(); }
    if (chatCtxName) chatCtxName.textContent = doc.name;
    if (chatCtxMeta) {
      const wc = (doc.text.match(/\S+/g) || []).length;
      chatCtxMeta.textContent = `${doc.pages || 1} pg · ${wc.toLocaleString()} words · indexed ${doc.date || 'recently'}`;
    }
    if (chatCtxPill) chatCtxPill.innerHTML = '<span class="dot"></span> Grounded · Groq';
  } else {
    if (chatCtxIcon) { chatCtxIcon.className = 'doc-icon docx'; chatCtxIcon.textContent = 'DOC'; }
    if (chatCtxName) chatCtxName.textContent = 'No document grounded';
    if (chatCtxMeta) chatCtxMeta.textContent = 'Upload a doc to ground replies in real text.';
    if (chatCtxPill) chatCtxPill.innerHTML = '<span class="dot"></span> Idle';
  }
}
window.refreshChatContext = refreshContextBar;

/* ---- Bubble rendering ---- */
function addBubble(html, who) {
  if (!chatMessages) return null;
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + who;
  if (who === 'user') {
    wrap.innerHTML = `<div class="msg-avatar">AG</div><div class="msg-bubble">${html}</div>`;
  } else {
    wrap.innerHTML = `<div class="msg-avatar">${AI_AVATAR_SVG}</div><div><div class="msg-bubble">${html}</div></div>`;
  }
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return wrap;
}

/* ---- Simple markdown → safe HTML ---- */
function markdownToHtml(md) {
  const safe = escapeHTML(md);
  return safe
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,.09);padding:1px 5px;border-radius:4px;font-size:.9em">$1</code>')
    .replace(/^[-•] (.+)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g, s => `<ul style="margin:6px 0 6px 18px;padding:0">${s}</ul>`)
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p style="margin:0">')
    .replace(/$/, '</p>');
}

/* ---- Build Groq messages array ---- */
function buildGroqMessages(userMsg) {
  const doc = groundedDoc();
  let system;

  if (doc) {
    const maxChars = 8000;
    const docText = doc.text.slice(0, maxChars) +
      (doc.text.length > maxChars ? '\n\n[...document continues, showing first 8000 chars...]' : '');
    system = `You are Synapse, an expert AI document assistant. You are analyzing the document "${doc.name}".

Answer the user's questions based on the document content below. Be specific and accurate. Quote relevant passages when helpful. If the answer is not in the document, say so clearly rather than guessing.

DOCUMENT CONTENT:
${docText}`;
  } else {
    system = 'You are Synapse, an AI document assistant. No document is currently loaded. Politely tell the user to upload a document from the Documents tab first, then they can ask questions about it.';
  }

  const history = (currentConv?.messages || []).slice(-12);
  return [
    { role: 'system', content: system },
    ...history,
    { role: 'user', content: userMsg }
  ];
}

/* ---- Sidebar rendering ---- */
function renderChatSidebar() {
  const list = document.getElementById('chatHistoryList');
  if (!list) return;

  const hist = loadHistory();
  if (!hist.length) {
    list.innerHTML = '<div style="font-size:12px;color:var(--text-faint);padding:12px 16px;">No conversations yet.</div>';
    return;
  }

  const now = Date.now();
  const DAY = 86400000;
  const groups = [
    { label: 'Today',       convs: hist.filter(c => now - c.ts < DAY) },
    { label: 'Yesterday',   convs: hist.filter(c => now - c.ts >= DAY && now - c.ts < 2 * DAY) },
    { label: 'Last 7 days', convs: hist.filter(c => now - c.ts >= 2 * DAY && now - c.ts < 7 * DAY) },
    { label: 'Older',       convs: hist.filter(c => now - c.ts >= 7 * DAY) }
  ];

  let html = '';
  for (const { label, convs } of groups) {
    if (!convs.length) continue;
    html += `<div class="chat-history-label">${label}</div>`;
    for (const conv of convs) {
      const active = currentConv && currentConv.id === conv.id;
      const turns  = Math.floor((conv.messages || []).length / 2);
      html += `
        <div class="chat-history-item ${active ? 'active' : ''}" data-conv-id="${escapeHTML(conv.id)}">
          <div>${escapeHTML(conv.title || 'Untitled conversation')}</div>
          <div class="preview">${turns} turn${turns !== 1 ? 's' : ''} · ${escapeHTML(conv.docName || 'no doc')}</div>
        </div>`;
    }
  }
  list.innerHTML = html;

  list.querySelectorAll('.chat-history-item').forEach(item => {
    item.addEventListener('click', () => loadConversation(item.dataset.convId));
  });
}

/* ---- Load conversation from history ---- */
function loadConversation(id) {
  const conv = loadHistory().find(c => c.id === id);
  if (!conv || !chatMessages) return;
  currentConv = conv;
  chatMessages.innerHTML = '';
  refreshContextBar();
  for (const msg of conv.messages) {
    if (msg.role === 'user') addBubble(escapeHTML(msg.content), 'user');
    else if (msg.role === 'assistant') addBubble(markdownToHtml(msg.content), 'ai');
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
  renderChatSidebar();
}

/* ---- New conversation ---- */
function startNewConversation() {
  if (!chatMessages) return;
  chatMessages.innerHTML = '';
  const doc = groundedDoc();
  currentConv = {
    id:      newConvId(),
    title:   '',
    docName: doc ? doc.name : 'no doc',
    messages: [],
    ts:      Date.now()
  };
  refreshContextBar();
  const greeting = doc
    ? `Hi — I've loaded <strong>${escapeHTML(doc.name)}</strong> and I'm ready to answer questions about it. What would you like to know?`
    : `Hi — upload a PDF, DOCX, or text file on the <strong>Documents</strong> tab, and I'll answer questions about it here using Groq AI.`;
  addBubble(greeting, 'ai');
  renderChatSidebar();
}

/* ---- Send ---- */
async function sendChat() {
  if (chatBusy || !chatInputEl) return;
  const txt = chatInputEl.value.trim();
  if (!txt) return;

  chatInputEl.value = '';
  chatInputEl.style.height = '36px';
  chatBusy = true;
  if (chatSendBtnEl) chatSendBtnEl.disabled = true;

  addBubble(escapeHTML(txt), 'user');

  if (currentConv) {
    currentConv.messages.push({ role: 'user', content: txt });
    if (!currentConv.title) currentConv.title = txt.slice(0, 60);
  }

  const typingEl = addBubble('<div class="typing-dots"><span></span><span></span><span></span></div>', 'ai');

  try {
    if (typeof window.groqChat !== 'function') throw new Error('groq.js not loaded');
    const messages = buildGroqMessages(txt);
    const reply    = await window.groqChat(messages, { maxTokens: 1024, temperature: 0.3 });

    if (typingEl) typingEl.remove();
    addBubble(markdownToHtml(reply), 'ai');

    if (currentConv) {
      currentConv.messages.push({ role: 'assistant', content: reply });
      currentConv.ts = Date.now();
      const hist = loadHistory().filter(c => c.id !== currentConv.id);
      hist.unshift(currentConv);
      saveHistory(hist);
      renderChatSidebar();
    }
  } catch (err) {
    if (typingEl) typingEl.remove();
    addBubble(
      `<span style="color:var(--pink)">⚠ ${escapeHTML(err.message || String(err))}</span>`,
      'ai'
    );
  } finally {
    chatBusy = false;
    if (chatSendBtnEl) chatSendBtnEl.disabled = false;
    if (chatInputEl) chatInputEl.focus();
  }
}

/* ---- Event wiring ---- */
if (chatSendBtnEl) chatSendBtnEl.addEventListener('click', sendChat);
if (chatInputEl) {
  chatInputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });
  chatInputEl.addEventListener('input', () => {
    chatInputEl.style.height = '36px';
    chatInputEl.style.height = Math.min(chatInputEl.scrollHeight, 120) + 'px';
  });
}

document.querySelectorAll('.chat-quick-chip').forEach(c => {
  c.addEventListener('click', () => {
    if (!chatInputEl) return;
    chatInputEl.value = stripChipPrefix(c.textContent);
    sendChat();
  });
});

if (newChatBtn) newChatBtn.addEventListener('click', startNewConversation);

/* ---- Init ---- */
refreshContextBar();
startNewConversation();
