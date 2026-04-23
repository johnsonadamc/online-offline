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

  // ── Filtered / sorted creator list ────────────────────────────────────────
  const filteredCreators = creators
    .filter(creator => {
      if (creator.isPrivate && !accessibleProfiles.includes(creator.id)) return false;
      return searchTerm === '' ||
        creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creator.bio.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      const aSelected = selectedCreators.includes(a.id);
      const bSelected = selectedCreators.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

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
            .select('id, first_name, last_name, avatar_url, is_public, bio')
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
              contentType: 'photo',
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

        {/* PART 2 ENDS HERE — Part 3 adds proof scroll + tab panels */}
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
