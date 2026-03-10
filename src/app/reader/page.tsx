'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Masthead } from '@/components/reader/masthead';
import { LeadArticle } from '@/components/reader/lead-article';
import { ArticleCard } from '@/components/reader/article-card';
import { ReaderFooter } from '@/components/reader/reader-footer';
import type { DigestData } from '@/app/api/reader/route';

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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F7F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#828282', fontFamily: 'Arial, sans-serif', fontSize: 14 }}>Loading your briefing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F7F7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: '48px', maxWidth: 480, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ color: '#E5376B', fontFamily: 'Arial, sans-serif', fontSize: 16, fontWeight: 'bold', margin: '0 0 8px' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const allArticles = data.sections.flatMap((s) => s.articles);
  const leadArticle = allArticles[0] ?? null;
  const remainingBySection = data.sections
    .map((s) => ({ ...s, articles: s.articles.filter((a) => a.id !== leadArticle?.id) }))
    .filter((s) => s.articles.length > 0);

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F7' }}>
      <Masthead date={data.date} greeting={data.greeting} />
      <main style={{ maxWidth: 1024, margin: '0 auto', padding: '32px 24px' }}>
        {leadArticle && (
          <div style={{ marginBottom: 40 }}>
            <LeadArticle article={leadArticle} />
          </div>
        )}
        {remainingBySection.map((section) => (
          <div key={section.section} style={{ marginBottom: 40 }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', color: '#828282' }}>
                {section.section}
              </span>
              <div style={{ flex: 1, height: 1, background: '#E0E0E0' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(440px, 100%), 1fr))', gap: 16 }}>
              {section.articles.map((article, i) => (
                <ArticleCard key={article.id} article={article} index={i} token={token} feedbackEnabled={data.feedbackEnabled} />
              ))}
            </div>
          </div>
        ))}
      </main>
      <ReaderFooter token={token} />
    </div>
  );
}

export default function ReaderPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F7F7F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#828282', fontFamily: 'Arial, sans-serif', fontSize: 14 }}>Loading...</p>
      </div>
    }>
      <ReaderContent />
    </Suspense>
  );
}
