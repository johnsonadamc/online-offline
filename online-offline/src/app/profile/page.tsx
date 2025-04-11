"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Search, Lock, Shield, User, 
  ChevronLeft, Bell, CreditCard, Building, 
  UserCheck, UserX, Check, X, Camera
} from 'lucide-react';
import { sendFollowRequest, approveFollowRequest, rejectFollowRequest } from '@/lib/supabase/profiles';

interface Follower {
  id: string;
  firstName: string;
  lastName: string;
  followingSince: string;
  duration: string;
  avatar: string;
}

interface Following {
  id: string;
  firstName: string;
  lastName: string;
  followingSince: string;
  avatar: string;
  isPrivate: boolean;
}

interface FollowRequest {
  id: string;
  requesterId: string;
  firstName: string;
  lastName: string;
  requestDate: string;
  avatar: string;
}

interface BlockedUser {
  id: string;
  firstName: string;
  lastName: string;
  blockedDate: string;
  avatar: string;
}

interface BankInfo {
  accountNumber: string;
  routingNumber: string;
  accountType: string;
}

interface CuratorPaymentInfo {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
}

interface ProfileState {
  firstName: string;
  lastName: string;
  profileTypes: string[];
  isPublic: boolean;
  bankInfo: BankInfo;
  curatorPaymentInfo: CuratorPaymentInfo;
}

