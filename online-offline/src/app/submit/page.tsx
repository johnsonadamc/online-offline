'use client';
import React from 'react';
import SubmissionForm from '@/components/SubmissionForm';
import { Card } from '@/components/ui/card';

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <Card className="bg-white">
          <SubmissionForm />
        </Card>
      </div>
    </div>
  );
}