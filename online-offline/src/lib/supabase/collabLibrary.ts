// src/lib/supabase/collabLibrary.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getUserCollabs } from './collabs';

/**
 * Interface for collaboration data
 */
export interface CollabData {
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

/**
 * Interface for collab template data
 */
export interface CollabTemplate {
  id: string;
  name: string; // Changed from title to match actual schema
  type: 'chain' | 'theme' | 'narrative';
  display_text?: string;
  instructions?: string;
  requirements?: string;
  connection_rules?: string;
  internal_reference?: string;
}

/**
 * Interface for city participant data
 */
export interface CityParticipantData {
  name: string;
  state?: string;
  participant_count: number;
}

/**
 * Get all collaborations for the current period organized by type
 */
export async function getCollaborationsForCuration(periodId: string): Promise<{
  success: boolean;
  error?: string;
  joinedCollabs?: CollabData[];
}> {
  const supabase = createClientComponentClient();
  
  try {
    // First, get the user's joined collabs using the existing function
    const userCollabsResult = await getUserCollabs();
    
    if (!userCollabsResult) {
      return { success: false, error: "Failed to fetch user collaborations" };
    }
    
    // Create typed arrays to avoid 'never' type issues
    type CollabItem = {
      id: string;
      title: string;
      type?: string;
      is_private?: boolean;
      participation_mode?: string;
      location?: string | null;
      description?: string;
      participantCount?: number;
      template_id?: string;
      [key: string]: any; // Allow other properties
    };
    
    // Convert to typed arrays
    const privateCollabs: CollabItem[] = userCollabsResult.private || [];
    const communityCollabs: CollabItem[] = userCollabsResult.community || [];
    const localCollabs: CollabItem[] = userCollabsResult.local || [];
    
    // Combine all types of collabs
    const allUserCollabs = [
      ...privateCollabs.map(c => ({ ...c, sourceType: 'private' })),
      ...communityCollabs.map(c => ({ ...c, sourceType: 'community' })),
      ...localCollabs.map(c => ({ ...c, sourceType: 'local' }))
    ];
    
    // Format the collabs for the curation interface
    const formattedCollabs: CollabData[] = allUserCollabs.map(collab => {
      // Determine participation mode
      let participationMode: 'private' | 'local' | 'community' = 'community';
      
      if (collab.sourceType === 'private') {
        participationMode = 'private';
      } else if (collab.sourceType === 'local') {
        participationMode = 'local';
      } else if (collab.participation_mode) {
        if (['private', 'local', 'community'].includes(collab.participation_mode)) {
          participationMode = collab.participation_mode as 'private' | 'local' | 'community';
        }
      } else if (collab.is_private) {
        participationMode = 'private';
      }
      
      // Build the formatted collab object with safe defaults
      return {
        id: collab.id || '',
        title: collab.title || '',
        type: (collab.type as 'chain' | 'theme' | 'narrative') || 'chain',
        participation_mode: participationMode,
        participant_count: collab.participantCount || 0,
        location: collab.location || null,
        description: collab.description || '',
        is_joined: true,
        template_id: collab.template_id || ''
      };
    });
    
    return { success: true, joinedCollabs: formattedCollabs };
    
  } catch (error) {
    console.error("Error getting collaborations for curation:", error);
    return { success: false, error: "Failed to fetch collaborations data" };
  }
}

/**
 * Get collaboration templates available for the period
 */
export async function getCollabTemplatesForPeriod(periodId: string): Promise<{
  success: boolean;
  error?: string;
  templates?: CollabTemplate[];
}> {
  const supabase = createClientComponentClient();
  
  try {
    // Get templates assigned to this period
    const { data, error } = await supabase
      .from('period_templates')
      .select(`
        template_id,
        collab_templates:template_id (
          id,
          name,
          type,
          instructions,
          requirements,
          connection_rules,
          display_text,
          internal_reference
        )
      `)
      .eq('period_id', periodId);

    if (error) {
      console.error("Error fetching collab templates:", error);
      return { success: false, error: error.message };
    }

    // Extract the templates from the nested structure
    let templates: CollabTemplate[] = [];
    
    if (data) {
      data.forEach(item => {
        if (!item.collab_templates) return;
        
        const template = item.collab_templates;
        
        // Handle if it's an array or single object
        const templateItems = Array.isArray(template) ? template : [template];
        
        templateItems.forEach(item => {
          if (!item) return;
          
          templates.push({
            id: item.id || '',
            name: item.name || '', // Changed from title to name
            type: (item.type as 'chain' | 'theme' | 'narrative') || 'chain',
            display_text: item.display_text,
            instructions: item.instructions,
            requirements: item.requirements,
            connection_rules: item.connection_rules,
            internal_reference: item.internal_reference
          });
        });
      });
    }
    
    return { success: true, templates };
    
  } catch (error) {
    console.error("Error getting collab templates:", error);
    return { success: false, error: "Failed to fetch collaboration templates" };
  }
}

/**
 /**
 * Get curator's selected collaborations for a period
 */
export async function getCuratorCollabSelections(
  curatorId: string,
  periodId: string
): Promise<{
  success: boolean;
  error?: string;
  selectedCollabIds?: string[];
}> {
  const supabase = createClientComponentClient();
  
  try {
    // Updated to fetch source_id as well
    const { data, error } = await supabase
      .from('curator_collab_selections')
      .select('collab_id, source_id')
      .eq('curator_id', curatorId)
      .eq('period_id', periodId);
      
    if (error) {
      console.error("Error fetching collab selections:", error);
      return { success: false, error: error.message };
    }
    
    // Use source_id if available, otherwise fallback to collab_id
    const selectedCollabIds = data.map(item => item.source_id || item.collab_id).filter(Boolean);
    
    console.log("Selected collab IDs from database:", selectedCollabIds);
    return { success: true, selectedCollabIds };
    
  } catch (error) {
    console.error("Error getting collab selections:", error);
    return { success: false, error: "Failed to fetch collaboration selections" };
  }
}

/**
 * Get all available collaborations for a period (that the user hasn't already joined)
 */
export async function getAvailableCollabsForPeriod(
  periodId: string
): Promise<{
  success: boolean;
  error?: string;
  availableCollabs?: CollabData[];
}> {
  const supabase = createClientComponentClient();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }
    
