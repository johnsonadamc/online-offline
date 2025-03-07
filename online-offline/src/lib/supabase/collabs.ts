// lib/supabase/collabs.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Define the shape of the database response
interface ProfileData {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
}

interface ParticipantData {
  id: string;
  role: string;
  profile_id: string;
  collab_id: string;
  participation_mode?: 'community' | 'local' | 'private';
  location?: string | null;
  profiles?: ProfileData;
}

interface CollabData {
  id: string;
  title: string;
  type: 'chain' | 'theme' | 'narrative';
  is_private: boolean | string | number;
  created_by: string;
  current_phase: number | null;
  total_phases: number | null;
  created_at: string;
  updated_at: string;
  metadata?: {
    participation_mode?: 'community' | 'local' | 'private';
    location?: string | null;
  };
}

// getUserCollabs function with improved private/community/local detection
export async function getUserCollabs() {
  const supabase = createClientComponentClient();
  
  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("No authenticated user found");
    return { private: [], community: [], local: [] };
  }
  
  console.log("Getting collabs for user ID:", user.id);

  try {
    // Fetch all collab participants for the current user
    console.log("Querying collab_participants for user:", user.id);
    const { data: participantsData, error: participantsError } = await supabase
      .from('collab_participants')
      .select(`
        id,
        role,
        status,
        collab_id,
        profile_id,
        participation_mode,
        location
      `)
      .eq('profile_id', user.id)
      .eq('status', 'active');
      
    if (participantsError) {
      console.error("Error fetching participant data:", participantsError);
      return { private: [], community: [], local: [] };
    }
    
    console.log("Participant records found:", participantsData?.length || 0);
    
    if (!participantsData || participantsData.length === 0) {
      console.log("No participant records found for user");
      return { private: [], community: [], local: [] };
    }
    
    // Extract collab IDs from participant records
    const collabIds = participantsData.map(p => p.collab_id);
    console.log("Collab IDs found:", collabIds);
    
    // Fetch the actual collab data
    console.log("Querying collabs table for IDs:", collabIds);
    const { data: collabsData, error: collabsError } = await supabase
      .from('collabs')
      .select(`
        id,
        title,
        type,
        is_private,
        created_by,
        current_phase,
        total_phases,
        created_at,
        updated_at,
        metadata
      `)
      .in('id', collabIds);
      
    if (collabsError) {
      console.error("Error fetching collab data:", collabsError);
      return { private: [], community: [], local: [] };
    }
    
    console.log("Collabs data found:", collabsData?.length || 0);
    console.log("Detailed collab data:", collabsData);
    
    if (!collabsData || collabsData.length === 0) {
      console.log("No collab records found");
      return { private: [], community: [], local: [] };
    }
    
    // Now get all participants for these collabs for display
    console.log("Fetching all participants for these collabs");
    const { data: allParticipantsData, error: allParticipantsError } = await supabase
      .from('collab_participants')
      .select(`
        id,
        role,
        profile_id,
        collab_id,
        participation_mode,
        location,
        profiles (
          id,
          first_name,
          last_name
        )
      `)
      .in('collab_id', collabIds);
      
    if (allParticipantsError) {
      console.error("Error fetching all participants:", allParticipantsError);
    }
    
    // Format the data for the frontend
    const privateCollabs = [];
    const communityCollabs = [];
    const localCollabs = [];
    
    for (const collab of collabsData || []) {
      // Log raw collab data for debugging
      console.log(`\nProcessing collab ${collab.id} - ${collab.title}`);
      console.log(`Raw is_private value: ${collab.is_private} (${typeof collab.is_private})`);
      
      // Get participants for this collab
      const collabParticipants = allParticipantsData?.filter(p => p.collab_id === collab.id) || [];
      
      // Format participant data
      const participants = collabParticipants.map((p: any) => {
        let name = 'Unknown User';
        if (p.profiles) {
          const firstName = p.profiles.first_name || '';
          const lastName = p.profiles.last_name || '';
          name = `${firstName} ${lastName}`.trim();
          if (!name) name = 'User';  // Fallback if both names are empty
        }
        
        return {
          name: name,
          role: p.role
        };
      });
      
      // Get ISO date string
      let lastActive = collab.updated_at || collab.created_at;
      // Convert ISO date to localized date string
      if (lastActive) {
        const date = new Date(lastActive);
        lastActive = date.toLocaleDateString();
      } else {
        lastActive = 'Unknown';
      }
      
      // Check user's participation in this collab
      const userParticipation = participantsData.find(p => p.collab_id === collab.id);
      
      // Check for participation mode first
      let participationMode = userParticipation?.participation_mode || 'community';
      
      // For backward compatibility, also check is_private
      let isPrivate = participationMode === 'private';
      if (!userParticipation?.participation_mode) {
        // Type-safe comparison for is_private field
        if (typeof collab.is_private === 'boolean') {
          isPrivate = collab.is_private;
        } else if (typeof collab.is_private === 'string') {
          isPrivate = collab.is_private === 'true' || collab.is_private === 't';
        } else if (typeof collab.is_private === 'number') {
          isPrivate = collab.is_private === 1;
        }
        
        // If is_private is true but no participation_mode, assume 'private'
        if (isPrivate) {
          participationMode = 'private';
        }
      }
      
      console.log(`Participation mode: ${participationMode}`);
      console.log(`Is private: ${isPrivate}`);
      
      const formattedCollab = {
        id: collab.id,
        title: collab.title,
        type: collab.type,
        is_private: isPrivate,
        participation_mode: participationMode,
        location: userParticipation?.location || null,
        participants: participants,
        participantCount: participants.length,
        current_phase: collab.current_phase,
        total_phases: collab.total_phases,
        last_active: lastActive
      };
      
      // Add to appropriate array based on participation mode
      if (participationMode === 'private') {
        console.log(`Adding to PRIVATE collabs array`);
        privateCollabs.push(formattedCollab);
      } else if (participationMode === 'local') {
        console.log(`Adding to LOCAL collabs array`);
        localCollabs.push(formattedCollab);
      } else {
        console.log(`Adding to COMMUNITY collabs array`);
        communityCollabs.push(formattedCollab);
      }
    }
    
    console.log("\nFinal counts:");
    console.log("Private collabs:", privateCollabs.length);
    console.log("Local collabs:", localCollabs.length);
    console.log("Community collabs:", communityCollabs.length);
    
    return {
      private: privateCollabs,
      community: communityCollabs,
      local: localCollabs
    };
    
  } catch (error: unknown) {
    console.error("Unexpected error in getUserCollabs:", error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    return { private: [], community: [], local: [] };
  }
}

