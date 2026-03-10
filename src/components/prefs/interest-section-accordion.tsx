'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WeightedChip } from './weighted-chip';

export interface InterestWithWeight {
  id: string;
  section: string;
  label: string;
  type: string;
  weight: number;
}

interface InterestSectionAccordionProps {
  interests: InterestWithWeight[];
  onUpdate: (interests: InterestWithWeight[]) => void;
}

function groupBySection(interests: InterestWithWeight[]) {
  return interests.reduce<Record<string, InterestWithWeight[]>>((acc, i) => {
    if (!acc[i.section]) acc[i.section] = [];
    acc[i.section].push(i);
    return acc;
  }, {});
}

function AccordionSection({
  section,
  items,
  onRemove,
  onWeightChange,
}: {
  section: string;
  items: InterestWithWeight[];
  onRemove: (id: string) => void;
  onWeightChange: (id: string, weight: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const avgWeight = Math.round(items.reduce((s, i) => s + i.weight, 0) / items.length);

  return (
    <div style={{ border: '1px solid #E0E0E0', borderRadius: 12, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 transition-colors duration-150"
        style={{ background: open ? '#011E41' : '#F7F8FA' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-bold"
            style={{ color: open ? '#FFFFFF' : '#011E41' }}
          >
            {section}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: open ? 'rgba(245,168,0,0.2)' : '#E0E0E0', color: open ? '#F5A800' : '#828282' }}
          >
            {items.length} topic{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: open ? '#828282' : '#BDBDBD' }}>
            avg weight: {avgWeight}
          </span>
          <span
            className="text-sm transition-transform duration-200"
            style={{
              color: open ? '#F5A800' : '#828282',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              display: 'inline-block',
            }}
          >
            ▾
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="p-4 grid grid-cols-1 gap-2" style={{ background: '#FFFFFF' }}>
              {items.map((item) => (
                <WeightedChip
                  key={item.id}
                  label={item.label}
                  section={item.section}
                  weight={item.weight}
                  onRemove={() => onRemove(item.id)}
                  onWeightChange={(w) => onWeightChange(item.id, w)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function InterestSectionAccordion({ interests, onUpdate }: InterestSectionAccordionProps) {
  const grouped = groupBySection(interests);

  const handleRemove = (id: string) => {
    onUpdate(interests.filter((i) => i.id !== id));
  };

  const handleWeightChange = (id: string, weight: number) => {
    onUpdate(interests.map((i) => (i.id === id ? { ...i, weight } : i)));
  };

  if (interests.length === 0) {
    return (
      <div
        className="py-10 text-center rounded-xl"
        style={{ background: '#F7F8FA', border: '1px dashed #E0E0E0' }}
      >
        <p className="text-sm" style={{ color: '#828282' }}>
          No interests configured.
        </p>
        <a href="/intake" className="text-sm font-semibold mt-1 block" style={{ color: '#F5A800' }}>
          Add interests →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([section, items]) => (
        <AccordionSection
          key={section}
          section={section}
          items={items}
          onRemove={handleRemove}
          onWeightChange={handleWeightChange}
        />
      ))}
    </div>
  );
}
