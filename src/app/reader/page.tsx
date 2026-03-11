'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Masthead } from '@/components/reader/masthead';
import { LeadArticle } from '@/components/reader/lead-article';
import { ArticleCard } from '@/components/reader/article-card';
import { ReaderFooter } from '@/components/reader/reader-footer';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import type { DigestData } from '@/app/api/reader/route';

function ReaderLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: '#F7F8FA' }}>
      <div className="flex flex-col items-center gap-4">
        <img src="/crowe-logo-color.svg" alt="Crowe" style={{ height: 28, width: 'auto', opacity: 0.6 }} />
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: '#F5A800' }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
        <p className="text-xs uppercase tracking-[3px]" style={{ color: '#828282', fontFamily: 'var(--font-body)' }}>
          Loading your briefing
        </p>
      </div>
    </div>
  );
}

function ReaderError({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F7F8FA' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center"
        style={{ border: '1px solid #E0E0E0' }}
      >
        <div
          className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center"
          style={{ background: '#011E41' }}
        >
          <img src="/crowe-logo-white.svg" alt="Crowe" style={{ height: 18, width: 'auto' }} />
        </div>
        <h2
          className="text-base font-bold mb-2 uppercase tracking-[2px]"
          style={{ color: '#011E41', fontFamily: 'var(--font-display)' }}
        >
          Crowe Intelligence
        </h2>
        <div style={{ height: 1, background: '#F5A800', margin: '10px auto', width: 40, opacity: 0.7 }} />
        <p className="text-sm mt-3" style={{ color: '#828282', fontFamily: 'var(--font-body)' }}>
          {message}
        </p>
      </motion.div>
    </div>
  );
}

function ReaderContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const digestId = searchParams.get('digestId') ?? '';

  const [data, setData] = useState<DigestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('No token provided. Use the link from your email.');
      setLoading(false);
      return;
    }

    const url = `/api/reader?token=${token}${digestId ? `&digestId=${digestId}` : ''}`;

    fetch(url)
      .then(async (res) => {
        if (res.status === 404) {
          setError("Your first briefing hasn't been sent yet. Check back soon.");
          return;
        }
        if (!res.ok) {
          setError(res.status === 401 ? 'Invalid or expired link.' : 'Failed to load digest.');
          return;
        }
        const json: DigestData = await res.json();
        setData(json);
      })
      .catch(() => setError('Failed to load digest.'))
      .finally(() => setLoading(false));
  }, [token, digestId]);

  if (loading) return <ReaderLoading />;
  if (error) return <ReaderError message={error} />;
  if (!data) return null;

  const allArticles = data.sections.flatMap((s) => s.articles);
  const leadArticle = allArticles[0] ?? null;
  const remainingBySection = data.sections
    .map((s) => ({ ...s, articles: s.articles.filter((a) => a.id !== leadArticle?.id) }))
    .filter((s) => s.articles.length > 0);

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Sticky nav */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
        style={{ background: '#011E41', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <img src="/crowe-logo-white.svg" alt="Crowe" style={{ height: 24, width: 'auto' }} />
        <span
          className="text-[10px] font-bold tracking-[3px] uppercase hidden sm:block"
          style={{ color: 'rgba(245,168,0,0.7)', fontFamily: 'var(--font-display)' }}
        >
          Intelligence Briefing
        </span>
        <a
          href={data.links.prefsUrl}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
          style={{ background: 'rgba(245,168,0,0.15)', color: '#F5A800', border: '1px solid rgba(245,168,0,0.3)' }}
        >
          Preferences
        </a>
      </nav>

      {/* Masthead */}
      <Masthead date={data.date} greeting={data.greeting} />

      {/* Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Lead article */}
        {leadArticle && (
          <ScrollReveal className="mb-10">
            <LeadArticle article={leadArticle} />
          </ScrollReveal>
        )}

        {/* Sections */}
        <AnimatePresence>
          {remainingBySection.map((section, si) => (
            <div key={section.section} className="mb-10">
              {/* Section divider */}
              <ScrollReveal delay={si * 60} className="flex items-center gap-3 mb-5">
                <span
                  className="text-[10px] font-bold tracking-[3px] uppercase shrink-0"
                  style={{ color: '#828282', fontFamily: 'var(--font-display)' }}
                >
                  {section.section}
                </span>
                <div style={{ flex: 1, height: 1, background: '#E0E0E0' }} />
                <span
                  className="text-[10px] font-bold shrink-0"
                  style={{ color: '#F5A800' }}
                >
                  {section.articles.length} {section.articles.length === 1 ? 'article' : 'articles'}
                </span>
              </ScrollReveal>

              {/* Article grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.articles.map((article, i) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    index={si * 3 + i}
                    token={token}
                    feedbackEnabled={data.feedbackEnabled}
                  />
                ))}
              </div>
            </div>
          ))}
        </AnimatePresence>
      </main>

      <ReaderFooter links={data.links} />
    </div>
  );
}

export default function ReaderPage() {
  return (
    <Suspense fallback={<ReaderLoading />}>
      <ReaderContent />
    </Suspense>
  );
}
