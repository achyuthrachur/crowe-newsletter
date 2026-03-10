'use client';

import { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Wraps children and fades + slides them up 8px when they enter the viewport.
 * Uses IntersectionObserver. Accepts a delay prop (ms) for staggering.
 */
export function ScrollReveal({ children, delay = 0, className }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '-40px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 260ms cubic-bezier(0.25,0.1,0.25,1) ${delay}ms, transform 260ms cubic-bezier(0.25,0.1,0.25,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
