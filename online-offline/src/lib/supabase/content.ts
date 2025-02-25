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
    const { data, error } = await supabase
      .from('periods')
      .select('*')
      .filter('start_date', 'lte', new Date().toISOString())
      .filter('end_date', 'gte', new Date().toISOString())
      .single();

    if (error) throw error;
    return { success: true, period: data as Period };
  } catch (error) {
    console.error('Error fetching current period:', error);
    return { success: false, error };
  }
}

export async function fetchCurrentPeriodDraft() {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Get current period
    const { period, error: periodError } = await getCurrentPeriod();
    if (!period || periodError) throw new Error('No active period found');

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
      .in('status', ['draft', 'submitted'])  // Include submitted drafts
      .eq('period_id', period.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (contentError && contentError.code !== 'PGRST116') {
      throw contentError;
    }

    return { success: true, draft: contentData, period };

  } catch (error) {
    console.error('Error fetching current draft:', error);
    return { success: false, error };
  }
}

export async function saveContent(
  type: 'regular' | 'fullSpread',
  status: 'draft' | 'submitted' | 'published',
  entries: ContentEntry[],
  existingDraftId?: string
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
    let currentStatus = status;

    let contentData;

    // Always create a new content record
    const { data, error: contentError } = await supabase
      .from('content')
      .insert({
        creator_id: user.id,
        type,
        status: currentStatus,
        period_id: period.id,
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
    contentData = data;

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
    if (!user) throw new Error('No user found');

    // Get current period to exclude it
    const { period: currentPeriod } = await getCurrentPeriod();
    
    // Get past published content
    const { data, error } = await supabase
      .from('content')
      .select(`
        id,
        status,
        updated_at,
        periods!inner(
          id,
          name,
          season,
          year,
          end_date
        ),
        content_entries(
          id,
          title,
          caption,
          media_url
        )
      `)
      .eq('creator_id', user.id)
      .in('status', ['submitted', 'published'])
      .neq('period_id', currentPeriod?.id || '')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    
    // Transform the data to match the expected structure
    const pastContent = data.map(item => ({
      id: item.id,
      status: item.status,
      updated_at: item.updated_at,
      periods: item.periods,  // This should be a single object, not an array
      content_entries: item.content_entries || []
    }));
    
    return { success: true, pastContent };
  } catch (error) {
    console.error('Error fetching past contributions:', error);
    return { success: false, error };
  }
}