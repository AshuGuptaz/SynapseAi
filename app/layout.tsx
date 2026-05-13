import type { Metadata, Viewport } from 'next';
import { Inter, DM_Serif_Display } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ThreeBackground from '@/components/ThreeBackground';

const inter  = Inter({ subsets: ['latin'], variable: '--font-sans',    display: 'swap' });
const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'Synapse AI',
  description: 'A cinematic AI document platform — upload, search, chat, and extract insights.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
      <body>
        <ThreeBackground />
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: 'var(--bg-3)',
              border: '1px solid var(--br-hi)',
              color: 'var(--t1)',
              fontSize: '13px',
            },
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <Topbar />
            <main id="scroll-root" style={{ flex: 1, overflowY: 'auto', padding: '36px 40px' }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
