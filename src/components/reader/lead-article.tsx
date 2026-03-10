'use client';

import { motion } from 'framer-motion';
import type { DigestArticle } from '@/app/api/reader/route';

interface LeadArticleProps {
  article: DigestArticle;
}

export function LeadArticle({ article }: LeadArticleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderLeft: '6px solid #F5A800',
      }}
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <span
            className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded"
            style={{ background: '#F5A800', color: '#011E41' }}
          >
            {article.section}
          </span>
          <span
            className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded"
            style={{ background: '#011E41', color: '#F5A800' }}
          >
            LEAD STORY
          </span>
          <span className="text-xs ml-1" style={{ color: '#828282' }}>
            {article.sourceName}
          </span>
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-2xl sm:text-3xl font-bold leading-tight mb-4 hover:underline"
          style={{
            color: '#011E41',
            fontFamily: 'var(--font-display)',
            textDecorationColor: '#F5A800',
          }}
        >
          {article.title}
        </a>

        {article.summary && (
          <p className="text-base leading-relaxed mb-4" style={{ color: '#4F4F4F' }}>
            {article.summary}
          </p>
        )}

        {article.whyItMatters && (
          <div
            className="text-sm leading-relaxed pl-4 italic"
            style={{
              borderLeft: '3px solid #F5A800',
              color: '#002E62',
            }}
          >
            <span className="font-semibold not-italic">Why it matters: </span>
            {article.whyItMatters}
          </div>
        )}
      </div>
    </motion.div>
  );
}
