'use client';

import { useState, useEffect, useRef } from 'react';
import { SchedulePicker } from './schedule-picker';
import { InterestsEditor } from './interests-editor';

interface Interest {
  section: string;
  label: string;
  type: string;
  weight: number;
}

interface PrefsData {
  email: string;
  timezone: string;
  profile: {
    displayName: string;
    roleTitle: string;
    industryFocus: string;
    paused: boolean;
    depthLevel: 'quick' | 'standard' | 'expanded';
  };
  schedule: {
    days: string[];
    hour: number;
    minute: number;
  };
  interests: Interest[];
  keywordBlocks: string[];
  sourceBlocks: string[];
  caps: {
    maxItemsTotal: number;
    maxItemsPerSection: number;
  };
}

type FormState = 'loading' | 'ready' | 'submitting' | 'saved' | 'error' | 'invalid_token';

const WEIGHT_PRESETS = [
  { label: 'Low', value: 70 },
  { label: 'Normal', value: 100 },
  { label: 'High', value: 140 },
  { label: 'Critical', value: 180 },
];

const personalizationEnabled = process.env.NEXT_PUBLIC_PERSONALIZATION_ENABLED === 'true';

export function PrefsForm({ token }: { token: string }) {
  const [data, setData] = useState<PrefsData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [industryFocus, setIndustryFocus] = useState('');
  const [paused, setPaused] = useState(false);
  const [depthLevel, setDepthLevel] = useState<'quick' | 'standard' | 'expanded'>('quick');
  const [days, setDays] = useState<string[]>(['MO', 'WE', 'FR']);
  const [hour, setHour] = useState(6);
  const [minute, setMinute] = useState(0);
  const [timezone, setTimezone] = useState('America/Indiana/Indianapolis');
  const [interests, setInterests] = useState<Interest[]>([]);
  const [formState, setFormState] = useState<FormState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Stage 4 state
  const [keywordBlocks, setKeywordBlocks] = useState<string[]>([]);
  const [sourceBlocks, setSourceBlocks] = useState<string[]>([]);
  const [maxItemsTotal, setMaxItemsTotal] = useState(8);
  const [maxItemsPerSection, setMaxItemsPerSection] = useState(3);
  const [newKeyword, setNewKeyword] = useState('');
  const [newSource, setNewSource] = useState('');

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await fetch(`/api/prefs?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (!res.ok) {
          setErrorMsg(json.error || 'Invalid or expired link');
          setFormState('invalid_token');
          return;
        }

        setData(json);
        setDisplayName(json.profile.displayName || '');
        setRoleTitle(json.profile.roleTitle || '');
        setIndustryFocus(json.profile.industryFocus || '');
        setPaused(json.profile.paused);
        setDepthLevel(json.profile.depthLevel || 'quick');
        setDays(json.schedule.days);
        setHour(json.schedule.hour);
        setMinute(json.schedule.minute);
        setTimezone(json.timezone);
        setInterests(json.interests.map((i: Interest & { id?: string }) => ({
          section: i.section,
          label: i.label,
          type: i.type,
          weight: i.weight ?? 100,
        })));

        // Stage 4 fields
        setKeywordBlocks(json.keywordBlocks || []);
        setSourceBlocks(json.sourceBlocks || []);
        setMaxItemsTotal(json.caps?.maxItemsTotal ?? 8);
        setMaxItemsPerSection(json.caps?.maxItemsPerSection ?? 3);

        setFormState('ready');

        // Animate in
        try {
          const { animate, stagger } = await import('animejs');
          animate('.form-section', {
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 280,
            delay: stagger(80),
            ease: 'outQuad',
          });
        } catch {
          // Skip animation
        }
      } catch {
        setErrorMsg('Failed to load preferences');
        setFormState('error');
      }
    };

    fetchPrefs();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');

    // Button press animation
    try {
      const { animate } = await import('animejs');
      if (buttonRef.current) {
        animate(buttonRef.current, {
          scale: [1, 0.97, 1],
          duration: 120,
          ease: 'outQuad',
        });
      }
    } catch {
      // Skip
    }

    try {
      const res = await fetch(`/api/prefs?token=${encodeURIComponent(token)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: { displayName, roleTitle, industryFocus, paused, depthLevel },
          schedule: { days, hour, minute },
          interests,
          keywordBlocks,
          sourceBlocks,
          caps: { maxItemsTotal, maxItemsPerSection },
        }),
      });

      const json = await res.json();

      if (json.ok) {
        setFormState('saved');
        setTimeout(() => setFormState('ready'), 2000);
      } else {
        setErrorMsg(json.error || 'Failed to save');
        setFormState('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setFormState('error');
    }
  };

  const handleAddKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const kw = newKeyword.toLowerCase().trim();
    if (kw && !keywordBlocks.includes(kw)) {
      setKeywordBlocks([...keywordBlocks, kw]);
    }
    setNewKeyword('');
  };

  const handleAddSource = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const domain = newSource.toLowerCase().trim().replace(/^www\./, '');
    if (domain && !sourceBlocks.includes(domain)) {
      setSourceBlocks([...sourceBlocks, domain]);
    }
    setNewSource('');
  };

  const updateInterestWeight = (index: number, weight: number) => {
    setInterests((prev) =>
      prev.map((int, i) => (i === index ? { ...int, weight } : int))
    );
  };

  if (formState === 'loading') {
    return (
      <div className="text-center py-20">
        <div className="inline-block w-8 h-8 border-2 border-crowe-indigo-dark border-t-transparent rounded-full animate-spin" />
        <p className="text-tint-500 mt-4">Loading your preferences...</p>
      </div>
    );
  }

  if (formState === 'invalid_token') {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-16 h-16 mx-auto bg-crowe-coral/10 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-crowe-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-crowe-indigo-dark">Link Expired</h2>
        <p className="text-tint-500 max-w-md mx-auto">
          {errorMsg || 'This preferences link is invalid or has expired. Check your most recent digest email for a fresh link.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
      {/* Email (read-only) */}
      <div className="form-section opacity-0">
        <p className="text-sm text-tint-500">
          Signed in as <span className="font-medium text-crowe-indigo-dark">{data?.email}</span>
        </p>
      </div>

      {/* Profile */}
      <div className="form-section opacity-0 space-y-4">
        <h3 className="text-lg font-bold text-crowe-indigo-dark">Profile</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-tint-700 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-tint-700 mb-1">Role Title</label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-tint-700 mb-1">Industry Focus</label>
          <input
            type="text"
            value={industryFocus}
            onChange={(e) => setIndustryFocus(e.target.value)}
            className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo"
          />
        </div>

        {/* Pause toggle */}
        <div className="flex items-center gap-3 p-3 bg-crowe-indigo-dark/5 rounded-md">
          <button
            type="button"
            onClick={() => setPaused(!paused)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              paused ? 'bg-crowe-amber' : 'bg-tint-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                paused ? 'translate-x-5' : ''
              }`}
            />
          </button>
          <span className="text-sm text-tint-700">
            {paused ? 'Emails paused' : 'Emails active'}
          </span>
        </div>
      </div>

      {/* Schedule */}
      <div className="form-section opacity-0 space-y-4">
        <h3 className="text-lg font-bold text-crowe-indigo-dark">Delivery Schedule</h3>
        <SchedulePicker
          days={days}
          hour={hour}
          minute={minute}
          timezone={timezone}
          onDaysChange={setDays}
          onHourChange={setHour}
          onMinuteChange={setMinute}
          onTimezoneChange={setTimezone}
        />
      </div>

      {/* Interests */}
      <div className="form-section opacity-0 space-y-4">
        <h3 className="text-lg font-bold text-crowe-indigo-dark">Interests</h3>
        <InterestsEditor interests={interests} onChange={setInterests} />
      </div>

      {/* Coverage Depth (Stage 2) */}
      <div className="form-section opacity-0 space-y-4">
        <h3 className="text-lg font-bold text-crowe-indigo-dark">Coverage Depth</h3>
        <p className="text-sm text-tint-500">
          Choose how broadly to search for relevant content.
        </p>
        <div className="space-y-2">
          {([
            { value: 'quick' as const, label: 'Quick', desc: 'RSS feeds only — fastest, most reliable sources' },
            { value: 'standard' as const, label: 'Standard', desc: 'RSS + targeted web search for broader coverage' },
            { value: 'expanded' as const, label: 'Expanded', desc: 'More web search to fill gaps across all interests' },
          ]).map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all duration-200 ${
                depthLevel === option.value
                  ? 'border-crowe-indigo bg-crowe-indigo-dark/5'
                  : 'border-tint-100 hover:border-tint-300'
              }`}
              onClick={async () => {
                setDepthLevel(option.value);
                try {
                  const { animate } = await import('animejs');
                  const el = document.querySelector(`[data-depth="${option.value}"]`);
                  if (el) {
                    animate(el, { opacity: [0.5, 1], duration: 200, ease: 'outQuad' });
                  }
                } catch { /* skip */ }
              }}
            >
              <input
                type="radio"
                name="depthLevel"
                value={option.value}
                checked={depthLevel === option.value}
                onChange={() => setDepthLevel(option.value)}
                className="mt-0.5 accent-crowe-indigo-dark"
              />
              <div data-depth={option.value}>
                <span className="text-sm font-medium text-crowe-indigo-dark">{option.label}</span>
                <p className="text-xs text-tint-500 mt-0.5">{option.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Stage 4: Interest Priorities */}
      {personalizationEnabled && interests.length > 0 && (
        <div className="form-section opacity-0 space-y-4">
          <h3 className="text-lg font-bold text-crowe-indigo-dark">Interest Priorities</h3>
          <p className="text-sm text-tint-500">
            Adjust how much weight each interest carries in your digest ranking.
          </p>
          <div className="space-y-3">
            {interests.map((interest, idx) => (
              <div key={`${interest.section}-${interest.label}-${idx}`} className="p-3 border border-tint-100 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-crowe-indigo-dark">
                    {interest.label}
                  </span>
                  <span className="text-xs text-tint-500 tabular-nums w-12 text-right">
                    {interest.weight}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={interest.weight}
                  onChange={(e) => updateInterestWeight(idx, parseInt(e.target.value, 10))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-crowe-amber"
                />
                <div className="flex gap-1.5">
                  {WEIGHT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => updateInterestWeight(idx, preset.value)}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                        interest.weight === preset.value
                          ? 'bg-crowe-indigo-dark text-white border-crowe-indigo-dark'
                          : 'bg-white text-tint-700 border-tint-100 hover:border-tint-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage 4: Blocked Keywords */}
      {personalizationEnabled && (
        <div className="form-section opacity-0 space-y-4">
          <h3 className="text-lg font-bold text-crowe-indigo-dark">Blocked Keywords</h3>
          <p className="text-sm text-tint-500">
            Articles matching these keywords will be excluded from your digest.
          </p>
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={handleAddKeyword}
            placeholder="Type a keyword and press Enter"
            className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo"
          />
          {keywordBlocks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywordBlocks.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-crowe-indigo-dark/10 text-crowe-indigo-dark"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => setKeywordBlocks(keywordBlocks.filter((k) => k !== kw))}
                    className="text-crowe-indigo-dark/50 hover:text-crowe-indigo-dark"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stage 4: Blocked Sources */}
      {personalizationEnabled && (
        <div className="form-section opacity-0 space-y-4">
          <h3 className="text-lg font-bold text-crowe-indigo-dark">Blocked Sources</h3>
          <p className="text-sm text-tint-500">
            Articles from these domains will be excluded from your digest.
          </p>
          <input
            type="text"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            onKeyDown={handleAddSource}
            placeholder="Type a domain (e.g. example.com) and press Enter"
            className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo"
          />
          {sourceBlocks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sourceBlocks.map((domain) => (
                <span
                  key={domain}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-crowe-coral/10 text-crowe-coral-dark"
                >
                  {domain}
                  <button
                    type="button"
                    onClick={() => setSourceBlocks(sourceBlocks.filter((d) => d !== domain))}
                    className="text-crowe-coral/50 hover:text-crowe-coral-dark"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stage 4: Digest Size */}
      {personalizationEnabled && (
        <div className="form-section opacity-0 space-y-4">
          <h3 className="text-lg font-bold text-crowe-indigo-dark">Digest Size</h3>
          <p className="text-sm text-tint-500">
            Control how many articles appear in each digest.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-tint-700 mb-1">
                Max total items (1-12)
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={maxItemsTotal}
                onChange={(e) => setMaxItemsTotal(Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 8)))}
                className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-tint-700 mb-1">
                Max per section (1-5)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={maxItemsPerSection}
                onChange={(e) => setMaxItemsPerSection(Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 3)))}
                className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {formState === 'error' && (
        <div className="bg-crowe-coral/10 border border-crowe-coral/20 rounded-md p-3">
          <p className="text-sm text-crowe-coral-dark">{errorMsg}</p>
        </div>
      )}

      {/* Submit */}
      <div className="form-section opacity-0">
        <button
          ref={buttonRef}
          type="submit"
          disabled={formState === 'submitting'}
          className={`w-full py-3 font-bold text-sm rounded-md transition-colors ${
            formState === 'saved'
              ? 'bg-crowe-teal text-white'
              : 'bg-crowe-amber text-crowe-indigo-dark hover:bg-crowe-amber-dark hover:text-white'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {formState === 'submitting'
            ? 'Saving...'
            : formState === 'saved'
            ? 'Saved!'
            : 'Save Preferences'}
        </button>
      </div>
    </form>
  );
}
