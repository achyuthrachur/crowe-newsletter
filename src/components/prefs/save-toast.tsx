'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface SaveToastProps {
  visible: boolean;
  message?: string;
}

export function SaveToast({ visible, message = 'Preferences saved' }: SaveToastProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 10, x: '-50%' }}
          transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold"
          style={{ background: '#011E41', color: '#FFFFFF' }}
        >
          <span style={{ color: '#F5A800' }}>✓</span>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
