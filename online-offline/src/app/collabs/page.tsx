'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { CITIES } from '@/lib/constants/cities';

interface CollabTemplate {
  id: string;
  name: string;
  display_text: string;
  type: 'chain' | 'theme' | 'narrative' | string;
  tags?: string[];
  phases?: number;
  duration?: string;
  instructions?: string;
  communityParticipantCount?: number;
  localParticipantCount?: number;
}

interface User {
  id: string;
  name: string;
  bio: string;
  avatar: string;
}

interface CurrentPeriod {
  id: string;
  season: string;
  year: number;
}

type ParticipationMode = 'community' | 'local' | 'private';

type ErrorState = { message: string; isVisible: boolean };
type PressState = 'rest' | 'pressing' | 'releasing';

export default function CollabsLibrary() {
  const router = useRouter();
  const [availablePrompts, setAvailablePrompts] = useState<CollabTemplate[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedCollabTitle, setSelectedCollabTitle] = useState('');
  const [selectedCollabId, setSelectedCollabId] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [profileResults, setProfileResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelPress, setCancelPress] = useState<PressState>('rest');
  const [sendPress, setSendPress] = useState<PressState>('rest');
  const [error, setError] = useState<ErrorState>({ message: '', isVisible: false });
  const [currentPeriod, setCurrentPeriod] = useState<CurrentPeriod>({ id: '', season: 'Spring', year: 2025 });
  const [showLocalDialog, setShowLocalDialog] = useState(false);
  const [localTemplateId, setLocalTemplateId] = useState('');
  const [localCollabTitle, setLocalCollabTitle] = useState('');
  const [localCity, setLocalCity] = useState('');
  const [localCancelPress, setLocalCancelPress] = useState<PressState>('rest');
  const [localJoinPress, setLocalJoinPress] = useState<PressState>('rest');

  const showError = (message: string) => {
    setError({ message, isVisible: true });
    setTimeout(() => setError(prev => ({ ...prev, isVisible: false })), 5000);
  };

  const loadData = useCallback(async () => {
    const supabase = createClientComponentClient();
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      if (!user) { router.push('/auth/signin'); return; }

      const { data: activePeriod, error: periodError } = await supabase
        .from('periods').select('id, name, season, year').eq('is_active', true)
        .order('end_date', { ascending: false }).limit(1).single();
      if (periodError) throw new Error(`Failed to fetch active period: ${periodError.message}`);
      if (!activePeriod) throw new Error('No active period found');
      setCurrentPeriod({ id: activePeriod.id, season: activePeriod.season, year: activePeriod.year });

      const { data: activeParticipations, error: participationsError } = await supabase
        .from('collab_participants').select('collab_id').eq('profile_id', user.id).eq('status', 'active');
      if (participationsError) throw new Error(`Failed to fetch participations: ${participationsError.message}`);

      const activeCollabIds = activeParticipations?.map(p => p.collab_id) || [];
      let activeTemplateIds: string[] = [];

      if (activeCollabIds.length > 0) {
        const { data: collabs, error: collabsError } = await supabase
          .from('collabs').select('metadata').in('id', activeCollabIds);
        if (collabsError) throw new Error(`Failed to fetch collab metadata: ${collabsError.message}`);
        if (collabs) {
          activeTemplateIds = collabs
            .map(c => (c.metadata && typeof c.metadata === 'object' && 'template_id' in c.metadata) ? c.metadata.template_id as string : null)
            .filter((id): id is string => id !== null);
        }
      }

      const { data: periodTemplates, error: periodTemplatesError } = await supabase
        .from('period_templates').select('template_id').eq('period_id', activePeriod.id);
      if (periodTemplatesError) throw new Error(`Failed to fetch period templates: ${periodTemplatesError.message}`);
      const periodTemplateIds = periodTemplates?.map(pt => pt.template_id) || [];
      if (periodTemplateIds.length === 0) { setAvailablePrompts([]); setLoading(false); return; }

      const { data: allTemplates, error: templatesError } = await supabase
        .from('collab_templates').select('*').in('id', periodTemplateIds);
      if (templatesError) throw new Error(`Failed to fetch templates: ${templatesError.message}`);
      if (!allTemplates) throw new Error('No templates found');

      const filteredTemplates = allTemplates
        .filter(t => !activeTemplateIds.includes(t.id))
        .map(t => ({ ...t, type: t.type || 'theme' }));

      const templatesWithCounts = await Promise.all(filteredTemplates.map(async (template) => {
        try {
          const { data: collabsData } = await supabase
            .from('collabs').select('id, participation_mode, location, metadata').eq('period_id', activePeriod.id);
          if (!collabsData || collabsData.length === 0) {
            return { ...template, communityParticipantCount: 0, localParticipantCount: 0 };
          }
          const matchingCollabs = collabsData.filter(c =>
            c.metadata && typeof c.metadata === 'object' && 'template_id' in c.metadata && c.metadata.template_id === template.id
          );
          if (matchingCollabs.length === 0) return { ...template, communityParticipantCount: 0, localParticipantCount: 0 };

          const communityIds = matchingCollabs.filter(c => c.participation_mode === 'community' || c.participation_mode === 'local').map(c => c.id);
          const localIds = matchingCollabs.filter(c => c.participation_mode === 'local').map(c => c.id);

          const { count: communityCount } = communityIds.length > 0
            ? await supabase.from('collab_participants').select('*', { count: 'exact', head: true }).in('collab_id', communityIds).eq('status', 'active')
            : { count: 0 };
          const { count: localCount } = localIds.length > 0
            ? await supabase.from('collab_participants').select('*', { count: 'exact', head: true }).in('collab_id', localIds).eq('status', 'active')
            : { count: 0 };

          return { ...template, communityParticipantCount: communityCount || 0, localParticipantCount: localCount || 0 };
        } catch {
          return { ...template, communityParticipantCount: 0, localParticipantCount: 0 };
        }
      }));

      setAvailablePrompts(templatesWithCounts);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load collaboration data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  const searchProfiles = async (term: string) => {
    const supabase = createClientComponentClient();
    try {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, is_public, bio')
        .eq('is_public', true);
      if (term.trim()) {
        query = query.or(`first_name.ilike.%${term.trim()}%,last_name.ilike.%${term.trim()}%`).limit(10);
      } else {
        query = query.order('first_name', { ascending: true }).limit(20);
      }
      const { data, error: searchError } = await query;
      if (searchError) { showError('Search failed: ' + searchError.message); return; }
      setProfileResults(
        (data || []).map((p: any) => ({
          id: p.id,
          name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
          bio: p.bio || '',
          avatar: p.avatar_url || '',
        }))
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Search error');
    }
  };

  useEffect(() => { searchProfiles(searchTerm); }, [searchTerm]);
  useEffect(() => { if (showInviteDialog) searchProfiles(''); }, [showInviteDialog]);

  const handleJoinClick = async (collabId: string, title: string, mode: ParticipationMode) => {
    try {
      if (mode === 'private') {
        setSelectedCollabId(collabId);
        setSelectedCollabTitle(title);
        setShowInviteDialog(true);
        return;
      }
      if (mode === 'local') {
        const supabase = createClientComponentClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(userError.message);
        if (!user) { showError('You must be logged in'); return; }
        const { data: profileData } = await supabase.from('profiles').select('city').eq('id', user.id).single();
        setLocalTemplateId(collabId);
        setLocalCollabTitle(title);
        setLocalCity(profileData?.city || '');
        setShowLocalDialog(true);
        return;
      }
      const template = availablePrompts.find(p => p.id === collabId);
      if (!template) { showError('Error: Template not found'); return; }
      const supabase = createClientComponentClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      if (!user) { showError('You must be logged in to join a collaboration'); return; }

      const { data: collab, error: collabError } = await supabase
        .from('collabs')
        .insert({ title: template.name, description: template.display_text, type: template.type || 'theme', is_private: false, participation_mode: mode, location: null, created_by: user.id, total_phases: template.phases || null, current_phase: 1, metadata: { template_id: template.id, participation_mode: mode, location: null } })
        .select().single();
      if (collabError) throw new Error(`Could not create collaboration: ${collabError.message}`);

      const { error: participantError } = await supabase
        .from('collab_participants')
        .insert({ profile_id: user.id, collab_id: collab.id, role: 'member', status: 'active', participation_mode: mode, location: null });
      if (participantError) throw new Error(`Could not join collaboration: ${participantError.message}`);

      setAvailablePrompts(prev => prev.filter(c => c.id !== collabId));
      alert(`You have successfully joined the ${title} collaboration in ${mode} mode.`);
      router.push('/dashboard');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not join the collaboration');
    }
  };

  const createPrivateCollab = async () => {
    try {
      const supabase = createClientComponentClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      if (!user) { showError('You must be logged in'); return; }

      const template = availablePrompts.find(t => t.id === selectedCollabId);
      if (!template) { showError('Template not found'); return; }

      const { data: collab, error: collabError } = await supabase
        .from('collabs')
        .insert({ title: template.name, description: template.display_text, type: template.type || 'theme', is_private: true, participation_mode: 'private', location: null, created_by: user.id, total_phases: template.phases || null, current_phase: 1, metadata: { template_id: template.id, participation_mode: 'private', location: null } })
        .select().single();
      if (collabError) throw new Error(`Could not create collaboration: ${collabError.message}`);

      const { error: organizerError } = await supabase
        .from('collab_participants')
        .insert({ profile_id: user.id, collab_id: collab.id, role: 'organizer', status: 'active', participation_mode: 'private', location: null });
      if (organizerError) throw new Error(`Could not add you as organizer: ${organizerError.message}`);

      if (selectedUsers.length > 0) {
        await supabase.from('collab_participants').insert(
          selectedUsers.map(u => ({ profile_id: u.id, collab_id: collab.id, role: 'member', status: 'invited', participation_mode: 'private', location: null }))
        );
      }

      setAvailablePrompts(prev => prev.filter(c => c.id !== selectedCollabId));
      setShowInviteDialog(false);
      alert(`You have successfully created a private collaboration with ${selectedUsers.length} invited participants.`);
      router.push('/dashboard');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not create private collaboration');
    }
  };

  const confirmLocalJoin = async () => {
    try {
      const supabase = createClientComponentClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      if (!user) { showError('You must be logged in'); return; }
      const template = availablePrompts.find(p => p.id === localTemplateId);
      if (!template) { showError('Template not found'); return; }

      const { data: collab, error: collabError } = await supabase
        .from('collabs')
        .insert({ title: template.name, description: template.display_text, type: template.type || 'theme', is_private: false, participation_mode: 'local', location: localCity, created_by: user.id, total_phases: template.phases || null, current_phase: 1, metadata: { template_id: template.id, participation_mode: 'local', location: localCity } })
        .select().single();
      if (collabError) throw new Error(`Could not create collaboration: ${collabError.message}`);

      const { error: participantError } = await supabase
        .from('collab_participants')
        .insert({ profile_id: user.id, collab_id: collab.id, role: 'member', status: 'active', participation_mode: 'local', location: localCity, city: localCity });
      if (participantError) throw new Error(`Could not join collaboration: ${participantError.message}`);

      setAvailablePrompts(prev => prev.filter(c => c.id !== localTemplateId));
      setShowLocalDialog(false);
      router.push('/dashboard');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not join the collaboration');
    }
  };

  const toggleUser = (user: User) => {
    setSelectedUsers(prev =>
      prev.find(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user]
    );
  };

  const releasePress = (set: (s: PressState) => void) => {
    set('releasing');
    setTimeout(() => set('rest'), 220);
  };

  const pressStyle = (state: PressState, purple = false): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: purple ? 'var(--neon-purple)' : (state === 'rest' ? 'var(--paper-3)' : 'var(--neon-accent)'),
    textShadow: purple ? '0 0 6px var(--glow-purple)' : 'none',
    padding: '9px 20px',
    background: state === 'pressing'
      ? (purple ? 'rgba(168,136,232,0.2)' : 'rgba(224,90,40,0.18)')
      : (purple ? 'rgba(168,136,232,0.1)' : 'var(--ground-3)'),
    border: `1px solid ${state !== 'rest'
      ? (purple ? 'rgba(168,136,232,0.5)' : 'rgba(224,90,40,0.5)')
      : (purple ? 'rgba(168,136,232,0.35)' : 'var(--rule-mid)')}`,
    borderBottom: `2px solid ${state === 'pressing'
      ? (purple ? 'rgba(168,136,232,0.6)' : 'rgba(224,90,40,0.6)')
      : (purple ? 'rgba(168,136,232,0.45)' : 'var(--ground-4)')}`,
    borderRadius: 2,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    transform: state === 'pressing' ? 'translateY(2px)' : 'translateY(0)',
    boxShadow: state === 'pressing' ? 'none'
      : purple
        ? '0 2px 0 rgba(168,136,232,0.2), 0 0 14px rgba(168,136,232,0.06)'
        : '0 2px 0 var(--ground-4), 0 3px 6px rgba(0,0,0,0.4)',
    transition: state === 'releasing'
      ? 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease, background 0.3s'
      : 'transform 0.08s cubic-bezier(0.4,0,0.6,1), box-shadow 0.08s, background 0.08s',
  });

  const typeStyle: Record<string, { color: string; bg: string; border: string }> = {
    chain:     { color: 'rgba(129,140,248,0.9)', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.25)' },
    theme:     { color: 'rgba(245,169,63,0.9)',  bg: 'rgba(245,169,63,0.08)',  border: 'rgba(245,169,63,0.25)'  },
    narrative: { color: 'rgba(52,211,153,0.9)',  bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)'  },
  };

  const CollabCard = ({ collab }: { collab: CollabTemplate }) => {
    const t = typeStyle[collab.type] || typeStyle.theme;
    return (
      <div style={{ background: 'var(--ground-2)', border: '1px solid var(--rule-mid)', borderRadius: 2 }}>
        {/* Type stripe */}
        <div style={{ height: 2, background: t.color, borderRadius: '2px 2px 0 0', opacity: 0.7 }} />
        <div style={{ padding: 14 }}>
          {/* Title + type badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, color: 'var(--paper)', margin: 0, lineHeight: 1.3 }}>{collab.name}</h3>
            <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.color, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 2, padding: '2px 7px' }}>{collab.type}</span>
          </div>

          {/* Description */}
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--paper-3)', opacity: 0.75, lineHeight: 1.5, margin: '0 0 12px' }}>{collab.display_text}</p>

          {/* Instructions */}
          {collab.instructions && (
            <div style={{ background: 'rgba(245,169,63,0.05)', border: '1px solid rgba(245,169,63,0.2)', borderLeft: '3px solid var(--neon-amber)', borderRadius: 2, padding: '10px 12px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ color: 'var(--neon-amber)', flexShrink: 0 }}><rect x="1.5" y="0.5" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1"/><path d="M3.5 3.5h4M3.5 5.5h4M3.5 7.5h2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--neon-amber)' }}>Instructions</span>
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--paper-3)', opacity: 0.8, margin: 0, whiteSpace: 'pre-line', lineHeight: 1.5 }}>{collab.instructions}</p>
            </div>
          )}

          {/* Tags */}
          {collab.tags && collab.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              {collab.tags.slice(0, 3).map((tag, i) => (
                <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', color: 'var(--paper-3)', background: 'var(--ground-3)', border: '1px solid var(--rule-mid)', borderRadius: 2, padding: '2px 7px', opacity: 0.7 }}>{tag}</span>
              ))}
            </div>
          )}

          {/* Participant counts */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'rgba(90,159,212,0.8)', flexShrink: 0 }}><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1"/><ellipse cx="6" cy="6" rx="2.5" ry="5" stroke="currentColor" strokeWidth="1"/><path d="M1 6h10" stroke="currentColor" strokeWidth="1"/></svg>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-3)', opacity: 0.7 }}><strong style={{ color: 'rgba(90,159,212,0.9)' }}>{collab.communityParticipantCount || 0}</strong> community</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'rgba(52,211,153,0.8)', flexShrink: 0 }}><path d="M6 1C4.067 1 2.5 2.567 2.5 4.5C2.5 7 6 11 6 11s3.5-4 3.5-6.5C9.5 2.567 7.933 1 6 1Z" stroke="currentColor" strokeWidth="1"/><circle cx="6" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1"/></svg>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-3)', opacity: 0.7 }}><strong style={{ color: 'rgba(52,211,153,0.9)' }}>{collab.localParticipantCount || 0}</strong> local</span>
            </div>
          </div>

          {/* Join buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {([
              {
                mode: 'community' as const, label: 'Community', color: 'rgba(90,159,212,0.85)', bg: 'rgba(90,159,212,0.08)', border: 'rgba(90,159,212,0.25)',
                icon: <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1"/><ellipse cx="6" cy="6" rx="2.5" ry="5" stroke="currentColor" strokeWidth="1"/><path d="M1 6h10" stroke="currentColor" strokeWidth="1"/></svg>,
              },
              {
                mode: 'local' as const, label: 'Local', color: 'rgba(52,211,153,0.85)', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)',
                icon: <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1C4.067 1 2.5 2.567 2.5 4.5C2.5 7 6 11 6 11s3.5-4 3.5-6.5C9.5 2.567 7.933 1 6 1Z" stroke="currentColor" strokeWidth="1"/><circle cx="6" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1"/></svg>,
              },
              {
                mode: 'private' as const, label: 'Private', color: 'rgba(167,139,250,0.85)', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)',
                icon: <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="2" y="5.5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1"/><path d="M4 5.5V3.5C4 2.4 4.9 1.5 6 1.5C7.1 1.5 8 2.4 8 3.5V5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>,
              },
            ] as { mode: ParticipationMode; label: string; icon: React.ReactNode; color: string; bg: string; border: string }[]).map(({ mode, label, icon, color, bg, border }) => (
              <button
                key={mode}
                onClick={() => handleJoinClick(collab.id, collab.name, mode)}
                style={{ padding: '8px 4px', background: bg, border: `1px solid ${border}`, borderRadius: 2, color, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)', fontFamily: 'var(--font-sans)' }}>
      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,169,63,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto', padding: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Link href="/dashboard" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--paper-3)', textDecoration: 'none', opacity: 0.7 }}>← Dashboard</Link>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--paper)', letterSpacing: '-0.01em' }}>online//offline</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--neon-amber)', background: 'rgba(245,169,63,0.1)', border: '1px solid rgba(245,169,63,0.25)', borderRadius: 2, padding: '3px 8px' }}>Collabs</span>
        </div>
        <div style={{ height: 1, background: 'var(--rule-mid)', opacity: 0.3, marginBottom: 20 }} />

        {/* Season + subtitle */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--paper)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
            {currentPeriod.season} {currentPeriod.year} Collab Prompts
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--paper-3)', opacity: 0.6, margin: 0 }}>
            Join a template to participate in this quarter's creative collaborations.
          </p>
        </div>

        {/* Error */}
        {error.isVisible && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#ef4444' }}>{error.message}</span>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--paper-4)' }}>loading…</span>
          </div>
        ) : availablePrompts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {availablePrompts.map(collab => <CollabCard key={collab.id} collab={collab} />)}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--paper-3)', opacity: 0.5, marginBottom: 16 }}>You have joined all available prompts for this period.</div>
            <button onClick={loadData} className="press-btn" style={{ padding: '10px 20px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Refresh</button>
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInviteDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: 'var(--ground-2)', border: '1px solid var(--rule-mid)', borderRadius: 2, width: '100%', maxWidth: 480 }}>
            {/* Modal header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule-mid)', background: 'var(--ground-3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: 'var(--neon-purple)', flexShrink: 0 }}><rect x="2" y="5.5" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1"/><path d="M4 5.5V3.5C4 2.1 5.1 1 6.5 1C7.9 1 9 2.1 9 3.5V5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--neon-purple)', textShadow: '0 0 6px var(--glow-purple)' }}>Private Collab: {selectedCollabTitle}</span>
              </div>
              <button onClick={() => setShowInviteDialog(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--paper-3)', opacity: 0.6, padding: 2 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--paper-3)', opacity: 0.5, pointerEvents: 'none' }}><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                <input
                  type="text"
                  placeholder="Search contributors…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '9px 10px 9px 30px', background: 'var(--ground-3)', border: '1px solid var(--rule-mid)', borderRadius: 2, color: 'var(--paper)', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none', boxSizing: 'border-box', caretColor: 'var(--neon-purple)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(168,136,232,0.5)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--rule-mid)'; }}
                />
              </div>

              {/* Selected chips */}
              {selectedUsers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', background: 'var(--ground-3)', border: '1px solid var(--rule-mid)', borderRadius: 2 }}>
                  {selectedUsers.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(168,136,232,0.08)', border: '1px solid rgba(168,136,232,0.25)', borderRadius: 2, padding: '3px 8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--neon-purple)' }}>{u.name}</span>
                      <button onClick={() => toggleUser(u)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(167,139,250,0.7)', padding: 0, display: 'flex', lineHeight: 0 }}><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M3 3L8 8M8 3L3 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Results list */}
              {profileResults.length > 0 && (
                <div style={{ border: '1px solid var(--rule-mid)', borderRadius: 2, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
                  {profileResults.map(u => {
                    const isSelected = !!selectedUsers.find(s => s.id === u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUser(u)}
                        style={{
                          padding: '12px 14px',
                          borderBottom: '1px solid var(--rule)',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(168,136,232,0.05)' : 'transparent',
                          borderLeft: isSelected ? '2px solid var(--neon-purple)' : '2px solid transparent',
                          boxShadow: isSelected ? '-3px 0 10px -2px var(--glow-purple)' : 'none',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--paper)', lineHeight: 1.1, opacity: 0.88, marginBottom: 3 }}>{u.name}</div>
                        {u.bio && <div style={{ fontFamily: 'var(--font-sans)', fontStyle: 'italic', fontSize: 12, color: 'var(--paper-4)' }}>{u.bio.length > 60 ? u.bio.slice(0, 60) + '…' : u.bio}</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Modal actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                <button
                  onPointerDown={() => setCancelPress('pressing')}
                  onPointerUp={() => releasePress(setCancelPress)}
                  onPointerLeave={() => { if (cancelPress === 'pressing') releasePress(setCancelPress); }}
                  onClick={() => setShowInviteDialog(false)}
                  style={pressStyle(cancelPress)}
                >
                  Cancel
                </button>
                <button
                  onPointerDown={() => setSendPress('pressing')}
                  onPointerUp={() => releasePress(setSendPress)}
                  onPointerLeave={() => { if (sendPress === 'pressing') releasePress(setSendPress); }}
                  onClick={createPrivateCollab}
                  disabled={selectedUsers.length === 0}
                  style={{ ...pressStyle(sendPress, true), opacity: selectedUsers.length === 0 ? 0.4 : 1, cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  Send Invites ({selectedUsers.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Local city dialog */}
      {showLocalDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: 'var(--ground-2)', border: '1px solid var(--rule-mid)', borderRadius: 2, width: '100%', maxWidth: 360 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule-mid)', background: 'var(--ground-3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--neon-green)', flexShrink: 0 }}><path d="M6 1C4.067 1 2.5 2.567 2.5 4.5C2.5 7 6 11 6 11s3.5-4 3.5-6.5C9.5 2.567 7.933 1 6 1Z" stroke="currentColor" strokeWidth="1"/><circle cx="6" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1"/></svg>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--neon-green)', textShadow: '0 0 6px var(--glow-green)' }}>Local: {localCollabTitle}</span>
              </div>
              <button onClick={() => setShowLocalDialog(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--paper-3)', opacity: 0.6, padding: 2 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--paper-5)', marginBottom: 6 }}>Your city</label>
                <select
                  value={localCity}
                  onChange={e => setLocalCity(e.target.value)}
                  style={{ width: '100%', background: 'var(--ground-3)', border: '1px solid var(--rule-mid)', borderRadius: 2, color: 'var(--paper)', fontFamily: 'var(--font-sans)', fontSize: 14, padding: '8px 10px', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--rule-mid)'; }}
                >
                  <option value="">Select a city</option>
                  {CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onPointerDown={() => setLocalCancelPress('pressing')}
                  onPointerUp={() => releasePress(setLocalCancelPress)}
                  onPointerLeave={() => { if (localCancelPress === 'pressing') releasePress(setLocalCancelPress); }}
                  onClick={() => setShowLocalDialog(false)}
                  style={pressStyle(localCancelPress)}
                >
                  Cancel
                </button>
                <button
                  onPointerDown={() => setLocalJoinPress('pressing')}
                  onPointerUp={() => releasePress(setLocalJoinPress)}
                  onPointerLeave={() => { if (localJoinPress === 'pressing') releasePress(setLocalJoinPress); }}
                  onClick={confirmLocalJoin}
                  disabled={!localCity}
                  style={{ ...pressStyle(localJoinPress), color: localJoinPress === 'rest' ? 'rgba(52,211,153,0.9)' : 'var(--neon-green)', textShadow: '0 0 6px var(--glow-green)', background: localJoinPress === 'pressing' ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.1)', border: `1px solid ${localJoinPress !== 'rest' ? 'rgba(52,211,153,0.5)' : 'rgba(52,211,153,0.35)'}`, borderBottom: `2px solid ${localJoinPress === 'pressing' ? 'rgba(52,211,153,0.6)' : 'rgba(52,211,153,0.45)'}`, opacity: !localCity ? 0.4 : 1, cursor: !localCity ? 'not-allowed' : 'pointer' }}
                >
                  Join Local
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
