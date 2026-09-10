'use client';
import React, { Suspense } from 'react';
import SubmissionForm from '@/components/SubmissionForm';
import { PageShell, MONO } from '@/components/v2';

// v2: the page root is PageShell (SubmissionForm renders its own); the Suspense
// fallback is the mono "loading…" word on the same shell — no spinner.
export default function SubmitPage() {
  return (
    <Suspense fallback={
      <PageShell align="center">
        <p style={{ margin: 0, textAlign: 'center', font: `400 12px/1 ${MONO}`, letterSpacing: '0.14em', color: 'var(--ink3)' }}>loading…</p>
      </PageShell>
    }>
      <SubmissionForm />
    </Suspense>
  );
}
