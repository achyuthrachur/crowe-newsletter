'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InterestChip } from './interest-chip';
import { INTEREST_CATALOG, INTEREST_CATALOG_SECTIONS } from '@/data/interest-catalog';

export interface InterestItem {
  section: string;
  label: string;
  type: string;
}

interface StepInterestsProps {
  interests: InterestItem[];
  onChange: (interests: InterestItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepInterests({ interests, onChange, onNext, onBack }: StepInterestsProps) {
  const [customSection, setCustomSection] = useState(INTEREST_CATALOG_SECTIONS[0]);
  const [customLabel, setCustomLabel] = useState('');

  const isSelected = (section: string, label: string) =>
    interests.some((i) => i.section === section && i.label === label);

  const toggle = (section: string, label: string) => {
    if (isSelected(section, label)) {
      onChange(interests.filter((i) => !(i.section === section && i.label === label)));
    } else {
      onChange([...interests, { section, label, type: 'topic' }]);
    }
  };

  const addCustom = () => {
    const trimmed = customLabel.trim();
    if (!trimmed) return;
    if (isSelected(customSection, trimmed)) return;
    onChange([...interests, { section: customSection, label: trimmed, type: 'topic' }]);
    setCustomLabel('');
  };

  // Group selected interests by section for preview strip
  const selectedBySect = interests.reduce<Record<string, string[]>>((acc, i) => {
    if (!acc[i.section]) acc[i.section] = [];
    acc[i.section].push(i.label);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <h2
        className="text-2xl font-bold mb-2"
        style={{ color: '#011E41', fontFamily: 'var(--font-display)' }}
      >
        What topics matter most?
      </h2>
      <p className="text-sm mb-6" style={{ color: '#828282' }}>
        Select everything relevant — we&apos;ll surface the best articles per section each morning.
      </p>

      {/* Catalog grouped by section */}
      <div className="space-y-6 max-h-[42vh] overflow-y-auto pr-1">
        {INTEREST_CATALOG_SECTIONS.map((section) => (
          <div key={section}>
            <h3
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: '#828282' }}
            >
              {section}
            </h3>
            <div className="flex flex-wrap gap-2">
              {INTEREST_CATALOG[section].map((label, i) => (
                <InterestChip
                  key={label}
                  label={label}
                  selected={isSelected(section, label)}
                  onToggle={() => toggle(section, label)}
                  index={i}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Custom interest add */}
      <div className="mt-5 flex gap-2 items-end">
        <div className="flex-none">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#828282' }}>
            Section
          </label>
          <select
            value={customSection}
            onChange={(e) => setCustomSection(e.target.value)}
            className="px-2 py-2 rounded-lg text-sm border"
            style={{ borderColor: '#E0E0E0', color: '#333333' }}
          >
            {INTEREST_CATALOG_SECTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#828282' }}>
            Custom interest
          </label>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            placeholder="Add your own topic..."
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ borderColor: '#E0E0E0', color: '#333333' }}
            onFocus={(e) => (e.target.style.borderColor = '#F5A800')}
            onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
          />
        </div>
        <button
          type="button"
          onClick={addCustom}
          className="px-4 py-2 rounded-lg text-sm font-bold transition-all duration-150 hover:brightness-110"
          style={{ background: '#011E41', color: '#FFFFFF' }}
        >
          Add
        </button>
      </div>

      {/* Selected interests preview strip */}
      <AnimatePresence>
        {interests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24 }}
            className="mt-5 overflow-hidden"
          >
            <div
              className="rounded-xl p-4"
              style={{ background: '#F7F8FA', border: '1px solid #E0E0E0' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#828282' }}>
                Your digest sections
              </p>
              <div className="space-y-1.5">
                {Object.entries(selectedBySect).map(([section, labels]) => (
                  <div key={section} className="flex items-start gap-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0 mt-0.5"
                      style={{ background: '#F5A800', color: '#011E41' }}
                    >
                      {section}
                    </span>
                    <span className="text-xs" style={{ color: '#4F4F4F' }}>
                      {labels.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium transition-colors duration-150"
          style={{ color: '#828282' }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={interests.length === 0}
          className="px-8 py-3 rounded-lg font-bold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
          style={{ background: '#F5A800', color: '#011E41' }}
        >
          Next: Schedule →
        </button>
      </div>
    </motion.div>
  );
}
