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
  title: string;
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
      const { data: joinedCollabsData, error: collabsError } = await supabase
        .from('collab_participants')
        .select(`
          collabs:collab_id (
            id,
            title,
            type,
            participation_mode,
            location,
            metadata
          )
        `)
        .eq('profile_id', user.id)
        .eq('status', 'active');
        
      if (collabsError) {
        console.error("Error fetching collaborations:", collabsError);
        // Continue with empty array
      } else if (joinedCollabsData && joinedCollabsData.length > 0) {
        // Format joined collabs data
        formattedJoinedCollabs = joinedCollabsData.map(item => {
          const collab = item.collabs || {};
          const collabData = Array.isArray(collab) ? collab[0] || {} : collab;
          const metadata = collabData.metadata || {};
          
          return {
            id: collabData.id || '',
            title: collabData.title || '',
            type: collabData.type as 'chain' | 'theme' | 'narrative' || 'chain',
            participation_mode: collabData.participation_mode as 'private' | 'local' | 'community' || 'community',
            participant_count: 0, // We'll update this below
            location: collabData.location || null,
            description: metadata.description || '',
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
    } catch (collabsError) {
      console.error("Unexpected error fetching collaborations:", collabsError);
      // Continue with empty array
    }
    
    // STEP 4: Get available (community and local) collaborations for the period
    let formattedAvailableCollabs: Collaboration[] = [];
    
    try {
      const { data: availableCollabsData, error: availableCollabsError } = await supabase
        .from('collabs')
        .select('*')
        .in('participation_mode', ['community', 'local'])
        .eq('period_id', periodData.id);
        
      if (availableCollabsError) {
        console.error("Error fetching available collaborations:", availableCollabsError);
        // Continue with empty array
      } else if (availableCollabsData && availableCollabsData.length > 0) {
        // Format available collabs data, filtering out ones the user has already joined
        formattedAvailableCollabs = availableCollabsData
          .filter(collab => !formattedJoinedCollabs.some(joined => joined.id === collab.id))
          .map(collab => {
            const metadata = collab.metadata || {};
            
            return {
              id: collab.id || '',
              title: collab.title || '',
              type: collab.type as 'chain' | 'theme' | 'narrative' || 'chain',
              participation_mode: collab.participation_mode as 'private' | 'local' | 'community' || 'community',
              participant_count: 0, // We'll update this below
              location: collab.location || null,
              description: metadata.description || '',
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
          .select('collab_id')
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
        selectedCollabs = collabSelections.data
          .map(s => s.collab_id)
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
                title: item.title || '',
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
    // Fetch collaborations that are either community or local
    const { data, error } = await supabase
      .from('collabs')
      .select('*')
      .eq('period_id', periodId)
      .in('participation_mode', ['community', 'local']);
      
    if (error) {
      console.error("Error fetching available collaborations:", error);
      return { success: false, error: error.message };
    }
    
    const collaborations: Collaboration[] = (data || []).map(collab => {
      const metadata = collab.metadata || {};
      
      return {
        id: collab.id || '',
        title: collab.title || '',
        type: collab.type as 'chain' | 'theme' | 'narrative' || undefined,
        participation_mode: collab.participation_mode as 'private' | 'local' | 'community' || 'community',
        participant_count: 0, // This will be updated separately
        location: collab.location,
        description: metadata.description || '',
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
export async function saveCuratorSelections(selections: SaveSelectionsParams): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientComponentClient();
  
  try {
    // Start a transaction (sort of - we'll just handle errors and rollback manually)
    let success = true;
    
    // 1. Save creator selections
    // First delete existing selections
    const { error: deleteCreatorError } = await supabase
      .from('curator_creator_selections')
      .delete()
      .eq('curator_id', selections.curator_id)
      .eq('period_id', selections.period_id);
      
    if (deleteCreatorError) {
      console.error("Error deleting existing creator selections:", deleteCreatorError);
      return { success: false, error: deleteCreatorError.message };
    }
    
    // Then add new selections
    const creatorSelections = selections.selected_contributors.map(creatorId => ({
      curator_id: selections.curator_id,
      creator_id: creatorId,
      period_id: selections.period_id,
      selected_at: new Date().toISOString()
    }));
    
    if (creatorSelections.length > 0) {
      const { error: insertCreatorError } = await supabase
        .from('curator_creator_selections')
        .insert(creatorSelections);
        
      if (insertCreatorError) {
        console.error("Error inserting creator selections:", insertCreatorError);
        success = false;
      }
    }
    
    // 2. Save campaign (ad) selections
    const { error: deleteCampaignError } = await supabase
      .from('curator_campaign_selections')
      .delete()
      .eq('curator_id', selections.curator_id)
      .eq('period_id', selections.period_id);
      
    if (deleteCampaignError) {
      console.error("Error deleting existing campaign selections:", deleteCampaignError);
      success = false;
    }
    
    const campaignSelections = selections.selected_ads.map(campaignId => ({
      curator_id: selections.curator_id,
      campaign_id: campaignId,
      period_id: selections.period_id,
      selected_at: new Date().toISOString()
    }));
    
    if (campaignSelections.length > 0) {
      const { error: insertCampaignError } = await supabase
        .from('curator_campaign_selections')
        .insert(campaignSelections);
        
      if (insertCampaignError) {
        console.error("Error inserting campaign selections:", insertCampaignError);
        success = false;
      }
    }
    
    // 3. Save collaboration selections
    const { error: deleteCollabError } = await supabase
      .from('curator_collab_selections')
      .delete()
      .eq('curator_id', selections.curator_id)
      .eq('period_id', selections.period_id);
      
    if (deleteCollabError) {
      console.error("Error deleting collab selections:", deleteCollabError);
      success = false;
    }
    
    const collabSelections = selections.selected_collaborations.map(collabId => ({
      curator_id: selections.curator_id,
      collab_id: collabId,
      period_id: selections.period_id,
      selected_at: new Date().toISOString()
    }));
    
    if (collabSelections.length > 0) {
      const { error: insertCollabError } = await supabase
        .from('curator_collab_selections')
        .insert(collabSelections);
        
      if (insertCollabError) {
        console.error("Error inserting collab selections:", insertCollabError);
        success = false;
      }
    }
    
    // 4. Save communications selections
    const { error: deleteCommsError } = await supabase
      .from('curator_communication_selections')
      .delete()
      .eq('curator_id', selections.curator_id)
      .eq('period_id', selections.period_id);
      
    if (deleteCommsError) {
      console.error("Error deleting comm settings:", deleteCommsError);
      success = false;
    }
    
    // Insert new settings if communications are selected
    const { error: insertCommsError } = await supabase
      .from('curator_communication_selections')
      .insert({
        curator_id: selections.curator_id,
        period_id: selections.period_id,
        include_communications: selections.selected_communications.length > 0,
        selected_at: new Date().toISOString()
      });
      
    if (insertCommsError) {
      console.error("Error inserting comm settings:", insertCommsError);
      success = false;
    }
    
    return { success };
    
  } catch (error) {
    console.error("Error saving curator selections:", error);
    return { success: false, error: "Failed to save selections" };
  }
}

/**
 * Insert sample data for testing
 */
export async function insertSampleData(periodId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientComponentClient();
  
  try {
    // Insert sample campaigns
    const { error: campaignError } = await supabase
      .from('campaigns')
      .insert([
        {
          name: "Artisan's Supply Co.",
          bio: "Premium art supplies and workshops for creators",
          avatar_url: "/api/placeholder/400/400?text=AS",
          last_post: "Featured: New Sustainable Paint Collection",
          discount: 2,
          period_id: periodId,
          is_active: true
        },
        {
          name: "The Reading Room",
          bio: "Independent bookstore with curated collections & events",
          avatar_url: "/api/placeholder/400/400?text=RR",
          last_post: "Event: Monthly Poetry Reading Night",
          discount: 2,
          period_id: periodId,
          is_active: true
        }
      ]);
      
    if (campaignError) {
      console.error("Error inserting sample campaigns:", campaignError);
      return { success: false, error: campaignError.message };
    }
    
    // Insert sample collaborations if none exist
    const { count: collabCount, error: countError } = await supabase
      .from('collabs')
      .select('*', { count: 'exact', head: true })
      .eq('period_id', periodId);
    
    if (countError) {
      console.error("Error counting collaborations:", countError);
      return { success: false, error: countError.message };
    }
    
    if (collabCount === 0) {
      // Get an available template for each type
      const { data: templates, error: templateError } = await supabase
        .from('collab_templates')
        .select('id, title, type')
        .in('type', ['chain', 'theme', 'narrative'])
        .limit(3);
        
      if (templateError) {
        console.error("Error fetching templates:", templateError);
        return { success: false, error: templateError.message };
      }
      
      if (templates && templates.length > 0) {
        // Create sample collaborations
        const sampleCollabs = [
          {
            title: "Morning Rituals",
            type: "theme",
            participation_mode: "community",
            period_id: periodId,
            template_id: templates.find(t => t.type === 'theme')?.id,
            metadata: {
              description: "Capture those bleary-eyed moments when coffee is still a wish."
            }
          },
          {
            title: "Urban Spaces",
            type: "chain",
            participation_mode: "local",
            location: "Downtown",
            period_id: periodId,
            template_id: templates.find(t => t.type === 'chain')?.id,
            metadata: {
              description: "A sequential exploration of urban environments and shared spaces."
            }
          },
          {
            title: "Four Seasons",
            type: "chain",
            participation_mode: "private",
            period_id: periodId,
            template_id: templates.find(t => t.type === 'chain')?.id,
            metadata: {
              description: "Document seasonal changes in one location over a year."
            }
          },
          {
            title: "Local Legends",
            type: "narrative",
            participation_mode: "community",
            period_id: periodId,
            template_id: templates.find(t => t.type === 'narrative')?.id,
            metadata: {
              description: "Every neighborhood has that one mysterious character with stories to tell."
            }
          }
        ];
        
        const { error: collabError } = await supabase
          .from('collabs')
          .insert(sampleCollabs);
          
        if (collabError) {
          console.error("Error inserting sample collaborations:", collabError);
          return { success: false, error: collabError.message };
        }
      }
    }
    
    return { success: true };
    
  } catch (error) {
    console.error("Error inserting sample data:", error);
    return { success: false, error: "Failed to insert sample data" };
  }
}

/**
 * Get public collaboration data for a specific collaboration
 */
export async function getCollaborationDetails(collabId: string): Promise<{ success: boolean; error?: string; collaboration?: any }> {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from('collabs')
      .select(`
        id,
        title,
        type,
        participation_mode,
        location,
        metadata,
        template_id,
        collab_templates:template_id (
          instructions,
          display_text,
          requirements
        )
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
    
    // Get the template data
    const template = data.collab_templates || {};
    const templateData = Array.isArray(template) ? template[0] || {} : template;
    const metadata = data.metadata || {};
    
    // Format the collaboration
    const collaboration = {
      id: data.id,
      title: data.title,
      type: data.type,
      participation_mode: data.participation_mode,
      location: data.location,
      description: metadata.description || templateData.display_text || '',
      instructions: templateData.instructions || '',
      requirements: templateData.requirements || '',
      participant_count: participantCount || 0
    };
    
    return { success: true, collaboration };
    
  } catch (error) {
    console.error("Error fetching collaboration details:", error);
    return { success: false, error: "Failed to fetch collaboration details" };
  }
}