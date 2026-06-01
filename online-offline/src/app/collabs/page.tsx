'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase/useSupabase';
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

interface CurrentPeriod {
  id: string;
  season: string;
  year: number;
}

interface UserCreatedCollab {
  id: string;
  title: string;
  description: string;
  type: string;
  role: string;
  invite_status: string;
}

type ParticipationMode = 'community' | 'local' | 'private';

type ErrorState = { message: string; isVisible: boolean };
type PressState = 'rest' | 'pressing' | 'releasing';

export default function CollabsLibrary() {
  const router = useRouter();
  const supabase = useSupabase();
  const [availablePrompts, setAvailablePrompts] = useState<CollabTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState>({ message: '', isVisible: false });
  const [currentPeriod, setCurrentPeriod] = useState<CurrentPeriod>({ id: '', season: 'Spring', year: 2025 });
  const [showLocalDialog, setShowLocalDialog] = useState(false);
  const [localTemplateId, setLocalTemplateId] = useState('');
  const [localCollabTitle, setLocalCollabTitle] = useState('');
  const [localCity, setLocalCity] = useState('');
  const [localCancelPress, setLocalCancelPress] = useState<PressState>('rest');
  const [localJoinPress, setLocalJoinPress] = useState<PressState>('rest');

  const [userCreatedCollabs, setUserCreatedCollabs] = useState<UserCreatedCollab[]>([]);

  const showError = (message: string) => {
    setError({ message, isVisible: true });
    setTimeout(() => setError(prev => ({ ...prev, isVisible: false })), 5000);
  };

  const loadData = useCallback(async () => {
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
          .from('collabs').select('template_id, metadata').in('id', activeCollabIds);
        if (collabsError) throw new Error(`Failed to fetch collab metadata: ${collabsError.message}`);
        if (collabs) {
          activeTemplateIds = collabs
            .map(c => c.template_id || ((c.metadata && typeof c.metadata === 'object' && 'template_id' in c.metadata) ? c.metadata.template_id as string : null))
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

      // Load user-created collabs the user participates in
      if (activeCollabIds.length > 0) {
        const { data: userCreatedData } = await supabase
          .from('collabs')
          .select('id, title, description, type')
          .in('id', activeCollabIds)
          .eq('is_user_created', true);

        if (userCreatedData && userCreatedData.length > 0) {
          const { data: participantRows } = await supabase
            .from('collab_participants')
            .select('collab_id, role, invite_status')
            .eq('profile_id', user.id)
            .eq('status', 'active')
            .in('collab_id', (userCreatedData as Array<{ id: string }>).map(c => c.id));

          const roleMap: Record<string, { role: string; invite_status: string }> = {};
          for (const r of (participantRows ?? []) as Array<{ collab_id: string; role: string; invite_status: string | null }>) {
            roleMap[r.collab_id] = { role: r.role, invite_status: r.invite_status ?? 'accepted' };
          }

          setUserCreatedCollabs(
            (userCreatedData as Array<{ id: string; title: string; description: string; type: string }>).map(c => ({
              id: c.id,
              title: c.title,
              description: c.description || '',
              type: c.type || 'theme',
              role: roleMap[c.id]?.role ?? 'member',
              invite_status: roleMap[c.id]?.invite_status ?? 'accepted',
            }))
          );
        }
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load collaboration data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);


  const handleJoinClick = async (collabId: string, title: string, mode: ParticipationMode) => {
    try {
      if (mode === 'private') {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(userError.message);
        if (!user) { showError('You must be logged in'); return; }
        const template = availablePrompts.find(t => t.id === collabId);
        if (!template) { showError('Template not found'); return; }
        if (!currentPeriod.id) { showError('No active period found'); return; }

        // Find-or-create: one private collab row per template + period
        const { data: existingPrivate } = await supabase
          .from('collabs')
          .select('id')
          .eq('template_id', template.id)
          .eq('participation_mode', 'private')
          .eq('period_id', currentPeriod.id)
          .maybeSingle();

        let targetCollabId: string;
        if (existingPrivate) {
          targetCollabId = existingPrivate.id;
        } else {
          const { data: newCollab, error: collabError } = await supabase
            .from('collabs')
            .insert({
              title: template.name,
              description: template.display_text,
              type: template.type || 'theme',
              is_private: true,
              participation_mode: 'private',
              is_user_created: false,
              template_id: template.id,
              period_id: currentPeriod.id,
              created_by: user.id,
              metadata: { participation_mode: 'private', location: null },
            })
            .select('id')
            .single();
          if (collabError || !newCollab) throw new Error(`Could not create collaboration: ${collabError?.message}`);
          targetCollabId = newCollab.id;
        }

        // Count accepted+active participants to determine role (first joiner = lead)
        const { count: acceptedCount } = await supabase
          .from('collab_participants')
          .select('*', { count: 'exact', head: true })
          .eq('collab_id', targetCollabId)
          .eq('status', 'active')
          .or('invite_status.is.null,invite_status.eq.accepted');

        if ((acceptedCount ?? 0) >= 10) {
          showError('This private collab is full (10 participants)');
          return;
        }

        const role = (acceptedCount ?? 0) === 0 ? 'lead' : 'member';

        const { error: participantError } = await supabase
          .from('collab_participants')
          .insert({
            profile_id: user.id,
            collab_id: targetCollabId,
            role,
            status: 'active',
            participation_mode: 'private',
            invite_status: 'accepted',
          });
        if (participantError) throw new Error(`Could not join collaboration: ${participantError.message}`);

        if (role === 'lead') {
          router.push(`/collabs/${targetCollabId}/invite`);
        } else {
          router.push('/dashboard');
        }
        return;
      }
      if (mode === 'local') {
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
      if (!currentPeriod.id) { showError('No active period found'); return; }
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      if (!user) { showError('You must be logged in to join a collaboration'); return; }

      // Find-or-create: avoid duplicate community collab rows per template+period
      const { data: existingComm } = await supabase
        .from('collabs')
        .select('id')
        .eq('template_id', template.id)
        .eq('participation_mode', 'community')
        .eq('period_id', currentPeriod.id)
        .maybeSingle();

      let targetCollabId: string;
      if (existingComm) {
        targetCollabId = existingComm.id;
      } else {
        const { data: newCollab, error: collabError } = await supabase
          .from('collabs')
          .insert({ title: template.name, description: template.display_text, type: template.type || 'theme', is_private: false, participation_mode: 'community', location: null, template_id: template.id, period_id: currentPeriod.id, created_by: user.id, total_phases: template.phases || null, current_phase: 1, metadata: { template_id: template.id, participation_mode: 'community', location: null } })
          .select('id').single();
        if (collabError || !newCollab) throw new Error(`Could not create collaboration: ${collabError?.message}`);
        targetCollabId = newCollab.id;
      }

      const { error: participantError } = await supabase
        .from('collab_participants')
        .insert({ profile_id: user.id, collab_id: targetCollabId, role: 'member', status: 'active', participation_mode: mode, location: null });
      if (participantError) throw new Error(`Could not join collaboration: ${participantError.message}`);

      setAvailablePrompts(prev => prev.filter(c => c.id !== collabId));
      alert(`You have successfully joined the ${title} collaboration in ${mode} mode.`);
      router.push('/dashboard');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not join the collaboration');
    }
  };


  const confirmLocalJoin = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      if (!user) { showError('You must be logged in'); return; }
      const template = availablePrompts.find(p => p.id === localTemplateId);
      if (!template) { showError('Template not found'); return; }
      if (!currentPeriod.id) { showError('No active period found'); return; }
      if (!localCity) { showError('Please select a city'); return; }

      // Find-or-create: look for existing local collab for this template + city + period
      const { data: existingLocal } = await supabase
        .from('collabs')
        .select('id')
        .eq('template_id', template.id)
        .eq('participation_mode', 'local')
        .eq('location', localCity)
        .eq('period_id', currentPeriod.id)
        .maybeSingle();

      let targetCollabId: string;
      if (existingLocal) {
        targetCollabId = existingLocal.id;
      } else {
        const { data: newCollab, error: collabError } = await supabase
          .from('collabs')
          .insert({ title: template.name, description: template.display_text, type: template.type || 'theme', is_private: false, participation_mode: 'local', location: localCity, template_id: template.id, period_id: currentPeriod.id, created_by: user.id, total_phases: template.phases || null, current_phase: 1, metadata: { template_id: template.id, participation_mode: 'local', location: localCity } })
          .select('id').single();
        if (collabError || !newCollab) throw new Error(`Could not create collaboration: ${collabError?.message}`);
        targetCollabId = newCollab.id;
      }

      const { error: participantError } = await supabase
        .from('collab_participants')
        .insert({ profile_id: user.id, collab_id: targetCollabId, role: 'member', status: 'active', participation_mode: 'local', location: localCity, city: localCity });
      if (participantError) throw new Error(`Could not join collaboration: ${participantError.message}`);

      setAvailablePrompts(prev => prev.filter(c => c.id !== localTemplateId));
      setShowLocalDialog(false);
      router.push('/dashboard');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not join the collaboration');
    }
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
    borderTop: `1px solid ${state !== 'rest' ? (purple ? 'rgba(168,136,232,0.5)' : 'rgba(224,90,40,0.5)') : (purple ? 'rgba(168,136,232,0.35)' : 'var(--rule-mid)')}`,
    borderRight: `1px solid ${state !== 'rest' ? (purple ? 'rgba(168,136,232,0.5)' : 'rgba(224,90,40,0.5)') : (purple ? 'rgba(168,136,232,0.35)' : 'var(--rule-mid)')}`,
    borderLeft: `1px solid ${state !== 'rest' ? (purple ? 'rgba(168,136,232,0.5)' : 'rgba(224,90,40,0.5)') : (purple ? 'rgba(168,136,232,0.35)' : 'var(--rule-mid)')}`,
    borderBottom: `2px solid ${state === 'pressing' ? (purple ? 'rgba(168,136,232,0.6)' : 'rgba(224,90,40,0.6)') : (purple ? 'rgba(168,136,232,0.45)' : 'var(--ground-4)')}`,
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
    chain:     { color: 'var(--neon-purple)', bg: 'rgba(168,136,232,0.08)', border: 'rgba(168,136,232,0.25)' },
    theme:     { color: 'var(--neon-amber)',  bg: 'rgba(224,168,48,0.08)',  border: 'rgba(224,168,48,0.25)'  },
    narrative: { color: 'var(--neon-green)',  bg: 'rgba(78,196,122,0.08)',  border: 'rgba(78,196,122,0.25)'  },
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
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400, color: 'var(--paper)', margin: 0, lineHeight: 1.2, opacity: 0.88 }}>{collab.name}</h3>
            <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.color, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 2, padding: '2px 7px' }}>{collab.type}</span>
          </div>

          {/* Description */}
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--paper-3)', lineHeight: 1.5, margin: '0 0 12px' }}>{collab.display_text}</p>

          {/* Instructions */}
          {collab.instructions && (
            <div style={{ background: 'rgba(224,168,48,0.05)', borderTop: '1px solid rgba(224,168,48,0.2)', borderRight: '1px solid rgba(224,168,48,0.2)', borderBottom: '1px solid rgba(224,168,48,0.2)', borderLeft: '3px solid var(--neon-amber)', borderRadius: 2, padding: '10px 12px', marginBottom: 12 }}>
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
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--neon-blue)', flexShrink: 0 }}><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1"/><ellipse cx="6" cy="6" rx="2.5" ry="5" stroke="currentColor" strokeWidth="1"/><path d="M1 6h10" stroke="currentColor" strokeWidth="1"/></svg>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-4)' }}><strong style={{ color: 'var(--neon-blue)' }}>{collab.communityParticipantCount || 0}</strong> community</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--neon-green)', flexShrink: 0 }}><path d="M6 1C4.067 1 2.5 2.567 2.5 4.5C2.5 7 6 11 6 11s3.5-4 3.5-6.5C9.5 2.567 7.933 1 6 1Z" stroke="currentColor" strokeWidth="1"/><circle cx="6" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1"/></svg>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-4)' }}><strong style={{ color: 'var(--neon-green)' }}>{collab.localParticipantCount || 0}</strong> local</span>
            </div>
          </div>

          {/* Join buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {([
              {
                mode: 'community' as const, label: 'Community', color: 'var(--neon-blue)', bg: 'rgba(90,159,212,0.08)', border: 'rgba(90,159,212,0.25)',
                icon: <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1"/><ellipse cx="6" cy="6" rx="2.5" ry="5" stroke="currentColor" strokeWidth="1"/><path d="M1 6h10" stroke="currentColor" strokeWidth="1"/></svg>,
              },
              {
                mode: 'local' as const, label: 'Local', color: 'var(--neon-green)', bg: 'rgba(78,196,122,0.08)', border: 'rgba(78,196,122,0.25)',
                icon: <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1C4.067 1 2.5 2.567 2.5 4.5C2.5 7 6 11 6 11s3.5-4 3.5-6.5C9.5 2.567 7.933 1 6 1Z" stroke="currentColor" strokeWidth="1"/><circle cx="6" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1"/></svg>,
              },
              {
                mode: 'private' as const, label: 'Private', color: 'var(--neon-purple)', bg: 'rgba(168,136,232,0.08)', border: 'rgba(168,136,232,0.25)',
                icon: <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="2" y="5.5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1"/><path d="M4 5.5V3.5C4 2.4 4.9 1.5 6 1.5C7.1 1.5 8 2.4 8 3.5V5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>,
              },
            ] as { mode: ParticipationMode; label: string; icon: React.ReactNode; color: string; bg: string; border: string }[]).map(({ mode, label, icon, color, bg, border }) => (
              <button
                key={mode}
                onClick={() => handleJoinClick(collab.id, collab.name, mode)}
                style={{ padding: '8px 4px', background: bg, border: `1px solid ${border}`, borderRadius: 2, color, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
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
    <div style={{ minHeight: '100vh', background: 'var(--lt-bg)' }}>
      <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: 'var(--lt-bg)', position: 'relative' }}>

        {/* ── Header ── */}
        <div style={{ padding: '22px 26px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 10 }}>
          <Link href="/dashboard" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper-4)', textDecoration: 'none' }}>← Dashboard</Link>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, letterSpacing: '0.04em', color: 'var(--paper)', opacity: 0.88, textShadow: '0 0 20px var(--glow-paper)' }}>
            online<span style={{ color: 'var(--paper-5)', margin: '0 1px' }}>//</span>offline
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon-amber)', textShadow: '0 0 6px var(--glow-amber)' }}>Collabs</span>
        </div>

        {/* ── Thick rule ── */}
        <div style={{ height: '1px', background: 'var(--paper)', margin: '13px 26px 0', opacity: 0.8, boxShadow: '0 0 6px 1px rgba(240,235,226,0.25), 0 0 20px rgba(240,235,226,0.08)', position: 'relative', zIndex: 10 }} />

        {/* ── Period strip ── */}
        <div style={{ padding: '9px 26px 0', display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 10 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '12px', color: 'var(--paper-3)', whiteSpace: 'nowrap' }}>
            {currentPeriod.season} {currentPeriod.year}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, var(--rule-mid), transparent)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper-5)', whiteSpace: 'nowrap' }}>Collab Prompts</span>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: '16px 26px 80px', position: 'relative', zIndex: 10 }}>

          {/* Error */}
          {error.isVisible && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(224,90,40,0.08)', borderTop: '1px solid rgba(224,90,40,0.25)', borderRight: '1px solid rgba(224,90,40,0.25)', borderBottom: '1px solid rgba(224,90,40,0.25)', borderLeft: '3px solid var(--neon-accent)', borderRadius: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--neon-accent)' }}>{error.message}</span>
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
            <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '14px', color: 'var(--paper-4)' }}>You&apos;ve joined all available prompts for this period.</span>
              <button onClick={loadData} className="press-btn" style={{ padding: '10px 20px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Refresh</button>
            </div>
          )}

          {/* Create your own CTA */}
          <div style={{ marginTop: 24 }}>
            <div style={{
              background: 'rgba(168,136,232,0.04)',
              borderTop: '1px solid rgba(168,136,232,0.12)',
              borderRight: '1px solid rgba(168,136,232,0.12)',
              borderBottom: '1px solid rgba(168,136,232,0.12)',
              borderLeft: '2px solid var(--neon-purple)',
              boxShadow: '-3px 0 10px -2px var(--glow-purple)',
              borderRadius: 2,
              padding: '16px 16px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--paper-2)', lineHeight: 1.2, marginBottom: 4 }}>
                  Start your own
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--paper-4)', lineHeight: 1.4 }}>
                  Create a private collab and invite contributors directly.
                </div>
              </div>
              <Link href="/collabs/create" style={{ textDecoration: 'none', flexShrink: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: 'var(--neon-purple)',
                  padding: '7px 14px',
                  background: 'rgba(168,136,232,0.1)',
                  borderTop: '1px solid rgba(168,136,232,0.35)',
                  borderRight: '1px solid rgba(168,136,232,0.35)',
                  borderLeft: '1px solid rgba(168,136,232,0.35)',
                  borderBottom: '2px solid rgba(168,136,232,0.45)',
                  borderRadius: 2,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 0 rgba(168,136,232,0.2)',
                }}>
                  Create →
                </div>
              </Link>
            </div>
          </div>

          {/* User-created collabs */}
          {userCreatedCollabs.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper-5)' }}>Your Collabs</div>
                <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {userCreatedCollabs.map(c => (
                  <div key={c.id} style={{ position: 'relative' }}>
                    <Link href={`/collabs/${c.id}/submit`} style={{ textDecoration: 'none', display: 'block' }}>
                      <div style={{
                        background: 'var(--ground-2)',
                        borderTop: '1px solid var(--rule)',
                        borderRight: '1px solid var(--rule)',
                        borderBottom: '1px solid var(--rule)',
                        borderLeft: `2px solid ${c.role === 'lead' ? 'var(--neon-purple)' : 'rgba(168,136,232,0.35)'}`,
                        boxShadow: c.role === 'lead' ? '-3px 0 10px -2px var(--glow-purple)' : 'none',
                        borderRadius: 2,
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--paper)', opacity: 0.9, lineHeight: 1.2, marginBottom: 3 }}>{c.title}</div>
                          {c.description && (
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--paper-4)', lineHeight: 1.4 }}>
                              {c.description.length > 80 ? c.description.slice(0, 80) + '…' : c.description}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.role === 'lead' ? 'var(--neon-purple)' : 'var(--paper-4)', background: c.role === 'lead' ? 'rgba(168,136,232,0.1)' : 'transparent', border: `1px solid ${c.role === 'lead' ? 'rgba(168,136,232,0.25)' : 'var(--rule)'}`, borderRadius: 2, padding: '2px 6px' }}>
                            {c.role}
                          </span>
                        </div>
                      </div>
                    </Link>
                    {c.role === 'lead' && (
                      <Link href={`/collabs/${c.id}/invite`} style={{ textDecoration: 'none', position: 'absolute', bottom: 10, right: 14 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--paper-4)', background: 'transparent', border: '1px solid var(--rule-mid)', borderRadius: 2, padding: '2px 7px' }}>+ invite</span>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

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
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(78,196,122,0.5)'; }}
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
                  style={{ ...pressStyle(localJoinPress), color: 'var(--neon-green)', textShadow: '0 0 6px var(--glow-green)', background: localJoinPress === 'pressing' ? 'rgba(78,196,122,0.2)' : 'rgba(78,196,122,0.1)', borderTop: `1px solid ${localJoinPress !== 'rest' ? 'rgba(78,196,122,0.5)' : 'rgba(78,196,122,0.35)'}`, borderRight: `1px solid ${localJoinPress !== 'rest' ? 'rgba(78,196,122,0.5)' : 'rgba(78,196,122,0.35)'}`, borderLeft: `1px solid ${localJoinPress !== 'rest' ? 'rgba(78,196,122,0.5)' : 'rgba(78,196,122,0.35)'}`, borderBottom: `2px solid ${localJoinPress === 'pressing' ? 'rgba(78,196,122,0.6)' : 'rgba(78,196,122,0.45)'}`, opacity: !localCity ? 0.4 : 1, cursor: !localCity ? 'not-allowed' : 'pointer' }}
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
