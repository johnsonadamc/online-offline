// src/lib/supabase/profiles.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Function to send a follow request
export async function sendFollowRequest(followedId: string) {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };
    
    const followerId = user.id;
    
    // First check if a subscription record already exists
    const { data: existingSubscription, error: checkError } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('subscriber_id', followerId)
      .eq('creator_id', followedId)
      .maybeSingle();
      
    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no records found, which is expected
      console.error("Error checking for existing subscription:", checkError);
      throw checkError;
    }
    
    // If a subscription already exists
    if (existingSubscription) {
      // If it's already pending or active, just return that status
      if (existingSubscription.status === 'pending' || existingSubscription.status === 'active') {
        return { 
          success: true, 
          status: existingSubscription.status,
          message: `Request already ${existingSubscription.status}`
        };
      }
      
      // Otherwise, update the existing record (e.g., from rejected to pending)
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'pending', 
          subscribed_at: new Date().toISOString()
        })
        .eq('id', existingSubscription.id);
        
      if (updateError) throw updateError;
      
      return { success: true, status: 'pending' };
    }
    
    // Create a new subscription record if one doesn't exist
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        subscriber_id: followerId,
        creator_id: followedId,
        status: 'pending',
        subscribed_at: new Date().toISOString()
      });
      
    if (error) throw error;
    
    return { success: true, status: 'pending' };
  } catch (error) {
    console.error("Error sending follow request:", error);
    return { success: false, error: "Failed to send follow request" };
  }
}

// Function to check if user can send communications to another user
export async function canCommunicateWith(recipientId: string) {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: false, error: "Not authenticated" };
    
    const senderId = user.id;
    
    // First check if recipient is public
    const { data: recipientData, error: recipientError } = await supabase
      .from('profiles')
      .select('is_public')
      .eq('id', recipientId)
      .single();
      
    if (recipientError) throw recipientError;
    
    // If recipient is public, communication is allowed
    if (recipientData.is_public) return { allowed: true };
    
    // If private, check if sender has approved connection
    const { data: connectionData, error: connectionError } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('subscriber_id', senderId)
      .eq('creator_id', recipientId)
      .eq('status', 'active')
      .maybeSingle();
      
    if (connectionError && connectionError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - expected if no connection exists
      throw connectionError;
    }
    
    // Allow if connection status is approved
    return { allowed: connectionData ? true : false };
  } catch (error) {
    console.error("Error checking communication permission:", error);
    return { allowed: false, error: "Failed to check permissions" };
  }
}

// Function to get all pending follow requests for the current user
export async function getPendingFollowRequests() {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        subscriber_id,
        subscribed_at,
        profiles:profiles!subscriptions_subscriber_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('creator_id', user.id)
      .eq('status', 'pending');
      
    if (error) throw error;
    
    const requests = (data || []).map(request => {
      // Handle profiles correctly, whether it's an array or an object
      const profileData = Array.isArray(request.profiles) 
        ? request.profiles[0] || {} 
        : request.profiles || {};
      
      return {
        id: request.subscriber_id,
        requesterId: request.subscriber_id,
        firstName: profileData.first_name || '',
        lastName: profileData.last_name || '',
        requestDate: new Date(request.subscribed_at).toLocaleDateString(),
        avatar: profileData.avatar_url || '/api/placeholder/32/32'
      };
    });
    
    return { success: true, requests };
  } catch (error) {
    console.error("Error getting follow requests:", error);
    return { success: false, error: "Failed to get follow requests" };
  }
}

/**
 * Approves a follow request
 */
export async function approveFollowRequest(requesterId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createClientComponentClient();

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // First verify this request exists and is addressed to the current user
    const { data: request, error: requestError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('subscriber_id', requesterId)
      .eq('creator_id', user.id)
      .eq('status', 'pending')
      .single();

    if (requestError) {
      return { success: false, error: 'Request not found' };
    }

    // Update the request status to active
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('subscriber_id', requesterId)
      .eq('creator_id', user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error approving follow request:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Rejects a follow request
 */
export async function rejectFollowRequest(requesterId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createClientComponentClient();

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // First verify this request exists and is addressed to the current user
    const { data: request, error: requestError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('subscriber_id', requesterId)
      .eq('creator_id', user.id)
      .eq('status', 'pending')
      .single();

    if (requestError) {
      return { success: false, error: 'Request not found' };
    }

    // Delete the subscription
    const { error: deleteError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('subscriber_id', requesterId)
      .eq('creator_id', user.id);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error rejecting follow request:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}