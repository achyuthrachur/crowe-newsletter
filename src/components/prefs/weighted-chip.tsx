'use client';

import { motion } from 'framer-motion';

interface WeightedChipProps {
  label: string;
  section: string;
  weight: number;
  onRemove: () => void;
  onWeightChange: (w: number) => void;
}

const PRESETS = [
  { label: 'Low', value: 70 },
  { label: 'Normal', value: 100 },
  { label: 'High', value: 140 },
  { label: 'Critical', value: 180 },
];

export function WeightedChip({ label, section, weight, onRemove, onWeightChange }: WeightedChipProps) {
  const heatWidth = `${(weight / 200) * 100}%`;

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{ background: '#F7F8FA', border: '1px solid #E0E0E0' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#828282' }}>
            {section}
          </span>
          <span className="text-sm font-medium block truncate" style={{ color: '#333333' }}>
            {label}
          </span>
          {/* Weight heat bar */}
          <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ background: '#E0E0E0', width: 80 }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: '#F5A800' }}
              animate={{ width: heatWidth }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-lg leading-none shrink-0 transition-opacity hover:opacity-70"
          style={{ color: '#BDBDBD' }}
          aria-label="Remove interest"
        >
          ×
        </button>
      </div>

      {/* Weight presets */}
      <div className="flex items-center gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onWeightChange(p.value)}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-all duration-150"
            style={
              weight === p.value
                ? { background: '#F5A800', color: '#011E41' }
                : { background: '#E0E0E0', color: '#828282' }
            }
          >
            {p.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] font-mono" style={{ color: '#828282' }}>
          {weight}
        </span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={200}
        value={weight}
        onChange={(e) => onWeightChange(parseInt(e.target.value))}
        className="w-full h-1 rounded appearance-none cursor-pointer"
        style={{ accentColor: '#F5A800' }}
      />
    </div>
  );
}
