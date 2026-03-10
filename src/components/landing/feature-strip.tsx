'use client';

import { useEffect, useRef, useState } from 'react';

interface StatItem {
  target: number;
  suffix: string;
  label: string;
}

const STATS: StatItem[] = [
  { target: 50, suffix: '+', label: 'Curated sources' },
  { target: 8, suffix: '', label: 'Articles per briefing' },
  { target: 7, suffix: 'am', label: 'Delivered by' },
];

function CountUp({ target, suffix, active }: { target: number; suffix: string; active: boolean }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuad
      const eased = 1 - (1 - progress) * (1 - progress);
      start = Math.round(eased * target);
      setValue(start);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [active, target]);

  return (
    <span>
      {value}
      {suffix}
    </span>
  );
}

export function FeatureStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="w-full"
      style={{ background: '#011E41', borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {STATS.map((stat, i) => (
            <div key={i} className="space-y-1">
              <div
                className="text-5xl font-bold"
                style={{ color: '#F5A800', fontFamily: 'var(--font-display)' }}
              >
                <CountUp target={stat.target} suffix={stat.suffix} active={active} />
              </div>
              <div className="text-sm font-medium uppercase tracking-widest" style={{ color: '#BDBDBD' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
