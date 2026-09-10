"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import IntegratedCollabsSection from '@/components/IntegratedCollabsSection';
import { PageShell, Sheet, Toast, SearchField, Icon, typeAccent, accentVar, SERIF, SANS, MONO } from '@/components/v2';
import type { Accent, TileType } from '@/components/v2';

import { getCurrentPeriod } from '@/lib/supabase/content';
import { saveCuratorSelections } from '@/lib/supabase/curation';
import { sendFollowRequest } from '@/lib/supabase/profiles';

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
  icon: React.ElementType;
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
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [accessibleProfiles, setAccessibleProfiles] = useState<string[]>([]);

  // ── Visual-only UI state ───────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<'contributors' | 'collabs' | 'comms' | 'ads'>('contributors');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; accent: 'green' | 'orange' } | null>(null);
  // Page meter: slots that were already saved when the page loaded (or at the
  // last save) render --ink2; anything above that is this session's work and
  // renders green. Read-only derivation — nothing here is written anywhere.
  const [savedSlots, setSavedSlots] = useState(0);
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

  const toggleCardExpansion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

      setSavedSlots(selectedCreators.length + selectedAds.length +
        selectedCommunications.length + selectedCollabs.filter(id => id.trim() !== '').length);

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
    setSavedSlots(0);
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
            const Camera = (await import('lucide-react')).Camera;
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
              icon: Camera,
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

  // ── v2 shell effects (read-only) ───────────────────────────────────────────
  // Snapshot the slot count once, when the first load finishes: those bars
  // render --ink2 ("saved"); anything selected afterwards renders green.
  useEffect(() => {
    if (loading || savedSnapshotTaken.current) return;
    savedSnapshotTaken.current = true;
    setSavedSlots(usedSlots);
  }, [loading, usedSlots]);

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

  // ── v2 shell helpers (presentational; every action below is an existing handler) ──
  const savedFilled = Math.min(savedSlots, usedSlots);

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

      {/* ── Page meter — design `.issue` / `.pages`: 20 bars = the 20 slots (usedSlots / remainingContent) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 22 }}>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={`${usedSlots} of ${maxContentPieces} pages selected — show what's in your issue`}
          style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, background: 'transparent', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', WebkitTapHighlightColor: 'transparent' }}
        >
          <span style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 34, padding: '0 4px', borderBottom: '1px solid var(--line2)', flex: 'none' }}>
            {Array.from({ length: maxContentPieces }, (_, i) => {
              const saved = i < savedFilled;
              const fresh = !saved && i < usedSlots;
              return (
                <i
                  key={i}
                  style={{
                    display: 'block', width: 4, height: 28, borderRadius: 1,
                    background: saved ? 'var(--ink2)' : fresh ? 'var(--green)' : 'var(--line2)',
                    boxShadow: fresh ? '0 0 10px color-mix(in oklch, var(--green) 50%, transparent)' : 'none',
                    transition: 'background 150ms, box-shadow 150ms',
                  }}
                />
              );
            })}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', font: `400 20px/1 ${SERIF}`, color: 'var(--ink)' }}>
              Your {currentPeriod?.season ?? ''} issue
            </span>
            <span style={{ display: 'block', margin: '5px 0 0', font: `400 12px/1.3 ${MONO}`, color: 'var(--ink3)' }}>
              {usedSlots} of {maxContentPieces} pages · <b style={{ color: 'var(--green)', fontWeight: 500 }}>{remainingContent} open</b>
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
      <div style={{ display: 'flex', gap: 22, paddingTop: 22, borderBottom: '1px solid var(--line)' }}>
        {tabs.map(({ id, label, count }) => {
          const on = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => { setActiveSection(id); setSearchTerm(''); }}
              style={{ position: 'relative', display: 'flex', gap: 6, alignItems: 'baseline', background: 'transparent', border: 0, padding: '0 0 12px', marginBottom: -1, cursor: 'pointer', font: `500 12px/1 ${SANS}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: on ? 'var(--ink)' : 'var(--ink3)', whiteSpace: 'nowrap', transition: 'color 0.2s', WebkitTapHighlightColor: 'transparent' }}
            >
              {label}
              <em style={{ font: `400 11px/1 ${MONO}`, color: 'var(--ink3)', fontStyle: 'normal' }}>{count}</em>
              {on && <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, background: 'var(--ink)' }} />}
            </button>
          );
        })}
      </div>
        {/* ── Proof scroll area ── */}
        {(() => {
          // Content-type → neon color map used by creator cards
          const tc: Record<string, { neon: string; bannerBg: string; bgSel: string; borderSel: string; shadowSel: string; glowRgba: string; glyph: string }> = {
            photo:   { neon: 'var(--neon-blue)',   bannerBg: 'linear-gradient(135deg,rgba(90,159,212,0.1) 0%,rgba(90,159,212,0.04) 100%)',   bgSel: 'rgba(90,159,212,0.06)',   borderSel: 'rgba(90,159,212,0.25)',   shadowSel: '-4px 0 14px -2px rgba(90,159,212,0.4),0 0 18px rgba(90,159,212,0.07)',  glowRgba: 'rgba(90,159,212,0.7)',   glyph: '○' },
            art:     { neon: 'var(--neon-purple)', bannerBg: 'linear-gradient(135deg,rgba(168,136,232,0.1) 0%,rgba(168,136,232,0.04) 100%)', bgSel: 'rgba(168,136,232,0.06)', borderSel: 'rgba(168,136,232,0.25)', shadowSel: '-4px 0 14px -2px rgba(168,136,232,0.38)',                                    glowRgba: 'rgba(168,136,232,0.7)', glyph: '✦' },
            poetry:  { neon: 'var(--neon-amber)',  bannerBg: 'linear-gradient(135deg,rgba(224,168,48,0.1) 0%,rgba(224,168,48,0.04) 100%)',   bgSel: 'rgba(224,168,48,0.06)',   borderSel: 'rgba(224,168,48,0.25)',   shadowSel: '-4px 0 14px -2px rgba(224,168,48,0.38)',                                     glowRgba: 'rgba(224,168,48,0.7)',   glyph: '✦' },
            essay:   { neon: 'var(--neon-amber)',  bannerBg: 'linear-gradient(135deg,rgba(224,168,48,0.1) 0%,rgba(224,168,48,0.04) 100%)',   bgSel: 'rgba(224,168,48,0.06)',   borderSel: 'rgba(224,168,48,0.25)',   shadowSel: '-4px 0 14px -2px rgba(224,168,48,0.38)',                                     glowRgba: 'rgba(224,168,48,0.7)',   glyph: '∿' },
          };
          const getType = (t: string) => tc[t] || tc.photo;

          return (
            <div style={{ paddingTop: 16, paddingBottom: 32 }}>

              {/* ══ CONTRIBUTORS ══ */}
              {activeSection === 'contributors' && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--lt-text-3)', marginBottom: '10px' }}>
                    Contributors{currentPeriod ? ` · ${currentPeriod.season} ${currentPeriod.year}` : ''}
                  </div>

                  {filteredCreators.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '14px', color: 'var(--lt-text-3)' }}>
                      No contributors found
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                      {filteredCreators.map(creator => {
                        const isSelected = selectedCreators.includes(creator.id);
                        const isPending = pendingRequestMap[creator.id];
                        const colors = getType(creator.contentType);
                        const displayName = creator.firstName
                          ? `${creator.firstName.charAt(0)}. ${creator.lastName}`
                          : creator.name;

                        return (
                          <div
                            key={creator.id}
                            onClick={() => !creator.isPrivate && toggleItem(creator.id, 'friend')}
                            style={{
                              background: isSelected ? colors.bgSel : 'var(--lt-card)',
                              border: `1px solid ${isSelected ? colors.borderSel : 'var(--lt-card-bdr)'}`,
                              borderLeft: isSelected ? `3px solid ${colors.neon}` : '1px solid var(--lt-card-bdr)',
                              borderRadius: '1px',
                              cursor: creator.isPrivate ? 'default' : 'pointer',
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden',
                              opacity: creator.isPrivate && !accessibleProfiles.includes(creator.id) ? 0.55 : 1,
                              boxShadow: isSelected ? colors.shadowSel : 'none',
                              transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
                              WebkitTapHighlightColor: 'transparent',
                            } as React.CSSProperties}
                          >
                            {/* ✓ check */}
                            <div style={{ position: 'absolute', top: '8px', right: '9px', zIndex: 10, fontFamily: 'var(--font-mono)', fontSize: '14px', color: isSelected ? colors.neon : 'transparent', textShadow: isSelected ? `0 0 8px ${colors.glowRgba}` : 'none', transition: 'color 0.18s, text-shadow 0.18s', filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.6))' }}>✓</div>

                            {/* Banner */}
                            <div style={{ width: '100%', height: '72px', flexShrink: 0, background: colors.bannerBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                              {creator.identityBannerUrl ? (
                                <img src={creator.identityBannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                              ) : (
                                <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '28px', lineHeight: 1, opacity: 0.25, color: colors.neon, userSelect: 'none' }}>
                                  {colors.glyph}
                                </span>
                              )}
                            </div>

                            {/* Body */}
                            <div style={{ padding: '9px 10px 10px', display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lt-text-3)' }}>
                                {creator.creatorType}
                              </div>
                              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--lt-text)', lineHeight: 1.2, paddingRight: '18px' }}>
                                {displayName}
                              </div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.06em', color: 'var(--lt-text-2)', lineHeight: 1.4, marginTop: '1px' }}>
                                {creator.isPrivate ? 'Private profile' : currentPeriod ? `${currentPeriod.season} ${currentPeriod.year}` : ''}
                              </div>

                              {creator.isPrivate && !accessibleProfiles.includes(creator.id) && !isPending && (
                                <button
                                  onClick={e => handleRequestFollow(creator.id, e)}
                                  style={{ marginTop: '5px', padding: '5px 0', width: '100%', textAlign: 'center', background: 'rgba(90,159,212,0.12)', border: '1px solid rgba(90,159,212,0.24)', borderRadius: '1px', fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7fbfe8', cursor: 'pointer' }}
                                >
                                  Request access
                                </button>
                              )}
                              {creator.isPrivate && !accessibleProfiles.includes(creator.id) && isPending && (
                                <div style={{ marginTop: '5px', padding: '5px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lt-text-3)' }}>
                                  Request pending
                                </div>
                              )}
                            </div>

                            {/* Lock icon */}
                            {creator.isPrivate && !accessibleProfiles.includes(creator.id) && (
                              <div style={{ position: 'absolute', bottom: '8px', right: '9px', zIndex: 10 }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--lt-text-3)" strokeWidth="2">
                                  <rect x="3" y="11" width="18" height="11" rx="2" />
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                              </div>
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

              {/* ══ ADS / CAMPAIGNS ══ */}
              {activeSection === 'ads' && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--lt-text-3)', marginBottom: '10px' }}>
                    Campaigns · each reduces your price by ${adDiscountAmount}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                    {filteredAds.length === 0 && (
                      <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '13px', color: 'var(--lt-text-3)', padding: '8px 0' }}>
                        {searchTerm ? `No campaigns match “${searchTerm}”.` : 'No campaigns this period.'}
                      </p>
                    )}
                    {filteredAds.map(ad => {
                      const isSelected = selectedAds.includes(ad.id);
                      return (
                        <div
                          key={ad.id}
                          onClick={() => toggleItem(ad.id, 'ad')}
                          style={{
                            background: isSelected ? 'rgba(78,196,122,0.09)' : 'rgba(78,196,122,0.04)',
                            border: `1px solid ${isSelected ? 'rgba(78,196,122,0.28)' : 'rgba(78,196,122,0.12)'}`,
                            borderRadius: '1px',
                            padding: '14px',
                            cursor: 'pointer',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0,
                            boxShadow: isSelected ? '0 0 20px rgba(78,196,122,0.08),inset 0 0 24px rgba(78,196,122,0.04)' : 'none',
                            overflow: 'hidden',
                            transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
                            WebkitTapHighlightColor: 'transparent',
                          } as React.CSSProperties}
                        >
                          {/* Green top-edge glow line */}
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'var(--neon-green)', boxShadow: isSelected ? '0 0 12px 2px rgba(78,196,122,0.55),0 0 30px 4px rgba(78,196,122,0.18)' : '0 0 8px 1px rgba(78,196,122,0.45),0 0 20px 2px rgba(78,196,122,0.15)', opacity: isSelected ? 1 : 0.6 }} />

                          {/* ✓ check */}
                          <div style={{ position: 'absolute', top: '10px', right: '10px', fontFamily: 'var(--font-mono)', fontSize: '14px', color: isSelected ? 'var(--neon-green)' : 'transparent', textShadow: isSelected ? '0 0 8px var(--glow-green)' : 'none', transition: 'color 0.18s, text-shadow 0.18s' }}>✓</div>

                          {/* Price hero */}
                          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '10px', paddingTop: '4px' }}>
                            <div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(78,196,122,0.6)', marginBottom: '2px' }}>
                                Price reduction
                              </div>
                              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '36px', lineHeight: 1, color: 'var(--neon-green)', textShadow: '0 0 16px rgba(78,196,122,0.55),0 0 40px rgba(78,196,122,0.2)', letterSpacing: '-0.01em' }}>
                                ${ad.discount}
                              </div>
                            </div>
                          </div>

                          {/* Divider */}
                          <div style={{ height: '1px', background: 'rgba(78,196,122,0.12)', marginBottom: '10px' }} />

                          {/* Name + bio */}
                          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--lt-text)', lineHeight: 1.2, paddingRight: '20px', marginBottom: '3px' }}>
                            {ad.name}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.06em', color: 'var(--lt-text-2)', lineHeight: 1.4 }}>
                            {ad.bio}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Savings note */}
                  {selectedAds.length > 0 && (
                    <div style={{ padding: '10px 12px', background: 'rgba(78,196,122,0.05)', border: '1px solid rgba(78,196,122,0.1)', borderRadius: '1px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--lt-text-3)', marginBottom: '3px' }}>
                        Total savings
                      </div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--neon-green)', textShadow: '0 0 10px rgba(78,196,122,0.4)' }}>
                        ${selectedAds.length * adDiscountAmount} off your magazine
                      </div>
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

