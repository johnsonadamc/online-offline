'use client';
import React, { Suspense } from 'react';
import SubmissionForm from '@/components/SubmissionForm';
import { Card } from '@/components/ui/card';

// Create a loading component
const Loading = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading submission form...</p>
    </div>
  </div>
);

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <Card className="bg-white">
          <Suspense fallback={<Loading />}>
            <SubmissionForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}