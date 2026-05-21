'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase/useSupabase';

interface CollabInfo {
  id: string;
  title: string;
}

interface Participant {
  id: string;
  name: string;
  role: string;
  invite_status: string;
}

interface ProfileResult {
  id: string;
  name: string;
  city: string | null;
  content_type: string | null;
}

type PressState = 'rest' | 'pressing' | 'releasing';

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const supabase = useSupabase();
  const collabId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [collab, setCollab] = useState<CollabInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [inviting, setInviting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [donePress, setDonePress] = useState<PressState>('rest');

  const releasePress = (set: (s: PressState) => void) => {
    set('releasing');
    setTimeout(() => set('rest'), 220);
  };

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setCurrentUserId(user.id);

    const { data: participantRow } = await supabase
      .from('collab_participants')
      .select('role')
      .eq('collab_id', collabId)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!participantRow || (participantRow.role !== 'lead' && participantRow.role !== 'organizer')) {
      router.push('/collabs');
      return;
    }

    const { data: collabData } = await supabase
      .from('collabs')
      .select('id, title')
      .eq('id', collabId)
      .maybeSingle();

    if (!collabData) { router.push('/collabs'); return; }
    setCollab({ id: collabData.id, title: collabData.title });

    const { data: parts } = await supabase
      .from('collab_participants')
      .select('profile_id, role, invite_status, profiles(first_name, last_name)')
      .eq('collab_id', collabId);

    setParticipants(
      ((parts ?? []) as Array<{ profile_id: string; role: string; invite_status: string | null; profiles: { first_name?: string; last_name?: string } | null }>).map(p => ({
        id: p.profile_id,
        name: `${p.profiles?.first_name ?? ''} ${p.profiles?.last_name ?? ''}`.trim() || 'Unknown',
        role: p.role,
        invite_status: p.invite_status ?? 'accepted',
      }))
    );

    setLoading(false);
  }, [collabId, router, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // Search contributors — two-step: profiles then filter to contributors
  useEffect(() => {
    if (!currentUserId) return;
    const existingParticipantIds = new Set(participants.map(p => p.id));
    const searchQueryTrimmed = searchQuery.trim();
    async function search() {
      console.log('[invite-search] searchQuery:', searchQueryTrimmed);
      console.log('[invite-search] currentUserId:', currentUserId);
      console.log('[invite-search] existingParticipantIds:', [...existingParticipantIds]);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, city, content_type, avatar_url')
        .eq('is_public', true)
        .or(`first_name.ilike.%${searchQueryTrimmed}%,last_name.ilike.%${searchQueryTrimmed}%`)
        .limit(20);

      console.log('[invite-search] profileData:', profileData);
      console.log('[invite-search] profileError:', profileError);

      if (!profileData || profileData.length === 0) { setResults([]); return; }

      const ids = (profileData as Array<{ id: string }>).map(p => p.id);
      const { data: typeData, error: typeError } = await supabase
        .from('profile_types')
        .select('profile_id')
        .eq('type', 'contributor')
        .in('profile_id', ids);

      console.log('[invite-search] typeData:', typeData);
      console.log('[invite-search] typeError:', typeError);

      const contributorIds = new Set(((typeData ?? []) as Array<{ profile_id: string }>).map(t => t.profile_id));
      const filtered = (profileData as Array<{ id: string; first_name?: string; last_name?: string; city?: string; content_type?: string }>)
        .filter(p => contributorIds.has(p.id) && p.id !== currentUserId && !existingParticipantIds.has(p.id))
        .map(p => ({
          id: p.id,
          name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown',
          city: p.city ?? null,
          content_type: p.content_type ?? null,
        }));

      console.log('[invite-search] contributorIds:', [...contributorIds]);
      console.log('[invite-search] final filtered results:', filtered);
      setResults(filtered);
    }
    search();
  }, [searchQuery, supabase, currentUserId, participants]);

  const handleInvite = async (profileId: string) => {
    if (participants.length >= 10) { setError('Maximum 10 participants reached'); return; }
    if (participants.find(p => p.id === profileId)) return;

    setInviting(profileId);
    const { error: inviteError } = await supabase
      .from('collab_participants')
      .insert({
        collab_id: collabId,
        profile_id: profileId,
        role: 'member',
        status: 'active',
        participation_mode: 'private',
        invite_status: 'pending',
      });

    if (inviteError) { setError(inviteError.message); setInviting(null); return; }
    await loadData();
    setInviting(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--lt-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--paper-4)', letterSpacing: '0.08em' }}>loading…</span>
      </div>
    );
  }

  const atCap = participants.length >= 10;
  const visibleResults = results.filter(r => !participants.find(p => p.id === r.id));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--lt-bg)' }}>
      <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: 'var(--lt-bg)', position: 'relative' }}>

        {/* Header */}
        <div style={{ padding: '22px 26px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/collabs" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper-4)', textDecoration: 'none' }}>← Collabs</Link>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, letterSpacing: '0.04em', color: 'var(--paper)', opacity: 0.88, textShadow: '0 0 20px var(--glow-paper)' }}>
            online<span style={{ color: 'var(--paper-5)', margin: '0 1px' }}>//</span>offline
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon-purple)', textShadow: '0 0 6px var(--glow-purple)' }}>Invite</span>
        </div>

        {/* Thick rule */}
        <div style={{ height: 1, background: 'var(--paper)', margin: '13px 26px 0', opacity: 0.8, boxShadow: '0 0 6px 1px rgba(240,235,226,0.25), 0 0 20px rgba(240,235,226,0.08)' }} />

        {/* Strip */}
        <div style={{ padding: '9px 26px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--paper-3)', whiteSpace: 'nowrap' }}>{collab?.title}</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--rule-mid), transparent)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: atCap ? 'var(--neon-accent)' : 'var(--paper-5)', whiteSpace: 'nowrap' }}>
            {participants.length}/10
          </span>
        </div>

        <div style={{ padding: '20px 26px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(224,90,40,0.08)', borderTop: '1px solid rgba(224,90,40,0.25)', borderRight: '1px solid rgba(224,90,40,0.25)', borderBottom: '1px solid rgba(224,90,40,0.25)', borderLeft: '3px solid var(--neon-accent)', borderRadius: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--neon-accent)' }}>{error}</span>
            </div>
          )}

          {/* Current participants */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper-5)', marginBottom: 8 }}>Participants</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {participants.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--ground-2)', borderTop: '1px solid var(--rule)', borderRight: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', borderLeft: `2px solid ${p.role === 'lead' ? 'var(--neon-purple)' : 'transparent'}`, borderRadius: 2 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--paper)', opacity: 0.88 }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {p.role === 'lead' && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--neon-purple)', background: 'rgba(168,136,232,0.1)', border: '1px solid rgba(168,136,232,0.25)', borderRadius: 2, padding: '2px 6px' }}>lead</span>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: p.invite_status === 'accepted' ? 'var(--neon-green)' : 'var(--paper-4)', background: p.invite_status === 'accepted' ? 'rgba(78,196,122,0.08)' : 'transparent', border: `1px solid ${p.invite_status === 'accepted' ? 'rgba(78,196,122,0.25)' : 'var(--rule)'}`, borderRadius: 2, padding: '2px 6px' }}>{p.invite_status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--rule-mid)' }} />

          {/* Search */}
          {atCap ? (
            <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--paper-4)', textAlign: 'center' }}>
              Maximum 10 participants reached.
            </div>
          ) : (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper-5)', marginBottom: 8 }}>Invite contributors</div>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--paper-3)', opacity: 0.5, pointerEvents: 'none' }}><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                <input
                  type="text"
                  placeholder="Search by name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '9px 10px 9px 30px', background: 'var(--ground-3)', border: '1px solid var(--rule-mid)', borderRadius: 2, color: 'var(--paper)', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none', boxSizing: 'border-box', caretColor: 'var(--neon-purple)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(168,136,232,0.5)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--rule-mid)'; }}
                />
              </div>

              <div style={{ border: '1px solid var(--rule-mid)', borderRadius: 2, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
                {visibleResults.length > 0 ? visibleResults.map((r, i) => (
                  <div
                    key={r.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px', borderBottom: i < visibleResults.length - 1 ? '1px solid var(--rule)' : 'none', background: 'var(--ground-2)', gap: 10 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--paper)', opacity: 0.9, lineHeight: 1.1, marginBottom: 2 }}>{r.name}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {r.city && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.08em', color: 'var(--paper-5)', textTransform: 'uppercase' }}>{r.city}</span>}
                        {r.content_type && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.08em', color: 'var(--neon-amber)', textTransform: 'uppercase' }}>{r.content_type}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleInvite(r.id)}
                      disabled={!!inviting}
                      style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 12px', color: 'var(--neon-purple)', background: 'rgba(168,136,232,0.08)', border: '1px solid rgba(168,136,232,0.3)', borderRadius: 2, cursor: inviting ? 'not-allowed' : 'pointer', opacity: inviting === r.id ? 0.5 : 1 }}
                    >
                      {inviting === r.id ? '…' : 'Invite'}
                    </button>
                  </div>
                )) : (
                  <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--paper-5)' }}>No contributors found</div>
                )}
              </div>
            </div>
          )}

          {/* Done */}
          <button
            onPointerDown={() => setDonePress('pressing')}
            onPointerUp={() => { releasePress(setDonePress); router.push('/collabs'); }}
            onPointerLeave={() => { if (donePress === 'pressing') releasePress(setDonePress); }}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--neon-purple)',
              padding: '12px 20px',
              background: donePress === 'pressing' ? 'rgba(168,136,232,0.2)' : 'rgba(168,136,232,0.1)',
              borderTop: `1px solid ${donePress !== 'rest' ? 'rgba(168,136,232,0.5)' : 'rgba(168,136,232,0.35)'}`,
              borderRight: `1px solid ${donePress !== 'rest' ? 'rgba(168,136,232,0.5)' : 'rgba(168,136,232,0.35)'}`,
              borderLeft: `1px solid ${donePress !== 'rest' ? 'rgba(168,136,232,0.5)' : 'rgba(168,136,232,0.35)'}`,
              borderBottom: `2px solid ${donePress === 'pressing' ? 'rgba(168,136,232,0.6)' : 'rgba(168,136,232,0.45)'}`,
              borderRadius: 2,
              cursor: 'pointer',
              transform: donePress === 'pressing' ? 'translateY(2px)' : 'translateY(0)',
              boxShadow: donePress === 'pressing' ? 'none' : '0 2px 0 rgba(168,136,232,0.2), 0 0 14px rgba(168,136,232,0.06)',
              transition: donePress === 'releasing'
                ? 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease, background 0.3s'
                : 'transform 0.08s cubic-bezier(0.4,0,0.6,1), box-shadow 0.08s, background 0.08s',
            }}
          >
            Done
          </button>

        </div>
      </div>
    </div>
  );
}
