'use client';

import { motion } from 'framer-motion';
import { AnimatedBg } from '@/components/ui/animated-bg';

interface MastheadProps {
  date: string;
  greeting: string;
}

export function Masthead({ date, greeting }: MastheadProps) {
  return (
    <div className="relative overflow-hidden" style={{ background: '#011E41', isolation: 'isolate' }}>
      {/* Animated dot-wave background */}
      <AnimatedBg />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        {/* Amber top rule */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ height: 2, background: '#F5A800', marginBottom: 18, transformOrigin: 'left' }}
        />

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <img src="/crowe-logo-white.svg" alt="Crowe" style={{ height: 30, width: 'auto' }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="flex flex-col items-end gap-1"
          >
            <span
              className="text-[10px] font-bold tracking-[3px] uppercase"
              style={{ color: 'rgba(245,168,0,0.6)', fontFamily: 'var(--font-display)' }}
            >
              Intelligence Briefing
            </span>
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: '#828282', fontFamily: 'var(--font-body)' }}
            >
              {date}
            </span>
          </motion.div>
        </div>

        {/* Thin amber divider */}
        <div style={{ height: 1, background: 'rgba(245,168,0,0.35)', marginBottom: 14 }} />

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.28 }}
          className="text-base leading-relaxed"
          style={{ color: '#BDBDBD', fontFamily: 'var(--font-body)', maxWidth: 560 }}
        >
          {greeting}
        </motion.p>
      </div>
    </div>
  );
}
