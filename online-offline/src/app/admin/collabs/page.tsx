import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export type ParticipationMode = 'community' | 'local' | 'private';

export interface CollabTemplate {
  id: string;
  name: string;
  display_text: string;
  type: 'chain' | 'theme' | 'narrative';
  participant_count?: number;
  tags?: string[];
  phases?: number;
  duration?: string;
  internal_reference?: any;
  requirements?: any;
  connection_rules?: any;
}

export async function getAvailableCollabs() {
  const supabase = createClientComponentClient();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No authenticated user found");
      return { chain: [], theme: [], narrative: [] };
    }
    
    // Get active period
   
const { data: activePeriod, error: periodError } = await supabase
.from('periods')
.select('id, name, season, year')
.eq('is_active', true)
.order('end_date', { ascending: false })
.limit(1)
.single();

if (periodError) {
console.error("Error fetching active period:", periodError);
return { chain: [], theme: [], narrative: [] };
}

console.log("Active period for templates:", activePeriod);

// Get templates linked to this period
const { data: periodTemplates, error: templatesError } = await supabase
.from('period_templates')
.select('template_id')
.eq('period_id', activePeriod.id);

if (templatesError) {
console.error("Error fetching templates for period:", templatesError);
return { chain: [], theme: [], narrative: [] };
}

console.log(`Found ${periodTemplates?.length || 0} templates for period:`, activePeriod.id);
    
    // Extract template IDs for this period
    const periodTemplateIds = periodTemplates.map(pt => pt.template_id);
    console.log("Templates for this period:", periodTemplateIds);
    
    // Get user's active participations and filter out templates they're already participating in
    const { data: activeParticipations } = await supabase
      .from('collab_participants')
      .select(`
        collab_id,
        status
      `)
      .eq('profile_id', user.id)
      .eq('status', 'active');
    
    const activeCollabIds = activeParticipations?.map(p => p.collab_id) || [];
    let userActiveTemplateIds: string[] = [];
    
    if (activeCollabIds.length > 0) {
      const { data: activeCollabs } = await supabase
        .from('collabs')
        .select('metadata')
        .in('id', activeCollabIds);
        
      if (activeCollabs) {
        userActiveTemplateIds = activeCollabs
          .map(c => {
            if (c && c.metadata && typeof c.metadata === 'object' && 'template_id' in c.metadata) {
              const templateId = c.metadata.template_id;
              if (typeof templateId === 'string') {
                return templateId;
              }
            }
            return null;
          })
          .filter((id): id is string => id !== null);
      }
    }
    
    // Filter out templates the user is already participating in
    const availableTemplateIds = periodTemplateIds.filter(id => 
      !userActiveTemplateIds.includes(id)
    );
    
    // Get the actual template data
    const { data, error } = await supabase
      .from('collab_templates')
      .select('*')
      .in('id', availableTemplateIds)
      .eq('is_active', true);
    
    if (error) {
      console.error("Error fetching templates:", error);
      return { chain: [], theme: [], narrative: [] };
    }
    
    // Group by type
    interface Template {
      id: string;
      name: string;
      display_text: string;
      type: 'chain' | 'theme' | 'narrative';
      [key: string]: any;
    }
    
    const availableTemplates = data as Template[];
    const result = {
      chain: availableTemplates.filter(c => c.type === 'chain'),
      theme: availableTemplates.filter(c => c.type === 'theme'),
      narrative: availableTemplates.filter(c => c.type === 'narrative')
    };
    
    return result;
  } catch (error) {
    console.error('Error fetching available collabs:', error);
    return { chain: [], theme: [], narrative: [] };
  }
}