// Leave a collab by deleting the participant record
export async function leaveCollab(collabId: string) {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }
    
    console.log("Leaving collab:", collabId);
    
    // First, check the schema to see what statuses are allowed
    console.log("Checking for existing participant record");
    const { data: participantData, error: fetchError } = await supabase
      .from('collab_participants')
      .select('id, status')
      .eq('profile_id', user.id)
      .eq('collab_id', collabId)
      .single();
      
    if (fetchError) {
      console.error("Error fetching participant:", fetchError);
      const errorMessage = fetchError.message || String(fetchError);
      return { success: false, error: errorMessage };
    }
    
    if (!participantData) {
      return { success: false, error: "No participant record found" };
    }
    
    // Try to delete the record instead of updating status
    console.log("Deleting participant record:", participantData.id);
    const { error } = await supabase
      .from('collab_participants')
      .delete()
      .eq('id', participantData.id);
      
    if (error) {
      console.error("Error deleting participant:", error);
      // Safe error extraction
      const errorMessage = error.message || String(error);
      return { success: false, error: errorMessage };
    }
    
    console.log("Successfully left collab:", collabId);
    return { success: true };
  } catch (error: unknown) {
    console.error("Error in leaveCollab:", error);
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    } else if (error !== null && error !== undefined) {
      errorMessage = String(error);
    }
    return { success: false, error: errorMessage };
  }
}

