'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Search, MessageSquare, Sparkles } from 'lucide-react';

const NAV = [
  { href: '/',          label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/documents', label: 'Documents', Icon: FileText },
  { href: '/search',    label: 'Search',    Icon: Search },
  { href: '/chat',      label: 'Chat',      Icon: MessageSquare },
  { href: '/insights',  label: 'Insights',  Icon: Sparkles },
];

export default function Sidebar() {
  const path = usePathname();
  const active = (h: string) => h === '/' ? path === '/' : path.startsWith(h);

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(5,4,8,0.97)',
      borderRight: '1px solid var(--br)',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '20px 18px 16px',
        borderBottom: '1px solid var(--br)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: 'linear-gradient(135deg, #b8813e 0%, #c8965c 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(200,150,90,.3)',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(26,15,4,0.9)" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="4"  cy="8"  r="1.4" fill="rgba(26,15,4,0.9)" stroke="none"/>
            <circle cx="12" cy="4"  r="1.4" fill="rgba(26,15,4,0.9)" stroke="none"/>
            <circle cx="12" cy="12" r="1.4" fill="rgba(26,15,4,0.9)" stroke="none"/>
            <path d="M5.4 8H9M10.6 4H8.5M10.6 12H8.5M8.5 4v8"/>
          </svg>
        </div>
        <span style={{
          fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em',
          fontFamily: 'var(--font-display), Georgia, serif',
          color: 'var(--t1)',
        }}>
          Synapse
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 9, fontWeight: 800, letterSpacing: '.1em',
          padding: '2px 6px', borderRadius: 4,
          background: 'var(--gold-dim)', color: 'var(--gold)',
          border: '1px solid rgba(200,150,90,.25)',
        }}>
          AI
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          padding: '4px 10px 8px',
          fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
          textTransform: 'uppercase', color: 'var(--t3)',
        }}>
          Workspace
        </span>
        {NAV.map(({ href, label, Icon }) => {
          const on = active(href);
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8,
              fontSize: 13.5, fontWeight: on ? 600 : 450,
              color: on ? 'var(--gold)' : 'var(--t2)',
              background: on ? 'linear-gradient(90deg, rgba(200,150,90,.14) 0%, rgba(200,150,90,.04) 100%)' : 'transparent',
              borderLeft: `2px solid ${on ? 'var(--gold)' : 'transparent'}`,
              transition: 'all .12s',
              textDecoration: 'none',
            }}>
              <span style={{ opacity: on ? 1 : .6, display: 'flex', flexShrink: 0 }}>
                <Icon size={15} strokeWidth={on ? 2 : 1.6} />
              </span>
              {label}
              {on && (
                <span style={{
                  marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--gold)', opacity: .7,
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '14px 18px',
        borderTop: '1px solid var(--br)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--t3)' }}>All systems normal</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t3)' }}>v0.1</span>
      </div>
    </aside>
  );
}
