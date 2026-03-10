'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function ProgressBar({ currentStep, totalSteps, labels }: ProgressBarProps) {
  const pct = ((currentStep) / totalSteps) * 100;

  return (
    <div className="w-full">
      {/* Step labels */}
      <div className="flex justify-between mb-2">
        {labels.map((label, i) => (
          <span
            key={i}
            className="text-[10px] font-medium uppercase tracking-wider transition-colors duration-200"
            style={{ color: i < currentStep ? '#F5A800' : i === currentStep ? '#011E41' : '#BDBDBD' }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Bar */}
      <div
        className="w-full h-1 rounded-full overflow-hidden"
        style={{ background: '#E0E0E0' }}
      >
        <motion.div
          layoutId="progress-fill"
          className="h-full rounded-full"
          style={{ background: '#F5A800' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
    </div>
  );
}
