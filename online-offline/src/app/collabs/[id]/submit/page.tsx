'use client';
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { getCollabById } from '@/lib/supabase/collabs';
import { PageShell, TypeTile, Brief, FocalPointFrame, Input, Toast, typeAccent, accentVar, SERIF, SANS, MONO } from '@/components/v2';
import type { CollabMode } from '@/components/v2';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CollabDetails {
  id: string;
  title: string;
  type?: 'chain' | 'theme' | 'narrative';
  description: string;
  prompt_text: string;
  instructions?: string;
  template_id?: string | null;
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

// ── Page wrapper ──────────────────────────────────────────────────────────────

export default function CollabSubmissionPage() {
  return (
    <Suspense fallback={
      <PageShell align="center">
        <p style={{ margin: 0, textAlign: 'center', font: `400 12px/1 ${MONO}`, letterSpacing: '0.14em', color: 'var(--ink3)' }}>loading…</p>
      </PageShell>
    }>
      <CollabSubmissionContent />
    </Suspense>
  );
}

// ── Content ───────────────────────────────────────────────────────────────────

function CollabSubmissionContent() {
  const router       = useRouter();
  const params       = useParams();
  const supabase     = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── state ────────────────────────────────────────────────────────────────────
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft]             = useState<TimeLeft>({ days: 0, hours: 0 });
  // Crosshair position for the 1:1 frame — display-only: collab_submissions has no focal columns
  const [focal, setFocal]                   = useState({ x: 50, y: 50 });

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

        const collabResult = await getCollabById(supabase, collabId);
        if (!collabResult.success || !collabResult.collab) {
          setError(`Failed to load collaboration details: ${collabResult.error}`);
          return;
        }

        let instructionsText = collabResult.collab.prompt_text || '';
        const templateId = collabResult.collab.template_id || (collabResult.collab.metadata?.template_id as string | undefined);
        if (templateId) {
          const { data: templateData } = await supabase
            .from('collab_templates').select('instructions').eq('id', templateId).maybeSingle();
          if (templateData?.instructions) instructionsText = templateData.instructions;
        }
        if (!instructionsText) {
          instructionsText = collabResult.collab.description || '';
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
          template_id: collabResult.collab.template_id || null,
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

  // ── derived ──────────────────────────────────────────────────────────────────
  const hasImage  = !!(previewUrl || submission.media_url);
  const promptText = collabDetails.instructions || collabDetails.prompt_text;

  const statusPillText = saving
    ? (submitting ? 'submitting…' : 'saving…')
    : successMessage && submission.status !== 'submitted'
      ? 'saved'
      : submission.status === 'submitted' ? 'submitted' : 'draft';

  const mode: CollabMode = collabDetails.participation_mode ?? 'community';
  const modeAccent = typeAccent[mode];
  const isSubmitted = submission.status === 'submitted';

  const deadlineText = timeLeft.days > 0
    ? `${timeLeft.days}d`
    : timeLeft.hours > 0 ? `${timeLeft.hours}h` : 'closing';


  // ── loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageShell align="center">
        <p style={{ margin: 0, textAlign: 'center', font: `400 12px/1 ${MONO}`, letterSpacing: '0.14em', color: 'var(--ink3)' }}>loading…</p>
      </PageShell>
    );
  }

  // ── v2 footer buttons (design `.btn`) ────────────────────────────────────────
  const btnBase: React.CSSProperties = {
    font: `500 12px/1 ${SANS}`, letterSpacing: '0.14em', textTransform: 'uppercase',
    padding: '15px 18px', borderRadius: 5, textAlign: 'center', flex: 'none', whiteSpace: 'nowrap',
    cursor: 'pointer', background: 'transparent', borderWidth: 0, WebkitTapHighlightColor: 'transparent',
  };
  const btnSec: React.CSSProperties = { ...btnBase, color: 'var(--ink2)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)' };
  const btnPri: React.CSSProperties = {
    ...btnBase, flex: 1, color: '#0d0c0a', background: accentVar(modeAccent),
    boxShadow: `0 0 28px color-mix(in oklch, ${accentVar(modeAccent)} 35%, transparent)`,
  };

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <PageShell
      // Header like /submit — "‹ Dashboard" · italic status word · mono days
      header={(
        <>
          <Link href="/dashboard" style={{ font: `500 12px/1 ${SANS}`, color: 'var(--ink2)', textDecoration: 'none', flex: 'none' }}>‹ Dashboard</Link>
          <span style={{ font: `italic 400 15px/1 ${SERIF}`, color: statusPillText === 'submitted' ? 'var(--orange)' : 'var(--ink3)', transition: 'color 0.2s' }}>
            {statusPillText}
          </span>
          <span style={{ font: `400 12px/1 ${MONO}`, color: 'var(--ink2)', flex: 'none' }}>
            <b style={{ color: 'var(--orange)', fontWeight: 500 }}>{deadlineText}</b>
          </span>
        </>
      )}
      // Footer — Save → handleSubmit(false) · Submit → handleSubmit(true) (glow in the mode color)
      // Submitted: gold-outlined "Revert to draft" → handleRevertToEdit + disabled Submit
      footer={isSubmitted ? (
        <>
          <button type="button" onClick={handleRevertToEdit} disabled={saving} style={{ ...btnSec, color: 'var(--gold)', borderColor: 'var(--gold)', opacity: saving ? 0.4 : 1 }}>
            {saving ? 'Reverting…' : 'Revert to draft'}
          </button>
          <button type="button" disabled style={{ ...btnPri, opacity: 0.4, cursor: 'default' }}>Submit</button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => handleSubmit(false)} disabled={saving} style={{ ...btnSec, opacity: saving ? 0.4 : 1 }}>
            {saving && !submitting ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => handleSubmit(true)} disabled={saving} style={{ ...btnPri, opacity: saving ? 0.4 : 1 }}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </>
      )}
      columnStyle={{ paddingBottom: 32 }}
    >
      <Toast open={!!successMessage} message={successMessage} accent="green" onClose={() => setSuccessMessage(null)} />
      <Toast open={!!error} message={error} accent="orange" duration={0} onClose={() => setError(null)} />

      {/* Hero — mode tile + serif 26 title + mono city if local */}
      <div style={{ paddingTop: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
        <TypeTile type={mode} />
        <h2 style={{ margin: 0, flex: 1, minWidth: 0, font: `400 26px/1.1 ${SERIF}`, color: 'var(--ink)' }}>{collabDetails.title}</h2>
        {mode === 'local' && collabDetails.location && (
          <span style={{ font: `400 12px/1 ${MONO}`, color: 'var(--ink3)', flex: 'none' }}>{collabDetails.location}</span>
        )}
      </div>

      {/* Brief — gold PROMPT label, serif body from instructions || prompt_text, collapsible */}
      {promptText && (
        <Brief style={{ marginTop: 18 }}>{promptText}</Brief>
      )}

      {/* Image — FocalPointFrame 1:1, mode-color crosshair; empty state opens the existing picker */}
      <FocalPointFrame
        src={hasImage ? (previewUrl || submission.media_url || undefined) : undefined}
        alt={submission.title || 'submission'}
        aspect="1:1"
        accent={modeAccent}
        focalX={focal.x}
        focalY={focal.y}
        onFocalChange={isSubmitted ? undefined : (x, y) => setFocal({ x, y })}
        onRemove={!isSubmitted && hasImage ? () => { setPreviewUrl(null); setMediaFile(null); setSubmission(prev => ({ ...prev, media_url: '' })); } : undefined}
        emptyLabel="Add an image"
        onEmptyPress={isSubmitted ? undefined : triggerFileInput}
        style={{ marginTop: 18 }}
      />

      {/* Title + caption — handleInputChange via the input name */}
      <div style={{ opacity: hasImage ? 1 : 0.4, transition: 'opacity 0.15s' }}>
        <div style={{ paddingTop: 18 }}>
          <Input name="title" value={submission.title} onChange={handleInputChange} disabled={isSubmitted} placeholder="Image title" aria-label="Image title" />
        </div>
        <div style={{ paddingTop: 8 }}>
          <Input name="caption" value={submission.caption} onChange={handleInputChange} disabled={isSubmitted} placeholder="Add a caption…" aria-label="Caption" style={{ fontSize: 14 }} />
        </div>
      </div>

      {/* Hidden file input — the unchanged handleFileChange */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={submission.status === 'submitted'}
        style={{ display: 'none' }}
      />
    </PageShell>
  );
}
