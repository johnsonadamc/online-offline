"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import IntegratedCollabsSection from '@/components/IntegratedCollabsSection';
import { 
  Search, 
  Check, 
  DollarSign, 
  Lock,
  Send,
  ArrowLeft,
  Camera,
  MessageCircle,
  X,
  Save,
  Clock
} from 'lucide-react';

// Import functions for database interaction
import { getCurrentPeriod } from '@/lib/supabase/content';
import { saveCuratorSelections } from '@/lib/supabase/curation';
import { sendFollowRequest } from '@/lib/supabase/profiles';

// Basic interfaces (simplified)
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
  participantCount?: number; // Allow both naming conventions
  location?: string | null;
  description?: string;
  is_private?: boolean; // Including this for backward compatibility
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

// Helper function to safely extract period data from different response formats
function extractPeriodData(response: unknown): Period | null {
  if (!response) return null;
  
  // Cast to Record<string, unknown> for safe property access
  const resp = response as Record<string, unknown>;
  
  // Helper function to create a Period from an object, with proper type checking
  const createPeriodFromObject = (obj: Record<string, unknown>): Period | null => {
    // Check if all required properties exist with correct types
    if (
      typeof obj.id === 'string' &&
      typeof obj.name === 'string' &&
      typeof obj.season === 'string' &&
      typeof obj.year === 'number' &&
      typeof obj.end_date === 'string'
    ) {
      // Safely create a Period object
      return {
        id: obj.id,
        name: obj.name,
        season: obj.season,
        year: obj.year,
        end_date: obj.end_date,
        is_active: typeof obj.is_active === 'boolean' ? obj.is_active : undefined
      };
    }
    return null;
  };
  
  // Case 1: Direct Period object
  if (resp.id && resp.name && resp.season && resp.year && resp.end_date) {
    return createPeriodFromObject(resp);
  }
  
  // Case 2: Period inside 'period' property
  if (resp.period && typeof resp.period === 'object') {
    const periodObj = resp.period as Record<string, unknown>;
    if (periodObj.id && periodObj.name && periodObj.season && periodObj.year && periodObj.end_date) {
      return createPeriodFromObject(periodObj);
    }
  }
  
  // Case 3: Success response with period data
  if (resp.success === true && resp.period && typeof resp.period === 'object') {
    const periodObj = resp.period as Record<string, unknown>;
    if (periodObj.id && periodObj.name && periodObj.season && periodObj.year && periodObj.end_date) {
      return createPeriodFromObject(periodObj);
    }
  }
  
  return null;
}