export async function joinCollab(
  collabTemplateId: string, 
  isPrivate: boolean = false, 
  invitedProfiles: string[] = [],
  participationMode: ParticipationMode = 'community'
) {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');
    
    console.log("Joining collab, template ID:", collabTemplateId);
    console.log("Is private:", isPrivate);
    console.log("Participation mode:", participationMode);
    console.log("Invited profiles:", invitedProfiles);
    
    // Get template info
    const { data: template, error: templateError } = await supabase
      .from('collab_templates')
      .select('*')
      .eq('id', collabTemplateId)
      .single();
    
    console.log("Template data:", template);
    
    if (templateError) {
      console.error("Template error:", templateError.message);
      throw new Error(`Template error: ${templateError.message}`);
    }
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    // For backward compatibility, if participationMode is 'private' ensure isPrivate is true
    // All other modes should set is_private to false
    if (participationMode === 'private') {
      isPrivate = true;
    } else {
      isPrivate = false;
    }
    
    // Check if user already has this collab (might be deleted)
    console.log("Checking for existing collabs with this template");
    const { data: existingCollabs, error: existingError } = await supabase
      .from('collabs')
      .select(`
        id,
        metadata
      `)
      .filter('metadata->template_id', 'eq', collabTemplateId)
      .filter('created_by', 'eq', user.id);
      
    if (existingError) {
      console.error("Error checking existing collabs:", existingError);
    }
    
    // If we found existing collabs with this template
    if (existingCollabs && existingCollabs.length > 0) {
      console.log("Found existing collabs with this template:", existingCollabs);
      
      // Check if user was previously a participant
      const { data: existingParticipations, error: existingPartError } = await supabase
        .from('collab_participants')
        .select('id, collab_id, status')
        .eq('profile_id', user.id)
        .in('collab_id', existingCollabs.map(c => c.id));
        
      if (existingPartError) {
        console.error("Error checking existing participations:", existingPartError);
      }
      
      // If found, just reactivate the latest one
      if (existingParticipations && existingParticipations.length > 0) {
        console.log("Found existing participations:", existingParticipations);
        
        // Just insert a new record - previous one might have been deleted
        const participantData = {
          profile_id: user.id,
          collab_id: existingParticipations[0].collab_id,
          role: isPrivate ? 'organizer' : 'member',
          status: 'active',
          participation_mode: participationMode,
          location: participationMode === 'local' ? "New York" : null
        };
        
        console.log("Re-adding user as participant:", participantData);
        
        const { error: participantError } = await supabase
          .from('collab_participants')
          .insert(participantData);
          
        if (participantError) {
          console.error("Error re-adding participant:", participantError);
          throw new Error(`Error re-adding participant: ${participantError.message}`);
        }
        
        return { success: true, collabId: existingParticipations[0].collab_id };
      }
    }
    
    // Create a new collab
    
    // First, try to directly run a SQL query to see raw database behavior
    console.log("Testing direct SQL insert for private status...");
    try {
      // Using RPC to execute a raw SQL query
      const { data: sqlTestData, error: sqlTestError } = await supabase.rpc(
        'execute_sql',
        {
          sql_query: `
            INSERT INTO public.collabs (title, type, is_private, created_by) 
            VALUES ('SQL TEST PRIVATE COLLAB', '${template.type}', TRUE, '${user.id}')
            RETURNING id, is_private;
          `
        }
      );
      
      // Note: This might fail if your Supabase doesn't have the execute_sql RPC function
      console.log("SQL test result:", sqlTestData);
      console.log("SQL test error:", sqlTestError);
    } catch (sqlError) {
      console.log("SQL test failed (this is expected if RPC not set up):", sqlError);
    }
    
    // Get user's location for local participation mode
    let userLocation = "New York"; // Default to New York for local collabs
    if (participationMode === 'local') {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('city, state, country')
          .eq('id', user.id)
          .single();
          
        if (!profileError && profile && profile.city) {
          userLocation = profile.city;
        }
        // If no city is found in the profile, we'll use the default "New York"
      } catch (locError) {
        console.log("Error getting user location:", locError);
      }
    }
    
    // Log the data we're about to insert
    const collabData = {
      title: template.name,
      description: template.display_text,
      type: template.type,
      // Make sure this is always a boolean TRUE for private collabs
      is_private: isPrivate === true,
      created_by: user.id,
      total_phases: template.phases || null,
      current_phase: 1,
      metadata: {
        template_id: template.id,
        internal_reference: template.internal_reference || null,
        requirements: template.requirements || null,
        connection_rules: template.connection_rules || null,
        participation_mode: participationMode,
        location: participationMode === 'local' ? userLocation : null
      }
    };
    
    console.log("Data to insert into collabs:", collabData);
    console.log("is_private type in insert:", typeof collabData.is_private);
    
    // Create new collab
    const { data: collab, error: collabError } = await supabase
      .from('collabs')
      .insert(collabData)
      .select()
      .single();
    
    if (collabError) {
      console.error("Collab creation error:", collabError.message);
      throw new Error(`Collab creation error: ${collabError.message}`);
    }
    
    console.log("New collab created:", collab);
    console.log("is_private value in created collab:", collab.is_private);
    console.log("is_private type in created collab:", typeof collab.is_private);
    
    // Add current user as a participant with correct role based on participation mode
    const participantData = {
      profile_id: user.id,
      collab_id: collab.id,
      role: participationMode === 'private' ? 'organizer' : 'member',
      status: 'active',
      participation_mode: participationMode,
      location: participationMode === 'local' ? userLocation : null
    };
    
    console.log("Adding current user as participant:", participantData);
    
    const { error: participantError } = await supabase
      .from('collab_participants')
      .insert(participantData);
      
    if (participantError) {
      console.error("Error adding current user as participant:", participantError);
      // Don't throw here - we still created the collab
    }
    
    // If this is a private collab, invite other users
    if (isPrivate && invitedProfiles && invitedProfiles.length > 0) {
      console.log("Adding invited users:", invitedProfiles);
      
      const inviteData = invitedProfiles.map(profileId => ({
        profile_id: profileId,
        collab_id: collab.id,
        role: 'member',
        status: 'invited',
        participation_mode: 'private',
        location: null
      }));
      
      const { error: inviteError } = await supabase
        .from('collab_participants')
        .insert(inviteData);
        
      if (inviteError) {
        console.error("Error inviting users:", inviteError);
        // Don't throw here either - this is a secondary operation
      }
    }
    
    return { success: true, collabId: collab.id };
  } catch (error) {
    // Improved error logging
    console.error('Error joining collab:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    return { success: false, error };
  }
}

