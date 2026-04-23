"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import IntegratedCollabsSection from '@/components/IntegratedCollabsSection';

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
  const supabase = createClientComponentClient();
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
  const [searchTerm, setSearchTerm] = useState('');
  const [savingSelections, setSavingSelections] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequestMap, setPendingRequestMap] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [accessibleProfiles, setAccessibleProfiles] = useState<string[]>([]);

  // ── Visual-only UI state ───────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<'contributors' | 'collabs' | 'comms' | 'ads'>('contributors');
  const [savePress, setSavePress] = useState<'rest' | 'pressing' | 'releasing'>('rest');

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
  const uniqueTemplateIds = new Set<string>();
  selectedCollabs.forEach(id => {
    if (!id || id.trim() === '') return;
    if (id.startsWith('local_')) {
      const parts = id.split('_');
      if (parts.length >= 2) uniqueTemplateIds.add(parts[1]);
      else uniqueTemplateIds.add(id);
    } else if (id.startsWith('community_')) {
      uniqueTemplateIds.add(id.substring('community_'.length));
    } else {
      uniqueTemplateIds.add(id);
    }
  });

  const usedSlots = selectedCreators.length + selectedAds.length +
    selectedCommunications.length + uniqueTemplateIds.size;
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
      const periodData = await getCurrentPeriod();
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
    const result = await sendFollowRequest(creatorId);
    if (result.success) {
      setPendingRequestMap(prev => ({ ...prev, [creatorId]: true }));
      alert('Follow request sent!');
    } else {
      alert(`Error: ${result.error || 'Failed to send request'}`);
    }
  };

  // ── Save handler ───────────────────────────────────────────────────────────
  const saveSelections = async () => {
    setSavingSelections(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('User not authenticated');

      const periodId = await getPeriodId();
      if (!periodId) throw new Error('No active period found');

      const result = await saveCuratorSelections({
        curator_id: userData.user.id,
        period_id: periodId,
        selected_contributors: selectedCreators,
        selected_collaborations: selectedCollabs,
        selected_communications: selectedCommunications,
        selected_ads: selectedAds,
      });

      if (!result.success) throw new Error(result.error || 'Failed to save selections');

      localStorage.setItem('magazine_selections', JSON.stringify({
        contributors: selectedCreators,
        collaborations: selectedCollabs,
        communications: selectedCommunications,
        campaigns: selectedAds,
      }));
      localStorage.removeItem('temp_selected_collabs');

      alert('Your magazine selections have been saved!');
      router.push('/dashboard');
    } catch (saveError) {
      console.error('Error saving selections:', saveError);
      alert('There was an error saving your selections. ' +
        (saveError instanceof Error ? saveError.message : 'Unknown error'));
    } finally {
      setSavingSelections(false);
    }
  };

  // ── Press-btn save mechanic ────────────────────────────────────────────────
  const pressSave = () => {
    if (savePress !== 'rest' || savingSelections) return;
    setSavePress('pressing');
    setTimeout(() => {
      setSavePress('releasing');
      saveSelections();
      setTimeout(() => setSavePress('rest'), 220);
    }, 160);
  };

  // ── Reset handler ──────────────────────────────────────────────────────────
  const handleReset = () => {
    if (!window.confirm('Reset all selections? This cannot be undone.')) return;
    setSelectedCollabs([]);
    setSelectedCreators([]);
    setSelectedAds([]);
    setSelectedCommunications([]);
    localStorage.removeItem('temp_selected_collabs');
    localStorage.removeItem('magazine_selections');
    localStorage.removeItem('selected_cities');

    const cleanupDB = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
    alert('All selections have been reset');
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

  // ── Data loading (unchanged) ───────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setCreators([]);
        setAds([]);

        try {
          const periodData = await getCurrentPeriod();
          const extracted = extractPeriodData(periodData);
          if (extracted) setCurrentPeriod(extracted);
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

        setAds([
          { id: 'ad1', name: "Artisan's Supply Co.", bio: 'Premium art supplies and workshops for creators', lastPost: 'Featured: New Sustainable Paint Collection', avatar: '/api/placeholder/400/400?text=AS', type: 'ad', discount: 2 },
          { id: 'ad2', name: 'The Reading Room', bio: 'Independent bookstore with curated collections & events', avatar: '/api/placeholder/400/400?text=RR', lastPost: 'Event: Monthly Poetry Reading Night', type: 'ad', discount: 2 },
        ]);

        setCommunications([
          { id: 'comm1', subject: 'Thoughts on my latest series', sender_id: 'user1', profiles: { first_name: 'Sarah', last_name: 'Chen', avatar_url: '/api/placeholder/400/400?text=SC' } },
          { id: 'comm2', subject: 'Collaboration opportunity', sender_id: 'user2', profiles: { first_name: 'Marcus', last_name: 'Johnson', avatar_url: '/api/placeholder/400/400?text=MJ' } },
        ]);

        try {
          const saved = localStorage.getItem('magazine_selections');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.contributors) setSelectedCreators(parsed.contributors);
            if (parsed.campaigns) setSelectedAds(parsed.campaigns);
            if (parsed.communications) setSelectedCommunications(parsed.communications);
            if (parsed.collaborations) setSelectedCollabs(parsed.collaborations);
          }
        } catch (err) {
          console.error('Error loading saved selections:', err);
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

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: 'var(--lt-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.14em', color: 'var(--lt-text-3)' }}>
          loading…
        </p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ background: 'var(--lt-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '300px', textAlign: 'center', padding: '24px' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--lt-text)', marginBottom: '10px', opacity: 0.88 }}>
            Error loading data
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--lt-text-2)', marginBottom: '20px' }}>
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--lt-text-2)', padding: '9px 18px', background: 'transparent', border: '1px solid rgba(235,225,205,0.18)', borderRadius: '2px', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Main return ────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--lt-bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: 'var(--lt-bg)', position: 'relative', display: 'flex', flexDirection: 'column' }}>

        {/* Ambient glow */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '390px', height: '220px', background: 'radial-gradient(ellipse at 50% 100%, rgba(210,190,150,0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        {/* Glass overlay */}
        <div style={{ position: 'fixed', top: '130px', left: '50%', transform: 'translateX(-50%)', width: 'calc(390px - 32px)', bottom: '72px', background: 'rgba(230,215,185,0.018)', border: '1px solid rgba(230,215,185,0.05)', borderRadius: '2px', pointerEvents: 'none', zIndex: 1 }} />

        {/* ── Header ── */}
        <div style={{ flexShrink: 0, padding: '20px 22px 0', position: 'relative', zIndex: 10 }}>
          {/* Row 1: back · wordmark · badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <Link
              href="/dashboard"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--lt-text-3)', textDecoration: 'none', transition: 'color 0.15s' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15,18 9,12 15,6" />
              </svg>
              Dashboard
            </Link>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', letterSpacing: '0.04em', color: 'var(--lt-text-2)' }}>
              online<span style={{ color: 'rgba(235,225,205,0.28)', margin: '0 1px' }}>//</span>offline
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(78,196,122,0.6)', textShadow: '0 0 8px rgba(78,196,122,0.22)' }}>
              Curate
            </div>
          </div>

          {/* Thick rule */}
          <div style={{ height: '1px', background: 'var(--lt-text)', opacity: 0.6, boxShadow: '0 0 6px 1px rgba(235,225,205,0.2), 0 0 18px rgba(235,225,205,0.06)', marginBottom: '10px' }} />

          {/* Row 2: season · dash · deadline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '12px', color: 'var(--lt-text-2)', whiteSpace: 'nowrap' }}>
              {currentPeriod ? `${currentPeriod.season} ${currentPeriod.year}` : '—'}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, var(--lt-rule), transparent)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--lt-text-3)', whiteSpace: 'nowrap' }}>
              {currentPeriod?.end_date ? (
                <><strong style={{ color: 'var(--neon-accent)', fontWeight: 500, textShadow: '0 0 8px var(--glow-accent)' }}>{formatDeadline(currentPeriod.end_date)}</strong>{' remaining'}</>
              ) : null}
            </span>
          </div>
        </div>

        {/* ── Search ── */}
        <div style={{ flexShrink: 0, padding: '0 22px 8px', position: 'relative', zIndex: 10 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--lt-text-3)" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search contributors, collabs, campaigns…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(235,225,205,0.05)',
                border: '1px solid rgba(235,225,205,0.1)',
                color: 'var(--lt-text)',
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                padding: '8px 12px 8px 34px',
                borderRadius: '2px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div style={{ flexShrink: 0, padding: '0 22px 0', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingRight: '14px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--lt-text-3)', marginBottom: '1px' }}>Selected</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--lt-text)', lineHeight: 1 }}>{usedSlots}</div>
          </div>
          <div style={{ width: '1px', height: '28px', background: 'var(--lt-rule)', marginRight: '14px', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingRight: '14px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--lt-text-3)', marginBottom: '1px' }}>Remaining</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', lineHeight: 1, color: 'var(--neon-green)', textShadow: '0 0 8px var(--glow-green)' }}>{remainingContent}</div>
          </div>
          <div style={{ width: '1px', height: '28px', background: 'var(--lt-rule)', marginRight: '14px', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingRight: '14px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--lt-text-3)', marginBottom: '1px' }}>Slots</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--lt-text)', lineHeight: 1 }}>{maxContentPieces}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--lt-text-3)', marginBottom: '1px' }}>Your price</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--lt-text-2)', lineHeight: 1 }}>${calculatePrice().toFixed(2)}</div>
          </div>
        </div>

        {/* ── Section tabs ── */}
        <div style={{ flexShrink: 0, padding: '10px 22px 0', display: 'flex', borderBottom: '1px solid var(--lt-rule)', position: 'relative', zIndex: 10 }}>
          {([
            { id: 'contributors' as const, label: 'Contributors', count: selectedCreators.length },
            { id: 'collabs' as const,      label: 'Collabs',      count: uniqueTemplateIds.size },
            { id: 'comms' as const,        label: 'Comms',        count: selectedCommunications.length },
            { id: 'ads' as const,          label: 'Ads',          count: selectedAds.length },
          ]).map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '8px 0', marginRight: '18px',
                fontFamily: 'var(--font-mono)', fontSize: '9px',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: activeSection === id ? 'var(--lt-text)' : 'var(--lt-text-3)',
                background: 'none', border: 'none',
                borderBottom: activeSection === id ? '1px solid rgba(235,225,205,0.35)' : '1px solid transparent',
                marginBottom: '-1px', cursor: 'pointer',
                transition: 'color 0.2s',
                whiteSpace: 'nowrap',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {label}
              {count > 0 && (
                <span style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: 'var(--neon-green)', color: '#0f0e0b',
                  fontFamily: 'var(--font-mono)', fontSize: '7px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Proof scroll area ── */}
        {(() => {
          // Content-type → neon color map used by creator cards
          const tc: Record<string, { neon: string; bannerBg: string; bgSel: string; borderSel: string; shadowSel: string; glowRgba: string; glyph: string }> = {
            photo:   { neon: 'var(--neon-blue)',   bannerBg: 'linear-gradient(135deg,rgba(90,159,212,0.1) 0%,rgba(90,159,212,0.04) 100%)',   bgSel: 'rgba(90,159,212,0.06)',   borderSel: 'rgba(90,159,212,0.25)',   shadowSel: '-4px 0 14px -2px rgba(90,159,212,0.4),0 0 18px rgba(90,159,212,0.07)',  glowRgba: 'rgba(90,159,212,0.7)',   glyph: '○' },
            art:     { neon: 'var(--neon-purple)', bannerBg: 'linear-gradient(135deg,rgba(168,136,232,0.1) 0%,rgba(168,136,232,0.04) 100%)', bgSel: 'rgba(168,136,232,0.06)', borderSel: 'rgba(168,136,232,0.25)', shadowSel: '-4px 0 14px -2px rgba(168,136,232,0.38)',                                    glowRgba: 'rgba(168,136,232,0.7)', glyph: '✦' },
            poetry:  { neon: 'var(--neon-amber)',  bannerBg: 'linear-gradient(135deg,rgba(224,168,48,0.1) 0%,rgba(224,168,48,0.04) 100%)',   bgSel: 'rgba(224,168,48,0.06)',   borderSel: 'rgba(224,168,48,0.25)',   shadowSel: '-4px 0 14px -2px rgba(224,168,48,0.38)',                                     glowRgba: 'rgba(224,168,48,0.7)',   glyph: '✦' },
            essay:   { neon: 'var(--neon-amber)',  bannerBg: 'linear-gradient(135deg,rgba(224,168,48,0.1) 0%,rgba(224,168,48,0.04) 100%)',   bgSel: 'rgba(224,168,48,0.06)',   borderSel: 'rgba(224,168,48,0.25)',   shadowSel: '-4px 0 14px -2px rgba(224,168,48,0.38)',                                     glowRgba: 'rgba(224,168,48,0.7)',   glyph: '∿' },
            music:   { neon: 'var(--neon-green)',  bannerBg: 'linear-gradient(135deg,rgba(78,196,122,0.1) 0%,rgba(78,196,122,0.04) 100%)',   bgSel: 'rgba(78,196,122,0.06)',   borderSel: 'rgba(78,196,122,0.25)',   shadowSel: '-4px 0 14px -2px rgba(78,196,122,0.38)',                                     glowRgba: 'rgba(78,196,122,0.7)',   glyph: '♩' },
          };
          const getType = (t: string) => tc[t] || tc.photo;

          return (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 80px', position: 'relative', zIndex: 10, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

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
                            <div style={{ width: '100%', height: '72px', flexShrink: 0, background: colors.bannerBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '28px', lineHeight: 1, opacity: 0.25, color: colors.neon, userSelect: 'none' }}>
                                {colors.glyph}
                              </span>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {communications.map(comm => (
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
                    {ads.map(ad => {
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

        {/* ── Action bar ── */}
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '390px', maxWidth: '100vw',
          padding: '12px 22px',
          background: 'rgba(15,14,11,0.96)',
          borderTop: '1px solid var(--lt-rule)',
          display: 'flex', alignItems: 'center', gap: '10px',
          zIndex: 200,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        } as React.CSSProperties}>

          {/* Price */}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--lt-text-3)', marginBottom: '2px' }}>
              Your price
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--lt-text)', lineHeight: 1 }}>
              ${calculatePrice().toFixed(2)}
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            style={{
              padding: '9px 14px',
              background: 'transparent',
              border: '1px solid rgba(235,225,205,0.12)',
              borderRadius: '2px',
              fontFamily: 'var(--font-mono)', fontSize: '8px',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--lt-text-3)',
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            Reset
          </button>

          {/* Save — press-btn-green mechanic */}
          <button
            onClick={pressSave}
            disabled={savingSelections}
            className={`press-btn-green${savePress === 'pressing' ? ' pressing' : ''}${savePress === 'releasing' ? ' releasing' : ''}`}
          >
            {savingSelections ? 'Saving…' : 'Save selections'}
          </button>

        </div>
      </div>
    </div>
  );
}

function formatDeadline(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return '0d';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 1) return `${days}d`;
  if (days === 1) return `${hours + 24}h`;
  return `${hours}h`;
}
