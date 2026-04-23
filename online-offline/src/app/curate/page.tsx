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

  // PART 1 ENDS HERE
