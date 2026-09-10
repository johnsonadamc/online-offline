'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { PageShell, Input, Textarea, Toast, SERIF, SANS, MONO } from '@/components/v2';

// v2 wordmark (design `.wordmark`): 19px serif, "//" in --ink3.
const Wordmark = () => (
  <div style={{ font: `400 19px/1 ${SERIF}`, color: 'var(--ink)' }}>
    online<span style={{ color: 'var(--ink3)' }}>{'//'}</span>offline
  </div>
);

export default function CreateCollabPage() {
  const router = useRouter();
  const supabase = useSupabase();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data: contribRow } = await supabase
        .from('profile_types')
        .select('type')
        .eq('profile_id', user.id)
        .eq('type', 'contributor')
        .maybeSingle();
      if (!contribRow) { router.push('/dashboard'); return; }

      setLoading(false);
    }
    checkAccess();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }
    if (!prompt.trim()) { setError('Prompt is required'); return; }

    setSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data: period } = await supabase
        .from('periods')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();
      if (!period) { setError('No active period found'); setSubmitting(false); return; }

      const { data: collab, error: collabError } = await supabase
        .from('collabs')
        .insert({
          title: name.trim(),
          description: description.trim(),
          prompt_text: prompt.trim(),
          type: 'theme',
          is_private: true,
          participation_mode: 'private',
          is_user_created: true,
          template_id: null,
          period_id: period.id,
          created_by: user.id,
          metadata: { participation_mode: 'private', location: null },
        })
        .select('id')
        .single();

      if (collabError || !collab) {
        console.error('[create-collab] collab insert failed:', collabError);
        setError(collabError?.message ?? 'Failed to create collaboration');
        setSubmitting(false);
        return;
      }

      const { error: participantError } = await supabase
        .from('collab_participants')
        .insert({
          profile_id: user.id,
          collab_id: collab.id,
          role: 'lead',
          status: 'active',
          participation_mode: 'private',
          invite_status: 'accepted',
        });

      if (participantError) {
        console.error('[create-collab] participant insert failed:', participantError);
        setError(participantError.message);
        setSubmitting(false);
        return;
      }

      router.push(`/collabs/${collab.id}/invite`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSubmitting(false);
    }
  };

  const canCreate = !submitting && !!name.trim() && !!description.trim() && !!prompt.trim();

  // Header — design `.top`: "‹ Collabs", wordmark, "Private" in purple
  const header = (
    <>
      <Link href="/collabs" style={{ font: `500 12px/1 ${SANS}`, color: 'var(--ink2)', textDecoration: 'none', flex: 'none' }}>‹ Collabs</Link>
      <Wordmark />
      <span style={{ font: `500 12px/1 ${SANS}`, color: 'var(--purple)', flex: 'none' }}>Private</span>
    </>
  );

  if (loading) {
    return (
      <PageShell header={header} align="center">
        <p style={{ margin: 0, textAlign: 'center', font: `400 12px/1 ${MONO}`, letterSpacing: '0.14em', color: 'var(--ink3)' }}>loading…</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={header}
      // Footer — design `.foot`: purple primary "Create and invite" → handleCreate (unchanged)
      footer={(
        <button
          type="button"
          onClick={() => { if (canCreate) handleCreate(); }}
          disabled={!canCreate}
          style={{ flex: 1, font: `500 12px/1 ${SANS}`, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '15px 18px', borderRadius: 5, borderWidth: 0, textAlign: 'center', whiteSpace: 'nowrap', color: '#0d0c0a', background: 'var(--purple)', boxShadow: '0 0 28px color-mix(in oklch, var(--purple) 35%, transparent)', opacity: canCreate ? 1 : 0.4, cursor: canCreate ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent' }}
        >
          {submitting ? 'Creating…' : 'Create and invite'}
        </button>
      )}
      columnStyle={{ paddingBottom: 32 }}
    >
      <Toast open={!!error} message={error} accent="orange" duration={0} onClose={() => setError('')} />

      {/* Hero — design `.hero`: serif 30 + one sans line */}
      <div style={{ paddingTop: 22 }}>
        <h2 style={{ margin: 0, font: `400 30px/1.1 ${SERIF}`, color: 'var(--ink)' }}>Start a private collab</h2>
        <p style={{ margin: '8px 0 0', font: `400 13px/1.4 ${SANS}`, color: 'var(--ink2)' }}>You&apos;ll lead it and invite up to 9 others.</p>
      </div>

      {/* Exactly three fields: Name → title · Description → description · Prompt → prompt_text */}
      <div style={{ paddingTop: 8 }}>
        <Input
          label="Name"
          serif
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your collab's name"
          maxLength={80}
        />
      </div>
      <Textarea
        label="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="What is this collab about? Shown publicly."
      />
      <Textarea
        label="Prompt"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="What should contributors make? Give them a clear brief."
      />
    </PageShell>
  );
}
