import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Define TypeScript interfaces for our data structures
interface Communication {
  id?: string;
  sender_id?: string;
  recipient_id: string;
  subject: string;
  content: string;
  image_url?: string | null; // Allow null values
  word_count?: number;
  status?: string;
  period_id?: string;
  is_selected?: boolean;
  selection_method?: string;
  updated_at?: string;
  created_at?: string;
}

interface Period {
  id: string;
  season: string;
  year: number;
  end_date: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  profile_types?: { type: string }[];
}

interface CommunicationWithPeriod {
  period_id: string;
  periods: Period;
}

// Get all draft communications for the current user
export const getDraftCommunications = async () => {
  try {
    const supabase = createClientComponentClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    const { data, error } = await supabase
      .from('communications')
      .select(`
        id, 
        subject, 
        content, 
        image_url,
        status,
        updated_at,
        period_id,
        recipient_id,
        periods (
          id,
          season,
          year
        ),
        profiles:recipient_id (
          first_name,
          last_name
        )
      `)
      .eq('sender_id', user.id)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return { success: true, drafts: data };
  } catch (error) {
    console.error('Error fetching draft communications:', error);
    return { success: false, error };
  }
};

// Get all submitted communications for the current user
export const getSubmittedCommunications = async () => {
  try {
    const supabase = createClientComponentClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    const { data, error } = await supabase
      .from('communications')
      .select(`
        id, 
        subject, 
        status,
        created_at,
        is_selected,
        period_id,
        recipient_id,
        periods (
          id,
          season,
          year
        ),
        profiles:recipient_id (
          first_name,
          last_name
        )
      `)
      .eq('sender_id', user.id)
      .eq('status', 'submitted')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return { success: true, submissions: data };
  } catch (error) {
    console.error('Error fetching submitted communications:', error);
    return { success: false, error };
  }
};

// Get all communications received by the current curator
export const getReceivedCommunications = async (periodId: string) => {
  try {
    const supabase = createClientComponentClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    const { data, error } = await supabase
      .from('communications')
      .select(`
        id, 
        subject,
        sender_id,
        is_selected,
        profiles:sender_id (
          first_name,
          last_name
        )
      `)
      .eq('recipient_id', user.id)
      .eq('status', 'submitted')
      .eq('period_id', periodId);
    
    if (error) {
      throw error;
    }
    
    return { success: true, received: data };
  } catch (error) {
    console.error('Error fetching received communications:', error);
    return { success: false, error };
  }
};

