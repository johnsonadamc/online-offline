'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { CITIES } from '@/lib/constants/cities';
import { PageShell, Pill, Sheet, Toast, Brief, Icon, tint, SERIF, SANS, MONO } from '@/components/v2';

interface CollabTemplate {
  id: string;
  name: string;
  display_text: string;
  type: 'chain' | 'theme' | 'narrative' | string;
  tags?: string[];
  phases?: number;
  duration?: string;
  instructions?: string;
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

// v2 wordmark (design `.wordmark`): 19px serif, "//" in --ink3.
const Wordmark = () => (
  <div style={{ font: `400 19px/1 ${SERIF}`, color: 'var(--ink)' }}>
    online<span style={{ color: 'var(--ink3)' }}>{'//'}</span>offline
  </div>
);

// Local "Joined" pill reads a city abbreviation: initials for multi-word cities
// (NY, LA, SF, SD, SA, NO), first three letters otherwise (ATL, PEN, SEA).
const cityAbbrev = (city: string): string => {
  const words = city.split(' ').filter(Boolean);
  return (words.length > 1 ? words.map(w => w[0]).join('') : city.slice(0, 3)).toUpperCase();
};

const MODE_ACCENT = { community: 'blue', local: 'green', private: 'purple' } as const;
const MODE_ICON = { community: 'people', local: 'pin', private: 'lock' } as const;

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

  const [userCreatedCollabs, setUserCreatedCollabs] = useState<UserCreatedCollab[]>([]);
  // Phase 12 UI-only state: community-join toast (replaces alert) + which pill was just tapped (fills with its mode color).
  const [joinToast, setJoinToast] = useState<string | null>(null);
  const [tappedPill, setTappedPill] = useState<{ id: string; mode: ParticipationMode } | null>(null);

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

      setAvailablePrompts(filteredTemplates);

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
      setJoinToast(`You have successfully joined the ${title} collaboration in ${mode} mode.`);
      setTimeout(() => router.push('/dashboard'), 1200);
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

