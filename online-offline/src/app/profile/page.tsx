"use client";
import React from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Lock, Clock, User, Shield } from 'lucide-react';
import { sendFollowRequest, getPendingFollowRequests, approveFollowRequest, rejectFollowRequest } from '@/lib/supabase/profiles';

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

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    profileTypes: [] as string[],
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

  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Following[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [pendingRequestMap, setPendingRequestMap] = useState<Record<string, boolean>>({});

  const supabase = createClientComponentClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    isPrivate: boolean;
  }>>([]);

  useEffect(() => {
    getProfile();
    loadConnectionsData();
    loadFollowRequests();
  }, []);

  function calculateDuration(startDate: string): string {
    const start = new Date(startDate);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
    return months <= 0 ? 'Less than a month' : `${months} month${months !== 1 ? 's' : ''}`;
  }

  async function getProfile() {
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
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }
  
  const updateBankInfo = (field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      bankInfo: {
        ...prev.bankInfo,
        [field]: value
      }
    }));
  };
  
  const updateCuratorPayment = (field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      curatorPaymentInfo: {
        ...prev.curatorPaymentInfo,
        [field]: value
      }
    }));
  };
  async function searchProfiles(query: string) {
    try {
      if (query.length < 1) {
        setSearchResults([]);
        return;
      }
    
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
    
      console.log("Searching with query:", query);
      
      // Now try the normal search
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
      
      console.log("Private profile search results:", data);
      
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
      console.log('Error searching profiles:', error);
    }
  }

  async function loadConnectionsData() {
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
  
      if (followingError) throw followingError;
  
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
  
      if (followerError) throw followerError;
  
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
  
      if (blockedError) throw blockedError;
  
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
  }
  async function loadFollowRequests() {
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
  
      if (error) throw error;
  
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
  }

  async function updateProfile() {
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
          bank_info: profile.bankInfo,
          curator_payment_info: profile.curatorPaymentInfo,
          is_public: profile.isPublic,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      alert('Profile updated!');
    } catch (error) {
      console.log(error);
      alert('Error updating profile!');
    }
  }
  
  async function handleFollowRequest(profileId: string) {
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
        
        alert(message);
        
        // If the request was automatically approved (public profile), refresh the connections data
        if (result.status === 'approved') {
          loadConnectionsData();
        }
      } else {
        alert(`Error: ${result.error || 'Failed to send request'}`);
      }
    } catch (error) {
      console.error("Error sending access request:", error);
      alert('An unexpected error occurred.');
    }
  }
  
  async function handleApproveRequest(requestId: string) {
    try {
      const result = await approveFollowRequest(requestId);
      
      if (result.success) {
        // Update follow requests list and followers list
        await loadFollowRequests();
        await loadConnectionsData();
        alert('Access request approved');
      } else {
        alert(`Error: ${result.error || 'Failed to approve request'}`);
      }
    } catch (error) {
      console.error("Error approving access request:", error);
      alert('Error approving request');
    }
  }

  async function handleDenyRequest(requestId: string) {
    try {
      const result = await rejectFollowRequest(requestId);
      
      if (result.success) {
        // Update follow requests list
        await loadFollowRequests();
        alert('Access request denied');
      } else {
        alert(`Error: ${result.error || 'Failed to deny request'}`);
      }
    } catch (error) {
      console.error("Error denying access request:", error);
      alert('Error denying request');
    }
  }
  async function handleUnfollow(profileId: string) {
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
        alert('Error removing access: Connection not found');
        return;
      }
      
      // Delete the connection entirely
      const { error: updateError } = await supabase
        .from('profile_connections')
        .delete()
        .eq('id', data.id);

      if (updateError) {
        console.error("Error removing access:", updateError);
        alert('Error removing access');
        return;
      }
      
      // Refresh connections data
      await loadConnectionsData();
      alert('Successfully removed access');
    } catch (error) {
      console.error("Error removing access:", error);
      alert('Error removing access');
    }
  }

  async function handleBlockUser(userId: string) {
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
        
      if (!findError && existingConn) {
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
          
        if (updateError) throw updateError;
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
          
        if (insertError) throw insertError;
      }
      
      // Refresh data
      await loadConnectionsData();
      await loadFollowRequests();
      alert('User has been blocked');
    } catch (error) {
      console.error("Error blocking user:", error);
      alert('Error blocking user');
    }
  }

  async function handleUnblockUser(userId: string) {
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
        alert('Error unblocking: Block record not found');
        return;
      }
      
      // Delete the connection entirely
      const { error: deleteError } = await supabase
        .from('profile_connections')
        .delete()
        .eq('id', data.id);

      if (deleteError) {
        console.error("Error unblocking:", deleteError);
        alert('Error unblocking user');
        return;
      }
      
      // Refresh blocked users list
      await loadConnectionsData();
      alert('User has been unblocked');
    } catch (error) {
      console.error("Error unblocking user:", error);
      alert('Error unblocking user');
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <Link 
          href="/dashboard" 
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Back to Dashboard
        </Link>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="connections">
            Permissions
            {followRequests.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {followRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setProfile({ ...profile, firstName: e.target.value })}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setProfile({ ...profile, lastName: e.target.value })}
                  />
                </div>
              </div>

              {/* Profile Visibility Toggle */}
              <div className="space-y-2">
                <Label>Profile Visibility</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm">
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
              
              <div className="space-y-2">
                <Label>Profile Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profile.profileTypes.includes('contributor')}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newTypes = e.target.checked
                          ? [...profile.profileTypes, 'contributor']
                          : profile.profileTypes.filter(t => t !== 'contributor');
                        setProfile({ ...profile, profileTypes: newTypes });
                      }}
                    />
                    Contributor
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profile.profileTypes.includes('curator')}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newTypes = e.target.checked
                          ? [...profile.profileTypes, 'curator']
                          : profile.profileTypes.filter(t => t !== 'curator');
                        setProfile({ ...profile, profileTypes: newTypes });
                      }}
                    />
                    Curator
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contributor Payment Section */}
          {profile.profileTypes.includes('contributor') && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input 
                      id="accountNumber"
                      type="text"
                      value={profile.bankInfo.accountNumber}
                      onChange={(e) => updateBankInfo('accountNumber', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="routingNumber">Routing Number</Label>
                    <Input 
                      id="routingNumber"
                      type="text"
                      value={profile.bankInfo.routingNumber}
                      onChange={(e) => updateBankInfo('routingNumber', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type</Label>
                    <select
                      id="accountType"
                      value={profile.bankInfo.accountType}
                      onChange={(e) => updateBankInfo('accountType', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Curator Payment Section */}
          {profile.profileTypes.includes('curator') && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Subscription Payment</CardTitle>
                <p className="text-sm text-gray-500">$25.00 per period subscription fee</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input 
                      id="cardNumber"
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={profile.curatorPaymentInfo.cardNumber}
                      onChange={(e) => updateCuratorPayment('cardNumber', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input 
                        id="expiryDate"
                        type="text"
                        placeholder="MM/YY"
                        value={profile.curatorPaymentInfo.expiryDate}
                        onChange={(e) => updateCuratorPayment('expiryDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input 
                        id="cvv"
                        type="text"
                        placeholder="123"
                        value={profile.curatorPaymentInfo.cvv}
                        onChange={(e) => updateCuratorPayment('cvv', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Save All Changes button */}
          <div className="mt-6">
            <Button onClick={updateProfile} className="w-full">
              Save All Changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="connections">
          {/* Search section at the top for easy discovery */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Find People</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Input
                  placeholder="Search for people by name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchProfiles(e.target.value);
                  }}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
              </div>
              
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2 border rounded-md p-2">
                  {searchResults.map(profile => (
                    <div key={profile.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
                          {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{profile.firstName} {profile.lastName}</p>
                          {profile.isPrivate && (
                            <div className="text-xs text-gray-500 flex items-center mt-0.5">
                              <Lock size={12} className="mr-1" /> Private profile
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {pendingRequestMap[profile.id] ? (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                          Request Pending
                        </span>
                      ) : (
                        profile.isPrivate ? (
                          <Button
                            onClick={() => handleFollowRequest(profile.id)}
                            className="text-xs py-1 px-3 h-8"
                          >
                            Request Access
                          </Button>
                        ) : null  // Don't show any button for public profiles
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Requests section - only shown if there are pending requests */}
          {followRequests.length > 0 && (
            <Card className="mb-6">
              <CardHeader className="py-4">
                <CardTitle className="flex items-center gap-2">
                  <span>Access Requests</span>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    {followRequests.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {followRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
                          {request.firstName.charAt(0)}{request.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{request.firstName} {request.lastName}</p>
                          <p className="text-xs text-gray-500">Requested on {request.requestDate}</p>
                        </div>
                      </div>
                      <div className="space-x-2">
                        <Button 
                          onClick={() => handleApproveRequest(request.id)}
                          className="bg-green-500 hover:bg-green-600 text-white h-8 px-3 py-1 text-xs"
                        >
                          Approve
                        </Button>
                        <Button 
                          onClick={() => handleDenyRequest(request.id)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 h-8 px-3 py-1 text-xs"
                        >
                          Deny
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Private Profiles You Have Access To */}
          <Card className="mb-6">
            <CardHeader className="py-4">
              <CardTitle className="flex items-center gap-2">
                <Shield size={16} className="text-blue-500" />
                <span>Private Profiles You Have Access To</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {following.filter(profile => profile.isPrivate).length === 0 ? (
                  <p className="text-gray-500 py-2">You don't have access to any private profiles yet</p>
                ) : (
                  following.filter(profile => profile.isPrivate).map(profile => (
                    <div key={profile.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
                          {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{profile.firstName} {profile.lastName}</p>
                          <p className="text-xs text-gray-500">
                            <span className="flex items-center">
                              <Lock size={10} className="mr-1" /> 
                              Private profile • Access granted {profile.followingSince}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleUnfollow(profile.id)}
                        className="border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 text-xs h-8 px-3 py-1"
                      >
                        Remove Access
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* People Who Have Access to You */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle>People Who Have Access to Your Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {followers.length === 0 ? (
                  <p className="text-gray-500 py-2">No one has access to your content yet</p>
                ) : (
                  followers.map(follower => (
                    <div key={follower.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
                          {follower.firstName.charAt(0)}{follower.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{follower.firstName} {follower.lastName}</p>
                          <p className="text-xs text-gray-500">Has access for {follower.duration}</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleBlockUser(follower.id)}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs h-8 px-3 py-1"
                      >
                        Block
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Blocked Users section - only shown if there are blocked users */}
          {blockedUsers.length > 0 && (
            <Card className="mt-6">
              <CardHeader className="py-4">
                <CardTitle>Blocked Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {blockedUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-700">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500">Blocked on {user.blockedDate}</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleUnblockUser(user.id)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs h-8 px-3 py-1"
                      >
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Information about permissions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-700 mb-2">About Permissions</h3>
            <p className="text-sm text-blue-600 mb-2">
              Permissions in online//offline control who can view your content and communicate with you:
            </p>
            <ul className="text-sm text-blue-600 space-y-1 list-disc pl-5">
              <li>Public profiles are visible to everyone</li>
              <li>Private profiles require access requests</li>
              <li>You can only send communications to users who have granted you access</li>
              <li>Blocking a user prevents them from requesting access</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}