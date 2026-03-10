import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Crowe Intelligence — AI Briefing Platform',
  description: 'AI-powered intelligence briefings for Crowe professionals. Curated from 50+ sources, delivered before 7am.',
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