  // ── v2 surface ───────────────────────────────────────────────────────────────
  // Design `.card`: r12, --bg2, 1px --line border, 18px padding; serif 22 title,
  // italic serif 14.5 description; pills row above a --line hairline.
  const cardStyle: React.CSSProperties = {
    marginTop: 12, borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line)',
    borderRadius: 12, background: 'var(--bg2)', padding: '18px 18px 14px',
  };
  const pillsRow: React.CSSProperties = {
    display: 'flex', gap: 6, marginTop: 14, paddingTop: 12,
    borderWidth: '1px 0 0 0', borderStyle: 'solid', borderColor: 'var(--line)',
  };
  const btnPri: React.CSSProperties = {
    flex: 1, font: `500 12px/1 ${SANS}`, letterSpacing: '0.14em', textTransform: 'uppercase',
    padding: '15px 18px', borderRadius: 5, borderWidth: 0, textAlign: 'center', whiteSpace: 'nowrap',
    cursor: 'pointer', color: '#0d0c0a', background: 'var(--green)',
    boxShadow: '0 0 28px color-mix(in oklch, var(--green) 35%, transparent)', WebkitTapHighlightColor: 'transparent',
  };

  return (
    <PageShell
      // Header — design `.top`: "‹ Dashboard", wordmark, "Collabs" in gold
      header={(
        <>
          <Link href="/dashboard" style={{ font: `500 12px/1 ${SANS}`, color: 'var(--ink2)', textDecoration: 'none', flex: 'none' }}>‹ Dashboard</Link>
          <Wordmark />
          <span style={{ font: `500 12px/1 ${SANS}`, color: 'var(--gold)', flex: 'none' }}>Collabs</span>
        </>
      )}
      columnStyle={{ paddingBottom: 40 }}
    >
      <Toast open={error.isVisible} message={error.message} accent="orange" duration={0} onClose={() => setError(prev => ({ ...prev, isVisible: false }))} />
      <Toast open={joinToast !== null} message={joinToast ?? ''} accent="green" duration={2600} onClose={() => setJoinToast(null)} />

      {loading ? (
        <div style={{ paddingTop: 26, font: `400 12px/1 ${MONO}`, letterSpacing: '0.14em', color: 'var(--ink3)', textAlign: 'center' }}>loading…</div>
      ) : availablePrompts.length > 0 ? (
        <div style={{ paddingTop: 8 }}>
          {availablePrompts.map(collab => (
            <div key={collab.id} style={cardStyle}>
              <h3 style={{ margin: 0, font: `400 22px/1.1 ${SERIF}`, color: 'var(--ink)', minWidth: 0 }}>{collab.name}</h3>
              <p style={{ margin: '6px 0 0', font: `italic 400 14.5px/1.45 ${SERIF}`, color: 'var(--ink2)', textWrap: 'pretty' } as React.CSSProperties}>{collab.display_text}</p>
              {/* Contributor brief — collab_templates.instructions (the field /collabs/[id]/submit shows);
                  collapsed by default so the gold PROMPT label is always visible before joining */}
              {collab.instructions?.trim() && (
                <Brief defaultOpen={false} style={{ marginTop: 14 }}>{collab.instructions}</Brief>
              )}
              {/* Join actions — the same handleJoinClick(id, title, mode) for all three modes */}
              <div style={pillsRow}>
                {(['community', 'local', 'private'] as const).map(mode => (
                  <Pill
                    key={mode}
                    accent={MODE_ACCENT[mode]}
                    icon={MODE_ICON[mode]}
                    label={mode === 'community' ? 'Community' : mode === 'local' ? 'Local' : 'Private'}
                    tinted
                    selected={tappedPill?.id === collab.id && tappedPill.mode === mode}
                    onClick={() => { setTappedPill({ id: collab.id, mode }); handleJoinClick(collab.id, collab.name, mode); }}
                    style={{ flex: 1 }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ font: `italic 400 15px/1.4 ${SERIF}`, color: 'var(--ink3)', textAlign: 'center', padding: '26px 0 0' }}>
          You&apos;ve joined all available prompts for this period.
        </div>
      )}

      {/* Start your own — design `.own`: dashed r12 card, 36px purple + tile → /collabs/create */}
      <Link href="/collabs/create" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 14, marginTop: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: 'var(--line2)', borderRadius: 12, padding: 18 }}>
        <span style={{ width: 36, height: 36, borderRadius: 9, display: 'grid', placeItems: 'center', color: 'var(--purple)', background: tint('purple', 12), flex: 'none' }}>
          <Icon name="plus" size={18} strokeWidth={1.6} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h4 style={{ margin: 0, font: `400 20px/1.1 ${SERIF}`, color: 'var(--ink)' }}>Start your own</h4>
          <p style={{ margin: '4px 0 0', font: `400 12.5px/1 ${SANS}`, color: 'var(--ink3)' }}>A private collab you lead. Up to 10.</p>
        </div>
      </Link>

      {/* Your collabs (user-created, joined) — same card; filled purple "Joined" pill + mono "lead" sub-line;
          title → /collabs/[id]/submit, lead's "Invite" pill → /collabs/[id]/invite (routes unchanged) */}
      {userCreatedCollabs.length > 0 && (
        <div style={{ paddingTop: 26 }}>
          <div style={{ font: `500 10px/1 ${MONO}`, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink3)' }}>Your collabs</div>
          {userCreatedCollabs.map(c => (
            <div key={c.id} style={cardStyle}>
              <Link href={`/collabs/${c.id}/submit`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <h3 style={{ margin: 0, font: `400 22px/1.1 ${SERIF}`, color: 'var(--ink)', minWidth: 0 }}>{c.title}</h3>
                {c.role === 'lead' && (
                  <div style={{ margin: '5px 0 0', font: `400 11px/1 ${MONO}`, color: 'var(--purple)' }}>lead</div>
                )}
                {c.description && (
                  <p style={{ margin: '6px 0 0', font: `italic 400 14.5px/1.45 ${SERIF}`, color: 'var(--ink2)', textWrap: 'pretty' } as React.CSSProperties}>
                    {c.description.length > 80 ? c.description.slice(0, 80) + '…' : c.description}
                  </p>
                )}
              </Link>
              <div style={pillsRow}>
                <Pill accent="purple" icon="lock" label="Joined" selected disabled style={{ flex: 1.4 }} />
                {c.role === 'lead' && (
                  <Pill accent="purple" icon="people" label="Invite" tinted onClick={() => router.push(`/collabs/${c.id}/invite`)} style={{ flex: 1 }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Local city sheet — the existing dialog state; Join → confirmLocalJoin (unchanged) */}
      <Sheet open={showLocalDialog} onClose={() => setShowLocalDialog(false)} title={localCollabTitle} subtitle="Join locally — choose your city">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 18 }}>
          {CITIES.map(city => (
            <Pill
              key={city}
              accent="green"
              label={city}
              selected={localCity === city}
              onClick={() => setLocalCity(city)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={confirmLocalJoin}
          disabled={!localCity}
          style={{ ...btnPri, width: '100%', opacity: !localCity ? 0.4 : 1, cursor: !localCity ? 'default' : 'pointer' }}
        >
          {localCity ? `Join local · ${cityAbbrev(localCity)}` : 'Join local'}
        </button>
      </Sheet>
    </PageShell>
  );
}
