'use client';
import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

export default function SmoothScrollContainer({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.25,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    let rafId: number;
    const tick = (time: number) => { lenis.raf(time); rafId = requestAnimationFrame(tick); };
    rafId = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(rafId); lenis.destroy(); };
  }, []);

  return (
    <div
      ref={wrapperRef}
      id="scroll-root"
      style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}
    >
      <div ref={contentRef} style={{ padding: '36px 40px' }}>
        {children}
      </div>
    </div>
  );
}
