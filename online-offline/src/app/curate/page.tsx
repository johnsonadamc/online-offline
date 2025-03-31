"use client";
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import IntegratedCollabsSection from '@/components/IntegratedCollabsSection';
import { 
  Link2, 
  Users,
  Clock, 
  UserPlus,
  ArrowUpRight,
  Palette,
  BookOpen,
  X,
  Search,
  Check,
  DollarSign,
  Lock,
  Send,
  ArrowLeft,
  Camera,
  Music,
  Pen,
  History as HistoryIcon,
  MessageCircle,
  ExternalLink,
  Globe,
  MapPin
} from 'lucide-react';

// Import functions for database interaction
import { getCurrentPeriod } from '@/lib/supabase/content';
import { getUserCollabs, leaveCollab } from '@/lib/supabase/collabs';
import { getCurationData, saveCuratorSelections, getAvailableCollabTemplates } from '@/lib/supabase/curation';
import { getCollaborationsForCuration, getCollabTemplatesForPeriod } from '@/lib/supabase/collabLibrary';
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

interface Collaboration {
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

interface CollabTemplate {
  id: string;
  title: string;
  type: 'chain' | 'theme' | 'narrative';
  description: string;
  instructions?: string;
  display_text?: string;
  requirements?: string;
}

interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}

// Helper function to safely extract period data from different response formats
function extractPeriodData(response: any): Period | null {
  if (!response) return null;
  
  // If it's directly a Period object
  if (response.id && response.name && response.season && response.year) {
    return response as Period;
  }
  
  // If it has a period property (like from getCurationData)
  if (response.period && response.period.id) {
    return response.period as Period;
  }
  
  // If it's a success/error response with period data
  if (response.success && response.period && response.period.id) {
    return response.period as Period;
  }
  
  console.error("Could not extract period data from:", response);
  return null;
}

