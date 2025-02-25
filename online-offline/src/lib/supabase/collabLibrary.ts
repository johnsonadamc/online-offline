// lib/supabase/collabLibrary.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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
    // First check if table exists and log debug info
    console.log("Checking for collab_templates table...");
    const { data: tableCheck, error: tableError } = await supabase
      .from('collab_templates')
      .select('count')
      .limit(1);
    
    if (tableError) {
      console.error("Table may not exist:", tableError.message);
      return { chain: [], theme: [], narrative: [] };
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No authenticated user found");
      return { chain: [], theme: [], narrative: [] };
    }
    
    // Get only ACTIVE collab participations for this user
    console.log("Getting user's active collab participations");
    const { data: activeParticipations, error: participationsError } = await supabase
      .from('collab_participants')
      .select(`
        collab_id,
        status
      `)
      .eq('profile_id', user.id);
    
    if (participationsError) {
      console.error("Error fetching participations:", participationsError);
    }
    
    console.log(`Found ${activeParticipations?.length || 0} participations`);
    
    // Fetch collabs for these active participations to get template IDs
    const activeCollabIds = activeParticipations?.filter(p => p.status === 'active').map(p => p.collab_id) || [];
    
    let activeTemplateIds: string[] = [];
    
    if (activeCollabIds.length > 0) {
      console.log("Getting template IDs for active collabs:", activeCollabIds);
      const { data: activeCollabs, error: collabsError } = await supabase
        .from('collabs')
        .select('id, metadata')
        .in('id', activeCollabIds);
        
      if (collabsError) {
        console.error("Error fetching active collabs:", collabsError);
      } else if (activeCollabs) {
        // Extract template_ids from metadata, filtering out undefined values
        activeTemplateIds = activeCollabs
          .map(c => c.metadata?.template_id)
          .filter(id => id !== undefined) as string[];
          
        console.log("Active template IDs:", activeTemplateIds);
      }
    }
    
    // Now get all active collab templates
    console.log("Fetching collabs from collab_templates table...");
    
    const { data, error } = await supabase
      .from('collab_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.log("No data found in collab_templates table");
      return { chain: [], theme: [], narrative: [] };
    }
    
    // Filter out templates where user has active participation
    const filteredData = data.filter(template => !activeTemplateIds.includes(template.id));
    
    console.log("Templates before filtering:", data.length);
    console.log("Templates after filtering out active ones:", filteredData.length);
    
    // Group by type
    const result = {
      chain: filteredData.filter(c => c.type === 'chain'),
      theme: filteredData.filter(c => c.type === 'theme'),
      narrative: filteredData.filter(c => c.type === 'narrative')
    };
    
    return result;
  } catch (error) {
    console.error('Error fetching available collabs:', error);
    return { chain: [], theme: [], narrative: [] };
  }
}

export async function joinCollab(collabTemplateId: string, isPrivate: boolean = false, invitedProfiles: string[] = []) {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');
    
    console.log("Joining collab, template ID:", collabTemplateId);
    console.log("Is private:", isPrivate);
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
          status: 'active'
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
        connection_rules: template.connection_rules || null
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
    
    // Add current user as a participant with correct role based on isPrivate
    const participantData = {
      profile_id: user.id,
      collab_id: collab.id,
      role: isPrivate ? 'organizer' : 'member',
      status: 'active'
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
        status: 'invited'
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