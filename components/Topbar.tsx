'use client';
import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';

const META: Record<string, string> = {
  '/':          'Dashboard',
  '/documents': 'Documents',
  '/search':    'Search',
  '/chat':      'Chat',
  '/insights':  'Insights',
};

export default function Topbar() {
  const path = usePathname();
  const title = META[path] ?? 'Synapse';

  return (
    <header style={{
      height: 'var(--topbar-h)',
      background: 'rgba(5,4,8,.92)',
      borderBottom: '1px solid var(--br)',
      backdropFilter: 'blur(24px)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16, flexShrink: 0,
    }}>
      {/* Breadcrumb */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12.5, color: 'var(--t3)', letterSpacing: '.02em' }}>Workspace</span>
        <span style={{ fontSize: 11, color: 'var(--t3)', opacity: .5 }}>/</span>
        <h1 style={{
          margin: 0, fontSize: 13.5, fontWeight: 600,
          letterSpacing: '-0.01em', color: 'var(--t1)',
        }}>
          {title}
        </h1>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        height: 32, padding: '0 10px',
        background: 'var(--bg-3)', border: '1px solid var(--br)',
        borderRadius: 8, cursor: 'text', minWidth: 190,
      }}>
        <Search size={12} style={{ color: 'var(--t3)', flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: 'var(--t3)', flex: 1 }}>Search documents…</span>
        <kbd style={{
          fontSize: 10, padding: '1px 5px', borderRadius: 4,
          background: 'var(--bg-4)', border: '1px solid var(--br)',
          color: 'var(--t3)', fontFamily: 'monospace',
        }}>⌘K</kbd>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={{
          width: 32, height: 32, borderRadius: 8, border: '1px solid var(--br)',
          background: 'var(--bg-3)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', color: 'var(--t2)',
          position: 'relative', transition: 'all .12s',
        }}>
          <Bell size={14} strokeWidth={1.5} />
          <span style={{
            position: 'absolute', top: 5, right: 5,
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--gold)',
            border: '1.5px solid var(--bg)',
          }} />
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--br)' }} />

        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'linear-gradient(135deg, #b8813e, #c8965c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color: '#1a0f04', cursor: 'pointer',
          letterSpacing: '-.01em',
          boxShadow: '0 0 10px rgba(200,150,90,.2)',
        }}>
          U
        </div>
      </div>
    </header>
  );
}
