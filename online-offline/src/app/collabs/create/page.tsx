'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase/useSupabase';

type PressState = 'rest' | 'pressing' | 'releasing';

export default function CreateCollabPage() {
  const router = useRouter();
  const supabase = useSupabase();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'theme' | 'chain' | 'narrative'>('theme');
  const [submitPress, setSubmitPress] = useState<PressState>('rest');

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

  const releasePress = (set: (s: PressState) => void) => {
    set('releasing');
    setTimeout(() => set('rest'), 220);
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!description.trim()) { setError('Brief is required'); return; }

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
          type,
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--lt-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--paper-4)', letterSpacing: '0.08em' }}>loading…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--lt-bg)' }}>
      <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: 'var(--lt-bg)', position: 'relative' }}>

        {/* Header */}
        <div style={{ padding: '22px 26px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/collabs" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper-4)', textDecoration: 'none' }}>← Collabs</Link>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, letterSpacing: '0.04em', color: 'var(--paper)', opacity: 0.88, textShadow: '0 0 20px var(--glow-paper)' }}>
            online<span style={{ color: 'var(--paper-5)', margin: '0 1px' }}>//</span>offline
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon-purple)', textShadow: '0 0 6px var(--glow-purple)' }}>Create</span>
        </div>

        {/* Thick rule */}
        <div style={{ height: 1, background: 'var(--paper)', margin: '13px 26px 0', opacity: 0.8, boxShadow: '0 0 6px 1px rgba(240,235,226,0.25), 0 0 20px rgba(240,235,226,0.08)' }} />

        {/* Strip */}
        <div style={{ padding: '9px 26px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--paper-3)', whiteSpace: 'nowrap' }}>Private Collab</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--rule-mid), transparent)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper-5)', whiteSpace: 'nowrap' }}>Invite-only</span>
        </div>

        {/* Form */}
        <div style={{ padding: '24px 26px 80px' }}>

          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(224,90,40,0.08)', borderTop: '1px solid rgba(224,90,40,0.25)', borderRight: '1px solid rgba(224,90,40,0.25)', borderBottom: '1px solid rgba(224,90,40,0.25)', borderLeft: '3px solid var(--neon-accent)', borderRadius: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--neon-accent)' }}>{error}</span>
            </div>
          )}

          {/* Name */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper-5)', marginBottom: 8 }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your collab's name"
              maxLength={80}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--rule-mid)', borderRadius: 0, padding: '8px 0', fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--paper)', outline: 'none', caretColor: 'var(--neon-purple)', boxSizing: 'border-box' }}
              onFocus={e => { e.currentTarget.style.borderBottomColor = 'var(--paper-3)'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = 'var(--rule-mid)'; }}
            />
          </div>

          {/* Brief */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper-5)', marginBottom: 8 }}>Brief</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this collab about? What should contributors make?"
              rows={4}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--rule-mid)', borderRadius: 0, padding: '8px 0', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, color: 'var(--paper-2)', outline: 'none', resize: 'none', lineHeight: 1.55, caretColor: 'var(--neon-purple)', boxSizing: 'border-box' }}
              onFocus={e => { e.currentTarget.style.borderBottomColor = 'var(--paper-3)'; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = 'var(--rule-mid)'; }}
            />
          </div>

          {/* Type */}
          <div style={{ marginBottom: 36 }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper-5)', marginBottom: 10 }}>Type</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['theme', 'chain', 'narrative'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    flex: 1, padding: '8px 4px',
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                    borderRadius: 2, cursor: 'pointer',
                    color: type === t ? 'var(--neon-purple)' : 'var(--paper-4)',
                    background: type === t ? 'rgba(168,136,232,0.1)' : 'var(--ground-3)',
                    border: `1px solid ${type === t ? 'rgba(168,136,232,0.35)' : 'var(--rule-mid)'}`,
                    transition: 'all 0.12s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onPointerDown={() => setSubmitPress('pressing')}
            onPointerUp={() => { releasePress(setSubmitPress); if (!submitting && name.trim() && description.trim()) handleCreate(); }}
            onPointerLeave={() => { if (submitPress === 'pressing') releasePress(setSubmitPress); }}
            disabled={submitting || !name.trim() || !description.trim()}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--neon-purple)',
              padding: '12px 20px',
              background: submitPress === 'pressing' ? 'rgba(168,136,232,0.2)' : 'rgba(168,136,232,0.1)',
              borderTop: `1px solid ${submitPress !== 'rest' ? 'rgba(168,136,232,0.5)' : 'rgba(168,136,232,0.35)'}`,
              borderRight: `1px solid ${submitPress !== 'rest' ? 'rgba(168,136,232,0.5)' : 'rgba(168,136,232,0.35)'}`,
              borderLeft: `1px solid ${submitPress !== 'rest' ? 'rgba(168,136,232,0.5)' : 'rgba(168,136,232,0.35)'}`,
              borderBottom: `2px solid ${submitPress === 'pressing' ? 'rgba(168,136,232,0.6)' : 'rgba(168,136,232,0.45)'}`,
              borderRadius: 2,
              cursor: (submitting || !name.trim() || !description.trim()) ? 'not-allowed' : 'pointer',
              opacity: (submitting || !name.trim() || !description.trim()) ? 0.4 : 1,
              transform: submitPress === 'pressing' ? 'translateY(2px)' : 'translateY(0)',
              boxShadow: submitPress === 'pressing' ? 'none' : '0 2px 0 rgba(168,136,232,0.2), 0 0 14px rgba(168,136,232,0.06)',
              transition: submitPress === 'releasing'
                ? 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease, background 0.3s'
                : 'transform 0.08s cubic-bezier(0.4,0,0.6,1), box-shadow 0.08s, background 0.08s',
            }}
          >
            {submitting ? 'Creating…' : 'Create & Invite →'}
          </button>

        </div>
      </div>
    </div>
  );
}