export async function getUserCollabs() {
  const supabase = createClientComponentClient();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No authenticated user found");
      return { private: [], community: [], local: [] };
    }
    
    // Use separate queries instead of a join to avoid TypeScript issues
    console.log("Getting user's active collab participations");
    const { data: participations, error: participationsError } = await supabase
      .from('collab_participants')
      .select(`
        id,
        collab_id,
        role,
        status,
        participation_mode,
        location
      `)
      .eq('profile_id', user.id)
      .eq('status', 'active');
    
    if (participationsError) {
      console.error("Error fetching participations:", participationsError);
      return { private: [], community: [], local: [] };
    }
    
    if (!participations || participations.length === 0) {
      console.log("No active participations found");
      return { private: [], community: [], local: [] };
    }
    
    // Get collab IDs
    const collabIds = participations.map(p => p.collab_id);
    
    // Fetch the collabs separately
    const { data: collabsData, error: collabsError } = await supabase
      .from('collabs')
      .select(`
        id,
        title,
        description,
        type,
        is_private,
        current_phase,
        total_phases,
        created_at,
        updated_at,
        metadata
      `)
      .in('id', collabIds);
    
    if (collabsError) {
      console.error("Error fetching collabs:", collabsError);
      return { private: [], community: [], local: [] };
    }
    
    if (!collabsData || collabsData.length === 0) {
      console.log("No collab data found");
      return { private: [], community: [], local: [] };
    }
    
    // Combine the data
    interface CollabData {
      id?: string;
      title?: string;
      description?: string;
      type?: string;
      is_private?: boolean;
      current_phase?: number;
      total_phases?: number | null;
      created_at?: string;
      updated_at?: string;
      metadata?: any;
    }
    
    // Combine the data with proper type safety
    const collabs = participations.map(participation => {
      // Find the matching collab, with defined type
      const collab: CollabData = collabsData.find(c => c.id === participation.collab_id) || {};
      
      // Determine participation mode and private status
      const participationMode = participation.participation_mode || 'community';
      const isPrivate = participationMode === 'private';
      
      // Create proper location with fallback
      const location = participation.location || "New York";
      
      // Build our return object with all proper fallbacks
      return {
        id: participation.collab_id,
        title: typeof collab.title === 'string' ? collab.title : 'Untitled Collab',
        type: typeof collab.type === 'string' ? collab.type : 'theme',
        is_private: isPrivate,
        participation_mode: participationMode,
        location: location,
        participants: isPrivate ? [{ name: 'You', role: participation.role }] : [],
        participantCount: isPrivate ? 0 : 5, // Default to 5 if unknown
        current_phase: typeof collab.current_phase === 'number' ? collab.current_phase : 1,
        total_phases: typeof collab.total_phases === 'number' ? collab.total_phases : null,
        last_active: typeof collab.created_at === 'string' 
          ? new Date(collab.created_at).toLocaleString() 
          : 'Recently'
      };
    });
    
    // Group by participation mode
    const privateCollabs = collabs.filter(c => c.participation_mode === 'private');
    const localCollabs = collabs.filter(c => c.participation_mode === 'local');
    const communityCollabs = collabs.filter(c => c.participation_mode === 'community' || !c.participation_mode);
    
    console.log("Private collabs:", privateCollabs.length);
    console.log("Local collabs:", localCollabs.length);
    console.log("Community collabs:", communityCollabs.length);
    
    return {
      private: privateCollabs,
      community: communityCollabs,
      local: localCollabs
    };
  } catch (error) {
    console.error('Error fetching user collabs:', error);
    return { private: [], community: [], local: [] };
  }
}

export async function leaveCollab(collabId: string) {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');
    
    console.log("Leaving collab:", collabId);
    
    // Get the participant record to delete
    const { data: participant, error: participantError } = await supabase
      .from('collab_participants')
      .select('id, role')
      .eq('collab_id', collabId)
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .single();
      
    if (participantError) {
      console.error("Error finding participant record:", participantError.message);
      return { success: false, error: participantError };
    }
    
    if (!participant) {
      return { success: false, error: 'No active participation found' };
    }
    
    // Delete the participant record
    const { error: deleteError } = await supabase
      .from('collab_participants')
      .delete()
      .eq('id', participant.id);
      
    if (deleteError) {
      console.error("Error deleting participant:", deleteError.message);
      return { success: false, error: deleteError };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error leaving collab:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    return { success: false, error };
  }
}