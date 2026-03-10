'use client';

import { motion } from 'framer-motion';
import { LANDING_PREVIEW_DIGEST } from '@/data/landing-preview';
import type { InterestItem } from './step-interests';

interface StepPreviewProps {
  interests: InterestItem[];
  displayName: string;
  isDemo: boolean;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export function StepPreview({ interests, displayName, isDemo, submitting, onSubmit, onBack }: StepPreviewProps) {
  // Build a simulated digest from selected interest sections
  const selectedSections = [...new Set(interests.map((i) => i.section))];

  const previewSections = selectedSections
    .map((section) => LANDING_PREVIEW_DIGEST.sections.find((s) => s.section === section))
    .filter(Boolean)
    .slice(0, 3);

  // Fall back to default preview if no matching sections
  const displaySections = previewSections.length > 0
    ? previewSections
    : LANDING_PREVIEW_DIGEST.sections.slice(0, 2);

  const greeting = displayName
    ? `Good morning, ${displayName.split(' ')[0]}. Here's what matters today.`
    : LANDING_PREVIEW_DIGEST.greeting;

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
        Here&apos;s your briefing preview
      </h2>
      <p className="text-sm mb-6" style={{ color: '#828282' }}>
        This is a simulation based on your interests. Real briefings pull fresh articles each morning.
      </p>

      {/* Mini digest preview */}
      <div
        className="rounded-xl overflow-hidden mb-6"
        style={{ border: '1px solid #E0E0E0', background: '#FFFFFF', maxHeight: '40vh', overflowY: 'auto' }}
      >
        {/* Masthead */}
        <div style={{ background: '#011E41', padding: '14px 20px' }}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold tracking-[4px] uppercase" style={{ color: '#F5A800' }}>
              CROWE INTELLIGENCE
            </span>
            <span className="text-xs" style={{ color: '#828282' }}>
              {LANDING_PREVIEW_DIGEST.date}
            </span>
          </div>
          <div style={{ height: 1, background: '#F5A800', marginTop: 8, opacity: 0.5 }} />
          <p className="text-xs mt-2" style={{ color: '#BDBDBD' }}>{greeting}</p>
        </div>

        {/* Preview articles */}
        <div className="p-4 space-y-4">
          {displaySections.map((section, si) => section && (
            <div key={si}>
              <div className="flex items-center gap-2 mb-3">
                <div style={{ height: 1, flex: 1, background: '#E0E0E0' }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#828282' }}>
                  {section.section}
                </span>
                <div style={{ height: 1, flex: 1, background: '#E0E0E0' }} />
              </div>
              {section.articles.slice(0, 1).map((article, ai) => (
                <div
                  key={ai}
                  className="pl-3"
                  style={{ borderLeft: '3px solid #F5A800' }}
                >
                  <p className="text-sm font-bold mb-1" style={{ color: '#002E62' }}>
                    {article.title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#4F4F4F' }}>
                    {article.summary}
                  </p>
                  <p className="text-xs mt-1 italic" style={{ color: '#828282' }}>
                    <span className="font-semibold not-italic">Why it matters:</span>{' '}
                    {article.whyItMatters}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {isDemo && (
        <div
          className="mb-5 p-3 rounded-lg text-sm"
          style={{ background: 'rgba(245,168,0,0.1)', border: '1px solid rgba(245,168,0,0.3)', color: '#D7761D' }}
        >
          <strong>Demo mode:</strong> A real briefing will be sent to your inbox immediately after you submit.
        </div>
      )}

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
          onClick={onSubmit}
          disabled={submitting}
          className="px-8 py-3 rounded-lg font-bold text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
          style={{ background: '#F5A800', color: '#011E41' }}
        >
          {submitting ? 'Setting up…' : isDemo ? 'Send Demo Briefing →' : 'Start My Briefing →'}
        </button>
      </div>
    </motion.div>
  );
}
