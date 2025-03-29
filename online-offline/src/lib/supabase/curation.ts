// src/lib/supabase/curation.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Type definitions
interface Period {
  id: string;
  name: string;
  season: string;
  year: number;
  end_date: string;
  is_active: boolean;
}

interface Creator {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  bio: string;
  creatorType: string;
  contentType: string;
  tags: string[];
  lastPost: string;
  avatar: string;
  previousQuarter: boolean;
  icon: string;
  isPrivate?: boolean;
}

interface Ad {
  id: string;
  name: string;
  bio: string;
  lastPost: string;
  avatar: string;
  type: 'ad';
  discount: number;
}

interface Collaboration {
  id: string;
  title: string;
  type?: 'chain' | 'theme' | 'narrative';
  participation_mode: 'private' | 'local' | 'community';
  participant_count: number;
  location?: string | null;
  description?: string;
  is_joined?: boolean;
}

interface Communication {
  id: string;
  subject: string;
  sender_id: string;
  is_selected?: boolean;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface CollabTemplate {
  id: string;
  name: string; // Changed from title to match actual schema
  type: 'chain' | 'theme' | 'narrative';
  instructions?: string;
  display_text?: string;
  requirements?: string;
  internal_reference?: any;
  connection_rules?: any;
}

interface CuratorSelections {
  selectedCreators: string[];
  selectedAds: string[];
  selectedCollabs: string[];
  includeCommunications: boolean;
}

interface SaveSelectionsParams {
  curator_id: string;
  period_id: string;
  selected_contributors: string[];
  selected_collaborations: string[];
  selected_communications: string[];
  selected_ads: string[];
}

interface CurationResult {
  success: boolean;
  error?: string;
  period?: Period;
  creators?: Creator[];
  ads?: Ad[];
  joinedCollabs?: Collaboration[];
  availableCollabs?: Collaboration[];
  communications?: Communication[];
  selections?: CuratorSelections;
}

interface TemplatesResult {
  success: boolean;
  error?: string;
  templates?: CollabTemplate[];
}

/**
 * Get all curation data for the current period
 */
export async function getCurationData(): Promise<CurationResult> {
  const supabase = createClientComponentClient();
  
  try {
    console.log("Starting getCurationData");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Get current period
    const { data: periodData, error: periodError } = await supabase
      .from('periods')
      .select('*')
      .eq('is_active', true)
      .single();
      
    if (periodError) {
      console.error("Error fetching period:", periodError);
      return { success: false, error: periodError.message || "Failed to fetch period" };
    }
    
    if (!periodData) {
      console.error("No active period found");
      return { success: false, error: "No active period found" };
    }
    
    console.log("Found active period:", periodData.id);
    
    // STEP 1: Get creators
    let creators: Creator[] = [];
    
    try {
      console.log("Fetching creators for period:", periodData.id);
      
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('content')
        .select(`
          id,
          creator_id,
          type,
          status,
          profiles:creator_id (
            id,
            first_name, 
            last_name,
            avatar_url,
            is_public,
            bio
          ),
          content_entries (
            id,
            title,
            caption,
            media_url,
            tags:content_tags (
              tag
            )
          )
        `)
        .eq('period_id', periodData.id)
        .eq('status', 'published');
        
      if (creatorsError) {
        console.error("Error fetching creators:", creatorsError);
        // Continue with empty array
      } else if (creatorsData) {
        // Format creator data
        creators = creatorsData.map(content => {
          const profile = content.profiles || {};
          // Check if profile is an array or object and handle accordingly
          const profileData = Array.isArray(profile) ? profile[0] || {} : profile;
          
          return {
            id: content.creator_id || '',
            name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Unnamed Creator',
            firstName: profileData.first_name || '',
            lastName: profileData.last_name || '',
            bio: profileData.bio || "",
            creatorType: getCreatorType(content.type || ''),
            contentType: content.type || '',
            tags: Array.isArray(content.content_entries) 
              ? content.content_entries.flatMap(entry => 
                  Array.isArray(entry.tags) 
                    ? entry.tags.map((t: any) => t.tag || '')
                    : []
                ).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
              : [],
            lastPost: Array.isArray(content.content_entries) && content.content_entries.length > 0
              ? content.content_entries[0].title || ""
              : "",
            avatar: profileData.avatar_url || `/api/placeholder/400/400?text=${profileData.first_name?.charAt(0) || ''}${profileData.last_name?.charAt(0) || ''}`,
            previousQuarter: false, // You'd need to check if they were in previous period
            icon: getIconForContentType(content.type || ''),
            isPrivate: profileData.is_public === false
          };
        });
      }
    } catch (creatorError) {
      console.error("Unexpected error fetching creators:", creatorError);
      // Continue with empty array
    }
    
    // STEP 2: Get campaigns (ads)
    let ads: Ad[] = [];
    
    try {
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('period_id', periodData.id)
        .eq('is_active', true);
        
      if (campaignsError) {
        console.error("Error fetching campaigns:", campaignsError);
        // Continue with empty array
      } else if (campaigns) {
        // Format campaigns data
        ads = campaigns.map(campaign => ({
          id: campaign.id || '',
          name: campaign.name || '',
          bio: campaign.bio || '',
          lastPost: campaign.last_post || '',
          avatar: campaign.avatar_url || `/api/placeholder/400/400?text=${campaign.name?.substring(0, 2).toUpperCase() || 'AD'}`,
          type: 'ad',
          discount: typeof campaign.discount === 'number' ? campaign.discount : 2
        }));
      }
    } catch (campaignsError) {
      console.error("Unexpected error fetching campaigns:", campaignsError);
      // Continue with empty array
    }
    
    // STEP 3: Get user's joined collaborations
    let formattedJoinedCollabs: Collaboration[] = [];
    
    try {
      // First, get the collab IDs the user has joined
      const { data: participantData, error: participantError } = await supabase
        .from('collab_participants')
        .select(`
          collab_id,
          participation_mode,
          location
        `)
        .eq('profile_id', user.id)
        .eq('status', 'active');
        
      if (participantError) {
        console.error("Error fetching participant data:", participantError);
        // Continue with empty array
      } else if (participantData && participantData.length > 0) {
        const collabIds = participantData.map(p => p.collab_id);
        
        // Now get the actual collab details
        const { data: collabsData, error: collabsError } = await supabase
          .from('collabs')
          .select(`
            id,
            title,
            description,
            type,
            is_private,
            metadata,
            template_id
          `)
          .in('id', collabIds);
          
        if (collabsError) {
          console.error("Error fetching collaborations:", collabsError);
          // Continue with empty array
        } else if (collabsData && collabsData.length > 0) {
          // Format joined collabs data
          formattedJoinedCollabs = collabsData.map(collab => {
            // Find the participant record that matches this collab
            const participantRecord = participantData.find(p => p.collab_id === collab.id);
            
            // Determine participation mode
            let participationMode: 'private' | 'local' | 'community';
            if (participantRecord?.participation_mode) {
              participationMode = participantRecord.participation_mode as 'private' | 'local' | 'community';
            } else if (collab.is_private) {
              participationMode = 'private';
            } else {
              participationMode = 'community';
            }
            
            // Get description from metadata or from description field
            const description = collab.metadata?.description || collab.description || '';
            
            return {
              id: collab.id,
              title: collab.title || '',
              type: collab.type as 'chain' | 'theme' | 'narrative',
              participation_mode: participationMode,
              participant_count: 0, // Will be updated below
              location: participantRecord?.location || null,
              description: description,
              is_joined: true
            };
          });
          
          // Get participant counts for each collab
          for (const collab of formattedJoinedCollabs) {
            if (!collab.id) continue;
            
            try {
              const { count, error: countError } = await supabase
                .from('collab_participants')
                .select('*', { count: 'exact', head: true })
                .eq('collab_id', collab.id)
                .eq('status', 'active');
                
              if (!countError && count !== null) {
                collab.participant_count = count;
              }
            } catch (countError) {
              console.error(`Error counting participants for collab ${collab.id}:`, countError);
              // Continue with default count (0)
            }
          }
        }
      }
    } catch (collabsError) {
      console.error("Unexpected error fetching collaborations:", collabsError);
      // Continue with empty array
    }
    
    // STEP 4: Get available (community and local) collaborations for the period
    // Note: Since your schema doesn't have period_id on collabs, we'll skip period filtering
    let formattedAvailableCollabs: Collaboration[] = [];
    
    try {
      // Get all community and local collaborations
      const { data: availableCollabsData, error: availableCollabsError } = await supabase
        .from('collabs')
        .select('*')
        .in('participation_mode', ['community', 'local']);
        
      if (availableCollabsError) {
        console.error("Error fetching available collaborations:", availableCollabsError);
        // Continue with empty array
      } else if (availableCollabsData && availableCollabsData.length > 0) {
        // Format available collabs data, filtering out ones the user has already joined
        formattedAvailableCollabs = availableCollabsData
          .filter(collab => !formattedJoinedCollabs.some(joined => joined.id === collab.id))
          .map(collab => {
            const description = collab.metadata?.description || collab.description || '';
            
            return {
              id: collab.id || '',
              title: collab.title || '',
              type: collab.type as 'chain' | 'theme' | 'narrative' || 'chain',
              participation_mode: collab.participation_mode as 'private' | 'local' | 'community' || 'community',
              participant_count: 0, // Will be updated below
              location: collab.location || null,
              description: description,
              is_joined: false
            };
          });
        
        // Get participant counts for these collabs too
        for (const collab of formattedAvailableCollabs) {
          if (!collab.id) continue;
          
          try {
            const { count, error: countError } = await supabase
              .from('collab_participants')
              .select('*', { count: 'exact', head: true })
              .eq('collab_id', collab.id)
              .eq('status', 'active');
              
            if (!countError && count !== null) {
              collab.participant_count = count;
            }
          } catch (countError) {
            console.error(`Error counting participants for collab ${collab.id}:`, countError);
            // Continue with default count (0)
          }
        }
      }
    } catch (availableCollabsError) {
      console.error("Unexpected error fetching available collaborations:", availableCollabsError);
      // Continue with empty array
    }
    // STEP 5: Get communications for the period
    let communications: Communication[] = [];
    
    try {
      const { data: commsData, error: commsError } = await supabase
        .from('communications')
        .select(`
          id,
          sender_id,
          subject,
          profiles:sender_id (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('recipient_id', user.id)
        .eq('period_id', periodData.id)
        .eq('status', 'submitted');
        
      if (commsError) {
        console.error("Error fetching communications:", commsError);
        // Continue with empty array
      } else if (commsData && commsData.length > 0) {
        // Format communications data
        communications = commsData.map(comm => {
          const profileData = comm.profiles || {};
          const profile = Array.isArray(profileData) ? profileData[0] || {} : profileData;
          
          return {
            id: comm.id || '',
            sender_id: comm.sender_id || '',
            subject: comm.subject || '',
            profiles: {
              first_name: profile.first_name || '',
              last_name: profile.last_name || '',
              avatar_url: profile.avatar_url
            }
          };
        });
      }
    } catch (commsError) {
      console.error("Unexpected error fetching communications:", commsError);
      // Continue with empty array
    }
    
    // STEP 6: Get existing selections from all selection tables
    let selectedCreators: string[] = [];
    let selectedAds: string[] = [];
    let selectedCollabs: string[] = [];
    let includeCommunications = false;
    
    try {
      const [creatorSelections, campaignSelections, collabSelections, commSettings] = await Promise.all([
        // Get creator selections
        supabase
          .from('curator_creator_selections')
          .select('creator_id')
          .eq('curator_id', user.id)
          .eq('period_id', periodData.id),
          
        // Get campaign selections
        supabase
          .from('curator_campaign_selections')
          .select('campaign_id')
          .eq('curator_id', user.id)
          .eq('period_id', periodData.id),
          
        // Get collab selections
        supabase
          .from('curator_collab_selections')
          .select('collab_id, source_id')
          .eq('curator_id', user.id)
          .eq('period_id', periodData.id),
          
        // Get communication settings
        supabase
          .from('curator_communication_selections')
          .select('include_communications')
          .eq('curator_id', user.id)
          .eq('period_id', periodData.id)
          .single()
      ]);
      
      // Extract the selection ids with safety checks
      if (creatorSelections.data) {
        selectedCreators = creatorSelections.data
          .map(s => s.creator_id)
          .filter(Boolean);
      }
      
      if (campaignSelections.data) {
        selectedAds = campaignSelections.data
          .map(s => s.campaign_id)
          .filter(Boolean);
      }
      
      if (collabSelections.data) {
        // Use source_id if available, otherwise use collab_id
        selectedCollabs = collabSelections.data
          .map(s => s.source_id || s.collab_id)
          .filter(Boolean);
      }
      
      includeCommunications = commSettings.data?.include_communications || false;
      
    } catch (selectionsError) {
      console.error("Error fetching selections:", selectionsError);
      // Continue with empty arrays
    }
    
    return { 
      success: true,
      period: periodData as Period,
      creators,
      ads,
      joinedCollabs: formattedJoinedCollabs,
      availableCollabs: formattedAvailableCollabs,
      communications,
      selections: {
        selectedCreators,
        selectedAds,
        selectedCollabs,
        includeCommunications
      }
    };
    
  } catch (error) {
    console.error("Error getting curation data:", error);
    return { success: false, error: "Failed to load curation data" };
  }
}

/**
 * Convert content type to creator type
 */
function getCreatorType(contentType: string): string {
  const types: Record<string, string> = {
    'photo': 'Photographer',
    'art': 'Artist',
    'poetry': 'Poet',
    'essay': 'Writer',
    'music': 'Musician'
  };
  
  return types[contentType] || 'Creator';
}

/**
 * Get the icon name for a content type
 */
function getIconForContentType(contentType: string): string {
  const icons: Record<string, string> = {
    'photo': 'Camera',
    'art': 'Palette',
    'poetry': 'Pen',
    'essay': 'BookOpen',
    'music': 'Music'
  };
  
  return icons[contentType] || 'Camera';
}

/**
 * Get available collaboration templates
 */
export async function getAvailableCollabTemplates(periodId: string): Promise<TemplatesResult> {
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

    // Extract the templates from the nested structure and flatten if needed
    let templates: CollabTemplate[] = [];
    
    if (data) {
      // First extract the templates
      const extractedTemplates = data.map(item => item.collab_templates);
      
      // Process each template to ensure it matches our interface
      extractedTemplates.forEach(template => {
        if (template) {
          // Handle if it's an array or single object
          const templateItems = Array.isArray(template) ? template : [template];
          
          templateItems.forEach(item => {
            if (item) {
              templates.push({
                id: item.id || '',
                name: item.name || '', // Changed from title to name
                type: (item.type as 'chain' | 'theme' | 'narrative') || 'chain',
                instructions: item.instructions,
                display_text: item.display_text,
                requirements: item.requirements,
                internal_reference: item.internal_reference,
                connection_rules: item.connection_rules
              });
            }
          });
        }
      });
    }
    
    return { success: true, templates };
  } catch (error) {
    console.error("Error in getAvailableCollabTemplates:", error);
    return { success: false, error: "Failed to load collaboration templates" };
  }
}

/**
 * Get available community and local collaborations for the period
 */
export async function getAvailableCollaborations(periodId: string): Promise<{ success: boolean; error?: string; collaborations?: Collaboration[] }> {
  const supabase = createClientComponentClient();
  
  try {
    // Get user for checking joins
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // First get the user's joined collaborations to filter them out
    const { data: joinedData, error: joinedError } = await supabase
      .from('collab_participants')
      .select('collab_id')
      .eq('profile_id', user.id)
      .eq('status', 'active');
      
    if (joinedError) {
      console.error("Error fetching joined collaborations:", joinedError);
      return { success: false, error: joinedError.message };
    }
    
    const joinedIds = joinedData?.map(item => item.collab_id) || [];
    
    // Fetch collaborations that are either community or local and not joined by the user
    // Note: Removed period_id filter as it's not in your schema
    const { data, error } = await supabase
      .from('collabs')
      .select('*')
      .in('participation_mode', ['community', 'local']);
      
    if (error) {
      console.error("Error fetching available collaborations:", error);
      return { success: false, error: error.message };
    }
    
    const collaborations: Collaboration[] = (data || [])
      .filter(collab => !joinedIds.includes(collab.id))
      .map(collab => {
        const description = collab.metadata?.description || collab.description || '';
        
        return {
          id: collab.id || '',
          title: collab.title || '',
          type: collab.type as 'chain' | 'theme' | 'narrative' || 'chain',
          participation_mode: collab.participation_mode as 'private' | 'local' | 'community' || 'community',
          participant_count: 0, // This will be updated separately
          location: collab.location,
          description: description,
          is_joined: false
        };
      });
    
    // Get participant counts for each collaboration
    if (collaborations.length > 0) {
      for (const collab of collaborations) {
        if (!collab.id) continue;
        
        const { count, error: countError } = await supabase
          .from('collab_participants')
          .select('*', { count: 'exact', head: true })
          .eq('collab_id', collab.id)
          .eq('status', 'active');
          
        if (!countError && count !== null) {
          collab.participant_count = count;
        }
      }
    }
    
    return { success: true, collaborations };
  } catch (error) {
    console.error("Error getting available collaborations:", error);
    return { success: false, error: "Failed to fetch available collaborations" };
  }
}

/**
 * Save all curation selections to the database
 */
export async function saveCuratorSelections({
  curator_id,
  period_id,
  selected_contributors,
  selected_collaborations,
  selected_communications,
  selected_ads
}: {
  curator_id: string;
  period_id: string;
  selected_contributors: string[];
  selected_collaborations: string[];
  selected_communications: string[];
  selected_ads: string[];
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientComponentClient();
  
  try {
    console.log("Starting to save selections with:", {
      curator_id,
      period_id,
      collabs_count: selected_collaborations.length,
      contributors_count: selected_contributors.length,
      comms_count: selected_communications.length,
      ads_count: selected_ads.length
    });

    console.log("Selected collaborations:", selected_collaborations);
    const localCollabs = selected_collaborations.filter(id => id.startsWith('local_'));
    console.log("Local collaboration IDs:", localCollabs);

    // Create a map to store real IDs and their virtual sources to avoid conflicts
    // This helps track where each selection came from (community vs local)
    interface CollabSelection {
      collab_id: string;
      source_id: string; // Original virtual ID or real ID
      participation_mode: 'community' | 'local' | 'private';
      location?: string;
    }
    
    const collaborationSelections: CollabSelection[] = [];
    
    // Process virtual collaboration IDs first
    for (const id of selected_collaborations) {
      try {
        if (id.startsWith('community_')) {
          // Community collaboration - extract template ID
          const templateId = id.replace('community_', '');
          console.log(`Processing community virtual ID for template: ${templateId}`);
          
          // Check if a community collab for this template already exists
          try {
            const { data: existingCollab, error: findError } = await supabase
              .from('collabs')
              .select('id')
              .eq('template_id', templateId)
              .eq('participation_mode', 'community')
              .maybeSingle();
              
            if (findError) {
              const errorMsg = findError.message || JSON.stringify(findError);
              console.error(`Error finding community collab for template ${templateId}:`, errorMsg);
            }
            
            if (existingCollab) {
              // Use existing collaboration
              console.log(`Using existing community collab: ${existingCollab.id} for template ${templateId}`);
              collaborationSelections.push({
                collab_id: existingCollab.id,
                source_id: id, // Keep track of original virtual ID
                participation_mode: 'community'
              });
            } else {
              console.log(`No existing community collab found for template ${templateId}, will create new one`);
              
              // Need to create a new community collaboration
              // First get template details
              const { data: template, error: templateError } = await supabase
                .from('collab_templates')
                .select('id, name, type')
                .eq('id', templateId)
                .maybeSingle();
                
              if (templateError) {
                const errorMsg = templateError.message || JSON.stringify(templateError);
                console.error(`Error fetching template ${templateId}:`, errorMsg);
                continue;
              }
              
              if (!template) {
                console.error(`Template ${templateId} not found in database`);
                continue;
              }
              
              console.log(`Found template details:`, template);
              
              // Validate template data
              const title = template.name || 'Untitled Collaboration';
              const type = template.type || 'chain';
              
              // Create new community collaboration
              const newCollabData = {
                title: title,
                type: type,
                participation_mode: 'community',
                template_id: templateId,
                period_id: period_id,
                created_at: new Date().toISOString()
              };
              
              console.log(`Attempting to create community collab with data:`, newCollabData);
              
              try {
                const { data: newCollab, error: createError } = await supabase
                  .from('collabs')
                  .insert(newCollabData)
                  .select('id')
                  .single();
                  
                if (createError) {
                  const errorMsg = createError.message || JSON.stringify(createError);
                  console.error(`Error creating community collab for template ${templateId}:`, errorMsg);
                  continue;
                }
                
                if (newCollab) {
                  console.log(`Successfully created new community collab: ${newCollab.id}`);
                  collaborationSelections.push({
                    collab_id: newCollab.id,
                    source_id: id, // Keep track of original virtual ID
                    participation_mode: 'community'
                  });
                } else {
                  console.error(`Failed to create community collab: no data returned`);
                }
              } catch (innerError) {
                console.error(`Exception creating community collab:`, innerError);
              }
            }
          } catch (findCollabError) {
            console.error(`Exception finding community collab:`, findCollabError);
          }
        } else if (id.startsWith('local_')) {
          console.log("Processing local ID:", id);
          
          const parts = id.split('_');
          console.log("  Parts:", parts);
          
          if (parts.length < 3) {
            console.error(`Invalid local collab ID format: ${id}`);
            continue;
          }
          
          const templateId = parts[1];
          const cityEncoded = parts.slice(2).join('_');
          const city = cityEncoded.replace(/_/g, ' ');
          
          console.log("  Template ID:", templateId);
          console.log("  City (encoded):", cityEncoded);
          console.log("  City (decoded):", city);
          
          console.log(`Processing local virtual ID for template: ${templateId}, city: ${city}`);
          
          // Check if a local collab for this template and city already exists
          try {
            const { data: existingCollab, error: findError } = await supabase
              .from('collabs')
              .select('id')
              .eq('template_id', templateId)
              .eq('participation_mode', 'local')
              .eq('location', city)
              .maybeSingle();
              
            if (findError) {
              const errorMsg = findError.message || JSON.stringify(findError);
              console.error(`Error finding local collab for template ${templateId}, city ${city}:`, errorMsg);
            }
            
            if (existingCollab) {
              // Use existing collaboration
              console.log(`Using existing local collab: ${existingCollab.id} for template ${templateId}, city ${city}`);
              collaborationSelections.push({
                collab_id: existingCollab.id,
                source_id: id, // Keep track of original virtual ID
                participation_mode: 'local',
                location: city
              });
            } else {
              console.log(`No existing local collab found for template ${templateId}, city ${city}, will create new one`);
              
              // Need to create a new local collaboration
              // First get template details
              const { data: template, error: templateError } = await supabase
                .from('collab_templates')
                .select('id, name, type')
                .eq('id', templateId)
                .maybeSingle();
                
              if (templateError) {
                const errorMsg = templateError.message || JSON.stringify(templateError);
                console.error(`Error fetching template ${templateId}:`, errorMsg);
                continue;
              }
              
              if (!template) {
                console.error(`Template ${templateId} not found in database`);
                continue;
              }
              
              console.log(`Found template details:`, template);
              
              // Validate template data
              const title = template.name || 'Untitled Collaboration';
              const type = template.type || 'chain';
              
              // Create new local collaboration
              const newCollabData = {
                title: `${title} - ${city}`,
                type: type,
                participation_mode: 'local',
                location: city,
                template_id: templateId,
                period_id: period_id,
                created_at: new Date().toISOString()
              };
              
              console.log(`Attempting to create local collab with data:`, newCollabData);
              
              try {
                const { data: newCollab, error: createError } = await supabase
                  .from('collabs')
                  .insert(newCollabData)
                  .select('id')
                  .single();
                  
                if (createError) {
                  const errorMsg = createError.message || JSON.stringify(createError);
                  console.error(`Error creating local collab for template ${templateId}, city ${city}:`, errorMsg);
                  continue;
                }
                
                if (newCollab) {
                  console.log(`Successfully created new local collab: ${newCollab.id}`);
                  collaborationSelections.push({
                    collab_id: newCollab.id,
                    source_id: id, // Keep track of original virtual ID
                    participation_mode: 'local',
                    location: city
                  });
                } else {
                  console.error(`Failed to create local collab: no data returned`);
                }
              } catch (innerError) {
                console.error(`Exception creating local collab:`, innerError);
              }
            }
          } catch (findCollabError) {
            console.error(`Exception finding local collab:`, findCollabError);
          }
        } else {
          // Regular collab ID - add directly
          console.log(`Adding regular collab ID: ${id}`);
          
          // For direct IDs, we need to determine their participation mode
          try {
            const { data: collab, error: collabError } = await supabase
              .from('collabs')
              .select('id, participation_mode, location')
              .eq('id', id)
              .maybeSingle();
              
            if (collabError) {
              console.error(`Error fetching collab info for ${id}:`, collabError);
              // Default to adding without mode info
              collaborationSelections.push({
                collab_id: id,
                source_id: id,
                participation_mode: 'community' // Default assumption
              });
              continue;
            }
            
            if (collab) {
              // Use real participation mode info
              collaborationSelections.push({
                collab_id: id,
                source_id: id,
                participation_mode: collab.participation_mode as 'community' | 'local' | 'private',
                location: collab.location
              });
            } else {
              console.error(`Collab with ID ${id} not found in database`);
              // Add anyway with default info
              collaborationSelections.push({
                collab_id: id,
                source_id: id,
                participation_mode: 'community' // Default assumption
              });
            }
          } catch (error) {
            console.error(`Exception fetching collab info:`, error);
            // Add anyway with default info
            collaborationSelections.push({
              collab_id: id,
              source_id: id,
              participation_mode: 'community' // Default assumption
            });
          }
        }
      } catch (processError) {
        console.error(`Error processing collaboration ID ${id}:`, processError);
      }
    }
    
    console.log(`Processed all collaborative selections, total selections: ${collaborationSelections.length}`);
    
    // Now continue with saving using the collaboration selections
    
    // 1. Save creator selections
    // First delete existing selections
    try {
      const { error: deleteCreatorError } = await supabase
        .from('curator_creator_selections')
        .delete()
        .eq('curator_id', curator_id)
        .eq('period_id', period_id);
        
      if (deleteCreatorError) {
        const errorMsg = deleteCreatorError.message || JSON.stringify(deleteCreatorError);
        console.error(`Error deleting existing creator selections:`, errorMsg);
        return { success: false, error: errorMsg };
      }
      
      console.log(`Successfully deleted existing creator selections`);
      
      // Then add new selections
      if (selected_contributors.length > 0) {
        const creatorSelections = selected_contributors.map(creatorId => ({
          curator_id,
          creator_id: creatorId,
          period_id,
          selected_at: new Date().toISOString()
        }));
        
        console.log(`Inserting ${creatorSelections.length} creator selections`);
        
        const { error: insertCreatorError } = await supabase
          .from('curator_creator_selections')
          .insert(creatorSelections);
          
        if (insertCreatorError) {
          const errorMsg = insertCreatorError.message || JSON.stringify(insertCreatorError);
          console.error(`Error inserting creator selections:`, errorMsg);
          return { success: false, error: errorMsg };
        }
        
        console.log(`Successfully inserted creator selections`);
      } else {
        console.log(`No creator selections to insert`);
      }
    } catch (creatorError) {
      console.error(`Exception during creator selections:`, creatorError);
      return { success: false, error: String(creatorError) };
    }
    
    // 2. Save campaign (ad) selections
    try {
      const { error: deleteCampaignError } = await supabase
        .from('curator_campaign_selections')
        .delete()
        .eq('curator_id', curator_id)
        .eq('period_id', period_id);
        
      if (deleteCampaignError) {
        const errorMsg = deleteCampaignError.message || JSON.stringify(deleteCampaignError);
        console.error(`Error deleting existing campaign selections:`, errorMsg);
        return { success: false, error: errorMsg };
      }
      
      console.log(`Successfully deleted existing campaign selections`);
      
      if (selected_ads.length > 0) {
        const campaignSelections = selected_ads.map(campaignId => ({
          curator_id,
          campaign_id: campaignId,
          period_id,
          selected_at: new Date().toISOString()
        }));
        
        console.log(`Inserting ${campaignSelections.length} campaign selections`);
        
        const { error: insertCampaignError } = await supabase
          .from('curator_campaign_selections')
          .insert(campaignSelections);
          
        if (insertCampaignError) {
          const errorMsg = insertCampaignError.message || JSON.stringify(insertCampaignError);
          console.error(`Error inserting campaign selections:`, errorMsg);
          return { success: false, error: errorMsg };
        }
        
        console.log(`Successfully inserted campaign selections`);
      } else {
        console.log(`No campaign selections to insert`);
      }
    } catch (campaignError) {
      console.error(`Exception during campaign selections:`, campaignError);
      return { success: false, error: String(campaignError) };
    }
    
    // 3. Save collaboration selections - MODIFIED APPROACH
    try {
      // First completely delete all existing collab selections
      const { error: deleteCollabError } = await supabase
        .from('curator_collab_selections')
        .delete()
        .eq('curator_id', curator_id)
        .eq('period_id', period_id);
        
      if (deleteCollabError) {
        const errorMsg = deleteCollabError.message || JSON.stringify(deleteCollabError);
        console.error(`Error deleting collab selections:`, errorMsg);
        return { success: false, error: errorMsg };
      }
      
      console.log(`Successfully deleted existing collab selections`);
      
      if (collaborationSelections.length > 0) {
        // First verify no duplicates on exact virtual ID + template ID combinations
        // This creates a unique "key" for each selection based on its source
        const keyMap = new Map<string, boolean>();
        const uniqueSelections = collaborationSelections.filter(selection => {
          const key = `${selection.source_id}`;
          if (keyMap.has(key)) {
            console.log(`Skipping duplicate selection for source: ${key}`);
            return false;
          }
          keyMap.set(key, true);
          return true;
        });
        
        console.log(`Filtered ${collaborationSelections.length} selections to ${uniqueSelections.length} unique ones`);

        // Insert selections ONE BY ONE to avoid the conflict error
        // This is more robust than bulk insert with upsert
        let insertSuccessCount = 0;
        for (const selection of uniqueSelections) {
          try {
            const insertData = {
              curator_id,
              collab_id: selection.collab_id,
              period_id,
              participation_mode: selection.participation_mode,
              location: selection.location,
              source_id: selection.source_id,
              selected_at: new Date().toISOString()
            };
            
            const { error: insertError } = await supabase
              .from('curator_collab_selections')
              .insert(insertData);
              
            if (insertError) {
              console.error(`Error inserting collab selection for ${selection.collab_id}:`, insertError);
              // Continue with other insertions despite this error
            } else {
              insertSuccessCount++;
            }
          } catch (individualInsertError) {
            console.error(`Exception during individual collab selection insert:`, individualInsertError);
            // Continue with other insertions
          }
        }
        
        console.log(`Successfully inserted ${insertSuccessCount} out of ${uniqueSelections.length} collab selections`);
        
        if (insertSuccessCount === 0 && uniqueSelections.length > 0) {
          // All inserts failed, try fallback approach with simpler data
          console.log(`All inserts failed, trying fallback approach...`);
          
          try {
            const simpleSelections = uniqueSelections.map(selection => ({
              curator_id,
              collab_id: selection.collab_id,
              period_id,
              source_id: selection.source_id,
              selected_at: new Date().toISOString()
            }));
            
            // Try inserting with simplified data
            const { error: batchInsertError } = await supabase
              .from('curator_collab_selections')
              .insert(simpleSelections);
              
            if (batchInsertError) {
              console.error(`Error in fallback batch insert:`, batchInsertError);
              return { success: false, error: `Failed to save collaboration selections: ${batchInsertError.message}` };
            } else {
              console.log(`Fallback batch insert succeeded`);
            }
          } catch (fallbackError) {
            console.error(`Exception during fallback insert:`, fallbackError);
            return { success: false, error: `Failed to save collaboration selections: ${String(fallbackError)}` };
          }
        }
      } else {
        console.log(`No collab selections to insert`);
      }
    } catch (collabError) {
      console.error(`Exception during collab selections:`, collabError);
      return { success: false, error: String(collabError) };
    }
    
    // 4. Save communications selections
    try {
      const { error: deleteCommsError } = await supabase
        .from('curator_communication_selections')
        .delete()
        .eq('curator_id', curator_id)
        .eq('period_id', period_id);
        
      if (deleteCommsError) {
        const errorMsg = deleteCommsError.message || JSON.stringify(deleteCommsError);
        console.error(`Error deleting comm settings:`, errorMsg);
        return { success: false, error: errorMsg };
      }
      
      console.log(`Successfully deleted existing communication selections`);
      
      // Insert new settings if communications are selected
      const { error: insertCommsError } = await supabase
        .from('curator_communication_selections')
        .insert({
          curator_id,
          period_id,
          include_communications: selected_communications.length > 0,
          selected_at: new Date().toISOString()
        });
        
      if (insertCommsError) {
        const errorMsg = insertCommsError.message || JSON.stringify(insertCommsError);
        console.error(`Error inserting comm settings:`, errorMsg);
        return { success: false, error: errorMsg };
      }
      
      console.log(`Successfully inserted communication selections`);
    } catch (commsError) {
      console.error(`Exception during communication selections:`, commsError);
      return { success: false, error: String(commsError) };
    }
    
    console.log(`Successfully completed all selection operations!`);
    return { success: true };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Critical error in saveCuratorSelections:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get public collaboration data for a specific collaboration
 */
export async function getCollaborationDetails(collabId: string): Promise<{ success: boolean; error?: string; collaboration?: any }> {
  const supabase = createClientComponentClient();
  
  try {
    // Modified query to get details without using period_id or invalid join
    const { data, error } = await supabase
      .from('collabs')
      .select(`
        id,
        title,
        description,
        type,
        is_private,
        participation_mode,
        location,
        metadata,
        template_id
      `)
      .eq('id', collabId)
      .single();
      
    if (error) {
      console.error("Error fetching collaboration details:", error);
      return { success: false, error: error.message };
    }
    
    if (!data) {
      return { success: false, error: "Collaboration not found" };
    }
    
    // Get participant count
    const { count: participantCount, error: countError } = await supabase
      .from('collab_participants')
      .select('*', { count: 'exact', head: true })
      .eq('collab_id', collabId)
      .eq('status', 'active');
      
    if (countError) {
      console.error("Error counting participants:", countError);
      return { success: false, error: countError.message };
    }
    
    // Get template info separately if a template_id exists
    let templateData = null;
    if (data.template_id) {
      const { data: template, error: templateError } = await supabase
        .from('collab_templates')
        .select('instructions, display_text, requirements')
        .eq('id', data.template_id)
        .single();
        
      if (!templateError && template) {
        templateData = template;
      }
    }
    
    const metadata = data.metadata || {};
    
    // Determine participation mode
    let participationMode: 'private' | 'local' | 'community';
    if (data.participation_mode) {
      participationMode = data.participation_mode as 'private' | 'local' | 'community';
    } else if (data.is_private) {
      participationMode = 'private';
    } else {
      participationMode = 'community';
    }
    
    // Format the collaboration
    const collaboration = {
      id: data.id,
      title: data.title,
      type: data.type,
      participation_mode: participationMode,
      location: data.location,
      description: metadata.description || data.description || templateData?.display_text || '',
      instructions: templateData?.instructions || '',
      requirements: templateData?.requirements || '',
      participant_count: participantCount || 0
    };
    
    return { success: true, collaboration };
    
  } catch (error) {
    console.error("Error fetching collaboration details:", error);
    return { success: false, error: "Failed to fetch collaboration details" };
  }
}

/**
 * Get cities with participant counts for local collaborations
 */
export async function getCitiesWithParticipantCounts(): Promise<{
  success: boolean;
  error?: string;
  cities?: Array<{ name: string; state?: string; participant_count: number }>;
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