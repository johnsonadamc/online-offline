// lib/supabase/collabLibrary.ts (complete updated file)
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

    // Get templates linked to this period through period_templates junction table
    const { data: periodTemplates, error: templatesError } = await supabase
      .from('period_templates')
      .select('template_id')
      .eq('period_id', activePeriod.id);

    if (templatesError) {
      console.error("Error fetching templates for period:", templatesError);
      return { chain: [], theme: [], narrative: [] };
    }

    // If no templates are assigned to this period, return empty
    if (!periodTemplates || periodTemplates.length === 0) {
      console.log("No templates assigned to the current period");
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
    
    // Get the actual template data directly using the template IDs
    const { data, error } = await supabase
      .from('collab_templates')
      .select('*')
      .in('id', availableTemplateIds);
    
    if (error) {
      console.error("Error fetching templates:", error);
      return { chain: [], theme: [], narrative: [] };
    }
    
    // Group by type with safe defaults
    interface Template {
      id: string;
      name: string;
      display_text: string;
      type: 'chain' | 'theme' | 'narrative' | null;
      [key: string]: any;
    }
    
    const availableTemplates = data as Template[];
    
    // Handle null types by assigning a default based on template name
    const normalizedTemplates = availableTemplates.map(template => {
      if (!template.type) {
        // Assign a type based on template name if possible
        const name = template.name.toLowerCase();
        if (name.includes('chain')) {
          template.type = 'chain';
        } else if (name.includes('theme')) {
          template.type = 'theme';
        } else {
          // Default to narrative if can't determine
          template.type = 'narrative';
        }
      }
      return template;
    });
    
    const result = {
      chain: normalizedTemplates.filter(c => c.type === 'chain'),
      theme: normalizedTemplates.filter(c => c.type === 'theme'),
      narrative: normalizedTemplates.filter(c => c.type === 'narrative' || !c.type)
    };
    
    return result;
  } catch (error) {
    console.error('Error fetching available collabs:', error);
    return { chain: [], theme: [], narrative: [] };
  }
}

// Rest of your file stays the same...
export async function joinCollab(
  collabTemplateId: string, 
  isPrivate: boolean = false, 
  invitedProfiles: string[] = [],
  participationMode: ParticipationMode = 'community'
) {
  // Keep existing implementation
}

export async function getUserCollabs() {
  // Keep existing implementation
}

export async function leaveCollab(collabId: string) {
  // Keep existing implementation
}

// Add new helper function to check and update template types
export async function updateNullTemplateTypes() {
  const supabase = createClientComponentClient();
  
  try {
    // Get templates with null type
    const { data: templatesWithoutType, error: fetchError } = await supabase
      .from('collab_templates')
      .select('*')
      .is('type', null);
    
    if (fetchError) {
      console.error("Error fetching templates without types:", fetchError);
      return { success: false, error: fetchError.message };
    }
    
    if (!templatesWithoutType || templatesWithoutType.length === 0) {
      return { success: true, updated: 0 };
    }
    
    // Update each template with a type
    let updateCount = 0;
    const types = ['chain', 'theme', 'narrative'];
    
    for (const template of templatesWithoutType) {
      // Try to determine type from name or default to random
      let type = types[Math.floor(Math.random() * types.length)];
      const name = template.name.toLowerCase();
      
      if (name.includes('chain')) {
        type = 'chain';
      } else if (name.includes('theme')) {
        type = 'theme';
      } else if (name.includes('narrative') || name.includes('story')) {
        type = 'narrative';
      }
      
      const { error } = await supabase
        .from('collab_templates')
        .update({ type })
        .eq('id', template.id);
      
      if (!error) {
        updateCount++;
      }
    }
    
    return { success: true, updated: updateCount };
  } catch (error) {
    console.error("Error updating template types:", error);
    return { success: false, error };
  }
}