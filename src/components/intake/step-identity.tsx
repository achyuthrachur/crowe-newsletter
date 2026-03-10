'use client';

import { motion } from 'framer-motion';

interface IdentityData {
  email: string;
  displayName: string;
  roleTitle: string;
  industryFocus: string;
  timezone: string;
}

interface StepIdentityProps {
  data: IdentityData;
  onChange: (data: Partial<IdentityData>) => void;
  onNext: () => void;
}

const INPUT_STYLE = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #E0E0E0',
  fontSize: 14,
  color: '#333333',
  outline: 'none',
  background: '#FFFFFF',
};

const LABEL_STYLE = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#828282',
  marginBottom: 6,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

export function StepIdentity({ data, onChange, onNext }: StepIdentityProps) {
  const canProceed = !!data.email.trim();

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
        Tell us about yourself
      </h2>
      <p className="text-sm mb-8" style={{ color: '#828282' }}>
        This helps us personalize your briefing for your role and focus area.
      </p>

      <div className="space-y-5">
        <div>
          <label style={LABEL_STYLE}>
            Email address <span style={{ color: '#E5376B' }}>*</span>
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            style={INPUT_STYLE}
            placeholder="your.name@crowe.com"
            autoFocus
            onFocus={(e) => (e.target.style.borderColor = '#F5A800')}
            onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={LABEL_STYLE}>Full name</label>
            <input
              type="text"
              value={data.displayName}
              onChange={(e) => onChange({ displayName: e.target.value })}
              style={INPUT_STYLE}
              placeholder="Achyuth Rachur"
              onFocus={(e) => (e.target.style.borderColor = '#F5A800')}
              onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Role / title</label>
            <input
              type="text"
              value={data.roleTitle}
              onChange={(e) => onChange({ roleTitle: e.target.value })}
              style={INPUT_STYLE}
              placeholder="Senior Associate"
              onFocus={(e) => (e.target.style.borderColor = '#F5A800')}
              onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
            />
          </div>
        </div>

        <div>
          <label style={LABEL_STYLE}>Practice area / industry focus</label>
          <input
            type="text"
            value={data.industryFocus}
            onChange={(e) => onChange({ industryFocus: e.target.value })}
            style={INPUT_STYLE}
            placeholder="e.g. Financial services, Banking regulation"
            onFocus={(e) => (e.target.style.borderColor = '#F5A800')}
            onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="px-8 py-3 rounded-lg font-bold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
          style={{ background: '#F5A800', color: '#011E41' }}
        >
          Next: Select Interests →
        </button>
      </div>
    </motion.div>
  );
}
