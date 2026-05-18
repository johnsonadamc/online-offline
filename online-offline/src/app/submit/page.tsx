'use client';
import React, { Suspense } from 'react';
import SubmissionForm from '@/components/SubmissionForm';

export default function SubmitPage() {
  return (
    <div style={{ background: 'var(--lt-bg)', minHeight: '100vh' }}>
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.14em', color: 'var(--lt-text-3)' }}>loading…</p>
        </div>
      }>
        <SubmissionForm />
      </Suspense>
    </div>
  );
}
