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

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export function IntakeForm() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [industryFocus, setIndustryFocus] = useState('');
  const [days, setDays] = useState<string[]>(['MO', 'WE', 'FR']);
  const [hour, setHour] = useState(6);
  const [minute, setMinute] = useState(0);
  const [timezone, setTimezone] = useState('America/Indiana/Indianapolis');
  const [interests, setInterests] = useState<Interest[]>([]);
  const [depthLevel, setDepthLevel] = useState<'quick' | 'standard' | 'expanded'>('quick');
  const [formState, setFormState] = useState<FormState>('idle');
  const [prefsUrl, setPrefsUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Page load animation
    const animateIn = async () => {
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
    };
    animateIn();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');
    setErrorMsg('');

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
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          timezone,
          displayName: displayName || undefined,
          roleTitle: roleTitle || undefined,
          industryFocus: industryFocus || undefined,
          depthLevel,
          schedule: { days, hour, minute },
          interests,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setPrefsUrl(data.prefsUrl);
        setFormState('success');
      } else {
        setErrorMsg(data.error || 'Something went wrong');
        setFormState('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setFormState('error');
    }
  };

  if (formState === 'success') {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto bg-crowe-teal/10 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-crowe-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-crowe-indigo-dark">You&apos;re all set!</h2>
        <p className="text-tint-700 max-w-md mx-auto">
          Your personalized digest is configured. You&apos;ll receive your first briefing on your next scheduled delivery day.
        </p>
        <div className="bg-crowe-indigo-dark/5 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-sm text-tint-500 mb-2">Bookmark this link to update your preferences:</p>
          <a
            href={prefsUrl}
            className="text-sm text-crowe-amber-dark font-medium break-all hover:underline"
          >
            {prefsUrl}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
      {/* Section 1: Email + Profile */}
      <div className="form-section opacity-0 space-y-4">
        <h3 className="text-lg font-bold text-crowe-indigo-dark">Profile</h3>

        <div>
          <label className="block text-sm font-medium text-tint-700 mb-1">
            Email <span className="text-crowe-coral">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-tint-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="First Last"
              className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-tint-700 mb-1">
              Role Title
            </label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g., Senior Consultant"
              className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-tint-700 mb-1">
            Industry Focus
          </label>
          <input
            type="text"
            value={industryFocus}
            onChange={(e) => setIndustryFocus(e.target.value)}
            placeholder="e.g., Financial Services"
            className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo"
          />
        </div>
      </div>

      {/* Section 2: Schedule */}
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

      {/* Section 3: Interests */}
      <div className="form-section opacity-0 space-y-4">
        <h3 className="text-lg font-bold text-crowe-indigo-dark">
          Interests <span className="text-crowe-coral">*</span>
        </h3>
        <p className="text-sm text-tint-500">
          Add topics you want to follow. Group them into sections to organize your digest.
        </p>
        <InterestsEditor interests={interests} onChange={setInterests} />
      </div>

      {/* Section 4: Coverage Depth (Stage 2) */}
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
          disabled={formState === 'submitting' || !email || interests.length === 0}
          className="w-full py-3 bg-crowe-amber text-crowe-indigo-dark font-bold text-sm rounded-md hover:bg-crowe-amber-dark hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {formState === 'submitting' ? 'Setting up...' : 'Start My Briefing'}
        </button>
      </div>
    </form>
  );
}
