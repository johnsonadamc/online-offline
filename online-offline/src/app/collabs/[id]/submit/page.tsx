'use client';
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { getCollabById } from '@/lib/supabase/collabs';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CollabDetails {
  id: string;
  title: string;
  type?: 'chain' | 'theme' | 'narrative';
  description: string;
  prompt_text: string;
  instructions?: string;
  is_private: boolean;
  metadata?: Record<string, unknown>;
  participant_count?: number;
  participation_mode?: 'community' | 'local' | 'private';
  location?: string | null;
}

interface CollabSubmission {
  id?: string;
  collab_id: string;
  contributor_id: string;
  title: string;
  caption: string;
  media_url?: string;
  status: 'draft' | 'submitted' | 'published';
  created_at?: string;
  updated_at?: string;
}

interface TimeLeft { days: number; hours: number; }

type PressState = 'rest' | 'pressing' | 'releasing';

const CAPTION_WARN = 200;

// ── Page wrapper ──────────────────────────────────────────────────────────────

export default function CollabSubmissionPage() {
  return (
    <Suspense fallback={
      <div style={{ height: '100vh', background: 'var(--ground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.14em', color: 'var(--paper-3)' }}>loading…</p>
      </div>
    }>
      <CollabSubmissionContent />
    </Suspense>
  );
}

// ── Content ───────────────────────────────────────────────────────────────────

