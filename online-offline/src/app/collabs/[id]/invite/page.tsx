'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { PageShell, SearchField, RosterRow, StatusDot, SectionLabel, Toast, SERIF, SANS, MONO } from '@/components/v2';
import type { TileType, InviteStatus } from '@/components/v2';

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
  avatar_url: string | null;
}

// v2 wordmark (design `.wordmark`): 19px serif, "//" in --ink3.
const Wordmark = () => (
  <div style={{ font: `400 19px/1 ${SERIF}`, color: 'var(--ink)' }}>
    online<span style={{ color: 'var(--ink3)' }}>{'//'}</span>offline
  </div>
);

// Design `.rr .n`: "A. Okafor" — first initial + last name(s).
const shortName = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
};
const tileType = (t: string | null): TileType | undefined =>
  t === 'photography' || t === 'art' || t === 'poetry' || t === 'essay' ? t : undefined;
const dotStatus = (s: string): InviteStatus =>
  s === 'pending' || s === 'declined' ? s : 'accepted';

const LEGEND_KEY = 'oo_invite_legend_seen';

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
  // One-time StatusDot legend (localStorage flag) + rows invited in this session (quiet "Invited")
  const [showLegend, setShowLegend] = useState(false);
  const [recentlyInvited, setRecentlyInvited] = useState<ProfileResult[]>([]);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [isLead, setIsLead] = useState(false);

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

    if (!participantRow) {
      router.push('/collabs');
      return;
    }
    setIsLead(participantRow.role === 'lead' || participantRow.role === 'organizer');

    const { data: collabData } = await supabase
      .from('collabs')
      .select('id, title, period_id')
      .eq('id', collabId)
      .maybeSingle();

    if (!collabData) { router.push('/collabs'); return; }
    setCollab({ id: collabData.id, title: collabData.title });

    // Check whether the submission deadline has passed
    if (collabData.period_id) {
      const { data: periodData } = await supabase
        .from('periods')
        .select('end_date')
        .eq('id', collabData.period_id)
        .maybeSingle();
      if (periodData?.end_date) {
        setDeadlinePassed(new Date(periodData.end_date) < new Date());
      }
    }

    // Two-step fetch: collab_participants has two FKs to profiles (profile_id + invited_by),
    // so PostgREST embed is ambiguous (PGRST201). Fetch rows then profiles separately.
    const { data: partRows, error: partsError } = await supabase
      .from('collab_participants')
      .select('id, profile_id, role, status, invite_status, invited_by')
      .eq('collab_id', collabId);

    void partsError; // the debug log that read it was removed; a failed fetch shows as an empty roster

    const profileIds = (partRows ?? []).map((p: { profile_id: string }) => p.profile_id);
    const profileMap: Record<string, { first_name?: string; last_name?: string }> = {};
    if (profileIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', profileIds);
      for (const pr of (profileRows ?? []) as Array<{ id: string; first_name?: string; last_name?: string }>) {
        profileMap[pr.id] = pr;
      }
    }

    setParticipants(
      ((partRows ?? []) as Array<{ profile_id: string; role: string; invite_status: string | null }>).map(p => ({
        id: p.profile_id,
        name: `${profileMap[p.profile_id]?.first_name ?? ''} ${profileMap[p.profile_id]?.last_name ?? ''}`.trim() || 'Unknown',
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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, city, content_type, avatar_url')
        .eq('is_public', true)
        .or(`first_name.ilike.%${searchQueryTrimmed}%,last_name.ilike.%${searchQueryTrimmed}%`)
        .limit(20);

      if (!profileData || profileData.length === 0) { setResults([]); return; }

      const ids = (profileData as Array<{ id: string }>).map(p => p.id);
      const { data: typeData } = await supabase
        .from('profile_types')
        .select('profile_id')
        .eq('type', 'contributor')
        .in('profile_id', ids);

      const contributorIds = new Set(((typeData ?? []) as Array<{ profile_id: string }>).map(t => t.profile_id));
      const filtered = (profileData as Array<{ id: string; first_name?: string; last_name?: string; city?: string; content_type?: string; avatar_url?: string }>)
        .filter(p => contributorIds.has(p.id) && p.id !== currentUserId && !existingParticipantIds.has(p.id))
        .map(p => ({
          id: p.id,
          name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown',
          city: p.city ?? null,
          content_type: p.content_type ?? null,
          avatar_url: p.avatar_url ?? null,
        }));
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

  // One-time legend for the status dots (design `.legend`), gated by a localStorage flag
  useEffect(() => {
    try {
      if (!localStorage.getItem(LEGEND_KEY)) { setShowLegend(true); localStorage.setItem(LEGEND_KEY, '1'); }
    } catch { /* storage unavailable — no legend */ }
  }, []);

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

  const atCap = participants.length >= 10;
  const visibleResults = results.filter(r => !participants.find(p => p.id === r.id));
  // Quiet "Invited" rows: only those that actually landed in participants after handleInvite → loadData
  const invitedRows = recentlyInvited.filter(r => participants.some(p => p.id === r.id) && !visibleResults.some(v => v.id === r.id));

  // Design `.rr .sb` (outlined button) / `.sb.c` (purple) / `.sb.q` (quiet text)
  const sb: React.CSSProperties = {
    font: `500 10.5px/1 ${SANS}`, letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '8px 10px', borderRadius: 5, background: 'transparent', cursor: 'pointer', flex: 'none',
    borderWidth: 1, borderStyle: 'solid', WebkitTapHighlightColor: 'transparent',
  };

  return (
    <PageShell
      header={header}
      // Footer — design `.foot`: ink "Done" → /collabs
      footer={(
        <button
          type="button"
          onClick={() => router.push('/collabs')}
          style={{ flex: 1, font: `500 12px/1 ${SANS}`, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '15px 18px', borderRadius: 5, borderWidth: 0, textAlign: 'center', whiteSpace: 'nowrap', cursor: 'pointer', color: 'var(--bg)', background: 'var(--ink)', WebkitTapHighlightColor: 'transparent' }}
        >
          Done
        </button>
      )}
      columnStyle={{ paddingBottom: 32 }}
    >
      <Toast open={!!error} message={error} accent="orange" duration={0} onClose={() => setError('')} />

      {/* Hero — design `.hero`: serif name + mono "N / 10" */}
      <div style={{ paddingTop: 22, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, flex: 1, minWidth: 0, font: `400 30px/1.1 ${SERIF}`, color: 'var(--ink)' }}>{collab?.title}</h2>
        <span style={{ font: `400 12px/1 ${MONO}`, color: atCap ? 'var(--orange)' : 'var(--ink3)', flex: 'none' }}>{participants.length} / 10</span>
      </div>

      {/* Invite controls — lead only (isLead gate unchanged) */}
      {isLead && (deadlinePassed ? (
        <p style={{ margin: 0, paddingTop: 22, font: `italic 400 15px/1.4 ${SERIF}`, color: 'var(--ink3)' }}>
          Invitations closed — the submission deadline has passed.
        </p>
      ) : atCap ? (
        <p style={{ margin: 0, paddingTop: 22, font: `italic 400 15px/1.4 ${SERIF}`, color: 'var(--ink3)' }}>
          Maximum 10 participants reached.
        </p>
      ) : (
        <div style={{ paddingTop: 18 }}>
          <SearchField
            placeholder="Search by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search contributors by name"
          />
          {visibleResults.map(r => (
            <RosterRow key={r.id} name={shortName(r.name)} avatarUrl={r.avatar_url ?? undefined} initial={r.name[0]?.toLowerCase()} type={tileType(r.content_type)}>
              <button
                type="button"
                disabled={!!inviting}
                onClick={async () => {
                  if (inviting) return;
                  await handleInvite(r.id);
                  setRecentlyInvited(prev => prev.some(x => x.id === r.id) ? prev : [...prev, r]);
                }}
                style={{ ...sb, color: 'var(--purple)', borderColor: 'var(--purple)', opacity: inviting && inviting !== r.id ? 0.4 : 1, cursor: inviting ? 'default' : 'pointer' }}
              >
                {inviting === r.id ? '…' : 'Invite'}
              </button>
            </RosterRow>
          ))}
          {invitedRows.map(r => (
            <RosterRow key={`inv-${r.id}`} name={shortName(r.name)} avatarUrl={r.avatar_url ?? undefined} initial={r.name[0]?.toLowerCase()} type={tileType(r.content_type)}>
              <span style={{ ...sb, cursor: 'default', color: 'var(--ink3)', borderColor: 'transparent', paddingRight: 0 }}>Invited</span>
            </RosterRow>
          ))}
          {searchQuery.trim() && visibleResults.length === 0 && invitedRows.length === 0 && (
            <p style={{ margin: 0, paddingTop: 18, font: `italic 400 15px/1.4 ${SERIF}`, color: 'var(--ink3)' }}>No contributors found</p>
          )}
        </div>
      ))}

      {/* Participants — design `.sec` + `.rr` with "lead" sub-line and StatusDot */}
      {participants.length > 0 && (
        <>
          <div style={{ paddingTop: 26 }}>
            <SectionLabel style={{ color: 'var(--ink2)' }}>Participants</SectionLabel>
          </div>
          {participants.map((p, i) => (
            <RosterRow
              key={p.id}
              name={p.id === currentUserId ? 'You' : shortName(p.name)}
              initial={p.name[0]?.toLowerCase()}
              sub={p.role === 'lead' || p.role === 'organizer' ? 'lead' : undefined}
              last={i === participants.length - 1}
            >
              <StatusDot status={dotStatus(p.invite_status)} />
            </RosterRow>
          ))}
          {showLegend && (
            <div style={{ display: 'flex', gap: 18, paddingTop: 14, font: `400 11.5px/1 ${SANS}`, color: 'var(--ink3)' }}>
              {(['accepted', 'pending', 'declined'] as const).map(st => (
                <span key={st} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StatusDot status={st} />{st[0].toUpperCase() + st.slice(1)}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