export default function CurationInterface() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const baseQuarterlyPrice = 25;
  const adDiscountAmount = 2;
  const maxContentPieces = 20;
  const [activeTab, setActiveTab] = useState("contributors");
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [joinedCollabs, setJoinedCollabs] = useState<Collaboration[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<CollabTemplate[]>([]);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [selectedCommunications, setSelectedCommunications] = useState<string[]>([]);
  const [selectedCollabs, setSelectedCollabs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [followRequests, setFollowRequests] = useState<Record<string, boolean>>({});
  const [savingSelections, setSavingSelections] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequestMap, setPendingRequestMap] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [accessibleProfiles, setAccessibleProfiles] = useState<string[]>([]);
  
  // Basic calculations
  const usedSlots = selectedCreators.length + selectedAds.length + 
                    selectedCommunications.length + selectedCollabs.length;
  const remainingContent = maxContentPieces - usedSlots;
  // Sample data functions for testing
  const getSampleCollaborations = (): Collaboration[] => {
    return [
      {
        id: "collab1",
        title: "Morning Rituals",
        type: "theme",
        participation_mode: "community",
        participant_count: 34,
        description: "Capture those bleary-eyed moments when coffee is still a wish.",
        is_joined: true
      },
      {
        id: "collab2",
        title: "Urban Spaces",
        type: "chain",
        participation_mode: "local",
        participant_count: 18,
        location: "Downtown",
        description: "A sequential exploration of urban environments and shared spaces.",
        is_joined: true
      }
    ];
  };

  const getSampleCreators = (): Creator[] => {
    return [
      { 
        id: '1', 
        name: "Sarah Kim", 
        firstName: "Sarah",
        lastName: "Kim",
        bio: "Street photographer documenting city life and urban stories",
        creatorType: "Photographer",
        contentType: "photo",
        tags: ["Street Photography"],
        lastPost: "New series: Dawn Markets of Chinatown",
        avatar: "/api/placeholder/400/400?text=SK",
        previousQuarter: true,
        type: 'friend',
        icon: Camera,
        isPrivate: true
      }
    ];
  };

  const getSampleAds = (): Ad[] => {
    return [
      {
        id: "ad1",
        name: "Artisan's Supply Co.",
        bio: "Premium art supplies and workshops for creators",
        lastPost: "Featured: New Sustainable Paint Collection",
        avatar: "/api/placeholder/400/400?text=AS",
        type: 'ad',
        discount: 2
      }
    ];
  };

  // This function maps icon strings to components
  const getIconComponent = (iconName: string | React.ElementType): React.ElementType => {
    if (typeof iconName !== 'string') {
      return iconName;
    }
    
    const iconMap: Record<string, React.ElementType> = {
      'Camera': Camera,
      'Palette': Palette,
      'Pen': Pen,
      'BookOpen': BookOpen,
      'Music': Music
    };
    
    return iconMap[iconName] || Camera;
  };

  // Function to safely get period ID
  const getPeriodId = async (): Promise<string | null> => {
    // Use current period if available
    if (currentPeriod?.id) {
      return currentPeriod.id;
    }
    
    // Otherwise try to fetch it
    try {
      console.log("No period ID available, attempting to fetch period data");
      const periodData = await getCurrentPeriod();
      const extractedPeriod = extractPeriodData(periodData);
      
      if (extractedPeriod?.id) {
        console.log("Successfully retrieved period data:", extractedPeriod);
        setCurrentPeriod(extractedPeriod);
        return extractedPeriod.id;
      }
      
      console.error("Could not retrieve period ID");
      return null;
    } catch (error) {
      console.error("Error fetching period:", error);
      return null;
    }
  };

  // Toggle card expansion
  const toggleCardExpansion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const loadAccessibleProfiles = async () => {
    try {
      // Get profiles the user has access to
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profile_connections')
        .select('followed_id')
        .eq('follower_id', user.id)
        .eq('status', 'approved');
        
      if (error) {
        console.error("Error fetching accessible profiles:", error);
        return;
      }
      
      const profileIds = data?.map(item => item.followed_id) || [];
      setAccessibleProfiles(profileIds);
    } catch (err) {
      console.error("Error loading accessible profiles:", err);
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
        setJoinedCollabs([]);
        
        console.log("Starting to load curation data...");
        
        // Get current period first to ensure we have it
        try {
          const periodData = await getCurrentPeriod();
          const extractedPeriod = extractPeriodData(periodData);
          
          if (extractedPeriod) {
            console.log("Current period loaded:", extractedPeriod);
            setCurrentPeriod(extractedPeriod);
          } else {
            console.warn("No active period found during initial load");
          }
        } catch (periodError) {
          console.error("Error loading period:", periodError);
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
            
          if (profilesError) {
            console.error("Error fetching profiles directly:", profilesError);
          } else if (profilesData) {
            console.log("Loaded profiles directly:", profilesData.length);
            
            // Convert to Creator objects
            const formattedCreators: Creator[] = profilesData.map(profile => ({
              id: profile.id,
              name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
              firstName: profile.first_name || '',
              lastName: profile.last_name || '',
              bio: profile.bio || '',
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
            console.log("Set creators state with", formattedCreators.length, "items");
            await loadAccessibleProfiles();
          }
        } catch (directQueryError) {
          console.error("Error with direct profiles query:", directQueryError);
        }
        // Load collaborations directly
        try {
          // First get collabs
          const { data: collabsData, error: collabsError } = await supabase
            .from('collabs')
            .select('*');
            
          if (collabsError) {
            console.error("Error fetching collabs directly:", collabsError);
          } else if (collabsData && collabsData.length > 0) {
            console.log("Loaded collabs directly:", collabsData.length);
            
            // Then get participants for these collabs to check which ones user has joined
            const { data: participantsData, error: participantsError } = await supabase
              .from('collab_participants')
              .select('*');
              
            if (participantsError) {
              console.error("Error fetching participants:", participantsError);
            }
            
            // Group collabs by participation mode
            const collabsList: Collaboration[] = [];
            
            for (const collab of collabsData) {
              // Get participants for this collab
              const participants = participantsData?.filter(p => p.collab_id === collab.id) || [];
              
              // Check participation mode from participants
              let participationMode: 'community' | 'local' | 'private' = 'community';
              let locationValue: string | null = null;
              
              if (collab.is_private) {
                participationMode = 'private';
              } else {
                // Check participants to determine mode
                const participantWithMode = participants.find(p => p.participation_mode);
                if (participantWithMode) {
                  if (participantWithMode.participation_mode === 'local') {
                    participationMode = 'local';
                    // Get location from city if available
                    locationValue = participantWithMode.city || null;
                  } else if (participantWithMode.participation_mode === 'private') {
                    participationMode = 'private';
                  }
                }
              }
              
              const formattedCollab: Collaboration = {
                id: collab.id,
                title: collab.title || '',
                type: (collab.type as 'chain' | 'theme' | 'narrative') || 'chain',
                participation_mode: participationMode,
                participant_count: participants.length,
                location: locationValue,
                description: collab.description || '',
                is_joined: true // Assuming all are joined for now
              };
              
              collabsList.push(formattedCollab);
            }
            
            setJoinedCollabs(collabsList);
            console.log("Set joined collabs with", collabsList.length, "items");
          }
        } catch (collabsQueryError) {
          console.error("Error with direct collabs query:", collabsQueryError);
        }
        
        // Add sample ads as a fallback
        setAds(getSampleAds());
        
        // Try to load with the original method as well
        try {
          const result = await getCurationData();
          
          if (result.success) {
            console.log("getCurationData succeeded");
            
            // Set period if available
            if (result.period) {
              console.log("Period data from curation data:", result.period);
              setCurrentPeriod(result.period);
            }
            
            // Set creators if available and not empty
            if (result.creators && Array.isArray(result.creators) && result.creators.length > 0) {
              console.log("Got creators from getCurationData:", result.creators.length);
              const mappedCreators: Creator[] = result.creators.map(c => ({
                id: c.id,
                name: c.name,
                firstName: c.firstName || '',
                lastName: c.lastName || '',
                bio: c.bio || '',
                creatorType: c.creatorType || '',
                contentType: c.contentType || '',
                tags: c.tags || [],
                lastPost: c.lastPost || '',
                avatar: c.avatar || '',
                previousQuarter: Boolean(c.previousQuarter),
                type: 'friend' as const,
                icon: getIconComponent(c.icon || 'Camera'),
                isPrivate: Boolean(c.isPrivate)
              }));
              setCreators(mappedCreators);
            }
            
            // Set joined collabs if available and not empty
            if (result.joinedCollabs && Array.isArray(result.joinedCollabs) && result.joinedCollabs.length > 0) {
              console.log("Joined collabs data:", result.joinedCollabs);
              // Ensure we have all necessary fields
              const formattedCollabs: Collaboration[] = result.joinedCollabs.map(collab => {
                let participationMode: 'community' | 'local' | 'private';
                
                // Determine participation mode
                if (collab.participation_mode && 
                    (collab.participation_mode === 'community' || 
                     collab.participation_mode === 'local' || 
                     collab.participation_mode === 'private')) {
                  participationMode = collab.participation_mode;
                } else if (typeof (collab as any).is_private !== 'undefined' && (collab as any).is_private) {
                  participationMode = 'private';
                } else if (collab.participation_mode === 'private') {
                  participationMode = 'private';
                } else {
                  participationMode = 'community';
                }
                
                return {
                  id: collab.id || '',
                  title: collab.title || '',
                  participation_mode: participationMode,
                  description: collab.description || '',
                  type: (collab.type as 'chain' | 'theme' | 'narrative') || 'chain',
                  participant_count: collab.participant_count || 
  (typeof (collab as any).participantCount !== 'undefined' ? (collab as any).participantCount : 0),
                  location: collab.location || null,
                  is_joined: true
                };
              });
              
              setJoinedCollabs(formattedCollabs);
            }
            
            // Set communications if available
            if (result.communications && Array.isArray(result.communications)) {
              setCommunications(result.communications);
            }
            
            // Set ads if available and not empty
            if (result.ads && Array.isArray(result.ads) && result.ads.length > 0) {
              setAds(result.ads);
            }
            
            // Set selections if available
            if (result.selections) {
              if (result.selections.selectedCreators && Array.isArray(result.selections.selectedCreators)) {
                setSelectedCreators(result.selections.selectedCreators);
              }
              if (result.selections.selectedAds && Array.isArray(result.selections.selectedAds)) {
                setSelectedAds(result.selections.selectedAds);
              }
              if (result.selections.selectedCollabs && Array.isArray(result.selections.selectedCollabs)) {
                // Log details about each selected collab
                result.selections.selectedCollabs.forEach(id => {
                  if (id.startsWith('local_')) {
                    console.log("Found local selection:", id);
                    const parts = id.split('_');
                    if (parts.length >= 3) {
                      const templateId = parts[1];
                      const cityName = parts.slice(2).join('_').replace(/_/g, ' ');
                      console.log(`  Template ID: ${templateId}, City: ${cityName}`);
                    }
                  } else if (id.startsWith('community_')) {
                    console.log("Found community selection:", id);
                  } else {
                    console.log("Found regular selection:", id);
                  }
                });
                
                console.log("Setting selected collabs:", result.selections.selectedCollabs);
                setSelectedCollabs(result.selections.selectedCollabs);
              }
              if (result.selections.includeCommunications) {
                setSelectedCommunications(['communications-page']);
              }
            }
          } else {
            console.warn("getCurationData result.success was false:", result.error);
          }
        } catch (dataError) {
          console.error("Error loading curation data:", dataError);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Load saved selections from localStorage when component mounts
  useEffect(() => {
    // Only try to load from localStorage when the component is not loading anymore
    if (!loading) {
      try {
        const savedSelections = localStorage.getItem('temp_selected_collabs');
        if (savedSelections) {
          const parsed = JSON.parse(savedSelections);
          console.log("Loaded temp selections from localStorage:", parsed);
          if (selectedCollabs.length === 0) {
            // Only set from localStorage if we don't have database selections yet
            setSelectedCollabs(parsed);
          }
        }
      } catch (e) {
        console.error("Error loading saved selections from localStorage:", e);
      }
    }
  }, [loading, selectedCollabs.length]);

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
      // Add debug logging
      console.log(`DESELECTION DEBUG: Toggling collab ${id}`);
      console.log(`DESELECTION DEBUG: Current state:`, selectedCollabs);
      console.log(`DESELECTION DEBUG: Is selected:`, selectedCollabs.includes(id));
      console.log(`DESELECTION DEBUG: Remaining content:`, remainingContent);
      console.log(`DESELECTION DEBUG: isAnyVersionSelected:`, isAnyVersionSelected(id));
      
      // For deselection, ALWAYS proceed with no conditions
      if (selectedCollabs.includes(id)) {
        console.log(`DESELECTION DEBUG: DESELECTING ${id}`);
        // Direct state manipulation to ensure it works
        setSelectedCollabs(selectedCollabs.filter(cid => cid !== id));
      } 
      // For selection, apply normal constraints
      else if (remainingContent > 0 || isAnyVersionSelected(id)) {
        console.log(`DESELECTION DEBUG: SELECTING ${id}`);
        setSelectedCollabs([...selectedCollabs, id]);
      }
      
      // Update localStorage directly
      const newState = selectedCollabs.includes(id) 
        ? selectedCollabs.filter(cid => cid !== id) 
        : (remainingContent > 0 || isAnyVersionSelected(id)) 
          ? [...selectedCollabs, id] 
          : selectedCollabs;
      
      localStorage.setItem('temp_selected_collabs', JSON.stringify(newState));
    } else if (type === 'communication') {
      if (selectedCommunications.includes(id)) {
        setSelectedCommunications([]);
      } else if (remainingContent > 0) {
        setSelectedCommunications([id]);
      }
    }
  };

  // Event handlers
  const handleViewCollabDetails = (collabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/collabs/${collabId}`, '_blank');
  };
  
  const handleLeaveCollab = async (collabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to leave this collaboration?')) {
      try {
        const result = await leaveCollab(collabId);
        if (result.success) {
          setJoinedCollabs(prev => prev.filter(c => c.id !== collabId));
          if (selectedCollabs.includes(collabId)) {
            setSelectedCollabs(prev => prev.filter(id => id !== collabId));
          }
          alert('You have left the collaboration successfully.');
        } else {
          alert(`Failed to leave collaboration: ${result.error || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Error leaving collaboration:", error);
        alert('An error occurred while trying to leave the collaboration.');
      }
    }
  };

  const handleFollowRequest = (creatorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowRequests(prev => ({ ...prev, [creatorId]: true }));
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

  // Get a previous quarter label based on current period
  const getPreviousQuarterLabel = (): string => {
    if (!currentPeriod) return "Winter 2025";  // Default fallback
    
    // Simple logic to get previous quarter
    const { season, year } = currentPeriod;
    switch (season) {
      case "Spring": return `Winter ${year}`;
      case "Summer": return `Spring ${year}`;
      case "Fall": return `Summer ${year}`;
      case "Winter": return `Fall ${year - 1}`;
      default: return `${season} ${year}`;
    }
  };

  // Render a creator card
  const renderCreatorCard = (creator: Creator) => {
    const CreatorIcon = creator.icon;
    const isSelected = selectedCreators.includes(creator.id);
    const previousQuarterLabel = getPreviousQuarterLabel();
    const hasPendingRequest = pendingRequestMap[creator.id];
    const isExpanded = expandedCards[creator.id] || false;
    
    return (
      <div 
        key={creator.id}
        onClick={() => creator.isPrivate ? null : toggleItem(creator.id, "friend")}
        className={`bg-white rounded-lg shadow-sm border p-4 
          ${creator.isPrivate ? 'cursor-default' : 'cursor-pointer transition-all hover:bg-gray-50'}
          ${!creator.isPrivate && isSelected ? "ring-2 ring-blue-500" : ""}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="mr-3">
              <div className="relative mb-2">
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {creator.previousQuarter && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <HistoryIcon size={10} className="text-white" />
                  </div>
                )}
              </div>
              {creator.isPrivate && (
                <div className="flex flex-col items-center text-center w-full">
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs flex items-center gap-1 text-gray-600 justify-center w-full">
                    <Lock size={10} />
                    <span className="truncate">Private</span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-base">{creator.name}</h3>
              <p className={`text-xs text-gray-600 mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                {creator.bio}
              </p>
              
              {isExpanded && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1 mb-1">
                    {creator.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-blue-500">{creator.lastPost}</p>
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
            onClick={(e) => {
              e.stopPropagation();
              handleRequestFollow(creator.id, e);
            }}
            className="mt-2 w-full text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-md py-1.5 flex items-center justify-center"
          >
            <Send size={10} className="mr-1" />
            Request Access
          </button>
        )}
        
        {creator.isPrivate && hasPendingRequest && (
          <div className="mt-2 w-full text-xs bg-gray-100 text-gray-600 rounded-md py-1.5 flex items-center justify-center">
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
        className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition-all hover:bg-gray-50 ${
          isSelected ? "ring-2 ring-blue-500" : ""
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="mr-4">
              <div className="relative mb-2">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                  <MessageCircle size={20} />
                </div>
                {messageCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {messageCount}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-medium text-base">Communications Page</h3>
              <p className="text-xs text-gray-600 mb-2">
                {messageCount === 0 
                  ? "No messages from contributors this period" 
                  : `${messageCount} message${messageCount === 1 ? '' : 's'} from contributors to include`}
              </p>
            </div>
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
        className={`bg-green-50 rounded-lg shadow-sm border p-4 cursor-pointer transition-all hover:bg-green-100 ${
          isSelected ? "ring-2 ring-green-500" : ""
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="relative mr-4">
              <img
                src={ad.avatar}
                alt={ad.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <DollarSign size={10} className="text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-medium text-base">{ad.name}</h3>
              <p className="text-xs text-gray-600 mb-2">{ad.bio}</p>
              <p className="text-xs text-green-600">{ad.lastPost}</p>
            </div>
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
      
      console.log("Saving selections with period ID:", periodId);
      console.log("Collaborations to save:", selectedCollabs);
      
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
        console.error("Error from saveCuratorSelections:", result.error);
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
    } catch (error) {
      console.error("Error saving selections:", error);
      alert('There was an error saving your selections. ' + 
        (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSavingSelections(false);
    }
  };

  // Simple price calculation
  const calculatePrice = () => {
    return baseQuarterlyPrice - (selectedAds.length * adDiscountAmount);
  };

// Filtered lists with selected contributors at the top
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
          <Button onClick={() => window.location.reload()} className="bg-blue-500 text-white">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Main render with tab-based mobile interface
  return (
    <div className="max-w-6xl mx-auto pb-20 md:pb-8">
      {/* Mobile Header */}
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
            
            {/* Stats for mobile */}
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

      {/* Mobile Tabs */}
      <div className="md:hidden">
        <Tabs defaultValue={activeTab} className="w-full">
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
                {selectedCollabs.length > 0 && (
                  <span className="mt-1 text-[10px] bg-blue-500 text-white rounded-full w-4 h-4 inline-flex items-center justify-center">
                    {selectedCollabs.length}
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
              hideTitle={true}
            />
          </TabsContent>
          
          <TabsContent value="communications" className="px-4 py-4 focus-visible:outline-none">
            <div className="grid grid-cols-1 gap-4">
              {renderCommunicationsCard()}
              
              <div className="bg-amber-50 p-4 rounded-lg">
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
              
              <div className="bg-green-50 p-4 rounded-lg">
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
      </div>
      
      {/* Desktop Layout (preserved from original) */}
      <div className="hidden md:block px-4 py-6">
        <div className="grid gap-6">
          {/* Section toggles - centered without box */}
          <div className="flex justify-center mb-6 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {['contributors', 'collaborations', 'communications', 'campaigns'].map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    activeTab === key 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                  {activeTab === key ? ' ✓' : ''}
                </button>
              ))}
            </div>
          </div>
          {/* Desktop Save/Reset buttons */}
<div className="hidden md:flex justify-end mb-4">
  <div className="flex gap-2">
    <Button 
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
      className="border-0 bg-gray-200 text-gray-800 hover:bg-gray-300 text-xs p-2 rounded font-medium"
    >
      Reset
    </Button>
    
    <Button
      onClick={saveSelections}
      disabled={savingSelections}
      className="bg-blue-500 text-white hover:bg-blue-600"
    >
      {savingSelections ? 'Saving...' : 'Save'}
    </Button>
  </div>
</div>

          {/* Desktop Content Grid */}
          <div className="grid grid-cols-1 gap-6">
            {/* Contributors section */}
            {activeTab === 'contributors' && (
              <Card className="h-full overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-center">
                    <span>Contributors</span>
                    {selectedCreators.length > 0 && (
                      <span className="text-sm text-blue-500 font-normal">
                        {selectedCreators.length} selected
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div 
                    className="h-full p-2 overflow-y-auto"
                    style={{ height: "550px", maxHeight: "550px" }}
                  >
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
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Collaborations section */}
            {activeTab === 'collaborations' && (
              <Card className="h-full overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-center">
                    <span>Collaborations</span>
                    {selectedCollabs.length > 0 && (
                      <span className="text-sm text-blue-500 font-normal">
                        {selectedCollabs.length} selected
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div 
                    className="h-full p-2 overflow-y-auto"
                    style={{ height: "550px", maxHeight: "550px" }}
                  >
                    <IntegratedCollabsSection
                      periodId={currentPeriod?.id || ''}
                      selectedCollabs={selectedCollabs}
                      toggleItem={(id) => toggleItem(id, "collab")}
                      remainingContent={remainingContent}
                      hideTitle={true}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Communications section */}
            {activeTab === 'communications' && (
              <Card className="h-full overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-center">
                    <span>Communications</span>
                    {selectedCommunications.length > 0 && (
                      <span className="text-sm text-blue-500 font-normal">
                        1 page selected
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div 
                    className="h-full p-2 overflow-y-auto"
                    style={{ height: "550px", maxHeight: "550px" }}
                  >
                    <div className="grid grid-cols-1 gap-4">
                      {renderCommunicationsCard()}
                      
                      <div className="bg-amber-50 p-5 rounded-lg">
                        <h3 className="font-medium mb-2">About Communications Pages</h3>
                        <p className="text-sm text-gray-600 mb-3">
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
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Campaigns (Ads) section */}
            {activeTab === 'campaigns' && (
              <Card className="h-full overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-center">
                    <span>Campaigns</span>
                    {selectedAds.length > 0 && (
                      <span className="text-sm text-green-500 font-normal">
                        {selectedAds.length} selected (${selectedAds.length * adDiscountAmount} discount)
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div 
                    className="h-full p-2 overflow-y-auto"
                    style={{ height: "550px", maxHeight: "550px" }}
                  >
                    {ads.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                        {ads.map(ad => renderAdCard(ad))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-gray-50 rounded-lg">
                        <p className="text-gray-600">No campaigns available for this period</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Action Bar */}
<div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 md:hidden z-10">
  <div className="flex justify-end max-w-md mx-auto">
    <div className="flex gap-2">
      <Button
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
        className="border-0 bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium"
      >
        Reset
      </Button>
      
      <Button
        onClick={saveSelections}
        disabled={savingSelections}
        className="h-9 px-4 bg-blue-500 text-white text-sm"
      >
        {savingSelections ? 'Saving...' : 'Save'}
      </Button>
    </div>
  </div>
</div>
    </div>
  );
}
