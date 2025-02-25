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

interface Period {
  name: string;
  season: string;
  year: number;
}

interface HistoricalStat {
  subscriber_count: number;
  content_id: string;
  periods: Period;
  content: {
    creator_id: string;
  }[];
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
      historicalStats: (historicalStats || []).map((stat: any) => ({
        period: stat.periods.name,
        season: stat.periods.season,
        year: stat.periods.year,
        subscriberCount: stat.subscriber_count,
        contentId: stat.content_id
      }))
    };
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    return {
      currentPeriodStats: null,
      historicalStats: []
    };
  }
}