// IntegratedCollabsSection.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getCitiesWithParticipantCounts } from '@/lib/supabase/collabLibrary';
import { 
  Users,
  Check,
  Lock,
  Globe,
  MapPin,
  ChevronDown,
  Star
} from 'lucide-react';

// Define our own data interfaces instead of importing from collabLibrary
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

interface UpdateEventDetail {
  updatedCollabs: string[];
}

// Interface for the objects returned by getUserCollabs
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
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<CollabTemplate[]>([]);
  const [joinedCollabs, setJoinedCollabs] = useState<CollabData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  const [selectedCities, setSelectedCities] = useState<Record<string, string>>({});
  const [cityDropdownOpen, setCityDropdownOpen] = useState<Record<string, boolean>>({});
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<Record<string, boolean>>({});
  const [communityParticipantCounts, setCommunityParticipantCounts] = useState<Record<string, number>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  // Add a ref to track if we've already synced cities (to prevent infinite loop)
  const citiesSynced = useRef(false);
  const templatesSet = useRef(false);
  
  // Helper functions for collaboration options with name matching fallback
  const userHasJoinedPrivate = (templateId: string): boolean => {
    // Try matching by template ID first
    const hasMatch = joinedCollabs.some(collab => 
      collab.template_id === templateId && 
      collab.participation_mode === 'private'
    );
    
    if (hasMatch) return true;
    
    // Fallback: try to match by name
    const template = templates.find(t => t.id === templateId);
    if (!template) return false;
    
    return joinedCollabs.some(collab => 
      collab.participation_mode === 'private' &&
      collab.title.toLowerCase().includes(template.name.toLowerCase())
    );
  };
  
  const userHasJoinedCommunity = (templateId: string): boolean => {
    // Try matching by template ID first
    const hasMatch = joinedCollabs.some(collab => 
      collab.template_id === templateId && 
      collab.participation_mode === 'community'
    );
    
    if (hasMatch) return true;
    
    // Fallback: try to match by name
    const template = templates.find(t => t.id === templateId);
    if (!template) return false;
    
    return joinedCollabs.some(collab => 
      collab.participation_mode === 'community' &&
      collab.title.toLowerCase().includes(template.name.toLowerCase())
    );
  };
  
  const userHasJoinedLocal = (templateId: string): boolean => {
    // Try matching by template ID first
    const hasMatch = joinedCollabs.some(collab => 
      collab.template_id === templateId && 
      collab.participation_mode === 'local'
    );
    
    if (hasMatch) return true;
    
    // Fallback: try to match by name
    const template = templates.find(t => t.id === templateId);
    if (!template) return false;
    
    return joinedCollabs.some(collab => 
      collab.participation_mode === 'local' &&
      collab.title.toLowerCase().includes(template.name.toLowerCase())
    );
  };
  
  const getJoinedCollabId = (templateId: string, mode: 'community' | 'local' | 'private'): string | null => {
    // Try matching by template ID first
    const collab = joinedCollabs.find(c => 
      c.template_id === templateId && 
      c.participation_mode === mode
    );
    
    if (collab) {
      return collab.id;
    }
    
    // Fallback: try to match by name
    const template = templates.find(t => t.id === templateId);
    if (!template) return null;
    
    const matchByName = joinedCollabs.find(c => 
      c.participation_mode === mode &&
      c.title.toLowerCase().includes(template.name.toLowerCase())
    );
    
    if (matchByName) {
      return matchByName.id;
    }
    
    return null;
  };
  
  const toggleCityDropdown = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Get viewport width and center point
    const viewportWidth = window.innerWidth;
    const viewportCenter = viewportWidth / 2;
    
    // Get the position of the clicked element
    const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 250; // Increased height estimate
    
    // Calculate vertical position
    let top;
    if (viewportHeight - buttonRect.bottom < dropdownHeight + 10) {
      // Not enough space below, position above
      top = buttonRect.top - dropdownHeight - 5;
    } else {
      // Enough space below, position below
      top = buttonRect.bottom + 5;
    }
    
    // Set position - centered on the screen for mobile
    setDropdownPosition({
      top: top,
      left: viewportCenter // Center of the screen horizontally
    });
    
    // Toggle dropdown state
    setCityDropdownOpen(prev => ({
      ...prev,
      [templateId]: !prev[templateId]
    }));
  };
  
  // Modify the selectCity function in IntegratedCollabsSection.tsx
  const selectCity = (templateId: string, city: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Generate virtual ID for local selection
    const localId = `local_${templateId}_${city.replace(/\s+/g, '_')}`;
    
    // Close the dropdown immediately
    setCityDropdownOpen(prev => ({
      ...prev,
      [templateId]: false
    }));
    
    // Update the selected city
    setSelectedCities(prev => ({
      ...prev,
      [templateId]: city
    }));
    
    // Get all existing selections for this template
    const existingSelections = selectedCollabs.filter(id => 
      id.startsWith(`local_${templateId}_`)
    );
    
    // Determine if this is a selection or deselection
    const isCurrentlySelected = existingSelections.includes(localId);
    
    // Get all other collaborations (not of this template)
    const otherCollabs = selectedCollabs.filter(id => !id.startsWith(`local_${templateId}_`));
    
    // Special case for the last item
    const isLastItem = selectedCollabs.length === 1 && isCurrentlySelected;
    
    if (isLastItem) {
      // If this is the last item and we're deselecting, directly use toggleItem
      toggleItem(localId);
      return;
    }
    
    // If we're selecting a new city
    if (!isCurrentlySelected) {
      // Add the new city (if we have space)
      if (remainingContent > 0 || existingSelections.length > 0) {
        const updatedCollabs = [...otherCollabs, localId];
        
        // Update parent directly
        if (typeof window !== 'undefined') {
          const event = new CustomEvent<UpdateEventDetail>('updateSelectedCollabs', { 
            detail: { updatedCollabs }
          });
          window.dispatchEvent(event);
          localStorage.setItem('temp_selected_collabs', JSON.stringify(updatedCollabs));
        }
      }
    } 
    // If we're deselecting
    else {
      // Just remove all selections for this template
      const updatedCollabs = otherCollabs;
      
      // Update parent directly
      if (typeof window !== 'undefined') {
        const event = new CustomEvent<UpdateEventDetail>('updateSelectedCollabs', { 
          detail: { updatedCollabs }
        });
        window.dispatchEvent(event);
        localStorage.setItem('temp_selected_collabs', JSON.stringify(updatedCollabs));
      }
    }
  };

  // Toggle template expansion
  const toggleTemplateExpansion = (templateId: string) => {
    setExpandedTemplates(prev => ({
      ...prev,
      [templateId]: !prev[templateId]
    }));
  };
  
  // Enhanced function to include local participants in community count
  const fetchCommunityParticipantCounts = useCallback(async (templatesArray: CollabTemplate[]) => {
    const counts: Record<string, number> = {};
    
    for (const template of templatesArray) {
      try {
        let totalParticipants = 0;
        
        // STEP 1: Count community participants
        const { data: communityData, error: communityError } = await supabase
          .from('collabs')
          .select('id')
          .eq('template_id', template.id)
          .eq('participation_mode', 'community')
          .eq('period_id', periodId);
        
        if (!communityError && communityData && communityData.length > 0) {
          for (const communityCollab of communityData) {
            // Get count for this community collab
            const { count, error: countError } = await supabase
              .from('collab_participants')
              .select('*', { count: 'exact', head: true })
              .eq('collab_id', communityCollab.id)
              .eq('status', 'active');
              
            if (!countError && count !== null) {
              totalParticipants += count;
            }
          }
        }
        
        // STEP 2: Count local participants
        const { data: localData, error: localError } = await supabase
          .from('collabs')
          .select('id')
          .eq('template_id', template.id)
          .eq('participation_mode', 'local')
          .eq('period_id', periodId);
        
        if (!localError && localData && localData.length > 0) {
          for (const localCollab of localData) {
            // Get count for this local collab
            const { count, error: countError } = await supabase
              .from('collab_participants')
              .select('*', { count: 'exact', head: true })
              .eq('collab_id', localCollab.id)
              .eq('status', 'active');
              
            if (!countError && count !== null) {
              totalParticipants += count;
            }
          }
        }
        
        // Store the total combined count
        counts[template.id] = totalParticipants;
        
      } catch (err) {
        console.error(`Error calculating participants for template ${template.id}:`, err);
        counts[template.id] = 0;
      }
    }
    
    setCommunityParticipantCounts(counts);
  }, [periodId, supabase]);
  
  // Synchronize selectedCities with selectedCollabs when component loads
  useEffect(() => {
    // Only run this once to avoid infinite loops
    if (!citiesSynced.current && selectedCollabs.length > 0 && templates.length > 0) {
      // Look through all local collaborations in selectedCollabs
      const localCollabs = selectedCollabs.filter(id => id.startsWith('local_'));
      
      // Extract template IDs and city names
      const newCitySelections: Record<string, string> = {};
      
      localCollabs.forEach(localId => {
        const parts = localId.split('_');
        if (parts.length >= 3) {
          const templateId = parts[1];
          const cityName = parts.slice(2).join('_').replace(/_/g, ' ');
          
          // Update city selection for this template
          newCitySelections[templateId] = cityName;
        }
      });
      
      // Only update if we have new selections
      if (Object.keys(newCitySelections).length > 0) {
        setSelectedCities(prev => {
          // Only update if different from current state
          const updated = {...prev, ...newCitySelections};
          
          // Store in localStorage
          localStorage.setItem('selected_cities', JSON.stringify(updated));
          
          return updated;
        });
      }
      
      // Mark as synced to prevent further updates
      citiesSynced.current = true;
    }
  }, [selectedCollabs, templates]); 

  // Restore selected cities from localStorage
  useEffect(() => {
    if (!loading) {
      try {
        const savedCities = localStorage.getItem('selected_cities');
        if (savedCities) {
          const parsedCities = JSON.parse(savedCities);
          setSelectedCities(parsedCities);
        }
      } catch (e) {
        console.error("Error loading selected cities from localStorage:", e);
      }
    }
  }, [loading]);

  // Close city dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Close all city dropdowns
        setCityDropdownOpen({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // When templates change, set a default city for each if not already set
  useEffect(() => {
    if (templates.length > 0 && !templatesSet.current) {
      // Set a default selected city for each template if not already set
      const initialSelectedCities: Record<string, string> = { ...selectedCities };
      let hasNewCities = false;
      
      templates.forEach(template => {
        if (!initialSelectedCities[template.id]) {
          // Use user's location if available, otherwise pick the first city from available cities
          const defaultCity = userLocation || 
            (availableCities.length > 0 
              ? `${availableCities[0].name}${availableCities[0].state ? ', ' + availableCities[0].state : ''}`
              : 'New York, NY');
          initialSelectedCities[template.id] = defaultCity;
          hasNewCities = true;
        }
      });
      
      if (hasNewCities) {
        setSelectedCities(initialSelectedCities);
      }
      
      templatesSet.current = true;
    }
  }, [templates, selectedCities, userLocation, availableCities]);
  
  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!periodId) {
        setError("No active period found");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Get user info
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("User not authenticated");
          setLoading(false);
          return;
        }
        
        // Try to get user's location preference if stored
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('city')
            .eq('id', user.id)
            .single();
            
          if (userProfile?.city) {
            setUserLocation(userProfile.city);
          }
        } catch (profileError) {
          console.error("Error fetching user profile:", profileError);
        }
        
        // STEP 1: Get templates for this period
        try {
          // First get template IDs from period_templates
          const { data: templateLinks, error: templateLinksError } = await supabase
            .from('period_templates')
            .select('template_id')
            .eq('period_id', periodId);
            
          if (templateLinksError) {
            console.error("Error fetching template links:", templateLinksError);
            throw new Error(templateLinksError.message);
          }
          
          if (!templateLinks || templateLinks.length === 0) {
            throw new Error("No templates found for this period");
          }
          
          const templateIds = templateLinks.map(link => link.template_id);
          
          // Get the template details - using only 'name' field (not 'title')
          const { data: templateData, error: templateDataError } = await supabase
            .from('collab_templates')
            .select('id, name, type, display_text, instructions')
            .in('id', templateIds);
            
          if (templateDataError) {
            console.error("Error fetching template data:", templateDataError);
            throw new Error("Failed to fetch template data");
          }
          
          if (!templateData || templateData.length === 0) {
            console.warn("No template data found for linked templates");
            throw new Error("No template data found");
          }
          
          // Map templates, ensuring we handle fields correctly with type assertion
          const formattedTemplates: CollabTemplate[] = templateData.map(template => ({
            id: template.id,
            name: template.name || 'Unnamed Template',
            type: (template.type as 'chain' | 'theme' | 'narrative'),
            display_text: template.display_text || '',
            instructions: template.instructions || ''
          }));
          
          setTemplates(formattedTemplates);
          
          // Fetch community participant counts for these templates
          fetchCommunityParticipantCounts(formattedTemplates);
          
        } catch (templatesError) {
          console.error("Error in templates section:", templatesError);
          
          // Fallback to getting all templates
          try {
            const { data: allTemplates, error: allTemplatesError } = await supabase
              .from('collab_templates')
              .select('id, name, type, display_text, instructions')
              .eq('is_active', true)
              .limit(3);
              
            if (allTemplatesError) {
              console.error("Error fetching fallback templates:", allTemplatesError);
              throw new Error("Failed to fetch templates");
            }
            
            if (!allTemplates || allTemplates.length === 0) {
              console.warn("No templates found in fallback");
              throw new Error("No template data found in fallback");
            }
            
            // Ensure correct typing when mapping templates
            const formattedTemplates: CollabTemplate[] = allTemplates.map(template => ({
              id: template.id,
              name: template.name || 'Unnamed Template',
              type: (template.type as 'chain' | 'theme' | 'narrative'),
              display_text: template.display_text || '',
              instructions: template.instructions || ''
            }));
            
            setTemplates(formattedTemplates);
            
            // Fetch community participant counts for these templates
            fetchCommunityParticipantCounts(formattedTemplates);
            
          } catch (fallbackError) {
            // If all else fails, create dummy templates
            console.error("Error in fallback templates, using dummy data:", fallbackError);
            const dummyTemplates: CollabTemplate[] = [
              {
                id: 'dummy-chain',
                name: 'Echoes of the Unseen',
                type: 'chain',
                display_text: 'A sequential chain collaboration example',
                instructions: 'Create a chain of images where each builds on the previous submission.'
              },
              {
                id: 'dummy-theme',
                name: 'One Sentence Conspiracy',
                type: 'theme',
                display_text: 'A theme-based collaboration example',
                instructions: 'Submit an image with a one-sentence conspiracy theory caption.'
              },
              {
                id: 'dummy-narrative',
                name: 'Narrative Example',
                type: 'narrative',
                display_text: 'A narrative-driven collaboration example',
                instructions: 'Contribute to an ongoing story with images and text.'
              }
            ];
            
            setTemplates(dummyTemplates);
            
            // Set dummy community participant counts
            setCommunityParticipantCounts({
              'dummy-chain': 8,
              'dummy-theme': 12,
              'dummy-narrative': 5
            });
          }
        }
        // STEP 2: Get the user's joined collaborations
        try {
          // First get the collab IDs the user has joined
          const { data: participantData, error: participantError } = await supabase
            .from('collab_participants')
            .select(`
              collab_id,
              participation_mode,
              location,
              city
            `)
            .eq('profile_id', user.id)
            .eq('status', 'active');
            
          if (participantError) {
            throw new Error(participantError.message);
          }
          
          // Gather all cities for dropdown options
          const cities = new Set<string>();
          
          if (!participantData || participantData.length === 0) {
            // Not a critical error, just means no joined collabs
            console.log("No joined collaborations found");
          } else {
            const collabIds = participantData.map(p => p.collab_id);
            
            // Collect cities from participant data
            participantData.forEach(p => {
              if (p.city) cities.add(p.city);
              if (p.location) cities.add(p.location);
            });
            
            // Get details of the collaborations
            const { data: collabsData, error: collabsError } = await supabase
              .from('collabs')
              .select(`
                id,
                title,
                description,
                type,
                is_private,
                metadata,
                participation_mode,
                location,
                template_id
              `)
              .in('id', collabIds);
              
            if (collabsError) {
              throw new Error(collabsError.message || "Error fetching collabs");
            }
            
            if (!collabsData || collabsData.length === 0) {
              // Not a critical error
              console.log("No collaboration data found for user's joined collabs");
            } else {
              // Collect cities from collab data
              collabsData.forEach(c => {
                if (c.location) cities.add(c.location);
                if (c.metadata && typeof c.metadata === 'object' && c.metadata.location) {
                  cities.add(c.metadata.location as string);
                }
              });
              
              // Format joined collaborations
              const userJoinedCollabs: CollabData[] = collabsData.map(collab => {
                // Find the matching participant record
                const participantRecord = participantData.find(p => p.collab_id === collab.id);
                
                // Determine participation mode
                let participationMode: 'community' | 'local' | 'private';
                
                if (participantRecord?.participation_mode) {
                  participationMode = participantRecord.participation_mode as 'community' | 'local' | 'private';
                } else if (collab.participation_mode) {
                  participationMode = collab.participation_mode as 'community' | 'local' | 'private';
                } else if (collab.is_private) {
                  participationMode = 'private';
                } else {
                  participationMode = 'community';
                }
                
                // For local collaborations, ensure we have the location from the collab's location field
                const locationValue = collab.location || 
                  participantRecord?.location || 
                  participantRecord?.city || 
                  (collab.metadata && typeof collab.metadata === 'object' && collab.metadata.location 
                    ? collab.metadata.location as string : null);
                
                return {
                  id: collab.id,
                  title: collab.title,
                  type: collab.type as 'chain' | 'theme' | 'narrative',
                  participation_mode: participationMode,
                  location: locationValue,
                  description: collab.description || '',
                  participant_count: 0, // Will be updated below
                  is_joined: true,
                  template_id: collab.template_id
                };
              });
              
              // Get participant counts for each collab
              for (const collab of userJoinedCollabs) {
                const { count, error: countError } = await supabase
                  .from('collab_participants')
                  .select('*', { count: 'exact', head: true })
                  .eq('collab_id', collab.id)
                  .eq('status', 'active');
                  
                if (!countError && count !== null) {
                  collab.participant_count = count;
                }
              }
              
              setJoinedCollabs(userJoinedCollabs);
            }
          }
          // STEP 3: Get distinct cities for local collaborations
          try {
            // Fetch cities with participant counts
            const cityResult = await getCitiesWithParticipantCounts();
            
            if (cityResult.success && cityResult.cities && cityResult.cities.length > 0) {
              setAvailableCities(cityResult.cities);
            } else {
              // Fallback cities
              setAvailableCities([
                { name: 'New York', state: 'NY', participant_count: 0 },
                { name: 'Los Angeles', state: 'CA', participant_count: 0 },
                { name: 'Chicago', state: 'IL', participant_count: 0 },
                { name: 'San Francisco', state: 'CA', participant_count: 0 },
                { name: 'Miami', state: 'FL', participant_count: 0 },
                { name: 'Austin', state: 'TX', participant_count: 0 }
              ]);
            }
          } catch (cityError) {
            console.error("Error fetching cities:", cityError);
            // Fallback cities
            setAvailableCities([
              { name: 'New York', state: 'NY', participant_count: 0 },
              { name: 'Los Angeles', state: 'CA', participant_count: 0 },
              { name: 'Chicago', state: 'IL', participant_count: 0 },
              { name: 'San Francisco', state: 'CA', participant_count: 0 },
              { name: 'Miami', state: 'FL', participant_count: 0 },
              { name: 'Austin', state: 'TX', participant_count: 0 }
            ]);
          }
        } catch (joinedError) {
          console.error("Error processing joined collabs:", joinedError);
          // Continue with empty joined collabs
          setJoinedCollabs([]);
          
          // Try one more way - getUserCollabs function
          try {
            // Dynamically import the function
            const { getUserCollabs } = await import('@/lib/supabase/collabs');
            const rawCollabsResult = await getUserCollabs();
            
            if (rawCollabsResult) {
              // First convert to unknown, then to our expected type (necessary for TypeScript)
              const collabsResult = {
                private: (rawCollabsResult.private || []) as unknown as ImportedCollab[],
                community: (rawCollabsResult.community || []) as unknown as ImportedCollab[],
                local: (rawCollabsResult.local || []) as unknown as ImportedCollab[]
              };
              
              // Format in the structure we need
              const combinedCollabs = [
                ...(collabsResult.private || []),
                ...(collabsResult.community || []),
                ...(collabsResult.local || [])
              ];
              
              // Convert to our format
              if (combinedCollabs.length > 0) {
                const formatted = combinedCollabs.map((c) => {
                  // Safe type casting
                  const importedCollab = c as ImportedCollab;
                  
                  return {
                    id: importedCollab.id,
                    title: importedCollab.title,
                    type: (importedCollab.type as 'chain' | 'theme' | 'narrative') || 'theme',
                    participation_mode: (importedCollab.participation_mode as 'community' | 'local' | 'private') || 
                      (collabsResult.private?.some((pc) => pc.id === importedCollab.id) ? 'private' :
                       collabsResult.local?.some((lc) => lc.id === importedCollab.id) ? 'local' : 'community'),
                    location: importedCollab.location,
                    description: importedCollab.description || '',
                    participant_count: importedCollab.participantCount || 0,
                    is_joined: true,
                    template_id: importedCollab.template_id
                  } as CollabData;
                });
                
                setJoinedCollabs(formatted);
              }
            }
          } catch (getUserError) {
            console.error("Error with getUserCollabs:", getUserError);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error in fetchData:", error);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };
    
    fetchData();
  }, [periodId, supabase, userLocation, fetchCommunityParticipantCounts]);
  
  if (loading) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading collaborations...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg">
        <p className="text-red-500 mb-2">{error}</p>
        <p className="text-gray-600">Please try again later.</p>
      </div>
    );
  }
  
  // Sort templates to put those with joined collabs at the top
  const sortedTemplates = [...templates].sort((a, b) => {
    const aHasJoined = userHasJoinedPrivate(a.id) || userHasJoinedCommunity(a.id) || userHasJoinedLocal(a.id);
    const bHasJoined = userHasJoinedPrivate(b.id) || userHasJoinedCommunity(b.id) || userHasJoinedLocal(b.id);
    
    if (aHasJoined && !bHasJoined) return -1;
    if (!aHasJoined && bHasJoined) return 1;
    return 0;
  });
  
  return (
    <div className="pb-20">
      {/* Templates List */}
      <div className="space-y-4" style={{ position: 'relative' }}>
        {sortedTemplates.map(template => {
          const hasJoined = userHasJoinedPrivate(template.id) || userHasJoinedCommunity(template.id) || userHasJoinedLocal(template.id);
          const isExpanded = expandedTemplates[template.id] || false;
          const selectedCity = selectedCities[template.id] || 'Select City';
          
          // Get IDs for each version
          const communityId = `community_${template.id}`;
          const localId = `local_${template.id}_${selectedCity.replace(/\s+/g, '_')}`;
          
          // Check if user has joined different versions
          const hasJoinedPrivateVersion = userHasJoinedPrivate(template.id);
          const hasJoinedCommunityVersion = userHasJoinedCommunity(template.id);
          const hasJoinedLocalVersion = userHasJoinedLocal(template.id);
          
          // Get joined collab IDs if they exist
          const joinedPrivateId = getJoinedCollabId(template.id, 'private');
          const joinedCommunityId = getJoinedCollabId(template.id, 'community');
          const joinedLocalId = getJoinedCollabId(template.id, 'local');
          
          // Check selections
          const isCommunitySelected = joinedCommunityId ? selectedCollabs.includes(joinedCommunityId) : selectedCollabs.includes(communityId);
          const isLocalSelected = joinedLocalId ? selectedCollabs.includes(joinedLocalId) : selectedCollabs.includes(localId);
          const isPrivateSelected = joinedPrivateId ? selectedCollabs.includes(joinedPrivateId) : false;
          
          // Badge count
          const selectedCount = (isPrivateSelected ? 1 : 0) + (isCommunitySelected ? 1 : 0) + (isLocalSelected ? 1 : 0);
          
          return (
            <div key={template.id} className="border rounded-sm border-gray-100 overflow-hidden">
              {/* Template Header with color coding by type */}
              <div 
                className={`p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-start ${
                  template.type === 'chain' ? 'bg-indigo-50/30 border-l-4 border-indigo-400' :
                  template.type === 'theme' ? 'bg-amber-50/30 border-l-4 border-amber-400' : 
                  'bg-emerald-50/30 border-l-4 border-emerald-400'
                }`}
                onClick={() => toggleTemplateExpansion(template.id)}
              >
                <div className="flex gap-3 items-start">
                  {/* Template type icon */}
                  <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${
                    template.type === 'chain' ? 'bg-indigo-50 text-indigo-500' :
                    template.type === 'theme' ? 'bg-amber-50 text-amber-500' : 
                    'bg-emerald-50 text-emerald-500'
                  }`}>
                    <Users size={18} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {template.name}
                      </h3>
                      {hasJoined && (
                        <span className="flex items-center text-xs gap-1 text-blue-500">
                          <Star size={10} />
                          <span>joined</span>
                        </span>
                      )}
                      {selectedCount > 0 && (
                        <span className="bg-blue-50 text-blue-500 rounded-full text-xs px-2 py-0.5 flex items-center">
                          {selectedCount}
                        </span>
                      )}
                    </div>
                    
                    {/* Display text */}
                    <p className="text-xs text-gray-500 line-clamp-3 mb-1">
                      {template.display_text}
                    </p>
                  </div>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
              {/* Template Details - Expanded View */}
              {isExpanded && (
                <div className="p-3 border-t border-gray-100 bg-gray-50">
                  <div className="space-y-2">
                    {/* Community Version Option */}
                    <div
                      className={`flex items-center justify-between p-3 border rounded-sm
                        bg-white cursor-pointer hover:bg-gray-50
                        ${isCommunitySelected ? 'border-blue-300 ring-1 ring-blue-300' : 'border-gray-100'}`}
                      onClick={() => {
                        // If user has joined this version, toggle their joined collab
                        if (hasJoinedCommunityVersion && joinedCommunityId) {
                          toggleItem(joinedCommunityId);
                        } 
                        // Otherwise toggle the virtual community ID
                        else if (remainingContent > 0 || isCommunitySelected) {
                          toggleItem(communityId);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 text-blue-500">
                          <Globe size={16} />
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className="text-sm font-normal">
                              Community Version
                              {hasJoinedCommunityVersion && (
                                <span className="ml-2 text-xs text-blue-500 flex items-center">
                                  <Star size={10} className="mr-1" />
                                  joined
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center justify-between w-full">
                            <span className="mr-2">Random selection of content from all community and local collaborators</span>
                            <span className="bg-blue-50 text-blue-500 rounded-full px-1.5 py-0.5 flex items-center gap-1 flex-shrink-0">
                              <Users size={10} />
                              {communityParticipantCounts[template.id] || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center overflow-hidden">
                        {isCommunitySelected && (
                          <div className="bg-blue-500 w-full h-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Local Version Option */}
                    <div className="relative">
                      <div
                        className={`flex items-center justify-between p-3 border rounded-sm
                          bg-white cursor-pointer hover:bg-gray-50
                          ${isLocalSelected ? 'border-blue-300 ring-1 ring-blue-300' : 'border-gray-100'}`}
                        onClick={() => {
                          // If user has joined this version, toggle their joined collab
                          if (hasJoinedLocalVersion && joinedLocalId) {
                            toggleItem(joinedLocalId);
                          }
                          // Otherwise toggle the virtual local ID if we have space
                          else if (remainingContent > 0 || isLocalSelected) {
                            toggleItem(localId);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-50 text-green-500">
                            <MapPin size={16} />
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="text-sm font-normal">
                                Local Version
                                {hasJoinedLocalVersion && (
                                  <span className="ml-2 text-xs text-blue-500 flex items-center">
                                    <Star size={10} className="mr-1" />
                                    joined
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center justify-between w-full">
                              <div className="flex items-center gap-1 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCityDropdown(template.id, e);
                                }}
                              >
                                <span className="font-medium">{selectedCity}</span>
                                <ChevronDown size={10} />
                              </div>
                              {availableCities.length > 0 && (
                                <span className="bg-green-50 text-green-500 rounded-full px-1.5 py-0.5 flex items-center gap-1 ml-2 flex-shrink-0">
                                  <Users size={10} />
                                  {availableCities.find(c => 
                                    `${c.name}${c.state ? `, ${c.state}` : ''}` === selectedCity || 
                                    c.name === selectedCity.split(',')[0]
                                  )?.participant_count || 0}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center overflow-hidden">
                          {isLocalSelected && (
                            <div className="bg-blue-500 w-full h-full flex items-center justify-center">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Private Version Option - Only show if user has joined a private version */}
                    {hasJoinedPrivateVersion && joinedPrivateId && (
                      <div
                        className={`flex items-center justify-between p-3 border rounded-sm
                          bg-white cursor-pointer hover:bg-gray-50
                          ${isPrivateSelected ? 'border-blue-300 ring-1 ring-blue-300' : 'border-gray-100'}`}
                        onClick={() => {
                          // Toggle the private collab
                          toggleItem(joinedPrivateId);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-50 text-purple-500">
                            <Lock size={16} />
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="text-sm font-normal">
                                Private Version
                                <span className="ml-2 text-xs text-blue-500 flex items-center">
                                  <Star size={10} className="mr-1" />
                                  joined
                                </span>
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center justify-between w-full">
                              <span className="mr-2">Content from all private collaborators</span>
                              <span className="bg-purple-50 text-purple-500 rounded-full px-1.5 py-0.5 flex items-center gap-1 flex-shrink-0">
                                <Users size={10} />
                                {joinedCollabs.find(c => c.id === joinedPrivateId)?.participant_count || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center overflow-hidden">
                          {isPrivateSelected && (
                            <div className="bg-blue-500 w-full h-full flex items-center justify-center">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* City dropdown (shared for all templates) */}
      {Object.values(cityDropdownOpen).some(isOpen => isOpen) && (
        <div 
          ref={dropdownRef}
          className="fixed bg-white border shadow-lg rounded-sm z-[1000] overflow-hidden"
          style={{ 
            width: "280px",
            maxHeight: "300px",
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            transform: "translateX(-50%)"
          }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: "300px" }}>
            {availableCities.map((city, index) => (
              <div
                key={index}
                className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={(e) => {
                  // Find which template's dropdown is open
                  const templateId = Object.keys(cityDropdownOpen).find(key => cityDropdownOpen[key]);
                  if (templateId) {
                    selectCity(templateId, `${city.name}${city.state ? `, ${city.state}` : ''}`, e);
                  }
                }}
              >
                <span className="text-sm">
                  {city.name}{city.state ? `, ${city.state}` : ''}
                </span>
                {city.participant_count > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500">
                    {city.participant_count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegratedCollabsSection;