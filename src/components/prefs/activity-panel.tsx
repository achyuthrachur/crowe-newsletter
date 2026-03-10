'use client';

import { FeedbackHistory } from './feedback-history';

interface LastDigest {
  id: string;
  date: string;
  articleCount: number | null;
  sections: string[];
  sentAt: string;
}

interface FeedbackItem {
  articleTitle: string;
  action: 'upvote' | 'downvote' | 'dismiss';
  date: string;
}

interface ActivityPanelProps {
  lastDigest: LastDigest | null;
  recentFeedback: FeedbackItem[];
  interestCount: number;
  feedbackCount: number;
  weightsAllDefault: boolean;
}

export function ActivityPanel({
  lastDigest,
  recentFeedback,
  interestCount,
  feedbackCount,
  weightsAllDefault,
}: ActivityPanelProps) {
  // Contextual tips
  const tips: string[] = [];
  if (interestCount < 3) tips.push('Add more interests to fill every section of your digest.');
  if (feedbackCount === 0) tips.push('Rate articles in your emails to improve relevance over time.');
  if (weightsAllDefault && interestCount > 0)
    tips.push('Try setting a Critical weight on your primary focus area.');

  return (
    <div className="space-y-6">
      {/* Last briefing card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid #E0E0E0', background: '#FFFFFF' }}
      >
        <div style={{ background: '#011E41', padding: '14px 20px' }}>
          <span
            className="text-xs font-bold tracking-[3px] uppercase"
            style={{ color: '#F5A800' }}
          >
            LAST BRIEFING
          </span>
        </div>
        <div className="p-5">
          {lastDigest ? (
            <div className="space-y-3">
              <div>
                <p className="text-base font-bold" style={{ color: '#011E41' }}>
                  {lastDigest.date}
                </p>
                {lastDigest.articleCount !== null && (
                  <p className="text-sm" style={{ color: '#828282' }}>
                    {lastDigest.articleCount} articles
                  </p>
                )}
              </div>
              {lastDigest.sections.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {lastDigest.sections.map((s, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-bold px-2 py-0.5 rounded"
                      style={{ background: '#F5A800', color: '#011E41' }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-2xl mb-2 opacity-30">📬</div>
              <p className="text-sm" style={{ color: '#828282' }}>
                Your first briefing hasn&apos;t been sent yet.
              </p>
              <a
                href="/intake?demo=true"
                className="text-sm font-semibold mt-1 inline-block"
                style={{ color: '#F5A800' }}
              >
                Send a demo →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Tune your digest tips */}
      {tips.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(245,168,0,0.06)', border: '1px solid rgba(245,168,0,0.2)' }}
        >
          <p
            className="text-xs font-bold uppercase tracking-wider mb-3"
            style={{ color: '#D7761D' }}
          >
            Tune your digest
          </p>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#4F4F4F' }}>
                <span style={{ color: '#F5A800', flexShrink: 0 }}>→</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback history */}
      <div>
        <h3
          className="text-sm font-bold uppercase tracking-wider mb-3"
          style={{ color: '#828282' }}
        >
          Feedback history
        </h3>
        <FeedbackHistory feedback={recentFeedback} />
      </div>
    </div>
  );
}
