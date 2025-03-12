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
}

/**
 * Interface for collab template data
 */
export interface CollabTemplate {
  id: string;
  title: string;
  type: 'chain' | 'theme' | 'narrative';
  display_text?: string;
  instructions?: string;
  requirements?: string;
  connection_rules?: string;
  internal_reference?: string;
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
        description: '', // Default empty string
        is_joined: true
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
          title,
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
            title: item.title || '',
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
 * Save curator's selected collaborations
 */
export async function saveCuratorCollabSelections(
  curatorId: string,
  periodId: string,
  selectedCollabIds: string[]
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createClientComponentClient();
  
  try {
    // First, delete existing selections
    const { error: deleteError } = await supabase
      .from('curator_collab_selections')
      .delete()
      .eq('curator_id', curatorId)
      .eq('period_id', periodId);
      
    if (deleteError) {
      console.error("Error deleting existing selections:", deleteError);
      return { success: false, error: deleteError.message };
    }
    
    // If there are no selections, we're done
    if (selectedCollabIds.length === 0) {
      return { success: true };
    }
    
    // Create selection records for each selected collab
    const selectionRecords = selectedCollabIds.map(collabId => ({
      curator_id: curatorId,
      collab_id: collabId,
      period_id: periodId,
      selected_at: new Date().toISOString()
    }));
    
    // Insert the new records
    const { error: insertError } = await supabase
      .from('curator_collab_selections')
      .insert(selectionRecords);
      
    if (insertError) {
      console.error("Error inserting collab selections:", insertError);
      return { success: false, error: insertError.message };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error("Error saving collab selections:", error);
    return { success: false, error: "Failed to save collaboration selections" };
  }
}

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
    const { data, error } = await supabase
      .from('curator_collab_selections')
      .select('collab_id')
      .eq('curator_id', curatorId)
      .eq('period_id', periodId);
      
    if (error) {
      console.error("Error fetching collab selections:", error);
      return { success: false, error: error.message };
    }
    
    const selectedCollabIds = data.map(item => item.collab_id);
    
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
        metadata
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
      is_joined: false
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