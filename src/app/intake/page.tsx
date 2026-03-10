'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { WizardShell } from '@/components/intake/wizard-shell';

function IntakePageInner() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialDemo = searchParams.get('demo') === 'true';

  return <WizardShell initialEmail={initialEmail} initialDemo={initialDemo} />;
}

export default function IntakePage() {
  return (
    <Suspense>
      <IntakePageInner />
    </Suspense>
  );
}
