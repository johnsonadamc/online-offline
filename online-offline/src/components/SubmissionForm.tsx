'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { saveContent, getCurrentPeriod, withdrawContent } from '@/lib/supabase/content';
import { TEXT_SUBMISSION_MAX_WORDS, TEXT_SUBMISSION_WARN_WORDS } from '@/lib/constants/submission';
import { uploadMedia } from '@/lib/supabase/storage';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { PageShell, Input, Textarea, SegmentedToggle, ChoiceCard, FocalPointFrame, ThumbStrip, SANS, SERIF, MONO } from '@/components/v2';

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
  order_index?: number;
}

type SaveStatus = 'saving' | 'saved' | 'error' | '';

// ── Constants ─────────────────────────────────────────────────────────────────

const generateUniqueId = (): string =>
  `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const MAX_ENTRIES = 8;

// Display-only mirror of isPoetry() in src/magazine/core/selectionLogic.ts (not
// exported there; that dir is never touched by app work). Drives the "Reads as
// poetry / essay" line under the text body. Nothing is written from this.
const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;
const readsAsPoetry = (body: string): boolean => {
  if (!body.includes('\n\n')) return false;
  const lines = body.split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length === 0) return false;
  const avgLineLen = nonEmpty.reduce((s, l) => s + l.length, 0) / nonEmpty.length;
  if (avgLineLen >= 60) return false;
  const words = countWords(body);
  if (words === 0) return false;
  return (lines.length / words) * 100 >= 3;
};

// v2 footer buttons (design `.btn`): sec = 1px --line2 outline, pri = filled
// accent + glow (the one glow on the screen), ghost = --ink3 text only.
const btnBase: React.CSSProperties = {
  font: `500 12px/1 ${SANS}`, letterSpacing: '0.14em', textTransform: 'uppercase',
  padding: '15px 18px', borderRadius: 5, textAlign: 'center', flex: 'none', whiteSpace: 'nowrap',
  cursor: 'pointer', background: 'transparent', borderWidth: 0, WebkitTapHighlightColor: 'transparent',
};
const btnSec: React.CSSProperties = { ...btnBase, color: 'var(--ink2)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)' };
const btnGhost: React.CSSProperties = { ...btnBase, color: 'var(--ink3)' };
const btnPri: React.CSSProperties = {
  ...btnBase, flex: 1, color: '#0d0c0a', background: 'var(--orange)',
  boxShadow: '0 0 28px color-mix(in oklch, var(--orange) 35%, transparent)',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubmissionForm() {
  const supabase = useSupabase();
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
  const [, setPeriodLabel] = useState(''); // set by loadPeriod; the v2 header has no slot for it

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [currentSlide, setCurrentSlide] = useState(0);
  const [saveStatus, setSaveStatus]     = useState<SaveStatus>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // frame swipe (prev/next): touch start point + the focal at touch start, restored if it was a swipe
  const swipeRef = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);

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
          const sorted = [...data.content_entries].sort((a: ContentEntry, b: ContentEntry) => (a.order_index ?? 0) - (b.order_index ?? 0));
          const loaded: Entry[] = sorted.map((entry: ContentEntry) => ({
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
        const { period, error } = await getCurrentPeriod(supabase);
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
      const { url } = await uploadMedia(supabase, file);
      setEntries(prev => prev.map(en => {
        if (en.id !== entryId) return en;
        // Revoke the blob URL now that we have the permanent URL, then replace imageUrl
        // so the main preview never references a revoked blob after navigation triggers cleanup
        if (en.imageUrl?.startsWith('blob:')) URL.revokeObjectURL(en.imageUrl);
        return { ...en, imageUrl: url, permanentUrl: url, isUploading: false, fileType: 'stored' };
      }));
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
      const result = await saveContent(supabase, submissionType, status, entriesToSave, draftId || undefined, pageTitle, format);
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
      const result = await saveContent(supabase, submissionType, 'submitted', entriesToSave, draftId || undefined, pageTitle, format);
      if (result.success) setStatus('submitted');
      else alert('Error submitting: ' + (result.error || 'Unknown error'));
    } catch (err) {
      console.error('Unexpected error submitting:', err);
      alert('Error submitting content');
    }
  };

  // ── withdraw (submitted state) ───────────────────────────────────────────────
  // Withdraw = the dashboard's DB write (withdrawContent → status 'draft'), then the
  // form drops to draft. Edit = the old "Revert to Draft" (local setStatus only).
  const handleWithdraw = async () => {
    if (draftId) {
      const result = await withdrawContent(supabase, draftId);
      if (!result.success) { alert('Error withdrawing: ' + (result.error || 'Unknown error')); return; }
    }
    setStatus('draft');
  };

  // ── derived ──────────────────────────────────────────────────────────────────
  const textWordCount = textBody.trim() ? textBody.trim().split(/\s+/).filter(Boolean).length : 0;
  const entry = entries[currentSlide] ?? entries[0];
  const hasImage = !!entry?.imageUrl;
  const isFeature = entry?.id === featureEntryId;
  const deadlineText = timeLeft.days > 0
    ? `${timeLeft.days}d remaining`
    : timeLeft.hours > 0 ? `${timeLeft.hours}h remaining` : 'closing soon';
  const readOnly = status === 'submitted';
  const overLimit = format === 'text' && textWordCount > TEXT_SUBMISSION_MAX_WORDS;
  const titlePlaceholder = format === 'text' ? 'Title' : submissionType === 'fullSpread' ? 'Title' : 'Collection title';
  const focalEditable = hasImage && !readOnly && !entry.isUploading;
  const statusWord = saveStatus === 'saving' ? 'saving…' : saveStatus === 'saved' ? 'saved' : status === 'submitted' ? 'submitted' : 'draft';

  // ── frame swipe → prev/next (collection only) ────────────────────────────────
  const onFrameTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeRef.current = { x: t.clientX, y: t.clientY, fx: entry?.focal_x ?? 50, fy: entry?.focal_y ?? 50 };
  };
  const onFrameTouchEnd = (e: React.TouchEvent) => {
    const start = swipeRef.current; swipeRef.current = null;
    if (!start || submissionType !== 'regular' || entries.length < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x, dy = t.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dy) > 40) return;
    // it was a swipe, not a focal drag: put the focal back where it was, then move
    if (focalEditable) {
      setEntries(prev => prev.map((en, i) => i === currentSlide ? { ...en, focal_x: start.fx, focal_y: start.fy } : en));
    }
    if (dx < 0) handleNextSlide(); else handlePrevSlide();
  };

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <PageShell
      // Header — design `.top`: "‹ Dashboard" · italic serif status word · mono days
      header={(
        <>
          <Link href="/dashboard" style={{ font: `500 12px/1 ${SANS}`, color: 'var(--ink2)', textDecoration: 'none', flex: 'none' }}>‹ Dashboard</Link>
          <span style={{ font: `italic 400 15px/1 ${SERIF}`, color: status === 'submitted' && saveStatus === '' ? 'var(--orange)' : 'var(--ink3)', transition: 'color 0.2s' }}>
            {statusWord}
          </span>
          <span style={{ font: `400 12px/1 ${MONO}`, color: 'var(--ink2)', flex: 'none' }}>
            <b style={{ color: 'var(--orange)', fontWeight: 500 }}>{deadlineText}</b>
          </span>
        </>
      )}
      // Footer — design `.foot`: Save (sec) + Submit (pri, glow) · submitted: Withdraw (ghost) + Edit (sec)
      footer={status === 'submitted' ? (
        <>
          <button type="button" onClick={handleWithdraw} style={btnGhost}>Withdraw</button>
          <button type="button" onClick={() => setStatus('draft')} style={{ ...btnSec, flex: 1 }}>Edit</button>
        </>
      ) : (
        <>
          <button type="button" onClick={handleSaveDraft} style={btnSec}>
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : 'Save'}
          </button>
          <button
            type="button"
            disabled={overLimit}
            onClick={() => { if (!overLimit) handleSubmit(); }}
            style={{ ...btnPri, opacity: overLimit ? 0.4 : 1, cursor: overLimit ? 'default' : 'pointer' }}
          >
            Submit
          </button>
        </>
      )}
      columnStyle={{ paddingBottom: 32 }}
    >
      {/* Title — design `.field .in.big`: serif 26, placeholder per the existing label logic */}
      <div style={{ paddingTop: 18 }}>
        <Input
          serif
          value={pageTitle}
          onChange={e => setPageTitle(e.target.value)}
          disabled={readOnly}
          placeholder={titlePlaceholder}
          aria-label={titlePlaceholder}
        />
      </div>

      {/* Format — design `.seg` */}
      <SegmentedToggle
        options={[{ value: 'image', label: 'Image' }, { value: 'text', label: 'Text' }]}
        value={format}
        onChange={v => { if (!readOnly) setFormat(v); }}
        style={{ marginTop: 18 }}
      />

      {/* Mode — design `.choice`, image only */}
      {format === 'image' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <ChoiceCard title="Collection" description="1–8 images, one featured" selected={submissionType === 'regular'} onClick={() => { if (!readOnly) setSubmissionType('regular'); }} />
          <ChoiceCard title="Full spread" description="Single image, full page" selected={submissionType === 'fullSpread'} onClick={() => { if (!readOnly) setSubmissionType('fullSpread'); }} />
        </div>
      )}

      {/* Text body — design `.ta.serif` + `.det` "Reads as poetry · N words" (display-only detect) */}
      {format === 'text' && (
        <>
          <Textarea
            serif
            minHeight={300}
            value={textBody}
            onChange={e => setTextBody(e.target.value)}
            disabled={readOnly}
            placeholder="Write your piece here…"
            aria-label="Piece"
            style={{ marginTop: 18 }}
          />
          <div style={{ paddingTop: 14, font: `400 11px/1 ${MONO}`, color: 'var(--ink3)' }}>
            {textWordCount > 0 && (
              <>Reads as <b style={{ color: 'var(--gold)', fontWeight: 500 }}>{readsAsPoetry(textBody) ? 'poetry' : 'essay'}</b> · </>
            )}
            <span style={{ color: overLimit ? 'var(--orange)' : textWordCount >= TEXT_SUBMISSION_WARN_WORDS ? 'var(--gold)' : undefined }}>
              {textWordCount} / {TEXT_SUBMISSION_MAX_WORDS} words
            </span>
          </div>
        </>
      )}

      {/* Image area — design `.prev` + `.strip` + per-image fields */}
      {format === 'image' && (
        <>
          {/* hidden picker — the existing handleImageChange, opened from the empty frame */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={e => { handleImageChange(entry?.id ?? entries[0].id, e); e.currentTarget.value = ''; }}
            disabled={readOnly}
            style={{ display: 'none' }}
          />

          <div style={{ position: 'relative', marginTop: 18 }} onTouchStart={onFrameTouchStart} onTouchEnd={onFrameTouchEnd}>
            <FocalPointFrame
              src={hasImage ? entry.imageUrl! : undefined}
              alt={entry?.title || 'image'}
              aspect="4:3"
              focalX={entry?.focal_x ?? 50}
              focalY={entry?.focal_y ?? 50}
              onFocalChange={focalEditable ? (x, y) => {
                setEntries(prev => prev.map((en, i) =>
                  i === currentSlide ? { ...en, focal_x: x, focal_y: y } : en
                ));
              } : undefined}
              showFeature={!readOnly && submissionType === 'regular' && !entry.isUploading}
              isFeature={isFeature}
              onToggleFeature={() => handleSetFeature(entry.id)}
              onRemove={!readOnly && !entry.isUploading ? () => handleRemoveImage(entry.id) : undefined}
              emptyLabel="Add an image"
              onEmptyPress={readOnly ? undefined : () => fileInputRef.current?.click()}
            />
            {hasImage && entry.isUploading && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(13,12,10,0.55)', font: `400 11px/1 ${MONO}`, letterSpacing: '0.12em', color: 'var(--ink2)', pointerEvents: 'none' }}>
                uploading…
              </div>
            )}
          </div>

          {/* Thumb strip — collection only; order = order_index (entries are loaded sorted by it) */}
          {submissionType === 'regular' && (
            <ThumbStrip
              items={entries.map(en => ({ id: en.id, src: en.imageUrl ?? undefined, isFeature: en.id === featureEntryId }))}
              currentIndex={currentSlide}
              onSelect={setCurrentSlide}
              onAdd={readOnly ? undefined : handleAddEntry}
              max={MAX_ENTRIES}
              style={{ marginTop: 10, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' } as React.CSSProperties}
            />
          )}

          {/* Per-image title + caption — design `.field .in` */}
          {entry && (
            <div key={`meta-${entry.id}`} style={{ opacity: hasImage ? 1 : 0.4, transition: 'opacity 0.15s' }}>
              <div style={{ paddingTop: 18 }}>
                <Input
                  value={entry.title}
                  onChange={e => setEntries(prev => prev.map((x, i) => i === currentSlide ? { ...x, title: e.target.value } : x))}
                  disabled={readOnly}
                  placeholder={`Image ${currentSlide + 1} title`}
                  aria-label={`Image ${currentSlide + 1} title`}
                />
              </div>
              <div style={{ paddingTop: 8 }}>
                <Input
                  value={entry.caption}
                  onChange={e => setEntries(prev => prev.map((x, i) => i === currentSlide ? { ...x, caption: e.target.value } : x))}
                  disabled={readOnly}
                  placeholder="Add a caption…"
                  aria-label={`Image ${currentSlide + 1} caption`}
                  style={{ fontSize: 14 }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
