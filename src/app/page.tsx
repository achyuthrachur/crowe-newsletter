import Link from 'next/link';
import { DigestPreviewCard } from '@/components/landing/digest-preview-card';
import { FeatureStrip } from '@/components/landing/feature-strip';
import { HowItWorks } from '@/components/landing/how-it-works';
import { HeroSection } from '@/components/landing/hero';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: '#011E41', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <img src="/crowe-logo-white.svg" alt="Crowe" style={{ height: 28, width: 'auto' }} />
        <Link
          href="/intake"
          className="text-sm font-bold px-4 py-2 rounded-lg transition-all duration-150"
          style={{ background: '#F5A800', color: '#011E41' }}
        >
          Sign Up
        </Link>
      </nav>

      {/* Hero */}
      <HeroSection />

      {/* Feature strip */}
      <FeatureStrip />

      {/* C4 — ContainerScroll wraps the digest preview for a dramatic scroll reveal */}
      <div style={{ background: '#F7F8FA' }}>
        <ContainerScroll
          titleComponent={
            <div className="text-center mb-4">
              <h2
                className="text-3xl font-bold mb-3"
                style={{ color: '#011E41', fontFamily: 'var(--font-display)' }}
              >
                What a briefing looks like
              </h2>
              <p className="text-base" style={{ color: '#828282' }}>
                Editorial format. Real context. Built for Crowe professionals.
              </p>
            </div>
          }
        >
          <div className="h-full w-full overflow-auto rounded-xl p-4" style={{ background: '#F7F8FA' }}>
            <DigestPreviewCard />
          </div>
        </ContainerScroll>
      </div>

      {/* How it works */}
      <HowItWorks />

      {/* CTA Footer */}
      <div
        className="w-full py-20 px-6 text-center"
        style={{ background: '#011E41' }}
      >
        <div className="max-w-xl mx-auto space-y-6">
          <h2
            className="text-3xl font-bold"
            style={{ color: '#FFFFFF', fontFamily: 'var(--font-display)' }}
          >
            Start your intelligence briefing
          </h2>
          <p className="text-base" style={{ color: '#BDBDBD' }}>
            Takes less than 2 minutes. Your first briefing arrives the next morning.
          </p>
          <Link
            href="/intake"
            className="inline-block px-8 py-4 rounded-lg text-base font-bold transition-all duration-150 hover:brightness-110"
            style={{ background: '#F5A800', color: '#011E41' }}
          >
            Start My Briefing →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div
        className="w-full py-6 px-6 text-center text-xs"
        style={{ background: '#011E41', borderTop: '1px solid rgba(255,255,255,0.08)', color: '#828282' }}
      >
        <p>#SmartDecisions · Crowe LLP AI Innovation Team</p>
      </div>
    </div>
  );
}
