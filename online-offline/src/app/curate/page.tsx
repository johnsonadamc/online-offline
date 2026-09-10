"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import IntegratedCollabsSection from '@/components/IntegratedCollabsSection';
import { PageShell, Sheet, Toast, SearchField, Icon, TypeTile, typeAccent, accentVar, SERIF, SANS, MONO } from '@/components/v2';
import type { Accent, TileType, IconName } from '@/components/v2';

import { getCurrentPeriod } from '@/lib/supabase/content';
import { saveCuratorSelections } from '@/lib/supabase/curation';
import { sendFollowRequest } from '@/lib/supabase/profiles';

type BarKind = 'contributor' | 'community' | 'local' | 'private' | 'comms' | 'ad';
const barColor: Record<BarKind, string> = {
  contributor: 'var(--orange)',
  community: 'var(--blue)',
  local: 'var(--green)',
  private: 'var(--purple)',
  comms: 'var(--gold)',
  ad: 'var(--ink2)',
};

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Creator {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  bio: string;
  creatorType: string;
  contentType: string;
  tags: string[];
  lastPost: string;
  avatar: string;
  identityBannerUrl?: string;
  previousQuarter: boolean;
  type: 'friend';
  isPrivate?: boolean;
}

interface Ad {
  id: string;
  name: string;
  bio: string;
  lastPost: string;
  avatar: string;
  type: 'ad';
  discount: number;
}

interface Period {
  id: string;
  name: string;
  season: string;
  year: number;
  end_date: string;
  is_active?: boolean;
}

interface Communication {
  id: string;
  subject: string;
  sender_id: string;
  is_selected?: boolean;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export interface Collaboration {
  id: string;
  title: string;
  type?: 'chain' | 'theme' | 'narrative';
  participation_mode: 'private' | 'local' | 'community';
  participant_count?: number;
  participantCount?: number;
  location?: string | null;
  description?: string;
  is_private?: boolean;
  participants?: Array<{ name: string; role: string }>;
  last_active?: string;
  is_joined?: boolean;
}

export interface CollabTemplate {
  id: string;
  title: string;
  type: 'chain' | 'theme' | 'narrative';
  description: string;
  instructions?: string;
  display_text?: string;
  requirements?: string;
}

// ── Period data extraction (handles 3 Supabase response shapes) ───────────────

function extractPeriodData(response: unknown): Period | null {
  if (!response) return null;

  const resp = response as Record<string, unknown>;

  const createPeriodFromObject = (obj: Record<string, unknown>): Period | null => {
    if (
      typeof obj.id === 'string' &&
      typeof obj.name === 'string' &&
      typeof obj.season === 'string' &&
      typeof obj.year === 'number' &&
      typeof obj.end_date === 'string'
    ) {
      return {
        id: obj.id,
        name: obj.name,
        season: obj.season,
        year: obj.year,
        end_date: obj.end_date,
        is_active: typeof obj.is_active === 'boolean' ? obj.is_active : undefined,
      };
    }
    return null;
  };

  if (resp.id && resp.name && resp.season && resp.year && resp.end_date) {
    return createPeriodFromObject(resp);
  }
  if (resp.period && typeof resp.period === 'object') {
    const p = resp.period as Record<string, unknown>;
    if (p.id && p.name && p.season && p.year && p.end_date) return createPeriodFromObject(p);
  }
  if (resp.success === true && resp.period && typeof resp.period === 'object') {
    const p = resp.period as Record<string, unknown>;
    if (p.id && p.name && p.season && p.year && p.end_date) return createPeriodFromObject(p);
  }

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CurationInterface() {
  const router = useRouter();
  const supabase = useSupabase();
  const baseQuarterlyPrice = 25;
  const adDiscountAmount = 2;
  const maxContentPieces = 20;

  // ── Existing state (unchanged) ─────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [selectedCommunications, setSelectedCommunications] = useState<string[]>([]);
  const [selectedCollabs, setSelectedCollabs] = useState<string[]>([]);
  const [privateCollabTemplateMap, setPrivateCollabTemplateMap] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [savingSelections, setSavingSelections] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState(false);
  const [hasAddress, setHasAddress] = useState(true);
  const [addressBannerDismissed, setAddressBannerDismissed] = useState(false);
  const [pendingRequestMap, setPendingRequestMap] = useState<Record<string, boolean>>({});
  const [accessibleProfiles, setAccessibleProfiles] = useState<string[]>([]);

  // ── Visual-only UI state ───────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<'contributors' | 'collabs' | 'comms' | 'ads'>('contributors');
  const [searchOpen, setSearchOpen] = useState(false);
  // Contributors tab: filter chips (client-side on contentType; Writing = poetry + essay).
  // Never touches the save payload.
  const [typeFilter, setTypeFilter] = useState<'all' | 'photography' | 'art' | 'writing'>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; accent: 'green' | 'orange' } | null>(null);
  // Page meter: the selection keys that were already saved when the page loaded
  // (re-snapshotted after Save / Reset). A bar whose key is NOT in this set glows
  // as "added this session". Read-only derivation — nothing here is written.
  const [savedKeys, setSavedKeys] = useState<Set<string>>(() => new Set());
  const savedSnapshotTaken = React.useRef(false);

  // ── CustomEvent listener from IntegratedCollabsSection (unchanged) ─────────
  useEffect(() => {
    const handleDirectCollabsUpdate = (e: CustomEvent<{ updatedCollabs: string[] }>) => {
      if (e.detail && e.detail.updatedCollabs) {
        setSelectedCollabs(e.detail.updatedCollabs);
      }
    };
    window.addEventListener('updateSelectedCollabs', handleDirectCollabsUpdate as EventListener);
    return () => {
      window.removeEventListener('updateSelectedCollabs', handleDirectCollabsUpdate as EventListener);
    };
  }, []);

  // ── Computed values ────────────────────────────────────────────────────────
  // Collab count = number of items in selectedCollabs.
  // toggleItem prevents duplicate IDs, so selectedCollabs is already a unique list.
  // This matches the "Added to magazine" footer which renders one row per entry.
  const collabSlotCount = selectedCollabs.filter(id => id.trim() !== '').length;

  const usedSlots = selectedCreators.length + selectedAds.length +
    selectedCommunications.length + collabSlotCount;
  const remainingContent = maxContentPieces - usedSlots;

  // ── Data helpers (unchanged) ───────────────────────────────────────────────
  const loadAccessibleProfiles = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error: accessError } = await supabase
        .from('profile_connections')
        .select('followed_id')
        .eq('follower_id', user.id)
        .eq('status', 'approved');
      if (accessError) return;
      setAccessibleProfiles(data?.map(item => item.followed_id) || []);
    } catch (err) {
      console.error('Error loading accessible profiles:', err);
    }
  }, [supabase]);

  const getPeriodId = async (): Promise<string | null> => {
    if (currentPeriod?.id) return currentPeriod.id;
    try {
      const periodData = await getCurrentPeriod(supabase);
      const extracted = extractPeriodData(periodData);
      if (extracted?.id) {
        setCurrentPeriod(extracted);
        return extracted.id;
      }
      return null;
    } catch (err) {
      console.error('Error fetching period:', err);
      return null;
    }
  };

  const isAnyVersionSelected = (collabId: string) => {
    if (collabId.startsWith('community_')) {
      const templateId = collabId.split('community_')[1];
      return selectedCollabs.some(id => id.startsWith(`local_${templateId}_`));
    }
    if (collabId.startsWith('local_')) {
      const parts = collabId.split('_');
      if (parts.length >= 3) {
        const templateId = parts[1];
        return selectedCollabs.includes(`community_${templateId}`);
      }
    }
    return false;
  };

  const toggleItem = (id: string, type: 'friend' | 'ad' | 'collab' | 'communication') => {
    if (type === 'ad') {
      if (selectedAds.includes(id)) {
        setSelectedAds(selectedAds.filter(adId => adId !== id));
      } else if (remainingContent > 0) {
        setSelectedAds([...selectedAds, id]);
      }
    } else if (type === 'friend') {
      if (selectedCreators.includes(id)) {
        setSelectedCreators(selectedCreators.filter(cid => cid !== id));
      } else if (remainingContent > 0) {
        setSelectedCreators([...selectedCreators, id]);
      }
    } else if (type === 'collab') {
      if (selectedCollabs.includes(id)) {
        setSelectedCollabs(current => current.filter(cid => cid !== id));
      } else if (remainingContent > 0 || isAnyVersionSelected(id)) {
        setSelectedCollabs(current => [...current, id]);
      }
      setTimeout(() => {
        const newState = selectedCollabs.includes(id)
          ? selectedCollabs.filter(cid => cid !== id)
          : (remainingContent > 0 || isAnyVersionSelected(id))
            ? [...selectedCollabs, id]
            : selectedCollabs;
        localStorage.setItem('temp_selected_collabs', JSON.stringify(newState));
      }, 10);
    } else if (type === 'communication') {
      if (selectedCommunications.includes(id)) {
        setSelectedCommunications([]);
      } else if (remainingContent > 0) {
        setSelectedCommunications([id]);
      }
    }
  };

  const handleRequestFollow = async (creatorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await sendFollowRequest(supabase, creatorId);
    if (result.success) {
      setPendingRequestMap(prev => ({ ...prev, [creatorId]: true }));
      alert('Follow request sent!');
    } else {
      alert(`Error: ${result.error || 'Failed to send request'}`);
    }
  };

  // ── Save handler ───────────────────────────────────────────────────────────
  const saveSelections = async () => {
    setAddressError(false);
    setSavingSelections(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('User not authenticated');

      const periodId = await getPeriodId();
      if (!periodId) throw new Error('No active period found');

      const result = await saveCuratorSelections(supabase, {
        curator_id: userData.user.id,
        period_id: periodId,
        selected_contributors: selectedCreators,
        selected_collaborations: selectedCollabs,
        selected_communications: selectedCommunications,
        selected_ads: selectedAds,
      });

      if (!result.success) throw new Error(result.error || 'Failed to save selections');

      localStorage.setItem(`magazine_selections_${userData.user.id}`, JSON.stringify({
        contributors: selectedCreators,
        collaborations: selectedCollabs,
        communications: selectedCommunications,
        campaigns: selectedAds,
      }));
      localStorage.removeItem('temp_selected_collabs');

      const { data: addrData } = await supabase
        .from('profiles').select('address_line1').eq('id', userData.user.id).maybeSingle();
      const addrOk = !!(addrData?.address_line1 && String(addrData.address_line1).trim());
      setHasAddress(addrOk);

      setSavedKeys(new Set(selectionKeys));

      if (!addrOk) {
        setAddressBannerDismissed(false);
        setToast({ message: 'Selections saved. Add your mailing address in your profile to receive your printed edition.', accent: 'green' });
      } else {
        setToast({ message: 'Your magazine selections have been saved.', accent: 'green' });
        setTimeout(() => router.push('/dashboard'), 1200);
      }
    } catch (saveError) {
      console.error('Error saving selections:', saveError);
      setToast({
        message: 'There was an error saving your selections. ' +
          (saveError instanceof Error ? saveError.message : 'Unknown error'),
        accent: 'orange',
      });
    } finally {
      setSavingSelections(false);
    }
  };


  // ── Reset handler ──────────────────────────────────────────────────────────
  const handleReset = () => {
    if (!window.confirm('Reset all selections? This cannot be undone.')) return;
    setSelectedCollabs([]);
    setSelectedCreators([]);
    setSelectedAds([]);
    setSelectedCommunications([]);
    localStorage.removeItem('temp_selected_collabs');
    localStorage.removeItem('selected_cities');

    const cleanupDB = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) localStorage.removeItem(`magazine_selections_${user.id}`);
      if (user && currentPeriod?.id) {
        await supabase.from('curator_collab_selections').delete()
          .eq('curator_id', user.id).eq('period_id', currentPeriod.id);
        await supabase.from('curator_creator_selections').delete()
          .eq('curator_id', user.id).eq('period_id', currentPeriod.id);
        await supabase.from('curator_campaign_selections').delete()
          .eq('curator_id', user.id).eq('period_id', currentPeriod.id);
      }
    };
    cleanupDB();
    setSavedKeys(new Set());
    setToast({ message: 'All selections have been reset', accent: 'green' });
  };

  // ── Price calculation ──────────────────────────────────────────────────────
  const calculatePrice = () => baseQuarterlyPrice - (selectedAds.length * adDiscountAmount);

  // ── Stable creator order — sorted once on load, never re-sorted on selection ─
  // selectedCreators intentionally excluded from deps so selecting a tile
  // does not reorder the grid (which would reset scroll position).
  // The sort reflects selections restored from localStorage on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSortedCreators = React.useMemo(() => {
    return [...creators]
      .filter(c => !c.isPrivate || accessibleProfiles.includes(c.id))
      .sort((a, b) => {
        const aSelected = selectedCreators.includes(a.id);
        const bSelected = selectedCreators.includes(b.id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return 0;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creators, accessibleProfiles]);

  const filteredCreators = stableSortedCreators.filter(c =>
    searchTerm === '' ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.bio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAds = ads.filter(ad =>
    searchTerm === '' ||
    ad.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ad.bio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCommunications = communications.filter(comm =>
    searchTerm === '' ||
    comm.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${comm.profiles.first_name} ${comm.profiles.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Data loading (unchanged) ───────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user: debugUser } } = await supabase.auth.getUser();
        console.log('curate page user:', debugUser?.id);

        if (debugUser) {
          const { data: addrData } = await supabase
            .from('profiles').select('address_line1').eq('id', debugUser.id).maybeSingle();
          setHasAddress(!!(addrData?.address_line1 && String(addrData.address_line1).trim()));
        }

        setLoading(true);
        setCreators([]);
        setAds([]);

        let activePeriodId: string | null = null;
        try {
          const periodData = await getCurrentPeriod(supabase);
          const extracted = extractPeriodData(periodData);
          if (extracted) {
            setCurrentPeriod(extracted);
            activePeriodId = extracted.id;
          }
        } catch (err) {
          console.error('Error fetching period data:', err);
        }

        try {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url, identity_banner_url, content_type, is_public, bio')
            .order('first_name');

          if (!profilesError && profilesData) {
            const formattedCreators: Creator[] = profilesData.map(profile => ({
              id: profile.id,
              name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unnamed Creator',
              firstName: profile.first_name || '',
              lastName: profile.last_name || '',
              bio: profile.bio || '',
              creatorType: 'Contributor',
              contentType: profile.content_type || 'photo',
              tags: [],
              lastPost: '',
              avatar: profile.avatar_url || `/api/placeholder/400/400?text=${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`,
              identityBannerUrl: profile.identity_banner_url || undefined,
              previousQuarter: false,
              type: 'friend' as const,
              isPrivate: !profile.is_public,
            }));
            setCreators(formattedCreators);
            await loadAccessibleProfiles();
          }
        } catch (err) {
          console.error('Error fetching profiles:', err);
        }

        try {
          const campaignQuery = supabase
            .from('campaigns')
            .select('id, name, bio, last_post, avatar_url, discount')
            .eq('is_active', true);
          const { data: campaignData, error: campaignError } = await (
            activePeriodId ? campaignQuery.eq('period_id', activePeriodId) : campaignQuery
          );
          if (!campaignError && campaignData && campaignData.length > 0) {
            setAds(campaignData.map(c => ({
              id: c.id,
              name: c.name || '',
              bio: c.bio || '',
              lastPost: c.last_post || '',
              avatar: c.avatar_url || `/api/placeholder/400/400?text=${(c.name || 'AD').substring(0, 2).toUpperCase()}`,
              type: 'ad' as const,
              discount: typeof c.discount === 'number' ? c.discount : 2,
            })));
          } else {
            if (campaignError) console.error('Error fetching campaigns:', campaignError);
            setAds([]);
          }
        } catch (err) {
          console.error('Error fetching campaigns:', err);
          setAds([]);
        }

        setCommunications([
          { id: 'comm1', subject: 'Thoughts on my latest series', sender_id: 'user1', profiles: { first_name: 'Sarah', last_name: 'Chen', avatar_url: '/api/placeholder/400/400?text=SC' } },
          { id: 'comm2', subject: 'Collaboration opportunity', sender_id: 'user2', profiles: { first_name: 'Marcus', last_name: 'Johnson', avatar_url: '/api/placeholder/400/400?text=MJ' } },
        ]);

        if (debugUser && activePeriodId) {
          try {
            const [creatorSel, campaignSel, collabSel, commSel] = await Promise.all([
              supabase.from('curator_creator_selections').select('creator_id').eq('curator_id', debugUser.id).eq('period_id', activePeriodId),
              supabase.from('curator_campaign_selections').select('campaign_id').eq('curator_id', debugUser.id).eq('period_id', activePeriodId),
              supabase.from('curator_collab_selections').select('collab_id, source_id').eq('curator_id', debugUser.id).eq('period_id', activePeriodId),
              supabase.from('curator_communication_selections').select('include_communications').eq('curator_id', debugUser.id).eq('period_id', activePeriodId).maybeSingle(),
            ]);
            if (creatorSel.data) setSelectedCreators(creatorSel.data.map((s: { creator_id: string }) => s.creator_id).filter(Boolean));
            if (campaignSel.data) setSelectedAds(campaignSel.data.map((s: { campaign_id: string }) => s.campaign_id).filter(Boolean));
            if (collabSel.data) setSelectedCollabs(collabSel.data.map((s: { source_id?: string; collab_id: string }) => s.source_id || s.collab_id).filter(Boolean));
            if (commSel.data?.include_communications) setSelectedCommunications(['communications']);
          } catch (err) {
            console.error('Error loading selections from DB:', err);
          }
        }

        setLoading(false);
      } catch (err) {
        setError('An unexpected error occurred loading data');
        console.error('Error in loadData:', err);
        setLoading(false);
      }
    }
    loadData();
  }, [supabase, loadAccessibleProfiles]);

  useEffect(() => {
    if (!loading) {
      try {
        const saved = localStorage.getItem('temp_selected_collabs');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (selectedCollabs.length === 0) setSelectedCollabs(parsed);
        }
      } catch (err) {
        console.error('Error parsing saved collaborations:', err);
      }
    }
  }, [loading, selectedCollabs.length]);

  // ── Page meter composition (read-only) ─────────────────────────────────────
  // One key per slot, in meter order: contributors, then collabs by mode
  // (community → local → private), then the communications page, then ads.
  // Mode is parsed from the id shape (community_<tid> / local_<tid>_<City> / private = collab id).
  const collabMode = (id: string): 'community' | 'local' | 'private' =>
    id.startsWith('community_') ? 'community' : id.startsWith('local_') ? 'local' : 'private';
  const selectedCollabIds = selectedCollabs.filter(id => id.trim() !== '');
  const orderedCollabs = (['community', 'local', 'private'] as const)
    .flatMap(mode => selectedCollabIds.filter(id => collabMode(id) === mode));
  const selectionKeys: string[] = [
    ...selectedCreators.map(id => `c:${id}`),
    ...orderedCollabs.map(id => `k:${id}`),
    ...(selectedCommunications.length > 0 ? ['comm'] : []),
    ...selectedAds.map(id => `a:${id}`),
  ];
  const barSlots: { kind: BarKind; saved: boolean }[] = [
    ...selectedCreators.map(id => ({ kind: 'contributor' as BarKind, saved: savedKeys.has(`c:${id}`) })),
    ...orderedCollabs.map(id => ({ kind: collabMode(id) as BarKind, saved: savedKeys.has(`k:${id}`) })),
    ...(selectedCommunications.length > 0 ? [{ kind: 'comms' as BarKind, saved: savedKeys.has('comm') }] : []),
    ...selectedAds.map(id => ({ kind: 'ad' as BarKind, saved: savedKeys.has(`a:${id}`) })),
  ].slice(0, maxContentPieces);

  // ── v2 shell effects (read-only) ───────────────────────────────────────────
  // Snapshot the saved selection keys once, when the first load finishes.
  useEffect(() => {
    if (loading || savedSnapshotTaken.current) return;
    savedSnapshotTaken.current = true;
    setSavedKeys(new Set(selectionKeys));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const closeToast = useCallback(() => setToast(null), []);

  // ── Loading state — v2: mono "loading…" inside the PageShell ──────────────
  if (loading) {
    return (
      <PageShell align="center">
        <p style={{ margin: 0, textAlign: 'center', font: `400 12px/1 ${MONO}`, letterSpacing: '0.14em', color: 'var(--ink3)' }}>loading…</p>
      </PageShell>
    );
  }

  // ── Error state — v2: one italic serif line + quiet retry ─────────────────
  if (error) {
    return (
      <PageShell align="center">
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, font: `italic 400 16px/1.4 ${SERIF}`, color: 'var(--ink2)' }}>{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 18, background: 'transparent', border: 0, padding: 0, cursor: 'pointer', font: `500 11px/1 ${SANS}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink2)' }}
          >
            Try again
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Contributor / ad card helpers (presentational) ─────────────────────────
  // profiles.content_type is photography | art | poetry | essay; loadData falls back
  // to 'photo' when null. Music is not a content type.
  const creatorTile = (t: string): 'photography' | 'art' | 'poetry' | 'essay' =>
    t === 'art' || t === 'poetry' || t === 'essay' ? t : 'photography';
  const tileIcon: Record<'photography' | 'art' | 'poetry' | 'essay', IconName> = {
    photography: 'camera', art: 'brush', poetry: 'quill', essay: 'quill',
  };
  // loadData substitutes a /api/placeholder URL when avatar_url is null; that route
  // does not exist, so treat it as "no image" rather than render a broken cover.
  const isRealMedia = (url?: string) => !!url && !url.startsWith('/api/placeholder');

  const matchesFilter = (t: string) =>
    typeFilter === 'all' ||
    (typeFilter === 'writing' ? (t === 'poetry' || t === 'essay') : creatorTile(t) === typeFilter);

  // The frozen selected-first sort (filteredCreators) narrowed by the chips.
  const visibleCreators = filteredCreators.filter(c => matchesFilter(c.contentType));
  // Private profiles the curator cannot access: the sort drops them, so they are
  // derived separately (read-only) and appended after the sorted grid.
  const visibleLocked = creators
    .filter(c => c.isPrivate && !accessibleProfiles.includes(c.id))
    .filter(c =>
      searchTerm === '' ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.bio.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(c => matchesFilter(c.contentType));

  // Selected state takes the item's composition color so cards match the meter legend
  // (an intentional override of the README's "selected = green"): content = orange disc
  // with glow; ads = quiet --ink2 outline, no glow, like the outlined ad bars.
  const checkDiscBase: React.CSSProperties = {
    position: 'absolute', top: 10, right: 10, zIndex: 2, width: 22, height: 22, borderRadius: '50%',
    boxSizing: 'border-box', display: 'grid', placeItems: 'center',
  };
  const contentCheck: React.CSSProperties = {
    ...checkDiscBase, background: 'var(--orange)',
    boxShadow: '0 0 12px color-mix(in oklch, var(--orange) 40%, transparent)',
  };
  const adCheck: React.CSSProperties = {
    ...checkDiscBase, background: 'transparent', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--ink2)',
  };
  const checkMark = (color: string): React.CSSProperties => ({
    width: 8, height: 4, borderLeft: `1.5px solid ${color}`, borderBottom: `1.5px solid ${color}`,
    transform: 'rotate(-45deg) translate(1px, -1px)',
  });
  // Design `.acard .ban.a/.b/.c/.d`: dark brand-tinted gradients, rotated by index.
  const adGradients = [
    'linear-gradient(160deg, #2a2218, #15120e)',
    'linear-gradient(160deg, #1a2430, #0f1418)',
    'linear-gradient(160deg, #22182a, #120f16)',
    'linear-gradient(160deg, #1a2a20, #0f1613)',
  ];

  // ── v2 shell helpers (presentational; every action below is an existing handler) ──
  // Label for a collab selection id in the meter sheet. Template names live in
  // IntegratedCollabsSection (Phase 11) — until then the id's shape is the label.
  const collabLabel = (id: string): { name: string; sub: string; accent: Accent } => {
    if (id.startsWith('community_')) return { name: 'Community collaboration', sub: 'community', accent: 'blue' };
    if (id.startsWith('local_')) {
      const rest = id.slice('local_'.length);
      const sep = rest.indexOf('_');
      const city = sep === -1 ? '' : rest.slice(sep + 1).replace(/_/g, ' ');
      return { name: city ? `Local collaboration · ${city}` : 'Local collaboration', sub: 'local', accent: 'green' };
    }
    return { name: 'Private collaboration', sub: 'private', accent: 'purple' };
  };

  // Everything currently selected (the old "Added to magazine" list), one row
  // per slot, each remove calling the SAME toggleItem args the tabs use.
  const sheetRows: { key: string; name: string; sub: string; accent?: Accent; remove: () => void }[] = [
    ...selectedCreators.map(id => {
      const c = creators.find(x => x.id === id);
      return {
        key: `c-${id}`,
        name: c?.name ?? 'Contributor',
        sub: 'contributor',
        accent: (c && typeAccent[c.contentType as TileType]) || 'orange',
        remove: () => toggleItem(id, 'friend'),
      };
    }),
    ...selectedCollabs.filter(id => id.trim() !== '').map(id => {
      const l = collabLabel(id);
      return { key: `k-${id}`, name: l.name, sub: l.sub, accent: l.accent, remove: () => toggleItem(id, 'collab') };
    }),
    ...(selectedCommunications.length > 0
      ? [{ key: 'comms', name: 'Communications page', sub: 'communications', accent: 'gold' as Accent, remove: () => toggleItem('communications-page', 'communication') }]
      : []),
    ...selectedAds.map(id => {
      const a = ads.find(x => x.id === id);
      return { key: `a-${id}`, name: a?.name ?? 'Campaign', sub: 'ad · one page', remove: () => toggleItem(id, 'ad') };
    }),
  ];

  const searchPlaceholder =
    activeSection === 'contributors' ? 'Search contributors…' :
    activeSection === 'collabs'       ? 'Search collaborations…' :
    activeSection === 'comms'         ? 'Search communications…' :
                                        'Search campaigns…';

  const tabs = [
    { id: 'contributors' as const, label: 'Contributors', count: selectedCreators.length },
    { id: 'collabs' as const,      label: 'Collabs',      count: collabSlotCount },
    { id: 'comms' as const,        label: 'Comms',        count: selectedCommunications.length },
    { id: 'ads' as const,          label: 'Ads',          count: selectedAds.length },
  ];

  // ── Main return ────────────────────────────────────────────────────────────
  return (
    <PageShell
      // Header — design `.top`: "‹ Dashboard", wordmark, "Curate" in green
      header={(
        <>
          <Link href="/dashboard" style={{ font: `500 12px/1 ${SANS}`, color: 'var(--ink2)', textDecoration: 'none', flex: 'none' }}>‹ Dashboard</Link>
          <span style={{ font: `400 19px/1 ${SERIF}`, color: 'var(--ink)' }}>
            online<span style={{ color: 'var(--ink3)' }}>{'//'}</span>offline
          </span>
          <span style={{ font: `500 12px/1 ${SANS}`, color: 'var(--green)', flex: 'none' }}>Curate</span>
        </>
      )}
      // Footer — design `.foot`: YOUR PRICE (calculatePrice) · Reset (handleReset) · green Save (saveSelections).
      // Save is the only glowing element on the page. Price renders here and nowhere else.
      footer={(
        <>
          <div style={{ flex: 'none' }}>
            <div style={{ font: `400 10.5px/1 ${MONO}`, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>Your price</div>
            <div style={{ font: `400 26px/1 ${SERIF}`, color: 'var(--ink)', transition: 'opacity 150ms' }}>${calculatePrice().toFixed(2)}</div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            style={{ marginLeft: 'auto', marginRight: 4, background: 'transparent', border: 0, padding: '8px 0', cursor: 'pointer', font: `500 12px/1 ${SANS}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)', WebkitTapHighlightColor: 'transparent' }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={saveSelections}
            disabled={savingSelections}
            style={{ flex: 'none', font: `500 12px/1 ${SANS}`, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '15px 22px', borderRadius: 5, border: 0, whiteSpace: 'nowrap', cursor: savingSelections ? 'default' : 'pointer', color: 'var(--bg)', background: 'var(--green)', boxShadow: '0 0 28px color-mix(in oklch, var(--green) 35%, transparent)', opacity: savingSelections ? 0.6 : 1, WebkitTapHighlightColor: 'transparent' }}
          >
            {savingSelections ? 'Saving…' : 'Save'}
          </button>
        </>
      )}
    >
      <Toast open={toast !== null} message={toast?.message ?? ''} accent={toast?.accent} onClose={closeToast} />

      {/* Meter sheet — everything selected, with remove → the same toggleItem the tabs call */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="In your issue" subtitle={`${usedSlots} of ${maxContentPieces} pages · ${remainingContent} open`}>
        {sheetRows.length === 0 ? (
          <p style={{ margin: 0, font: `italic 400 15px/1.4 ${SERIF}`, color: 'var(--ink3)' }}>Nothing selected yet.</p>
        ) : (
          sheetRows.map((row, i) => (
            <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i === sheetRows.length - 1 ? 'none' : '1px solid var(--line)' }}>
              <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', flex: 'none', background: row.accent ? accentVar(row.accent) : 'var(--line2)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `400 17px/1.15 ${SERIF}`, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</div>
                <div style={{ marginTop: 4, font: `400 11px/1 ${MONO}`, color: 'var(--ink3)' }}>{row.sub}</div>
              </div>
              <button
                type="button"
                onClick={row.remove}
                style={{ flex: 'none', background: 'transparent', cursor: 'pointer', font: `500 11px/1 ${SANS}`, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 10px', borderRadius: 5, borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)', color: 'var(--ink2)', WebkitTapHighlightColor: 'transparent' }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </Sheet>

      {/* ── Page meter — design `.issue` / `.pages`. Title line, then bars (colored by what
          each slot holds) + a right-aligned two-line stat + the search icon. Read-only:
          usedSlots / remainingContent and the selection arrays; nothing is written. ── */}
      <h4 style={{ margin: 0, paddingTop: 22, font: `400 20px/1 ${SERIF}`, color: 'var(--ink)' }}>
        Your {currentPeriod?.season ?? ''} issue
      </h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 12 }}>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={`${usedSlots} of ${maxContentPieces} pages selected — show what's in your issue`}
          style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, background: 'transparent', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', WebkitTapHighlightColor: 'transparent' }}
        >
          <span style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 34, padding: '0 4px', borderBottom: '1px solid var(--line2)', flex: 'none' }}>
            {Array.from({ length: maxContentPieces }, (_, i) => {
              const slot = barSlots[i];
              const color = slot ? barColor[slot.kind] : 'var(--line2)';
              const outlined = slot?.kind === 'ad';
              const glow = !!slot && !slot.saved;
              return (
                <i
                  key={i}
                  style={{
                    display: 'block', width: 4, height: 28, borderRadius: 1, boxSizing: 'border-box',
                    background: !slot ? 'var(--line2)' : outlined ? 'transparent' : color,
                    borderWidth: outlined ? 1 : 0, borderStyle: 'solid', borderColor: color,
                    boxShadow: glow ? `0 0 10px color-mix(in oklch, ${color} 50%, transparent)` : 'none',
                    transition: 'background 150ms, border-color 150ms, box-shadow 150ms',
                  }}
                />
              );
            })}
          </span>
          <span style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
            <span style={{ display: 'block', font: `400 12px/1 ${MONO}`, color: 'var(--ink2)', whiteSpace: 'nowrap' }}>
              {usedSlots} of {maxContentPieces} pages
            </span>
            <span style={{ display: 'block', marginTop: 5, font: `500 12px/1 ${MONO}`, color: 'var(--green)', whiteSpace: 'nowrap' }}>
              {remainingContent} open
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => { if (searchOpen) setSearchTerm(''); setSearchOpen(o => !o); }}
          aria-label={searchOpen ? 'Close search' : 'Search'}
          aria-expanded={searchOpen}
          style={{ flex: 'none', background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: searchOpen ? 'var(--ink)' : 'var(--ink3)', WebkitTapHighlightColor: 'transparent' }}
        >
          <Icon name="search" size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* Meter legend — always visible, one line: 9px mono --ink3; ads are outlined (a paid page).
          nowrap + horizontal scroll (scrollbar hidden) as a last resort instead of wrapping. */}
      <div aria-hidden="true" style={{ display: 'flex', flexWrap: 'nowrap', gap: 10, paddingTop: 10, overflowX: 'auto', scrollbarWidth: 'none', font: `400 9px/1 ${MONO}`, letterSpacing: '0.06em', color: 'var(--ink3)' }}>
        {([
          ['Content', 'contributor'], ['Community', 'community'], ['Local', 'local'],
          ['Private', 'private'], ['Comms', 'comms'], ['Ads', 'ad'],
        ] as [string, BarKind][]).map(([label, kind]) => (
          <span key={kind} style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flex: 'none' }}>
            <i style={{ display: 'block', width: 6, height: 6, borderRadius: '50%', boxSizing: 'border-box', background: kind === 'ad' ? 'transparent' : barColor[kind], borderWidth: kind === 'ad' ? 1 : 0, borderStyle: 'solid', borderColor: barColor[kind] }} />
            {label}
          </span>
        ))}
      </div>

      {/* ── Search — the existing searchTerm field, revealed by the icon ── */}
      {searchOpen && (
        <SearchField
          autoFocus
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginTop: 12 }}
        />
      )}

      {/* ── Address reminder banner — above the tabs; warns, never blocks ── */}
      {!hasAddress && !addressBannerDismissed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
          <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)', flex: 'none' }} />
          <Link href="/profile" style={{ flex: 1, minWidth: 0, font: `400 13.5px/1.3 ${SANS}`, color: 'var(--ink2)', textDecoration: 'none' }}>
            Add your mailing address to receive your printed edition <span style={{ color: 'var(--ink3)' }}>›</span>
          </Link>
          <button
            type="button"
            onClick={() => setAddressBannerDismissed(true)}
            aria-label="Dismiss"
            style={{ flex: 'none', background: 'transparent', border: 0, padding: '0 2px', cursor: 'pointer', font: `400 16px/1 ${SANS}`, color: 'var(--ink3)' }}
          >×</button>
        </div>
      )}
      {addressError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
          <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)', flex: 'none' }} />
          <span style={{ flex: 1, font: `400 13.5px/1.3 ${SANS}`, color: 'var(--ink2)' }}>
            Your mailing address is required before we can print your edition.{' '}
            <Link href="/profile" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>Add it in your profile</Link>
          </span>
        </div>
      )}

      {/* ── Tabs — design `.ctabs`: same ids, same setActiveSection + setSearchTerm('') ── */}
      {/* Cells share the column equally (flex 1 1 0). At 390px the column is 342px and
          "CONTRIBUTORS 9" alone is ~119px, wider than a quarter, so each cell's floor is
          its own content (min-width max-content): the three short tabs split the rest
          equally and the row never exceeds the column. No gap — the cells meet. */}
      <div style={{ display: 'flex', paddingTop: 22, borderBottom: '1px solid var(--line)', width: '100%', boxSizing: 'border-box' }}>
        {tabs.map(({ id, label, count }) => {
          const on = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => { setActiveSection(id); setSearchTerm(''); }}
              style={{ position: 'relative', flex: '1 1 0', minWidth: 'max-content', boxSizing: 'border-box', display: 'flex', gap: 4, alignItems: 'baseline', justifyContent: 'center', textAlign: 'center', background: 'transparent', border: 0, padding: '0 4px 12px', marginBottom: -1, cursor: 'pointer', font: `500 11px/1 ${SANS}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: on ? 'var(--ink)' : 'var(--ink3)', whiteSpace: 'nowrap', transition: 'color 0.2s', WebkitTapHighlightColor: 'transparent' }}
            >
              {label}
              <span style={{ font: `400 10px/1 ${MONO}`, letterSpacing: 0, color: 'var(--ink3)', flex: 'none' }}>{count}</span>
              {on && <span aria-hidden="true" style={{ position: 'absolute', left: 4, right: 4, bottom: 0, height: 1, background: 'var(--ink)' }} />}
            </button>
          );
        })}
      </div>
        {/* ── Proof scroll area ── */}
        {(() => {
          // Collabs + comms bodies below are still v1 (Phases 11–12).

          return (
            <div style={{ paddingTop: 16, paddingBottom: 32 }}>

              {/* ══ CONTRIBUTORS — design `.filt` / `.legend` / `.cgrid` / `.ccard` ══ */}
              {activeSection === 'contributors' && (
                <div>
                  {/* Filter chips — client-side only on contentType; Writing = poetry + essay. No writes. */}
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {([
                      { id: 'all' as const,         label: 'All' },
                      { id: 'photography' as const, label: 'Photo',   accent: 'blue' as Accent },
                      { id: 'art' as const,         label: 'Art',     accent: 'purple' as Accent },
                      { id: 'writing' as const,     label: 'Writing', accent: 'gold' as Accent },
                    ]).map(chip => {
                      const on = typeFilter === chip.id;
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => setTypeFilter(chip.id)}
                          aria-pressed={on}
                          style={{ height: 30, padding: '0 12px', borderRadius: 15, borderWidth: 1, borderStyle: 'solid', borderColor: on ? 'var(--ink2)' : 'var(--line2)', background: 'transparent', display: 'flex', alignItems: 'center', gap: 6, color: on ? 'var(--ink)' : 'var(--ink3)', font: `400 12px/1 ${SANS}`, whiteSpace: 'nowrap', cursor: 'pointer', flex: 'none', WebkitTapHighlightColor: 'transparent' }}
                        >
                          {chip.accent && <i aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: accentVar(chip.accent), display: 'block' }} />}
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>

                  {visibleCreators.length === 0 && visibleLocked.length === 0 ? (
                    <p style={{ margin: 0, paddingTop: 24, font: `italic 400 15px/1.4 ${SERIF}`, color: 'var(--ink3)' }}>
                      {searchTerm ? `No contributors match “${searchTerm}”.` : 'No contributors yet.'}
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 16 }}>
                      {/* Accessible contributors — the frozen selected-first order; tap → toggleItem(id, 'friend') */}
                      {visibleCreators.map(creator => {
                        const isSelected = selectedCreators.includes(creator.id);
                        const tile = creatorTile(creator.contentType);
                        const accent = typeAccent[tile];
                        const dimmed = !isSelected && remainingContent === 0;
                        const cover = creator.identityBannerUrl || (isRealMedia(creator.avatar) ? creator.avatar : undefined);
                        const displayName = creator.firstName
                          ? `${creator.firstName.charAt(0)}. ${creator.lastName}`
                          : creator.name;

                        return (
                          <div
                            key={creator.id}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            onClick={() => toggleItem(creator.id, 'friend')}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleItem(creator.id, 'friend'); } }}
                            style={{
                              position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                              borderRadius: 12, background: 'var(--bg2)',
                              borderWidth: 1, borderStyle: 'solid', borderColor: isSelected ? 'var(--orange)' : 'var(--line)',
                              opacity: dimmed ? 0.4 : 1,
                              cursor: dimmed ? 'default' : 'pointer',
                              transition: 'border-color 150ms, opacity 150ms',
                              WebkitTapHighlightColor: 'transparent',
                            } as React.CSSProperties}
                          >
                            {isSelected && <span aria-hidden="true" style={contentCheck}><span style={checkMark('var(--bg)')} /></span>}

                            {/* Cover — identity banner → avatar → type-tinted gradient + type icon */}
                            <div style={{ height: 78, flex: 'none', display: 'grid', placeItems: 'center', overflow: 'hidden', color: accentVar(accent), opacity: 0.9, background: `linear-gradient(135deg, color-mix(in oklch, ${accentVar(accent)} 14%, var(--bg2)), var(--bg2))` }}>
                              {cover ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              ) : (
                                <Icon name={tileIcon[tile]} size={22} strokeWidth={1.4} />
                              )}
                            </div>

                            {/* Body — serif 17 "F. Lastname" + 20px TypeTile */}
                            <div style={{ padding: '11px 12px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <h4 style={{ margin: 0, font: `400 17px/1.1 ${SERIF}`, color: 'var(--ink)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</h4>
                              <TypeTile type={tile} size={20} />
                            </div>
                          </div>
                        );
                      })}

                      {/* Private profiles without access — 70%, lock in cover, Request access → handleRequestFollow */}
                      {visibleLocked.map(creator => {
                        const isPending = pendingRequestMap[creator.id];
                        const displayName = creator.firstName
                          ? `${creator.firstName.charAt(0)}. ${creator.lastName}`
                          : creator.name;
                        return (
                          <div
                            key={creator.id}
                            style={{ position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 12, background: 'var(--bg2)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line)', opacity: 0.7 }}
                          >
                            <div style={{ height: 78, flex: 'none', display: 'grid', placeItems: 'center', color: 'var(--ink3)', background: 'var(--bg2)' }}>
                              <Icon name="lock" size={22} strokeWidth={1.4} />
                            </div>
                            <div style={{ padding: '11px 12px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <h4 style={{ margin: 0, font: `400 17px/1.1 ${SERIF}`, color: 'var(--ink)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</h4>
                            </div>
                            {isPending ? (
                              <div style={{ margin: '0 12px 12px', padding: '9px 0', textAlign: 'center', font: `500 10.5px/1 ${SANS}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)' }}>Request sent</div>
                            ) : (
                              <button
                                type="button"
                                onClick={e => handleRequestFollow(creator.id, e)}
                                style={{ margin: '0 12px 12px', padding: '9px 0', textAlign: 'center', background: 'transparent', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)', borderRadius: 5, font: `500 10.5px/1 ${SANS}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                              >
                                Request access
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ══ COLLABORATIONS ══ */}
              {activeSection === 'collabs' && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--lt-text-3)', marginBottom: '10px' }}>
                    Collaborations{currentPeriod ? ` · ${currentPeriod.season} ${currentPeriod.year}` : ''}
                  </div>
                  <IntegratedCollabsSection
                    periodId={currentPeriod?.id || ''}
                    selectedCollabs={selectedCollabs}
                    toggleItem={(id) => toggleItem(id, 'collab')}
                    remainingContent={remainingContent}
                    onPrivateCollabMap={setPrivateCollabTemplateMap}
                    searchTerm={searchTerm}
                  />
                </div>
              )}

              {/* ══ COMMUNICATIONS ══ */}
              {activeSection === 'comms' && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--lt-text-3)', marginBottom: '10px' }}>
                    Communications
                  </div>

                  {/* Toggle card */}
                  {(() => {
                    const isSelected = selectedCommunications.length > 0;
                    const msgCount = communications.length;
                    return (
                      <div
                        onClick={() => toggleItem('communications-page', 'communication')}
                        style={{
                          background: isSelected ? 'rgba(224,168,48,0.1)' : 'rgba(224,168,48,0.05)',
                          border: `1px solid ${isSelected ? 'rgba(224,168,48,0.3)' : 'rgba(224,168,48,0.14)'}`,
                          borderLeft: `3px solid var(--neon-amber)`,
                          borderRadius: '1px',
                          padding: '14px',
                          cursor: 'pointer',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '5px',
                          boxShadow: isSelected
                            ? '-4px 0 18px -1px rgba(224,168,48,0.4),0 0 20px rgba(224,168,48,0.08),inset 0 0 28px rgba(224,168,48,0.05)'
                            : '-4px 0 12px -2px rgba(224,168,48,0.22),inset 0 0 30px rgba(224,168,48,0.03)',
                          marginBottom: '8px',
                          transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
                          WebkitTapHighlightColor: 'transparent',
                        } as React.CSSProperties}
                      >
                        {/* ✓ check */}
                        <div style={{ position: 'absolute', top: '10px', right: '10px', fontFamily: 'var(--font-mono)', fontSize: '14px', color: isSelected ? 'var(--neon-green)' : 'transparent', textShadow: isSelected ? '0 0 8px var(--glow-green)' : 'none', transition: 'color 0.18s, text-shadow 0.18s' }}>✓</div>

                        {/* "to Contributors" amber label */}
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon-amber)', textShadow: '0 0 8px rgba(224,168,48,0.45)', display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
                          <span style={{ display: 'inline-block', width: '14px', height: '1px', background: 'var(--neon-amber)', opacity: 0.4, boxShadow: '0 0 4px rgba(224,168,48,0.4)' }} />
                          Contributors
                        </div>

                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', color: 'var(--lt-text)', lineHeight: 1.2, paddingRight: '20px' }}>
                          Include a communications page
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.06em', color: 'var(--lt-text-2)', lineHeight: 1.5, marginTop: '2px' }}>
                          Personal messages from contributors, addressed to you as curator. Auto-formatted. Up to 10 per page.
                        </div>

                        {/* Message count */}
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--neon-amber)', lineHeight: 1, textShadow: '0 0 12px rgba(224,168,48,0.5)' }}>{msgCount}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lt-text-3)' }}>messages this season</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Static message previews */}
                  {communications.length > 0 && (
                    <>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--lt-text-3)', margin: '14px 0 8px' }}>
                        Messages received
                      </div>
                      {filteredCommunications.length === 0 && searchTerm && (
                        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '13px', color: 'var(--lt-text-3)', padding: '8px 0' }}>
                          No messages match &ldquo;{searchTerm}&rdquo;.
                        </p>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {filteredCommunications.map(comm => (
                          <div
                            key={comm.id}
                            style={{ background: 'rgba(224,168,48,0.03)', border: '1px solid rgba(224,168,48,0.1)', borderRadius: '1px', padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }}
                          >
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon-amber)', opacity: 0.6 }}>
                              From {comm.profiles.first_name} {comm.profiles.last_name}
                            </div>
                            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', color: 'var(--lt-text-2)' }}>
                              {comm.subject}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.06em', color: 'var(--lt-text-3)' }}>
                              submitted
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ══ ADS / CAMPAIGNS — design `.adnote` / `.cgrid` / `.acard` ══ */}
              {activeSection === 'ads' && (
                <div>
                  {/* Note line + running total from the existing discount math (selectedAds.length × adDiscountAmount) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, font: `italic 400 13.5px/1.2 ${SERIF}`, color: 'var(--ink3)' }}>
                    <span>Each ad is one page and takes ${adDiscountAmount} off.</span>
                    <b style={{ font: `400 12px/1 ${MONO}`, color: 'var(--green)', flex: 'none' }}>−${(selectedAds.length * adDiscountAmount).toFixed(2)}</b>
                  </div>

                  {filteredAds.length === 0 ? (
                    <p style={{ margin: 0, paddingTop: 24, font: `italic 400 15px/1.4 ${SERIF}`, color: 'var(--ink3)' }}>
                      {searchTerm ? `No campaigns match “${searchTerm}”.` : 'No campaigns this period.'}
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 16 }}>
                      {filteredAds.map((ad, i) => {
                        const isSelected = selectedAds.includes(ad.id);
                        const dimmed = !isSelected && remainingContent === 0;
                        const cover = isRealMedia(ad.avatar) ? ad.avatar : undefined;
                        return (
                          <div
                            key={ad.id}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            onClick={() => toggleItem(ad.id, 'ad')}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleItem(ad.id, 'ad'); } }}
                            style={{
                              position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                              borderRadius: 12, background: 'var(--bg2)',
                              borderWidth: 1, borderStyle: 'solid', borderColor: isSelected ? 'var(--ink2)' : 'var(--line)',
                              opacity: dimmed ? 0.4 : 1,
                              cursor: dimmed ? 'default' : 'pointer',
                              transition: 'border-color 150ms, opacity 150ms',
                              WebkitTapHighlightColor: 'transparent',
                            } as React.CSSProperties}
                          >
                            {isSelected && <span aria-hidden="true" style={adCheck}><span style={checkMark('var(--ink2)')} /></span>}

                            {/* Cover — brand image, else the name as a wordmark on a dark brand-tinted gradient */}
                            <div style={{ height: 96, flex: 'none', position: 'relative', display: 'grid', placeItems: 'center', overflow: 'hidden', background: adGradients[i % adGradients.length] }}>
                              {cover ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              ) : (
                                <>
                                  <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 6px, transparent 6px 12px)' }} />
                                  <span style={{ position: 'relative', padding: '0 12px', maxWidth: '100%', boxSizing: 'border-box', font: `400 22px/1.1 ${SERIF}`, letterSpacing: '-0.01em', color: 'var(--ink)', opacity: 0.9, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.name}</span>
                                </>
                              )}
                            </div>

                            {/* Body — serif 17 name + mono green −$N (campaigns.discount) as the only meta */}
                            <div style={{ padding: '11px 12px 12px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                              <h4 style={{ margin: 0, font: `400 17px/1.1 ${SERIF}`, color: 'var(--ink)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.name}</h4>
                              <p style={{ margin: 0, font: `400 12px/1 ${MONO}`, color: 'var(--green)', flex: 'none' }}>−${ad.discount}</p>
                            </div>
                            {ad.bio && (
                              <p style={{ margin: '-2px 12px 12px', font: `400 12px/1.35 ${SANS}`, color: 'var(--ink3)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{ad.bio}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })()}

    </PageShell>
  );
}

