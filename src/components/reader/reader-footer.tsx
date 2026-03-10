'use client';

interface ReaderFooterProps {
  token: string;
}

export function ReaderFooter({ token }: ReaderFooterProps) {
  return (
    <div
      className="mt-16 py-8 px-6 text-center"
      style={{
        borderTop: '1px solid #E0E0E0',
        background: '#F7F8FA',
      }}
    >
      <p
        className="text-xs font-bold tracking-[4px] uppercase mb-4"
        style={{ color: '#011E41', letterSpacing: '0.2em' }}
      >
        CROWE INTELLIGENCE
      </p>
      <div className="flex justify-center gap-6 text-sm mb-4">
        <a
          href={`/prefs?token=${token}`}
          className="transition-opacity hover:opacity-70"
          style={{ color: '#F5A800', fontWeight: 600 }}
        >
          Update preferences
        </a>
        <a
          href={`/api/pause?token=${token}`}
          className="transition-opacity hover:opacity-70"
          style={{ color: '#828282' }}
        >
          Pause emails
        </a>
        <a
          href={`/api/unsubscribe?token=${token}`}
          className="transition-opacity hover:opacity-70"
          style={{ color: '#828282' }}
        >
          Unsubscribe
        </a>
      </div>
      <p className="text-xs" style={{ color: '#BDBDBD' }}>
        Smart decisions. Lasting value. · Crowe LLP AI Innovation Team
      </p>
    </div>
  );
}
