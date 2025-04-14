import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ContentEntry {
  title: string;
  caption: string;
  selectedTags: string[];
  imageUrl: string | null;
  isFeature: boolean;
  isFullSpread: boolean;
}

interface Period {
  id: string;
  name: string;
  season: string;
  year: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export async function getCurrentPeriod() {
  const supabase = createClientComponentClient();
  
  try {
    console.log("Fetching current period...");
    
    // First, check how many active periods we have
    const { data: activePeriods, error: countError } = await supabase
      .from('periods')
      .select('id')
      .eq('is_active', true);
    
    if (countError) {
      console.error('Error checking active periods:', countError);
      return { success: false, error: countError };
    }
    
    console.log(`Found ${activePeriods?.length || 0} active periods`);
    
    // If there are multiple active periods, let's see what they are
    if (activePeriods && activePeriods.length > 1) {
      const { data: multipleActive } = await supabase
        .from('periods')
        .select('id, name, season, year')
        .eq('is_active', true);
        
      console.log('Multiple active periods found:', multipleActive);
    }
    
    // Get the single active period with most recent end_date
    const { data, error } = await supabase
      .from('periods')
      .select('id, name, season, year, start_date, end_date, is_active')
      .eq('is_active', true)
      .order('end_date', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error fetching current period:', error);
      
      // If the error is "No rows found" but we know there are active periods,
      // it could be because .single() expects exactly one row
      if (activePeriods && activePeriods.length > 0) {
        // Try again without .single()
        const { data: fallback, error: fallbackError } = await supabase
          .from('periods')
          .select('id, name, season, year, start_date, end_date, is_active')
          .eq('is_active', true)
          .order('end_date', { ascending: false })
          .limit(1);
          
        if (fallbackError) {
          console.error('Error in fallback query:', fallbackError);
          return { success: false, error: fallbackError };
        }
        
        if (fallback && fallback.length > 0) {
          console.log('Retrieved period using fallback:', fallback[0]);
          return { success: true, period: fallback[0] };
        }
      }
      
      return { success: false, error };
    }
    
    console.log('Successfully retrieved current period:', data);
    return { success: true, period: data };
  } catch (error) {
    console.error('Error fetching current period:', error);
    return { success: false, error };
  }
}

export async function fetchCurrentPeriodDraft() {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return { success: false, error: "Not authenticated" };
    }

    // Get current period
    const { period, error: periodError } = await getCurrentPeriod();
    if (!period || periodError) {
      console.error("No active period found:", periodError);
      return { success: false, error: "No active period found" };
    }

