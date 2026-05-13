'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { UploadCloud, FileText, Trash2, MessageSquare, Sparkles } from 'lucide-react';
import { StaggerList, StaggerItem } from '@/components/Stagger';

interface Doc { docId:string; name:string; type:string; pages:number; chunks:number; chars:number; hasEmbedding:boolean; text:string; }

const EXT_COLOR: Record<string, string> = {
  pdf:  'var(--red)',
  docx: 'var(--purple)',
  xlsx: 'var(--green)',
  txt:  'var(--blue)',
  md:   'var(--purple)',
  csv:  'var(--gold)',
  json: 'var(--gold-hi)',
};

const ACCEPTED = '.pdf,.docx,.txt,.md,.csv,.json,.xlsx,.xls,.html,.xml,.log';
const KEY = 'synapse_docs_v1';
const load = (): Doc[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };
const save = (d: Doc[]) => localStorage.setItem(KEY, JSON.stringify(d));

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState('');
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { setDocs(load()); }, []);

  const addDoc = (d: Doc) => setDocs(prev => { const n = [d, ...prev.filter(x => x.docId !== d.docId)]; save(n); return n; });
  const delDoc = (id: string) => setDocs(prev => { const n = prev.filter(x => x.docId !== id); save(n); return n; });

  const uploadFile = useCallback(async (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const d   = await res.json();
    if (!res.ok) throw new Error(d.error ?? 'Upload failed');
    return d as Doc;
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      setProg(`Processing "${f.name}"…`);
      try {
        const doc = await uploadFile(f);
        addDoc(doc);
        toast.success(`"${f.name}" uploaded — ${(doc.chars / 1000).toFixed(1)}k chars extracted`);
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
    }
    setProg('');
    setBusy(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadFile]);

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); };

  const [cols, setCols] = useState(3);
  useEffect(() => {
    const update = () => setCols(window.innerWidth < 900 ? 1 : window.innerWidth < 1200 ? 2 : 3);
    update(); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div style={{ maxWidth: 1020 }}>

      <StaggerList style={{ marginBottom: 32 }}>
        <StaggerItem>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', opacity: .8 }}>
            Library
          </p>
        </StaggerItem>
        <StaggerItem>
          <h1 className="display" style={{ margin: '0 0 6px', fontSize: 28, color: 'var(--t1)' }}>Documents</h1>
        </StaggerItem>
        <StaggerItem>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--t2)' }}>Upload files to extract, embed, and query with AI.</p>
        </StaggerItem>
      </StaggerList>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onClick={() => !busy && input.current?.click()}
        style={{
          border: `2px dashed ${drag ? 'var(--gold)' : 'var(--br-hi)'}`,
          borderRadius: 18, padding: '52px 32px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          cursor: busy ? 'default' : 'pointer',
          background: drag ? 'rgba(200,150,90,.05)' : 'transparent',
          transition: 'all .2s ease', marginBottom: 28,
          boxShadow: drag ? 'var(--glow-gold)' : 'none',
        }}
      >
        <input ref={input} type="file" style={{ display: 'none' }} multiple accept={ACCEPTED} onChange={e => handleFiles(e.target.files)} />

        <div style={{
          width: 58, height: 58, borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(200,150,90,.2), rgba(155,142,196,.12))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(200,150,90,.25)',
          transition: 'transform .2s ease',
          transform: drag ? 'scale(1.08)' : 'scale(1)',
        }}>
          {busy
            ? <div className="spin" style={{ width: 22, height: 22, border: '2px solid var(--br-hi)', borderTopColor: 'var(--gold)', borderRadius: '50%' }} />
            : <UploadCloud size={24} style={{ color: drag ? 'var(--gold-hi)' : 'var(--gold)' }} strokeWidth={1.6} />
          }
        </div>

        <div style={{ textAlign: 'center' }}>
          {busy
            ? <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{prog}</div>
            : <>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 5 }}>
                  Drop files here, or{' '}
                  <span style={{ color: 'var(--gold)', textDecoration: 'underline', textUnderlineOffset: 3 }}>browse</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--t3)' }}>PDF · DOCX · XLSX · TXT · MD · CSV · JSON — up to 50 MB</div>
              </>
          }
        </div>

        {busy && (
          <div style={{ width: 220, height: 3, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--gold), var(--purple))', animation: 'shimmer 1.5s infinite', backgroundSize: '600px 100%' }} />
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
          File extraction works without API keys
        </div>
      </div>

      {/* Doc grid */}
      {docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14, opacity: .35 }}>
            <FileText size={44} style={{ color: 'var(--t3)' }} />
          </div>
          <div style={{ fontSize: 14, color: 'var(--t3)' }}>No documents yet — upload your first file above</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
              {docs.length} document{docs.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>Stored locally in browser</span>
          </div>
          <StaggerList style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 12 }}>
            {docs.map(doc => {
              const color = EXT_COLOR[doc.type] ?? 'var(--t2)';
              return (
                <StaggerItem key={doc.docId}>
                  <div className="card" style={{ padding: 18, transition: 'border-color .18s, transform .18s', height: '100%' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--br-hi)'; el.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--br)'; el.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 9,
                        background: 'var(--bg-3)', border: '1px solid var(--br)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                          {doc.type}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.name}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3, display: 'flex', gap: 6 }}>
                          <span>{doc.pages} page{doc.pages !== 1 ? 's' : ''}</span>
                          <span style={{ opacity: .4 }}>·</span>
                          <span>{(doc.chars / 1000).toFixed(1)}k chars</span>
                          {doc.hasEmbedding && <span style={{ color: 'var(--green)' }}>· embedded</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => { delDoc(doc.docId); toast.success(`"${doc.name}" removed`); }}
                        style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', padding: '2px', flexShrink: 0, transition: 'color .12s', display: 'flex' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--red)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t3)'}
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 7 }}>
                      {[
                        { label: 'Chat',     Icon: MessageSquare, href: `/chat?doc=${doc.docId}`,     color: 'var(--gold)' },
                        { label: 'Insights', Icon: Sparkles,      href: `/insights?doc=${doc.docId}`, color: 'var(--purple)' },
                      ].map(btn => (
                        <a key={btn.label} href={btn.href} style={{
                          flex: 1, textAlign: 'center', padding: '7px 0',
                          borderRadius: 8, fontSize: 12, fontWeight: 500,
                          background: 'var(--bg-3)', border: '1px solid var(--br)',
                          color: 'var(--t2)', textDecoration: 'none', transition: 'all .14s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = btn.color; el.style.borderColor = btn.color + '55'; el.style.background = 'var(--bg-4)'; }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--t2)'; el.style.borderColor = 'var(--br)'; el.style.background = 'var(--bg-3)'; }}
                        >
                          <btn.Icon size={11} />
                          {btn.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerList>
        </>
      )}
    </div>
  );
}