    // Get collabs that user has already joined
    const userCollabsResult = await getUserCollabs();
    if (!userCollabsResult) {
      return { success: false, error: "Failed to fetch user collaborations" };
    }
    
    // Extract IDs of joined collabs
    const joinedCollabIds: string[] = [];
    
    // Safely extract IDs from each array
    if (Array.isArray(userCollabsResult.private)) {
      joinedCollabIds.push(...userCollabsResult.private.map(c => c.id || '').filter(Boolean));
    }
    if (Array.isArray(userCollabsResult.community)) {
      joinedCollabIds.push(...userCollabsResult.community.map(c => c.id || '').filter(Boolean));
    }
    if (Array.isArray(userCollabsResult.local)) {
      joinedCollabIds.push(...userCollabsResult.local.map(c => c.id || '').filter(Boolean));
    }
    
    // Get all community and local collabs for the period
    const { data: availableCollabsData, error } = await supabase
      .from('collabs')
      .select(`
        id,
        title,
        type,
        participation_mode,
        location,
        metadata,
        template_id
      `)
      .eq('period_id', periodId)
      .in('participation_mode', ['community', 'local']);
      
    if (error) {
      console.error("Error fetching available collabs:", error);
      return { success: false, error: error.message };
    }
    
    // Filter out already joined collabs
    const filteredCollabs = (availableCollabsData || []).filter(
      collab => !joinedCollabIds.includes(collab.id)
    );
    