function CollabSubmissionContent() {
  const router       = useRouter();
  const params       = useParams();
  const supabase     = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── state ────────────────────────────────────────────────────────────────────
  const [loading, setLoading]               = useState(true);
  const [isFullscreen, setIsFullscreen]     = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft]             = useState<TimeLeft>({ days: 0, hours: 0 });
  const [savePress, setSavePress]           = useState<PressState>('rest');
  const [submitPress, setSubmitPress]       = useState<PressState>('rest');
  const [revertPress, setRevertPress]       = useState<PressState>('rest');

  const [collabDetails, setCollabDetails] = useState<CollabDetails>({
    id: params.id as string,
    title: '',
    description: '',
    prompt_text: '',
    is_private: false,
  });

  const [submission, setSubmission] = useState<CollabSubmission>({
    collab_id: params.id as string,
    contributor_id: '',
    title: '',
    caption: '',
    status: 'draft',
  });

  const [mediaFile, setMediaFile]   = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ── fetch data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const collabId = params.id as string;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/auth/signin'); return; }
        setSubmission(prev => ({ ...prev, contributor_id: user.id }));

        const collabResult = await getCollabById(collabId);
        if (!collabResult.success || !collabResult.collab) {
          setError(`Failed to load collaboration details: ${collabResult.error}`);
          return;
        }

        let instructionsText = collabResult.collab.prompt_text || '';
        if (collabResult.collab.metadata?.template_id) {
          const { data: templateData } = await supabase
            .from('collab_templates').select('*').eq('id', collabResult.collab.metadata.template_id).single();
          if (templateData?.instructions) instructionsText = templateData.instructions;
        }

        const { data: periodData } = await supabase.from('periods').select('*').eq('is_active', true).single();
        if (periodData) {
          const pstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
          const pstEndDate = new Date(periodData.end_date);
          pstEndDate.setTime(pstEndDate.getTime() + pstEndDate.getTimezoneOffset() * 60 * 1000);
          const pstEndDateTime = new Date(pstEndDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
          const diff = pstEndDateTime.getTime() - pstNow.getTime();
          setTimeLeft({ days: Math.floor(diff / (1000 * 60 * 60 * 24)), hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) });
        }

        const { count: participantCount } = await supabase
          .from('collab_participants').select('*', { count: 'exact', head: true }).eq('collab_id', collabId).eq('status', 'active');

        setCollabDetails({
          id: collabResult.collab.id,
          title: collabResult.collab.title,
          type: collabResult.collab.type,
          description: collabResult.collab.description || 'Collaborate with other creators on this project.',
          prompt_text: collabResult.collab.prompt_text || '',
          instructions: instructionsText,
          is_private: Boolean(collabResult.collab.is_private),
          metadata: collabResult.collab.metadata,
          participant_count: participantCount || 0,
          participation_mode: (collabResult.collab.metadata?.participation_mode as 'community' | 'local' | 'private') || 'community',
          location: collabResult.collab.metadata?.location as string | null,
        });

        const { data: existingData } = await supabase
          .from('collab_submissions').select('*').eq('collab_id', collabId).eq('contributor_id', user.id)
          .order('created_at', { ascending: false }).limit(1);
        const existing = existingData?.[0];
        if (existing) {
          setSubmission({ id: existing.id, collab_id: existing.collab_id, contributor_id: existing.contributor_id, title: existing.title || '', caption: existing.caption || '', media_url: existing.media_url || '', status: existing.status || 'draft', created_at: existing.created_at, updated_at: existing.updated_at });
          if (existing.media_url) setPreviewUrl(existing.media_url);
        }
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id, router, supabase]);

  // ── blob cleanup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // ── handlers ─────────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSubmission(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (shouldSubmit: boolean) => {
    try {
      const newStatus = shouldSubmit ? 'submitted' : 'draft';
      setSaving(true);
      setSubmitting(shouldSubmit);
      setError(null);
      if (!submission.title.trim()) { setError('Please provide a title for your submission'); setSaving(false); setSubmitting(false); return; }

      const submissionData = { collab_id: submission.collab_id, contributor_id: submission.contributor_id, title: submission.title, caption: submission.caption, media_url: submission.media_url || '', status: newStatus, updated_at: new Date().toISOString() };

      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const filePath = `${submission.collab_id}/${submission.contributor_id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('collab-media').upload(filePath, mediaFile, { cacheControl: '3600', upsert: true });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        const { data: { publicUrl } } = supabase.storage.from('collab-media').getPublicUrl(filePath);
        submissionData.media_url = publicUrl;
      }

      let result;
      if (submission.id) {
        const { error } = await supabase.from('collab_submissions').update({ title: submissionData.title, caption: submissionData.caption, media_url: submissionData.media_url, status: submissionData.status, contributor_id: submissionData.contributor_id, collab_id: submissionData.collab_id, updated_at: submissionData.updated_at }).eq('id', submission.id);
        result = { error, data: null };
      } else {
        const { error, data } = await supabase.from('collab_submissions').insert({ ...submissionData, created_at: new Date().toISOString() }).select();
        result = { error, data };
      }
      if (result.error) throw new Error(`Failed to save: ${result.error.message}`);

      const resultData = result.data || [];
      if (!submission.id && Array.isArray(resultData) && resultData.length > 0 && resultData[0]?.id) {
        setSubmission(prev => ({ ...prev, id: resultData[0].id, status: newStatus, media_url: submissionData.media_url }));
      } else {
        setSubmission(prev => ({ ...prev, status: newStatus, media_url: submissionData.media_url }));
      }

      setSuccessMessage(shouldSubmit ? 'Submission sent!' : 'Draft saved.');
      if (shouldSubmit) setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const handleRevertToEdit = async () => {
    try {
      setSaving(true);
      setError(null);
      const { error } = await supabase.from('collab_submissions').update({ status: 'draft', updated_at: new Date().toISOString() }).eq('id', submission.id);
      if (error) throw new Error(`Failed to revert: ${error.message}`);
      setSubmission(prev => ({ ...prev, status: 'draft' }));
      setSuccessMessage('Reverted to draft.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  // ── press mechanic ───────────────────────────────────────────────────────────
  const releasePress = (setter: React.Dispatch<React.SetStateAction<PressState>>, cb: () => void) => {
    setter('pressing');
    setTimeout(() => { setter('releasing'); cb(); setTimeout(() => setter('rest'), 220); }, 140);
  };

  // ── derived ──────────────────────────────────────────────────────────────────
  const hasImage  = !!(previewUrl || submission.media_url);
  const promptText = collabDetails.instructions || collabDetails.prompt_text;

  const statusPillText = saving
    ? (submitting ? 'submitting…' : 'saving…')
    : successMessage && submission.status !== 'submitted'
      ? 'saved'
      : submission.status === 'submitted' ? 'submitted' : 'draft';

  const statusPillColor = statusPillText === 'submitted'
    ? 'var(--neon-accent)'
    : statusPillText === 'saved'
      ? 'var(--neon-green)'
      : 'var(--paper-4)';

  const statusPillGlow = statusPillText === 'submitted'
    ? '0 0 8px var(--glow-accent)'
    : statusPillText === 'saved'
      ? '0 0 8px var(--glow-green)'
      : 'none';

  const modeStyle = (() => {
    switch (collabDetails.participation_mode) {
      case 'community': return { color: 'var(--neon-blue)',   bg: 'rgba(90,159,212,0.08)',  border: 'rgba(90,159,212,0.3)',  shadow: '0 0 6px var(--glow-blue)'   };
      case 'local':     return { color: 'var(--neon-green)',  bg: 'rgba(78,196,122,0.08)',  border: 'rgba(78,196,122,0.3)',  shadow: '0 0 6px var(--glow-green)'  };
      case 'private':   return { color: 'var(--neon-purple)', bg: 'rgba(168,136,232,0.08)', border: 'rgba(168,136,232,0.3)', shadow: '0 0 6px var(--glow-purple)' };
      default:          return { color: 'var(--paper-4)',     bg: 'transparent',            border: 'var(--rule-mid)',       shadow: 'none'                       };
    }
  })();

  const modeLabel = collabDetails.participation_mode === 'local' && collabDetails.location
    ? `Local · ${collabDetails.location}`
    : collabDetails.participation_mode
      ? collabDetails.participation_mode.charAt(0).toUpperCase() + collabDetails.participation_mode.slice(1)
      : '';

  const deadlineText = timeLeft.days > 0
    ? `${timeLeft.days}d`
    : timeLeft.hours > 0 ? `${timeLeft.hours}h` : 'closing';

  // ── loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ height: '100vh', background: 'var(--ground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.14em', color: 'var(--paper-3)' }}>loading…</p>
      </div>
    );
  }

  // ── viewer style ─────────────────────────────────────────────────────────────
  const viewerStyle: React.CSSProperties = isFullscreen
    ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, background: 'var(--ground)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 0, overflow: 'hidden' }
    : { width: '100%', aspectRatio: '4/3', background: 'var(--ground-3)', border: '1px solid var(--rule-mid)', borderRadius: 2, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' };

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', background: 'var(--ground)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 390, height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{
          padding: '20px 22px 0', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--ground)',
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
            <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 11, color: statusPillColor, textShadow: statusPillGlow, transition: 'color 0.2s' }}>
              {statusPillText}
            </span>
            {modeLabel && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2,
                color: modeStyle.color, background: modeStyle.bg,
                border: `1px solid ${modeStyle.border}`, textShadow: modeStyle.shadow,
              }}>
                {modeLabel}
              </span>
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', color: 'var(--neon-accent)', textShadow: '0 0 6px var(--glow-accent)' }}>
              {deadlineText}
            </span>
          </div>
        </div>

        {/* Thick rule */}
        <div style={{ height: 1, margin: '11px 22px 0', background: 'var(--paper)', opacity: 0.8, boxShadow: '0 0 6px 1px rgba(240,235,226,0.25), 0 0 20px rgba(240,235,226,0.08)', flexShrink: 0 }} />

        {/* ── Scroll body ── */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 } as React.CSSProperties}>

          {/* Collab identity */}
          <div style={{ padding: '16px 22px 0' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--paper)', opacity: 0.9, lineHeight: 1.15, marginBottom: 5 }}>
              {collabDetails.title}
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--paper-3)', lineHeight: 1.5 }}>
              {collabDetails.description}
            </div>
          </div>

          {/* Prompt strip */}
          {promptText && (
            <div style={{
              margin: '14px 22px 0', padding: '10px 12px',
              borderLeft: '2px solid var(--neon-amber)',
              boxShadow: '-3px 0 10px -2px var(--glow-amber)',
              background: 'rgba(224,168,48,0.04)',
              borderRadius: '0 2px 2px 0',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--neon-amber)', textShadow: '0 0 6px var(--glow-amber)' }}>
                Prompt
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--paper-2)', lineHeight: 1.45 }}>
                {promptText}
              </div>
            </div>
          )}

          {/* Section rule */}
          <div style={{ height: 1, margin: '14px 22px 0', background: 'var(--rule-mid)' }} />

          {/* Image area */}
          <div style={{ margin: '14px 22px 0' }}>
            <div style={viewerStyle}>
              {hasImage ? (
                <>
                  <img
                    src={previewUrl || submission.media_url || ''}
                    alt={submission.title || 'submission'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* gradient overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,14,11,0.65) 0%, transparent 50%)', pointerEvents: 'none' }} />

                  {/* remove — draft only */}
                  {submission.status === 'draft' && (
                    <button
                      onClick={() => { setPreviewUrl(null); setMediaFile(null); setSubmission(prev => ({ ...prev, media_url: '' })); }}
                      style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, background: 'rgba(15,14,11,0.7)', border: '1px solid var(--rule-mid)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--paper-3)', zIndex: 2 }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}

                  {/* fullscreen toggle — always shown with image */}
                  <button
                    onClick={() => setIsFullscreen(f => !f)}
                    style={{ position: 'absolute', bottom: 8, right: 8, width: 26, height: 26, background: 'rgba(15,14,11,0.7)', border: '1px solid var(--rule-mid)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--paper-4)', zIndex: 2 }}
                  >
                    {isFullscreen ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="4,14 10,14 10,20" /><polyline points="20,10 14,10 14,4" />
                        <line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" />
                      </svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15,3 21,3 21,9" /><polyline points="9,21 3,21 3,15" />
                        <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    )}
                  </button>
                </>
              ) : (
                /* Upload zone */
                <div
                  onClick={submission.status !== 'submitted' ? triggerFileInput : undefined}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', height: '100%', cursor: submission.status === 'submitted' ? 'default' : 'pointer' }}
                >
                  <div style={{ width: 40, height: 40, border: '1px solid var(--rule-mid)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ground-4)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--paper-4)" strokeWidth="1.5">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper-4)' }}>Add image</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--paper-5)', fontWeight: 300 }}>tap to upload</div>
                </div>
              )}
            </div>
          </div>

          {/* Per-image metadata */}
          <div style={{ margin: '14px 22px 0', opacity: hasImage ? 1 : 0.4, transition: 'opacity 0.15s' }}>
            <input
              name="title"
              value={submission.title}
              onChange={handleInputChange}
              disabled={submission.status === 'submitted'}
              placeholder="Image title"
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--paper-2)',
                lineHeight: 1.2, caretColor: 'var(--neon-accent)',
              }}
            />
            <div style={{ height: 1, background: 'var(--rule)', margin: '8px 0' }} />
            <div style={{ position: 'relative' }}>
              <textarea
                name="caption"
                value={submission.caption}
                onChange={handleInputChange}
                disabled={submission.status === 'submitted'}
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
                color: submission.caption.length > CAPTION_WARN ? 'var(--neon-accent)' : 'var(--paper-5)',
                textShadow: submission.caption.length > CAPTION_WARN ? '0 0 4px var(--glow-accent)' : 'none',
                pointerEvents: 'none', transition: 'color 0.15s',
              }}>
                {submission.caption.length}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ margin: '10px 22px 0', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', color: '#ef4444' }}>
              {error}
            </div>
          )}

        </div>{/* end scroll-body */}

        {/* ── Action bar ── */}
        <div style={{
          flexShrink: 0, zIndex: 20,
          padding: '12px 22px 28px',
          background: 'var(--ground)', borderTop: '1px solid var(--rule)',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          {submission.status === 'submitted' ? (
            /* Revert button */
            <button
              onPointerDown={() => setRevertPress('pressing')}
              onPointerUp={() => releasePress(setRevertPress, handleRevertToEdit)}
              onPointerLeave={() => revertPress === 'pressing' && releasePress(setRevertPress, handleRevertToEdit)}
              style={{
                flex: 1,
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 16px',
                background: revertPress === 'pressing' ? 'rgba(224,168,48,0.1)' : 'rgba(224,168,48,0.06)',
                border: '1px solid rgba(224,168,48,0.25)',
                color: 'var(--neon-amber)', textShadow: '0 0 6px var(--glow-amber)',
                borderBottomWidth: 2, borderBottomColor: 'rgba(224,168,48,0.4)',
                boxShadow: '0 2px 0 rgba(224,168,48,0.2), 0 3px 6px rgba(0,0,0,0.4)',
                transform: revertPress === 'pressing' ? 'translateY(2px)' : 'none',
                transition: revertPress === 'releasing' ? 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)' : 'transform 0.06s ease',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="1,4 1,10 7,10" /><path d="M3.51,15a9,9,0,1,0,.49-4.5" />
              </svg>
              Revert to draft
            </button>
          ) : (
            <>
              {/* Save */}
              <button
                onPointerDown={() => setSavePress('pressing')}
                onPointerUp={() => releasePress(setSavePress, () => handleSubmit(false))}
                onPointerLeave={() => savePress === 'pressing' && releasePress(setSavePress, () => handleSubmit(false))}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                  textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 16px',
                  background: savePress === 'pressing' ? 'var(--ground-4)' : 'var(--ground-3)',
                  border: '1px solid var(--rule-mid)',
                  color: 'var(--paper-3)',
                  borderBottomWidth: 2, borderBottomColor: 'var(--ground-4)',
                  boxShadow: '0 2px 0 var(--ground-4), 0 3px 6px rgba(0,0,0,0.4)',
                  transform: savePress === 'pressing' ? 'translateY(2px)' : 'none',
                  transition: savePress === 'releasing' ? 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)' : 'transform 0.06s ease',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17,21 17,13 7,13 7,21" /><polyline points="7,3 7,8 15,8" />
                </svg>
                {saving && !submitting ? 'Saving…' : 'Save'}
              </button>

              {/* Submit */}
              <button
                onPointerDown={() => setSubmitPress('pressing')}
                onPointerUp={() => releasePress(setSubmitPress, () => handleSubmit(true))}
                onPointerLeave={() => submitPress === 'pressing' && releasePress(setSubmitPress, () => handleSubmit(true))}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                  textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 16px',
                  background: submitPress === 'pressing' ? 'rgba(224,90,40,0.16)' : 'rgba(224,90,40,0.1)',
                  border: '1px solid rgba(224,90,40,0.35)',
                  color: 'var(--neon-accent)', textShadow: '0 0 6px var(--glow-accent)',
                  borderBottomWidth: 2, borderBottomColor: 'rgba(224,90,40,0.5)',
                  boxShadow: '0 2px 0 rgba(224,90,40,0.3), 0 3px 6px rgba(0,0,0,0.4)',
                  transform: submitPress === 'pressing' ? 'translateY(2px)' : 'none',
                  transition: submitPress === 'releasing' ? 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)' : 'transform 0.06s ease',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit'}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={submission.status === 'submitted'}
          style={{ display: 'none' }}
        />

      </div>
    </div>
  );
}