// Update the getCollabById function to include participation_mode
export async function getCollabById(collabId: string) {
  const supabase = createClientComponentClient();
  
  try {
    console.log("Fetching collab details for ID:", collabId);
    
    // First, check if the collab exists with a simpler query
    const { data: collabExists, error: existsError } = await supabase
      .from('collabs')
      .select('id, title')
      .eq('id', collabId)
      .single();
      
    if (existsError) {
      console.error("Error checking if collab exists:", existsError);
      return { success: false, error: `Collab not found: ${existsError.message}` };
    }

    if (!collabExists) {
      console.log("No collab found with ID:", collabId);
      return { success: false, error: "Collab not found" };
    }
    
    console.log("Found basic collab info:", collabExists);
    
    // Now fetch the full collab data
    const { data, error } = await supabase
      .from('collabs')
      .select(`
        id,
        title,
        type,
        is_private,
        created_by,
        current_phase,
        total_phases,
        created_at,
        updated_at,
        description,
        prompt_text,
        metadata
      `)
      .eq('id', collabId)
      .single();
      
    if (error) {
      console.error("Error fetching full collab details:", error);
      return { success: false, error: `Failed to fetch details: ${error.message}` };
    }

    if (!data) {
      console.log("No collab data found with ID:", collabId);
      return { success: false, error: "Collab details not found" };
    }
    
    console.log("Full collab data found:", data);
    
    // Get participants for this collab including participation_mode
    const { data: participantsData, error: participantsError } = await supabase
      .from('collab_participants')
      .select(`
        id,
        role,
        profile_id,
        collab_id,
        participation_mode,
        location,
        profiles (
          id,
          first_name,
          last_name
        )
      `)
      .eq('collab_id', collabId);
      
    if (participantsError) {
      console.error("Error fetching participants:", participantsError);
      // Continue anyway, just without participants data
    }
    
    // Format participant data
    const participants = (participantsData || []).map((p: any) => {
      let name = 'Unknown User';
      if (p.profiles) {
        const firstName = p.profiles.first_name || '';
        const lastName = p.profiles.last_name || '';
        name = `${firstName} ${lastName}`.trim();
        if (!name) name = 'User';  // Fallback if both names are empty
      }
      
      return {
        id: p.profile_id,
        name: name,
        role: p.role,
        participation_mode: p.participation_mode || 'community',
        location: p.location
      };
    });
    
    // Determine if collab is private, using the same type-safe approach
    let isPrivate = false;
    if (typeof data.is_private === 'boolean') {
      isPrivate = data.is_private;
    } else if (typeof data.is_private === 'string') {
      isPrivate = data.is_private === 'true' || data.is_private === 't';
    } else if (typeof data.is_private === 'number') {
      isPrivate = data.is_private === 1;
    }

    // Get the last active date
    let lastActive = data.updated_at || data.created_at;
    if (lastActive) {
      const date = new Date(lastActive);
      lastActive = date.toLocaleDateString();
    } else {
      lastActive = 'Unknown';
    }
    
    // Get participation mode from metadata
    const participationMode = data.metadata?.participation_mode || (isPrivate ? 'private' : 'community');
    
    // Create the formatted collab object with all details
    const formattedCollab = {
      id: data.id,
      title: data.title,
      type: data.type || 'theme', // Default to theme if not specified
      is_private: isPrivate,
      participation_mode: participationMode,
      location: data.metadata?.location || null,
      description: data.description || '',
      prompt_text: data.prompt_text || '',
      metadata: data.metadata || {},
      participants: participants,
      participantCount: participants.length,
      current_phase: data.current_phase,
      total_phases: data.total_phases,
      last_active: lastActive,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
    
    console.log("Formatted collab data:", formattedCollab);
    return { success: true, collab: formattedCollab };
    
  } catch (error) {
    console.error("Unexpected error in getCollabById:", error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}