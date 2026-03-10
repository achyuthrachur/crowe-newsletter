'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import Link from 'next/link';

// TODO: replace with <TextReveal> when C1 is provided
// TODO: replace static gradient bg with <AnimatedBg> when C2 is provided

const HEADLINE_WORDS = ['Your', 'daily', 'intelligence', 'briefing,', 'built', 'for', 'your', 'practice.'];

// Custom variant function — valid in framer-motion (disable type narrowing with cast)
 
const WORD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: ((i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] },
  })) as unknown as Variants['visible'],
};

export function HeroSection() {
  const [emailValue, setEmailValue] = useState('');
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Small delay to let the page render before triggering entrance
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ background: '#011E41', minHeight: '92vh' }}
    >
      {/* Static gradient placeholder — replace with <AnimatedBg> when C2 is provided */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 60% 40%, rgba(245,168,0,0.07) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 20% 80%, rgba(5,171,140,0.05) 0%, transparent 60%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-28 pb-24">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-6"
          >
            <span
              className="text-xs font-bold tracking-[4px] uppercase px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(245,168,0,0.15)',
                color: '#F5A800',
                border: '1px solid rgba(245,168,0,0.3)',
              }}
            >
              Crowe AI Innovation
            </span>
          </motion.div>

          {/* Headline — word stagger via framer-motion */}
          {/* TODO: replace with <TextReveal text="..." className="..."> when C1 is provided */}
          <h1
            className="text-5xl sm:text-6xl font-bold leading-[1.1] mb-6"
            style={{ fontFamily: 'var(--font-display)', color: '#FFFFFF' }}
          >
            {HEADLINE_WORDS.map((word, i) => (
              <motion.span
                key={i}
                custom={i}
                variants={WORD_VARIANTS}
                initial="hidden"
                animate={visible ? 'visible' : 'hidden'}
                className="inline-block mr-[0.25em]"
                style={word === 'intelligence' || word === 'briefing,' ? { color: '#F5A800' } : undefined}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.28, delay: 0.52, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-lg leading-relaxed mb-10"
            style={{ color: '#BDBDBD', maxWidth: 520 }}
          >
            AI-powered digests on the regulatory, risk, and technology topics that matter to your
            Crowe practice. Curated from 50+ sources. Delivered before 7am.
          </motion.p>

          {/* Quick-start email capture */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.28, delay: 0.62, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col sm:flex-row gap-3 max-w-md"
          >
            <input
              type="email"
              placeholder="your.name@crowe.com"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg text-sm outline-none"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#FFFFFF',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && emailValue) {
                  window.location.href = `/intake?email=${encodeURIComponent(emailValue)}`;
                }
              }}
            />
            <Link
              href={emailValue ? `/intake?email=${encodeURIComponent(emailValue)}` : '/intake'}
              className="px-6 py-3 rounded-lg text-sm font-bold text-center transition-all duration-150 hover:brightness-110 shrink-0"
              style={{ background: '#F5A800', color: '#011E41' }}
            >
              Get Started →
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={visible ? { opacity: 1 } : {}}
            transition={{ duration: 0.24, delay: 0.72 }}
            className="mt-4 text-xs"
            style={{ color: '#828282' }}
          >
            Already signed up? Check your email for a preferences link.
          </motion.p>
        </div>
      </div>
    </div>
  );
}