    // Format the collabs
    const availableCollabs: CollabData[] = filteredCollabs.map(collab => ({
      id: collab.id,
      title: collab.title,
      type: collab.type as 'chain' | 'theme' | 'narrative',
      participation_mode: collab.participation_mode as 'community' | 'local' | 'private',
      location: collab.location,
      description: collab.metadata?.description || '',
      participant_count: 0,  // We'll update this below
      is_joined: false,
      template_id: collab.template_id
    }));
    
    // Get participant counts for each collab
    for (const collab of availableCollabs) {
      const { count, error: countError } = await supabase
        .from('collab_participants')
        .select('*', { count: 'exact', head: true })
        .eq('collab_id', collab.id)
        .eq('status', 'active');
        
      if (!countError && count !== null) {
        collab.participant_count = count;
      }
    }
    
    return { success: true, availableCollabs };
    
  } catch (error) {
    console.error("Error getting available collabs:", error);
    return { success: false, error: "Failed to fetch available collaborations" };
  }
}

/**
 * Get cities with participant counts for local collaborations
 */
export async function getCitiesWithParticipantCounts(): Promise<{
  success: boolean;
  error?: string;
  cities?: CityParticipantData[];
}> {
  const supabase = createClientComponentClient();
  
  try {
    // Fetch cities from collab_participants table
    const { data: cityData, error: cityError } = await supabase
      .from('collab_participants')
      .select(`
        city,
        location
      `)
      .eq('participation_mode', 'local')
      .eq('status', 'active');
      
    if (cityError) {
      console.error("Error fetching cities:", cityError);
      return { success: false, error: cityError.message };
    }
    
    // Compile a list of cities with participant counts
    const cityCountMap: Record<string, number> = {};
    
    // Process city and location fields
    for (const record of cityData || []) {
      // Use city field first, fall back to location
      const cityName = record.city || record.location;
      
      if (cityName) {
        if (cityCountMap[cityName]) {
          cityCountMap[cityName]++;
        } else {
          cityCountMap[cityName] = 1;
        }
      }
    }
    
    // Also fetch location data from collabs table
    const { data: collabLocationData, error: collabLocationError } = await supabase
      .from('collabs')
      .select('location')
      .eq('participation_mode', 'local')
      .not('location', 'is', null);
      
    if (!collabLocationError && collabLocationData) {
      for (const record of collabLocationData) {
        if (record.location) {
          // Add locations from the collabs table, but don't count participants
          // This ensures we have the location in our list even if it has no participants yet
          if (!cityCountMap[record.location]) {
            cityCountMap[record.location] = 0;
          }
        }
      }
    }
    
    // Format the result
    const cities = Object.entries(cityCountMap).map(([cityName, count]) => {
      const parts = cityName.split(',').map(part => part.trim());
      return {
        name: parts[0],
        state: parts[1] || undefined,
        participant_count: count
      };
    });
    
    // Sort by participant count (highest first), then by name
    cities.sort((a, b) => {
      if (b.participant_count !== a.participant_count) {
        return b.participant_count - a.participant_count;
      }
      return a.name.localeCompare(b.name);
    });
    
    // If no cities found, provide default list
    if (cities.length === 0) {
      return {
        success: true,
        cities: [
          { name: 'New York', state: 'NY', participant_count: 0 },
          { name: 'Los Angeles', state: 'CA', participant_count: 0 },
          { name: 'Chicago', state: 'IL', participant_count: 0 },
          { name: 'San Francisco', state: 'CA', participant_count: 0 },
          { name: 'Miami', state: 'FL', participant_count: 0 },
          { name: 'Austin', state: 'TX', participant_count: 0 }
        ]
      };
    }
    
    return { success: true, cities };
    
  } catch (error) {
    console.error("Error getting cities with participant counts:", error);
    return { success: false, error: "Failed to fetch city participant data" };
  }
}