'use client';
import { useEffect, useState } from 'react';

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

interface Props {
  to: number;
  duration?: number;
  suffix?: string;
  formatter?: (n: number) => string;
}

export default function CountUp({ to, duration = 1100, suffix = '', formatter }: Props) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (to === 0) { setVal(0); return; }
    let start: number | null = null;
    let raf: number;

    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(easeOutCubic(p) * to));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  const display = formatter ? formatter(val) : val.toLocaleString();
  return <>{display}{suffix}</>;
}
