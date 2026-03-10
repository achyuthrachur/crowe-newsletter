'use client';

import { motion } from 'framer-motion';

interface ReaderFooterProps {
  token: string;
}

export function ReaderFooter({ token }: ReaderFooterProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="mt-12"
      style={{ background: '#011E41' }}
    >
      <div className="max-w-4xl mx-auto px-6 py-10 text-center">
        {/* Amber rule */}
        <div style={{ height: 1, background: 'rgba(245,168,0,0.4)', marginBottom: 24 }} />

        <img
          src="/crowe-logo-white.svg"
          alt="Crowe"
          className="mx-auto mb-6"
          style={{ height: 26, width: 'auto', opacity: 0.9 }}
        />

        <div className="flex justify-center gap-8 flex-wrap mb-6">
          <a
            href={`/prefs?token=${token}`}
            className="text-sm font-semibold transition-opacity hover:opacity-75"
            style={{ color: '#F5A800' }}
          >
            Update preferences
          </a>
          <a
            href={`/api/pause?token=${token}`}
            className="text-sm transition-opacity hover:opacity-75"
            style={{ color: '#BDBDBD' }}
          >
            Pause emails
          </a>
          <a
            href={`/api/unsubscribe?token=${token}`}
            className="text-sm transition-opacity hover:opacity-75"
            style={{ color: '#BDBDBD' }}
          >
            Unsubscribe
          </a>
        </div>

        <p className="text-xs" style={{ color: '#4F4F4F' }}>
          #SmartDecisions · Crowe LLP AI Innovation Team
        </p>
      </div>
    </motion.div>
  );
}
