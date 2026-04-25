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

  // ── blob cleanup ────────────────────────────────────────────────────────────
  useEffect(() => {
    const blobUrls = entries
      .filter(e => e.imageUrl?.startsWith('blob:'))
      .map(e => e.imageUrl as string);
    return () => { blobUrls.forEach(u => URL.revokeObjectURL(u)); };
  }, [entries]);

  // ── load draft ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!draftId) return;
    const loadDraft = async () => {
      try {
        const { data, error } = await supabase
          .from('content')
          .select('*, content_entries(*, content_tags(*))')
          .eq('id', draftId)
          .single();
        if (error || !data) { console.error('Error loading draft:', error); return; }
        setSubmissionType(data.type);
        setStatus(data.status);
        if (data.page_title) setPageTitle(data.page_title);
        if (data.content_entries?.length > 0) {
          const loaded: Entry[] = data.content_entries.map((entry: ContentEntry) => ({
            id: entry.id,
            title: entry.title || '',
            caption: entry.caption || '',
            selectedTags: entry.content_tags?.map((t: ContentTag) => t.tag) || [],
            imageUrl: entry.media_url,
            isFeature: entry.is_feature || false,
            isFullSpread: entry.is_full_spread || false,
            fileType: 'stored',
          }));
          setEntries(loaded);
          setCurrentSlide(0);
          const featEntry = loaded.find(e => e.isFeature);
          setFeatureEntryId(featEntry ? featEntry.id : null);
        }
      } catch (err) { console.error('Unexpected error loading draft:', err); }
    };
    loadDraft();
  }, [draftId, supabase]);

  // ── load period ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadPeriod = async () => {
      try {
        const { period, error } = await getCurrentPeriod();
        if (error || !period) { console.error('Error fetching period:', error); return; }
        const pstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
        const pstEnd = new Date(period.end_date);
        pstEnd.setTime(pstEnd.getTime() + pstEnd.getTimezoneOffset() * 60000);
        const pstEndDT = new Date(pstEnd.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
        const diff = pstEndDT.getTime() - pstNow.getTime();
        setPeriodLabel(`${period.season} ${period.year}`);
        setTimeLeft({
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff % 86400000) / 3600000),
        });
      } catch (err) { console.error('Unexpected error loading period:', err); }
    };
    loadPeriod();
    const t = setInterval(loadPeriod, 3600000);
    return () => clearInterval(t);
  }, []);

  // ── feature toggle ──────────────────────────────────────────────────────────
  const handleSetFeature = useCallback((entryId: string | number) => {
    if (featureEntryId === entryId) {
      setFeatureEntryId(null);
      setEntries(prev => prev.map(e => ({ ...e, isFeature: false })));
    } else {
      setFeatureEntryId(entryId);
      setEntries(prev => prev.map(e => ({ ...e, isFeature: e.id === entryId })));
    }
  }, [featureEntryId]);

  // ── image upload ─────────────────────────────────────────────────────────────
  const handleImageChange = async (entryId: string | number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const previewUrl = URL.createObjectURL(file);
      const updated = entries.map(en =>
        en.id === entryId ? { ...en, imageUrl: previewUrl, isUploading: true, fileType: 'blob' } : en
      );
      setEntries(updated);
      const idx = updated.findIndex(en => en.id === entryId);
      if (idx !== -1) setCurrentSlide(idx);
      const { url } = await uploadMedia(file);
      setEntries(prev => prev.map(en =>
        en.id === entryId ? { ...en, permanentUrl: url, isUploading: false } : en
      ));
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Error uploading image. Please try again.');
      setEntries(prev => prev.map(en =>
        en.id === entryId ? { ...en, imageUrl: null, permanentUrl: null, isUploading: false, fileType: null } : en
      ));
    }
  };

  // ── remove image ─────────────────────────────────────────────────────────────
  const handleRemoveImage = (entryId: string | number) => {
    setEntries(prev => {
      const idx = prev.findIndex(en => en.id === entryId);
      if (idx === -1) return prev;
      const en = prev[idx];
      if (en.imageUrl?.startsWith('blob:') && en.fileType === 'blob') URL.revokeObjectURL(en.imageUrl);
      const filtered = prev.filter(en => en.id !== entryId);
      if (filtered.length === 0) filtered.push({ id: generateUniqueId(), title: '', caption: '', selectedTags: [], imageUrl: null, isFeature: false, isFullSpread: false });
      if (idx <= currentSlide && currentSlide > 0) setTimeout(() => setCurrentSlide(c => Math.max(0, c - 1)), 0);
      return filtered;
    });
    if (featureEntryId === entryId) setFeatureEntryId(null);
  };

  // ── add entry ─────────────────────────────────────────────────────────────────
  const handleAddEntry = useCallback(() => {
    if (entries.length >= MAX_ENTRIES) { alert(`Maximum ${MAX_ENTRIES} images per submission.`); return; }
    const newEntry: Entry = { id: generateUniqueId(), title: '', caption: '', selectedTags: [], imageUrl: null, isFeature: false, isFullSpread: false };
    setEntries(prev => [...prev, newEntry]);
    setCurrentSlide(entries.length);
  }, [entries]);

  // ── navigation ───────────────────────────────────────────────────────────────
  const handlePrevSlide = () => { if (currentSlide > 0) setCurrentSlide(s => s - 1); };
  const handleNextSlide = () => { if (currentSlide < entries.length - 1) setCurrentSlide(s => s + 1); };

  // ── copy tags from first entry ────────────────────────────────────────────────
  const handleCopyTags = useCallback((targetIndex: number) => {
    if (targetIndex === 0 || entries.length === 0) return;
    const firstTags = entries[0].selectedTags;
    setEntries(prev => prev.map((e, i) => {
      if (i !== targetIndex) return e;
      const merged = Array.from(new Set([...e.selectedTags, ...firstTags]));
      return { ...e, selectedTags: merged };
    }));
  }, [entries]);

  // ── save draft ───────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    setSaveStatus('saving');
    try {
      const entriesToSave = entries.map(en => ({ ...en, imageUrl: en.permanentUrl || en.imageUrl }));
      const result = await saveContent(submissionType, status, entriesToSave, draftId || undefined, pageTitle);
      if (result.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        setSaveStatus('error');
        alert('Error saving: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Unexpected error saving draft:', err);
      setSaveStatus('error');
      alert('Error saving draft');
    }
  };

  // ── submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      const entriesToSave = entries.map(en => ({ ...en, imageUrl: en.permanentUrl || en.imageUrl }));
      const result = await saveContent(submissionType, 'submitted', entriesToSave, draftId || undefined, pageTitle);
      if (result.success) setStatus('submitted');
      else alert('Error submitting: ' + (result.error || 'Unknown error'));
    } catch (err) {
      console.error('Unexpected error submitting:', err);
      alert('Error submitting content');
    }
  };

  // ── press mechanic ───────────────────────────────────────────────────────────
  const releasePress = (setter: React.Dispatch<React.SetStateAction<PressState>>, cb: () => void) => {
    setter('pressing');
    setTimeout(() => { setter('releasing'); cb(); setTimeout(() => setter('rest'), 220); }, 140);
  };

  // ── derived ──────────────────────────────────────────────────────────────────
  const entry = entries[currentSlide] ?? entries[0];
  const hasImage = !!entry?.imageUrl;
  const isFeature = entry?.id === featureEntryId;
  const deadlineText = timeLeft.days > 0
    ? `${timeLeft.days}d remaining`
    : timeLeft.hours > 0 ? `${timeLeft.hours}h remaining` : 'closing soon';

  return null;
}
