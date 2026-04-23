"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search, Lock, Shield, User,
  Bell, CreditCard, Building,
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

interface ProfileState {
  firstName: string;
  lastName: string;
  profileTypes: string[];
  isPublic: boolean;
  bankInfo: {
    accountNumber: string;
    routingNumber: string;
    accountType: string;
  };
  curatorPaymentInfo: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
  };
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileState>({
    firstName: '',
    lastName: '',
    profileTypes: [],
    isPublic: true,
    bankInfo: { accountNumber: '', routingNumber: '', accountType: 'checking' },
    curatorPaymentInfo: { cardNumber: '', expiryDate: '', cvv: '' },
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'permissions'>('profile');
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Following[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [pendingRequestMap, setPendingRequestMap] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

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
          .select(`*, profile_types (type)`)
          .eq('id', user.id)
          .single();
        if (error) { console.error('Error fetching profile:', error); return; }
        if (data) {
          setProfile({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            profileTypes: data.profile_types?.map((pt: { type: string }) => pt.type) || [],
            isPublic: data.is_public ?? true,
            bankInfo: data.bank_info || { accountNumber: '', routingNumber: '', accountType: 'checking' },
            curatorPaymentInfo: data.curator_payment_info || { cardNumber: '', expiryDate: '', cvv: '' },
          });
          if (data.avatar_url) { setAvatarUrl(data.avatar_url); setAvatarPreview(data.avatar_url); }
        }
      }
    } catch (error) {
      console.error('Error in getProfile:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const newAvatarUrl = publicUrlData.publicUrl;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (updateError) throw updateError;
      setAvatarUrl(newAvatarUrl);
      showSuccess('Avatar updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showError('Error uploading avatar');
    } finally {
      setUploading(false);
    }
  };

  const searchProfiles = async (query: string) => {
    if (query.length < 1) { setSearchResults([]); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, is_public, avatar_url')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .eq('is_public', false)
        .neq('id', user.id)
        .limit(10);
      if (error) throw error;
      setSearchResults((data || []).map(p => ({
        id: p.id,
        firstName: p.first_name || '',
        lastName: p.last_name || '',
        avatar: p.avatar_url || '',
        isPrivate: true,
      })));
    } catch (error) {
      console.error('Error searching profiles:', error);
    }
  };

  const loadConnectionsData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: followingData, error: followingError } = await supabase
        .from('profile_connections')
        .select(`id, followed_id, status, created_at, profiles:followed_id (id, first_name, last_name, avatar_url, is_public)`)
        .eq('follower_id', user.id)
        .eq('status', 'approved')
        .eq('relationship_type', 'follow');
      if (followingError) throw followingError;
      if (followingData) {
        setFollowing(followingData.map(item => {
          const p = Array.isArray(item.profiles) ? item.profiles[0] || {} : item.profiles || {};
          return {
            id: item.followed_id,
            firstName: (p as {first_name?: string}).first_name || '',
            lastName: (p as {last_name?: string}).last_name || '',
            followingSince: new Date(item.created_at).toLocaleDateString(),
            avatar: (p as {avatar_url?: string}).avatar_url || '',
            isPrivate: !(p as {is_public?: boolean}).is_public,
          };
        }));
      }

      const { data: followerData, error: followerError } = await supabase
        .from('profile_connections')
        .select(`id, follower_id, status, created_at, profiles:follower_id (id, first_name, last_name, avatar_url)`)
        .eq('followed_id', user.id)
        .eq('status', 'approved')
        .eq('relationship_type', 'follow');
      if (followerError) throw followerError;
      if (followerData) {
        setFollowers(followerData.map(item => {
          const p = Array.isArray(item.profiles) ? item.profiles[0] || {} : item.profiles || {};
          return {
            id: item.follower_id,
            firstName: (p as {first_name?: string}).first_name || '',
            lastName: (p as {last_name?: string}).last_name || '',
            followingSince: new Date(item.created_at).toLocaleDateString(),
            duration: calculateDuration(item.created_at),
            avatar: (p as {avatar_url?: string}).avatar_url || '',
          };
        }));
      }

      const { data: blockedData, error: blockedError } = await supabase
        .from('profile_connections')
        .select(`id, followed_id, updated_at, profiles:followed_id (id, first_name, last_name, avatar_url)`)
        .eq('follower_id', user.id)
        .eq('status', 'blocked')
        .eq('relationship_type', 'follow');
      if (blockedError) throw blockedError;
      if (blockedData) {
        setBlockedUsers(blockedData.map(item => {
          const p = Array.isArray(item.profiles) ? item.profiles[0] || {} : item.profiles || {};
          return {
            id: item.followed_id,
            firstName: (p as {first_name?: string}).first_name || '',
            lastName: (p as {last_name?: string}).last_name || '',
            blockedDate: new Date(item.updated_at).toLocaleDateString(),
            avatar: (p as {avatar_url?: string}).avatar_url || '',
          };
        }));
      }
    } catch (error) {
      console.error('Error loading connections data:', error);
    }
  }, [supabase, calculateDuration]);

  const loadFollowRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('profile_connections')
        .select(`id, follower_id, relationship_type, created_at, profiles:follower_id (id, first_name, last_name, avatar_url)`)
        .eq('followed_id', user.id)
        .eq('status', 'pending')
        .eq('relationship_type', 'follow');
      if (error) throw error;
      setFollowRequests((data || []).map(req => {
        const p = Array.isArray(req.profiles) ? req.profiles[0] || {} : req.profiles || {};
        return {
          id: req.id,
          requesterId: req.follower_id,
          firstName: (p as {first_name?: string}).first_name || '',
          lastName: (p as {last_name?: string}).last_name || '',
          requestDate: new Date(req.created_at).toLocaleDateString(),
          avatar: (p as {avatar_url?: string}).avatar_url || '',
        };
      }));
    } catch (error) {
      console.error('Error loading follow requests:', error);
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
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, first_name: profile.firstName, last_name: profile.lastName, avatar_url: avatarUrl, is_public: profile.isPublic, updated_at: new Date().toISOString() });
      if (error) throw error;
      showSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Error updating profile');
    }
  };

  const handleFollowRequest = async (profileId: string) => {
    try {
      const result = await sendFollowRequest(profileId);
      if (result.success) {
        setPendingRequestMap(prev => ({ ...prev, [profileId]: true }));
        showSuccess(result.status === 'pending' ? 'Access request sent!' : 'Access granted to public profile.');
        if (result.status === 'approved') loadConnectionsData();
      } else {
        showError(`Error: ${result.error || 'Failed to send request'}`);
      }
    } catch (error) {
      console.error('Error sending access request:', error);
      showError('An unexpected error occurred');
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const result = await approveFollowRequest(requestId);
      if (result.success) {
        await loadFollowRequests();
        await loadConnectionsData();
        showSuccess('Access request approved');
      } else {
        showError(`Error: ${result.error || 'Failed to approve request'}`);
      }
    } catch (error) {
      console.error('Error approving access request:', error);
      showError('Error approving request');
    }
  };

  const handleDenyRequest = async (requestId: string) => {
    try {
      const result = await rejectFollowRequest(requestId);
      if (result.success) {
        await loadFollowRequests();
        showSuccess('Access request denied');
      } else {
        showError(`Error: ${result.error || 'Failed to deny request'}`);
      }
    } catch (error) {
      console.error('Error denying access request:', error);
      showError('Error denying request');
    }
  };

  const handleUnfollow = async (profileId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error: findError } = await supabase
        .from('profile_connections')
        .select('id')
        .eq('follower_id', user.id)
        .eq('followed_id', profileId)
        .eq('relationship_type', 'follow')
        .single();
      if (findError) { showError('Error removing access: Connection not found'); return; }
      const { error } = await supabase.from('profile_connections').delete().eq('id', data.id);
      if (error) { showError('Error removing access'); return; }
      await loadConnectionsData();
      showSuccess('Successfully removed access');
    } catch (error) {
      console.error('Error removing access:', error);
      showError('Error removing access');
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: existingConn } = await supabase
        .from('profile_connections')
        .select('id')
        .eq('follower_id', userId)
        .eq('followed_id', user.id)
        .eq('relationship_type', 'follow')
        .maybeSingle();
      if (existingConn) {
        const { error } = await supabase
          .from('profile_connections')
          .update({ status: 'blocked', updated_at: new Date().toISOString() })
          .eq('id', existingConn.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profile_connections')
          .insert({ follower_id: userId, followed_id: user.id, relationship_type: 'follow', status: 'blocked', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        if (error) throw error;
      }
      await loadConnectionsData();
      await loadFollowRequests();
      showSuccess('User has been blocked');
    } catch (error) {
      console.error('Error blocking user:', error);
      showError('Error blocking user');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error: findError } = await supabase
        .from('profile_connections')
        .select('id')
        .eq('follower_id', userId)
        .eq('followed_id', user.id)
        .eq('status', 'blocked')
        .eq('relationship_type', 'follow')
        .single();
      if (findError) { showError('Error unblocking: Block record not found'); return; }
      const { error } = await supabase.from('profile_connections').delete().eq('id', data.id);
      if (error) { showError('Error unblocking user'); return; }
      await loadConnectionsData();
      showSuccess('User has been unblocked');
    } catch (error) {
      console.error('Error unblocking user:', error);
      showError('Error unblocking user');
    }
  };

  return null;
}
