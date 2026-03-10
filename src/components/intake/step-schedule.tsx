'use client';

import { motion } from 'framer-motion';

const DAYS = [
  { code: 'MO', label: 'Mon' },
  { code: 'TU', label: 'Tue' },
  { code: 'WE', label: 'Wed' },
  { code: 'TH', label: 'Thu' },
  { code: 'FR', label: 'Fri' },
  { code: 'SA', label: 'Sat' },
  { code: 'SU', label: 'Sun' },
];

const DEPTH_OPTIONS = [
  { value: 'quick', label: 'Quick', description: 'RSS-first, minimal web search' },
  { value: 'standard', label: 'Standard', description: 'RSS + targeted web search' },
  { value: 'expanded', label: 'Expanded', description: 'More web search, deeper coverage' },
];

export interface ScheduleData {
  selectedDays: string[];
  hour: number;
  timezone: string;
  depthLevel: 'quick' | 'standard' | 'expanded';
  deepDiveEnabled: boolean;
  deepDiveDay: string;
}

interface StepScheduleProps {
  data: ScheduleData;
  onChange: (data: Partial<ScheduleData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const LABEL_STYLE = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#828282',
  marginBottom: 8,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

export function StepSchedule({ data, onChange, onNext, onBack }: StepScheduleProps) {
  const canProceed = data.selectedDays.length > 0;

  const toggleDay = (code: string) => {
    const next = data.selectedDays.includes(code)
      ? data.selectedDays.filter((d) => d !== code)
      : [...data.selectedDays, code];
    onChange({ selectedDays: next });
  };

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
        When should we deliver?
      </h2>
      <p className="text-sm mb-8" style={{ color: '#828282' }}>
        Choose your delivery days and the depth of coverage.
      </p>

      {/* Days */}
      <div className="mb-6">
        <label style={LABEL_STYLE}>Delivery days</label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map((day) => (
            <button
              key={day.code}
              type="button"
              onClick={() => toggleDay(day.code)}
              className="w-12 h-12 rounded-xl text-sm font-bold transition-all duration-150"
              style={
                data.selectedDays.includes(day.code)
                  ? { background: '#F5A800', color: '#011E41', border: '2px solid #F5A800' }
                  : { background: '#FFFFFF', color: '#828282', border: '2px solid #E0E0E0' }
              }
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery time */}
      <div className="mb-6">
        <label style={LABEL_STYLE}>Delivery time</label>
        <select
          value={data.hour}
          onChange={(e) => onChange({ hour: parseInt(e.target.value) })}
          className="px-4 py-2.5 rounded-lg text-sm border outline-none"
          style={{ borderColor: '#E0E0E0', color: '#333333', background: '#FFFFFF' }}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>
              {i.toString().padStart(2, '0')}:00
            </option>
          ))}
        </select>
        <span className="text-xs ml-3" style={{ color: '#828282' }}>
          local time (briefings typically arrive around 6–7am)
        </span>
      </div>

      {/* Depth level */}
      <div className="mb-6">
        <label style={LABEL_STYLE}>Coverage depth</label>
        <div className="grid grid-cols-3 gap-3">
          {DEPTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ depthLevel: opt.value as ScheduleData['depthLevel'] })}
              className="p-3 rounded-xl text-left transition-all duration-150 border"
              style={
                data.depthLevel === opt.value
                  ? { background: '#011E41', borderColor: '#011E41', color: '#FFFFFF' }
                  : { background: '#FFFFFF', borderColor: '#E0E0E0', color: '#333333' }
              }
            >
              <div className="text-sm font-bold mb-1">{opt.label}</div>
              <div
                className="text-[11px] leading-snug"
                style={{ color: data.depthLevel === opt.value ? '#BDBDBD' : '#828282' }}
              >
                {opt.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Deep dive toggle */}
      <div
        className="p-4 rounded-xl mb-6"
        style={{ background: '#F7F8FA', border: '1px solid #E0E0E0' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#011E41' }}>Weekly Deep Dive</p>
            <p className="text-xs mt-0.5" style={{ color: '#828282' }}>
              Long-form synthesis on one of your focus areas, sent weekly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ deepDiveEnabled: !data.deepDiveEnabled })}
            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200"
            style={{ background: data.deepDiveEnabled ? '#F5A800' : '#E0E0E0' }}
            role="switch"
            aria-checked={data.deepDiveEnabled}
          >
            <span
              className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: data.deepDiveEnabled ? 'translateX(20px)' : 'translateX(0px)' }}
            />
          </button>
        </div>
        {data.deepDiveEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 pt-3 overflow-hidden"
            style={{ borderTop: '1px solid #E0E0E0' }}
          >
            <label style={{ ...LABEL_STYLE, marginBottom: 4 }}>Deep dive day</label>
            <div className="flex gap-2">
              {DAYS.slice(0, 5).map((day) => (
                <button
                  key={day.code}
                  type="button"
                  onClick={() => onChange({ deepDiveDay: day.code })}
                  className="w-10 h-10 rounded-lg text-xs font-bold transition-all duration-150"
                  style={
                    data.deepDiveDay === day.code
                      ? { background: '#F5A800', color: '#011E41', border: '2px solid #F5A800' }
                      : { background: '#FFFFFF', color: '#828282', border: '2px solid #E0E0E0' }
                  }
                >
                  {day.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex justify-between items-center">
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
          disabled={!canProceed}
          className="px-8 py-3 rounded-lg font-bold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
          style={{ background: '#F5A800', color: '#011E41' }}
        >
          Next: Preview →
        </button>
      </div>
    </motion.div>
  );
}
