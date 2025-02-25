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
}

// getUserCollabs function with improved private/community detection
export async function getUserCollabs() {
  const supabase = createClientComponentClient();
  
  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("No authenticated user found");
    return { private: [], community: [] };
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
        profile_id
      `)
      .eq('profile_id', user.id)
      .eq('status', 'active');
      
    if (participantsError) {
      console.error("Error fetching participant data:", participantsError);
      return { private: [], community: [] };
    }
    
    console.log("Participant records found:", participantsData?.length || 0);
    
    if (!participantsData || participantsData.length === 0) {
      console.log("No participant records found for user");
      return { private: [], community: [] };
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
        updated_at
      `)
      .in('id', collabIds);
      
    if (collabsError) {
      console.error("Error fetching collab data:", collabsError);
      return { private: [], community: [] };
    }
    
    console.log("Collabs data found:", collabsData?.length || 0);
    console.log("Detailed collab data:", collabsData);
    
    if (!collabsData || collabsData.length === 0) {
      console.log("No collab records found");
      return { private: [], community: [] };
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
      
      // Check user's role in this collab
      const userParticipation = participantsData.find(p => p.collab_id === collab.id);
      const isOrganizer = userParticipation?.role === 'organizer';
      
      // Determine if collab is private based ONLY on the is_private field
      // Don't force private based on role anymore
      let isPrivate = false;
      
      // Type-safe comparison for is_private field
      if (typeof collab.is_private === 'boolean') {
        isPrivate = collab.is_private;
      } else if (typeof collab.is_private === 'string') {
        isPrivate = collab.is_private === 'true' || collab.is_private === 't';
      } else if (typeof collab.is_private === 'number') {
        isPrivate = collab.is_private === 1;
      }
      
      console.log(`Collab is_private value: ${isPrivate}`);
      console.log(`User is an organizer: ${isOrganizer}`);
      
      const formattedCollab = {
        id: collab.id,
        title: collab.title,
        type: collab.type,
        is_private: isPrivate, // Use our interpreted boolean
        participants: participants,
        participantCount: participants.length,
        current_phase: collab.current_phase,
        total_phases: collab.total_phases,
        last_active: lastActive
      };
      
      if (isPrivate) {
        console.log(`Adding to PRIVATE collabs array`);
        privateCollabs.push(formattedCollab);
      } else {
        console.log(`Adding to COMMUNITY collabs array`);
        communityCollabs.push(formattedCollab);
      }
    }
    
    console.log("\nFinal counts:");
    console.log("Private collabs:", privateCollabs.length);
    console.log("Community collabs:", communityCollabs.length);
    
    return {
      private: privateCollabs,
      community: communityCollabs
    };
    
  } catch (error: unknown) {
    console.error("Unexpected error in getUserCollabs:", error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    return { private: [], community: [] };
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