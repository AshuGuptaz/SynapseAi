'use client';
import { useState, useRef } from 'react';
import { Search } from 'lucide-react';

interface Res { type: string; title: string; score: string; snippet: string; }

const EXAMPLES = [
  'Key findings and conclusions',
  'Revenue and financial figures',
  'Risk factors and challenges',
  'Executive team and leadership',
  'Product features and roadmap',
];

export default function SearchPage() {
  const [q, setQ]       = useState('');
  const [res, setRes]   = useState<Res[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const run = async (query = q) => {
    const s = query.trim();
    if (!s || busy) return;
    setBusy(true); setErr(''); setRes([]); setDone(true);
    try {
      const r = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: s }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Search failed');
      setRes(d.results ?? []);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
          background: 'linear-gradient(135deg, rgba(200,150,90,.2), rgba(155,142,196,.15))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(200,150,90,.25)',
        }}>
          <Search size={22} style={{ color: 'var(--gold)' }} strokeWidth={1.6} />
        </div>
        <h1 className="display" style={{ margin: '0 0 8px', fontSize: 28, color: 'var(--t1)' }}>
          Semantic Search
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--t2)' }}>
          Finds the most relevant passages using AI embeddings — not just keyword matching.
        </p>
      </div>

      {/* Search box */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        background: 'var(--bg-2)', border: `1px solid ${q ? 'var(--br-focus)' : 'var(--br)'}`,
        borderRadius: 14, marginBottom: 16, transition: 'all .15s',
        boxShadow: q ? '0 0 0 3px rgba(200,150,90,.08)' : 'none',
      }}>
        <Search size={15} style={{ color: 'var(--t3)', flexShrink: 0 }} strokeWidth={1.5} />
        <input
          ref={ref} value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run()}
          placeholder="Ask anything about your documents…" autoFocus
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14.5, color: 'var(--t1)', caretColor: 'var(--gold)', fontFamily: 'inherit' }}
        />
        {q && (
          <button onClick={() => { setQ(''); setRes([]); setDone(false); }} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>
            ×
          </button>
        )}
        <button onClick={() => run()} disabled={busy || !q.trim()} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
          {busy
            ? <><span className="spin" style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(26,15,4,.3)', borderTopColor: '#1a0f04', borderRadius: '50%' }} /> Searching</>
            : 'Search'
          }
        </button>
      </div>

      {/* Example chips */}
      {!done && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 24 }}>
          {EXAMPLES.map(e => (
            <button key={e} onClick={() => { setQ(e); run(e); }} style={{
              padding: '5px 14px', borderRadius: 999, fontSize: 12.5,
              background: 'var(--bg-2)', border: '1px solid var(--br)',
              color: 'var(--t2)', cursor: 'pointer', transition: 'all .12s',
            }}
              onMouseEnter={e2 => { const el = e2.currentTarget as HTMLElement; el.style.color = 'var(--gold)'; el.style.borderColor = 'var(--br-hi)'; el.style.background = 'var(--gold-dim)'; }}
              onMouseLeave={e2 => { const el = e2.currentTarget as HTMLElement; el.style.color = 'var(--t2)'; el.style.borderColor = 'var(--br)'; el.style.background = 'var(--bg-2)'; }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {err && (
        <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: 'rgba(217,112,112,.08)', border: '1px solid rgba(217,112,112,.2)', color: 'var(--red)', fontSize: 13 }}>
          {err}
        </div>
      )}

      {res.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 2 }}>
            {res.length} result{res.length !== 1 ? 's' : ''} · semantic mode · ranked by relevance
          </div>
          {res.map((r, i) => (
            <div key={i} className="card" style={{ padding: '16px 18px', transition: 'all .15s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--br-hi)'; el.style.background = 'var(--bg-3)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--br)'; el.style.background = 'var(--bg-2)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.title}
                </span>
                <span className="pill pill-gold" style={{ flexShrink: 0 }}>{r.score}</span>
                <span className="pill" style={{ background: 'var(--bg-4)', color: 'var(--t3)', textTransform: 'uppercase', flexShrink: 0, border: '1px solid var(--br)' }}>{r.type}</span>
              </div>
              <p style={{
                margin: 0, fontSize: 13, color: 'var(--t2)', lineHeight: 1.65,
                display: '-webkit-box', WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
              }}>
                {r.snippet}
              </p>
            </div>
          ))}
        </div>
      )}

      {done && !busy && !err && res.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)', fontSize: 13 }}>
          No results found. Try a broader query or upload more documents.
        </div>
      )}
    </div>
  );
}
