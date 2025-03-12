"use client";
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  
  // Section visibility toggles
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    contributors: true,
    collaborations: true,
    communications: true,
    campaigns: true
  });
  
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
      if (selectedCollabs.includes(id)) {
        setSelectedCollabs(selectedCollabs.filter(collabId => collabId !== id));
      } else if (remainingContent > 0) {
        setSelectedCollabs([...selectedCollabs, id]);
      }
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

  // Filtered lists
  const filteredCreators = creators.filter(creator => {
    return searchTerm === '' || 
      creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      creator.bio.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredCollabs = joinedCollabs.filter(collab => {
    if (searchTerm && searchTerm.length > 0) {
      const titleMatch = collab.title && collab.title.toLowerCase().includes(searchTerm.toLowerCase());
      let descriptionMatch = false;
      if (typeof collab.description === 'string' && collab.description) {
        descriptionMatch = collab.description.toLowerCase().includes(searchTerm.toLowerCase());
      }
      if (!titleMatch && !descriptionMatch) {
        return false;
      }
    }
    return true;
  });

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
    
    return (
      <div 
        key={creator.id}
        onClick={() => toggleItem(creator.id, "friend")}
        className={`bg-white rounded-lg shadow-sm border p-6 cursor-pointer transition-all hover:bg-gray-50 ${
          isSelected ? "ring-2 ring-blue-500" : ""
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="mr-6">
              <div className="relative mb-2">
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                {creator.previousQuarter && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <HistoryIcon size={12} className="text-white" />
                  </div>
                )}
              </div>
              {creator.isPrivate && (
                <div className="flex flex-col items-center text-center w-16">
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs flex items-center gap-1 text-gray-600 justify-center w-full">
                    <Lock size={12} />
                    <span className="truncate">Private</span>
                  </span>
                  
                  {!followRequests[creator.id] ? (
                    <button
                      onClick={(e) => handleFollowRequest(creator.id, e)}
                      className="mt-1 w-16 h-6 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full text-[9px] flex items-center justify-center transition-colors"
                      title="Request to follow this creator"
                    >
                      <Send size={8} className="mr-1" />
                      Request
                    </button>
                  ) : (
                    <span className="mt-1 w-16 h-6 bg-gray-100 text-gray-600 rounded-full text-[9px] flex items-center justify-center">
                      <Clock size={8} className="mr-1" />
                      Pending
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium text-lg">{creator.name}</h3>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
                  {previousQuarterLabel}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{creator.bio}</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {creator.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-blue-500">{creator.lastPost}</p>
            </div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isSelected 
              ? "bg-blue-500 text-white" 
              : "bg-gray-100"
          }`}>
            {isSelected && <Check size={16} />}
          </div>
        </div>
      </div>
    );
  };

  // Render a collaboration card
  const renderCollabCard = (collab: Collaboration) => {
    const isSelected = selectedCollabs.includes(collab.id);
    
    // Determine type icon
    let TypeIcon = Link2; // Default for chain
    let typeColor = 'bg-indigo-100 text-indigo-600';
    const collabType = collab.type || 'chain';
    
    if (collabType === 'theme') {
      TypeIcon = Palette;
      typeColor = 'bg-amber-100 text-amber-600';
    } else if (collabType === 'narrative') {
      TypeIcon = BookOpen;
      typeColor = 'bg-emerald-100 text-emerald-600';
    }
    
    // Determine mode icon and colors based on participation_mode
    let ModeIcon = Globe;
    let modeColor = 'bg-blue-100 text-blue-600';
    let modeLabel = 'Community';
    const participationMode = collab.participation_mode || 'community';
    
    if (participationMode === 'private') {
      ModeIcon = Lock;
      modeColor = 'bg-purple-100 text-purple-600';
      modeLabel = 'Private';
    } else if (participationMode === 'local') {
      ModeIcon = MapPin;
      modeColor = 'bg-green-100 text-green-600';
      modeLabel = 'Local';
    }
    
    // Determine participant count (handle both naming conventions)
    const participantCount = collab.participant_count ?? collab.participantCount ?? 
                          (collab.participants ? collab.participants.length : 0);
    
    // Format location
    const location = collab.location || '';
    
    return (
      <div 
        key={collab.id}
        onClick={() => toggleItem(collab.id, "collab")}
        className={`bg-white rounded-lg shadow-sm border p-6 cursor-pointer transition-all hover:bg-gray-50 ${
          isSelected ? "ring-2 ring-blue-500" : ""
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="mr-6">
              <div className="relative mb-2">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${typeColor}`}>
                  <TypeIcon size={24} />
                </div>
              </div>
              <div className="flex flex-col items-center text-center w-16">
                <div className={`px-2 py-0.5 rounded-full text-xs ${modeColor}`}>
                  {modeLabel}
                </div>
                {participationMode === 'local' && location && (
                  <span className="text-[10px] text-gray-500 mt-1">{location}</span>
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-lg">{collab.title || 'Untitled Collaboration'}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  collabType === 'chain' ? 'bg-indigo-100 text-indigo-600' :
                  collabType === 'theme' ? 'bg-amber-100 text-amber-600' :
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  {collabType}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {collab.description || `A ${collabType} collaboration with ${participantCount} participants`}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <Users size={14} className="mr-1" />
                  {participantCount} participants
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => handleViewCollabDetails(collab.id, e)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                    title="View details"
                  >
                    <ExternalLink size={12} className="mr-1" />
                    Details
                  </button>
                  <button 
                    onClick={(e) => handleLeaveCollab(collab.id, e)}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center"
                    title="Leave collaboration"
                  >
                    <X size={12} className="mr-1" />
                    Leave
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isSelected 
              ? "bg-blue-500 text-white" 
              : "bg-gray-100"
          }`}>
            {isSelected && <Check size={16} />}
          </div>
        </div>
      </div>
    );
  };

  // Render a template card for available collaborations
  const renderTemplateCard = (template: CollabTemplate) => {
    // Check if the user has already joined this collaboration template
    const hasJoined = joinedCollabs.some(collab => 
      collab.title && template.title && 
      collab.title.toLowerCase() === template.title.toLowerCase()
    );
    
    // Don't show templates that the user has already joined
    if (hasJoined) return null;
    
    // Determine type icon
    let TypeIcon = Link2; // Default for chain
    if (template.type === 'theme') {
      TypeIcon = Palette;
    } else if (template.type === 'narrative') {
      TypeIcon = BookOpen;
    }
    
    return (
      <div 
        key={template.id}
        className="bg-white rounded-lg shadow-sm border p-6"
      >
        <div className="flex items-start">
          <div className="mr-6">
            <div className="relative mb-2">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                <TypeIcon size={24} />
              </div>
            </div>
            <div className="text-center w-16">
              <span className={`px-2 py-0.5 rounded-full text-xs inline-block ${
                template.type === 'chain' ? 'bg-indigo-100 text-indigo-600' :
                template.type === 'theme' ? 'bg-amber-100 text-amber-600' :
                'bg-emerald-100 text-emerald-600'
              }`}>
                {template.type}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-lg mb-2">{template.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
            
            <Link href={`/collabs/${template.id}`}>
              <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors inline-block cursor-pointer">
                Join this collaboration
              </span>
            </Link>
          </div>
        </div>
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
        className={`bg-white rounded-lg shadow-sm border p-6 cursor-pointer transition-all hover:bg-gray-50 ${
          isSelected ? "ring-2 ring-blue-500" : ""
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="mr-6">
              <div className="relative mb-2">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                  <MessageCircle size={24} />
                </div>
                {messageCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {messageCount}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-1">Communications Page</h3>
              <p className="text-sm text-gray-600 mb-2">
                {messageCount === 0 
                  ? "No messages from contributors this period" 
                  : `${messageCount} message${messageCount === 1 ? '' : 's'} from contributors to include`}
              </p>
              <p className="text-xs text-blue-500">
                {messageCount > 0 
                  ? "Select to add a communications page to your magazine" 
                  : "No messages available to display"}
              </p>
            </div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isSelected 
              ? "bg-blue-500 text-white" 
              : "bg-gray-100"
          }`}>
            {isSelected && <Check size={16} />}
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
        className={`bg-green-50 rounded-lg shadow-sm border p-6 cursor-pointer transition-all hover:bg-green-100 ${
          isSelected ? "ring-2 ring-green-500" : ""
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="relative mr-6">
              <img
                src={ad.avatar}
                alt={ad.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <DollarSign size={12} className="text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-1">{ad.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{ad.bio}</p>
              <p className="text-xs text-green-600">{ad.lastPost}</p>
            </div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isSelected 
              ? "bg-green-500 text-white" 
              : "bg-gray-100"
          }`}>
            {isSelected && <Check size={16} />}
          </div>
        </div>
      </div>
    );
  };

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
  
  // Main render
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm flex items-center text-gray-500 hover:text-gray-700 mb-2">
              <ArrowLeft size={16} className="mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-medium">Curate Your Magazine</h1>
            {currentPeriod && (
              <p className="text-gray-600 mt-1">
                {currentPeriod.season} {currentPeriod.year} Issue
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="mb-2 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Slots Remaining</div>
              <div className="text-3xl font-medium">
                {remainingContent} <span className="text-sm text-gray-500">/ {maxContentPieces}</span>
              </div>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-600">Quarterly Price</div>
              <div className="text-3xl font-medium text-green-600">
                ${calculatePrice()}.00
              </div>
              {selectedAds.length > 0 && (
                <div className="text-xs text-green-600">
                  ${selectedAds.length * adDiscountAmount} discount applied
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="grid gap-8">
        {/* Search section */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search creators, content, and collaborations..."
            className="w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Save button */}
        <div className="text-right">
          <Button
            onClick={saveSelections}
            disabled={savingSelections}
            className="px-8 py-2 bg-blue-500 text-white"
          >
            {savingSelections ? 'Saving...' : 'Save Selections'}
          </Button>
        </div>

        {/* Section toggles */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(visibleSections).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setVisibleSections(prev => ({ ...prev, [key]: !prev[key] }))}
              className={`px-3 py-1 rounded-full text-sm ${
                value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
              {value ? ' ✓' : ''}
            </button>
          ))}
        </div>

        {/* Contributors section */}
        {visibleSections.contributors && (
          <div className="mt-4">
            <h2 className="text-xl font-medium mb-4">
              Contributors
              {selectedCreators.length > 0 && (
                <span className="ml-2 text-sm text-blue-500">
                  {selectedCreators.length} selected
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCreators.length > 0 ? (
                filteredCreators.map(creator => renderCreatorCard(creator))
              ) : (
                <div className="col-span-2 p-8 text-center bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No creators found matching your search</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collaborations section */}
        {visibleSections.collaborations && (
          <div className="mt-8">
            <h2 className="text-xl font-medium mb-4">
              Collaborations
              {selectedCollabs.length > 0 && (
                <span className="ml-2 text-sm text-blue-500">
                  {selectedCollabs.length} selected
                </span>
              )}
            </h2>
            
            {/* Private Collaborations */}
            {filteredCollabs.filter(c => c.participation_mode === 'private').length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium uppercase text-gray-500 mb-3">Your Private Collabs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCollabs
                    .filter(collab => collab.participation_mode === 'private')
                    .map(collab => renderCollabCard(collab))}
                </div>
              </div>
            )}
            
            {/* Local Collaborations */}
            {filteredCollabs.filter(c => c.participation_mode === 'local').length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium uppercase text-gray-500 mb-3">Local Collabs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCollabs
                    .filter(collab => collab.participation_mode === 'local')
                    .map(collab => renderCollabCard(collab))}
                </div>
              </div>
            )}
            
            {/* Community Collaborations */}
            {filteredCollabs.filter(c => c.participation_mode === 'community').length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium uppercase text-gray-500 mb-3">Community Collabs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCollabs
                    .filter(collab => collab.participation_mode === 'community')
                    .map(collab => renderCollabCard(collab))}
                </div>
              </div>
            )}
            
            {/* No collaborations message */}
            {joinedCollabs.length === 0 ? (
              <div className="grid grid-cols-1 p-8 text-center bg-gray-50 rounded-lg">
                <p className="text-gray-600 mb-4">You're not participating in any collaborations this period</p>
                
                {/* Show available templates to join */}
                {availableTemplates.length > 0 && (
                  <div className="text-left">
                    <h3 className="text-lg font-medium mb-3">Available Collaborations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableTemplates.map(template => renderTemplateCard(template))}
                    </div>
                  </div>
                )}
              </div>
            ) : filteredCollabs.length === 0 && (
              <div className="p-8 text-center bg-gray-50 rounded-lg">
                <p className="text-gray-600">No collaborations match your current search</p>
              </div>
            )}
          </div>
        )}
        
        {/* Communications section */}
        {visibleSections.communications && (
          <div className="mt-8">
            <h2 className="text-xl font-medium mb-4">
              Communications
              {selectedCommunications.length > 0 && (
                <span className="ml-2 text-sm text-blue-500">
                  1 page selected
                </span>
              )}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderCommunicationsCard()}
              
              <div className="bg-amber-50 p-6 rounded-lg">
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
        )}
        
        {/* Campaigns (Ads) section */}
        {visibleSections.campaigns && (
          <div className="mt-8">
            <h2 className="text-xl font-medium mb-4">
              Campaigns
              {selectedAds.length > 0 && (
                <span className="ml-2 text-sm text-green-500">
                  {selectedAds.length} selected (${selectedAds.length * adDiscountAmount} discount)
                </span>
              )}
            </h2>
            
            {ads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ads.map(ad => renderAdCard(ad))}
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-lg">
                <p className="text-gray-600">No campaigns available for this period</p>
              </div>
            )}
          </div>
        )}
        
        {/* Save button at bottom */}
        <div className="mt-8 text-center">
          <Button
            onClick={saveSelections}
            disabled={savingSelections}
            className="px-8 py-2 bg-blue-500 text-white"
          >
            {savingSelections ? 'Saving...' : 'Save Selections'}
          </Button>
        </div>
      </div>
    </div>
  );
}