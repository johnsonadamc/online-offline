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

// Note: The following interfaces are used as part of the return types from database queries
interface ProfileData {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

interface CommunicationRecord {
  id?: string;
  subject?: string;
  content?: string;
  image_url?: string | null;
  status?: string;
  updated_at?: string;
  created_at?: string;
  period_id?: string;
  recipient_id?: string;
  sender_id?: string;
  is_selected?: boolean;
  periods?: Period;
  profiles?: ProfileData | ProfileData[];
  [key: string]: unknown;
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
    
    // Add debugging logs
    console.log("Draft communications data:", data);
    if (data && data.length > 0) {
      console.log("First draft profiles:", data[0].profiles);
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

// Withdraw a submitted communication back to draft status
export async function withdrawCommunication(communicationId: string): Promise<{
  success: boolean;
  error?: string;
  communication?: CommunicationRecord;
}> {
  const supabase = createClientComponentClient();
  
  try {
    // First, update the communication status back to 'draft'
    const { error: updateError } = await supabase
      .from('communications')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', communicationId);
      
    if (updateError) {
      console.error("Error withdrawing communication:", updateError);
      return { success: false, error: updateError.message };
    }
    
    // Then fetch the updated communication with profile data
    const { data, error: fetchError } = await supabase
      .from('communications')
      .select(`
        id,
        subject,
        content,
        image_url,
        status,
        created_at,
        updated_at,
        recipient_id,
        profiles:recipient_id (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('id', communicationId)
      .single();
      
    if (fetchError) {
      console.error("Error fetching withdrawn communication:", fetchError);
      return { success: true, communication: { id: communicationId, status: 'draft' } };
    }
    
    return { success: true, communication: data };
    
  } catch (error) {
    console.error("Unexpected error in withdrawCommunication:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

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
      profile.profile_types?.some((pt: { type: string }) => pt.type === 'contributor')
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
      
      if (queryError) {
        throw queryError;
      }
      
      if (!allComms) {
        throw new Error('No communications found');
      }
      
      // Randomly select up to 10
      const shuffled = [...allComms].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 10);
      communicationIds = selected.map(comm => comm.id);
    }
    
    // Update all selected communications
    const updatedRecords = {
      is_selected: true,
      selection_method: selectionMethod
    };
    
    const { error } = await supabase
      .from('communications')
      .update(updatedRecords)
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

// Get a count of communications for a specific curator
export const getCommunicationCount = async (curatorId: string) => {
  try {
    const supabase = createClientComponentClient();
    
    // Get active period
    const { data: activePeriod, error: periodError } = await supabase
      .from('periods')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (periodError || !activePeriod) {
      return { success: false, error: 'No active period found' };
    }
    
    // Count communications for this curator in the current period
    const { count, error } = await supabase
      .from('communications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', curatorId)
      .eq('period_id', activePeriod.id)
      .eq('status', 'submitted');
      
    if (error) {
      throw error;
    }
    
    return { success: true, count };
  } catch (error) {
    console.error('Error counting communications:', error);
    return { success: false, error };
  }
};
// Add this function to your lib/supabase/communications.ts file

/**
 * Delete a draft communication
 * Only draft communications can be deleted
 */
export async function deleteDraftCommunication(communicationId: string) {
  const supabase = createClientComponentClient();
  
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    // First, check if the communication exists, belongs to the user, and is a draft
    const { data: commData, error: commCheckError } = await supabase
      .from('communications')
      .select('id, sender_id, status')
      .eq('id', communicationId)
      .single();
      
    if (commCheckError) {
      console.error("Error checking communication:", commCheckError);
      return { success: false, error: 'Communication not found' };
    }
    
    // Verify ownership
    if (commData.sender_id !== user.id) {
      return { success: false, error: 'You do not have permission to delete this communication' };
    }
    
    // Verify status is draft
    if (commData.status !== 'draft') {
      return { success: false, error: 'Only draft communications can be deleted' };
    }
    
    // Delete associated notifications if any exist
    const { error: notifError } = await supabase
      .from('communication_notifications')
      .delete()
      .eq('communication_id', communicationId);
      
    if (notifError) {
      console.error("Error deleting notifications:", notifError);
      // Continue anyway, as there might not be any notifications
    }
    
    // Delete the communication
    const { error: deleteError } = await supabase
      .from('communications')
      .delete()
      .eq('id', communicationId);
      
    if (deleteError) {
      console.error("Error deleting communication:", deleteError);
      return { success: false, error: 'Failed to delete communication' };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error("Error in deleteDraftCommunication:", error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}