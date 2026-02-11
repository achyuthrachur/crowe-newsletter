'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Interest {
  id: string;
  section: string;
  label: string;
  type: string;
}

interface PrefsData {
  email: string;
  timezone: string;
  profile: {
    displayName: string;
    roleTitle: string;
    industryFocus: string;
    paused: boolean;
  };
  schedule: {
    days: string[];
    hour: number;
    minute: number;
  };
  interests: Interest[];
  deepDive?: {
    enabled: boolean;
    dayOfWeek: string;
    maxSources: number;
    topicIds: string[];
  };
}

const DAYS = [
  { code: 'MO', label: 'Mon' },
  { code: 'TU', label: 'Tue' },
  { code: 'WE', label: 'Wed' },
  { code: 'TH', label: 'Thu' },
  { code: 'FR', label: 'Fri' },
  { code: 'SA', label: 'Sat' },
  { code: 'SU', label: 'Sun' },
];

const FULL_DAYS = [
  { code: 'MO', label: 'Monday' },
  { code: 'TU', label: 'Tuesday' },
  { code: 'WE', label: 'Wednesday' },
  { code: 'TH', label: 'Thursday' },
  { code: 'FR', label: 'Friday' },
  { code: 'SA', label: 'Saturday' },
  { code: 'SU', label: 'Sunday' },
];

export default function PreferencesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center">
        <p className="text-[var(--crowe-tint-500)]">Loading preferences...</p>
      </div>
    }>
      <PreferencesContent />
    </Suspense>
  );
}

function PreferencesContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PrefsData | null>(null);

  // Deep dive state
  const [deepDiveEnabled, setDeepDiveEnabled] = useState(false);
  const [deepDiveDow, setDeepDiveDow] = useState('FR');
  const [deepDiveMaxSources, setDeepDiveMaxSources] = useState(12);
  const [deepDiveTopicIds, setDeepDiveTopicIds] = useState<string[]>([]);

  const fetchPrefs = useCallback(async () => {
    if (!token) {
      setError('No token provided. Use the link from your email.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/prefs?token=${token}`);
      if (!res.ok) {
        setError(res.status === 401 ? 'Invalid or expired token.' : 'Failed to load preferences.');
        setLoading(false);
        return;
      }
      const prefs: PrefsData = await res.json();
      setData(prefs);

      if (prefs.deepDive) {
        setDeepDiveEnabled(prefs.deepDive.enabled);
        setDeepDiveDow(prefs.deepDive.dayOfWeek);
        setDeepDiveMaxSources(prefs.deepDive.maxSources);
        setDeepDiveTopicIds(prefs.deepDive.topicIds);
      }
    } catch {
      setError('Failed to load preferences.');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleSave = async () => {
    if (!token || !data) return;
    setSaving(true);
    setSaved(false);

    try {
      const body = {
        profile: data.profile,
        schedule: data.schedule,
        interests: data.interests,
        deepDive: {
          enabled: deepDiveEnabled,
          dayOfWeek: deepDiveDow,
          maxSources: deepDiveMaxSources,
          topicIds: deepDiveTopicIds,
        },
      };

      const res = await fetch(`/api/prefs?token=${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError('Failed to save preferences.');
      }
    } catch {
      setError('Failed to save preferences.');
    }
    setSaving(false);
  };

  const toggleDay = (code: string) => {
    if (!data) return;
    const days = data.schedule.days.includes(code)
      ? data.schedule.days.filter((d) => d !== code)
      : [...data.schedule.days, code];
    setData({ ...data, schedule: { ...data.schedule, days } });
  };

  const toggleDeepDiveTopic = (interestId: string) => {
    if (deepDiveTopicIds.includes(interestId)) {
      setDeepDiveTopicIds(deepDiveTopicIds.filter((id) => id !== interestId));
    } else if (deepDiveTopicIds.length < 3) {
      setDeepDiveTopicIds([...deepDiveTopicIds, interestId]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center">
        <p className="text-[var(--crowe-tint-500)]">Loading preferences...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <h1 className="text-xl font-bold text-[var(--crowe-indigo)] mb-4">Newsletter Distribution Agent</h1>
          <p className="text-[var(--crowe-tint-700)]">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const deepResearchEnabled = process.env.NEXT_PUBLIC_DEEP_RESEARCH_ENABLED === 'true';

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--crowe-indigo)]">Your Preferences</h1>
          <p className="text-[var(--crowe-tint-500)] mt-1">{data.email}</p>
        </div>

        {/* Schedule */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-[var(--crowe-indigo)] mb-4">Digest Schedule</h2>
          <div className="flex gap-2 mb-4">
            {DAYS.map((day) => (
              <button
                key={day.code}
                onClick={() => toggleDay(day.code)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  data.schedule.days.includes(day.code)
                    ? 'bg-[var(--crowe-amber)] text-[var(--crowe-indigo)]'
                    : 'bg-[#F7F7F7] text-[var(--crowe-tint-700)] hover:bg-[var(--crowe-tint-100)]'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          <div className="flex gap-4 items-center">
            <label className="text-sm text-[var(--crowe-tint-700)]">Time:</label>
            <select
              value={data.schedule.hour}
              onChange={(e) =>
                setData({
                  ...data,
                  schedule: { ...data.schedule, hour: parseInt(e.target.value) },
                })
              }
              className="border border-[var(--crowe-tint-100)] rounded px-3 py-1.5 text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Interests */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-[var(--crowe-indigo)] mb-4">Interests</h2>
          <div className="flex flex-wrap gap-2">
            {data.interests.map((interest) => (
              <span
                key={interest.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F7F7] rounded-full text-sm text-[var(--crowe-tint-700)]"
              >
                <span className="text-[10px] text-[var(--crowe-tint-500)] uppercase">
                  {interest.section}
                </span>
                {interest.label}
                <button
                  onClick={() => {
                    setData({
                      ...data,
                      interests: data.interests.filter((i) => i.id !== interest.id),
                    });
                    // Also remove from deep dive topics if selected
                    setDeepDiveTopicIds(deepDiveTopicIds.filter((id) => id !== interest.id));
                  }}
                  className="ml-1 text-[var(--crowe-tint-300)] hover:text-[var(--crowe-tint-700)] transition-colors"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          {data.interests.length === 0 && (
            <p className="text-sm text-[var(--crowe-tint-500)]">
              No interests configured. Add some on the intake page.
            </p>
          )}
        </section>

        {/* Deep Dive (Stage 3) */}
        {deepResearchEnabled && (
          <section className="bg-white rounded-lg shadow-sm p-6 mb-6 border-l-4 border-[var(--crowe-amber)]">
            <h2 className="text-lg font-bold text-[var(--crowe-indigo)] mb-2">Weekly Deep Dive</h2>
            <p className="text-sm text-[var(--crowe-tint-500)] mb-4">
              Get a comprehensive research report on one topic each week.
            </p>

            {/* Enable toggle */}
            <label className="flex items-center gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={deepDiveEnabled}
                onChange={(e) => setDeepDiveEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-[var(--crowe-tint-300)] accent-[var(--crowe-amber)]"
              />
              <span className="text-sm font-medium text-[var(--crowe-tint-900)]">
                Enable weekly deep dive
              </span>
            </label>

            {deepDiveEnabled && (
              <>
                {/* Day of week */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-[var(--crowe-tint-700)] mb-2">
                    Day of week
                  </label>
                  <select
                    value={deepDiveDow}
                    onChange={(e) => setDeepDiveDow(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--crowe-tint-100)] rounded text-sm"
                  >
                    {FULL_DAYS.map((day) => (
                      <option key={day.code} value={day.code}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Max sources */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-[var(--crowe-tint-700)] mb-2">
                    Max sources: {deepDiveMaxSources}
                  </label>
                  <input
                    type="range"
                    min="6"
                    max="12"
                    value={deepDiveMaxSources}
                    onChange={(e) => setDeepDiveMaxSources(parseInt(e.target.value))}
                    className="w-full accent-[var(--crowe-amber)]"
                  />
                  <div className="flex justify-between text-xs text-[var(--crowe-tint-500)] mt-1">
                    <span>6</span>
                    <span>12</span>
                  </div>
                </div>

                {/* Topic selector */}
                <div>
                  <label className="block text-sm font-medium text-[var(--crowe-tint-700)] mb-2">
                    Topics for deep dive (select 1-3)
                  </label>
                  {data.interests.length === 0 ? (
                    <p className="text-sm text-[var(--crowe-tint-500)]">
                      Add interests above to enable deep dives.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.interests.map((interest) => (
                        <label
                          key={interest.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={deepDiveTopicIds.includes(interest.id)}
                            onChange={() => toggleDeepDiveTopic(interest.id)}
                            disabled={
                              !deepDiveTopicIds.includes(interest.id) &&
                              deepDiveTopicIds.length >= 3
                            }
                            className="w-4 h-4 rounded accent-[var(--crowe-amber)]"
                          />
                          <span className="text-sm text-[var(--crowe-tint-700)]">
                            {interest.label}
                            <span className="text-[var(--crowe-tint-500)]">
                              {' '}
                              ({interest.section})
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-[var(--crowe-amber)] text-[var(--crowe-indigo)] font-bold rounded-lg hover:brightness-95 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
