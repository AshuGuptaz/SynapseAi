'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Send, ChevronDown } from 'lucide-react';

interface Msg { role: 'user' | 'assistant'; content: string; }
interface Doc { docId: string; name: string; text: string; }

const KEY = 'synapse_docs_v1';
const loadDocs = (): Doc[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };

export default function ChatPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [doc,  setDoc]  = useState<Doc | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [inp,  setInp]  = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const ta     = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDocs(loadDocs()); }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  const resize = () => {
    const t = ta.current; if (!t) return;
    t.style.height = '44px';
    t.style.height = Math.min(t.scrollHeight, 140) + 'px';
  };

  const send = useCallback(async () => {
    const text = inp.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: text }];
    setMsgs(next); setInp('');
    if (ta.current) ta.current.style.height = '44px';
    setBusy(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, docContext: doc?.text ?? null, docName: doc?.name ?? null }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Chat error');
      setMsgs(p => [...p, { role: 'assistant', content: d.content }]);
    } catch (e) {
      setMsgs(p => [...p, { role: 'assistant', content: `⚠️ ${(e as Error).message}` }]);
    } finally { setBusy(false); }
  }, [inp, busy, msgs, doc]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-h) - 72px)', maxWidth: 740, margin: '0 auto' }}>

      {/* Doc picker */}
      <div className="card" style={{ padding: '10px 14px', marginBottom: 12, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <FileText size={14} style={{ color: 'var(--t3)', flexShrink: 0 }} strokeWidth={1.4} />
        <select
          value={doc?.docId ?? ''}
          onChange={e => { setDoc(docs.find(x => x.docId === e.target.value) ?? null); setMsgs([]); }}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: doc ? 'var(--t1)' : 'var(--t3)', fontFamily: 'inherit', cursor: 'pointer' }}
        >
          <option value="">General chat (no document context)</option>
          {docs.map(d => <option key={d.docId} value={d.docId}>{d.name}</option>)}
        </select>
        <ChevronDown size={13} style={{ color: 'var(--t3)', flexShrink: 0 }} />
        {doc && (
          <span className="pill pill-gold" style={{ flexShrink: 0 }}>Context loaded</span>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20, paddingRight: 4, minHeight: 0 }}>
        {msgs.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, opacity: .5 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(200,150,90,.2), rgba(155,142,196,.15))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(200,150,90,.2)',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--gold)" opacity=".9">
                <path d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 5V5z"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="display" style={{ fontSize: 18, marginBottom: 6, color: 'var(--t1)' }}>Chat with AI</div>
              <div style={{ fontSize: 13, color: 'var(--t2)', maxWidth: 300 }}>
                {docs.length > 0
                  ? 'Select a document above to ask questions about it, or just chat freely.'
                  : 'Upload documents on the Documents page, then come back to chat.'}
              </div>
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: m.role === 'user'
                ? 'linear-gradient(135deg, #b8813e, #c8965c)'
                : 'linear-gradient(135deg, #2a1f3d, #3d2f5c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800,
              color: m.role === 'user' ? '#1a0f04' : 'var(--purple)',
            }}>
              {m.role === 'user' ? 'U' : 'S'}
            </div>
            <div style={{
              maxWidth: '78%', padding: '11px 15px', fontSize: 14, lineHeight: 1.65,
              borderRadius: m.role === 'user' ? '14px 3px 14px 14px' : '3px 14px 14px 14px',
              background: m.role === 'user' ? 'rgba(200,150,90,.12)' : 'var(--bg-2)',
              border: m.role === 'user' ? '1px solid rgba(200,150,90,.22)' : '1px solid var(--br)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              color: 'var(--t1)',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {busy && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #2a1f3d, #3d2f5c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--purple)', flexShrink: 0 }}>S</div>
            <div style={{ padding: '14px 18px', background: 'var(--bg-2)', border: '1px solid var(--br)', borderRadius: '3px 14px 14px 14px', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(n => (
                <span key={n} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', opacity: .6, animation: `bounce-dot 1.3s ${n * .17}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      {/* Input */}
      <div className="card" style={{ padding: '8px 8px 8px 14px', marginTop: 12, flexShrink: 0, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <textarea
          ref={ta} value={inp}
          onChange={e => { setInp(e.target.value); resize(); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message Synapse… (↵ send · ⇧↵ newline)"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: 14, lineHeight: 1.55, color: 'var(--t1)', caretColor: 'var(--gold)', minHeight: 44, maxHeight: 140, padding: '4px 0', fontFamily: 'inherit' }}
        />
        <button onClick={send} disabled={busy || !inp.trim()} className="btn btn-primary" style={{ width: 38, height: 38, padding: 0, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
