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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ground-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '2px solid var(--neon-amber)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--paper-secondary)', opacity: 0.6 }}>Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground-base)', fontFamily: 'var(--font-sans)' }}>
      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,169,63,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Toast messages */}
      {successMessage && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 2, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={14} color="#10b981" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#10b981' }}>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 2, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <X size={14} color="#ef4444" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#ef4444' }}>{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1, padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Link href="/dashboard" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--paper-secondary)', textDecoration: 'none', opacity: 0.7 }}>
            ← Dashboard
          </Link>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--paper-primary)', letterSpacing: '-0.01em' }}>online//offline</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--neon-amber)', background: 'rgba(245,169,63,0.1)', border: '1px solid rgba(245,169,63,0.25)', borderRadius: 2, padding: '3px 8px' }}>Profile</span>
        </div>

        {/* Rule */}
        <div style={{ height: 1, background: 'var(--rule-color)', opacity: 0.3, marginBottom: 0 }} />

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--rule-color)', opacity: 1 }}>
          {(['profile', 'permissions'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ position: 'relative', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: activeTab === tab ? 'var(--neon-amber)' : 'var(--paper-secondary)', opacity: activeTab === tab ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              {tab === 'permissions' ? 'Permissions' : 'Profile'}
              {tab === 'permissions' && followRequests.length > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 9, borderRadius: 99, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>{followRequests.length}</span>
              )}
              {activeTab === tab && <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: 'var(--neon-amber)' }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: 16, paddingBottom: 32 }}>
        {activeTab === 'profile' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Avatar + name card */}
            <div style={{ background: 'var(--lt-surface)', border: '1px solid var(--rule-color)', borderRadius: 2 }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--rule-color)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--neon-amber)', opacity: 0.8 }}>Identity</div>

              {/* Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 14px 8px' }}>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <div style={{ width: 80, height: 80, borderRadius: 2, overflow: 'hidden', border: '1px solid var(--rule-color)', background: 'var(--ground-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {avatarPreview || avatarUrl ? (
                      <Image src={avatarPreview || avatarUrl || ''} alt="Avatar" fill sizes="80px" style={{ objectFit: 'cover' }} />
                    ) : (
                      <User size={32} color="var(--paper-secondary)" />
                    )}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ position: 'absolute', bottom: -6, right: -6, width: 24, height: 24, borderRadius: '50%', background: 'var(--neon-amber)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {uploading ? <div style={{ width: 12, height: 12, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <Camera size={13} color="#000" />}
                  </button>
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--paper-secondary)', opacity: 0.7 }}>{profile.firstName} {profile.lastName}</span>
                <input type="file" ref={fileInputRef} onChange={uploadAvatar} accept="image/*" style={{ display: 'none' }} />
              </div>

              {/* Name fields */}
              <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[{ label: 'First Name', key: 'firstName' }, { label: 'Last Name', key: 'lastName' }].map(({ label, key }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--paper-secondary)', opacity: 0.6, marginBottom: 5 }}>{label}</label>
                    <input
                      value={profile[key as 'firstName' | 'lastName']}
                      onChange={e => setProfile(prev => ({ ...prev, [key]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--ground-raised)', border: '1px solid var(--rule-color)', borderRadius: 2, color: 'var(--paper-primary)', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--neon-amber)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--rule-color)'; }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Visibility + type card */}
            <div style={{ background: 'var(--lt-surface)', border: '1px solid var(--rule-color)', borderRadius: 2 }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--rule-color)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--neon-amber)', opacity: 0.8 }}>Settings</div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Visibility toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--paper-primary)', marginBottom: 2 }}>{profile.isPublic ? 'Public Profile' : 'Private Profile'}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-secondary)', opacity: 0.6 }}>{profile.isPublic ? 'Visible to everyone' : 'Approved users only'}</div>
                  </div>
                  <div onClick={() => setProfile(prev => ({ ...prev, isPublic: !prev.isPublic }))} style={{ width: 40, height: 22, borderRadius: 11, background: profile.isPublic ? 'var(--neon-amber)' : 'var(--ground-raised)', border: '1px solid var(--rule-color)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                    <div style={{ position: 'absolute', top: 2, left: profile.isPublic ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: profile.isPublic ? '#000' : 'var(--paper-secondary)', transition: 'left 0.2s' }} />
                  </div>
                </div>

                {/* Profile type checkboxes */}
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--paper-secondary)', opacity: 0.6, marginBottom: 8 }}>Profile Type</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {['contributor', 'curator'].map(type => (
                      <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={profile.profileTypes.includes(type)}
                          onChange={e => {
                            const newTypes = e.target.checked ? [...profile.profileTypes, type] : profile.profileTypes.filter(t => t !== type);
                            setProfile(prev => ({ ...prev, profileTypes: newTypes }));
                          }}
                          style={{ accentColor: 'var(--neon-amber)', width: 14, height: 14 }}
                        />
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--paper-primary)', textTransform: 'capitalize' }}>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contributor payment */}
            {profile.profileTypes.includes('contributor') && (
              <div style={{ background: 'var(--lt-surface)', border: '1px solid var(--rule-color)', borderRadius: 2 }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--rule-color)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--neon-amber)', opacity: 0.8 }}>
                  <Building size={13} />
                  Payment Details
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ background: 'rgba(245,169,63,0.06)', border: '1px solid rgba(245,169,63,0.2)', borderRadius: 2, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--neon-amber)', marginBottom: 4 }}>Contributor Payments Coming Soon</div>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--paper-secondary)', opacity: 0.7, margin: 0 }}>We&apos;re working on integrating a secure payment system for contributors.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Curator payment */}
            {profile.profileTypes.includes('curator') && (
              <div style={{ background: 'var(--lt-surface)', border: '1px solid var(--rule-color)', borderRadius: 2 }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--rule-color)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--neon-amber)', opacity: 0.8 }}>
                  <CreditCard size={13} />
                  Subscription Payment
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ background: 'rgba(245,169,63,0.06)', border: '1px solid rgba(245,169,63,0.2)', borderRadius: 2, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--neon-amber)', marginBottom: 4 }}>Stripe Integration Coming Soon</div>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--paper-secondary)', opacity: 0.7, margin: 0 }}>We&apos;re integrating with Stripe for secure payment processing.</p>
                  </div>
                  <div style={{ border: '1px solid var(--rule-color)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--rule-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--paper-primary)' }}>Quarterly Subscription</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-secondary)', opacity: 0.6 }}>$25.00 per quarter</div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 2, padding: '3px 7px' }}>Current</span>
                    </div>
                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[['Next billing date', 'June 15, 2025'], ['Payment method', 'Pending setup']].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-secondary)', opacity: 0.6 }}>{label}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-primary)' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save button */}
            <button onClick={updateProfile} className="press-btn-green" style={{ width: '100%', padding: 12, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Save Changes
            </button>
          </div>
        ) : (
          null
        )}
      </div>
    </div>
  );
}
