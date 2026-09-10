'use client';
// IntegratedCollabsSection.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { getCitiesWithParticipantCounts } from '@/lib/supabase/collabLibrary';
import { Pill, Sheet, SectionLabel, Brief, SERIF, SANS, MONO } from '@/components/v2';

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
  /** Read-only: display names keyed by selection id (community_<tid>, local_<tid>_<City>,
   *  or a collab id) so the parent's meter sheet can label picks by name. Nothing written. */
  onCollabLabels?: (labels: Record<string, string>) => void;
}

interface City {
  city: string;
  count: number;
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

// Pure helpers (no state) — the local selection id shape the save path parses.
const cityLabel = (city: City) => city.city;
const cityVirtualId = (templateId: string, city: City) =>
  `local_${templateId}_${cityLabel(city).replace(/\s+/g, '_')}`;

// One-time first-visit explainer for the gold dot (same localStorage pattern as the invite legend).
const LEGEND_KEY = 'oo_collabs_legend_seen';

const IntegratedCollabsSection: React.FC<CollabsSectionProps> = ({
  periodId,
  selectedCollabs,
  toggleItem,
  remainingContent,
  onPrivateCollabMap,
  searchTerm = '',
  onCollabLabels,
}) => {
  const supabase = useSupabase();

  // ── data state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<CollabTemplate[]>([]);
  const [joinedCollabs, setJoinedCollabs] = useState<CollabData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [citiesByTemplate, setCitiesByTemplate] = useState<Record<string, City[]>>({});
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [communityParticipantCounts, setCommunityParticipantCounts] = useState<Record<string, number>>({});

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [descOpen, setDescOpen] = useState<Set<string>>(new Set());
  // Local pill → city Sheet; holds the template id whose cities are showing.
  const [citySheetFor, setCitySheetFor] = useState<string | null>(null);
  // First-visit "● marks collabs you contribute to" line; dismissed by any tap or on the next visit.
  const [showLegend, setShowLegend] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(LEGEND_KEY)) { setShowLegend(true); localStorage.setItem(LEGEND_KEY, '1'); }
    } catch { /* storage unavailable — no legend */ }
  }, []);

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
              .select('*', { count: 'exact', head: true }).eq('collab_id', cc.id).eq('status', 'active')
              .or('invite_status.is.null,invite_status.eq.accepted');
            if (count !== null) total += count;
          }
        }
        const { data: localData } = await supabase
          .from('collabs').select('id')
          .eq('template_id', template.id).eq('participation_mode', 'local').eq('period_id', periodId);
        if (localData) {
          for (const lc of localData) {
            const { count } = await supabase.from('collab_participants')
              .select('*', { count: 'exact', head: true }).eq('collab_id', lc.id).eq('status', 'active')
              .or('invite_status.is.null,invite_status.eq.accepted');
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
                  .select('*', { count: 'exact', head: true }).eq('collab_id', c.id).eq('status', 'active')
                  .or('invite_status.is.null,invite_status.eq.accepted');
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

        // STEP 3: cities grouped by template — live query filtered to active period
        const cityResult = await getCitiesWithParticipantCounts(supabase, periodId);
        if (cityResult.success && cityResult.citiesByTemplate) {
          setCitiesByTemplate(cityResult.citiesByTemplate);
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
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const isCityMine = (templateId: string, city: City): boolean =>
    joinedCollabs.some(c => {
      if (c.participation_mode !== 'local') return false;

      // Match template by ID first, then fall back to title-contains (same logic as userHasJoinedLocal)
      const template = templates.find(t => t.id === templateId);
      const templateMatch =
        c.template_id === templateId ||
        (template && c.title.toLowerCase().includes(template.name.toLowerCase()));
      if (!templateMatch) return false;

      const target = city.city.toLowerCase();

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

  // ── Report display names to the parent (read-only; the meter sheet labels
  //    collab picks by name instead of by id shape). Keys are the exact selection
  //    ids this component emits — nothing about what is written changes. ──────
  useEffect(() => {
    if (!onCollabLabels) return;
    const labels: Record<string, string> = {};
    templates.forEach(t => {
      labels[`community_${t.id}`] = t.name;
      (citiesByTemplate[t.id] ?? []).forEach(city => {
        labels[cityVirtualId(t.id, city)] = `${t.name} · ${city.city}`;
      });
    });
    joinedCollabs.forEach(c => {
      const t = templates.find(x => x.id === c.template_id);
      const name = t?.name ?? c.title;
      labels[c.id] = c.participation_mode === 'local' && c.location ? `${name} · ${c.location}` : name;
    });
    onCollabLabels(labels);
  }, [templates, citiesByTemplate, joinedCollabs, onCollabLabels]);

  // ── early returns ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <p style={{ margin: 0, padding: '24px 0', font: `400 12px/1 ${MONO}`, color: 'var(--ink3)' }}>loading…</p>
    );
  }

  if (error) {
    return (
      <p style={{ margin: 0, padding: '24px 0', font: `italic 400 14px/1.4 ${SERIF}`, color: 'var(--ink3)' }}>
        {error}. Please try again later.
      </p>
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

  // User-created private collabs (template_id = null) — never inside the template loop.
  const userCreated = joinedCollabs.filter(c => c.participation_mode === 'private' && !c.template_id);

  // City sheet target (local pill → Sheet). Each city row is exactly the old per-city toggle.
  const sheetTemplate = citySheetFor ? templates.find(t => t.id === citySheetFor) ?? null : null;
  const sheetCities = sheetTemplate ? (citiesByTemplate[sheetTemplate.id] ?? []) : [];

  // ── v2 pieces (design `.bcol` / `.pills` / `.city`) ──────────────────────────
  // Gold "yours" marker: 5px dot + 10px mono label so the dot is self-explaining (Phase 12).
  const GoldDot = () => (
    <span
      role="img"
      aria-label="You contribute to this collaboration"
      title="You contribute to this collaboration"
      style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', verticalAlign: 'middle', marginLeft: 8 }}
    />
  );

  const titleButton = (label: string, joined: boolean, open: boolean, onClick?: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={onClick ? open : undefined}
      style={{
        flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', borderWidth: 0, padding: 0,
        cursor: onClick ? 'pointer' : 'default', font: `400 20px/1.15 ${SERIF}`, color: 'var(--ink)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {label}
      {joined && <GoldDot />}
    </button>
  );

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div onClickCapture={showLegend ? () => setShowLegend(false) : undefined}>
      {showLegend && (
        <div style={{ padding: '12px 0 0', font: `400 10px/1 ${MONO}`, letterSpacing: '0.06em', color: 'var(--ink3)' }}>
          <span style={{ color: 'var(--gold)' }}>●</span> marks collabs you contribute to
        </div>
      )}
      {visibleTemplates.length === 0 && (
        <p style={{ margin: 0, padding: '16px 0', font: `italic 400 14px/1.4 ${SERIF}`, color: 'var(--ink3)' }}>
          {q ? `No collaborations match “${searchTerm}”.` : 'No collaborations this period.'}
        </p>
      )}

      {visibleTemplates.map((template) => {
        const isDescOpen     = descOpen.has(template.id);
        const hasJoined      = userHasJoinedPrivate(template.id) || userHasJoinedCommunity(template.id) || userHasJoinedLocal(template.id);

        const communityVId    = `community_${template.id}`;
        const joinedCommId    = getJoinedCollabId(template.id, 'community');
        const joinedPrivId    = getJoinedCollabId(template.id, 'private');
        const hasJoinedComm   = userHasJoinedCommunity(template.id);
        const hasJoinedPriv   = userHasJoinedPrivate(template.id);

        const isCommunitySelected = joinedCommId
          ? selectedCollabs.includes(joinedCommId)
          : selectedCollabs.includes(communityVId);

        const templateCities = citiesByTemplate[template.id] ?? [];
        const localSelectedIds = templateCities
          .map(c => cityVirtualId(template.id, c))
          .filter(id => selectedCollabs.includes(id));
        const hasSelectedLocal = localSelectedIds.length > 0;

        const isPrivSel = joinedPrivId ? selectedCollabs.includes(joinedPrivId) : false;
        const privCount = joinedPrivId ? (joinedCollabs.find(c => c.id === joinedPrivId)?.participant_count ?? 0) : 0;
        const hasDetail = !!(template.display_text || template.instructions);

        return (
          <div key={template.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
            {/* ── name row: serif title (tap → description + Prompt), gold dot if yours, pills ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {titleButton(template.name, hasJoined, isDescOpen, hasDetail ? () => toggleDesc(template.id) : undefined)}

              <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                {/* Community — THE PILL IS THE TOGGLE (same call as the old row) */}
                <Pill
                  accent="blue"
                  icon="people"
                  count={communityParticipantCounts[template.id] || 0}
                  selected={isCommunitySelected}
                  dimmed={!isCommunitySelected && remainingContent === 0}
                  aria-label={`Community · ${template.name}`}
                  onClick={() => {
                    if (hasJoinedComm && joinedCommId) toggleItem(joinedCommId);
                    else if (remainingContent > 0 || isCommunitySelected) toggleItem(communityVId);
                  }}
                />

                {/* Local — opens the city sheet; count = cities selected */}
                {templateCities.length > 0 && (
                  <Pill
                    accent="green"
                    icon="pin"
                    count={localSelectedIds.length}
                    selected={hasSelectedLocal}
                    dimmed={!hasSelectedLocal && remainingContent === 0}
                    chevron
                    aria-label={`Local · ${template.name} — choose cities`}
                    aria-haspopup="dialog"
                    onClick={() => setCitySheetFor(template.id)}
                  />
                )}

                {/* Private — only if joined; the pill is the toggle */}
                {hasJoinedPriv && joinedPrivId && (
                  <Pill
                    accent="purple"
                    icon="lock"
                    count={privCount}
                    selected={isPrivSel}
                    dimmed={!isPrivSel && remainingContent === 0}
                    aria-label={`Private · ${template.name}`}
                    onClick={() => toggleItem(joinedPrivId)}
                  />
                )}
              </div>
            </div>

            {/* ── description + Prompt, inline under the row ── */}
            {isDescOpen && hasDetail && (
              <div>
                {template.display_text && (
                  <p style={{ margin: '10px 0 2px', font: `italic 400 14px/1.45 ${SERIF}`, color: 'var(--ink2)' }}>
                    {template.display_text}
                  </p>
                )}
                {template.instructions && (
                  <Brief style={{ marginTop: 10 }}>{template.instructions}</Brief>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── YOUR PRIVATE COLLABS — user-created (template_id = null), same filter, same toggle ── */}
      {userCreated.length > 0 && (
        <div style={{ paddingTop: 16 }}>
          <SectionLabel>Your private collabs</SectionLabel>
          {userCreated.map((collab, i) => {
            const isSel = selectedCollabs.includes(collab.id);
            const isOpen = descOpen.has(collab.id);
            return (
              <div key={collab.id} style={{ padding: '16px 0', borderBottom: i === userCreated.length - 1 ? 'none' : '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {titleButton(collab.title, true, isOpen, collab.description ? () => toggleDesc(collab.id) : undefined)}
                  <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                    <Pill
                      accent="purple"
                      icon="lock"
                      count={collab.participant_count || 0}
                      selected={isSel}
                      dimmed={!isSel && remainingContent === 0}
                      aria-label={`Private · ${collab.title}`}
                      onClick={() => toggleItem(collab.id)}
                    />
                  </div>
                </div>
                {isOpen && collab.description && (
                  <p style={{ margin: '10px 0 2px', font: `italic 400 14px/1.45 ${SERIF}`, color: 'var(--ink2)' }}>
                    {collab.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── City sheet (design "Curate city sheet"): name · count · checkbox · gold dot if yours.
          Each row is EXACTLY the old per-city toggle: same cityVirtualId, same gate. ── */}
      <Sheet
        open={sheetTemplate !== null}
        onClose={() => setCitySheetFor(null)}
        title={sheetTemplate ? `${sheetTemplate.name} · Local` : ''}
        subtitle={`Each city is one page. ${remainingContent} open.`}
      >
        {sheetTemplate && sheetCities.map((city, ci) => {
          const vId  = cityVirtualId(sheetTemplate.id, city);
          const isSel = selectedCollabs.includes(vId);
          const isMine = isCityMine(sheetTemplate.id, city);
          const dimmed = !isSel && remainingContent === 0;
          return (
            <button
              key={ci}
              type="button"
              role="checkbox"
              aria-checked={isSel}
              onClick={() => { if (remainingContent > 0 || isSel) toggleItem(vId); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 0',
                background: 'transparent', borderWidth: '1px 0 0', borderStyle: 'solid', borderColor: 'var(--line)',
                font: `400 15px/1 ${SANS}`, color: isSel ? 'var(--ink)' : 'var(--ink2)', textAlign: 'left',
                cursor: 'pointer', opacity: dimmed ? 0.4 : 1, WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                {cityLabel(city)}
                {isMine && <GoldDot />}
              </span>
              <span style={{ font: `400 12px/1 ${MONO}`, color: 'var(--ink3)' }}>{city.count || ''}</span>
              <span
                aria-hidden="true"
                style={{
                  width: 20, height: 20, borderRadius: 4, flex: 'none', display: 'grid', placeItems: 'center',
                  borderWidth: 1, borderStyle: 'solid', borderColor: isSel ? 'var(--green)' : 'var(--line2)',
                  background: isSel ? 'color-mix(in oklch, var(--green) 12%, transparent)' : 'transparent',
                }}
              >
                {isSel && (
                  <span style={{ width: 9, height: 5, borderLeft: '1.5px solid var(--green)', borderBottom: '1.5px solid var(--green)', transform: 'rotate(-45deg) translate(1px, -1px)' }} />
                )}
              </span>
            </button>
          );
        })}
      </Sheet>
    </div>
  );
};

export default IntegratedCollabsSection;
