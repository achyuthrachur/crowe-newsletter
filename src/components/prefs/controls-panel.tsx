'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InterestSectionAccordion, type InterestWithWeight } from './interest-section-accordion';

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
  { value: 'quick', label: 'Quick' },
  { value: 'standard', label: 'Standard' },
  { value: 'expanded', label: 'Expanded' },
];

export interface ControlsData {
  profile: {
    displayName: string;
    roleTitle: string;
    industryFocus: string;
    paused: boolean;
    maxItemsTotal: number;
    maxItemsPerSection: number;
    depthLevel: string;
  };
  schedule: { days: string[]; hour: number; minute: number };
  interests: InterestWithWeight[];
  keywordBlocks: string[];
  sourceBlocks: string[];
  deepDive: {
    enabled: boolean;
    dayOfWeek: string;
    maxSources: number;
    topicIds: string[];
  };
}

interface ControlsPanelProps {
  data: ControlsData;
  onChange: (data: ControlsData) => void;
}

const SECTION_STYLE = {
  background: '#FFFFFF',
  border: '1px solid #E0E0E0',
  borderRadius: 16,
  padding: '20px 24px',
};

const SECTION_TITLE_STYLE = {
  fontSize: 13,
  fontWeight: 700,
  color: '#828282',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom: 16,
};

