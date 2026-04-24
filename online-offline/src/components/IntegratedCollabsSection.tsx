// IntegratedCollabsSection.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getCitiesWithParticipantCounts } from '@/lib/supabase/collabLibrary';

interface CollabData {
  id: string;
  title: string;
  type: 'chain' | 'theme' | 'narrative';
  participation_mode: 'community' | 'local' | 'private';
  location?: string | null;
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
}) => {
  const supabase = createClientComponentClient();

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
                  participation_mode: mode, location: loc, description: collab.description || '',
                  participant_count: 0, is_joined: true, template_id: collab.template_id };
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
            const raw = await getUserCollabs();
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
          const result = await getCitiesWithParticipantCounts();
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
    joinedCollabs.some(c =>
      c.template_id === templateId &&
      c.participation_mode === 'local' &&
      !!(c.location && c.location.toLowerCase().startsWith(city.name.toLowerCase()))
    );

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
      return `${t?.name ?? joined.title} — Private`;
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

  // ── render (stage 2 placeholder) ─────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      <div style={{ padding: '4px 14px 6px' }}>
        {sortedTemplates.map((t, i) => (
          <div key={t.id} style={{ padding: '12px 4px', color: 'var(--lt-text-2)', borderBottom: i < sortedTemplates.length - 1 ? '1px solid var(--lt-rule)' : 'none' }}>
            {t.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default IntegratedCollabsSection;
