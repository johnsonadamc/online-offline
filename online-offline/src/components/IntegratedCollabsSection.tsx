'use client';
// IntegratedCollabsSection.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { getCitiesWithParticipantCounts } from '@/lib/supabase/collabLibrary';

interface CollabData {
  id: string;
  title: string;
  type: 'chain' | 'theme' | 'narrative';
  participation_mode: 'community' | 'local' | 'private';
  location?: string | null;
  participantCity?: string | null;
  description?: string;
  participant_count: number;
  is_joined?: boolean;
  template_id?: string;
}

interface CollabTemplate {
  id: string;
  name: string;
  type: 'chain' | 'theme' | 'narrative';
  display_text?: string;
  instructions?: string;
}

interface CollabsSectionProps {
  periodId: string;
  selectedCollabs: string[];
  toggleItem: (id: string) => void;
  remainingContent: number;
  onPrivateCollabMap?: (map: Record<string, string>) => void;
  searchTerm?: string;
}

interface City {
  name: string;
  state?: string;
  participant_count: number;
}

interface ImportedCollab {
  id: string;
  title: string;
  type?: string;
  participation_mode?: string;
  sourceType?: string;
  location?: string | null;
  participantCount?: number;
  description?: string;
  template_id?: string;
  is_private?: boolean;
  [key: string]: unknown;
}

