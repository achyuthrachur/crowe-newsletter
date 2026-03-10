'use client';

import { ScrollReveal } from '@/components/ui/scroll-reveal';

const STEPS = [
  {
    number: '01',
    title: 'Tell us what matters',
    description:
      'Select your practice areas and topics — AI risk, BSA/AML, credit models, regulatory updates, or any combination. Add custom interests specific to your clients.',
  },
  {
    number: '02',
    title: 'We search, you read',
    description:
      'Each morning our pipeline scans 50+ curated sources and uses AI-powered web search to surface the articles that match your exact focus areas. No noise. No repeats.',
  },
  {
    number: '03',
    title: 'Briefing in your inbox',
    description:
      'A concise editorial digest lands before 7am on your chosen days. Every article has a "Why it matters" line written for your practice context.',
  },
];

export function HowItWorks() {
  return (
    <div className="w-full" style={{ background: '#FFFFFF' }}>
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2
            className="text-3xl font-bold mb-3"
            style={{ color: '#011E41', fontFamily: 'var(--font-display)' }}
          >
            How it works
          </h2>
          <p className="text-base" style={{ color: '#828282' }}>
            From signup to briefing in under 2 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop) */}
          <div
            className="hidden md:block absolute top-8 left-1/6 right-1/6"
            style={{ height: 1, background: '#E0E0E0', top: '2rem', left: '16.667%', right: '16.667%' }}
          />

          {STEPS.map((step, i) => (
            <ScrollReveal key={i} delay={i * 100} className="flex flex-col items-center text-center space-y-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold relative z-10"
                style={{ background: '#011E41', color: '#F5A800', fontFamily: 'var(--font-display)' }}
              >
                {step.number}
              </div>
              <h3 className="text-lg font-bold" style={{ color: '#011E41' }}>
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#4F4F4F' }}>
                {step.description}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
