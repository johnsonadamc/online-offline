// src/lib/supabase/curation.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function getCreatorsForCuration() {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // Get current period
    const { data: periodData } = await supabase
      .from('periods')
      .select('*')
      .eq('is_active', true)
      .single();
      
    // Get creators with content for the current period
    const { data: creatorsData, error } = await supabase
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
      
    if (error) {
      return { success: false, error };
    }
    
    // Get previous selections
    const { data: selectionsData } = await supabase
      .from('curator_selections')
      .select('*')
      .eq('curator_id', user.id)
      .eq('period_id', periodData.id);
      
    const selectedCreators = selectionsData?.map(s => s.creator_id) || [];
    
    // Format creator data
    const creators = creatorsData.map(content => {
      // Extract creator info
      const profile = content.profiles;
      
      return {
        id: content.creator_id,
        name: `${profile.first_name} ${profile.last_name}`,
        firstName: profile.first_name,
        lastName: profile.last_name,
        bio: profile.bio || "",
        creatorType: getCreatorType(content.type),
        contentType: content.type,
        tags: content.content_entries.flatMap(entry => 
          entry.tags?.map(t => t.tag) || []
        ).filter((value, index, self) => self.indexOf(value) === index), // remove duplicates
        lastPost: content.content_entries[0]?.title || "",
        avatar: profile.avatar_url || "/api/placeholder/400/400?text=User",
        previousQuarter: false, // You'd need to check if they were in previous period
        type: "friend",
        isPrivate: !profile.is_public
      };
    });
    
    // Get ads (in a real implementation, you'd fetch from your database)
    // For now, return sample ads
    const ads = [
      {
        id: "ad1",
        name: "Artisan's Supply Co.",
        bio: "Premium art supplies and workshops for creators",
        lastPost: "Featured: New Sustainable Paint Collection",
        avatar: "/api/placeholder/400/400?text=AS",
        type: "ad",
        discount: 2
      },
      {
        id: "ad2",
        name: "The Reading Room",
        bio: "Independent bookstore with curated collections & events",
        lastPost: "Event: Monthly Poetry Reading Night",
        avatar: "/api/placeholder/400/400?text=RR",
        type: "ad",
        discount: 2
      }
    ];
    
    return { 
      success: true, 
      creators,
      ads,
      selectedCreators,
      period: periodData
    };
    
  } catch (error) {
    console.error("Error getting curation data:", error);
    return { success: false, error };
  }
}

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

export async function saveCuratorSelections(
  periodId: string, 
  creatorIds: string[], 
  adIds: string[]
) {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }
    
    // First, delete existing selections for this period
    const { error: deleteError } = await supabase
      .from('curator_selections')
      .delete()
      .eq('curator_id', user.id)
      .eq('period_id', periodId);
      
    if (deleteError) {
      return { success: false, error: deleteError };
    }
    
    // Then add new selections
    const selections = creatorIds.map(creatorId => ({
      curator_id: user.id,
      creator_id: creatorId,
      period_id: periodId,
      is_ad: false,
      selected_at: new Date().toISOString()
    }));
    
    // Add ad selections
    adIds.forEach(adId => {
      selections.push({
        curator_id: user.id,
        creator_id: adId, // In a real implementation, you'd have a separate ads table
        period_id: periodId,
        is_ad: true,
        selected_at: new Date().toISOString()
      });
    });
    
    const { error: insertError } = await supabase
      .from('curator_selections')
      .insert(selections);
      
    if (insertError) {
      return { success: false, error: insertError };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error("Error saving curator selections:", error);
    return { success: false, er