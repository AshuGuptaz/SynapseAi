'use client';
import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface Doc { docId: string; name: string; text: string; }
interface Ins {
  summary: string;
  keyPoints: string[];
  entities: { name: string; type: string; role: string; mentions: number }[];
  sentiment: { pos: number; neu: number; neg: number };
  themes: string[];
}

const KEY = 'synapse_docs_v1';
const loadDocs = (): Doc[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };

const ENT_COLOR: Record<string, string> = {
  ORG:   'var(--purple)',
  PER:   'var(--blue)',
  MONEY: 'var(--green)',
  GEO:   'var(--gold)',
  DATE:  'var(--gold-hi)',
};

export default function InsightsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [sel,  setSel]  = useState<Doc | null>(null);
  const [text, setText] = useState('');
  const [data, setData] = useState<Ins | null>(null);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  useEffect(() => { setDocs(loadDocs()); }, []);

  const src  = sel ? sel.text : text;
  const name = sel ? sel.name : 'Pasted text';

  const run = async () => {
    if (!src.trim()) return;
    setBusy(true); setErr(''); setData(null);
    try {
      const r = await fetch('/api/insights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: src, docName: name }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Analysis failed');
      setData(d as Ins);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const total = data ? data.sentiment.pos + data.sentiment.neu + data.sentiment.neg : 100;

  return (
    <div style={{ maxWidth: 900 }}>

      <div style={{ marginBottom: 32 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', opacity: .8 }}>
          Analysis
        </p>
        <h1 className="display" style={{ margin: '0 0 6px', fontSize: 28, color: 'var(--t1)' }}>Insights</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--t2)' }}>AI-powered analysis — summaries, entities, sentiment, themes.</p>
      </div>

      {!data && (
        <div className="card card-gold" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18, letterSpacing: '-0.01em' }}>
            Choose a document to analyze
          </div>

          {docs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {docs.map(d => (
                <button key={d.docId} onClick={() => { setSel(sel?.docId === d.docId ? null : d); setText(''); }} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', transition: 'all .12s',
                  background: sel?.docId === d.docId ? 'var(--gold-dim)' : 'var(--bg-3)',
                  border: `1px solid ${sel?.docId === d.docId ? 'rgba(200,150,90,.4)' : 'var(--br)'}`,
                  color: sel?.docId === d.docId ? 'var(--gold)' : 'var(--t2)',
                }}>
                  {d.name}
                </button>
              ))}
            </div>
          )}

          {!sel && (
            <>
              <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 8 }}>
                {docs.length > 0 ? 'Or paste text directly:' : 'Paste document text to analyze:'}
              </div>
              <textarea className="textarea" rows={6} value={text} onChange={e => setText(e.target.value)} placeholder="Paste any text here — article, report, contract, email…" />
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>
              {(src.length / 1000).toFixed(1)}k chars{src.length > 6000 && ' · first 6 000 used'}
            </span>
            <button onClick={run} disabled={busy || !src.trim()} className="btn btn-primary">
              {busy
                ? <><span className="spin" style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(26,15,4,.3)', borderTopColor: '#1a0f04', borderRadius: '50%' }} /> Analyzing…</>
                : <><Sparkles size={13} /> Analyze with AI</>
              }
            </button>
          </div>
        </div>
      )}

      {err && (
        <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: 'rgba(217,112,112,.08)', border: '1px solid rgba(217,112,112,.2)', color: 'var(--red)', fontSize: 13, display: 'flex', gap: 10 }}>
          <span style={{ flex: 1 }}>{err}</span>
          <button onClick={() => setErr('')} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div className="display" style={{ fontSize: 18, color: 'var(--t1)' }}>{name}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setData(null); setErr(''); }}>← New analysis</button>
          </div>

          {/* Summary */}
          <div className="card card-gold" style={{ padding: '22px 24px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
              Executive Summary
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--t2)', lineHeight: 1.8 }}>{data.summary}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Key points */}
            <div className="card" style={{ padding: '22px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 16 }}>Key Points</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.keyPoints.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.6 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                      background: 'var(--gold-dim)', color: 'var(--gold)',
                      fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {i + 1}
                    </span>
                    {p}
                  </div>
                ))}
              </div>
            </div>

            {/* Sentiment */}
            <div className="card" style={{ padding: '22px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 20 }}>Sentiment Analysis</div>
              {[
                { label: 'Positive', val: data.sentiment.pos, col: 'var(--green)' },
                { label: 'Neutral',  val: data.sentiment.neu, col: 'var(--gold)' },
                { label: 'Negative', val: data.sentiment.neg, col: 'var(--red)' },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: 'var(--t2)' }}>{s.label}</span>
                    <span style={{ color: s.col, fontWeight: 700 }}>{s.val}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: s.col, width: `${(s.val / total) * 100}%`, transition: 'width .7s ease', opacity: .8 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Entities */}
          <div className="card" style={{ padding: '22px 24px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 16 }}>Named Entities</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data.entities.map((e, i) => {
                const color = ENT_COLOR[e.type] ?? 'var(--t2)';
                return (
                  <div key={i} style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                    background: 'var(--bg-3)', border: '1px solid var(--br)',
                    color, cursor: 'default', transition: 'all .12s',
                  }}
                    title={`${e.type} · ${e.role} · ${e.mentions} mention${e.mentions !== 1 ? 's' : ''}`}
                    onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.borderColor = 'var(--br-hi)'}
                    onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.borderColor = 'var(--br)'}
                  >
                    {e.name}
                    <span style={{ marginLeft: 6, fontSize: 9, opacity: .6, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>{e.type}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Themes */}
          <div className="card" style={{ padding: '22px 24px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 16 }}>Themes & Topics</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data.themes.map((t, i) => (
                <span key={i} className="pill pill-gold" style={{ padding: '5px 14px', fontSize: 12.5 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
