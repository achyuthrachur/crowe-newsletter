'use client';

import { motion } from 'framer-motion';
import type { DigestArticle } from '@/app/api/reader/route';

interface LeadArticleProps {
  article: DigestArticle;
}

export function LeadArticle({ article }: LeadArticleProps) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(1,30,65,0.12)' }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderLeft: '6px solid #F5A800',
        boxShadow: '0 4px 20px rgba(1,30,65,0.06)',
      }}
    >
      <div className="p-6 sm:p-8">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span
            className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded"
            style={{ background: '#F5A800', color: '#011E41' }}
          >
            {article.section}
          </span>
          <span
            className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded"
            style={{ background: '#011E41', color: '#F5A800' }}
          >
            Lead Story
          </span>
          <span className="text-xs ml-1" style={{ color: '#828282', fontFamily: 'var(--font-body)' }}>
            {article.sourceName}
          </span>
        </div>

        {/* Title */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block font-bold leading-tight mb-4 hover:underline"
          style={{
            color: '#011E41',
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.35rem, 2.5vw, 1.75rem)',
            textDecorationColor: '#F5A800',
          }}
        >
          {article.title}
        </a>

        {/* Summary */}
        {article.summary && (
          <p
            className="text-base leading-relaxed mb-4"
            style={{ color: '#4F4F4F', fontFamily: 'var(--font-body)' }}
          >
            {article.summary}
          </p>
        )}

        {/* Why it matters */}
        {article.whyItMatters && (
          <div
            className="text-sm leading-relaxed pl-4 italic rounded-r-lg py-3"
            style={{
              borderLeft: '3px solid #F5A800',
              color: '#002E62',
              background: 'rgba(245,168,0,0.05)',
              fontFamily: 'var(--font-body)',
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
