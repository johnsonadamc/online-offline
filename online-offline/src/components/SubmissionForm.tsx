'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { saveContent, getCurrentPeriod } from '@/lib/supabase/content';
import { TEXT_SUBMISSION_MAX_WORDS, TEXT_SUBMISSION_WARN_WORDS } from '@/lib/constants/submission';
import { uploadMedia } from '@/lib/supabase/storage';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

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
  focal_x: number;
  focal_y: number;
  aspect_ratio: number | null;
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
  focal_x: number | null;
  focal_y: number | null;
  aspect_ratio: number | null;
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
  const supabase = useMemo(() => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');

  // ── content state ────────────────────────────────────────────────────────────
  const [format, setFormat]               = useState<'image' | 'text'>('image');
  const [submissionType, setSubmissionType] = useState<'regular' | 'fullSpread'>('regular');
  const [status, setStatus]               = useState<'draft' | 'submitted'>('draft');
  const [pageTitle, setPageTitle]         = useState('');
  const [textBody, setTextBody]           = useState('');
  const [entries, setEntries]             = useState<Entry[]>([{
    id: generateUniqueId(),
    title: '', caption: '', selectedTags: [],
    imageUrl: null, isFeature: false, isFullSpread: false,
    focal_x: 50, focal_y: 50, aspect_ratio: null,
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
  const [focalHovered, setFocalHovered]   = useState(false);

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
        if (data.format === 'text') setFormat('text');
        setSubmissionType(data.type);
        setStatus(data.status);
        if (data.page_title) setPageTitle(data.page_title);
        if (data.format === 'text') {
          const bodyEntry = data.content_entries?.[0];
          if (bodyEntry?.body) setTextBody(bodyEntry.body);
        } else if (data.content_entries?.length > 0) {
          const loaded: Entry[] = data.content_entries.map((entry: ContentEntry) => ({
            id: entry.id,
            title: entry.title || '',
            caption: entry.caption || '',
            selectedTags: entry.content_tags?.map((t: ContentTag) => t.tag) || [],
            imageUrl: entry.media_url,
            isFeature: entry.is_feature || false,
            isFullSpread: entry.is_full_spread || false,
            fileType: 'stored',
            focal_x: entry.focal_x ?? 50,
            focal_y: entry.focal_y ?? 50,
            aspect_ratio: entry.aspect_ratio ?? null,
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
      const aspect_ratio = await new Promise<number>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
        img.onerror = () => resolve(1);
        img.src = previewUrl;
      });
      const updated = entries.map(en =>
        en.id === entryId ? { ...en, imageUrl: previewUrl, isUploading: true, fileType: 'blob', aspect_ratio } : en
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
      if (filtered.length === 0) filtered.push({ id: generateUniqueId(), title: '', caption: '', selectedTags: [], imageUrl: null, isFeature: false, isFullSpread: false, focal_x: 50, focal_y: 50, aspect_ratio: null });
      if (idx <= currentSlide && currentSlide > 0) setTimeout(() => setCurrentSlide(c => Math.max(0, c - 1)), 0);
      return filtered;
    });
    if (featureEntryId === entryId) setFeatureEntryId(null);
  };

  // ── add entry ─────────────────────────────────────────────────────────────────
  const handleAddEntry = useCallback(() => {
    if (entries.length >= MAX_ENTRIES) { alert(`Maximum ${MAX_ENTRIES} images per submission.`); return; }
    const newEntry: Entry = { id: generateUniqueId(), title: '', caption: '', selectedTags: [], imageUrl: null, isFeature: false, isFullSpread: false, focal_x: 50, focal_y: 50, aspect_ratio: null };
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
  const isSavingRef = useRef(false);
  const handleSaveDraft = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    const hasTitle = pageTitle.trim() !== '' && pageTitle.trim() !== 'Untitled';
    const hasTextContent = format === 'text' && textBody.trim().length > 0;
    const hasImageContent = format === 'image' && entries.some(e => e.imageUrl !== null);
    // Text submissions require BOTH a title and body content before saving
    if (format === 'text' && (!hasTitle || !hasTextContent)) { isSavingRef.current = false; return; }
    // Image submissions require at least a title or an image
    if (format === 'image' && !hasTitle && !hasImageContent) { isSavingRef.current = false; return; }
    setSaveStatus('saving');
    try {
      let entriesToSave;
      if (format === 'text') {
        entriesToSave = [{ title: '', caption: '', selectedTags: [], imageUrl: null, isFeature: false, isFullSpread: false, body: textBody }];
      } else {
        entriesToSave = entries.map(en => ({ ...en, imageUrl: en.permanentUrl || en.imageUrl }));
      }
      const result = await saveContent(submissionType, status, entriesToSave, draftId || undefined, pageTitle, format);
      if (result.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
        // Sync URL with the saved record's ID so subsequent saves update in place
        if (result.id && result.id !== draftId) {
          router.replace(`/submit?draft=${result.id}`);
        }
      } else {
        setSaveStatus('error');
        alert('Error saving: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Unexpected error saving draft:', err);
      setSaveStatus('error');
      alert('Error saving draft');
    } finally {
      isSavingRef.current = false;
    }
  };

  // ── submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      let entriesToSave;
      if (format === 'text') {
        entriesToSave = [{ title: '', caption: '', selectedTags: [], imageUrl: null, isFeature: false, isFullSpread: false, body: textBody }];
      } else {
        entriesToSave = entries.map(en => ({ ...en, imageUrl: en.permanentUrl || en.imageUrl }));
      }
      const result = await saveContent(submissionType, 'submitted', entriesToSave, draftId || undefined, pageTitle, format);
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
  const textWordCount = textBody.trim() ? textBody.trim().split(/\s+/).filter(Boolean).length : 0;
  const entry = entries[currentSlide] ?? entries[0];
  const hasImage = !!entry?.imageUrl;
  const isFeature = entry?.id === featureEntryId;
  const deadlineText = timeLeft.days > 0
    ? `${timeLeft.days}d remaining`
    : timeLeft.hours > 0 ? `${timeLeft.hours}h remaining` : 'closing soon';

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--ground)', height: '100vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 390, height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{
          padding: '20px 22px 0', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 20, background: 'var(--ground)',
        }}>
          <Link href="/dashboard" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--paper-4)', textDecoration: 'none',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 11,
              color: saveStatus === 'saved'
                ? 'var(--neon-green)'
                : status === 'submitted'
                  ? 'var(--neon-accent)'
                  : 'var(--paper-4)',
              textShadow: saveStatus === 'saved'
                ? '0 0 8px var(--glow-green)'
                : status === 'submitted'
                  ? '0 0 8px var(--glow-accent)'
                  : 'none',
              transition: 'color 0.2s',
            }}>
              {saveStatus === 'saving' ? 'saving…' : saveStatus === 'saved' ? 'saved' : status === 'submitted' ? 'submitted' : 'draft'}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
              color: 'var(--neon-accent)', textShadow: '0 0 6px var(--glow-accent)',
            }}>
              {deadlineText}
            </span>
          </div>
        </div>

        {/* Thick rule */}
        <div style={{
          height: 1, margin: '11px 22px 0',
          background: 'var(--paper)', opacity: 0.8,
          boxShadow: '0 0 6px 1px rgba(240,235,226,0.25), 0 0 20px rgba(240,235,226,0.08)',
        }} />

        {/* ── Scroll body ── */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 } as React.CSSProperties}>

          {/* Collection title */}
          <div style={{ padding: '18px 22px 0' }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--paper-5)', marginBottom: 5,
            }}>
              {format === 'text' ? 'Title' : submissionType === 'fullSpread' ? 'Title' : 'Collection title'}
            </div>
            <input
              value={pageTitle}
              onChange={e => setPageTitle(e.target.value)}
              disabled={status === 'submitted'}
              placeholder="Untitled"
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'var(--font-serif)', fontSize: 26, color: 'var(--paper)',
                opacity: 0.9, lineHeight: 1.1, caretColor: 'var(--neon-accent)',
              }}
            />
          </div>
          <div style={{ height: 1, margin: '12px 22px 0', background: 'var(--rule-mid)' }} />

          {/* Format toggle */}
          <div style={{ padding: '14px 22px 0' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { value: 'image' as const, label: 'Image' },
                { value: 'text'  as const, label: 'Text'  },
              ]).map(({ value, label }) => {
                const active = format === value;
                return (
                  <button
                    key={value}
                    onClick={() => status !== 'submitted' && setFormat(value)}
                    style={{
                      padding: '7px 16px',
                      cursor: status === 'submitted' ? 'default' : 'pointer',
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                      borderRadius: 2,
                      background: active ? 'rgba(224,90,40,0.08)' : 'var(--ground-3)',
                      borderTop: `1px solid ${active ? 'rgba(224,90,40,0.35)' : 'var(--rule-mid)'}`,
                      borderRight: `1px solid ${active ? 'rgba(224,90,40,0.35)' : 'var(--rule-mid)'}`,
                      borderLeft: `2px solid ${active ? 'var(--neon-accent)' : 'var(--rule-mid)'}`,
                      borderBottom: `1px solid ${active ? 'rgba(224,90,40,0.35)' : 'var(--rule-mid)'}`,
                      color: active ? 'var(--neon-accent)' : 'var(--paper-4)',
                      textShadow: active ? '0 0 6px var(--glow-accent)' : 'none',
                      boxShadow: active ? '-3px 0 10px -2px var(--glow-accent)' : 'none',
                      transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s, color 0.15s',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode selector — image only */}
          {format === 'image' && (
            <div style={{ padding: '10px 22px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {([
                  { value: 'regular' as const, label: 'Collection', desc: '1–8 images, one featured' },
                  { value: 'fullSpread' as const, label: 'Full Spread', desc: 'Single image, full page' },
                ]).map(({ value, label, desc }) => {
                  const active = submissionType === value;
                  return (
                    <button
                      key={value}
                      onClick={() => status !== 'submitted' && setSubmissionType(value)}
                      style={{
                        padding: '10px 12px', textAlign: 'left', cursor: status === 'submitted' ? 'default' : 'pointer',
                        background: active ? 'rgba(224,90,40,0.08)' : 'var(--ground-3)',
                        border: `1px solid ${active ? 'rgba(224,90,40,0.35)' : 'var(--rule-mid)'}`,
                        borderRadius: 2,
                        boxShadow: active ? '-3px 0 10px -2px var(--glow-accent)' : 'none',
                        transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                      }}
                    >
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                        textTransform: 'uppercase', marginBottom: 2,
                        color: active ? 'var(--neon-accent)' : 'var(--paper-4)',
                        textShadow: active ? '0 0 6px var(--glow-accent)' : 'none',
                      }}>
                        {label}
                      </div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--paper-3)', fontWeight: 300 }}>
                        {desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Text body area */}
          {format === 'text' && (
            <div style={{ margin: '16px 22px 0' }}>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={textBody}
                  onChange={e => setTextBody(e.target.value)}
                  disabled={status === 'submitted'}
                  placeholder="Write your piece here…"
                  style={{
                    width: '100%', minHeight: 320,
                    background: 'var(--ground-3)',
                    borderTop: '1px solid var(--rule-mid)',
                    borderRight: '1px solid var(--rule-mid)',
                    borderLeft: '1px solid var(--rule-mid)',
                    borderBottom: '1px solid var(--rule-mid)',
                    borderRadius: 2,
                    padding: '14px 16px 36px',
                    outline: 'none',
                    color: 'var(--paper)',
                    fontFamily: 'var(--font-serif)', fontSize: 16,
                    lineHeight: 1.7, resize: 'vertical',
                    caretColor: 'var(--neon-accent)',
                    whiteSpace: 'pre-wrap',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  } as React.CSSProperties}
                  onFocus={e => {
                    e.currentTarget.style.borderTopColor = 'rgba(224,90,40,0.5)';
                    e.currentTarget.style.borderRightColor = 'rgba(224,90,40,0.5)';
                    e.currentTarget.style.borderLeftColor = 'rgba(224,90,40,0.5)';
                    e.currentTarget.style.borderBottomColor = 'rgba(224,90,40,0.5)';
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(224,90,40,0.2), 0 0 16px rgba(224,90,40,0.08)';
                  }}
                  onBlurCapture={e => {
                    e.currentTarget.style.borderTopColor = 'var(--rule-mid)';
                    e.currentTarget.style.borderRightColor = 'var(--rule-mid)';
                    e.currentTarget.style.borderLeftColor = 'var(--rule-mid)';
                    e.currentTarget.style.borderBottomColor = 'var(--rule-mid)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <div style={{
                  position: 'absolute', bottom: 10, right: 12,
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em',
                  pointerEvents: 'none',
                  color: textWordCount >= TEXT_SUBMISSION_MAX_WORDS
                    ? 'var(--neon-accent)'
                    : textWordCount >= TEXT_SUBMISSION_WARN_WORDS
                      ? 'var(--neon-amber)'
                      : 'var(--paper-4)',
                  textShadow: textWordCount >= TEXT_SUBMISSION_MAX_WORDS
                    ? '0 0 6px var(--glow-accent)'
                    : textWordCount >= TEXT_SUBMISSION_WARN_WORDS
                      ? '0 0 6px var(--glow-amber)'
                      : 'none',
                  transition: 'color 0.15s',
                }}>
                  {textWordCount} / 800 words
                </div>
              </div>
            </div>
          )}

          {/* Image area */}
          <div style={{ margin: '16px 22px 0', display: format === 'text' ? 'none' : undefined }}>

            {/* Main viewer */}
            <div style={{
              width: '100%',
              aspectRatio: submissionType === 'fullSpread' ? '3/4' : '4/3',
              background: 'var(--ground-3)',
              border: '1px solid var(--rule-mid)',
              borderRadius: 2, overflow: 'hidden', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {hasImage ? (
                <>
                  <img
                    src={entry.imageUrl!}
                    alt={entry.title || 'image'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* overlay gradient */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(15,14,11,0.65) 0%, transparent 50%)',
                    pointerEvents: 'none',
                  }} />

                  {/* uploading spinner */}
                  {entry.isUploading && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
                      <div style={{ width: 28, height: 28, border: '2px solid var(--neon-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                  )}

                  {/* focal point selector */}
                  {!entry.isUploading && status === 'draft' && (
                    <div
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                        const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                        setEntries(prev => prev.map((en, i) =>
                          i === currentSlide ? { ...en, focal_x: x, focal_y: y } : en
                        ));
                      }}
                      onMouseEnter={() => setFocalHovered(true)}
                      onMouseLeave={() => setFocalHovered(false)}
                      style={{ position: 'absolute', inset: 0, cursor: 'crosshair', zIndex: 1 }}
                    >
                      {focalHovered && (
                        <div style={{
                          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                          fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.08em',
                          color: 'var(--paper-3)', background: 'rgba(15,14,11,0.82)',
                          padding: '3px 8px', borderRadius: 2, whiteSpace: 'nowrap',
                          border: '1px solid var(--rule-mid)', pointerEvents: 'none', zIndex: 10,
                        }}>
                          click to set print crop center
                        </div>
                      )}
                      <div style={{
                        position: 'absolute',
                        left: `${entry.focal_x ?? 50}%`,
                        top: `${entry.focal_y ?? 50}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 20, height: 20,
                        pointerEvents: 'none',
                      }}>
                        <div style={{
                          position: 'absolute', top: '50%', left: '50%',
                          width: 8, height: 8,
                          transform: 'translate(-50%, -50%)',
                          borderRadius: '50%',
                          background: 'rgba(224,90,40,0.25)',
                          border: '1px solid var(--neon-accent)',
                          boxShadow: '0 0 6px var(--glow-accent)',
                        }} />
                        <div style={{
                          position: 'absolute', top: '50%', left: 0,
                          width: '100%', height: 1,
                          transform: 'translateY(-50%)',
                          background: 'var(--neon-accent)', opacity: 0.55,
                        }} />
                        <div style={{
                          position: 'absolute', top: 0, left: '50%',
                          width: 1, height: '100%',
                          transform: 'translateX(-50%)',
                          background: 'var(--neon-accent)', opacity: 0.55,
                        }} />
                      </div>
                    </div>
                  )}

                  {/* remove button — top right */}
                  {status === 'draft' && (
                    <button
                      onClick={() => handleRemoveImage(entry.id)}
                      disabled={entry.isUploading}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 26, height: 26,
                        background: 'rgba(15,14,11,0.7)', border: '1px solid var(--rule-mid)',
                        borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--paper-3)', zIndex: 2,
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}

                  {/* feature button — bottom left, collection only */}
                  {status === 'draft' && submissionType === 'regular' && (
                    <button
                      onClick={() => handleSetFeature(entry.id)}
                      style={{
                        position: 'absolute', bottom: 8, left: 8,
                        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 8px', borderRadius: 2,
                        border: isFeature ? '1px solid rgba(224,90,40,0.4)' : '1px solid var(--rule-mid)',
                        background: 'rgba(15,14,11,0.75)',
                        cursor: 'pointer', zIndex: 2,
                        color: isFeature ? 'var(--neon-accent)' : 'var(--paper-4)',
                        textShadow: isFeature ? '0 0 6px var(--glow-accent)' : 'none',
                      }}
                    >
                      <span>{isFeature ? '★' : '☆'}</span>
                      <span>{isFeature ? 'feature image' : 'set as feature'}</span>
                    </button>
                  )}

                  {/* nav arrows */}
                  {submissionType === 'regular' && entries.length > 1 && currentSlide > 0 && (
                    <button onClick={handlePrevSlide} style={{
                      position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                      width: 28, height: 28, background: 'rgba(15,14,11,0.7)',
                      border: '1px solid var(--rule-mid)', borderRadius: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'var(--paper-3)', zIndex: 2,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6" /></svg>
                    </button>
                  )}
                  {submissionType === 'regular' && entries.length > 1 && currentSlide < entries.length - 1 && (
                    <button onClick={handleNextSlide} style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      width: 28, height: 28, background: 'rgba(15,14,11,0.7)',
                      border: '1px solid var(--rule-mid)', borderRadius: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'var(--paper-3)', zIndex: 2,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9,18 15,12 9,6" /></svg>
                    </button>
                  )}
                </>
              ) : (
                /* Upload zone */
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 10, width: '100%', height: '100%', cursor: status === 'submitted' ? 'default' : 'pointer',
                }}>
                  <div style={{
                    width: 40, height: 40, border: '1px solid var(--rule-mid)', borderRadius: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--ground-4)',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--paper-4)" strokeWidth="1.5">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper-4)' }}>
                    Add image
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--paper-5)', fontWeight: 300 }}>
                    tap to upload
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={e => handleImageChange(entry?.id ?? entries[0].id, e)}
                    disabled={status === 'submitted'}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {/* Crop center label */}
            {hasImage && status === 'draft' && !entry.isUploading && (
              <div style={{
                marginTop: 4, textAlign: 'right',
                fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--paper-4)',
              }}>
                crop center {Math.round(entry.focal_x ?? 50)}%, {Math.round(entry.focal_y ?? 50)}%
              </div>
            )}

            {/* Filmstrip — collection mode only, when entries exist */}
            {submissionType === 'regular' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' } as React.CSSProperties}>
                  {entries.map((en, i) => {
                    const isFeatSlot = en.id === featureEntryId;
                    const isActiveSlot = i === currentSlide;
                    return (
                      <div
                        key={`film-${en.id}`}
                        onClick={() => setCurrentSlide(i)}
                        style={{
                          flexShrink: 0, width: 48, height: 48,
                          background: 'var(--ground-3)',
                          border: isFeatSlot
                            ? '1px solid var(--neon-accent)'
                            : isActiveSlot
                              ? '1px solid rgba(240,235,226,0.4)'
                              : '1px solid var(--rule-mid)',
                          borderRadius: 2, overflow: 'hidden', position: 'relative',
                          cursor: 'pointer',
                          boxShadow: isFeatSlot ? '0 0 6px var(--glow-accent)' : 'none',
                          transition: 'border-color 0.12s, box-shadow 0.12s',
                        }}
                      >
                        {en.imageUrl && (
                          <img src={en.imageUrl} alt={`${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        )}
                        {isFeatSlot && (
                          <div style={{
                            position: 'absolute', bottom: 2, right: 3,
                            fontSize: 8, color: 'var(--neon-accent)',
                            textShadow: '0 0 4px var(--glow-accent)', lineHeight: 1,
                          }}>★</div>
                        )}
                      </div>
                    );
                  })}

                  {/* counter */}
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em',
                    color: 'var(--paper-5)', whiteSpace: 'nowrap', flexShrink: 0,
                    marginLeft: 'auto', paddingLeft: 8,
                  }}>
                    {currentSlide + 1} / {entries.length}
                  </div>

                  {/* add button */}
                  {status === 'draft' && entries.length < MAX_ENTRIES && (
                    <div
                      onClick={handleAddEntry}
                      style={{
                        flexShrink: 0, width: 48, height: 48,
                        background: 'var(--ground-3)', border: '1px dashed var(--rule-mid)',
                        borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--paper-5)',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                  )}
                </div>
                {entries.length > 1 && (
                  <div style={{ marginTop: 5, fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--paper-5)', fontWeight: 300, fontStyle: 'italic' }}>
                    Tap to navigate between images
                  </div>
                )}
              </>
            )}
          </div>

          {/* Per-image metadata — image format only */}
          <div style={{ margin: '14px 22px 0', opacity: hasImage ? 1 : 0.4, transition: 'opacity 0.15s', display: format === 'text' ? 'none' : undefined }}>

            {entries.map((en, index) => (
              <div key={`meta-${en.id}`} style={{ display: currentSlide === index ? 'block' : 'none' }}>

                {/* Image title */}
                <input
                  value={en.title}
                  onChange={e => setEntries(prev => prev.map((x, i) => i === index ? { ...x, title: e.target.value } : x))}
                  disabled={status === 'submitted'}
                  placeholder={`Image ${index + 1} title`}
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--paper-2)',
                    lineHeight: 1.2, caretColor: 'var(--neon-accent)',
                  }}
                />

                <div style={{ height: 1, background: 'var(--rule)', margin: '8px 0' }} />

                {/* Caption + char count */}
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={en.caption}
                    onChange={e => setEntries(prev => prev.map((x, i) => i === index ? { ...x, caption: e.target.value } : x))}
                    disabled={status === 'submitted'}
                    placeholder="Add a caption…"
                    rows={2}
                    style={{
                      width: '100%', background: 'transparent', border: 'none', outline: 'none',
                      fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300,
                      color: 'var(--paper-4)', resize: 'none', lineHeight: 1.55,
                      caretColor: 'var(--neon-accent)', minHeight: 42, paddingBottom: 18,
                    }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em',
                    color: en.caption.length > CAPTION_WARN ? 'var(--neon-accent)' : 'var(--paper-5)',
                    textShadow: en.caption.length > CAPTION_WARN ? '0 0 4px var(--glow-accent)' : 'none',
                    pointerEvents: 'none',
                    transition: 'color 0.15s',
                  }}>
                    {en.caption.length}
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--rule)', margin: '10px 0' }} />

                {/* Tags section */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: 'var(--paper-5)', flexShrink: 0,
                    }}>Themes</span>

                    {/* Copy from image 1 — shown on images 2+ */}
                    {index > 0 && (
                      <button
                        onClick={() => handleCopyTags(index)}
                        style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
                          textTransform: 'uppercase', color: 'var(--paper-5)',
                          background: 'transparent', border: '1px dashed var(--rule-mid)',
                          padding: '2px 7px', borderRadius: 2, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy from image 1
                      </button>
                    )}
                  </div>

                  {/* Active tag pills + add button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {en.selectedTags.map(tag => (
                      <span key={tag} style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em',
                        textTransform: 'uppercase', color: 'var(--neon-accent)',
                        background: 'rgba(224,90,40,0.08)', border: '1px solid rgba(224,90,40,0.2)',
                        padding: '2px 7px', borderRadius: 2,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        {tag}
                        {status === 'draft' && (
                          <span
                            onClick={() => setEntries(prev => prev.map((x, i) => i === index ? { ...x, selectedTags: x.selectedTags.filter(t => t !== tag) } : x))}
                            style={{ opacity: 0.5, cursor: 'pointer', lineHeight: 1 }}
                          >×</span>
                        )}
                      </span>
                    ))}
                    {status === 'draft' && (
                      <button
                        onClick={() => setShowTagsPanel(s => !s)}
                        style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                          textTransform: 'uppercase', color: 'var(--paper-5)',
                          background: 'transparent', border: '1px dashed var(--rule-mid)',
                          padding: '2px 7px', borderRadius: 2, cursor: 'pointer',
                        }}
                      >
                        + add
                      </button>
                    )}
                  </div>

                  {/* Tags panel */}
                  {showTagsPanel && status === 'draft' && (
                    <div style={{
                      marginTop: 8, background: 'var(--ground-3)',
                      border: '1px solid var(--rule-mid)', borderRadius: 2, padding: 10,
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: 'var(--paper-5)', marginBottom: 8,
                      }}>Select themes</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 110, overflowY: 'auto' } as React.CSSProperties}>
                        {THEMES.map(tag => {
                          const sel = en.selectedTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              onClick={() => setEntries(prev => prev.map((x, i) => {
                                if (i !== index) return x;
                                const tags = x.selectedTags.includes(tag)
                                  ? x.selectedTags.filter(t => t !== tag)
                                  : [...x.selectedTags, tag];
                                return { ...x, selectedTags: tags };
                              }))}
                              style={{
                                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em',
                                textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
                                border: sel ? '1px solid rgba(224,90,40,0.3)' : '1px solid var(--rule-mid)',
                                color: sel ? 'var(--neon-accent)' : 'var(--paper-4)',
                                background: sel ? 'rgba(224,90,40,0.1)' : 'var(--ground-4)',
                                transition: 'all 0.1s',
                              }}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>

        </div>{/* end scroll-body */}

        {/* ── Action bar ── */}
        <div style={{
          flexShrink: 0, zIndex: 20,
          padding: '12px 22px 28px',
          background: 'var(--ground)', borderTop: '1px solid var(--rule)',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          {status === 'submitted' ? (
            <>
              <span style={{
                fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13,
                color: 'var(--neon-accent)', textShadow: '0 0 8px var(--glow-accent)', flex: 1,
              }}>
                ✓ submitted
              </span>
              <button
                onPointerDown={() => setSubmitPress('pressing')}
                onPointerUp={() => releasePress(setSubmitPress, () => setStatus('draft'))}
                onPointerLeave={() => submitPress === 'pressing' && releasePress(setSubmitPress, () => setStatus('draft'))}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                  textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  border: '1px solid var(--rule-mid)', padding: '9px 16px',
                  background: submitPress === 'pressing' ? 'rgba(224,90,40,0.16)' : 'rgba(224,90,40,0.1)',
                  color: 'var(--neon-accent)', textShadow: '0 0 6px var(--glow-accent)',
                  borderBottomWidth: 2,
                  borderBottomColor: submitPress !== 'rest' ? 'rgba(224,90,40,0.5)' : 'rgba(224,90,40,0.35)',
                  boxShadow: `0 2px 0 rgba(224,90,40,0.3), 0 3px 6px rgba(0,0,0,0.4)`,
                  transform: submitPress === 'pressing' ? 'translateY(2px)' : 'none',
                  transition: submitPress === 'releasing' ? 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)' : 'transform 0.06s ease',
                }}
              >
                Revert to Draft
              </button>
            </>
          ) : (
            <>
              {/* Save button */}
              <button
                onPointerDown={() => setSavePress('pressing')}
                onPointerUp={() => releasePress(setSavePress, handleSaveDraft)}
                onPointerLeave={() => savePress === 'pressing' && releasePress(setSavePress, handleSaveDraft)}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                  textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  border: '1px solid var(--rule-mid)', padding: '9px 16px', minWidth: 80,
                  background: savePress === 'pressing' ? 'var(--ground-4)' : 'var(--ground-3)',
                  color: 'var(--paper-3)',
                  borderBottomWidth: 2, borderBottomColor: 'var(--ground-4)',
                  boxShadow: `0 2px 0 var(--ground-4), 0 3px 6px rgba(0,0,0,0.4)`,
                  transform: savePress === 'pressing' ? 'translateY(2px)' : 'none',
                  transition: savePress === 'releasing' ? 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)' : 'transform 0.06s ease',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17,21 17,13 7,13 7,21" /><polyline points="7,3 7,8 15,8" />
                </svg>
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : 'Save'}
              </button>

              {/* Submit button */}
              {(() => {
                const overLimit = format === 'text' && textWordCount > TEXT_SUBMISSION_MAX_WORDS;
                return (
                  <button
                    disabled={overLimit}
                    onPointerDown={() => !overLimit && setSubmitPress('pressing')}
                    onPointerUp={() => !overLimit && releasePress(setSubmitPress, handleSubmit)}
                    onPointerLeave={() => submitPress === 'pressing' && !overLimit && releasePress(setSubmitPress, handleSubmit)}
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                      textTransform: 'uppercase', borderRadius: 2,
                      cursor: overLimit ? 'default' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '9px 16px',
                      background: overLimit ? 'rgba(224,90,40,0.06)' : submitPress === 'pressing' ? 'rgba(224,90,40,0.16)' : 'rgba(224,90,40,0.1)',
                      borderTop: '1px solid rgba(224,90,40,0.35)',
                      borderRight: '1px solid rgba(224,90,40,0.35)',
                      borderLeft: '1px solid rgba(224,90,40,0.35)',
                      borderBottom: submitPress === 'pressing' ? '2px solid rgba(224,90,40,0.6)' : '2px solid rgba(224,90,40,0.5)',
                      color: overLimit ? 'rgba(224,90,40,0.45)' : 'var(--neon-accent)',
                      textShadow: overLimit ? '0 0 8px var(--glow-accent)' : '0 0 6px var(--glow-accent)',
                      boxShadow: overLimit
                        ? '0 0 10px rgba(224,90,40,0.25)'
                        : `0 2px 0 rgba(224,90,40,0.3), 0 3px 6px rgba(0,0,0,0.4)`,
                      transform: submitPress === 'pressing' ? 'translateY(2px)' : 'none',
                      transition: submitPress === 'releasing' ? 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)' : 'transform 0.06s ease',
                      opacity: overLimit ? 0.6 : 1,
                    }}
                  >
                    Submit
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
                    </svg>
                  </button>
                );
              })()}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