// Create or update a communication draft
export const saveCommunication = async (communication: Communication) => {
  try {
    const supabase = createClientComponentClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    const { data: activePeriod, error: periodError } = await supabase
      .from('periods')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (periodError || !activePeriod) {
      return { success: false, error: 'No active period found' };
    }
    
    const wordCount = communication.content.trim().split(/\s+/).length;
    
    if (wordCount > 250) {
      return { success: false, error: 'Communication exceeds the 250 word limit' };
    }
    
    // If it's an existing communication
    if (communication.id) {
      const { data, error } = await supabase
        .from('communications')
        .update({
          subject: communication.subject,
          content: communication.content,
          image_url: communication.image_url,
          word_count: wordCount,
          updated_at: new Date().toISOString(),
          recipient_id: communication.recipient_id,
          period_id: activePeriod.id
        })
        .eq('id', communication.id)
        .eq('sender_id', user.id)
        .eq('status', 'draft')
        .select();
      
      if (error) {
        throw error;
      }
      
      return { success: true, communication: data?.[0] || null };
    } 
    // Create new communication
    else {
      const { data, error } = await supabase
        .from('communications')
        .insert({
          sender_id: user.id,
          recipient_id: communication.recipient_id,
          subject: communication.subject,
          content: communication.content,
          image_url: communication.image_url,
          word_count: wordCount,
          status: 'draft',
          period_id: activePeriod.id
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      return { success: true, communication: data?.[0] || null };
    }
  } catch (error) {
    console.error('Error saving communication:', error);
    return { success: false, error };
  }
};

// Submit a communication for publication
export const submitCommunication = async (id: string) => {
  try {
    const supabase = createClientComponentClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    const { data, error } = await supabase
      .from('communications')
      .update({
        status: 'submitted',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('sender_id', user.id)
      .eq('status', 'draft')
      .select();
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      return { success: false, error: 'Communication not found' };
    }
    
    // Create notification for recipient
    const { error: notificationError } = await supabase
      .from('communication_notifications')
      .insert({
        communication_id: id,
        recipient_id: data[0].recipient_id
      });
    
    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }
    
    return { success: true, communication: data[0] };
  } catch (error) {
    console.error('Error submitting communication:', error);
    return { success: false, error };
  }
};

// Withdraw a submitted communication (revert to draft)
export const withdrawCommunication = async (id: string) => {
  try {
    const supabase = createClientComponentClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    // First get the communication with its period_id
    const { data: comm, error: commError } = await supabase
      .from('communications')
      .select('period_id')
      .eq('id', id)
      .single();
    
    if (commError || !comm || !comm.period_id) {
      return { success: false, error: 'Communication not found' };
    }
    
    // Then directly query the period table to get the end_date
    const { data: period, error: periodError } = await supabase
      .from('periods')
      .select('end_date')
      .eq('id', comm.period_id)
      .single();
    
    if (periodError || !period || !period.end_date) {
      return { success: false, error: 'Period information not found' };
    }
    
    // Check if period has ended
    const periodEndDate = new Date(period.end_date);
    const now = new Date();
    
    if (now > periodEndDate) {
      return { success: false, error: 'Cannot withdraw after period has ended' };
    }
    
    // Now withdraw the communication (change status back to draft)
    const { data, error } = await supabase
      .from('communications')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('sender_id', user.id)
      .eq('status', 'submitted')
      .select();
    
    if (error) {
      throw error;
    }
    
    // Remove any notifications
    await supabase
      .from('communication_notifications')
      .delete()
      .eq('communication_id', id);
    
    return { success: true, communication: data?.[0] || null };
  } catch (error) {
    console.error('Error withdrawing communication:', error);
    return { success: false, error };
  }
};

// Get list of contributors for recipient selection
export const getContributors = async () => {
  try {
    const supabase = createClientComponentClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    // Get users with "contributor" profile type who are public
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        avatar_url,
        profile_types (
          type
        )
      `)
      .eq('is_public', true)
      .neq('id', user.id);
    
    if (error) {
      throw error;
    }
    
    // Filter for those with contributor type
    const contributors = data.filter(profile => 
      profile.profile_types?.some(pt => pt.type === 'contributor')
    );
    
    return { success: true, contributors };
  } catch (error) {
    console.error('Error fetching contributors:', error);
    return { success: false, error };
  }
};

// For curators: select communications to include
export const selectCommunications = async (
  communicationIds: string[], 
  selectionMethod: 'all' | 'random' | 'select', 
  periodId: string
) => {
  try {
    const supabase = createClientComponentClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    // If using random selection
    if (selectionMethod === 'random') {
      // Get all communications sent to this curator for this period
      const { data: allComms, error: queryError } = await supabase
        .from('communications')
        .select('id')
        .eq('recipient_id', user.id)
        .eq('status', 'submitted')
        .eq('period_id', periodId);
      
      if (queryError || !allComms) {
        throw queryError || new Error('No communications found');
      }
      
      // Randomly select up to 10
      const shuffled = [...allComms].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 10);
      communicationIds = selected.map(comm => comm.id);
    }
    
    // Update all selected communications
    const { data, error } = await supabase
      .from('communications')
      .update({
        is_selected: true,
        selection_method: selectionMethod
      })
      .in('id', communicationIds)
      .eq('recipient_id', user.id)
      .eq('status', 'submitted')
      .eq('period_id', periodId);
    
    if (error) {
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error selecting communications:', error);
    return { success: false, error };
  }
};