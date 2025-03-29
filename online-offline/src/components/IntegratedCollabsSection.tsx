// IntegratedCollabsSection.tsx
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getCitiesWithParticipantCounts } from '@/lib/supabase/collabLibrary';
import { 
  Users,
  Check,
  Lock,
  Globe,
  MapPin,
  ChevronDown,
  Star,
  AlertCircle
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
  hideTitle?: boolean; // New prop to hide the title and selected count
}

interface City {
  name: string;
  state?: string;
  participant_count: number;
}

// ID mapping interface for mapping between virtual and real IDs
interface IdMapping {
  virtualId: string;
  realId: string;
  templateId: string;
  participationMode: 'community' | 'local' | 'private';
  cityName?: string;
}

const IntegratedCollabsSection: React.FC<CollabsSectionProps> = ({
  periodId,
  selectedCollabs,
  toggleItem,
  remainingContent,
  hideTitle = false // Default to false for backward compatibility
}) => {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<CollabTemplate[]>([]);
  const [joinedCollabs, setJoinedCollabs] = useState<CollabData[]>([]);
  const [availableCollabs, setAvailableCollabs] = useState<CollabData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  const [selectedCities, setSelectedCities] = useState<Record<string, string>>({});
  const [cityDropdownOpen, setCityDropdownOpen] = useState<Record<string, boolean>>({});
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [idMappings, setIdMappings] = useState<IdMapping[]>([]);
 

// Add this useEffect 
useEffect(() => {
  // One-time check after loading
  if (!loading && templates.length > 0 && selectedCollabs.length > 0) {
    // Just run once after loading
    const localCollabs = selectedCollabs.filter(id => id.startsWith('local_'));
    
    if (localCollabs.length > 0) {
      // Update the selectedCities once based on what's in selectedCollabs
      const newCitySelections = { ...selectedCities };
      
      localCollabs.forEach(localId => {
        const parts = localId.split('_');
        if (parts.length >= 3) {
          const templateId = parts[1];
          const cityName = parts.slice(2).join('_').replace(/_/g, ' ');
          newCitySelections[templateId] = cityName;
        }
      });
      
      // Only update if there are changes
      if (Object.keys(newCitySelections).length > 0) {
        setSelectedCities(newCitySelections);
      }
    }
  }
}, [loading]); // Only run when loading state changes
  
  console.log("DIAGNOSTIC INFO:");
  console.log("selectedCollabs:", selectedCollabs);
  console.log("toggleItem function available:", typeof toggleItem === 'function');
  console.log("remainingContent:", remainingContent);

// Add this useEffect to persist selected cities
useEffect(() => {
  if (Object.keys(selectedCities).length > 0) {
    localStorage.setItem('selected_cities', JSON.stringify(selectedCities));
    console.log("Saved selected cities to localStorage:", selectedCities);
  }
}, [selectedCities]);

// Add this useEffect to restore selected cities
useEffect(() => {
  if (!loading) {
    try {
      const savedCities = localStorage.getItem('selected_cities');
      if (savedCities) {
        const parsedCities = JSON.parse(savedCities);
        console.log("Loaded selected cities from localStorage:", parsedCities);
        setSelectedCities(parsedCities);
      }
    } catch (e) {
      console.error("Error loading selected cities from localStorage:", e);
    }
  }
}, [loading]);

  // Log initial selections for debugging
  useEffect(() => {
    console.log("IntegratedCollabsSection initial selectedCollabs:", selectedCollabs);
  }, []);
  
  // Log selections for debugging when they change
  useEffect(() => {
    console.log("IntegratedCollabsSection received selectedCollabs:", selectedCollabs);
  }, [selectedCollabs]);

// Add this effect to persistently store selections in localStorage whenever they change
useEffect(() => {
  if (selectedCollabs.length > 0) {
    localStorage.setItem('temp_selected_collabs', JSON.stringify(selectedCollabs));
    console.log(`Stored ${selectedCollabs.length} selections in localStorage:`, selectedCollabs);
  }
}, [selectedCollabs]);

useEffect(() => {
  // Force a check of local selections on first render and when templates load
  if (!loading && templates.length > 0 && selectedCollabs.length > 0) {
    // Force re-check of all local collaboration selections
    const localCollabs = selectedCollabs.filter(id => id.startsWith('local_'));
    if (localCollabs.length > 0) {
      // Instead of trying to update selectedCollabs, update something we control
      // This will force a re-render
      const newCitySelections = { ...selectedCities };
      
      localCollabs.forEach(localId => {
        const parts = localId.split('_');
        if (parts.length >= 3) {
          const templateId = parts[1];
          const cityName = parts.slice(2).join('_').replace(/_/g, ' ');
          
          // Update city selection for this template
          newCitySelections[templateId] = cityName;
        }
      });
      
      // Update selectedCities to force a re-render
      setSelectedCities(newCitySelections);
    }
  }
}, [loading, templates.length, selectedCollabs]);

useEffect(() => {
  // Synchronize selectedCities with selectedCollabs when component loads
  if (selectedCollabs.length > 0) {
    // Look through all local collaborations in selectedCollabs
    const localCollabs = selectedCollabs.filter(id => id.startsWith('local_'));
    
    // Extract template IDs and city names
    const newCitySelections = { ...selectedCities };
    
    localCollabs.forEach(localId => {
      const parts = localId.split('_');
      if (parts.length >= 3) {
        const templateId = parts[1];
        const cityName = parts.slice(2).join('_').replace(/_/g, ' ');
        
        // Update city selection for this template
        newCitySelections[templateId] = cityName;
        console.log(`Syncing template ${templateId} city to ${cityName} from selection`);
      }
    });
    

    
    // Update selectedCities state
    if (Object.keys(newCitySelections).length > 0) {
      setSelectedCities(newCitySelections);
      localStorage.setItem('selected_cities', JSON.stringify(newCitySelections));
      console.log("Updated selectedCities based on selections:", newCitySelections);
    }
  }
}, [selectedCollabs, templates]); 

  // Function to store selections in localStorage with enhanced template tracking
  const storeSelections = (selectionId: string, isSelected: boolean) => {
    try {
      // Get current selections
      let storedSelections: string[] = [];
      const stored = localStorage.getItem('temp_selected_collabs');
      if (stored) {
        storedSelections = JSON.parse(stored);
      }
      
      // Extract template ID and mode from selectionId
      let templateId = "";
      let mode = "";
      
      if (selectionId.startsWith('community_')) {
        templateId = selectionId.split('community_')[1];
        mode = 'community';
      } else if (selectionId.startsWith('local_')) {
        const parts = selectionId.split('_');
        if (parts.length >= 3) {
          templateId = parts[1];
          mode = 'local';
        }
      } else {
        // For joined collaborations, look up in joinedCollabs
        const joinedCollab = joinedCollabs.find(c => c.id === selectionId);
        if (joinedCollab && joinedCollab.template_id) {
          templateId = joinedCollab.template_id;
          mode = joinedCollab.participation_mode;
        }
      }
      
      console.log(`Storage info - ID: ${selectionId}, Template: ${templateId}, Mode: ${mode}`);
      
      // Update selections
      if (isSelected) {
        // Add if not already included
        if (!storedSelections.includes(selectionId)) {
          storedSelections.push(selectionId);
          console.log(`Added ${selectionId} to stored selections`);
        }
      } else {
        // Remove if included
        storedSelections = storedSelections.filter(id => id !== selectionId);
        console.log(`Removed ${selectionId} from stored selections`);
      }
      
      // Save back to localStorage
      localStorage.setItem('temp_selected_collabs', JSON.stringify(storedSelections));
      console.log(`Updated localStorage selections (${storedSelections.length} items):`, storedSelections);
    } catch (e) {
      console.error("Error storing selections in localStorage:", e);
    }
  };

  // Create ID mappings between virtual and real IDs with enhanced bidirectional mappings
  const createIdMappings = (
    templates: CollabTemplate[], 
    joinedCollabs: CollabData[],
    selectedCollabs: string[]
  ): IdMapping[] => {
    const mappings: IdMapping[] = [];
    
    // First map all joined collabs (they already have real IDs)
    joinedCollabs.forEach(collab => {
      if (!collab.id || !collab.template_id) return;
      
      mappings.push({
        virtualId: collab.id,
        realId: collab.id,
        templateId: collab.template_id,
        participationMode: collab.participation_mode,
        cityName: collab.location || undefined
      });
      
      // Also create mappings for virtual IDs that would match this joined collab
      if (collab.participation_mode === 'community') {
        mappings.push({
          virtualId: `community_${collab.template_id}`,
          realId: collab.id,
          templateId: collab.template_id,
          participationMode: 'community'
        });
      } else if (collab.participation_mode === 'local' && collab.location) {
        const encodedCity = collab.location.replace(/\s+/g, '_');
        mappings.push({
          virtualId: `local_${collab.template_id}_${encodedCity}`,
          realId: collab.id,
          templateId: collab.template_id,
          participationMode: 'local',
          cityName: collab.location
        });
      }
    });
    
    // Then map selected virtual IDs that don't have a real ID match yet
    selectedCollabs.forEach(selectedId => {
      // Skip if we already have a mapping for this ID
      if (mappings.some(m => m.virtualId === selectedId || m.realId === selectedId)) {
        return;
      }
      
      // Handle community virtual IDs
      if (selectedId.startsWith('community_')) {
        const templateId = selectedId.split('community_')[1];
        mappings.push({
          virtualId: selectedId,
          realId: selectedId, // Use virtual as real for now
          templateId,
          participationMode: 'community'
        });
      }
      // Handle local virtual IDs
      else if (selectedId.startsWith('local_')) {
        const parts = selectedId.split('_');
        if (parts.length >= 3) {
          const templateId = parts[1];
          const cityName = parts.slice(2).join('_').replace(/_/g, ' ');
          
          mappings.push({
            virtualId: selectedId,
            realId: selectedId, // Use virtual as real for now
            templateId,
            participationMode: 'local',
            cityName
          });
        }
      }
    });
    
    console.log("Created ID mappings:", mappings);
    return mappings;
  };
  // Fetch data with schema-aware queries
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
        
        // STEP 1: Get templates for this period - limited to 3 per your requirements
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
          
          // Get the template details - note using 'name' instead of 'title' based on schema
          // Limit to 3 templates as per requirements
          const { data: templateData, error: templateDataError } = await supabase
            .from('collab_templates')
            .select('id, name, type, display_text, instructions')
            .in('id', templateIds)
            .limit(3);
            
          if (templateDataError) {
            throw new Error(templateDataError.message);
          }
          
          if (!templateData || templateData.length === 0) {
            throw new Error("No template data found for linked templates");
          }
          
          setTemplates(templateData);
          console.log("Loaded templates:", templateData);
          
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
              throw new Error(allTemplatesError.message);
            }
            
            if (!allTemplates || allTemplates.length === 0) {
              throw new Error("No templates found in fallback");
            }
            
            setTemplates(allTemplates);
            console.log("Loaded templates from fallback:", allTemplates);
            
          } catch (fallbackError) {
            // If all else fails, create dummy templates
            const dummyTemplates = [
              {
                id: 'dummy-chain',
                name: 'Echoes of the Unseen',
                type: 'chain' as const,
                display_text: 'A sequential chain collaboration example'
              },
              {
                id: 'dummy-theme',
                name: 'One Sentence Conspiracy',
                type: 'theme' as const,
                display_text: 'A theme-based collaboration example'
              },
              {
                id: 'dummy-narrative',
                name: 'Narrative Example',
                type: 'narrative' as const,
                display_text: 'A narrative-driven collaboration example'
              }
            ];
            
            console.log("Using dummy templates:", dummyTemplates);
            setTemplates(dummyTemplates);
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
            console.log("User has joined these collaborations:", collabIds);
            
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
              console.log("Joined collaborations data:", collabsData);
              
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
                let participationMode: 'private' | 'local' | 'community';
                if (participantRecord?.participation_mode) {
                  participationMode = participantRecord.participation_mode as 'private' | 'local' | 'community';
                } else if (collab.participation_mode) {
                  participationMode = collab.participation_mode as 'private' | 'local' | 'community';
                } else if (collab.is_private) {
                  participationMode = 'private';
                } else {
                  participationMode = 'community';
                }
                
                // For local collaborations, ensure we have the location from the collab's location field
                const locationValue = collab.location || 
                  participantRecord?.location || 
                  participantRecord?.city || 
                  (collab.metadata && typeof collab.metadata === 'object' ? collab.metadata.location as string : null);
                
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
              console.log("Set joined collabs:", userJoinedCollabs);
            }
          }
          // STEP 3: Get distinct cities for local collaborations
          try {
            // Fetch cities with participant counts
            const cityResult = await getCitiesWithParticipantCounts();
            
            if (cityResult.success && cityResult.cities && cityResult.cities.length > 0) {
              setAvailableCities(cityResult.cities);
              console.log("Loaded cities with participant counts:", cityResult.cities);
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
            
            // Set a default selected city for each template
            const initialSelectedCities: Record<string, string> = {};
            templates.forEach(template => {
              // Use user's location if available, otherwise pick the first city with participants
              const defaultCity = userLocation || 
                (cityResult.success && cityResult.cities && cityResult.cities.length > 0
                  ? `${cityResult.cities[0].name}${cityResult.cities[0].state ? ', ' + cityResult.cities[0].state : ''}`
                  : 'New York, NY');
              initialSelectedCities[template.id] = defaultCity;
            });
            setSelectedCities(initialSelectedCities);
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
            const collabsResult = await getUserCollabs();
            
            if (collabsResult) {
              // Format in the structure we need
              const combinedCollabs = [
                ...(collabsResult.private || []),
                ...(collabsResult.community || []),
                ...(collabsResult.local || [])
              ];
              
              // Convert to our format
              if (combinedCollabs.length > 0) {
                const formatted = combinedCollabs.map((c: any) => ({
                  id: c.id,
                  title: c.title,
                  type: c.type || 'theme',
                  participation_mode: c.participation_mode || 
                    (collabsResult.private?.some((pc: any) => pc.id === c.id) ? 'private' :
                     collabsResult.local?.some((lc: any) => lc.id === c.id) ? 'local' : 'community'),
                  location: c.location,
                  description: c.description || '',
                  participant_count: c.participantCount || 0,
                  is_joined: true,
                  template_id: c.template_id
                }));
                
                setJoinedCollabs(formatted);
                console.log("Set joined collabs from getUserCollabs:", formatted);
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
  }, [periodId, supabase, userLocation, templates.length]);

  // Create ID mappings when data is available
  useEffect(() => {
    if (templates.length > 0 && joinedCollabs.length > 0) {
      const mappings = createIdMappings(templates, joinedCollabs, selectedCollabs);
      setIdMappings(mappings);
      console.log("Created ID mappings:", mappings);
    }
  }, [templates, joinedCollabs, selectedCollabs]);
 
  // Load selections from localStorage on component mount
  useEffect(() => {
    if (!loading) {
      try {
        const stored = localStorage.getItem('temp_selected_collabs');
        if (stored && selectedCollabs.length === 0) {
          const storedSelections = JSON.parse(stored);
          console.log("Found stored selections:", storedSelections);
          
          // Only apply if we don't have selections already
          if (storedSelections.length > 0 && selectedCollabs.length === 0) {
            console.log("Applying stored selections");
            storedSelections.forEach((id: string) => toggleItem(id));
          }
        }
      } catch (e) {
        console.error("Error loading stored selections:", e);
      }
    }
  }, [loading, selectedCollabs.length, toggleItem]);

  // Function to get the joined collabs for a template
  const getJoinedCollabsForTemplate = (templateId: string): CollabData[] => {
    // Use multiple matching strategies to find joins
    return joinedCollabs.filter(collab => {
      // Direct template_id match if available
      if (collab.template_id && collab.template_id === templateId) {
        return true;
      }

      // Strategy: Name similarity match 
      const template = templates.find(t => t.id === templateId);
      if (template && collab.title && template.name) {
        const templateName = template.name.toLowerCase();
        
        // For local collaborations, check if the base name matches
        if (collab.participation_mode === 'local' && collab.title.includes(' - ')) {
          // Extract the base name before the city
          const baseName = collab.title.split(' - ')[0].toLowerCase();
          return baseName === templateName || baseName.includes(templateName) || templateName.includes(baseName);
        }
        
        // For other types, do a direct match or inclusion check
        const collabTitle = collab.title.toLowerCase();
        return collabTitle.includes(templateName) || templateName.includes(collabTitle);
      }
      
      // No match found
      return false;
    });
  };

  const isCollabSelected = (collabId: string): boolean => {
    // Direct ID match - if found, it's definitely selected
    const directMatch = selectedCollabs.includes(collabId);
    if (directMatch) {
      return true;
    }
    
    // For local collaborations with potential city differences
    if (collabId.startsWith('local_')) {
      const parts = collabId.split('_');
      if (parts.length >= 3) {
        const templateId = parts[1];
        
        // Check for ANY local collaboration with this template ID
        const anyMatchingLocalCollab = selectedCollabs.some(id => {
          return id.startsWith(`local_${templateId}_`);
        });
        
        // If we found a matching local collab with this template, consider it selected
        if (anyMatchingLocalCollab) {
          // Update the selectedCities to ensure proper display
          const matchingSelection = selectedCollabs.find(id => id.startsWith(`local_${templateId}_`));
          if (matchingSelection) {
            const matchingParts = matchingSelection.split('_');
            if (matchingParts.length >= 3) {
              const cityFromSelection = matchingParts.slice(2).join('_').replace(/_/g, ' ');
              // Update selectedCities for this template
              setTimeout(() => {
                setSelectedCities(prev => ({
                  ...prev,
                  [templateId]: cityFromSelection
                }));
              }, 0);
            }
          }
          return true;
        }
      }
    }
    
    // For community collaborations (keeping your existing code)
    if (collabId.startsWith('community_')) {
      const templateId = collabId.split('community_')[1];
      
      // Check for any community ID in selectedCollabs that matches this template ID
      const templateCommunityMatch = selectedCollabs.some(id => {
        if (!id.startsWith('community_')) return false;
        
        // Check if the template IDs match
        return id.split('community_')[1] === templateId;
      });
      
      return templateCommunityMatch;
    }
    
    // For joined collabs and other types
    return false;
  };

  // Wrapper for toggleItem that also updates localStorage
  const handleToggleItem = (id: string) => {
    console.log(`DESELECTION FIX: handleToggleItem called for ${id}`);
    console.log(`DESELECTION FIX: Current selectedCollabs:`, selectedCollabs);
    console.log(`DESELECTION FIX: Does array include this ID?`, selectedCollabs.includes(id));
    
    // Call the parent's toggle function
    toggleItem(id);
    
    // Log after calling
    setTimeout(() => {
      console.log(`DESELECTION FIX: After toggle, selectedCollabs:`, selectedCollabs);
      console.log(`DESELECTION FIX: Does array include this ID now?`, selectedCollabs.includes(id));
    }, 0);
  };
  
  // Handle dropdown toggle
  const toggleCityDropdown = (templateId: string) => {
    setCityDropdownOpen(prev => ({
      ...prev,
      [templateId]: !prev[templateId]
    }));
  };
  
  // Handle city selection
const selectCity = (templateId: string, city: string) => {
  console.log(`Setting selected city for template ${templateId} to "${city}"`);
  setSelectedCities(prev => ({
    ...prev,
    [templateId]: city
  }));
  setCityDropdownOpen(prev => ({
    ...prev,
    [templateId]: false
  }));
};
  
  // Component for a joined collab option with enhanced selection indicators
  const JoinedCollabOption = ({ 
    collab, 
    isSelected,
    toggleItem,
    disabled
  }: { 
    collab: CollabData;
    isSelected: boolean;
    toggleItem: () => void;
    disabled: boolean;
  }) => {
    const mode = collab.participation_mode;
    let icon;
    let bgColor;
    let modeLabel;
    
    // Set properties based on mode
    switch (mode) {
      case 'private':
        icon = <Lock size={16} />;
        bgColor = 'bg-purple-100 text-purple-600';
        modeLabel = 'Private';
        break;
      case 'local':
        icon = <MapPin size={16} />;
        bgColor = 'bg-green-100 text-green-600';
        modeLabel = 'Local';
        break;
      case 'community':
        icon = <Globe size={16} />;
        bgColor = 'bg-blue-100 text-blue-600';
        modeLabel = 'Community';
        break;
      default:
        icon = <Globe size={16} />;
        bgColor = 'bg-blue-100 text-blue-600';
        modeLabel = 'Community';
    }
    
    return (
      <div>
        <div 
          className={`
            flex items-center justify-between p-3 rounded-lg border
            ${isSelected ? 'ring-2 ring-blue-500' : ''}
            ${isSelected ? 'cursor-pointer hover:bg-gray-50' : disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
          `}
          onClick={() => toggleItem()}
        >
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${bgColor}`}>
              {icon}
            </div>
            <div>
              <div className="font-medium flex items-center gap-2">
                <span title={collab.id}>{collab.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${bgColor}`}>
                  {modeLabel}
                </span>
                <Star size={12} className="text-yellow-500" />
                {isSelected && (
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 flex items-center">
                {mode === 'local' && collab.location && (
                  <span className="flex items-center">
                    <MapPin size={10} className="mr-1" />
                    {collab.location}
                  </span>
                )}
              </div>
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
  
  // Template card component
  const TemplateCard = ({ template }: { template: CollabTemplate }) => {
    // Find joined collabs for this template
    const templateJoinedCollabs = getJoinedCollabsForTemplate(template.id);
    const hasJoinedCollabs = templateJoinedCollabs.length > 0;
    
    // Group by participation mode
    const joinedPrivate = templateJoinedCollabs.filter(c => c.participation_mode === 'private');
    const joinedLocal = templateJoinedCollabs.filter(c => c.participation_mode === 'local');
    const joinedCommunity = templateJoinedCollabs.filter(c => c.participation_mode === 'community');
     
    // Format city selection display
    const selectedCity = selectedCities[template.id] || 'Select a city';
    const isDropdownOpen = cityDropdownOpen[template.id] || false;
    console.log(`TemplateCard for ${template.id} - Using city: ${selectedCity}`);

    // Create unique IDs for selection
    const communityId = `community_${template.id}`;
    const localId = `local_${template.id}_${selectedCity.replace(/[^a-zA-Z0-9]/g, '_')}`;

    let displayCity = selectedCity;
    // Check if there's any local selection for this template
    const localSelection = selectedCollabs.find(id => id.startsWith(`local_${template.id}_`));
    if (localSelection) {
      const parts = localSelection.split('_');
      if (parts.length >= 3) {
        displayCity = parts.slice(2).join('_').replace(/_/g, ' ');
      }
    }
    
    // Add these debug logs
    console.log(`Rendering local option with ID: ${localId}, selectedCity: ${selectedCity}`);
    console.log(`Is selected? ${isCollabSelected(localId)}`);

    // Enhanced selection checking with debugging
    useEffect(() => {
      console.log(`Template ${template.id} - ${template.name} rendering with selectedCollabs:`, selectedCollabs);
      
      // Log all the IDs that might match this template
      const potentialIds = [
        // Community ID
        `community_${template.id}`,
        // Joined collabs for this template
        ...templateJoinedCollabs.map(c => c.id),
        // Local IDs with different cities
        ...Object.keys(selectedCities)
          .filter(k => k === template.id)
          .map(k => `local_${template.id}_${selectedCities[k].replace(/\s+/g, '_')}`)
      ];
      
      console.log("Potential IDs for template", template.id, ":", potentialIds);
      const anyMatches = potentialIds.some(id => selectedCollabs.includes(id));
      console.log(`Template ${template.id} - Any matches in selectedCollabs:`, anyMatches);
      
      if (anyMatches) {
        console.log("Matched IDs:", potentialIds.filter(id => selectedCollabs.includes(id)));
      }
    }, [template.id, selectedCollabs, templateJoinedCollabs.length]);
    
    // Check if any options for this template are selected
    const isCommunitySelected = isCollabSelected(communityId);
    const isLocalSelected = isCollabSelected(localId) || 
  selectedCollabs.some(id => id.startsWith(`local_${template.id}_`));
    const isAnyJoinedSelected = templateJoinedCollabs.some(c => isCollabSelected(c.id));
    
    // Determine if we can select more
    const canSelectMore = remainingContent > 0 || isAnyJoinedSelected || isCommunitySelected || isLocalSelected;
    
    const hasTemplateSelection = isAnyJoinedSelected || isCommunitySelected || isLocalSelected;

    return (
      <div className="mb-8 border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
        {/* Template header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{template.name}</h3>
            {hasJoinedCollabs && (
              <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                <Star size={12} className="mr-1" />
                Joined
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{template.display_text || 'No description available'}</p>
        </div>
        
        <div className="border-t pt-3">
          {/* 1. Joined Collaborations (if any) - displayed at the top */}
          {hasJoinedCollabs && (
            <div className="mb-4">
              <h4 className="font-medium text-sm mb-2">Your Joined Collaborations:</h4>
              <div className="space-y-2">
                
              {joinedPrivate.map(collab => (
  <JoinedCollabOption 
  key={collab.id}
  collab={collab}
  isSelected={isCollabSelected(collab.id)}
  toggleItem={() => handleToggleItem(collab.id)}
  disabled={remainingContent <= 0 && !isCollabSelected(collab.id)}
/>
))}
                
                {joinedLocal.map(collab => (
                  <JoinedCollabOption 
                    key={collab.id}
                    collab={collab}
                    isSelected={isCollabSelected(collab.id)}
                    toggleItem={() => handleToggleItem(collab.id)}
                    disabled={remainingContent <= 0 && !isCollabSelected(collab.id)}
                  />
                ))}
                
                {joinedCommunity.map(collab => (
                  <JoinedCollabOption 
                    key={collab.id}
                    collab={collab}
                    isSelected={isCollabSelected(collab.id)}  
                    toggleItem={() => handleToggleItem(collab.id)}
                    disabled={remainingContent <= 0 && !isCollabSelected(collab.id)} 
                  />
                ))}
              </div>
              
  </div>
)}
          
          {/* 2. Add New Collaborations options */}
          <div>
            <h4 className="font-medium text-sm mb-2">
              {hasJoinedCollabs ? "Add Other Versions:" : "Add to Your Magazine:"}
            </h4>
            
            {/* Community Option - now as a complete card */}
            <div 
  className={`
    flex items-center justify-between p-3 rounded-lg border mb-2
    ${isCommunitySelected ? 'ring-2 ring-blue-500' : ''}
    ${!canSelectMore && !isCommunitySelected ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
  `}
  onClick={() => {
    // Always allow deselection of this specific ID
    if (isCommunitySelected) {
      console.log(`Deselecting specific community ID: ${communityId}`);
      toggleItem(communityId);
    }
    // For selection, keep the original logic
    else if (canSelectMore) {
      console.log(`Selecting community ID: ${communityId}`);
      toggleItem(communityId);
    }
  }}
>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-blue-100 text-blue-600">
                  <Globe size={16} />
                </div>
                <div>
                  <div className="font-medium flex items-center">
                    Community Version
                    <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      Community
                    </span>
                    {isCommunitySelected && (
                      <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Random selection from all contributors worldwide
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-center"
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%',
                  backgroundColor: isCommunitySelected ? '#3b82f6' : 'transparent',
                  borderWidth: isCommunitySelected ? '0' : '1px',
                  borderColor: '#d1d5db',
                  borderStyle: 'solid',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isCommunitySelected && <Check size={14} className="text-white" />}
              </div>
            </div>
            
            {/* Local Option as complete card with City Dropdown */}
            <div className="relative mb-2">
            <div 
  className={`
    flex items-center justify-between p-3 rounded-lg border
    ${isLocalSelected ? 'ring-2 ring-blue-500' : ''}
    ${!canSelectMore && !isLocalSelected ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
  `}
  onClick={() => {
    // Always allow deselection of this specific local ID
    if (isLocalSelected) {
      console.log(`Deselecting specific local ID: ${localId}`);
      toggleItem(localId);
    }
    // For selection, keep city dropdown logic
    else if (canSelectMore) {
      toggleCityDropdown(template.id);
    }
  }}
>
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-green-100 text-green-600">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <div className="font-medium flex items-center">
                      Local Version
                      <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                        Local
                      </span>
                      {isLocalSelected && (
                        <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center">
  <span className="font-medium">{displayCity}</span>
  <ChevronDown size={14} className="ml-1" />
</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-center"
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%',
                    backgroundColor: isLocalSelected ? '#3b82f6' : 'transparent',
                    borderWidth: isLocalSelected ? '0' : '1px',
                    borderColor: '#d1d5db',
                    borderStyle: 'solid',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {isLocalSelected && <Check size={14} className="text-white" />}
                </div>
              </div>
              
              {/* City Dropdown */}
{isDropdownOpen && canSelectMore && (
  <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg">
    <div className="max-h-60 overflow-auto py-1">
      {availableCities.length > 0 ? (
        availableCities.map((city, index) => (
          <div 
            key={index}
            className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer flex justify-between items-center"
            onClick={() => {
              const cityDisplay = city.state 
                ? `${city.name}, ${city.state}` 
                : city.name;
              
              // Set the selected city
              selectCity(template.id, cityDisplay);
              
              // Create the local city ID
              const localCityId = `local_${template.id}_${cityDisplay.replace(/[^a-zA-Z0-9]/g, '_')}`;
              
              
              // Check if already selected
              const isAlreadySelected = isCollabSelected(localCityId);
              console.log(`Is this local option already selected? ${isAlreadySelected}`);
              
              // Always toggle (select if not selected, unselect if already selected)
              handleToggleItem(localCityId);
            }}
          >
            <span>{city.state ? `${city.name}, ${city.state}` : city.name}</span>
            {city.participant_count > 0 && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full ml-2">
                {city.participant_count}
              </span>
            )}
          </div>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-gray-500 text-center">
          No cities with active participants found
        </div>
      )}
    </div>
  </div>
)}
            </div>
            
            {/* Information about city-specific collaborations */}
            <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-600">
              <div className="flex items-start">
                <AlertCircle size={14} className="text-blue-500 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">About Local Collaborations</p>
                  <p>Local collaborations are specific to a city. You'll only see content from other contributors in your selected city.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
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
    const aHasJoined = getJoinedCollabsForTemplate(a.id).length > 0;
    const bHasJoined = getJoinedCollabsForTemplate(b.id).length > 0;
    
    if (aHasJoined && !bHasJoined) return -1;
    if (!aHasJoined && bHasJoined) return 1;
    return 0;
  });
  
  // Calculate actual selected count with improved accuracy
  const selectedCount = selectedCollabs.filter(id => {
    // For community virtual IDs
    if (id.startsWith('community_')) {
      return true;
    }
    
    // For local virtual IDs
    if (id.startsWith('local_')) {
      return true;
    }
    
    // For joined collab IDs
    const joinedCollab = joinedCollabs.find(c => c.id === id);
    return !!joinedCollab;
  }).length;
  
  return (
    <div>
      {/* Don't show title and count if hideTitle is true */}
      {!hideTitle && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium">Collaborations</h2>
          {selectedCount > 0 && (
            <span className="text-sm bg-blue-100 text-blue-600 px-3 py-1 rounded-full">
              {selectedCount} selected
            </span>
          )}
        </div>
      )}
      
      <div className="space-y-6">
        {sortedTemplates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
      
      {/* Show when no templates are available */}
      {templates.length === 0 && (
        <div className="p-6 bg-gray-50 rounded-lg text-center mt-4">
          <p className="text-gray-600 mb-2">No collaboration templates found for this period.</p>
        </div>
      )}
    </div>
  );
};

export default IntegratedCollabsSection;