export default function CurationInterface() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const baseQuarterlyPrice = 25;
  const adDiscountAmount = 2;
  const maxContentPieces = 20;
  
  // State definitions
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [selectedCommunications, setSelectedCommunications] = useState<string[]>([]);
  const [selectedCollabs, setSelectedCollabs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [savingSelections, setSavingSelections] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequestMap, setPendingRequestMap] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [accessibleProfiles, setAccessibleProfiles] = useState<string[]>([]);
 
  // Add this event listener to handle direct updates from IntegratedCollabsSection
  useEffect(() => {
    const handleDirectCollabsUpdate = (e: CustomEvent<{ updatedCollabs: string[] }>) => {
      if (e.detail && e.detail.updatedCollabs) {
        setSelectedCollabs(e.detail.updatedCollabs);
      }
    };
    
    // Type assertion to handle CustomEvent
    window.addEventListener('updateSelectedCollabs', 
      handleDirectCollabsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('updateSelectedCollabs', 
        handleDirectCollabsUpdate as EventListener);
    };
  }, []);

  // Calculate unique template count for collaborations
  const uniqueTemplateIds = new Set();

  // Extract template IDs from all selectedCollabs
  selectedCollabs.forEach(id => {
    if (!id || id.trim() === '') return;
    
    if (id.startsWith('local_')) {
      const parts = id.split('_');
      if (parts.length >= 2) uniqueTemplateIds.add(parts[1]);
      else uniqueTemplateIds.add(id);
    } else if (id.startsWith('community_')) {
      uniqueTemplateIds.add(id.substring('community_'.length));
    } else {
      // For direct IDs, just add them as is
      uniqueTemplateIds.add(id);
    }
  });

  const usedSlots = selectedCreators.length + selectedAds.length + 
                   selectedCommunications.length + uniqueTemplateIds.size;
  const remainingContent = maxContentPieces - usedSlots;
  
  const loadAccessibleProfiles = useCallback(async () => {
    try {
      // Get profiles the user has access to
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error: accessError } = await supabase
        .from('profile_connections')
        .select('followed_id')
        .eq('follower_id', user.id)
        .eq('status', 'approved');
        
      if (accessError) {
        return;
      }
      
      const profileIds = data?.map(item => item.followed_id) || [];
      setAccessibleProfiles(profileIds);
    } catch (error) {
      // Error handling is done silently
      console.error("Error loading accessible profiles:", error);
    }
  }, [supabase]);
  // Toggle card expansion
  const toggleCardExpansion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Function to safely get period ID
  const getPeriodId = async (): Promise<string | null> => {
    // Use current period if available
    if (currentPeriod?.id) {
      return currentPeriod.id;
    }
    
    // Otherwise try to fetch it
    try {
      const periodData = await getCurrentPeriod();
      const extractedPeriod = extractPeriodData(periodData);
      
      if (extractedPeriod?.id) {
        setCurrentPeriod(extractedPeriod);
        return extractedPeriod.id;
      }
      
      return null;
    } catch (fetchError) {
      console.error("Error fetching period:", fetchError);
      return null;
    }
  };

  // Helper function to check if any version of this template is already selected
  const isAnyVersionSelected = (collabId: string) => {
    // For community collabs
    if (collabId.startsWith('community_')) {
      const templateId = collabId.split('community_')[1];
      // Check if any local version of this template is selected
      return selectedCollabs.some(id => id.startsWith(`local_${templateId}_`));
    }
    
    // For local collabs
    if (collabId.startsWith('local_')) {
      const parts = collabId.split('_');
      if (parts.length >= 3) {
        const templateId = parts[1];
        // Check if the community version is selected
        return selectedCollabs.includes(`community_${templateId}`);
      }
    }
    
    return false;
  };

  // Toggle selection functions
  const toggleItem = (id: string, type: 'friend' | 'ad' | 'collab' | 'communication') => {
    if (type === 'ad') {
      if (selectedAds.includes(id)) {
        setSelectedAds(selectedAds.filter(adId => adId !== id));
      } else if (remainingContent > 0) {
        setSelectedAds([...selectedAds, id]);
      }
    } else if (type === 'friend') {
      if (selectedCreators.includes(id)) {
        setSelectedCreators(selectedCreators.filter(creatorId => creatorId !== id));
      } else if (remainingContent > 0) {
        setSelectedCreators([...selectedCreators, id]);
      }
    } else if (type === 'collab') {
      // For deselection, ALWAYS proceed with no conditions
      if (selectedCollabs.includes(id)) {
        // Use functional update to ensure we're working with the latest state
        setSelectedCollabs(current => {
          const updated = current.filter(cid => cid !== id);
          return updated;
        });
      } 
      // For selection, apply normal constraints
      else if (remainingContent > 0 || isAnyVersionSelected(id)) {
        // Use functional update to ensure we're working with the latest state
        setSelectedCollabs(current => {
          const updated = [...current, id];
          return updated;
        });
      }
      
      // Update localStorage directly - but do it inside a setTimeout to ensure state is updated
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
    e.stopPropagation(); // Prevent triggering card selection
    
    const result = await sendFollowRequest(creatorId);
    
    if (result.success) {
      setPendingRequestMap(prev => ({
        ...prev,
        [creatorId]: true
      }));
      
      alert('Follow request sent!');
    } else {
      alert(`Error: ${result.error || 'Failed to send request'}`);
    }
  };
  
  // Load data 
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Set empty state to start
        setCreators([]);
        setAds([]);
        
        // Get current period first to ensure we have it
        try {
          const periodData = await getCurrentPeriod();
          const extractedPeriod = extractPeriodData(periodData);
          
          if (extractedPeriod) {
            setCurrentPeriod(extractedPeriod);
          }
        } catch (periodFetchError) {
          console.error("Error fetching period data:", periodFetchError);
          // Continue with other data loading
        }
        
        // Direct database query to get creators as a fallback
        try {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select(`
              id,
              first_name,
              last_name,
              avatar_url,
              is_public,
              bio
            `)
            .order('first_name');
            
          if (!profilesError && profilesData) {
            // Convert to Creator objects
            const formattedCreators: Creator[] = profilesData.map(profile => ({
              id: profile.id,
              name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unnamed Creator',
              firstName: profile.first_name || '',
              lastName: profile.last_name || '',
              bio: profile.bio || "",
              creatorType: "Contributor", // Default type
              contentType: "photo", // Default content type
              tags: [], // No tags available in direct query
              lastPost: "", // No last post info available
              avatar: profile.avatar_url || `/api/placeholder/400/400?text=${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`,
              previousQuarter: false, // No history available
              type: 'friend' as const,
              icon: Camera, // Default icon
              isPrivate: !profile.is_public
            }));
            
            setCreators(formattedCreators);
            await loadAccessibleProfiles();
          }
        } catch (profileQueryError) {
          console.error("Error fetching profiles:", profileQueryError);
          // Continue with other data loading
        }
        
        // Add sample ads data
        setAds([
          {
            id: "ad1",
            name: "Artisan's Supply Co.",
            bio: "Premium art supplies and workshops for creators",
            lastPost: "Featured: New Sustainable Paint Collection",
            avatar: "/api/placeholder/400/400?text=AS",
            type: 'ad',
            discount: 2
          },
          {
            id: "ad2",
            name: "The Reading Room",
            bio: "Independent bookstore with curated collections & events",
            avatar: "/api/placeholder/400/400?text=RR",
            lastPost: "Event: Monthly Poetry Reading Night",
            type: 'ad',
            discount: 2
          }
        ]);
          
        // Mock communications
        setCommunications([
          {
            id: "comm1",
            subject: "Thoughts on my latest series",
            sender_id: "user1",
            profiles: {
              first_name: "Sarah",
              last_name: "Chen",
              avatar_url: "/api/placeholder/400/400?text=SC"
            }
          },
          {
            id: "comm2",
            subject: "Collaboration opportunity",
            sender_id: "user2",
            profiles: {
              first_name: "Marcus",
              last_name: "Johnson",
              avatar_url: "/api/placeholder/400/400?text=MJ"
            }
          }
        ]);
        
        // Get existing selections from localStorage
        try {
          const savedSelectionsJson = localStorage.getItem('magazine_selections');
          if (savedSelectionsJson) {
            const savedSelections = JSON.parse(savedSelectionsJson);
            if (savedSelections.contributors) {
              setSelectedCreators(savedSelections.contributors);
            }
            if (savedSelections.campaigns) {
              setSelectedAds(savedSelections.campaigns);
            }
            if (savedSelections.communications) {
              setSelectedCommunications(savedSelections.communications);
            }
            if (savedSelections.collaborations) {
              setSelectedCollabs(savedSelections.collaborations);
            }
          }
        } catch (storageError) {
          console.error("Error loading saved selections:", storageError);
          // Continue without saved selections
        }
        
        setLoading(false);
      } catch (loadError) {
        setError("An unexpected error occurred loading data");
        console.error("Error in loadData:", loadError);
        setLoading(false);
      }
    }
    
    loadData();
 }, [supabase, loadAccessibleProfiles]);
  
  // Load saved selections from localStorage when component mounts
  useEffect(() => {
    // Only try to load from localStorage when the component is not loading anymore
    if (!loading) {
      try {
        const savedSelections = localStorage.getItem('temp_selected_collabs');
        if (savedSelections) {
          const parsed = JSON.parse(savedSelections);
          if (selectedCollabs.length === 0) {
            // Only set from localStorage if we don't have database selections yet
            setSelectedCollabs(parsed);
          }
        }
      } catch (parseError) {
        console.error("Error parsing saved collaborations:", parseError);
        // Continue without the saved collaborations
      }
    }
  }, [loading, selectedCollabs.length]);
  // Render a creator card
  const renderCreatorCard = (creator: Creator) => {
    const CreatorIcon = creator.icon;
    const isSelected = selectedCreators.includes(creator.id);
    const hasPendingRequest = pendingRequestMap[creator.id];
    const isExpanded = expandedCards[creator.id] || false;
    
    return (
      <div 
        key={creator.id}
        onClick={() => creator.isPrivate ? null : toggleItem(creator.id, "friend")}
        className={`p-3 border rounded-sm ${
          creator.isPrivate ? 'cursor-default' : 'cursor-pointer transition-all hover:border-gray-200 hover:bg-blue-50'
        } ${!creator.isPrivate && isSelected ? "border-blue-200 bg-blue-50" : "border-gray-100"}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-blue-50 text-blue-500">
            <CreatorIcon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-normal text-gray-900 truncate">{creator.name}</h3>
              {creator.isPrivate && (
                <span className="px-2 py-0.5 rounded-sm bg-gray-100 text-gray-600 text-xs flex items-center gap-1">
                  <Lock size={10} />
                  Private
                </span>
              )}
            </div>
            <p className={`text-xs text-gray-600 ${isExpanded ? '' : 'line-clamp-2'}`}>
              {creator.bio}
            </p>
            
            {isExpanded && creator.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {creator.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            {(creator.bio || creator.tags.length > 0) && (
              <button 
                className="mt-1 text-xs text-blue-500 flex items-center"
                onClick={(e) => toggleCardExpansion(creator.id, e)}
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
          
          {!creator.isPrivate && (
            <div className="flex items-center justify-center"
              style={{ 
                width: '24px', 
                height: '24px', 
                borderRadius: '50%',
                backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                borderWidth: isSelected ? '0' : '1px',
                borderColor: '#d1d5db',
                borderStyle: 'solid',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isSelected && <Check size={14} className="text-white" />}
            </div>
          )}
        </div>
        
        {creator.isPrivate && !hasPendingRequest && (
          <button
            onClick={(e) => handleRequestFollow(creator.id, e)}
            className="mt-2 w-full text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-sm py-1.5 flex items-center justify-center"
          >
            <Send size={10} className="mr-1" />
            Request Access
          </button>
        )}
        
        {creator.isPrivate && hasPendingRequest && (
          <div className="mt-2 w-full text-xs bg-gray-100 text-gray-600 rounded-sm py-1.5 flex items-center justify-center">
            <Clock size={10} className="mr-1" />
            Request Pending
          </div>
        )}
      </div>
    );
  };

  // Render a communications card
  const renderCommunicationsCard = () => {
    const isSelected = selectedCommunications.length > 0;
    const messageCount = communications ? communications.length : 0;
    
    return (
      <div 
        onClick={() => toggleItem('communications-page', 'communication')}
        className={`p-3 border rounded-sm ${
          isSelected ? "border-blue-200 bg-blue-50" : "border-gray-100"
        } hover:border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-amber-50 text-amber-500">
            <MessageCircle size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-normal text-gray-900">Communications Page</h3>
              {messageCount > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                  {messageCount}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 line-clamp-2">
              {messageCount === 0 
                ? "No messages from contributors this period" 
                : `${messageCount} message${messageCount === 1 ? '' : 's'} from contributors to include`}
            </p>
          </div>
          
          <div className="flex items-center justify-center"
            style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%',
              backgroundColor: isSelected ? '#3b82f6' : 'transparent',
              borderWidth: isSelected ? '0' : '1px',
              borderColor: '#d1d5db',
              borderStyle: 'solid',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isSelected && <Check size={14} className="text-white" />}
          </div>
        </div>
      </div>
    );
  };

  // Render an ad card
  const renderAdCard = (ad: Ad) => {
    const isSelected = selectedAds.includes(ad.id);
    
    return (
      <div 
        key={ad.id}
        onClick={() => toggleItem(ad.id, "ad")}
        className={`p-3 border rounded-sm ${
          isSelected ? "border-green-200 bg-green-50" : "border-gray-100"
        } hover:border-gray-200 hover:bg-green-50 transition-colors cursor-pointer`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-green-50 text-green-500">
            <DollarSign size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-normal text-gray-900 truncate">{ad.name}</h3>
              <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-sm text-xs flex items-center gap-1">
                ${adDiscountAmount} off
              </span>
            </div>
            <p className="text-xs text-gray-600 line-clamp-2">{ad.bio}</p>
          </div>
          
          <div className="flex items-center justify-center"
            style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%',
              backgroundColor: isSelected ? '#22c55e' : 'transparent',
              borderWidth: isSelected ? '0' : '1px',
              borderColor: '#d1d5db',
              borderStyle: 'solid',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isSelected && <Check size={14} className="text-white" />}
          </div>
        </div>
      </div>
    );
  };
  
  // Improved saveSelections function with proper type handling
  const saveSelections = async () => {
    setSavingSelections(true);
    try {
      // Get user information
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error("User not authenticated");
      }
      
      // Get period ID safely
      const periodId = await getPeriodId();
      if (!periodId) {
        throw new Error("No active period found");
      }
      
      // Save the selections
      const result = await saveCuratorSelections({
        curator_id: userData.user.id,
        period_id: periodId,
        selected_contributors: selectedCreators,
        selected_collaborations: selectedCollabs, 
        selected_communications: selectedCommunications,
        selected_ads: selectedAds
      });
      
      if (!result.success) {
        throw new Error(result.error || "Failed to save selections");
      }
      
      // Save to local storage for backup
      localStorage.setItem('magazine_selections', JSON.stringify({
        contributors: selectedCreators,
        collaborations: selectedCollabs,
        communications: selectedCommunications,
        campaigns: selectedAds
      }));
      
      // Clear the temporary storage after successful save
      localStorage.removeItem('temp_selected_collabs');
      
      alert('Your magazine selections have been saved!');
      router.push('/dashboard');
    } catch (saveError) {
      console.error("Error saving selections:", saveError);
      alert('There was an error saving your selections. ' + 
        (saveError instanceof Error ? saveError.message : 'Unknown error'));
    } finally {
      setSavingSelections(false);
    }
  };

  // Simple price calculation
  const calculatePrice = () => {
    return baseQuarterlyPrice - (selectedAds.length * adDiscountAmount);
  };
  // Filtered lists with selected creators at the top
  const filteredCreators = creators
    .filter(creator => {
      // Only show public profiles or private profiles with approved access
      if (creator.isPrivate && !accessibleProfiles.includes(creator.id)) {
        return false;
      }
      
      return searchTerm === '' || 
        creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creator.bio.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      // Sort selected creators to the top
      const aSelected = selectedCreators.includes(a.id);
      const bSelected = selectedCreators.includes(b.id);
      
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

  // Loading screen
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading curation interface...</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 mb-4">
            <X size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-medium mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main render with Unified UI (mobile-first approach)
  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="px-4 py-3">
          {/* Top row with back button and title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-3 text-gray-500">
                <ArrowLeft size={18} />
              </Link>
              <div>
                <h1 className="text-base md:text-xl font-medium leading-tight">Curate Your Magazine</h1>
                {currentPeriod && (
                  <p className="text-xs md:text-sm text-gray-600">
                    {currentPeriod.season} {currentPeriod.year} Issue
                  </p>
                )}
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end">
                <div className="text-xs text-gray-500">Slots</div>
                <div className="text-sm font-medium">
                  <span className="text-blue-600">{remainingContent}</span>
                  <span className="text-gray-400">/</span>
                  <span>{maxContentPieces}</span>
                </div>
              </div>
              
              <div className="flex flex-col items-end ml-3">
                <div className="text-xs text-gray-500">Price</div>
                <div className="text-sm font-medium text-green-600">
                  ${calculatePrice().toFixed(2)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Search row */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <Input
              type="text"
              placeholder="Search creators, content, and collaborations..."
              className="w-full pl-9 py-1.5 h-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contributors" className="w-full">
        <TabsList className="grid grid-cols-4 w-full rounded-none border-b">
          <TabsTrigger 
            value="contributors" 
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:shadow-none rounded-none"
          >
            <div className="flex flex-col items-center py-1">
              <span className="text-xs">Contributors</span>
              {selectedCreators.length > 0 && (
                <span className="mt-1 text-[10px] bg-blue-500 text-white rounded-full w-4 h-4 inline-flex items-center justify-center">
                  {selectedCreators.length}
                </span>
              )}
            </div>
          </TabsTrigger>
          
          <TabsTrigger 
            value="collaborations"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:shadow-none rounded-none"
          >
            <div className="flex flex-col items-center py-1">
              <span className="text-xs">Collabs</span>
              {uniqueTemplateIds.size > 0 && (
                <span className="mt-1 text-[10px] bg-blue-500 text-white rounded-full w-4 h-4 inline-flex items-center justify-center">
                  {uniqueTemplateIds.size}
                </span>
              )}
            </div>
          </TabsTrigger>
          
          <TabsTrigger 
            value="communications"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:shadow-none rounded-none"
          >
            <div className="flex flex-col items-center py-1">
              <span className="text-xs">Comms</span>
              {selectedCommunications.length > 0 && (
                <span className="mt-1 text-[10px] bg-blue-500 text-white rounded-full w-4 h-4 inline-flex items-center justify-center">
                  1
                </span>
              )}
            </div>
          </TabsTrigger>
          
          <TabsTrigger 
            value="campaigns"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:shadow-none rounded-none"
          >
            <div className="flex flex-col items-center py-1">
              <span className="text-xs">Ads</span>
              {selectedAds.length > 0 && (
                <span className="mt-1 text-[10px] bg-green-500 text-white rounded-full w-4 h-4 inline-flex items-center justify-center">
                  {selectedAds.length}
                </span>
              )}
            </div>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="contributors" className="px-4 py-4 focus-visible:outline-none">
          <div className="grid grid-cols-1 gap-4">
            {filteredCreators.length > 0 ? (
              <>
                {filteredCreators.map((creator, index) => {
                  // Add a separator after the last selected creator
                  const isSelected = selectedCreators.includes(creator.id);
                  const nextCreator = filteredCreators[index + 1];
                  const nextIsSelected = nextCreator ? selectedCreators.includes(nextCreator.id) : false;
                  const showSeparator = selectedCreators.length > 0 && isSelected && !nextIsSelected;
                  
                  return (
                    <React.Fragment key={creator.id}>
                      {renderCreatorCard(creator)}
                      {showSeparator && (
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                          </div>
                          <div className="relative flex justify-center">
                            <span className="px-2 bg-white text-xs text-gray-500">Selected Contributors Above</span>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </>
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-lg">
                <p className="text-gray-600">No creators found matching your search</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="collaborations" className="px-4 py-4 focus-visible:outline-none">
          <IntegratedCollabsSection
            periodId={currentPeriod?.id || ''}
            selectedCollabs={selectedCollabs}
            toggleItem={(id) => toggleItem(id, "collab")}
            remainingContent={remainingContent}
          />
        </TabsContent>
        
        <TabsContent value="communications" className="px-4 py-4 focus-visible:outline-none">
          <div className="grid grid-cols-1 gap-4">
            {renderCommunicationsCard()}
            
            <div className="bg-amber-50 p-4 rounded-sm">
              <h3 className="font-medium mb-2">About Communications Pages</h3>
              <p className="text-xs text-gray-600 mb-3">
                Communications are direct messages from contributors to you as a curator. 
                Including a communications page showcases these messages.
              </p>
              <div className="text-xs text-gray-500">
                <p>• Up to 10 messages per page</p>
                <p>• Automatically formatted</p>
                <p>• Layouts adjusted based on message count</p>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="campaigns" className="px-4 py-4 focus-visible:outline-none">
          <div className="grid grid-cols-1 gap-4">
            {ads.length > 0 ? (
              ads.map(ad => renderAdCard(ad))
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-lg">
                <p className="text-gray-600">No campaigns available for this period</p>
              </div>
            )}
            
            <div className="bg-green-50 p-4 rounded-sm">
              <h3 className="font-medium mb-2">About Campaigns</h3>
              <p className="text-xs text-gray-600 mb-1">
                Including campaigns in your magazine gives you discounts:
              </p>
              <div className="text-sm font-medium text-green-600">
                Each campaign reduces your price by ${adDiscountAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-md z-10">
        <div className="flex gap-3 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Are you sure you want to reset all selections? This will clear everything from your curation.")) {
                // Clear all state
                setSelectedCollabs([]);
                setSelectedCreators([]);
                setSelectedAds([]);
                setSelectedCommunications([]);
                
                // Clear localStorage
                localStorage.removeItem('temp_selected_collabs');
                localStorage.removeItem('magazine_selections');
                localStorage.removeItem('selected_cities');
                
                // Perform complete database cleanup
                const cleanupDB = async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user && currentPeriod?.id) {
                    // Clear collaboration selections
                    await supabase
                      .from('curator_collab_selections')
                      .delete()
                      .eq('curator_id', user.id)
                      .eq('period_id', currentPeriod.id);
                    
                    // Clear creator selections
                    await supabase
                      .from('curator_creator_selections')
                      .delete()
                      .eq('curator_id', user.id)
                      .eq('period_id', currentPeriod.id);
                    
                    // Clear campaign (ad) selections
                    await supabase
                      .from('curator_campaign_selections')
                      .delete()
                      .eq('curator_id', user.id)
                      .eq('period_id', currentPeriod.id);
                  }
                };
                
                cleanupDB();
                alert('All selections have been reset');
              }
            }}
            className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" />
            Reset
          </button>
          
          <button
            type="button"
            onClick={saveSelections}
            disabled={savingSelections}
            className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {savingSelections ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
