import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Crowe Briefing',
  description: 'Preference-driven email digest with deep research capabilities',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
