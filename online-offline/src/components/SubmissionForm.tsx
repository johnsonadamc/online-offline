'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { saveContent, getCurrentPeriod } from '@/lib/supabase/content';
import { uploadMedia } from '@/lib/supabase/storage';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Entry {
  id: string | number;
  title: string;
  caption: string;
  selectedTags: string[];
  imageUrl: string | null;
  permanentUrl?: string | null;
  isFeature: boolean;
  isFullSpread: boolean;
  isUploading?: boolean;
  fileType?: string | null;
}

interface ContentTag {
  tag: string;
  tag_type: string;
}

interface ContentEntry {
  id: string | number;
  title: string;
  caption: string;
  media_url: string | null;
  is_feature: boolean;
  is_full_spread: boolean;
  content_tags: ContentTag[];
}

type PressState = 'rest' | 'pressing' | 'releasing';
type SaveStatus = 'saving' | 'saved' | 'error' | '';

// ── Constants ─────────────────────────────────────────────────────────────────

const generateUniqueId = (): string =>
  `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const MAX_ENTRIES = 8;
const CAPTION_WARN = 200;

const THEMES = [
  'Photography', 'Music', 'Art', 'Family', 'Nature', 'Travel', 'Food', 'Sports',
  'Architecture', 'Fashion', 'Literature', 'Film', 'Street Life', 'Portrait', 'Urban',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubmissionForm() {
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');

  // ── content state ────────────────────────────────────────────────────────────
  const [submissionType, setSubmissionType] = useState<'regular' | 'fullSpread'>('regular');
  const [status, setStatus]               = useState<'draft' | 'submitted'>('draft');
  const [pageTitle, setPageTitle]         = useState('');
  const [entries, setEntries]             = useState<Entry[]>([{
    id: generateUniqueId(),
    title: '', caption: '', selectedTags: [],
    imageUrl: null, isFeature: false, isFullSpread: false,
  }]);
  const [featureEntryId, setFeatureEntryId] = useState<string | number | null>(null);

  // ── period / deadline state ──────────────────────────────────────────────────
  const [timeLeft, setTimeLeft]     = useState({ days: 0, hours: 0 });
  const [periodLabel, setPeriodLabel] = useState('');

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [currentSlide, setCurrentSlide] = useState(0);
  const [saveStatus, setSaveStatus]     = useState<SaveStatus>('');
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [savePress, setSavePress]         = useState<PressState>('rest');
  const [submitPress, setSubmitPress]     = useState<PressState>('rest');

  return null;
}
