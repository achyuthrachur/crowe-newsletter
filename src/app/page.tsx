import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--crowe-indigo)] mb-2">
            Crowe Briefing
          </h1>
          <p className="text-[var(--crowe-tint-500)] text-lg">
            Your personalized intelligence digest
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <p className="text-[var(--crowe-tint-700)] mb-6">
            Get curated, AI-powered briefings on the topics that matter to your practice.
            Daily digests and weekly deep dives delivered to your inbox.
          </p>

          <Link
            href="/intake"
            className="inline-block w-full py-3 bg-[var(--crowe-amber)] text-[var(--crowe-indigo)] font-bold rounded-lg hover:brightness-95 transition text-center"
          >
            Get Started
          </Link>
        </div>

        <p className="text-xs text-[var(--crowe-tint-500)]">
          Already signed up? Check your email for a preferences link.
        </p>
      </div>
    </div>
  );
}
