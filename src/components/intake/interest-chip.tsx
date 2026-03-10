'use client';

import { motion } from 'framer-motion';

interface InterestChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  index?: number;
}

export function InterestChip({ label, selected, onToggle, index = 0 }: InterestChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 border"
      style={
        selected
          ? {
              background: '#F5A800',
              color: '#011E41',
              borderColor: '#F5A800',
              boxShadow: '0 2px 8px rgba(245,168,0,0.3)',
            }
          : {
              background: '#FFFFFF',
              color: '#4F4F4F',
              borderColor: '#E0E0E0',
            }
      }
    >
      {label}
    </motion.button>
  );
}
