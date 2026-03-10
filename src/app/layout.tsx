import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Your Briefing — Personalized News Digest',
  description: 'Get a personalized email digest of the news that matters to you.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-tint-900 antialiased">
        {children}
      </body>
    </html>
  );
}
