'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { ControlsPanel, type ControlsData } from '@/components/prefs/controls-panel';
import { ActivityPanel } from '@/components/prefs/activity-panel';
import { SaveToast } from '@/components/prefs/save-toast';

interface PrefsAPIResponse extends ControlsData {
  email: string;
  timezone: string;
  lastDigest: {
    id: string;
    date: string;
    articleCount: number | null;
    sections: string[];
    sentAt: string;
  } | null;
  recentFeedback: Array<{
    articleTitle: string;
    action: 'upvote' | 'downvote' | 'dismiss';
    date: string;
  }>;
}

function PrefsContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const [controls, setControls] = useState<ControlsData | null>(null);
  const [lastDigest, setLastDigest] = useState<PrefsAPIResponse['lastDigest']>(null);
  const [recentFeedback, setRecentFeedback] = useState<PrefsAPIResponse['recentFeedback']>([]);

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
      const data: PrefsAPIResponse = await res.json();
      setEmail(data.email);
      setLastDigest(data.lastDigest);
      setRecentFeedback(data.recentFeedback ?? []);
      setControls({
        profile: data.profile,
        schedule: data.schedule,
        interests: data.interests,
        keywordBlocks: data.keywordBlocks ?? [],
        sourceBlocks: data.sourceBlocks ?? [],
        deepDive: data.deepDive,
      });
    } catch {
      setError('Failed to load preferences.');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPrefs();
  }, [fetchPrefs]);

  const handleSave = async () => {
    if (!token || !controls) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/prefs?token=${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: controls.profile,
          schedule: controls.schedule,
          interests: controls.interests,
          keywordBlocks: controls.keywordBlocks,
          sourceBlocks: controls.sourceBlocks,
          deepDive: controls.deepDive,
        }),
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F8FA' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#F5A800', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: '#828282' }}>Loading preferences…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F7F8FA' }}>
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center">
          <div
            className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ background: '#011E41' }}
          >
            <span style={{ color: '#F5A800', fontSize: 22 }}>⚙</span>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#011E41' }}>
            Crowe Intelligence
          </h2>
          <p className="text-sm" style={{ color: '#828282' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!controls) return null;

  const weightsAllDefault = controls.interests.every((i) => i.weight === 100);

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-4"
        style={{ background: '#011E41', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span
          className="text-sm font-bold tracking-[3px] uppercase"
          style={{ color: '#F5A800', fontFamily: 'var(--font-display)' }}
        >
          CROWE INTELLIGENCE
        </span>
        <span className="text-sm" style={{ color: '#828282' }}>{email}</span>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-8"
        >
          <h1
            className="text-3xl font-bold"
            style={{ color: '#011E41', fontFamily: 'var(--font-display)' }}
          >
            Your Preferences
          </h1>
          <p className="text-sm mt-1" style={{ color: '#828282' }}>
            Tune your digest — changes take effect on your next briefing.
          </p>
        </motion.div>

        {/* Error banner */}
        {error && (
          <div
            className="mb-6 p-4 rounded-xl text-sm"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
          >
            {error}
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Controls (3/5) */}
          <div className="lg:col-span-3 space-y-4">
            <ControlsPanel data={controls} onChange={setControls} />

            {/* Save button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-150 disabled:opacity-50 hover:brightness-110"
              style={{ background: '#F5A800', color: '#011E41' }}
            >
              {saving ? 'Saving…' : 'Save Preferences'}
            </button>
          </div>

          {/* Right: Activity (2/5) */}
          <div className="lg:col-span-2">
            <ActivityPanel
              lastDigest={lastDigest}
              recentFeedback={recentFeedback}
              interestCount={controls.interests.length}
              feedbackCount={recentFeedback.length}
              weightsAllDefault={weightsAllDefault}
            />
          </div>
        </div>
      </div>

      {/* Success toast */}
      <SaveToast visible={saved} />
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F8FA' }}>
          <p className="text-sm" style={{ color: '#828282' }}>Loading…</p>
        </div>
      }
    >
      <PrefsContent />
    </Suspense>
  );
}
