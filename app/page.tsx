'use client';
import { useEffect, useState } from 'react';
import { StaggerList, StaggerItem } from '@/components/Stagger';
import CountUp from '@/components/CountUp';

const BARS = [8, 32, 19, 56, 38, 14, 6];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_B = Math.max(...BARS);

const ACTIONS = [
  { label: 'Upload Document', desc: 'Add files to your library',  href: '/documents', color: 'var(--gold)' },
  { label: 'Search Docs',     desc: 'Find any passage instantly',  href: '/search',    color: 'var(--purple)' },
  { label: 'Chat with AI',    desc: 'Ask questions naturally',     href: '/chat',      color: 'var(--green)' },
  { label: 'Get Insights',    desc: 'Analyze and summarize',       href: '/insights',  color: 'var(--blue)' },
];

export default function DashboardPage() {
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    try {
      const docs = JSON.parse(localStorage.getItem('synapse_docs_v1') ?? '[]');
      setDocCount(docs.length);
    } catch {}
  }, []);

  const STATS = [
    { label: 'Documents',   value: docCount, sub: 'Uploaded',     accent: 'var(--gold)' },
    { label: 'Searches',    value: 0,        sub: 'Queries run',   accent: 'var(--purple)' },
    { label: 'Insights',    value: 0,        sub: 'AI analyses',   accent: 'var(--green)' },
    { label: 'Tokens Used', value: 0,        sub: 'Groq + OpenAI', accent: 'var(--blue)' },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Hero */}
      <StaggerList style={{ marginBottom: 44 }}>
        <StaggerItem>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', opacity: .8 }}>
            Your workspace
          </p>
        </StaggerItem>
        <StaggerItem>
          <h1 className="display gradient-text" style={{ margin: '0 0 10px', fontSize: 36 }}>
            Intelligence, amplified.
          </h1>
        </StaggerItem>
        <StaggerItem>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--t2)', maxWidth: 480 }}>
            Upload documents, ask questions, and extract deep insights — all without leaving your browser.
          </p>
        </StaggerItem>
      </StaggerList>

      {/* Stats row */}
      <StaggerList style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {STATS.map(s => (
          <StaggerItem key={s.label}>
            <div className="card card-gold" style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                {s.label}
              </div>
              <div className="display" style={{ fontSize: 38, lineHeight: 1, marginBottom: 6, color: s.accent }}>
                <CountUp to={s.value} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>{s.sub}</div>
            </div>
          </StaggerItem>
        ))}
      </StaggerList>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 16 }}>

        {/* Chart */}
        <StaggerList>
          <StaggerItem>
            <div className="card" style={{ padding: '24px 26px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Upload Activity</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>Documents per day</div>
                </div>
                <span className="pill pill-gold">Demo data</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100 }}>
                {BARS.map((h, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: '100%', borderRadius: '4px 4px 2px 2px',
                      height: `${(h / MAX_B) * 100}%`, minHeight: 4,
                      background: i === 3
                        ? 'linear-gradient(180deg, var(--gold) 0%, rgba(200,150,90,.35) 100%)'
                        : 'linear-gradient(180deg, rgba(200,150,90,.45) 0%, rgba(200,150,90,.15) 100%)',
                      transition: 'height .5s ease',
                      boxShadow: i === 3 ? 'var(--glow-gold)' : 'none',
                    }} />
                    <span style={{ fontSize: 10, color: 'var(--t3)' }}>{DAYS[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </StaggerItem>
        </StaggerList>

        {/* Quick actions */}
        <StaggerList>
          <StaggerItem>
            <div className="card" style={{ padding: '24px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, letterSpacing: '-0.01em' }}>Quick Start</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ACTIONS.map(a => (
                  <a key={a.label} href={a.href} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
                    background: 'var(--bg-3)', border: '1px solid var(--br)',
                    borderRadius: 10, cursor: 'pointer', transition: 'all .18s',
                    textDecoration: 'none',
                  }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = 'var(--bg-4)';
                      el.style.borderColor = 'var(--br-hi)';
                      el.style.transform = 'translateX(3px)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = 'var(--bg-3)';
                      el.style.borderColor = 'var(--br)';
                      el.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>{a.desc}</div>
                    </div>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--t3)', flexShrink: 0 }}>
                      <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </StaggerItem>
        </StaggerList>
      </div>

      {/* Setup banner */}
      <StaggerList>
        <StaggerItem>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
            background: 'rgba(200,150,90,.06)', border: '1px solid var(--br-hi)',
            borderRadius: 12,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, animation: 'glow-pulse 2s infinite' }} />
            <div style={{ flex: 1, fontSize: 13, color: 'var(--t2)' }}>
              <strong style={{ color: 'var(--gold)' }}>Quick setup: </strong>
              Copy{' '}
              <code style={{ background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>.env.local.example</code>
              {' → '}
              <code style={{ background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>.env.local</code>
              {' '}and add your API keys. File extraction works immediately without any keys.
            </div>
            <a href="/documents" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Upload now</a>
          </div>
        </StaggerItem>
      </StaggerList>
    </div>
  );
}