export function ControlsPanel({ data, onChange }: ControlsPanelProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);

  const update = (patch: Partial<ControlsData>) => onChange({ ...data, ...patch });
  const updateProfile = (patch: Partial<ControlsData['profile']>) =>
    update({ profile: { ...data.profile, ...patch } });
  const updateSchedule = (patch: Partial<ControlsData['schedule']>) =>
    update({ schedule: { ...data.schedule, ...patch } });
  const updateDeepDive = (patch: Partial<ControlsData['deepDive']>) =>
    update({ deepDive: { ...data.deepDive, ...patch } });

  const toggleDay = (code: string) => {
    const days = data.schedule.days.includes(code)
      ? data.schedule.days.filter((d) => d !== code)
      : [...data.schedule.days, code];
    updateSchedule({ days });
  };

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (!kw || data.keywordBlocks.includes(kw)) return;
    update({ keywordBlocks: [...data.keywordBlocks, kw] });
    setNewKeyword('');
  };

  const removeKeyword = (kw: string) =>
    update({ keywordBlocks: data.keywordBlocks.filter((k) => k !== kw) });

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase().replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0];
    if (!d || data.sourceBlocks.includes(d)) return;
    update({ sourceBlocks: [...data.sourceBlocks, d] });
    setNewDomain('');
  };

  const removeDomain = (d: string) =>
    update({ sourceBlocks: data.sourceBlocks.filter((b) => b !== d) });

  return (
    <div className="space-y-4">
      {/* Profile section */}
      <div style={SECTION_STYLE}>
        <button
          type="button"
          onClick={() => setProfileOpen((o) => !o)}
          className="w-full flex items-center justify-between"
        >
          <p style={SECTION_TITLE_STYLE}>Profile</p>
          <span className="text-sm" style={{ color: '#828282' }}>
            {profileOpen ? '▲' : '▼'}
          </span>
        </button>
        {!profileOpen && (
          <div>
            <p className="text-sm font-semibold" style={{ color: '#011E41' }}>
              {data.profile.displayName || 'Name not set'}
            </p>
            <p className="text-xs" style={{ color: '#828282' }}>
              {data.profile.roleTitle || data.profile.industryFocus || 'Click to edit'}
            </p>
          </div>
        )}
        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="mt-4 space-y-3">
                {[
                  { field: 'displayName', label: 'Name', placeholder: 'Your name' },
                  { field: 'roleTitle', label: 'Role', placeholder: 'Senior Associate' },
                  { field: 'industryFocus', label: 'Industry focus', placeholder: 'Financial services' },
                ].map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#828282' }}>
                      {label}
                    </label>
                    <input
                      type="text"
                      value={data.profile[field as keyof typeof data.profile] as string}
                      onChange={(e) => updateProfile({ [field]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ borderColor: '#E0E0E0', color: '#333333' }}
                      onFocus={(e) => (e.target.style.borderColor = '#F5A800')}
                      onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
                    />
                  </div>
                ))}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.profile.paused}
                    onChange={(e) => updateProfile({ paused: e.target.checked })}
                    style={{ accentColor: '#F5A800' }}
                  />
                  <span className="text-sm" style={{ color: '#333333' }}>Pause all emails</span>
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Schedule */}
      <div style={SECTION_STYLE}>
        <p style={SECTION_TITLE_STYLE}>Schedule</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {DAYS.map((day) => (
            <button
              key={day.code}
              type="button"
              onClick={() => toggleDay(day.code)}
              className="w-11 h-11 rounded-xl text-xs font-bold transition-all duration-150"
              style={
                data.schedule.days.includes(day.code)
                  ? { background: '#F5A800', color: '#011E41', border: '2px solid #F5A800' }
                  : { background: '#F7F8FA', color: '#828282', border: '2px solid #E0E0E0' }
              }
            >
              {day.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#828282' }}>Time</label>
          <select
            value={data.schedule.hour}
            onChange={(e) => updateSchedule({ hour: parseInt(e.target.value) })}
            className="px-3 py-1.5 rounded-lg text-sm border outline-none"
            style={{ borderColor: '#E0E0E0', color: '#333333' }}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
            ))}
          </select>
        </div>
      </div>

      {/* Depth */}
      <div style={SECTION_STYLE}>
        <p style={SECTION_TITLE_STYLE}>Coverage depth</p>
        <div className="flex gap-2">
          {DEPTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateProfile({ depthLevel: opt.value })}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-150 border"
              style={
                data.profile.depthLevel === opt.value
                  ? { background: '#011E41', borderColor: '#011E41', color: '#FFFFFF' }
                  : { background: '#F7F8FA', borderColor: '#E0E0E0', color: '#828282' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interests with weights */}
      <div style={SECTION_STYLE}>
        <p style={SECTION_TITLE_STYLE}>Interests & weights</p>
        <InterestSectionAccordion
          interests={data.interests}
          onUpdate={(interests) => update({ interests })}
        />
      </div>

      {/* Digest caps */}
      <div style={SECTION_STYLE}>
        <p style={SECTION_TITLE_STYLE}>Digest caps</p>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#828282' }}>
                Max total articles
              </label>
              <span className="text-xs font-bold" style={{ color: '#F5A800' }}>
                {data.profile.maxItemsTotal}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              value={data.profile.maxItemsTotal}
              onChange={(e) => updateProfile({ maxItemsTotal: parseInt(e.target.value) })}
              className="w-full"
              style={{ accentColor: '#F5A800' }}
            />
            <div className="flex justify-between text-[10px]" style={{ color: '#BDBDBD' }}>
              <span>1</span><span>12</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#828282' }}>
                Max per section
              </label>
              <span className="text-xs font-bold" style={{ color: '#F5A800' }}>
                {data.profile.maxItemsPerSection}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={data.profile.maxItemsPerSection}
              onChange={(e) => updateProfile({ maxItemsPerSection: parseInt(e.target.value) })}
              className="w-full"
              style={{ accentColor: '#F5A800' }}
            />
            <div className="flex justify-between text-[10px]" style={{ color: '#BDBDBD' }}>
              <span>1</span><span>5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Keyword blocks */}
      <div style={SECTION_STYLE}>
        <p style={SECTION_TITLE_STYLE}>Keyword blocks</p>
        <p className="text-xs mb-3" style={{ color: '#828282' }}>
          Articles containing these words will be excluded from your digest.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {data.keywordBlocks.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
              style={{ background: '#F7F8FA', border: '1px solid #E0E0E0', color: '#333333' }}
            >
              {kw}
              <button
                type="button"
                onClick={() => removeKeyword(kw)}
                className="text-base leading-none ml-1 hover:opacity-60"
                style={{ color: '#BDBDBD' }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
            placeholder="e.g. crypto"
            className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ borderColor: '#E0E0E0', color: '#333333' }}
            onFocus={(e) => (e.target.style.borderColor = '#F5A800')}
            onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
          />
          <button
            type="button"
            onClick={addKeyword}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:brightness-110"
            style={{ background: '#011E41', color: '#FFFFFF' }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Source blocks */}
      <div style={SECTION_STYLE}>
        <p style={SECTION_TITLE_STYLE}>Blocked sources</p>
        <p className="text-xs mb-3" style={{ color: '#828282' }}>
          Articles from these domains will be excluded.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {data.sourceBlocks.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-mono"
              style={{ background: '#F7F8FA', border: '1px solid #E0E0E0', color: '#333333' }}
            >
              {d}
              <button
                type="button"
                onClick={() => removeDomain(d)}
                className="text-base leading-none ml-1 hover:opacity-60"
                style={{ color: '#BDBDBD' }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDomain(); } }}
            placeholder="e.g. medium.com"
            className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ borderColor: '#E0E0E0', color: '#333333' }}
            onFocus={(e) => (e.target.style.borderColor = '#F5A800')}
            onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
          />
          <button
            type="button"
            onClick={addDomain}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:brightness-110"
            style={{ background: '#011E41', color: '#FFFFFF' }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Deep dive (Stage 3) */}
      <div style={SECTION_STYLE}>
        <p style={SECTION_TITLE_STYLE}>Weekly Deep Dive</p>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#011E41' }}>Enable weekly deep dive</p>
            <p className="text-xs mt-0.5" style={{ color: '#828282' }}>
              Long-form synthesis on a focus area, sent weekly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateDeepDive({ enabled: !data.deepDive.enabled })}
            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200"
            style={{ background: data.deepDive.enabled ? '#F5A800' : '#E0E0E0' }}
            role="switch"
            aria-checked={data.deepDive.enabled}
          >
            <span
              className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: data.deepDive.enabled ? 'translateX(20px)' : 'translateX(0px)' }}
            />
          </button>
        </div>

        <AnimatePresence>
          {data.deepDive.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="pt-3 space-y-3" style={{ borderTop: '1px solid #E0E0E0' }}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#828282' }}>
                    Deep dive day
                  </label>
                  <div className="flex gap-2">
                    {DAYS.slice(0, 5).map((day) => (
                      <button
                        key={day.code}
                        type="button"
                        onClick={() => updateDeepDive({ dayOfWeek: day.code })}
                        className="w-10 h-10 rounded-lg text-xs font-bold transition-all duration-150"
                        style={
                          data.deepDive.dayOfWeek === day.code
                            ? { background: '#F5A800', color: '#011E41', border: '2px solid #F5A800' }
                            : { background: '#F7F8FA', color: '#828282', border: '2px solid #E0E0E0' }
                        }
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {data.interests.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#828282' }}>
                      Topics for deep dive (1–3)
                    </label>
                    <div className="space-y-1">
                      {data.interests.slice(0, 8).map((interest) => (
                        <label key={interest.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={data.deepDive.topicIds.includes(interest.id)}
                            onChange={() => {
                              const ids = data.deepDive.topicIds;
                              if (ids.includes(interest.id)) {
                                updateDeepDive({ topicIds: ids.filter((id) => id !== interest.id) });
                              } else if (ids.length < 3) {
                                updateDeepDive({ topicIds: [...ids, interest.id] });
                              }
                            }}
                            style={{ accentColor: '#F5A800' }}
                          />
                          <span className="text-sm" style={{ color: '#333333' }}>
                            {interest.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
