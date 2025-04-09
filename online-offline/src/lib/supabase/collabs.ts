// lib/supabase/collabs.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Define typed participant interface
interface Participant {
  name: string;
  role: string;
}

// Define detailed participant with profile data
interface DetailedParticipant {
  id: string;
  name: string;
  role: string;
  participation_mode: 'community' | 'local' | 'private';
  location: string | null;
}

// Define formatted collaboration interface
interface FormattedCollab {
  id: string;
  title: string;
  type: 'chain' | 'theme' | 'narrative';
  is_private: boolean;
  participation_mode: 'community' | 'local' | 'private';
  location: string | null;
  participants: Participant[];
  participantCount: number;
  current_phase: number | null;
  total_phases: number | null;
  last_active: string;
}

// Define detailed collaboration data interface
interface DetailedCollabData extends FormattedCollab {
  description: string;
  prompt_text: string;
  metadata: Record<string, unknown>;
  participants: DetailedParticipant[];
  created_at: string;
  updated_at: string;
}

// Type for getUserCollabs response
interface UserCollabsResponse {
  private: FormattedCollab[];
  community: FormattedCollab[];
  local: FormattedCollab[];
}

// Type for getCollabById response
interface CollabDetailResponse {
  success: boolean;
  error?: string;
  collab?: DetailedCollabData;
}

// Type for leave collab response
interface LeaveCollabResponse {
  success: boolean;
  error?: string;
}

/**
 * Helper function to extract profile name safely
 * Handles both array and object responses from Supabase
 */
function getNameFromProfile(profile: unknown): string {
  // If profile is null or undefined
  if (!profile) return 'Unknown User';
  
  // If profile is an array
  if (Array.isArray(profile)) {
    if (profile.length === 0) return 'Unknown User';
    
    const first = profile[0]?.first_name || '';
    const last = profile[0]?.last_name || '';
    return `${first} ${last}`.trim() || 'User';
  }
  
  // If profile is a single object
  if (typeof profile === 'object' && profile !== null) {
    const profileObj = profile as Record<string, unknown>;
    const first = (profileObj.first_name as string) || '';
    const last = (profileObj.last_name as string) || '';
    return `${first} ${last}`.trim() || 'User';
  }
  
  return 'Unknown User';
}

// getUserCollabs function with improved private/community/local detection
export async function getUserCollabs(): Promise<UserCollabsResponse> {
  const supabase = createClientComponentClient();
  
  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { private: [], community: [], local: [] };
  }

  try {
    // Fetch all collab participants for the current user
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
      
    if (participantsError || !participantsData || participantsData.length === 0) {
      return { private: [], community: [], local: [] };
    }
    
    // Extract collab IDs from participant records
    const collabIds = participantsData.map(p => p.collab_id);
    
    // Fetch the actual collab data
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
      
    if (collabsError || !collabsData || collabsData.length === 0) {
      return { private: [], community: [], local: [] };
    }
    
    // Now get all participants for these collabs for display
    const { data: allParticipantsData } = await supabase
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
      
    // Initialize arrays for different collab types
    const privateCollabs: FormattedCollab[] = [];
    const communityCollabs: FormattedCollab[] = [];
    const localCollabs: FormattedCollab[] = [];
    
    // Process each collaboration
    for (const collab of collabsData) {
      // Get participants for this collab
      const collabParticipants = allParticipantsData?.filter(p => p.collab_id === collab.id) || [];
      
      // Format participant data
      const participants: Participant[] = collabParticipants.map((p) => {
        return {
          name: getNameFromProfile(p.profiles),
          role: p.role
        };
      });
      
      // Get ISO date string
      let lastActive = collab.updated_at || collab.created_at || '';
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
      let participationMode: 'private' | 'local' | 'community' = userParticipation?.participation_mode as 'private' | 'local' | 'community' || 'community';
      
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
      
      const formattedCollab: FormattedCollab = {
        id: collab.id,
        title: collab.title,
        type: collab.type,
        is_private: isPrivate,
        participation_mode: participationMode,
        location: userParticipation?.location || null,
        participants,
        participantCount: participants.length,
        current_phase: collab.current_phase,
        total_phases: collab.total_phases,
        last_active: lastActive
      };
      
      // Add to appropriate array based on participation mode
      if (participationMode === 'private') {
        privateCollabs.push(formattedCollab);
      } else if (participationMode === 'local') {
        localCollabs.push(formattedCollab);
      } else {
        communityCollabs.push(formattedCollab);
      }
    }
    
    return {
      private: privateCollabs,
      community: communityCollabs,
      local: localCollabs
    };
    
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error in getUserCollabs:", error.message);
    } else {
      console.error("Unknown error in getUserCollabs");
    }
    return { private: [], community: [], local: [] };
  }
}

