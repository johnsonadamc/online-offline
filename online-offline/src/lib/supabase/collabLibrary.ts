// src/lib/supabase/collabLibrary.ts
import { getSupabaseClient } from './client'
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
 * Interface to describe the structure of data from getUserCollabs
 */
interface UserCollabItem {
  id: string;
  title: string;
  type?: 'chain' | 'theme' | 'narrative';
  is_private?: boolean;
  sourceType?: string;
  participation_mode?: string;
  location?: string | null;
  participantCount?: number;
  metadata?: Record<string, unknown>;
  description?: string;
  template_id?: string;
  [key: string]: unknown;
}

/**
 * Get all collaborations for the current period organized by type
 */
export async function getCollaborationsForCuration(supabase: ReturnType<typeof getSupabaseClient>): Promise<{
  success: boolean;
  error?: string;
  joinedCollabs?: CollabData[];
}> {
  try {
    // First, get the user's joined collabs using the existing function
    const userCollabsResult = await getUserCollabs(supabase);

    if (!userCollabsResult) {
      return { success: false, error: "Failed to fetch user collaborations" };
    }

    // Safely extract data from each array with type assertions
    const privateCollabs = userCollabsResult.private || [];
    const communityCollabs = userCollabsResult.community || [];
    const localCollabs = userCollabsResult.local || [];
    
    // Combine all types of collabs
    const allUserCollabs = [
      ...privateCollabs.map(c => ({ ...c, sourceType: 'private' })),
      ...communityCollabs.map(c => ({ ...c, sourceType: 'community' })),
      ...localCollabs.map(c => ({ ...c, sourceType: 'local' }))
    ] as UserCollabItem[];
    
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
      
      // Extract description and template_id safely
      let description = '';
      let templateId = '';
      
      // Try to extract description from various places it might exist
      if (typeof collab.description === 'string') {
        description = collab.description;
      } else if (collab.metadata && typeof collab.metadata === 'object') {
        const metadataDescription = collab.metadata.description;
        if (typeof metadataDescription === 'string') {
          description = metadataDescription;
        }
      }
      
      // Try to extract template_id if it exists
      if (typeof collab.template_id === 'string') {
        templateId = collab.template_id;
      }
      
      // Build the formatted collab object with safe defaults
      return {
        id: collab.id || '',
        title: collab.title || '',
        type: (collab.type as 'chain' | 'theme' | 'narrative') || 'chain',
        participation_mode: participationMode,
        participant_count: collab.participantCount || 0,
        location: collab.location || null,
        description: description,
        is_joined: true,
        template_id: templateId
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
export async function getCollabTemplatesForPeriod(supabase: ReturnType<typeof getSupabaseClient>, periodId: string): Promise<{
  success: boolean;
  error?: string;
  templates?: CollabTemplate[];
}> {  
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
    const templates: CollabTemplate[] = [];
    
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
 * Get curator's selected collaborations for a period
 */
export async function getCuratorCollabSelections(
  supabase: ReturnType<typeof getSupabaseClient>,
  curatorId: string,
  periodId: string
): Promise<{
  success: boolean;
  error?: string;
  selectedCollabIds?: string[];
}> {  
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
  supabase: ReturnType<typeof getSupabaseClient>,
  periodId: string
): Promise<{
  success: boolean;
  error?: string;
  availableCollabs?: CollabData[];
}> {  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }
    
    // Get collabs that user has already joined
    const userCollabsResult = await getUserCollabs(supabase);
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
 * Get cities with active participant counts for local collaborations in a given period,
 * grouped by template_id so each template shows only its own cities.
 * Only cities with at least one active participant are returned, sorted alphabetically.
 */
export async function getCitiesWithParticipantCounts(
  supabase: ReturnType<typeof getSupabaseClient>,
  periodId: string
): Promise<{
  success: boolean;
  error?: string;
  citiesByTemplate?: Record<string, { city: string; count: number }[]>;
}> {
  try {
    // Get local collabs for this period, including template_id for grouping
    const { data: collabRows, error: collabError } = await supabase
      .from('collabs')
      .select('id, template_id')
      .eq('period_id', periodId)
      .eq('participation_mode', 'local');

    if (collabError) return { success: false, error: collabError.message };

    const collabList = collabRows || [];
    if (!collabList.length) return { success: true, citiesByTemplate: {} };

    // Build collab_id → template_id map
    const collabToTemplate: Record<string, string> = {};
    for (const c of collabList) {
      if (c.template_id) collabToTemplate[c.id] = c.template_id;
    }
    const ids = collabList.map(c => c.id);

    // Fetch active local participants in those collabs
    const { data: participants, error: participantsError } = await supabase
      .from('collab_participants')
      .select('collab_id, city')
      .in('collab_id', ids)
      .eq('participation_mode', 'local')
      .eq('status', 'active');

    if (participantsError) return { success: false, error: participantsError.message };

    // Group: template_id → city → count
    const templateCityMap: Record<string, Record<string, number>> = {};
    for (const record of participants || []) {
      const templateId = collabToTemplate[record.collab_id];
      const cityName = record.city;
      if (!templateId || !cityName) continue;
      if (!templateCityMap[templateId]) templateCityMap[templateId] = {};
      templateCityMap[templateId][cityName] = (templateCityMap[templateId][cityName] || 0) + 1;
    }

    // Format each template's city list: filter zeros, sort alphabetically
    const citiesByTemplate: Record<string, { city: string; count: number }[]> = {};
    for (const [templateId, cityCountMap] of Object.entries(templateCityMap)) {
      citiesByTemplate[templateId] = Object.entries(cityCountMap)
        .filter(([, count]) => count > 0)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => a.city.localeCompare(b.city));
    }

    return { success: true, citiesByTemplate };

  } catch (error) {
    console.error('Error getting cities with participant counts:', error);
    return { success: false, error: 'Failed to fetch city participant data' };
  }
}
