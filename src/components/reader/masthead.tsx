'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface MastheadProps {
  date: string;
  greeting: string;
}

export function Masthead({ date, greeting }: MastheadProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ background: '#011E41' }}
    >
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Top rule */}
        <div style={{ height: 2, background: '#F5A800', marginBottom: 14 }} />

        <div className="flex items-baseline justify-between mb-3">
          <img src="/crowe-logo-white.svg" alt="Crowe" style={{ height: 28, width: 'auto' }} />
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: '#828282' }}
          >
            {date}
          </span>
        </div>

        {/* Thin amber rule */}
        <div style={{ height: 1, background: 'rgba(245,168,0,0.4)', marginBottom: 12 }} />

        <p className="text-sm" style={{ color: '#BDBDBD' }}>
          {greeting}
        </p>
      </div>
    </motion.div>
  );
}
