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

  return null;
}