    // Use the existing query with better error handling
    const { data: contentData, error: contentError } = await supabase
      .from('content')
      .select(`
        *,
        content_entries (
          *,
          content_tags (
            *
          )
        )
      `)
      .eq('creator_id', user.id)
      .in('status', ['draft', 'submitted'])
      .eq('period_id', period.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    // Handle the special case where no records are found
    if (contentError) {
      // PGRST116 is the error code for "no rows returned by the query"
      if (contentError.code === 'PGRST116') {
        // No data found - this is not an error, just return null for draft
        console.log("No draft found for current period");
        return { success: true, draft: null, period };
      }
      
      // For any other error, this is a real error
      console.error("Error fetching content:", contentError);
      return { success: false, error: contentError.message };
    }

    // Success with data
    return { success: true, draft: contentData, period };

  } catch (error) {
    console.error('Error fetching current draft:', error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function saveContent(
  type: 'regular' | 'fullSpread',
  status: 'draft' | 'submitted' | 'published',
  entries: ContentEntry[],
  existingDraftId?: string,
  pageTitle?: string
) {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('No user found');

    // Get current period
    const { period, error: periodError } = await getCurrentPeriod();
    if (!period || periodError) throw new Error('No active period found');

    // Always use the status that was passed in - this will respect manual changes in both directions
    const currentStatus = status;

    // Always create a new content record, now including page_title
    const { data: contentData, error: contentError } = await supabase
      .from('content')
      .insert({
        creator_id: user.id,
        type,
        status: currentStatus,
        period_id: period.id,
        page_title: pageTitle || '',
        layout_preferences: {},
        content_dimensions: {},
        style_metadata: {}
      })
      .select()
      .single();

    if (contentError) {
      console.error('Error creating content:', contentError);
      throw contentError;
    }

    // If there was an old draft, mark it as archived
    if (existingDraftId) {
      await supabase
        .from('content')
        .update({ status: 'archived' })
        .eq('id', existingDraftId);
    }

    // Create new entries
    const entriesPromises = entries.map(async (entry, index) => {
      try {
        const { data: entryData, error: entryError } = await supabase
          .from('content_entries')
          .insert({
            content_id: contentData.id,
            title: entry.title,
            caption: entry.caption,
            media_url: entry.imageUrl,
            is_feature: entry.isFeature,
            is_full_spread: entry.isFullSpread,
            order_index: index
          })
          .select()
          .single();

        if (entryError) {
          console.error('Error creating entry:', entryError);
          throw entryError;
        }

        if (entry.selectedTags.length > 0) {
          const { error: tagsError } = await supabase
            .from('content_tags')
            .insert(
              entry.selectedTags.map(tag => ({
                content_entry_id: entryData.id,
                tag,
                tag_type: 'theme'
              }))
            );

          if (tagsError) {
            console.error('Error creating tags:', tagsError);
            throw tagsError;
          }
        }

        return entryData;
      } catch (error) {
        console.error('Error processing entry:', error);
        throw error;
      }
    });

    await Promise.all(entriesPromises);
    return { success: true, contentId: contentData.id, period };

  } catch (error) {
    console.error('Error details:', {
      error,
      type,
      status,
      pageTitle,
      draftId: existingDraftId,
      entriesCount: entries.length
    });
    return { success: false, error };
  }
}

export async function getPastContributions() {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No authenticated user found");
      return { success: false, error: "No authenticated user found" };
    }
    
    console.log("Fetching past contributions for user:", user.id);
    
    // Get the current active period to exclude it
    const { data: activePeriod, error: periodError } = await supabase
      .from('periods')
      .select('id')
      .eq('is_active', true)
      .order('end_date', { ascending: false })
      .limit(1)
      .single();
      
    if (periodError) {
      console.error("Error fetching active period:", periodError);
      // Continue anyway - we'll include all periods
    }
    
    const activePeriodId = activePeriod?.id;
    console.log("Active period ID:", activePeriodId);
    
    // Get all submissions (not drafts) - now including page_title
    const { data, error } = await supabase
      .from('content')
      .select(`
        id,
        status,
        updated_at,
        period_id,
        type,
        page_title,
        content_entries (
          id,
          title,
          caption,
          media_url
        ),
        periods!inner (
          id,
          name,
          season,
          year,
          end_date
        )
      `)
      .eq('creator_id', user.id)
      .in('status', ['submitted', 'published'])
      .neq('period_id', activePeriodId || '')
      .order('updated_at', { ascending: false })
      .limit(1, { foreignTable: 'periods' }); 
      
    if (error) {
      console.error("Error fetching past content:", error);
      return { success: false, error: error.message };
    }
    
    if (!data || data.length === 0) {
      console.log("No past content found");
      return { success: true, pastContent: [] };
    }
    
    console.log(`Found ${data.length} content items`);
    
    // Log detailed information about each item for debugging
    data.forEach((item, index) => {
      const period = Array.isArray(item.periods) ? item.periods[0] as Period : undefined;
    
      console.log(`Item ${index + 1}:`, {
        id: item.id,
        title: item.page_title || item.content_entries?.[0]?.title || 'No title',
        period: period ? `${period.season} ${period.year}` : 'No period',
        periodId: item.period_id,
        status: item.status,
        type: item.type,
        updatedAt: item.updated_at
      });
    });
    
    // Separate regular content and collab content
    const regularContent = data.filter(item => item.type !== 'collab');
    const collabContent = data.filter(item => item.type === 'collab');
    
    console.log(`Regular content: ${regularContent.length}, Collab content: ${collabContent.length}`);
    
    // Filter to get only the latest entry per period for regular content
    const periodMap = new Map();
    
    regularContent.forEach(item => {
      const periodId = item.period_id;
      
      // If we haven't seen this period yet, or this item is newer than what we have
      if (!periodMap.has(periodId) || 
          new Date(item.updated_at) > new Date(periodMap.get(periodId).updated_at)) {
        periodMap.set(periodId, item);
      }
    });
    
    // Convert to array
    const filteredRegularContent = Array.from(periodMap.values());
    
    // Combine regular content with all collab content
    const combinedContent = [...filteredRegularContent, ...collabContent];
    
    // Sort by year and season
    type Season = 'Winter' | 'Fall' | 'Summer' | 'Spring';
    const seasonOrder: Record<Season, number> = { 'Winter': 0, 'Fall': 1, 'Summer': 2, 'Spring': 3 };
    
    const sortedContent = combinedContent.sort((a, b) => {
      // Sort by year descending, then by season
      const yearA = Array.isArray(a.periods) ? a.periods[0]?.year || 0 : a.periods?.year || 0;
      const yearB = Array.isArray(b.periods) ? b.periods[0]?.year || 0 : b.periods?.year || 0;
      
      if (yearB !== yearA) {
        return yearB - yearA;
      }
      
      // For same year, sort by season with type safety
      const seasonA = Array.isArray(a.periods) 
        ? (a.periods[0]?.season ? seasonOrder[a.periods[0].season as Season] || 0 : 0)
        : (a.periods?.season ? seasonOrder[a.periods.season as Season] || 0 : 0);

      const seasonB = Array.isArray(b.periods) 
        ? (b.periods[0]?.season ? seasonOrder[b.periods[0].season as Season] || 0 : 0)
        : (b.periods?.season ? seasonOrder[b.periods.season as Season] || 0 : 0);
      
      return seasonA - seasonB;
    });
    
    console.log(`Returning ${sortedContent.length} past content items`);
    return { success: true, pastContent: sortedContent };
  } catch (error) {
    console.error("Error in getPastContributions:", error);
    return { success: false, error: String(error) };
  }
}
export async function deleteContent(contentId: string) {
  const supabase = createClientComponentClient();
  
  try {
    console.log("Deleting content with ID:", contentId);
    
    // Get current user for authorization check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    // First, check if the content exists and belongs to the user
    const { data: contentData, error: contentCheckError } = await supabase
      .from('content')
      .select('id, creator_id, status')
      .eq('id', contentId)
      .single();
      
    if (contentCheckError) {
      console.error("Error checking content:", contentCheckError);
      return { success: false, error: 'Content not found' };
    }
    
    // Verify ownership
    if (contentData.creator_id !== user.id) {
      return { success: false, error: 'You do not have permission to delete this content' };
    }
    
    // Delete content tags by first getting all entry IDs
    const { data: entriesData, error: entriesError } = await supabase
      .from('content_entries')
      .select('id')
      .eq('content_id', contentId);
      
    if (entriesError) {
      console.error("Error fetching content entries:", entriesError);
      // Continue anyway, there might not be any entries
    }
    
    // If we have entries, delete their tags
    if (entriesData && entriesData.length > 0) {
      const entryIds = entriesData.map(entry => entry.id);
      
      // Delete associated tags
      const { error: tagsError } = await supabase
        .from('content_tags')
        .delete()
        .in('content_entry_id', entryIds);
        
      if (tagsError) {
        console.error("Error deleting content tags:", tagsError);
        // Continue anyway, we want to try to delete everything possible
      }
    }
    
    // Delete the content entries
    const { error: entriesDeleteError } = await supabase
      .from('content_entries')
      .delete()
      .eq('content_id', contentId);
      
    if (entriesDeleteError) {
      console.error("Error deleting content entries:", entriesDeleteError);
      return { success: false, error: 'Failed to delete content entries' };
    }
    
    // Finally delete the content record
    const { error: contentDeleteError } = await supabase
      .from('content')
      .delete()
      .eq('id', contentId);
      
    if (contentDeleteError) {
      console.error("Error deleting content:", contentDeleteError);
      return { success: false, error: 'Failed to delete content' };
    }
    
    console.log("Content successfully deleted");
    return { success: true };
    
  } catch (error) {
    console.error("Error in deleteContent:", error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}