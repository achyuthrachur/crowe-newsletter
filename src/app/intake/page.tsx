'use client';

import { useState } from 'react';

interface InterestInput {
  section: string;
  label: string;
  type: string;
}

const INTEREST_SECTIONS = ['AI', 'Tax', 'Audit', 'Advisory', 'Cybersecurity', 'Financial Services', 'Regulatory'];
const DAYS = [
  { code: 'MO', label: 'Mon' },
  { code: 'TU', label: 'Tue' },
  { code: 'WE', label: 'Wed' },
  { code: 'TH', label: 'Thu' },
  { code: 'FR', label: 'Fri' },
];

export default function IntakePage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [industryFocus, setIndustryFocus] = useState('');
  const [timezone, setTimezone] = useState('America/Indiana/Indianapolis');
  const [selectedDays, setSelectedDays] = useState<string[]>(['MO', 'WE', 'FR']);
  const [hour, setHour] = useState(6);
  const [interests, setInterests] = useState<InterestInput[]>([]);
  const [newSection, setNewSection] = useState('AI');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('topic');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; prefsUrl?: string; error?: string } | null>(null);

  const addInterest = () => {
    if (!newLabel.trim()) return;
    setInterests([...interests, { section: newSection, label: newLabel.trim(), type: newType }]);
    setNewLabel('');
  };

  const removeInterest = (index: number) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const toggleDay = (code: string) => {
    setSelectedDays((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || interests.length === 0 || selectedDays.length === 0) return;

    setSubmitting(true);
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
          schedule: { days: selectedDays, hour, minute: 0 },
          interests,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, prefsUrl: data.prefsUrl });
      } else {
        setResult({ ok: false, error: data.error || 'Something went wrong.' });
      }
    } catch {
      setResult({ ok: false, error: 'Network error. Please try again.' });
    }
    setSubmitting(false);
  };

  if (result?.ok) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--crowe-amber)] flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--crowe-indigo)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--crowe-indigo)] mb-2">You're all set</h1>
          <p className="text-[var(--crowe-tint-700)] mb-4">
            Your briefing will arrive on your selected days.
          </p>
          {result.prefsUrl && (
            <a
              href={result.prefsUrl}
              className="inline-block px-6 py-2 bg-[var(--crowe-amber)] text-[var(--crowe-indigo)] font-medium rounded hover:brightness-95 transition"
            >
              Update Preferences
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--crowe-indigo)]">Set Up Your Briefing</h1>
          <p className="text-[var(--crowe-tint-500)] mt-1">
            Configure your personalized digest in under 2 minutes.
          </p>
        </div>

        {result?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm">
            {result.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-[var(--crowe-indigo)] mb-4">Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--crowe-tint-700)] mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--crowe-tint-100)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crowe-amber)]"
                  placeholder="you@crowe.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--crowe-tint-700)] mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--crowe-tint-100)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crowe-amber)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--crowe-tint-700)] mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--crowe-tint-100)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crowe-amber)]"
                    placeholder="e.g. Senior Associate"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Schedule */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-[var(--crowe-indigo)] mb-4">Schedule</h2>
            <div className="flex gap-2 mb-4">
              {DAYS.map((day) => (
                <button
                  key={day.code}
                  type="button"
                  onClick={() => toggleDay(day.code)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    selectedDays.includes(day.code)
                      ? 'bg-[var(--crowe-amber)] text-[var(--crowe-indigo)]'
                      : 'bg-[#F7F7F7] text-[var(--crowe-tint-700)] hover:bg-[var(--crowe-tint-100)]'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <div className="flex gap-4 items-center">
              <label className="text-sm text-[var(--crowe-tint-700)]">Delivery time:</label>
              <select
                value={hour}
                onChange={(e) => setHour(parseInt(e.target.value))}
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
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-[var(--crowe-indigo)] mb-4">Interests *</h2>
            <p className="text-sm text-[var(--crowe-tint-500)] mb-4">
              Add at least one interest to configure your digest.
            </p>

            {/* Existing interests */}
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {interests.map((interest, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F7F7F7] rounded-full text-sm"
                  >
                    <span className="text-[10px] text-[var(--crowe-tint-500)] uppercase">
                      {interest.section}
                    </span>
                    <span className="text-[var(--crowe-tint-700)]">{interest.label}</span>
                    <button
                      type="button"
                      onClick={() => removeInterest(index)}
                      className="ml-1 text-[var(--crowe-tint-300)] hover:text-[var(--crowe-tint-700)] transition-colors"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add interest form */}
            <div className="flex gap-2 items-end flex-wrap">
              <div>
                <label className="block text-xs text-[var(--crowe-tint-500)] mb-1">Section</label>
                <select
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  className="border border-[var(--crowe-tint-100)] rounded px-2 py-1.5 text-sm"
                >
                  {INTEREST_SECTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-[var(--crowe-tint-500)] mb-1">Label</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addInterest();
                    }
                  }}
                  className="w-full px-3 py-1.5 border border-[var(--crowe-tint-100)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crowe-amber)]"
                  placeholder="e.g. AI in financial services"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--crowe-tint-500)] mb-1">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="border border-[var(--crowe-tint-100)] rounded px-2 py-1.5 text-sm"
                >
                  <option value="topic">Topic</option>
                  <option value="industry">Industry</option>
                  <option value="entity">Entity</option>
                </select>
              </div>
              <button
                type="button"
                onClick={addInterest}
                className="px-4 py-1.5 bg-[var(--crowe-indigo)] text-white text-sm font-medium rounded hover:brightness-110 transition"
              >
                Add
              </button>
            </div>
          </section>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !email || interests.length === 0 || selectedDays.length === 0}
            className="w-full py-3 bg-[var(--crowe-amber)] text-[var(--crowe-indigo)] font-bold rounded-lg hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Setting up...' : 'Start My Briefing'}
          </button>
        </form>
      </div>
    </div>
  );
}
