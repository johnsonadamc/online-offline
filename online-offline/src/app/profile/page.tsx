"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import Link from 'next/link';
import Image from 'next/image';
import { sendFollowRequest, approveFollowRequest, rejectFollowRequest } from '@/lib/supabase/profiles';
import { CITIES } from '@/lib/constants/cities';
import {
  PageShell, Input, Select, Textarea, Pill, SectionLabel, Sheet, Toast, SearchField, RosterRow, Toggle,
  Icon, accentVar, tint, SERIF, SANS, MONO,
} from '@/components/v2';
import type { Accent, IconName } from '@/components/v2';

// "Writing" covers poetry + essay (both gold). profiles.content_type only
// accepts poetry | essay, so the Writing pill opens a Poetry / Essay choice.
const WRITING_PILLS: { label: string; value: 'poetry' | 'essay' }[] = [
  { label: 'Poetry', value: 'poetry' },
  { label: 'Essay', value: 'essay' },
];

// v2 wordmark (design `.wordmark`): 19px serif, "//" in --ink3.
const Wordmark = () => (
  <div style={{ font: `400 19px/1 ${SERIF}`, color: 'var(--ink)' }}>
    online<span style={{ color: 'var(--ink3)' }}>{'//'}</span>offline
  </div>
);

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
  bio: string;
  profileTypes: string[];
  isPublic: boolean;
  city: string;
  contentType: string;
  address_line1: string;
  address_line2: string;
  address_city: string;
  address_state: string;
  address_zip: string;
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
    bio: '',
    profileTypes: [],
    isPublic: true,
    city: '',
    contentType: 'photography',
    address_line1: '',
    address_line2: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    bankInfo: { accountNumber: '', routingNumber: '', accountType: 'checking' },
    curatorPaymentInfo: { cardNumber: '', expiryDate: '', cvv: '' },
  });

  // v2 UI-only state: Writing sub-pills open, permissions note open, "···" sheet target
  const [writingOpen, setWritingOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Following[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [pendingRequestMap, setPendingRequestMap] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [addingRole, setAddingRole] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const supabase = useSupabase();

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
            bio: data.bio || '',
            profileTypes: data.profile_types?.map((pt: { type: string }) => pt.type) || [],
            isPublic: data.is_public ?? true,
            city: data.city || '',
            contentType: data.content_type || 'photography',
            address_line1: data.address_line1 || '',
            address_line2: data.address_line2 || '',
            address_city: data.address_city || '',
            address_state: data.address_state || '',
            address_zip: data.address_zip || '',
            bankInfo: data.bank_info || { accountNumber: '', routingNumber: '', accountType: 'checking' },
            curatorPaymentInfo: data.curator_payment_info || { cardNumber: '', expiryDate: '', cvv: '' },
          });
          if (data.avatar_url) { setAvatarUrl(data.avatar_url); setAvatarPreview(data.avatar_url); }
          if (data.identity_banner_url) { setBannerUrl(data.identity_banner_url); setBannerPreview(data.identity_banner_url); }
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

  const uploadBanner = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingBanner(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `banner_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const objectUrl = URL.createObjectURL(file);
      setBannerPreview(objectUrl);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const newBannerUrl = publicUrlData.publicUrl;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ identity_banner_url: newBannerUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (updateError) throw updateError;
      setBannerUrl(newBannerUrl);
      showSuccess('Banner updated successfully');
    } catch (error) {
      console.error('Error uploading banner:', error);
      showError('Error uploading banner');
    } finally {
      setUploadingBanner(false);
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
        .upsert({ id: user.id, first_name: profile.firstName, last_name: profile.lastName, bio: profile.bio || null, avatar_url: avatarUrl, identity_banner_url: bannerUrl, content_type: profile.contentType, city: profile.city, is_public: profile.isPublic, address_line1: profile.address_line1 || null, address_line2: profile.address_line2 || null, address_city: profile.address_city || null, address_state: profile.address_state || null, address_zip: profile.address_zip || null, updated_at: new Date().toISOString() });
      if (error) throw error;
      showSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Error updating profile');
    }
  };

  const addRole = async (type: string) => {
    setAddingRole(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');
      const { data: existing } = await supabase
        .from('profile_types')
        .select('profile_id')
        .eq('profile_id', user.id)
        .eq('type', type)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabase
          .from('profile_types')
          .insert({ profile_id: user.id, type });
        if (error) throw error;
      }
      setProfile(prev => ({
        ...prev,
        profileTypes: prev.profileTypes.includes(type) ? prev.profileTypes : [...prev.profileTypes, type],
      }));
      showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} role added`);
    } catch (err) {
      console.error('Error adding role:', err);
      showError('Failed to add role');
    } finally {
      setAddingRole(false);
    }
  };

  const handleFollowRequest = async (profileId: string) => {
    try {
      const result = await sendFollowRequest(supabase, profileId);
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
      const result = await approveFollowRequest(supabase, requestId);
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
      const result = await rejectFollowRequest(supabase, requestId);
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

  // ── v2 chrome (design HTML .top / .sec / .sb / .rolecard / .tr / .pay / .btn.pri) ──
  const hasAddress = profile.address_line1.trim().length > 0;
  const isContributor = profile.profileTypes.includes('contributor');
  const isCurator = profile.profileTypes.includes('curator');

  // "Writing" covers poetry + essay (both gold). profiles.content_type only
  // accepts poetry | essay, so the Writing pill opens a Poetry / Essay choice
  // (same pattern as onboarding step 2). content_type always keeps a value here.
  const isWriting = profile.contentType === 'poetry' || profile.contentType === 'essay';
  const showWriting = writingOpen || isWriting;
  const setContentType = (value: string) => {
    setProfile(prev => ({ ...prev, contentType: value }));
    if (value !== 'poetry' && value !== 'essay') setWritingOpen(false);
  };
  const handleWritingPill = () => {
    if (isWriting) return; // already writing — the sub-pills stay open
    setWritingOpen(v => !v);
  };

  // Connections = private profiles you have access to (following) + people who
  // have access to you (followers), merged by id. Same rows the old tab showed.
  type Connection = { id: string; firstName: string; lastName: string; avatar: string; youFollow: boolean; followsYou: boolean; since: string };
  const connectionMap = new Map<string, Connection>();
  following.filter(f => f.isPrivate).forEach(f => {
    connectionMap.set(f.id, { id: f.id, firstName: f.firstName, lastName: f.lastName, avatar: f.avatar, youFollow: true, followsYou: false, since: f.followingSince });
  });
  followers.forEach(f => {
    const existing = connectionMap.get(f.id);
    if (existing) existing.followsYou = true;
    else connectionMap.set(f.id, { id: f.id, firstName: f.firstName, lastName: f.lastName, avatar: f.avatar, youFollow: false, followsYou: true, since: f.followingSince });
  });
  const connections = Array.from(connectionMap.values());
  const menuTarget = connections.find(c => c.id === menuFor) || null;

  const shortName = (first: string, last: string) => (first && last ? `${first.charAt(0)}. ${last}` : `${first}${last}`.trim() || 'Unnamed');
  const initialOf = (first: string, last: string) => (first || last || '?').charAt(0).toLowerCase();

  const sectionRow: React.CSSProperties = { paddingTop: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' };
  const sectionLabelStyle: React.CSSProperties = { color: 'var(--ink2)' };
  const smallBtnBase: React.CSSProperties = {
    font: `500 10.5px/1 ${SANS}`,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '8px 10px',
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: 'solid',
    background: 'transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flex: 'none',
    WebkitTapHighlightColor: 'transparent',
  };
  const smallBtn: React.CSSProperties = { ...smallBtnBase, color: 'var(--ink2)', borderColor: 'var(--line2)' };
  const smallBtnAccent = (a: Accent): React.CSSProperties => ({ ...smallBtnBase, color: accentVar(a), borderColor: accentVar(a) });
  const quietBtn: React.CSSProperties = { ...smallBtnBase, color: 'var(--ink3)', borderColor: 'transparent', paddingRight: 0 };
  const quietText: React.CSSProperties = { font: `400 11px/1 ${MONO}`, color: 'var(--ink3)', flex: 'none' };
  const emptyLine: React.CSSProperties = { margin: 0, padding: '14px 0 0', font: `italic 400 15px/1.4 ${SERIF}`, color: 'var(--ink3)' };
  const payLine: React.CSSProperties = { marginTop: 12, borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line)', borderRadius: 8, padding: 14, font: `italic 400 14px/1.4 ${SERIF}`, color: 'var(--ink3)' };
  const sheetRow = (color: string): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    borderWidth: '0 0 1px 0',
    borderStyle: 'solid',
    borderColor: 'var(--line)',
    padding: '16px 0',
    font: `400 17px/1.1 ${SERIF}`,
    color,
    cursor: 'pointer',
  });

  // 28px tinted icon tile for role cards (design `.ti`), colored per role.
  const roleTile = (accent: Accent, icon: IconName) => (
    <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 7, display: 'grid', placeItems: 'center', color: accentVar(accent), background: tint(accent), flex: 'none' }}>
      <Icon name={icon} />
    </span>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ margin: 0, font: `400 12px/1 ${MONO}`, color: 'var(--ink3)' }}>loading…</p>
      </div>
    );
  }

  return (
    <PageShell
      // Header — design `.top`: "‹ Dashboard", wordmark, "Profile" in gold
      header={(
        <>
          <Link href="/dashboard" style={{ font: `500 12px/1 ${SANS}`, color: 'var(--ink2)', textDecoration: 'none', flex: 'none' }}>‹ Dashboard</Link>
          <Wordmark />
          <span style={{ font: `500 12px/1 ${SANS}`, color: 'var(--gold)', flex: 'none' }}>Profile</span>
        </>
      )}
      // Footer — design `.foot`: green primary Save → updateProfile (existing upsert)
      footer={(
        <button
          type="button"
          onClick={updateProfile}
          style={{ flex: 1, font: `500 12px/1 ${SANS}`, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '15px 18px', borderRadius: 5, border: 0, textAlign: 'center', whiteSpace: 'nowrap', cursor: 'pointer', color: 'var(--bg)', background: 'var(--green)', boxShadow: '0 0 28px color-mix(in oklch, var(--green) 35%, transparent)', WebkitTapHighlightColor: 'transparent' }}
        >
          Save
        </button>
      )}
      columnStyle={{ paddingBottom: 32 }}
    >
      <Toast open={!!successMessage} message={successMessage} accent="green" duration={0} onClose={() => setSuccessMessage('')} />
      <Toast open={!!errorMessage} message={errorMessage} accent="orange" duration={0} onClose={() => setErrorMessage('')} />

        {/* ── 1. IDENTITY ── */}
        <div style={{ ...sectionRow, paddingTop: 22 }}>
          <SectionLabel style={sectionLabelStyle}>Identity</SectionLabel>
        </div>

        {/* Avatar — design `.avrow`: 64px avatar + "Change photo" → uploadAvatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', position: 'relative', flex: 'none', background: 'linear-gradient(135deg,#4a4f47,#26292a)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)' }}>
            {(avatarPreview || avatarUrl) && (
              <Image src={avatarPreview || avatarUrl || ''} alt="Avatar" fill sizes="64px" style={{ objectFit: 'cover' }} />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ background: 'transparent', border: 0, padding: 0, cursor: uploading ? 'default' : 'pointer', font: `500 11px/1 ${SANS}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink2)', opacity: uploading ? 0.4 : 1 }}
          >
            {uploading ? 'uploading…' : 'Change photo'}
          </button>
          <input type="file" ref={fileInputRef} onChange={uploadAvatar} accept="image/*" style={{ display: 'none' }} />
        </div>

        {/* First / Last two-up — design `.two` */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <Input label="First" value={profile.firstName} placeholder="First name" onChange={e => setProfile(prev => ({ ...prev, firstName: e.target.value }))} />
          </div>
          <div style={{ minWidth: 0 }}>
            <Input label="Last" value={profile.lastName} placeholder="Last name" onChange={e => setProfile(prev => ({ ...prev, lastName: e.target.value }))} />
          </div>
        </div>

        <Select label="City" value={profile.city} onChange={e => setProfile(prev => ({ ...prev, city: e.target.value }))}>
          <option value="">Select a city</option>
          {CITIES.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </Select>

        <Textarea label="Bio" value={profile.bio} placeholder="A few words about your practice" onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))} />

        {/* Identity banner — design `.banner`: dashed 88px drop zone → uploadBanner */}
        <div style={{ paddingTop: 18 }}>
          <SectionLabel style={{ display: 'block', marginBottom: 8 }}>Identity banner</SectionLabel>
          <div
            role="button"
            tabIndex={0}
            onClick={() => bannerInputRef.current?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bannerInputRef.current?.click(); } }}
            style={{ marginTop: 8, height: 88, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: 'var(--line2)', background: 'var(--bg2)', display: 'grid', placeItems: 'center', font: `italic 400 13px/1 ${SERIF}`, color: 'var(--ink3)', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
          >
            {bannerPreview || bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerPreview || bannerUrl || ''} alt="Identity banner" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <span>Add a banner</span>
            )}
            {uploadingBanner && (
              <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(13,12,10,0.6)', font: `400 12px/1 ${MONO}`, color: 'var(--ink2)', fontStyle: 'normal' }}>uploading…</span>
            )}
          </div>
          <input type="file" ref={bannerInputRef} onChange={uploadBanner} accept="image/*" style={{ display: 'none' }} />
          <p style={{ margin: '8px 0 0', font: `400 11.5px/1.4 ${SANS}`, color: 'var(--ink3)' }}>
            Shown to curators when selecting contributors. Not a preview of submitted work.
          </p>
        </div>

        {/* ── 2. YOUR ROLES — add-only, no removal UI ── */}
        <div style={sectionRow}>
          <SectionLabel style={sectionLabelStyle}>Your roles</SectionLabel>
        </div>

        {([
          { type: 'contributor', label: 'Contributor', accent: 'orange', icon: 'camera' },
          { type: 'curator', label: 'Curator', accent: 'gold', icon: 'envelope' },
        ] as { type: 'contributor' | 'curator'; label: string; accent: Accent; icon: IconName }[]).map(role => {
          const has = profile.profileTypes.includes(role.type);
          return (
            <div key={role.type}>
              {/* Role card — design `.rolecard` */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderWidth: '0 0 1px 0', borderStyle: 'solid', borderColor: 'var(--line)' }}>
                {roleTile(role.accent, role.icon)}
                <h4 style={{ margin: 0, font: `400 20px/1.1 ${SERIF}`, color: 'var(--ink)', flex: 1 }}>{role.label}</h4>
                {has ? (
                  <span style={{ font: `400 11px/1 ${MONO}`, color: 'var(--green)' }}>active</span>
                ) : (
                  <button type="button" onClick={() => addRole(role.type)} disabled={addingRole} style={{ ...smallBtn, opacity: addingRole ? 0.4 : 1, cursor: addingRole ? 'default' : 'pointer' }}>
                    {addingRole ? 'loading…' : 'Add'}
                  </button>
                )}
              </div>

              {/* Content type — contributors only. Design `.types`: Photo / Art / Writing */}
              {has && role.type === 'contributor' && (
                <div style={{ padding: '12px 0 4px 42px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Pill accent="blue" icon="camera" label="Photo" selected={profile.contentType === 'photography'} onClick={() => setContentType('photography')} />
                    <Pill accent="purple" icon="brush" label="Art" selected={profile.contentType === 'art'} onClick={() => setContentType('art')} />
                    <Pill accent="gold" icon="quill" label="Writing" selected={isWriting} tinted={!isWriting && writingOpen} onClick={handleWritingPill} />
                  </div>
                  {showWriting && (
                    <div style={{ display: 'flex', gap: 6, padding: '6px 0 0' }}>
                      {WRITING_PILLS.map(p => (
                        <Pill
                          key={p.value}
                          accent="gold"
                          label={p.label}
                          selected={profile.contentType === p.value}
                          tinted={profile.contentType !== p.value}
                          onClick={() => setContentType(p.value)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Public profile toggle — design `.tr` + `.tog` (gold) → isPublic */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderWidth: '0 0 1px 0', borderStyle: 'solid', borderColor: 'var(--line)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: 0, font: `400 17px/1.1 ${SERIF}`, color: 'var(--ink)' }}>Public profile</h4>
            <p style={{ margin: '4px 0 0', font: `400 12px/1 ${SANS}`, color: 'var(--ink3)' }}>{profile.isPublic ? 'Visible to everyone' : 'Approved users only'}</p>
          </div>
          <button
            type="button"
            aria-label="About permissions"
            aria-expanded={permissionsOpen}
            onClick={() => setPermissionsOpen(v => !v)}
            style={{ width: 22, height: 22, borderRadius: '50%', borderWidth: 1, borderStyle: 'solid', borderColor: permissionsOpen ? 'var(--ink2)' : 'var(--line2)', background: 'transparent', color: permissionsOpen ? 'var(--ink2)' : 'var(--ink3)', font: `500 11px/1 ${MONO}`, display: 'grid', placeItems: 'center', padding: 0, cursor: 'pointer', flex: 'none' }}
          >
            ?
          </button>
          <Toggle checked={profile.isPublic} accent="gold" onChange={checked => setProfile(prev => ({ ...prev, isPublic: checked }))} />
        </div>
        {permissionsOpen && (
          <ul style={{ margin: 0, padding: '12px 0 0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              'Public profiles are visible to everyone',
              'Private profiles require access requests',
              'You can only receive communications from users you have approved',
              'Blocking a user prevents them from requesting access',
            ].map(line => (
              <li key={line} style={{ font: `400 11.5px/1.4 ${SANS}`, color: 'var(--ink3)' }}>{line}</li>
            ))}
          </ul>
        )}

        {/* ── 3. MAILING ADDRESS — "on file" when address_line1 is set ── */}
        <div style={sectionRow}>
          <SectionLabel style={sectionLabelStyle}>
            Mailing address
            {hasAddress && <b style={{ color: 'var(--green)', fontWeight: 500, marginLeft: 10 }}>on file</b>}
          </SectionLabel>
        </div>
        <p style={{ margin: '8px 0 0', font: `400 11.5px/1.4 ${SANS}`, color: 'var(--ink3)' }}>Required to receive your printed edition.</p>
        <div style={{ paddingTop: 12 }}>
          <Input value={profile.address_line1} placeholder="Street address" autoComplete="address-line1" onChange={e => setProfile(prev => ({ ...prev, address_line1: e.target.value }))} />
        </div>
        <div style={{ paddingTop: 12 }}>
          <Input value={profile.address_line2} placeholder="Apt, suite (optional)" autoComplete="address-line2" onChange={e => setProfile(prev => ({ ...prev, address_line2: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 12 }}>
          <div style={{ minWidth: 0 }}>
            <Input value={profile.address_city} placeholder="City" autoComplete="address-level2" onChange={e => setProfile(prev => ({ ...prev, address_city: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input value={profile.address_state} placeholder="State" autoComplete="address-level1" onChange={e => setProfile(prev => ({ ...prev, address_state: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input value={profile.address_zip} placeholder="ZIP" inputMode="numeric" autoComplete="postal-code" onChange={e => setProfile(prev => ({ ...prev, address_zip: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* ── 4. PAYMENT — placeholders, no logic (Stripe pending) ── */}
        {(isContributor || isCurator) && (
          <>
            <div style={sectionRow}>
              <SectionLabel style={sectionLabelStyle}>Payment</SectionLabel>
            </div>
            {isCurator && <div style={payLine}>Card on file: coming soon.</div>}
            {isContributor && <div style={payLine}>Contributor payments: coming soon.</div>}
          </>
        )}

        {/* ── 5. ACCESS REQUESTS → handleApproveRequest / handleDenyRequest ── */}
        {followRequests.length > 0 && (
          <>
            <div style={sectionRow}>
              <SectionLabel style={sectionLabelStyle}>
                Access requests
                <b style={{ color: 'var(--gold)', fontWeight: 500, marginLeft: 10 }}>{followRequests.length}</b>
              </SectionLabel>
            </div>
            <div style={{ paddingTop: 4 }}>
              {followRequests.map((req, i) => (
                <RosterRow
                  key={req.id}
                  name={shortName(req.firstName, req.lastName)}
                  sub={`requested ${req.requestDate}`}
                  avatarUrl={req.avatar || undefined}
                  initial={initialOf(req.firstName, req.lastName)}
                  last={i === followRequests.length - 1}
                >
                  <button type="button" onClick={() => handleApproveRequest(req.id)} style={smallBtnAccent('green')}>Approve</button>
                  <button type="button" onClick={() => handleDenyRequest(req.id)} style={quietBtn}>Deny</button>
                </RosterRow>
              ))}
            </div>
          </>
        )}

        {/* ── 6. CONNECTIONS — search → handleFollowRequest; "···" → Remove / Block sheet ── */}
        <div style={sectionRow}>
          <SectionLabel style={sectionLabelStyle}>Connections</SectionLabel>
        </div>
        <SearchField
          placeholder="Search private profiles by name…"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); searchProfiles(e.target.value); }}
        />
        {searchQuery.length > 0 && searchResults.length > 0 && (
          <div>
            {searchResults.map((p, i) => (
              <RosterRow
                key={p.id}
                name={shortName(p.firstName, p.lastName)}
                sub="private profile"
                avatarUrl={p.avatar || undefined}
                initial={initialOf(p.firstName, p.lastName)}
                last={i === searchResults.length - 1}
              >
                {pendingRequestMap[p.id] ? (
                  <span style={quietText}>requested</span>
                ) : (
                  <button type="button" onClick={() => handleFollowRequest(p.id)} style={smallBtnAccent('gold')}>Request</button>
                )}
              </RosterRow>
            ))}
          </div>
        )}
        {searchQuery.length > 0 && searchResults.length === 0 && (
          <p style={emptyLine}>No private profiles match that name.</p>
        )}

        {connections.length === 0 ? (
          <p style={emptyLine}>No connections yet.</p>
        ) : (
          <div style={{ paddingTop: 8 }}>
            {connections.map((c, i) => (
              <RosterRow
                key={c.id}
                name={shortName(c.firstName, c.lastName)}
                sub={c.youFollow && c.followsYou ? 'mutual access' : c.followsYou ? 'follows you' : `access since ${c.since}`}
                avatarUrl={c.avatar || undefined}
                initial={initialOf(c.firstName, c.lastName)}
                last={i === connections.length - 1}
              >
                <button type="button" aria-label={`Options for ${c.firstName} ${c.lastName}`} onClick={() => setMenuFor(c.id)} style={quietBtn}>···</button>
              </RosterRow>
            ))}
          </div>
        )}

        {/* ── 7. BLOCKED → handleUnblockUser; hidden when empty ── */}
        {blockedUsers.length > 0 && (
          <>
            <div style={sectionRow}>
              <SectionLabel style={sectionLabelStyle}>Blocked</SectionLabel>
            </div>
            <div style={{ paddingTop: 4 }}>
              {blockedUsers.map((u, i) => (
                <RosterRow
                  key={u.id}
                  name={shortName(u.firstName, u.lastName)}
                  sub={`blocked ${u.blockedDate}`}
                  avatarUrl={u.avatar || undefined}
                  initial={initialOf(u.firstName, u.lastName)}
                  last={i === blockedUsers.length - 1}
                >
                  <button type="button" onClick={() => handleUnblockUser(u.id)} style={smallBtn}>Unblock</button>
                </RosterRow>
              ))}
            </div>
          </>
        )}
      {/* "···" sheet — Remove → handleUnfollow · Block → handleBlockUser */}
      <Sheet open={menuTarget !== null} onClose={() => setMenuFor(null)} title={menuTarget ? `${menuTarget.firstName} ${menuTarget.lastName}`.trim() : ''}>
        {menuTarget?.youFollow && (
          <button type="button" onClick={() => { const id = menuTarget.id; setMenuFor(null); handleUnfollow(id); }} style={sheetRow('var(--ink)')}>
            Remove
            <span style={{ display: 'block', font: `400 11px/1 ${MONO}`, color: 'var(--ink3)', marginTop: 6 }}>give up your access to this profile</span>
          </button>
        )}
        {menuTarget?.followsYou && (
          <button type="button" onClick={() => { const id = menuTarget.id; setMenuFor(null); handleBlockUser(id); }} style={{ ...sheetRow('var(--orange)'), borderBottomWidth: 0 }}>
            Block
            <span style={{ display: 'block', font: `400 11px/1 ${MONO}`, color: 'var(--ink3)', marginTop: 6 }}>removes their access and stops future requests</span>
          </button>
        )}
      </Sheet>
    </PageShell>
  );
}
