"use client";
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ArrowLeft, Upload, X, Save, Send, CheckCircle, AlertCircle, FileText, Eye, Maximize2, Info } from 'lucide-react';
import { getCollabById } from '@/lib/supabase/collabs';

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

export default function CollabSubmissionPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--ground-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '2px solid var(--neon-amber)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--paper-secondary)', opacity: 0.6 }}>Loading…</p>
        </div>
      </div>
    }>
      <CollabSubmissionContent />
    </Suspense>
  );
}

function CollabSubmissionContent() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [showInstructionsPanel, setShowInstructionsPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0 });

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

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  useEffect(() => {
    return () => { if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

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
      if (!submission.id && resultData.length > 0 && resultData[0]?.id) {
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

  const getModeColor = (mode?: string) => {
    switch (mode) {
      case 'community': return { color: 'rgba(52,211,153,0.9)',  bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.3)'  };
      case 'local':     return { color: 'rgba(245,169,63,0.9)',  bg: 'rgba(245,169,63,0.1)',  border: 'rgba(245,169,63,0.3)'  };
      case 'private':   return { color: 'rgba(167,139,250,0.9)', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)' };
      default:          return { color: 'var(--paper-secondary)', bg: 'var(--ground-raised)',  border: 'var(--rule-color)'     };
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ground-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '2px solid var(--neon-amber)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--paper-secondary)', opacity: 0.6 }}>Loading collaboration…</p>
        </div>
      </div>
    );
  }

  const modeColors = getModeColor(collabDetails.participation_mode);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground-base)', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto' }}>
      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,169,63,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--ground-base)', borderBottom: '1px solid var(--rule-color)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ color: 'var(--paper-secondary)', display: 'flex', opacity: 0.7 }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--paper-primary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {collabDetails.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: submission.status === 'draft' ? 'var(--paper-secondary)' : '#10b981' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', color: submission.status === 'draft' ? 'var(--paper-secondary)' : '#10b981', opacity: submission.status === 'draft' ? 0.6 : 1 }}>
                {submission.status === 'draft' ? 'Draft' : 'Submitted'} · {timeLeft.days}d {timeLeft.hours}h left
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {collabDetails.participation_mode && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: modeColors.color, background: modeColors.bg, border: `1px solid ${modeColors.border}`, borderRadius: 2, padding: '3px 7px' }}>
              {collabDetails.participation_mode}
              {collabDetails.participation_mode === 'local' && collabDetails.location ? ` · ${collabDetails.location}` : ''}
            </span>
          )}
          <button
            onClick={() => setShowInstructionsPanel(!showInstructionsPanel)}
            style={{ position: 'relative', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: showInstructionsPanel ? 'rgba(245,169,63,0.1)' : 'transparent', border: `1px solid ${showInstructionsPanel ? 'rgba(245,169,63,0.3)' : 'var(--rule-color)'}`, borderRadius: 2, cursor: 'pointer', color: showInstructionsPanel ? 'var(--neon-amber)' : 'var(--paper-secondary)' }}
          >
            <FileText size={14} />
            {!showInstructionsPanel && (
              <div style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: '50%', background: 'var(--neon-amber)' }} />
            )}
          </button>
        </div>
      </div>

      {/* Instructions panel */}
      {showInstructionsPanel && (
        <div style={{ position: 'relative', zIndex: 10, background: 'var(--lt-surface)', borderBottom: '1px solid var(--rule-color)', padding: 16 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, color: 'var(--paper-primary)', marginBottom: 12 }}>{collabDetails.description}</div>
          <div style={{ background: 'rgba(245,169,63,0.05)', border: '1px solid rgba(245,169,63,0.2)', borderLeft: '3px solid var(--neon-amber)', borderRadius: 2, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <FileText size={12} color="var(--neon-amber)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--neon-amber)' }}>Instructions</span>
            </div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--paper-secondary)', opacity: 0.8, margin: 0, whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {collabDetails.instructions || collabDetails.prompt_text || 'No specific instructions provided.'}
            </p>
          </div>
        </div>
      )}

      {/* Floating instructions button when panel closed */}
      {!showInstructionsPanel && (
        <button
          onClick={() => setShowInstructionsPanel(true)}
          style={{ position: 'fixed', bottom: 88, right: 16, zIndex: 10, width: 44, height: 44, borderRadius: '50%', background: 'var(--neon-amber)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(245,169,63,0.4)' }}
        >
          <Eye size={18} color="#000" />
        </button>
      )}

      {/* Image area */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, background: 'var(--ground-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280, ...(isFullscreen ? { position: 'fixed', inset: 0, zIndex: 50, minHeight: 'unset' } : {}) }}>
        {previewUrl || submission.media_url ? (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Image
              src={previewUrl || submission.media_url || ''}
              alt={submission.title || 'Submission preview'}
              width={500} height={500}
              style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: 2 }}
              unoptimized={previewUrl?.startsWith('blob:') || false}
            />
            <button onClick={() => setIsFullscreen(!isFullscreen)} style={{ position: 'absolute', bottom: 24, right: 24, width: 32, height: 32, borderRadius: 2, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Maximize2 size={14} />
            </button>
            {submission.status === 'draft' && (
              <button onClick={() => { setPreviewUrl(null); setMediaFile(null); setSubmission(prev => ({ ...prev, media_url: '' })); }} style={{ position: 'absolute', top: 24, right: 24, width: 28, height: 28, borderRadius: 2, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <X size={13} />
              </button>
            )}
          </div>
        ) : (
          <div
            onClick={submission.status !== 'submitted' ? triggerFileInput : undefined}
            style={{ width: '100%', height: '100%', minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: submission.status !== 'submitted' ? 'pointer' : 'default', border: '1px dashed var(--rule-color)', borderRadius: 2, margin: 16, gap: 10 }}
          >
            <input ref={fileInputRef} type="file" onChange={handleFileChange} accept="image/*" disabled={submission.status === 'submitted'} style={{ display: 'none' }} />
            <Upload size={28} color="var(--paper-secondary)" style={{ opacity: 0.35 }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--paper-secondary)', opacity: 0.5 }}>
              {submission.status === 'submitted' ? 'No image uploaded' : 'Click to upload an image'}
            </div>
            {submission.status !== 'submitted' && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--paper-secondary)', opacity: 0.35 }}>JPG, PNG, GIF, WebP · up to 10MB</div>
            )}
          </div>
        )}
      </div>

      {/* Form */}
      <div style={{ position: 'relative', zIndex: 1, background: 'var(--lt-surface)', borderTop: '1px solid var(--rule-color)', padding: '14px 16px' }}>
        <input
          name="title"
          value={submission.title}
          onChange={handleInputChange}
          placeholder="Add title"
          disabled={submission.status === 'submitted'}
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 500, color: 'var(--paper-primary)', marginBottom: 8, boxSizing: 'border-box' }}
        />
        <textarea
          name="caption"
          value={submission.caption}
          onChange={handleInputChange}
          placeholder="Add caption"
          rows={3}
          disabled={submission.status === 'submitted'}
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--paper-secondary)', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
        />
      </div>

      {/* Status messages */}
      {(error || successMessage) && (
        <div style={{ position: 'relative', zIndex: 1, margin: '0 16px 8px', padding: '10px 14px', background: error ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${error ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
          {error ? <AlertCircle size={14} color="#ef4444" /> : <CheckCircle size={14} color="#10b981" />}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: error ? '#ef4444' : '#10b981' }}>{error || successMessage}</span>
        </div>
      )}

      {/* Action bar */}
      <div style={{ position: 'sticky', bottom: 0, zIndex: 20, background: 'var(--ground-base)', borderTop: '1px solid var(--rule-color)', padding: '12px 16px', display: 'flex', gap: 8 }}>
        {submission.status === 'submitted' ? (
          <button
            onClick={handleRevertToEdit}
            disabled={saving}
            style={{ flex: 1, padding: '11px', background: 'rgba(245,169,63,0.08)', border: '1px solid rgba(245,169,63,0.25)', borderRadius: 2, color: 'var(--neon-amber)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.5 : 1 }}
          >
            <Info size={13} />
            Revert to Draft
          </button>
        ) : (
          <>
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving || submitting}
              className="press-btn"
              style={{ flex: 1, padding: '11px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (saving || submitting) ? 0.5 : 1 }}
            >
              <Save size={13} />
              {saving && !submitting ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving || submitting || !submission.title || (!previewUrl && !submission.media_url)}
              className="press-btn-green"
              style={{ flex: 1, padding: '11px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (saving || submitting || !submission.title || (!previewUrl && !submission.media_url)) ? 0.4 : 1 }}
            >
              <Send size={13} />
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
