import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface SubscriptionStats {
  currentPeriodStats: {
    subscriberCount: number;
    contentId: string;
  } | null;
  historicalStats: {
    period: string;
    season: string;
    year: number;
    subscriberCount: number;
    contentId: string;
  }[];
}

// Define a type for the historical stats data
interface HistoricalStatRecord {
  subscriber_count?: number | null;
  content_id?: string;
  periods?: unknown; // Using unknown for dynamic data that could be array or object
  content?: { creator_id?: string }[];
  [key: string]: unknown; // Allow for other properties
}

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  const supabase = createClientComponentClient();

  try {
    // Get current period
    const { data: currentPeriod } = await supabase
      .from('periods')
      .select('*')
      .filter('start_date', 'lte', new Date().toISOString())
      .filter('end_date', 'gte', new Date().toISOString())
      .single();

    // Get current period stats
    const { data: currentStats } = await supabase
      .from('content_subscriptions')
      .select(`
        subscriber_count,
        content_id,
        content!inner(creator_id)
      `)
      .eq('period_id', currentPeriod?.id)
      .eq('content.creator_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    // Get historical stats
    const { data: historicalStats } = await supabase
      .from('content_subscriptions')
      .select(`
        subscriber_count,
        content_id,
        periods:periods!inner(
          name,
          season,
          year
        ),
        content:content!inner(creator_id)
      `)
      .eq('content.creator_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false });

    return {
      currentPeriodStats: currentStats ? {
        subscriberCount: currentStats.subscriber_count,
        contentId: currentStats.content_id
      } : null,
      historicalStats: (historicalStats || []).map((stat: HistoricalStatRecord) => {
        let name = '';
        let season = '';
        let year = 0;
        
        // Extract period data safely with type safety
        const periods = stat.periods;
        
        if (periods) {
          if (Array.isArray(periods) && periods.length > 0) {
            // Use a type assertion here to tell TypeScript about the structure
            const firstPeriod = periods[0] as Record<string, unknown>;
            name = String(firstPeriod?.name || '');
            season = String(firstPeriod?.season || '');
            year = Number(firstPeriod?.year) || 0;
          } else {
            // It's an object - but use type assertion to access properties
            const periodData = periods as Record<string, unknown>;
            name = String(periodData?.name || '');
            season = String(periodData?.season || '');
            year = Number(periodData?.year) || 0;
          }
        }
        
        return {
          period: name,
          season: season,
          year: year,
          subscriberCount: Number(stat.subscriber_count) || 0,
          contentId: String(stat.content_id || '')
        };
      })
    };
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    return {
      currentPeriodStats: null,
      historicalStats: []
    };
  }
}