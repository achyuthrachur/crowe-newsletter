'use client';

import { motion } from 'framer-motion';
import type { DigestArticle } from '@/app/api/reader/route';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

interface ArticleCardProps {
  article: DigestArticle;
  index?: number;
  token?: string;
  feedbackEnabled?: boolean;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
      new Date(isoDate)
    );
  } catch {
    return '';
  }
}

async function sendFeedback(token: string | undefined, action: string, articleId: string) {
  if (!token) return;
  await fetch(`/api/feedback?token=${token}&action=${action}&articleId=${articleId}`);
}

export function ArticleCard({ article, index = 0, token, feedbackEnabled }: ArticleCardProps) {
  return (
    <ScrollReveal delay={index * 60}>
    <motion.div
      whileHover={{ scale: 1.008, boxShadow: '0 8px 32px rgba(1,30,65,0.1)' }}
      className="rounded-xl overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderLeft: '4px solid #F5A800',
        transition: 'box-shadow 0.18s ease',
      }}
    >
      <div className="p-5">
        {/* Section badge + meta */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded"
            style={{ background: '#F5A800', color: '#011E41' }}
          >
            {article.section}
          </span>
          <span className="text-xs" style={{ color: '#828282' }}>
            {article.sourceName}
            {article.publishedAt ? ` · ${formatDate(article.publishedAt)}` : ''}
          </span>
        </div>

        {/* Title */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-base font-bold leading-snug mb-3 hover:underline"
          style={{ color: '#002E62', textDecorationColor: '#F5A800' }}
        >
          {article.title}
        </a>

        {/* Summary */}
        {article.summary && (
          <p className="text-sm leading-relaxed mb-3" style={{ color: '#4F4F4F' }}>
            {article.summary}
          </p>
        )}

        {/* Why it matters */}
        {article.whyItMatters && (
          <div
            className="text-sm italic leading-relaxed mb-3 pl-3"
            style={{
              borderLeft: '2px solid rgba(245,168,0,0.6)',
              color: '#002E62',
            }}
          >
            <span className="font-semibold not-italic">Why it matters: </span>
            {article.whyItMatters}
          </div>
        )}

        {/* Feedback buttons (Stage 4) */}
        {feedbackEnabled && token && (
          <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid #F0F0F0' }}>
            <button
              type="button"
              onClick={() => sendFeedback(token, 'upvote', article.id)}
              className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: '#05AB8C' }}
            >
              👍 <span>Helpful</span>
            </button>
            <button
              type="button"
              onClick={() => sendFeedback(token, 'downvote', article.id)}
              className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: '#828282' }}
            >
              👎 <span>Not relevant</span>
            </button>
            <button
              type="button"
              onClick={() => sendFeedback(token, 'dismiss', article.id)}
              className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: '#828282' }}
            >
              🚫 <span>Hide</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
    </ScrollReveal>
  );
}