const IntegratedCollabsSection: React.FC<CollabsSectionProps> = ({
  periodId,
  selectedCollabs,
  toggleItem,
  remainingContent,
  onPrivateCollabMap,
  searchTerm = '',
}) => {
  const supabase = useSupabase();

  // ── data state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<CollabTemplate[]>([]);
  const [joinedCollabs, setJoinedCollabs] = useState<CollabData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [communityParticipantCounts, setCommunityParticipantCounts] = useState<Record<string, number>>({});

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [descOpen, setDescOpen] = useState<Set<string>>(new Set());
  const [localOpen, setLocalOpen] = useState<Set<string>>(new Set());

  // ── joined-collab helpers ────────────────────────────────────────────────────
  const userHasJoinedPrivate = (templateId: string): boolean => {
    if (joinedCollabs.some(c => c.template_id === templateId && c.participation_mode === 'private')) return true;
    const t = templates.find(t => t.id === templateId);
    if (!t) return false;
    return joinedCollabs.some(c => c.participation_mode === 'private' && c.title.toLowerCase().includes(t.name.toLowerCase()));
  };

  const userHasJoinedCommunity = (templateId: string): boolean => {
    if (joinedCollabs.some(c => c.template_id === templateId && c.participation_mode === 'community')) return true;
    const t = templates.find(t => t.id === templateId);
    if (!t) return false;
    return joinedCollabs.some(c => c.participation_mode === 'community' && c.title.toLowerCase().includes(t.name.toLowerCase()));
  };

  const userHasJoinedLocal = (templateId: string): boolean => {
    if (joinedCollabs.some(c => c.template_id === templateId && c.participation_mode === 'local')) return true;
    const t = templates.find(t => t.id === templateId);
    if (!t) return false;
    return joinedCollabs.some(c => c.participation_mode === 'local' && c.title.toLowerCase().includes(t.name.toLowerCase()));
  };

  const getJoinedCollabId = (templateId: string, mode: 'community' | 'local' | 'private'): string | null => {
    const direct = joinedCollabs.find(c => c.template_id === templateId && c.participation_mode === mode);
    if (direct) return direct.id;
    const t = templates.find(t => t.id === templateId);
    if (!t) return null;
    const byName = joinedCollabs.find(c => c.participation_mode === mode && c.title.toLowerCase().includes(t.name.toLowerCase()));
    return byName ? byName.id : null;
  };

  // ── participant count fetcher ────────────────────────────────────────────────
  const fetchCommunityParticipantCounts = useCallback(async (templatesArray: CollabTemplate[]) => {
    const counts: Record<string, number> = {};
    for (const template of templatesArray) {
      try {
        let total = 0;
        const { data: communityData } = await supabase
          .from('collabs').select('id')
          .eq('template_id', template.id).eq('participation_mode', 'community').eq('period_id', periodId);
        if (communityData) {
          for (const cc of communityData) {
            const { count } = await supabase.from('collab_participants')
              .select('*', { count: 'exact', head: true }).eq('collab_id', cc.id).eq('status', 'active');
            if (count !== null) total += count;
          }
        }
        const { data: localData } = await supabase
          .from('collabs').select('id')
          .eq('template_id', template.id).eq('participation_mode', 'local').eq('period_id', periodId);
        if (localData) {
          for (const lc of localData) {
            const { count } = await supabase.from('collab_participants')
              .select('*', { count: 'exact', head: true }).eq('collab_id', lc.id).eq('status', 'active');
            if (count !== null) total += count;
          }
        }
        counts[template.id] = total;
      } catch {
        counts[template.id] = 0;
      }
    }
    setCommunityParticipantCounts(counts);
  }, [periodId, supabase]);

  // ── data fetch ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      if (!periodId) { setError('No active period found'); setLoading(false); return; }
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError('User not authenticated'); setLoading(false); return; }

        try {
          const { data: profile } = await supabase.from('profiles').select('city').eq('id', user.id).single();
          if (profile?.city) setUserLocation(profile.city);
        } catch { /* non-critical */ }

        // STEP 1: templates
        try {
          const { data: links, error: linksErr } = await supabase
            .from('period_templates').select('template_id').eq('period_id', periodId);
          if (linksErr || !links?.length) throw new Error('no links');
          const ids = links.map(l => l.template_id);
          const { data: tData, error: tErr } = await supabase
            .from('collab_templates').select('id, name, type, display_text, instructions').in('id', ids);
          if (tErr || !tData?.length) throw new Error('no templates');
          const formatted: CollabTemplate[] = tData.map(t => ({
            id: t.id, name: t.name || 'Unnamed', type: t.type as CollabTemplate['type'],
            display_text: t.display_text || '', instructions: t.instructions || '',
          }));
          setTemplates(formatted);
          fetchCommunityParticipantCounts(formatted);
        } catch {
          try {
            const { data: all } = await supabase
              .from('collab_templates').select('id, name, type, display_text, instructions').eq('is_active', true).limit(3);
            if (all?.length) {
              const formatted: CollabTemplate[] = all.map(t => ({
                id: t.id, name: t.name || 'Unnamed', type: t.type as CollabTemplate['type'],
                display_text: t.display_text || '', instructions: t.instructions || '',
              }));
              setTemplates(formatted);
              fetchCommunityParticipantCounts(formatted);
            } else throw new Error('no fallback');
          } catch {
            const dummy: CollabTemplate[] = [
              { id: 'dummy-chain',     name: 'Echoes of the Unseen',     type: 'chain',     display_text: 'A sequential chain collaboration.',         instructions: 'Create a chain where each piece builds on the previous.' },
              { id: 'dummy-theme',     name: 'One Sentence Conspiracy',  type: 'theme',     display_text: 'A topical open-ended collection.',           instructions: 'Submit an image with a one-sentence conspiracy caption.' },
              { id: 'dummy-narrative', name: 'Narrative Example',        type: 'narrative', display_text: 'A story-driven collaborative work.',          instructions: 'Contribute to an ongoing story with images and text.' },
            ];
            setTemplates(dummy);
            setCommunityParticipantCounts({ 'dummy-chain': 8, 'dummy-theme': 12, 'dummy-narrative': 5 });
          }
        }

        // STEP 2: joined collabs
        try {
          const { data: pData, error: pErr } = await supabase
            .from('collab_participants')
            .select('collab_id, participation_mode, location, city')
            .eq('profile_id', user.id).eq('status', 'active');
          if (pErr) throw new Error(pErr.message);
          if (pData?.length) {
            const { data: cData, error: cErr } = await supabase
              .from('collabs')
              .select('id, title, description, type, is_private, metadata, participation_mode, location, template_id')
              .in('id', pData.map(p => p.collab_id));
            if (cErr) throw new Error(cErr.message);
            if (cData?.length) {
              const userJoined: CollabData[] = cData.map(collab => {
                const pr = pData.find(p => p.collab_id === collab.id);
                let mode: CollabData['participation_mode'];
                if (pr?.participation_mode) mode = pr.participation_mode as CollabData['participation_mode'];
                else if (collab.participation_mode) mode = collab.participation_mode as CollabData['participation_mode'];
                else if (collab.is_private) mode = 'private';
                else mode = 'community';
                const loc = collab.location || pr?.location || pr?.city ||
                  (collab.metadata && typeof collab.metadata === 'object' && (collab.metadata as Record<string,unknown>).location
                    ? String((collab.metadata as Record<string,unknown>).location) : null);
                return { id: collab.id, title: collab.title, type: collab.type as CollabData['type'],
                  participation_mode: mode, location: loc, participantCity: pr?.city ?? null,
                  description: collab.description || '', participant_count: 0, is_joined: true,
                  template_id: collab.template_id };
              });
              for (const c of userJoined) {
                const { count } = await supabase.from('collab_participants')
                  .select('*', { count: 'exact', head: true }).eq('collab_id', c.id).eq('status', 'active');
                if (count !== null) c.participant_count = count;
              }
              setJoinedCollabs(userJoined);
            }
          }
        } catch {
          setJoinedCollabs([]);
          try {
            const { getUserCollabs } = await import('@/lib/supabase/collabs');
            const raw = await getUserCollabs(supabase);
            if (raw) {
              const all = [
                ...(raw.private || []) as unknown as ImportedCollab[],
                ...(raw.community || []) as unknown as ImportedCollab[],
                ...(raw.local || []) as unknown as ImportedCollab[],
              ];
              if (all.length) {
                setJoinedCollabs(all.map(c => ({
                  id: c.id, title: c.title,
                  type: (c.type as CollabData['type']) || 'theme',
                  participation_mode: (c.participation_mode as CollabData['participation_mode']) || 'community',
                  location: c.location, description: c.description || '',
                  participant_count: c.participantCount || 0, is_joined: true, template_id: c.template_id,
                })));
              }
            }
          } catch { /* give up */ }
        }

        // STEP 3: available cities
        try {
          const result = await getCitiesWithParticipantCounts(supabase);
          if (result.success && result.cities?.length) {
            setAvailableCities(result.cities);
          } else throw new Error('no cities');
        } catch {
          setAvailableCities([
            { name: 'New York',     state: 'NY', participant_count: 0 },
            { name: 'Los Angeles',  state: 'CA', participant_count: 0 },
            { name: 'Chicago',      state: 'IL', participant_count: 0 },
            { name: 'San Francisco',state: 'CA', participant_count: 0 },
            { name: 'Miami',        state: 'FL', participant_count: 0 },
            { name: 'Austin',       state: 'TX', participant_count: 0 },
          ]);
        }

        setLoading(false);
      } catch {
        setError('An unexpected error occurred');
        setLoading(false);
      }
    };
    fetchData();
  }, [periodId, supabase, userLocation, fetchCommunityParticipantCounts]);

  // ── Report private collab → template mapping to parent for accurate counting ─
  useEffect(() => {
    if (!onPrivateCollabMap) return;
    const map: Record<string, string> = {};
    joinedCollabs.forEach(c => {
      if (c.participation_mode === 'private' && c.template_id) map[c.id] = c.template_id;
    });
    onPrivateCollabMap(map);
  }, [joinedCollabs, onPrivateCollabMap]);

  // ── UI helpers ───────────────────────────────────────────────────────────────
  const toggleDesc = (id: string) => setDescOpen(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const toggleLocalExpand = (id: string) => setLocalOpen(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const cityLabel = (city: City) => `${city.name}${city.state ? ', ' + city.state : ''}`;

  const cityVirtualId = (templateId: string, city: City) =>
    `local_${templateId}_${cityLabel(city).replace(/\s+/g, '_')}`;

  const isCityMine = (templateId: string, city: City): boolean =>
    joinedCollabs.some(c => {
      if (c.participation_mode !== 'local') return false;

      // Match template by ID first, then fall back to title-contains (same logic as userHasJoinedLocal)
      const template = templates.find(t => t.id === templateId);
      const templateMatch =
        c.template_id === templateId ||
        (template && c.title.toLowerCase().includes(template.name.toLowerCase()));
      if (!templateMatch) return false;

      const target = city.name.toLowerCase();

      // 1. Explicit participant city field (collab_participants.city)
      if (c.participantCity) {
        const ref = c.participantCity.toLowerCase().split(',')[0]?.trim() ?? '';
        if (ref && (ref === target || ref.startsWith(target) || target.startsWith(ref))) return true;
      }

      // 2. Collab location field (collabs.location or participant location)
      if (c.location) {
        const ref = c.location.toLowerCase().split(',')[0]?.trim() ?? '';
        if (ref && (ref === target || ref.startsWith(target) || target.startsWith(ref))) return true;
      }

      // 3. Parse from title — local collabs are named "[Template Name] - [City]"
      const dashIdx = c.title.lastIndexOf(' - ');
      if (dashIdx !== -1) {
        const cityFromTitle = c.title.slice(dashIdx + 3).trim().toLowerCase();
        if (cityFromTitle && (cityFromTitle === target || cityFromTitle.startsWith(target) || target.startsWith(cityFromTitle))) return true;
      }

      return false;
    });

  const getSelectionLabel = (id: string): string => {
    if (id.startsWith('community_')) {
      const t = templates.find(t => t.id === id.slice('community_'.length));
      return `${t?.name ?? 'Unknown'} — Community`;
    }
    if (id.startsWith('local_')) {
      const rest = id.slice('local_'.length);
      const sep = rest.indexOf('_');
      if (sep === -1) return id;
      const t = templates.find(t => t.id === rest.slice(0, sep));
      const city = rest.slice(sep + 1).replace(/_/g, ' ');
      return `${t?.name ?? 'Unknown'} — Local (${city})`;
    }
    const joined = joinedCollabs.find(c => c.id === id);
    if (joined) {
      const t = templates.find(t => t.id === joined.template_id);
      const name = t?.name ?? joined.title;
      if (joined.participation_mode === 'community') return `${name} — Community`;
      if (joined.participation_mode === 'local') return `${name} — Local (${joined.location ?? ''})`;
      return `${name} — Private`;
    }
    return id;
  };

  // ── early returns ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <div style={{ width: 24, height: 24, border: '1.5px solid var(--neon-amber)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--lt-text-3)' }}>Loading collaborations…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ margin: '16px 14px', padding: '14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 2, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#ef4444', marginBottom: 4 }}>{error}</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--lt-text-3)' }}>Please try again later.</p>
      </div>
    );
  }

  const sortedTemplates = [...templates].sort((a, b) => {
    const aJ = userHasJoinedPrivate(a.id) || userHasJoinedCommunity(a.id) || userHasJoinedLocal(a.id);
    const bJ = userHasJoinedPrivate(b.id) || userHasJoinedCommunity(b.id) || userHasJoinedLocal(b.id);
    return aJ === bJ ? 0 : aJ ? -1 : 1;
  });

  const q = searchTerm.trim().toLowerCase();
  const visibleTemplates = q
    ? sortedTemplates.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.display_text || '').toLowerCase().includes(q) ||
        (t.instructions || '').toLowerCase().includes(q)
      )
    : sortedTemplates;

  // ── checkmark SVG (reused across all checkboxes) ────────────────────────────
  const Checkmark = () => (
    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
      <polyline points="1,3.5 3.5,6 8,1" stroke="#0f0e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* template list */}
      <div style={{ padding: '4px 14px 6px' }}>
        {visibleTemplates.length === 0 && (
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--lt-text-3)', padding: '16px 4px' }}>
            {q ? `No collaborations match "${searchTerm}".` : 'No collaborations this period.'}
          </p>
        )}

        {visibleTemplates.map((template, idx) => {
          const isDescOpen     = descOpen.has(template.id);
          const isLocalExpanded = localOpen.has(template.id);
          const hasJoined      = userHasJoinedPrivate(template.id) || userHasJoinedCommunity(template.id) || userHasJoinedLocal(template.id);

          const communityVId    = `community_${template.id}`;
          const joinedCommId    = getJoinedCollabId(template.id, 'community');
          const joinedPrivId    = getJoinedCollabId(template.id, 'private');
          const hasJoinedComm   = userHasJoinedCommunity(template.id);
          const hasJoinedPriv   = userHasJoinedPrivate(template.id);

          const isCommunitySelected = joinedCommId
            ? selectedCollabs.includes(joinedCommId)
            : selectedCollabs.includes(communityVId);
          const isPrivateSelected = joinedPrivId
            ? selectedCollabs.includes(joinedPrivId)
            : false;

          const localSelectedIds = availableCities
            .map(c => cityVirtualId(template.id, c))
            .filter(id => selectedCollabs.includes(id));
          const hasSelectedLocal = localSelectedIds.length > 0;

          return (
            <div key={template.id}>
              {idx > 0 && <div style={{ height: 1, background: 'var(--lt-rule)', margin: '4px 0 0' }} />}

              {/* ── name row — full row is clickable ── */}
              <div
                onClick={() => toggleDesc(template.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 4px 0', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--lt-text-2)', flex: 1 }}>
                  {template.name}
                </span>
                {hasJoined && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', color: 'var(--neon-amber)', textShadow: '0 0 8px var(--glow-amber)', flexShrink: 0 }}>
                    ★ you contribute
                  </span>
                )}
              </div>

              {/* ── description panel ── */}
              <div style={{ overflow: 'hidden', maxHeight: isDescOpen ? 160 : 0, opacity: isDescOpen ? 1 : 0, transition: 'max-height 0.22s ease, opacity 0.22s ease' }}>
                <div style={{ padding: '8px 4px 10px', display: 'flex', flexDirection: 'column', gap: 4, borderBottom: '1px solid var(--lt-rule)' }}>
                  {template.display_text && (
                    <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--lt-text-2)', lineHeight: 1.55, margin: 0 }}>
                      {template.display_text}
                    </p>
                  )}
                  {template.instructions && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--lt-text-3)', letterSpacing: '0.02em', lineHeight: 1.5, margin: 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--neon-amber)', textShadow: '0 0 6px var(--glow-amber)', marginRight: 6 }}>Prompt</span>
                      {template.instructions}
                    </p>
                  )}
                </div>
              </div>

              {/* name-spacer */}
              <div style={{ height: 7 }} />

              {/* ── Community row ── */}
              <div
                onClick={() => {
                  if (hasJoinedComm && joinedCommId) toggleItem(joinedCommId);
                  else if (remainingContent > 0 || isCommunitySelected) toggleItem(communityVId);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                  borderLeft: `2px solid ${isCommunitySelected ? 'var(--neon-blue)' : 'transparent'}`,
                  borderRadius: 1, cursor: 'pointer', marginBottom: 2, userSelect: 'none',
                  background: isCommunitySelected ? 'rgba(90,159,212,0.05)' : 'transparent',
                  boxShadow: isCommunitySelected ? '-3px 0 10px -2px var(--glow-blue)' : 'none',
                  transition: 'background 0.1s',
                }}
              >
                <svg style={{ width: 14, height: 14, flexShrink: 0 }} viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="5" r="2.5" stroke="var(--neon-blue)" strokeWidth="1" />
                  <circle cx="3" cy="9" r="1.8" stroke="var(--neon-blue)" strokeWidth="1" />
                  <circle cx="11" cy="9" r="1.8" stroke="var(--neon-blue)" strokeWidth="1" />
                </svg>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--neon-blue)', textShadow: '0 0 6px var(--glow-blue)', width: 76, flexShrink: 0 }}>Community</span>
                <span style={{ flex: 1 }}>
                  {hasJoinedComm && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--neon-amber)', textShadow: '0 0 6px var(--glow-amber)' }}>★</span>}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--lt-text-3)', minWidth: 26, textAlign: 'right' }}>
                  {communityParticipantCounts[template.id] || 0}
                </span>
                <div style={{
                  width: 16, height: 16, borderRadius: 2, flexShrink: 0,
                  border: `1px solid ${isCommunitySelected ? 'var(--neon-blue)' : 'var(--lt-card-bdr)'}`,
                  background: isCommunitySelected ? 'var(--neon-blue)' : 'transparent',
                  boxShadow: isCommunitySelected ? '0 0 6px var(--glow-blue)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.12s, border-color 0.12s',
                }}>
                  {isCommunitySelected && <Checkmark />}
                </div>
              </div>

              {/* ── Local section ── */}
              {availableCities.length > 0 && (
                <div style={{
                  borderLeft: `2px solid ${hasSelectedLocal ? 'var(--neon-green)' : 'var(--lt-rule)'}`,
                  borderRadius: 1, overflow: 'hidden', marginBottom: 2,
                  boxShadow: hasSelectedLocal ? '-3px 0 10px -2px var(--glow-green)' : 'none',
                  transition: 'border-left-color 0.2s, box-shadow 0.2s',
                }}>
                  {/* local header */}
                  <div
                    onClick={() => toggleLocalExpand(template.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer', userSelect: 'none', transition: 'background 0.1s' }}
                  >
                    <svg style={{ width: 14, height: 14, flexShrink: 0 }} viewBox="0 0 14 14" fill="none">
                      <path d="M7 1.5C4.8 1.5 3 3.3 3 5.5c0 3 4 7 4 7s4-4 4-7c0-2.2-1.8-4-4-4z" stroke="var(--neon-green)" strokeWidth="1" />
                      <circle cx="7" cy="5.5" r="1.5" stroke="var(--neon-green)" strokeWidth="1" />
                    </svg>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--neon-green)', textShadow: '0 0 6px var(--glow-green)', width: 76, flexShrink: 0 }}>Local</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--lt-text-3)', letterSpacing: '0.04em' }}>
                        {hasSelectedLocal ? `— ${localSelectedIds.length} selected` : `— ${availableCities.length} cities`}
                      </span>
                      <svg
                        style={{
                          width: 7, height: 7, flexShrink: 0, marginLeft: 4,
                          transition: 'transform 0.18s ease, color 0.18s',
                          transform: isLocalExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          color: isLocalExpanded ? 'var(--neon-green)' : 'var(--lt-text-3)',
                        }}
                        viewBox="0 0 6 10" fill="none"
                      >
                        <polyline points="1,1 5,5 1,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>

                  {/* city rows */}
                  {isLocalExpanded && (
                    <div style={{ borderTop: '1px solid var(--lt-rule)', background: 'rgba(0,0,0,0.15)' }}>
                      {availableCities.map((city, ci) => {
                        const vId  = cityVirtualId(template.id, city);
                        const isSel = selectedCollabs.includes(vId);
                        const isMine = isCityMine(template.id, city);
                        return (
                          <div
                            key={ci}
                            onClick={() => { if (remainingContent > 0 || isSel) toggleItem(vId); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '7px 10px 7px 26px', cursor: 'pointer', userSelect: 'none',
                              borderLeft: `2px solid ${isSel ? 'var(--neon-green)' : 'transparent'}`,
                              borderBottom: ci < availableCities.length - 1 ? '1px solid var(--lt-rule)' : 'none',
                              background: isSel ? 'rgba(78,196,122,0.04)' : 'transparent',
                              boxShadow: isSel ? '-2px 0 8px -2px var(--glow-green)' : 'none',
                              transition: 'background 0.1s',
                            }}
                          >
                            <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--lt-text-2)', fontWeight: 300 }}>
                              {cityLabel(city)}
                              {isMine && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--neon-amber)', textShadow: '0 0 6px var(--glow-amber)', marginLeft: 4 }}>★</span>}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--lt-text-3)', minWidth: 26, textAlign: 'right' }}>
                              {city.participant_count || ''}
                            </span>
                            <div style={{
                              width: 16, height: 16, borderRadius: 2, flexShrink: 0,
                              border: `1px solid ${isSel ? 'var(--neon-green)' : 'var(--lt-card-bdr)'}`,
                              background: isSel ? 'var(--neon-green)' : 'transparent',
                              boxShadow: isSel ? '0 0 6px var(--glow-green)' : 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.12s, border-color 0.12s',
                            }}>
                              {isSel && <Checkmark />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Private row (only if joined) ── */}
              {hasJoinedPriv && joinedPrivId && (() => {
                const isPrivSel = selectedCollabs.includes(joinedPrivId);
                const privCount = joinedCollabs.find(c => c.id === joinedPrivId)?.participant_count ?? 0;
                return (
                  <div
                    onClick={() => toggleItem(joinedPrivId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                      borderLeft: `2px solid ${isPrivSel ? 'var(--neon-purple)' : 'transparent'}`,
                      borderRadius: 1, cursor: 'pointer', marginBottom: 2, userSelect: 'none',
                      background: isPrivSel ? 'rgba(168,136,232,0.05)' : 'transparent',
                      boxShadow: isPrivSel ? '-3px 0 10px -2px var(--glow-purple)' : 'none',
                      transition: 'background 0.1s',
                    }}
                  >
                    <svg style={{ width: 14, height: 14, flexShrink: 0 }} viewBox="0 0 14 14" fill="none">
                      <rect x="3" y="6" width="8" height="6" rx="1" stroke="var(--neon-purple)" strokeWidth="1" />
                      <path d="M5 6V4.5a2 2 0 0 1 4 0V6" stroke="var(--neon-purple)" strokeWidth="1" />
                    </svg>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--neon-purple)', textShadow: '0 0 6px var(--glow-purple)', width: 76, flexShrink: 0 }}>Private</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--neon-amber)', textShadow: '0 0 6px var(--glow-amber)' }}>★</span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--lt-text-3)', minWidth: 26, textAlign: 'right' }}>
                      {privCount || ''}
                    </span>
                    <div style={{
                      width: 16, height: 16, borderRadius: 2, flexShrink: 0,
                      border: `1px solid ${isPrivSel ? 'var(--neon-purple)' : 'var(--lt-card-bdr)'}`,
                      background: isPrivSel ? 'var(--neon-purple)' : 'transparent',
                      boxShadow: isPrivSel ? '0 0 6px var(--glow-purple)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.12s, border-color 0.12s',
                    }}>
                      {isPrivSel && <Checkmark />}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* ── footer ── */}
      <div style={{ margin: '8px 14px 16px', padding: '12px 14px', background: 'var(--lt-card)', border: '1px solid var(--lt-card-bdr)', borderRadius: 2 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lt-text-3)', marginBottom: 7 }}>
          Added to magazine
        </div>
        {selectedCollabs.length > 0 ? (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--lt-text)', lineHeight: 2, fontWeight: 300 }}>
            {selectedCollabs.map(id => (
              <div key={id}>{getSelectionLabel(id)}</div>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--lt-text-3)' }}>
            Nothing selected yet
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegratedCollabsSection;