export default function ProfilePage() {
  const _router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileState>({
    firstName: '',
    lastName: '',
    profileTypes: [],
    isPublic: true,
    bankInfo: {
      accountNumber: '',
      routingNumber: '',
      accountType: 'checking'
    },
    curatorPaymentInfo: {
      cardNumber: '',
      expiryDate: '',
      cvv: ''
    }
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'permissions'>('profile');
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Following[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [pendingRequestMap, setPendingRequestMap] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClientComponentClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    isPrivate: boolean;
  }>>([]);

  // Show success message temporarily
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Show error message temporarily
  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 3000);
  };
  const calculateDuration = useCallback((startDate: string): string => {
    const start = new Date(startDate);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
    return months <= 0 ? 'Less than a month' : `${months} month${months !== 1 ? 's' : ''}`;
  }, []);

  const getProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            *,
            profile_types (type)
          `)
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }

        if (data) {
          setProfile({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            profileTypes: data.profile_types?.map((pt: { type: string }) => pt.type) || [],
            isPublic: data.is_public ?? true,
            bankInfo: data.bank_info || {
              accountNumber: '',
              routingNumber: '',
              accountType: 'checking'
            },
            curatorPaymentInfo: data.curator_payment_info || {
              cardNumber: '',
              expiryDate: '',
              cvv: ''
            }
          });
          
          // Set avatar URL if available
          if (data.avatar_url) {
            setAvatarUrl(data.avatar_url);
            setAvatarPreview(data.avatar_url);
          }
        }
      }
    } catch (error) {
      console.error("Error in getProfile:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);
  
  // Load avatar when component mounts
  useEffect(() => {
    const fetchAvatar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error("Error fetching avatar:", error);
        return;
      }
      
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
        setAvatarPreview(data.avatar_url);
      }
    };
    
    fetchAvatar();
  }, [supabase]);
  
  
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      // Upload the file to Supabase storage
      const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: publicUrlData } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      const avatarUrl = publicUrlData.publicUrl;
      
      // Update the user's profile with the avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      setAvatarUrl(avatarUrl);
      showSuccess('Avatar updated successfully');
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showError('Error uploading avatar');
    } finally {
      setUploading(false);
    }
  };
  const searchProfiles = async (query: string) => {
    try {
      if (query.length < 1) {
        setSearchResults([]);
        return;
      }
    
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Only search for private profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, is_public, avatar_url')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .eq('is_public', false) // Only get private profiles
        .neq('id', user.id)
        .limit(10);
      
      if (error) {
        console.error("Search error:", error);
        throw error;
      }
      
      if (data) {
        setSearchResults(data.map(profile => ({
          id: profile.id,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          avatar: profile.avatar_url || `/api/placeholder/40/40?text=${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`,
          isPrivate: true // All results are private profiles
        })));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching profiles:', error);
    }
  };

  const loadConnectionsData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      // Get people you have access to
      const { data: followingData, error: followingError } = await supabase
        .from('profile_connections')
        .select(`
          id,
          followed_id,
          status,
          created_at,
          profiles:followed_id (
            id,
            first_name,
            last_name,
            avatar_url,
            is_public
          )
        `)
        .eq('follower_id', user.id)
        .eq('status', 'approved')
        .eq('relationship_type', 'follow');
  
      if (followingError) {
        console.error("Error fetching following data:", followingError);
        throw followingError;
      }
  
      if (followingData) {
        const formattedFollowing = followingData.map(item => {
          // Handle the case where profiles might be an array instead of a single object
          const profileData = Array.isArray(item.profiles) 
            ? item.profiles[0] || {} 
            : item.profiles || {};
            
          return {
            id: item.followed_id,
            firstName: profileData.first_name || '',
            lastName: profileData.last_name || '',
            followingSince: new Date(item.created_at).toLocaleDateString(),
            avatar: profileData.avatar_url || `/api/placeholder/40/40?text=${profileData.first_name?.charAt(0) || ''}${profileData.last_name?.charAt(0) || ''}`,
            isPrivate: !profileData.is_public
          };
        });
        setFollowing(formattedFollowing);
      }
  
      // Get people who have access to you
      const { data: followerData, error: followerError } = await supabase
        .from('profile_connections')
        .select(`
          id,
          follower_id,
          status,
          created_at,
          profiles:follower_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('followed_id', user.id)
        .eq('status', 'approved')
        .eq('relationship_type', 'follow');
  
      if (followerError) {
        console.error("Error fetching follower data:", followerError);
        throw followerError;
      }
  
      if (followerData) {
        const formattedFollowers = followerData.map(item => {
          // Handle the case where profiles might be an array
          const profileData = Array.isArray(item.profiles) 
            ? item.profiles[0] || {} 
            : item.profiles || {};
            
          return {
            id: item.follower_id,
            firstName: profileData.first_name || '',
            lastName: profileData.last_name || '',
            followingSince: new Date(item.created_at).toLocaleDateString(),
            duration: calculateDuration(item.created_at),
            avatar: profileData.avatar_url || `/api/placeholder/40/40?text=${profileData.first_name?.charAt(0) || ''}${profileData.last_name?.charAt(0) || ''}`
          };
        });
        setFollowers(formattedFollowers);
      }
      
      // Get blocked users
      const { data: blockedData, error: blockedError } = await supabase
        .from('profile_connections')
        .select(`
          id,
          followed_id,
          updated_at,
          profiles:followed_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('follower_id', user.id)
        .eq('status', 'blocked')
        .eq('relationship_type', 'follow');
  
      if (blockedError) {
        console.error("Error fetching blocked data:", blockedError);
        throw blockedError;
      }
  
      if (blockedData) {
        const formattedBlocked = blockedData.map(item => {
          // Handle the case where profiles might be an array
          const profileData = Array.isArray(item.profiles) 
            ? item.profiles[0] || {} 
            : item.profiles || {};
            
          return {
            id: item.followed_id,
            firstName: profileData.first_name || '',
            lastName: profileData.last_name || '',
            blockedDate: new Date(item.updated_at).toLocaleDateString(),
            avatar: profileData.avatar_url || `/api/placeholder/40/40?text=${profileData.first_name?.charAt(0) || ''}${profileData.last_name?.charAt(0) || ''}`
          };
        });
        setBlockedUsers(formattedBlocked);
      }
    } catch (error) {
      console.error("Error loading connections data:", error);
    }
  }, [supabase, calculateDuration]);
  const loadFollowRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      // Get access requests where the current user is the recipient
      const { data, error } = await supabase
        .from('profile_connections')
        .select(`
          id,
          follower_id,
          relationship_type,
          created_at,
          profiles:follower_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('followed_id', user.id)
        .eq('status', 'pending')
        .eq('relationship_type', 'follow');
  
      if (error) {
        console.error("Error fetching follow requests:", error);
        throw error;
      }
  
      if (data) {
        const formattedRequests = data.map(request => {
          // Handle the case where profiles might be an array instead of an object
          const profileData = Array.isArray(request.profiles) 
            ? request.profiles[0] || {} 
            : request.profiles || {};
          
          return {
            id: request.id,
            requesterId: request.follower_id,
            firstName: profileData.first_name || '',
            lastName: profileData.last_name || '',
            requestDate: new Date(request.created_at).toLocaleDateString(),
            avatar: profileData.avatar_url || `/api/placeholder/40/40?text=${profileData.first_name?.charAt(0) || ''}${profileData.last_name?.charAt(0) || ''}`
          };
        });
        setFollowRequests(formattedRequests);
      }
    } catch (error) {
      console.error("Error loading access requests:", error);
    }
  }, [supabase]);

  useEffect(() => {
    getProfile();
    loadConnectionsData();
    loadFollowRequests();
  }, [getProfile, loadConnectionsData, loadFollowRequests]);

  const updateProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user');

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: profile.firstName,
          last_name: profile.lastName,
          avatar_url: avatarUrl, // Include avatar URL
          is_public: profile.isPublic,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      showSuccess('Profile updated successfully');
    } catch (error) {
      console.error("Error updating profile:", error);
      showError('Error updating profile');
    }
  };
  const handleFollowRequest = async (profileId: string) => {
    try {
      const result = await sendFollowRequest(profileId);
      
      if (result.success) {
        // Update the UI to show pending state for this specific profile
        setPendingRequestMap(prev => ({
          ...prev,
          [profileId]: true
        }));
        
        const message = result.status === 'pending' 
          ? 'Access request sent!' 
          : 'Access granted to public profile.';
        
        showSuccess(message);
        
        // If the request was automatically approved (public profile), refresh the connections data
        if (result.status === 'approved') {
          loadConnectionsData();
        }
      } else {
        showError(`Error: ${result.error || 'Failed to send request'}`);
      }
    } catch (error) {
      console.error("Error sending access request:", error);
      showError('An unexpected error occurred');
    }
  };
  
  const handleApproveRequest = async (requestId: string) => {
    try {
      const result = await approveFollowRequest(requestId);
      
      if (result.success) {
        // Update follow requests list and followers list
        await loadFollowRequests();
        await loadConnectionsData();
        showSuccess('Access request approved');
      } else {
        showError(`Error: ${result.error || 'Failed to approve request'}`);
      }
    } catch (error) {
      console.error("Error approving access request:", error);
      showError('Error approving request');
    }
  };

  const handleDenyRequest = async (requestId: string) => {
    try {
      const result = await rejectFollowRequest(requestId);
      
      if (result.success) {
        // Update follow requests list
        await loadFollowRequests();
        showSuccess('Access request denied');
      } else {
        showError(`Error: ${result.error || 'Failed to deny request'}`);
      }
    } catch (error) {
      console.error("Error denying access request:", error);
      showError('Error denying request');
    }
  };

  const handleUnfollow = async (profileId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find the connection record
      const { data, error: findError } = await supabase
        .from('profile_connections')
        .select('id')
        .eq('follower_id', user.id)
        .eq('followed_id', profileId)
        .eq('relationship_type', 'follow')
        .single();
        
      if (findError) {
        console.error("Error finding connection:", findError);
        showError('Error removing access: Connection not found');
        return;
      }
      
      // Delete the connection entirely
      const { error: updateError } = await supabase
        .from('profile_connections')
        .delete()
        .eq('id', data.id);

      if (updateError) {
        console.error("Error removing access:", updateError);
        showError('Error removing access');
        return;
      }
      
      // Refresh connections data
      await loadConnectionsData();
      showSuccess('Successfully removed access');
    } catch (error) {
      console.error("Error removing access:", error);
      showError('Error removing access');
    }
  };
  const handleBlockUser = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // First check if a connection record exists
      let connectionId: string | null = null;
      
      const { data: existingConn, error: findError } = await supabase
        .from('profile_connections')
        .select('id')
        .eq('follower_id', userId)
        .eq('followed_id', user.id)
        .eq('relationship_type', 'follow')
        .maybeSingle();
        
      if (findError) {
        console.error("Error finding connection:", findError);
      }
        
      if (existingConn) {
        connectionId = existingConn.id;
      }
      
      if (connectionId) {
        // Update existing connection to blocked
        const { error: updateError } = await supabase
          .from('profile_connections')
          .update({ 
            status: 'blocked',
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId);
          
        if (updateError) {
          console.error("Error updating connection:", updateError);
          throw updateError;
        }
      } else {
        // Create a new blocked connection
        const { error: insertError } = await supabase
          .from('profile_connections')
          .insert({
            follower_id: userId,
            followed_id: user.id,
            relationship_type: 'follow',
            status: 'blocked',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error("Error inserting connection:", insertError);
          throw insertError;
        }
      }
      
      // Refresh data
      await loadConnectionsData();
      await loadFollowRequests();
      showSuccess('User has been blocked');
    } catch (error) {
      console.error("Error blocking user:", error);
      showError('Error blocking user');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find the connection record for this blocked user
      const { data, error: findError } = await supabase
        .from('profile_connections')
        .select('id')
        .eq('follower_id', userId)
        .eq('followed_id', user.id)
        .eq('status', 'blocked')
        .eq('relationship_type', 'follow')
        .single();
        
      if (findError) {
        console.error("Error finding blocked connection:", findError);
        showError('Error unblocking: Block record not found');
        return;
      }
      
      // Delete the connection entirely
      const { error: deleteError } = await supabase
        .from('profile_connections')
        .delete()
        .eq('id', data.id);

      if (deleteError) {
        console.error("Error unblocking:", deleteError);
        showError('Error unblocking user');
        return;
      }
      
      // Refresh blocked users list
      await loadConnectionsData();
      showSuccess('User has been unblocked');
    } catch (error) {
      console.error("Error unblocking user:", error);
      showError('Error unblocking user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white">
      {/* Header with logo and avatar */}
<header className="px-5 py-4 flex items-center justify-between bg-white border-b border-gray-100">
  <div className="flex items-center gap-3">
    <Link 
      href="/dashboard" 
      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors"
      aria-label="Back to dashboard"
    >
      <ChevronLeft size={20} />
    </Link>
    <div className="h-6 flex items-center">
      {/* Text-based logo - using the orange/yellow colors */}
      <span className="text-lg font-normal">
        <span className="text-[#F05A28]">online</span>
        <span className="text-[#F5A93F]">{'//offline'}</span>
      </span>
    </div>
  </div>
  <div className="flex items-center">
    {/* User avatar in header - name removed */}
    <div className="w-8 h-8 overflow-hidden rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center relative">
  {avatarUrl ? (
    <Image 
      src={avatarUrl}
      alt="Avatar"
      fill
      sizes="32px"
      className="object-cover"
    />
  ) : (
    <User size={16} className="text-gray-400" />
  )}
</div>

  </div>
</header>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="fixed top-5 right-5 bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-sm flex items-center z-50">
          <Check size={16} className="mr-2" />
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="fixed top-5 right-5 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-sm flex items-center z-50">
          <X size={16} className="mr-2" />
          {errorMessage}
        </div>
      )}
      {/* Tab Navigation */}
      <div className="border-b border-gray-100">
        <div className="flex px-6">
          <button
            className={`py-4 text-sm font-normal border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`py-4 ml-8 text-sm font-normal border-b-2 transition-colors flex items-center ${
              activeTab === 'permissions'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('permissions')}
          >
            Permissions
            {followRequests.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-medium rounded-full h-5 min-w-5 px-1 inline-flex items-center justify-center">
                {followRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 py-6">
        {activeTab === 'profile' ? (
          <div className="space-y-8">
            {/* Profile Information */}
            <div className="bg-white border border-gray-100 rounded-sm">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-medium text-gray-900">Profile Information</h2>
              </div>
              
              {/* Profile Avatar Section */}
              <div className="flex flex-col items-center py-6">
              <div className="mb-4 relative">
  <div className="w-24 h-24 rounded-sm overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center relative">
    {avatarPreview ? (
      <Image 
        src={avatarPreview}
        alt="Avatar"
        fill
        sizes="96px"
        className="object-cover"
      />
    ) : avatarUrl ? (
      <Image 
        src={avatarUrl}
        alt="Avatar"
        fill
        sizes="96px"
        className="object-cover"
      />
    ) : (
      <User size={40} className="text-gray-400" />
    )}
  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Camera size={16} />
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-600">{profile.firstName} {profile.lastName}</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={uploadAvatar}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="block text-xs text-gray-500">First Name</label>
                    <input 
                      id="firstName"
                      className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="block text-xs text-gray-500">Last Name</label>
                    <input 
                      id="lastName"
                      className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    />
                  </div>
                </div>
                {/* Profile Visibility Toggle */}
                <div className="pt-2">
                  <label className="block text-xs text-gray-500 mb-2">Profile Visibility</label>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-normal">
                        {profile.isPublic ? 'Public Profile' : 'Private Profile'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {profile.isPublic 
                          ? 'Your content is visible to everyone' 
                          : 'Your content is only visible to approved users'}
                      </div>
                    </div>
                    <div 
                      onClick={() => setProfile(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer ${
                        profile.isPublic ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <div 
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${
                          profile.isPublic ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Profile Type */}
                <div className="pt-2">
                  <label className="block text-xs text-gray-500 mb-2">Profile Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded-sm text-blue-500 focus:ring-blue-500"
                        checked={profile.profileTypes.includes('contributor')}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...profile.profileTypes, 'contributor']
                            : profile.profileTypes.filter(t => t !== 'contributor');
                          setProfile({ ...profile, profileTypes: newTypes });
                        }}
                      />
                      <span className="text-sm">Contributor</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded-sm text-blue-500 focus:ring-blue-500"
                        checked={profile.profileTypes.includes('curator')}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...profile.profileTypes, 'curator']
                            : profile.profileTypes.filter(t => t !== 'curator');
                          setProfile({ ...profile, profileTypes: newTypes });
                        }}
                      />
                      <span className="text-sm">Curator</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            {/* Contributor Payment Section */}
            {profile.profileTypes.includes('contributor') && (
              <div className="bg-white border border-gray-100 rounded-sm">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Building size={16} className="text-blue-500" />
                  <h2 className="text-sm font-medium text-gray-900">Payment Details</h2>
                </div>
                <div className="p-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-sm p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-blue-700 mb-1">Contributor Payments Coming Soon</h3>
                        <p className="text-xs text-blue-600">
  We&apos;re working on integrating a secure payment system for our contributors. 
  You&apos;ll be able to receive payments directly for your published content through 
  our trusted payment processing partner.
</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center py-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                        <Building size={24} className="text-gray-400" />
                      </div>
                      <h3 className="text-sm font-medium mb-1">Secure Payment Processing</h3>
                      <p className="text-xs text-gray-500 max-w-xs">
                        We&apos;re partnering with leading payment providers to ensure
                        secure and timely payments for all contributors.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Curator Payment Section */}
            {profile.profileTypes.includes('curator') && (
              <div className="bg-white border border-gray-100 rounded-sm">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <CreditCard size={16} className="text-blue-500" />
                  <h2 className="text-sm font-medium text-gray-900">Subscription Payment</h2>
                </div>
                <div className="p-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-sm p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-blue-700 mb-1">Secure Payment Processing Coming Soon</h3>
                        <p className="text-xs text-blue-600">
  We&apos;re integrating with Stripe for secure and seamless payment processing. 
  Your subscription details will be managed securely, and you&apos;ll have access 
  to payment history and receipts.
</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-sm border border-gray-200 divide-y divide-gray-200">
                    <div className="px-4 py-3 flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-medium">Quarterly Subscription</h3>
                        <p className="text-xs text-gray-500">$25.00 per quarter</p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-sm">Current Plan</span>
                    </div>
                    
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">Next billing date</span>
                        <span className="text-xs font-medium">June 15, 2025</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Payment method</span>
                        <span className="text-xs font-medium">Pending setup</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <button 
              onClick={updateProfile}
              className="w-full bg-blue-500 text-white py-2 rounded-sm hover:bg-blue-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Search and Find People */}
            <div className="bg-white border border-gray-100 rounded-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Search size={16} className="text-blue-500" />
                <h2 className="text-sm font-medium text-gray-900">Find Private Profiles</h2>
              </div>
              <div className="p-4">
                <div className="relative">
                  <input
                    placeholder="Search for private profiles..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchProfiles(e.target.value);
                    }}
                    className="w-full pl-10 border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                </div>
                
                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {searchResults.map(profile => (
                      <div key={profile.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-sm flex items-center justify-center text-blue-500">
                            {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-normal">{profile.firstName} {profile.lastName}</p>
                            {profile.isPrivate && (
                              <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                <Lock size={12} className="mr-1" /> Private profile
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {pendingRequestMap[profile.id] ? (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-sm border border-blue-100">
                            Request Pending
                          </span>
                        ) : (
                          profile.isPrivate ? (
                            <button
                              onClick={() => handleFollowRequest(profile.id)}
                              className="px-3 py-1 text-xs bg-blue-500 text-white rounded-sm hover:bg-blue-600"
                            >
                              Request Access
                            </button>
                          ) : null
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Pending Access Requests */}
            {followRequests.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-sm">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Bell size={16} className="text-red-500" />
                  <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    Access Requests
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      {followRequests.length}
                    </span>
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  {followRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between p-3 rounded-sm bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-sm flex items-center justify-center text-blue-500">
                          {request.firstName.charAt(0)}{request.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-normal">{request.firstName} {request.lastName}</p>
                          <p className="text-xs text-gray-500">Requested on {request.requestDate}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApproveRequest(request.id)}
                          className="px-3 py-1 text-xs bg-green-500 text-white rounded-sm hover:bg-green-600"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleDenyRequest(request.id)}
                          className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-sm hover:bg-gray-300"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Private Profiles You Have Access To */}
            <div className="bg-white border border-gray-100 rounded-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Shield size={16} className="text-blue-500" />
                <h2 className="text-sm font-medium text-gray-900">Private Profiles You Have Access To</h2>
              </div>
              <div className="p-4 space-y-3">
                {following.filter(profile => profile.isPrivate).length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">You don&apos;t have access to any private profiles yet</p>
                ) : (
                  following.filter(profile => profile.isPrivate).map(profile => (
                    <div key={profile.id} className="flex items-center justify-between p-3 rounded-sm bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-sm flex items-center justify-center text-blue-500">
                          {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-normal">{profile.firstName} {profile.lastName}</p>
                          <div className="text-xs text-gray-500 flex items-center mt-0.5">
                            <Lock size={10} className="mr-1" /> 
                            <span>Private profile • Access granted {profile.followingSince}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleUnfollow(profile.id)}
                        className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-sm hover:bg-gray-300"
                      >
                        Remove Access
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* People Who Have Access to You */}
            <div className="bg-white border border-gray-100 rounded-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <UserCheck size={16} className="text-blue-500" />
                <h2 className="text-sm font-medium text-gray-900">People Who Have Access to Your Content</h2>
              </div>
              <div className="p-4 space-y-3">
                {followers.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">No one has access to your content yet</p>
                ) : (
                  followers.map(follower => (
                    <div key={follower.id} className="flex items-center justify-between p-3 rounded-sm bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-sm flex items-center justify-center text-blue-500">
                          {follower.firstName.charAt(0)}{follower.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-normal">{follower.firstName} {follower.lastName}</p>
                          <p className="text-xs text-gray-500">Has access for {follower.duration}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleBlockUser(follower.id)}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded-sm hover:bg-red-600"
                      >
                        Block
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* Blocked Users section */}
            {blockedUsers.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-sm">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <UserX size={16} className="text-red-500" />
                  <h2 className="text-sm font-medium text-gray-900">Blocked Users</h2>
                </div>
                <div className="p-4 space-y-3">
                  {blockedUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-sm bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-sm flex items-center justify-center text-red-500">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-normal">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500">Blocked on {user.blockedDate}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleUnblockUser(user.id)}
                        className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-sm hover:bg-gray-300"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Information about permissions */}
            <div className="bg-blue-50 border border-blue-100 rounded-sm px-4 py-4">
              <h3 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-1">
                <Lock size={14} /> 
                About Permissions
              </h3>
              <p className="text-xs text-blue-600 mb-2">
                Permissions in online//offline control who can view your content and communicate with you:
              </p>
              <ul className="text-xs text-blue-600 space-y-1 list-disc pl-5">
                <li>Public profiles are visible to everyone</li>
                <li>Private profiles require access requests</li>
                <li>You can only send communications to users who have granted you access</li>
                <li>Blocking a user prevents them from requesting access</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