// Leave a collab by deleting the participant record
export async function leaveCollab(collabId: string): Promise<LeaveCollabResponse> {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }
    
    // First, check for existing participant record
    const { data: participantData, error: fetchError } = await supabase
      .from('collab_participants')
      .select('id, status')
      .eq('profile_id', user.id)
      .eq('collab_id', collabId)
      .single();
      
    if (fetchError) {
      return { success: false, error: fetchError.message || String(fetchError) };
    }
    
    if (!participantData) {
      return { success: false, error: "No participant record found" };
    }
    
    // Delete the record
    const { error } = await supabase
      .from('collab_participants')
      .delete()
      .eq('id', participantData.id);
      
    if (error) {
      return { success: false, error: error.message || String(error) };
    }
    
    return { success: true };
  } catch (error: unknown) {
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

// Get detailed information about a specific collaboration
export async function getCollabById(collabId: string): Promise<CollabDetailResponse> {
  const supabase = createClientComponentClient();
  
  try {
    // First, check if the collab exists with a simpler query
    const { data: collabExists, error: existsError } = await supabase
      .from('collabs')
      .select('id, title')
      .eq('id', collabId)
      .single();
      
    if (existsError || !collabExists) {
      return { success: false, error: "Collaboration not found" };
    }
    
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
      
    if (error || !data) {
      return { success: false, error: "Failed to fetch collaboration details" };
    }
    
    // Get participants for this collab including participation_mode
    const { data: participantsData } = await supabase
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
    
    // Format participant data
    const participants: DetailedParticipant[] = (participantsData || []).map((p) => {
      return {
        id: p.profile_id,
        name: getNameFromProfile(p.profiles),
        role: p.role,
        participation_mode: p.participation_mode as 'community' | 'local' | 'private' || 'community',
        location: p.location || null
      };
    });
    
    // Determine if collab is private
    let isPrivate = false;
    if (typeof data.is_private === 'boolean') {
      isPrivate = data.is_private;
    } else if (typeof data.is_private === 'string') {
      isPrivate = data.is_private === 'true' || data.is_private === 't';
    } else if (typeof data.is_private === 'number') {
      isPrivate = data.is_private === 1;
    }

    // Get the last active date
    let lastActive = data.updated_at || data.created_at || '';
    if (lastActive) {
      const date = new Date(lastActive);
      lastActive = date.toLocaleDateString();
    } else {
      lastActive = 'Unknown';
    }
    
    // Get participation mode from metadata
    const participationMode = (data.metadata?.participation_mode as 'community' | 'local' | 'private') || (isPrivate ? 'private' : 'community');
    
    // Create the formatted collab object with all details
    const formattedCollab: DetailedCollabData = {
      id: data.id,
      title: data.title,
      type: data.type || 'theme', // Default to theme if not specified
      is_private: isPrivate,
      participation_mode: participationMode,
      location: data.metadata?.location || null,
      description: data.description || '',
      prompt_text: data.prompt_text || '',
      metadata: data.metadata || {},
      participants,
      participantCount: participants.length,
      current_phase: data.current_phase,
      total_phases: data.total_phases,
      last_active: lastActive,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
    
    return { success: true, collab: formattedCollab };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}