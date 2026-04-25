'use client';
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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
  const supabase     = createClientComponentClient();
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

  return null; // Stage 2
}
