'use client';

interface FeedbackItem {
  articleTitle: string;
  action: 'upvote' | 'downvote' | 'dismiss';
  date: string;
}

const ACTION_CONFIG = {
  upvote: { icon: '👍', label: 'Helpful', color: '#05AB8C' },
  downvote: { icon: '👎', label: 'Not relevant', color: '#E5376B' },
  dismiss: { icon: '🚫', label: 'Hidden', color: '#828282' },
};

interface FeedbackHistoryProps {
  feedback: FeedbackItem[];
}

export function FeedbackHistory({ feedback }: FeedbackHistoryProps) {
  if (feedback.length === 0) {
    return (
      <div
        className="py-8 text-center rounded-xl"
        style={{ background: '#F7F8FA', border: '1px dashed #E0E0E0' }}
      >
        <div className="text-3xl mb-2 opacity-30">📊</div>
        <p className="text-sm font-medium" style={{ color: '#828282' }}>No feedback yet</p>
        <p className="text-xs mt-1" style={{ color: '#BDBDBD' }}>
          Rate articles in your emails to improve your digest
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {feedback.map((item, i) => {
        const config = ACTION_CONFIG[item.action];
        return (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: '#F7F8FA', border: '1px solid #E0E0E0' }}
          >
            <span className="text-base shrink-0 mt-0.5">{config.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug line-clamp-1" style={{ color: '#333333' }}>
                {item.articleTitle}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-medium" style={{ color: config.color }}>
                  {config.label}
                </span>
                <span className="text-[11px]" style={{ color: '#BDBDBD' }}>·</span>
                <span className="text-[11px]" style={{ color: '#BDBDBD' }}>
                  {item.date}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
