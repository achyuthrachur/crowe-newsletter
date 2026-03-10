'use client';

import { motion } from 'framer-motion';
import { LANDING_PREVIEW_DIGEST, type PreviewArticle } from '@/data/landing-preview';
import { AnimatedStatusBadge } from '@/components/ui/animated-status-badge';

function ArticleCard({ article, isLead = false }: { article: PreviewArticle; isLead?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 8px 32px rgba(1,30,65,0.13)' }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      className={`bg-white border border-tint-100 rounded-lg overflow-hidden ${isLead ? 'border-l-4 border-l-crowe-amber' : 'border-l-4 border-l-crowe-indigo/20'}`}
      style={isLead ? { borderLeftColor: '#F5A800', borderLeftWidth: 4 } : { borderLeftColor: '#002E6230', borderLeftWidth: 4 }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded"
            style={{ background: '#F5A800', color: '#002E62' }}
          >
            {article.section}
          </span>
          <span className="text-[11px]" style={{ color: '#828282' }}>
            {article.source} · {article.publishedAt}
          </span>
        </div>
        <h4
          className={`font-bold leading-snug mb-2 ${isLead ? 'text-base' : 'text-sm'}`}
          style={{ color: '#002E62' }}
        >
          {article.title}
        </h4>
        <p className="text-sm leading-relaxed mb-2" style={{ color: '#4F4F4F' }}>
          {article.summary}
        </p>
        <p className="text-sm italic" style={{ color: '#002E62', borderLeft: '2px solid #F5A800', paddingLeft: 8 }}>
          <span className="not-italic font-semibold">Why it matters: </span>
          {article.whyItMatters}
        </p>
      </div>
    </motion.div>
  );
}

export function DigestPreviewCard() {
  const { date, greeting, sections } = LANDING_PREVIEW_DIGEST;
  const allArticles = sections.flatMap((s) => s.articles);
  const leadArticle = allArticles[0];
  const restArticles = allArticles.slice(1, 4);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#F7F8FA', border: '1px solid #E0E0E0' }}
      >
        {/* Masthead */}
        <div style={{ background: '#011E41', padding: '16px 24px' }}>
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold tracking-[4px] uppercase"
              style={{ color: '#F5A800', letterSpacing: '0.25em' }}
            >
              CROWE INTELLIGENCE
            </span>
            <div className="flex items-center gap-3">
              <AnimatedStatusBadge trigger={true} />
              <span className="text-xs" style={{ color: '#828282' }}>
                {date}
              </span>
            </div>
          </div>
          <div style={{ height: 1, background: '#F5A800', marginTop: 10, opacity: 0.6 }} />
          <p className="text-sm mt-2" style={{ color: '#E0E0E0' }}>
            {greeting}
          </p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Lead article */}
          <ArticleCard article={leadArticle} isLead />

          {/* Section divider */}
          <div className="flex items-center gap-2 py-1">
            <div style={{ height: 1, flex: 1, background: '#E0E0E0' }} />
            <span
              className="text-[10px] font-bold tracking-[2px] uppercase"
              style={{ color: '#828282' }}
            >
              {sections[1]?.section}
            </span>
            <div style={{ height: 1, flex: 1, background: '#E0E0E0' }} />
          </div>

          {/* Rest articles */}
          <div className="space-y-2">
            {restArticles.map((article, i) => (
              <ArticleCard key={i} article={article} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 flex items-center justify-between text-[11px]"
          style={{ borderTop: '1px solid #E0E0E0', color: '#828282' }}
        >
          <span>Update preferences · Pause · Unsubscribe</span>
          <span style={{ color: '#F5A800', fontWeight: 600 }}>Crowe</span>
        </div>
      </div>

      {/* Subtle glow */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ boxShadow: '0 0 80px 0 rgba(245,168,0,0.08)', zIndex: -1 }}
      />
    </div>
  );
}
