'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ProgressBar } from './progress-bar';
import { StepIdentity } from './step-identity';
import { StepInterests, type InterestItem } from './step-interests';
import { StepSchedule, type ScheduleData } from './step-schedule';
import { StepPreview } from './step-preview';

type DemoStep = 'creating' | 'matching' | 'sending' | 'done' | 'no_matches' | 'error';

interface WizardResult {
  ok: boolean;
  prefsUrl?: string;
  error?: string;
}

interface WizardShellProps {
  initialEmail?: string;
  initialDemo?: boolean;
}

const STEP_LABELS = ['Identity', 'Interests', 'Schedule', 'Preview'];

export function WizardShell({ initialEmail = '', initialDemo = false }: WizardShellProps) {
  const [step, setStep] = useState(0);
  const [isDemo, setIsDemo] = useState(initialDemo);

  // Form data
  const [identity, setIdentity] = useState({
    email: initialEmail,
    displayName: '',
    roleTitle: '',
    industryFocus: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Indiana/Indianapolis',
  });
  const [interests, setInterests] = useState<InterestItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleData>({
    selectedDays: ['MO', 'WE', 'FR'],
    hour: 6,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Indiana/Indianapolis',
    depthLevel: 'standard',
    deepDiveEnabled: false,
    deepDiveDay: 'FR',
  });

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<WizardResult | null>(null);
  const [demoStep, setDemoStep] = useState<DemoStep | null>(null);

  const handleSubmit = async () => {
    if (!identity.email || interests.length === 0 || schedule.selectedDays.length === 0) return;

    setSubmitting(true);
    if (isDemo) setDemoStep('creating');

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identity.email,
          timezone: identity.timezone,
          displayName: identity.displayName || undefined,
          roleTitle: identity.roleTitle || undefined,
          industryFocus: identity.industryFocus || undefined,
          schedule: { days: schedule.selectedDays, hour: schedule.hour, minute: 0 },
          interests,
          depthLevel: schedule.depthLevel,
          deepDive: schedule.deepDiveEnabled
            ? { enabled: true, dayOfWeek: schedule.deepDiveDay }
            : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ ok: false, error: data.error || 'Something went wrong.' });
        if (isDemo) setDemoStep('error');
        setSubmitting(false);
        return;
      }

      if (isDemo && data.userId) {
        setDemoStep('matching');

        try {
          const demoRes = await fetch('/api/demo/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.userId, interests }),
          });

          const demoData = await demoRes.json();

          if (demoRes.ok && demoData.emailSent) {
            setDemoStep('sending');
            await new Promise((r) => setTimeout(r, 800));
            setDemoStep('done');
          } else if (demoRes.ok && !demoData.emailSent) {
            setDemoStep('no_matches');
          } else {
            setResult({ ok: false, error: demoData.error || 'Failed to send briefing' });
            setDemoStep('error');
          }
        } catch {
          setDemoStep('error');
        }

        setResult({ ok: true, prefsUrl: data.prefsUrl });
        setSubmitting(false);
        return;
      }

      setResult({ ok: true, prefsUrl: data.prefsUrl });
    } catch {
      setResult({ ok: false, error: 'Network error. Please try again.' });
      if (isDemo) setDemoStep('error');
    }

    setSubmitting(false);
  };

  // Demo in-progress overlay
  if (isDemo && submitting && demoStep && !['done', 'no_matches', 'error'].includes(demoStep)) {
    const labels: Record<string, string> = {
      creating: 'Creating your account…',
      matching: 'Matching articles to your interests…',
      sending: 'Sending your first briefing…',
    };
    const steps = ['creating', 'matching', 'sending'];
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F7F8FA' }}>
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center">
          <div
            className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ background: '#011E41' }}
          >
            <svg className="w-7 h-7 animate-spin" style={{ color: '#F5A800' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-base font-semibold mb-5" style={{ color: '#011E41' }}>
            {labels[demoStep] || 'Processing…'}
          </p>
          <div className="flex justify-center gap-2">
            {steps.map((s) => (
              <div
                key={s}
                className="h-1.5 w-10 rounded-full transition-colors duration-300"
                style={{
                  background: steps.indexOf(demoStep) >= steps.indexOf(s) ? '#F5A800' : '#E0E0E0',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Demo done — email sent
  if (isDemo && demoStep === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F7F8FA' }}>
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center">
          <div
            className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ background: '#F5A800' }}
          >
            <svg className="w-7 h-7" style={{ color: '#011E41' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#011E41' }}>Check your inbox!</h2>
          <p className="text-sm mb-6" style={{ color: '#828282' }}>Your first briefing is on its way.</p>
          {result?.prefsUrl && (
            <a
              href={result.prefsUrl}
              className="inline-block px-6 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
              style={{ background: '#F5A800', color: '#011E41' }}
            >
              Update Preferences
            </a>
          )}
        </div>
      </div>
    );
  }

  // Demo no matches
  if (isDemo && demoStep === 'no_matches') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F7F8FA' }}>
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center">
          <div
            className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ background: '#F5A800' }}
          >
            <svg className="w-7 h-7" style={{ color: '#011E41' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#011E41' }}>You&apos;re all set</h2>
          <p className="text-sm mb-6" style={{ color: '#828282' }}>
            Your regular briefings will arrive on your next scheduled delivery day.
          </p>
          {result?.prefsUrl && (
            <a
              href={result.prefsUrl}
              className="inline-block px-6 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
              style={{ background: '#F5A800', color: '#011E41' }}
            >
              Update Preferences
            </a>
          )}
        </div>
      </div>
    );
  }

  // Demo error
  if (isDemo && demoStep === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F7F8FA' }}>
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center bg-red-100">
            <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#011E41' }}>Something went wrong</h2>
          <p className="text-sm mb-6" style={{ color: '#828282' }}>
            {result?.error || 'An unexpected error occurred while sending your briefing.'}
          </p>
          <button
            onClick={() => { setDemoStep(null); setResult(null); setSubmitting(false); }}
            className="inline-block px-6 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
            style={{ background: '#F5A800', color: '#011E41' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Normal success
  if (result?.ok && !isDemo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F7F8FA' }}>
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center">
          <div
            className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ background: '#F5A800' }}
          >
            <svg className="w-7 h-7" style={{ color: '#011E41' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#011E41' }}>You&apos;re all set</h2>
          <p className="text-sm mb-6" style={{ color: '#828282' }}>
            Your briefing will arrive on your selected days.
          </p>
          {result.prefsUrl && (
            <a
              href={result.prefsUrl}
              className="inline-block px-6 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
              style={{ background: '#F5A800', color: '#011E41' }}
            >
              Update Preferences
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-6" style={{ background: '#F7F8FA' }}>
      {/* Nav */}
      <div className="max-w-2xl mx-auto mb-8 flex items-center justify-between">
        <img src="/crowe-logo-color.svg" alt="Crowe" style={{ height: 28, width: 'auto' }} />
        <button
          type="button"
          onClick={() => setIsDemo((d) => !d)}
          className="px-3 py-1.5 text-xs font-bold rounded-full transition-all"
          style={
            isDemo
              ? { background: '#F5A800', color: '#011E41' }
              : { background: '#E0E0E0', color: '#828282' }
          }
        >
          {isDemo ? 'Demo ON' : 'Demo'}
        </button>
      </div>

      {/* Wizard card */}
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-2xl shadow-lg p-8"
        >
          {/* Progress */}
          <div className="mb-8">
            <ProgressBar currentStep={step} totalSteps={4} labels={STEP_LABELS} />
          </div>

          {/* Error banner */}
          {result?.error && (
            <div
              className="mb-5 p-3 rounded-lg text-sm"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
            >
              {result.error}
            </div>
          )}

          {/* Steps */}
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepIdentity
                key="step-identity"
                data={identity}
                onChange={(d) => setIdentity((prev) => ({ ...prev, ...d }))}
                onNext={() => setStep(1)}
              />
            )}
            {step === 1 && (
              <StepInterests
                key="step-interests"
                interests={interests}
                onChange={setInterests}
                onNext={() => setStep(2)}
                onBack={() => setStep(0)}
              />
            )}
            {step === 2 && (
              <StepSchedule
                key="step-schedule"
                data={schedule}
                onChange={(d) => setSchedule((prev) => ({ ...prev, ...d }))}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <StepPreview
                key="step-preview"
                interests={interests}
                displayName={identity.displayName}
                isDemo={isDemo}
                submitting={submitting}
                onSubmit={handleSubmit}
                onBack={() => setStep(2)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
