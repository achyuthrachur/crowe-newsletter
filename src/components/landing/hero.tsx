'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import VaporizeTextCycle, { Tag } from '@/components/ui/text-reveal';
import { AnimatedBg } from '@/components/ui/animated-bg';

const CYCLING_PHRASES = [
  'intelligence briefing,',
  'regulatory digest,',
  'risk intelligence,',
];

export function HeroSection() {
  const [emailValue, setEmailValue] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ background: '#011E41', minHeight: '92vh', isolation: 'isolate' }}
    >
      {/* C2 — Animated dotted surface background */}
      <AnimatedBg />

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

          {/* Headline — static prefix + C1 VaporizeTextCycle for cycling phrase */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={visible ? { opacity: 1 } : {}}
            transition={{ duration: 0.28, delay: 0.1 }}
          >
            <h1
              className="font-bold leading-[1.1] mb-2"
              style={{ fontFamily: 'var(--font-display)', color: '#FFFFFF', fontSize: 'clamp(2.5rem, 5vw, 3.75rem)' }}
            >
              Your daily
            </h1>

            {/* C1 — VaporizeTextCycle cycling phrase in amber */}
            <div style={{ height: 'clamp(3rem, 6vw, 4.5rem)', width: '100%', maxWidth: 600 }}>
              <VaporizeTextCycle
                texts={CYCLING_PHRASES}
                font={{
                  fontFamily: 'var(--font-display), Arial, sans-serif',
                  fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
                  fontWeight: 700,
                }}
                color="rgb(245, 168, 0)"
                spread={4}
                density={6}
                animation={{ vaporizeDuration: 2, fadeInDuration: 0.8, waitDuration: 2 }}
                direction="left-to-right"
                alignment="left"
                tag={Tag.H1}
              />
            </div>

            <h1
              className="font-bold leading-[1.1] mb-6"
              style={{ fontFamily: 'var(--font-display)', color: '#FFFFFF', fontSize: 'clamp(2.5rem, 5vw, 3.75rem)' }}
            >
              built for your practice.
            </h1>
          </motion.div>

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
