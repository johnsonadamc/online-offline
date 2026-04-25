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

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateUniqueId = (): string =>
  `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const MAX_ENTRIES = 8;

const themes = [
  'Photography', 'Music', 'Art', 'Family', 'Nature', 'Travel', 'Food', 'Sports',
  'Architecture', 'Fashion', 'Technology', 'Literature', 'Dance', 'Film',
  'Street Life', 'Wildlife', 'Abstract', 'Portrait', 'Landscape', 'Urban',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubmissionForm() {
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');

  // ── core state ───────────────────────────────────────────────────────────────
  const [submissionType, setSubmissionType] = useState<'regular' | 'fullSpread'>('regular');
  const [status, setStatus]               = useState<'draft' | 'submitted'>('draft');
  const [saveStatus, setSaveStatus]       = useState<'saving' | 'saved' | 'error' | ''>('');
  const [timeLeft, setTimeLeft]           = useState({ days: 0, hours: 0 });
  const [currentPeriod, setCurrentPeriod] = useState({ quarter: '', season: '' });
  const [pageTitle, setPageTitle]         = useState('');
  const [entries, setEntries]             = useState<Entry[]>([{
    id: generateUniqueId(),
    title: '', caption: '', selectedTags: [],
    imageUrl: null, isFeature: false, isFullSpread: false,
  }]);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [currentSlide, setCurrentSlide]         = useState(0);
  const [showImageControls, setShowImageControls] = useState(false);
  const [showTagsPanel, setShowTagsPanel]         = useState(false);
  const [savePress, setSavePress]                 = useState<PressState>('rest');
  const [submitPress, setSubmitPress]             = useState<PressState>('rest');

  // ── blob cleanup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const blobUrls = entries
      .filter(e => e.imageUrl?.startsWith('blob:'))
      .map(e => e.imageUrl as string);
    return () => { blobUrls.forEach(u => URL.revokeObjectURL(u)); };
  }, [entries]);

  // ── load draft ───────────────────────────────────────────────────────────────
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
          setEntries(data.content_entries.map((entry: ContentEntry) => ({
            id: entry.id,
            title: entry.title || '',
            caption: entry.caption || '',
            selectedTags: entry.content_tags?.map((t: ContentTag) => t.tag) || [],
            imageUrl: entry.media_url,
            isFeature: entry.is_feature || false,
            isFullSpread: entry.is_full_spread || false,
            fileType: 'stored',
          })));
          setCurrentSlide(0);
        }
      } catch (err) { console.error('Unexpected error loading draft:', err); }
    };
    loadDraft();
  }, [draftId, supabase]);

  // ── load period ──────────────────────────────────────────────────────────────
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
        setCurrentPeriod({ quarter: `${period.season} ${period.year}`, season: period.season.toLowerCase() });
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
      setEntries(prev => [...prev.map(en =>
        en.id === entryId ? { ...en, permanentUrl: url, isUploading: false } : en
      )]);
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Error uploading image. Please try again.');
      setEntries(prev => prev.map(en =>
        en.id === entryId ? { ...en, imageUrl: null, permanentUrl: null, isUploading: false, fileType: null } : en
      ));
    }
  };

  // ── remove image / entry ─────────────────────────────────────────────────────
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
  };

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
        alert('Error saving draft: ' + (result.error || 'Unknown error'));
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
      else alert('Error submitting content: ' + (result.error || 'Unknown error'));
    } catch (err) {
      console.error('Unexpected error submitting:', err);
      alert('Error submitting content');
    }
  };

  // ── navigation ───────────────────────────────────────────────────────────────
  const handlePrevSlide = () => { if (currentSlide > 0) setCurrentSlide(s => s - 1); };
  const handleNextSlide = () => { if (currentSlide < entries.length - 1) setCurrentSlide(s => s + 1); };

  const handleAddEntry = useCallback(() => {
    if (entries.length >= MAX_ENTRIES) { alert(`Maximum ${MAX_ENTRIES} images per submission.`); return; }
    setEntries(prev => [...prev, { id: generateUniqueId(), title: '', caption: '', selectedTags: [], imageUrl: null, isFeature: false, isFullSpread: false }]);
    setCurrentSlide(entries.length);
  }, [entries]);

  // ── press mechanic ───────────────────────────────────────────────────────────
  const releasePress = (setter: React.Dispatch<React.SetStateAction<PressState>>, cb: () => void) => {
    setter('pressing');
    setTimeout(() => { setter('releasing'); cb(); setTimeout(() => setter('rest'), 220); }, 140);
  };

  const pressStyle = (state: PressState, amber = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    color: amber ? 'var(--neon-amber)' : 'var(--paper-3)',
    textShadow: amber ? '0 0 8px var(--glow-amber)' : 'none',
    padding: '10px 22px', borderRadius: 2, cursor: 'pointer', border: 'none',
    background: state === 'pressing'
      ? (amber ? 'rgba(224,168,48,0.22)' : 'rgba(224,90,40,0.2)')
      : (amber ? 'rgba(224,168,48,0.08)' : 'rgba(224,90,40,0.06)'),
    borderTop: `1px solid ${state !== 'rest' ? (amber ? 'rgba(224,168,48,0.5)' : 'rgba(224,90,40,0.5)') : (amber ? 'rgba(224,168,48,0.18)' : 'rgba(224,90,40,0.15)')}`,
    borderLeft: `1px solid ${state !== 'rest' ? (amber ? 'rgba(224,168,48,0.5)' : 'rgba(224,90,40,0.5)') : (amber ? 'rgba(224,168,48,0.18)' : 'rgba(224,90,40,0.15)')}`,
    borderRight: `1px solid ${state !== 'rest' ? (amber ? 'rgba(224,168,48,0.5)' : 'rgba(224,90,40,0.5)') : (amber ? 'rgba(224,168,48,0.18)' : 'rgba(224,90,40,0.15)')}`,
    borderBottom: `3px solid ${state === 'pressing' ? 'transparent' : (amber ? 'rgba(224,168,48,0.35)' : 'rgba(224,90,40,0.3)')}`,
    transform: state === 'pressing' ? 'translateY(2px)' : 'translateY(0)',
    transition: state === 'releasing' ? 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), background 0.12s' : 'transform 0.06s ease, background 0.08s',
    boxShadow: amber && state !== 'rest' ? '0 0 14px rgba(224,168,48,0.25)' : 'none',
  });

  const entry = entries[currentSlide] ?? entries[0];

  return (
    <div style={{ background: 'var(--lt-bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* ── Header ── */}
        <div style={{ flexShrink: 0, padding: '20px 20px 0', position: 'sticky', top: 0, zIndex: 20, background: 'var(--lt-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--lt-text-3)', textDecoration: 'none' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6" /></svg>
              Dashboard
            </Link>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.04em', color: 'var(--lt-text-2)' }}>
              online<span style={{ color: 'rgba(235,225,205,0.28)', margin: '0 1px' }}>//</span>offline
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--neon-amber)', textShadow: '0 0 8px var(--glow-amber)' }}>
              {entries.length}/{MAX_ENTRIES}
            </div>
          </div>
          <div style={{ height: 1, background: 'var(--lt-text)', opacity: 0.6, boxShadow: '0 0 6px 1px rgba(235,225,205,0.2)', marginBottom: 10 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--lt-text-2)' }}>
                {currentPeriod.quarter || '—'}
              </span>
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: status === 'submitted' ? 'var(--neon-green)' : 'var(--neon-amber)', boxShadow: status === 'submitted' ? '0 0 6px var(--glow-green)' : '0 0 6px var(--glow-amber)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--lt-text-3)', letterSpacing: '0.06em' }}>
                {status === 'submitted' ? 'Submitted' : 'Draft'} · {timeLeft.days}d {timeLeft.hours}h left
              </span>
            </div>
            {/* Submission type toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--lt-rule)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
              {(['regular', 'fullSpread'] as const).map(t => (
                <button key={t} onClick={() => status !== 'submitted' && setSubmissionType(t)} style={{ padding: '4px 9px', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.10em', textTransform: 'uppercase', border: 'none', cursor: status === 'submitted' ? 'default' : 'pointer', background: submissionType === t ? 'rgba(224,168,48,0.12)' : 'transparent', color: submissionType === t ? 'var(--neon-amber)' : 'var(--lt-text-3)', textShadow: submissionType === t ? '0 0 6px var(--glow-amber)' : 'none', transition: 'background 0.15s, color 0.15s' }}>
                  {t === 'regular' ? 'Regular' : 'Spread'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Image tabs ── */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', padding: '4px 20px 10px', scrollbarWidth: 'none' } as React.CSSProperties}>
          {entries.map((en, i) => (
            <button key={`tab-${en.id}`} onClick={() => setCurrentSlide(i)} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${i === currentSlide ? 'var(--neon-amber)' : 'var(--lt-rule)'}`, boxShadow: i === currentSlide ? '0 0 8px var(--glow-amber)' : 'none', overflow: 'hidden', cursor: 'pointer', background: 'var(--lt-card)', padding: 0, position: 'relative', transition: 'border-color 0.15s, box-shadow 0.15s' }}>
              {en.imageUrl
                ? <img src={en.imageUrl} alt={`${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: i === currentSlide ? 'var(--neon-amber)' : 'var(--lt-text-3)' }}>{i + 1}</span>
              }
            </button>
          ))}
          {status === 'draft' && entries.length < MAX_ENTRIES && (
            <button onClick={handleAddEntry} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', border: '1px dashed var(--lt-rule)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="var(--lt-text-3)" strokeWidth="1.5" strokeLinecap="round" /><line x1="1" y1="6" x2="11" y2="6" stroke="var(--lt-text-3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          )}
        </div>

        {/* ── Scroll area ── */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 88 } as React.CSSProperties}>

          {/* Image viewer */}
          <div style={{ margin: '0 20px', height: 260, borderRadius: 2, background: 'rgba(0,0,0,0.35)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {entry?.imageUrl ? (
              <>
                <img src={entry.imageUrl} alt={entry.title || 'upload'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                {status === 'draft' && (
                  <button onClick={() => handleRemoveImage(entry.id)} disabled={entry.isUploading} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(235,225,205,0.18)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="1" y1="1" x2="9" y2="9" stroke="var(--lt-text-2)" strokeWidth="1.5" strokeLinecap="round" /><line x1="9" y1="1" x2="1" y2="9" stroke="var(--lt-text-2)" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </button>
                )}
                {entry.isUploading && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
                    <div style={{ width: 28, height: 28, border: '2px solid var(--neon-amber)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                )}
              </>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: status === 'submitted' ? 'default' : 'pointer' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--neon-amber)" strokeWidth="1.5" style={{ opacity: 0.7 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--neon-amber)', textShadow: '0 0 8px var(--glow-amber)' }}>Upload image</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--lt-text-3)', letterSpacing: '0.06em' }}>JPG · PNG · WebP · up to 10MB</span>
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={e => handleImageChange(entry?.id ?? entries[0].id, e)} disabled={status === 'submitted'} style={{ display: 'none' }} />
              </label>
            )}
            {/* Prev/Next arrows */}
            {entries.length > 1 && currentSlide > 0 && (
              <button onClick={handlePrevSlide} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(235,225,205,0.14)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--lt-text-2)" strokeWidth="2"><polyline points="15,18 9,12 15,6" /></svg>
              </button>
            )}
            {entries.length > 1 && currentSlide < entries.length - 1 && (
              <button onClick={handleNextSlide} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(235,225,205,0.14)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--lt-text-2)" strokeWidth="2"><polyline points="9,18 15,12 9,6" /></svg>
              </button>
            )}
          </div>

          {/* Collection title */}
          <div style={{ padding: '14px 20px 0' }}>
            <input value={pageTitle} onChange={e => setPageTitle(e.target.value)} disabled={status === 'submitted'} placeholder="Collection title (optional)" style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--lt-rule)', color: 'var(--lt-text-2)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, padding: '4px 0 7px', outline: 'none', caretColor: 'var(--neon-amber)' }} />
          </div>

          {/* Per-entry detail panels */}
          {entries.map((en, index) => (
            <div key={`detail-${en.id}`} style={{ display: currentSlide === index ? 'block' : 'none' }}>

              {/* Title + caption */}
              <div style={{ padding: '14px 20px 0' }}>
                <input value={en.title} onChange={e => setEntries(prev => prev.map((x, i) => i === index ? { ...x, title: e.target.value } : x))} disabled={status === 'submitted'} placeholder="Image title" style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--lt-rule)', color: 'var(--lt-text)', fontFamily: 'var(--font-serif)', fontSize: 20, padding: '4px 0 8px', outline: 'none', caretColor: 'var(--neon-amber)', marginBottom: 12 }} />
                <textarea value={en.caption} onChange={e => setEntries(prev => prev.map((x, i) => i === index ? { ...x, caption: e.target.value } : x))} disabled={status === 'submitted'} placeholder="Caption" rows={2} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--lt-rule)', color: 'var(--lt-text-2)', fontFamily: 'var(--font-sans)', fontSize: 14, padding: '4px 0 8px', outline: 'none', resize: 'none', caretColor: 'var(--neon-amber)' }} />
              </div>

              {/* Image options (collapsible) */}
              <div style={{ borderTop: '1px solid var(--lt-rule)', margin: '12px 0 0' }}>
                <button onClick={() => setShowImageControls(s => !s)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lt-text-3)' }}>Image options</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {en.isFeature && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--neon-amber)', textShadow: '0 0 6px var(--glow-amber)' }}>Feature</span>}
                    {en.isFullSpread && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--neon-purple)', textShadow: '0 0 6px var(--glow-purple)' }}>Full Spread</span>}
                    <svg style={{ width: 8, height: 8, transition: 'transform 0.18s', transform: showImageControls ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--lt-text-3)' }} viewBox="0 0 6 10" fill="none"><polyline points="1,1 5,5 1,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </button>
                {showImageControls && en.imageUrl && status === 'draft' && (
                  <div style={{ padding: '0 20px 14px', display: 'flex', gap: 8 }}>
                    {/* Feature toggle */}
                    <button onClick={() => setEntries(prev => prev.map((x, i) => i === index ? { ...x, isFeature: !x.isFeature } : (x.isFeature && !en.isFeature ? { ...x, isFeature: false } : x)))} style={{ flex: 1, padding: '8px 0', borderRadius: 2, border: `1px solid ${en.isFeature ? 'rgba(224,168,48,0.4)' : 'var(--lt-card-bdr)'}`, background: en.isFeature ? 'rgba(224,168,48,0.1)' : 'var(--lt-card)', color: en.isFeature ? 'var(--neon-amber)' : 'var(--lt-text-3)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', cursor: 'pointer', textShadow: en.isFeature ? '0 0 6px var(--glow-amber)' : 'none', transition: 'background 0.15s, border-color 0.15s' }}>Feature</button>
                    {/* Full spread toggle */}
                    <button onClick={() => setEntries(prev => prev.map((x, i) => i === index ? { ...x, isFullSpread: !x.isFullSpread } : x))} disabled={!en.isFeature} style={{ flex: 1, padding: '8px 0', borderRadius: 2, border: `1px solid ${en.isFullSpread ? 'rgba(168,136,232,0.4)' : 'var(--lt-card-bdr)'}`, background: en.isFullSpread ? 'rgba(168,136,232,0.1)' : 'var(--lt-card)', color: en.isFullSpread ? 'var(--neon-purple)' : 'var(--lt-text-3)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', cursor: en.isFeature ? 'pointer' : 'default', opacity: en.isFeature ? 1 : 0.4, textShadow: en.isFullSpread ? '0 0 6px var(--glow-purple)' : 'none', transition: 'background 0.15s, border-color 0.15s' }}>Full Spread</button>
                  </div>
                )}
              </div>

              {/* Tags (collapsible) */}
              <div style={{ borderTop: '1px solid var(--lt-rule)' }}>
                <button onClick={() => setShowTagsPanel(s => !s)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lt-text-3)' }}>Themes</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {en.selectedTags.length > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--neon-amber)', textShadow: '0 0 6px var(--glow-amber)' }}>{en.selectedTags.length}</span>}
                    <svg style={{ width: 8, height: 8, transition: 'transform 0.18s', transform: showTagsPanel ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--lt-text-3)' }} viewBox="0 0 6 10" fill="none"><polyline points="1,1 5,5 1,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </button>
                {showTagsPanel && (
                  <div style={{ padding: '0 20px 16px' }}>
                    {en.selectedTags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        {en.selectedTags.map(tag => (
                          <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 2, background: 'rgba(224,168,48,0.1)', border: '1px solid rgba(224,168,48,0.3)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--neon-amber)', textShadow: '0 0 6px var(--glow-amber)', letterSpacing: '0.06em' }}>
                            {tag}
                            {status === 'draft' && (
                              <button onClick={e => { e.stopPropagation(); setEntries(prev => prev.map((x, i) => i === index ? { ...x, selectedTags: x.selectedTags.filter(t => t !== tag) } : x)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'var(--neon-amber)' }}>
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><line x1="1" y1="1" x2="7" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><line x1="7" y1="1" x2="1" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {status === 'draft' && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {themes.map(tag => {
                          const sel = en.selectedTags.includes(tag);
                          return (
                            <button key={tag} onClick={() => setEntries(prev => prev.map((x, i) => { if (i !== index) return x; const st = x.selectedTags.includes(tag) ? x.selectedTags.filter(t => t !== tag) : [...x.selectedTags, tag]; return { ...x, selectedTags: st }; }))} style={{ padding: '4px 9px', borderRadius: 2, border: `1px solid ${sel ? 'rgba(224,168,48,0.35)' : 'var(--lt-card-bdr)'}`, background: sel ? 'rgba(224,168,48,0.1)' : 'var(--lt-card)', color: sel ? 'var(--neon-amber)' : 'var(--lt-text-3)', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.06em', cursor: 'pointer', textShadow: sel ? '0 0 5px var(--glow-amber)' : 'none', transition: 'background 0.12s, border-color 0.12s' }}>
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>

        {/* ── Action bar ── */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 390, maxWidth: '100vw', padding: '12px 20px', background: 'rgba(15,14,11,0.96)', borderTop: '1px solid var(--lt-rule)', display: 'flex', gap: 10, zIndex: 100, backdropFilter: 'blur(8px)' } as React.CSSProperties}>
          {status === 'submitted' ? (
            <>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--neon-green)', textShadow: '0 0 8px var(--glow-green)' }}>✓ Submitted</span>
              </div>
              <button onPointerDown={() => setSubmitPress('pressing')} onPointerUp={() => releasePress(setSubmitPress, () => setStatus('draft'))} onPointerLeave={() => submitPress === 'pressing' && releasePress(setSubmitPress, () => setStatus('draft'))} style={pressStyle(submitPress, true)}>
                Revert to Draft
              </button>
            </>
          ) : (
            <>
              <button onPointerDown={() => setSavePress('pressing')} onPointerUp={() => releasePress(setSavePress, handleSaveDraft)} onPointerLeave={() => savePress === 'pressing' && releasePress(setSavePress, handleSaveDraft)} style={{ ...pressStyle(savePress, false), flex: 1 }}>
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'error' ? 'Error' : 'Save Draft'}
              </button>
              <button onPointerDown={() => setSubmitPress('pressing')} onPointerUp={() => releasePress(setSubmitPress, handleSubmit)} onPointerLeave={() => submitPress === 'pressing' && releasePress(setSubmitPress, handleSubmit)} style={{ ...pressStyle(submitPress, true), flex: 1 }}>
                Submit
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
