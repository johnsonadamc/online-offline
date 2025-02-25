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
import { Search } from 'lucide-react';

interface Subscriber {
  id: string;
  firstName: string;
  lastName: string;
  followingSince: string;
  duration: string;
  avatar: string;
}

interface FollowRequest {
  id: string;
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

interface DatabaseProfile {
  id: string;
  first_name: string;
  last_name: string;
}

interface SubscriptionData {
  subscriber_id: string;
  subscribed_at: string;
  profiles: DatabaseProfile;
}

interface BlockedData extends Omit<SubscriptionData, 'subscribed_at'> {
  blocked_at: string;
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

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  
  const supabase = createClientComponentClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  }>>([]);

  useEffect(() => {
    getProfile();
    getSubscribers();
  }, []);

  function calculateDuration(startDate: string): string {
    const start = new Date(startDate);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
    return `${months} months`;
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

  async function searchCurators(query: string) {
    try {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
  
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name
        `)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .neq('id', user.id) // Don't show current user
        .limit(5);
  
      if (error) throw error;
  
      if (data) {
        setSearchResults(data.map(profile => ({
          id: profile.id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          avatar: '/api/placeholder/32/32' // Placeholder avatar
        })));
      }
    } catch (error) {
      console.log('Error searching curators:', error);
    }
  }

  async function getSubscribers() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get active subscribers
      const { data: subsData } = await supabase
        .from('subscriptions')
        .select(`
          subscriber_id,
          subscribed_at,
          profiles:profiles!subscriptions_subscriber_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .eq('creator_id', user.id)
        .eq('status', 'active');

      if (subsData) {
        const formattedSubs = (subsData as unknown as SubscriptionData[]).map(sub => ({
          id: sub.subscriber_id,
          firstName: sub.profiles.first_name,
          lastName: sub.profiles.last_name,
          followingSince: new Date(sub.subscribed_at).toLocaleDateString(),
          duration: calculateDuration(sub.subscribed_at),
          avatar: '/api/placeholder/32/32'
        }));
        setSubscribers(formattedSubs);
      }

      // Get pending requests
      const { data: requestsData } = await supabase
        .from('subscriptions')
        .select(`
          subscriber_id,
          subscribed_at,
          profiles:profiles!subscriptions_subscriber_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .eq('creator_id', user.id)
        .eq('status', 'pending');

      if (requestsData) {
        const formattedRequests = (requestsData as unknown as SubscriptionData[]).map(req => ({
          id: req.subscriber_id,
          firstName: req.profiles.first_name,
          lastName: req.profiles.last_name,
          requestDate: new Date(req.subscribed_at).toLocaleDateString(),
          avatar: '/api/placeholder/32/32'
        }));
        setFollowRequests(formattedRequests);
      }

      // Get blocked users
      const { data: blockedData } = await supabase
        .from('subscriptions')
        .select(`
          subscriber_id,
          blocked_at,
          profiles:profiles!subscriptions_subscriber_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .eq('creator_id', user.id)
        .eq('status', 'blocked');

      if (blockedData) {
        const formattedBlocked = (blockedData as unknown as BlockedData[]).map(block => ({
          id: block.subscriber_id,
          firstName: block.profiles.first_name,
          lastName: block.profiles.last_name,
          blockedDate: new Date(block.blocked_at).toLocaleDateString(),
          avatar: '/api/placeholder/32/32'
        }));
        setBlockedUsers(formattedBlocked);
      }
    } catch (error) {
      console.log(error);
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

  async function handleFollowCurator(curatorId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          subscriber_id: user.id,
          creator_id: curatorId,
          status: profile.isPublic ? 'active' : 'pending'
        });
  
      if (error) throw error;
  
      // Refresh subscribers list
      await getSubscribers();
      setSearchResults([]); // Clear search results
      setSearchQuery(''); // Clear search query
  
      alert(profile.isPublic ? 'Successfully followed curator!' : 'Follow request sent!');
    } catch (error) {
      console.log('Error following curator:', error);
      alert('Error following curator');
    }
  }

  async function handleApproveRequest(requestId: string) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('subscriber_id', requestId);

      if (error) throw error;
      await getSubscribers(); // Refresh lists
    } catch (error) {
      console.log(error);
      alert('Error approving request');
    }
  }

  async function handleDenyRequest(requestId: string) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('subscriber_id', requestId);

      if (error) throw error;
      await getSubscribers(); // Refresh lists
    } catch (error) {
      console.log(error);
      alert('Error denying request');
    }
  }

  async function handleBlockUser(userId: string) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'blocked',
          blocked_at: new Date().toISOString()
        })
        .eq('subscriber_id', userId);

      if (error) throw error;
      await getSubscribers(); // Refresh lists
    } catch (error) {
      console.log(error);
      alert('Error blocking user');
    }
  }

  async function handleUnblockUser(userId: string) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'active',
          blocked_at: null
        })
        .eq('subscriber_id', userId);

      if (error) throw error;
      await getSubscribers(); // Refresh lists
    } catch (error) {
      console.log(error);
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
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
        </TabsList>

    <TabsContent value="profile">
         
          {/* Contributor Payment Section */}
          {profile.profileTypes.includes('contributor') && (
            <Card className="mb-6">
              {/* Your existing contributor payment content */}
            </Card>
          )}

          {/* Curator Payment Section */}
          {profile.profileTypes.includes('curator') && (
            <Card className="mb-6">
              {/* Your existing curator payment content */}
            </Card>
          )}

      <div className="mt-6">
          <Button onClick={updateProfile} className="w-full">
            Save All Changes
          </Button>
       </div>
    </TabsContent>

<TabsContent value="subscribers">
<Card className="mb-6">
  <CardHeader>
    <CardTitle>Search Curators</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="relative">
      <Input
        placeholder="Search curators by name..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          searchCurators(e.target.value);
        }}
        className="pl-10"
      />
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
    </div>
    <div className="mt-4 space-y-2">
      {searchResults.map(curator => (
        <div key={curator.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <img
              src={curator.avatar}
              alt={`${curator.firstName}'s avatar`}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-medium">{curator.firstName} {curator.lastName}</p>
            </div>
          </div>
          <Button 
            onClick={() => handleFollowCurator(curator.id)}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Follow
          </Button>
        </div>
      ))}
    </div>
  </CardContent>
</Card>

  <Card className="mb-6">
    <CardHeader>
      <CardTitle>Subscribers</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {subscribers.length === 0 ? (
          <p className="text-gray-500">No subscribers yet</p>
        ) : (
          subscribers.map(subscriber => (
            <div key={subscriber.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <img
                  src={subscriber.avatar}
                  alt={`${subscriber.firstName}'s avatar`}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium">{subscriber.firstName} {subscriber.lastName}</p>
                  <p className="text-sm text-gray-500">Following for {subscriber.duration}</p>
                </div>
              </div>
              <Button 
                onClick={() => handleBlockUser(subscriber.id)}
                className="bg-red-500 hover:bg-red-600"
              >
                Block
              </Button>
            </div>
          ))
        )}
      </div>
    </CardContent>
  </Card>

  {followRequests.length > 0 && (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Follow Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {followRequests.map(request => (
            <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <img
                  src={request.avatar}
                  alt={`${request.firstName}'s avatar`}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium">{request.firstName} {request.lastName}</p>
                  <p className="text-sm text-gray-500">Requested on {request.requestDate}</p>
                </div>
              </div>
              <div className="space-x-2">
                <Button 
                  onClick={() => handleApproveRequest(request.id)}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Approve
                </Button>
                <Button 
                  onClick={() => handleDenyRequest(request.id)}
                  className="bg-red-500 hover:bg-red-600"
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

  {blockedUsers.length > 0 && (
    <Card>
      <CardHeader>
        <CardTitle>Blocked Users</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {blockedUsers.map(user => (
            <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <img
                  src={user.avatar}
                  alt={`${user.firstName}'s avatar`}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-gray-500">Blocked on {user.blockedDate}</p>
                </div>
              </div>
              <Button 
                onClick={() => handleUnblockUser(user.id)}
              >
                Unblock
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )}
</TabsContent>

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
                ? 'Your profile is visible to everyone' 
                : 'Your profile is only visible to approved followers'}
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

  
</TabsContent>
      </Tabs>
    </div>
  );
}