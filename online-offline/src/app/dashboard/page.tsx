"use client";

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import { PageShell, IconTile, TypeTile, SectionLabel, SwipeRow, Toast, Icon, accentVar, tint, SERIF, SANS, MONO } from '@/components/v2';
import type { Accent, IconName, CollabMode } from '@/components/v2';

import {
  fetchCurrentPeriodDraft,
  getCurrentPeriod,
  deleteContent,
  withdrawContent
} from '@/lib/supabase/content';
import {
  getUserCollabs,
  leaveCollab,
} from '@/lib/supabase/collabs';
import {
  getDraftCommunications,
  getSubmittedCommunications,
  withdrawCommunication,
  deleteDraftCommunication
} from '@/lib/supabase/communications';

// ── Interfaces ──────────────────────────────────────────────────────────────────────────────

interface ContentSubmission {
  id: string;
  title: string;
  status: string;
  period: string;
  date: string;
  type: string;
  imageCount: number;
  format?: string;
  textExcerpt?: string;
  /** Feature entry (else first by order_index) media_url — from the same draft fetch, no new query. */
  thumbnail?: string;
}

interface ActiveCollab {
  id: string;
  title: string;
  mode: string;
  location?: string | null;
  participants: number;
  type: string;
  status?: string;
  userRole?: string;
  isPendingInvite?: boolean;
}

interface CollabData {
  id: string;
  title: string;
  type?: string;
  is_private?: boolean;
  participation_mode?: string;
  location?: string | null;
  participants?: { name: string; role: string }[];
  participantCount?: number;
  status?: string;
  userRole?: string;
  isPendingInvite?: boolean;
  metadata?: { status?: string; [key: string]: unknown };
  [key: string]: unknown;
}

interface Communication {
  id: string;
  subject: string;
  status: string;
  recipient: string;
  date: string;
}

interface Period {
  id: string;
  name: string;
  season: string;
  year: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface CommunicationProfile {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

interface ConfirmActionState {
  action: string;
  id: string;
}

// ── Component ─────────────────────────────────────────────────────────────────────────────

// v2 meaning map for the dashboard rows: content orange, collabs blue, comms gold.
const SECTION_ACCENT: Record<string, Accent> = { content: 'orange', collabs: 'blue', comms: 'gold' };

export default function Dashboard() {
  const router = useRouter();
  const supabase = useSupabase();

  // ── Existing state (unchanged) ──────────────────────────────────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState>({ action: '', id: '' });
  const [deleteCommId, setDeleteCommId] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteContentId, setDeleteContentId] = useState('');
  const [showDeleteContentConfirm, setShowDeleteContentConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [contentSubmission, setContentSubmission] = useState<ContentSubmission | null>(null);
  const [activeCollabs, setActiveCollabs] = useState<ActiveCollab[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // ── Visual-only UI state ────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<string | null>('content');

  // ── Notification helpers (unchanged) ───────────────────────────────────────────────
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };
  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 3000);
  };

  // ── Confirm dialog helpers (unchanged) ────────────────────────────────────────────
  const showConfirmDialog = (action: string, id: string) => {
    setConfirmAction({ action, id });
    setShowConfirm(true);
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmAction.action === 'leave') {
        const result = await leaveCollab(supabase, confirmAction.id);
        if (result.success) {
          setActiveCollabs(prev => prev.filter(c => c.id !== confirmAction.id));
          showSuccess('Successfully left collaboration');
        } else {
          showError(result.error || 'Failed to leave collaboration');
        }
      } else if (confirmAction.action === 'withdraw') {
        const result = await withdrawCommunication(supabase, confirmAction.id);
        if (result.success) {
          setCommunications(prev =>
            prev.map(c => c.id === confirmAction.id ? { ...c, status: 'draft' } : c)
          );
          showSuccess('Communication withdrawn successfully');
        } else {
          showError(result.error || 'Failed to withdraw communication');
        }
      }
      setShowConfirm(false);
    } catch {
      showError('An unexpected error occurred');
      setShowConfirm(false);
    }
  };

  const handleDeleteCommunication = async () => {
    try {
      const result = await deleteDraftCommunication(supabase, deleteCommId);
      if (result.success) {
        setCommunications(prev => prev.filter(c => c.id !== deleteCommId));
        showSuccess('Communication deleted successfully');
      } else {
        showError(result.error || 'Failed to delete communication');
      }
      setShowDeleteConfirm(false);
      setDeleteCommId('');
    } catch {
      showError('Error deleting communication');
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteContent = async () => {
    try {
      const result = await deleteContent(supabase, deleteContentId);
      if (result.success) {
        setContentSubmission(null);
        showSuccess('Content deleted successfully');
      } else {
        showError(result.error || 'Failed to delete content');
      }
      setShowDeleteContentConfirm(false);
      setDeleteContentId('');
    } catch {
      showError('Error deleting content');
      setShowDeleteContentConfirm(false);
    }
  };

  const handleWithdrawContent = async () => {
    if (!contentSubmission) return;
    const result = await withdrawContent(supabase, contentSubmission.id);
    if (result.success) {
      setContentSubmission(prev => prev ? { ...prev, status: 'draft' } : null);
      showSuccess('Submission withdrawn');
    } else {
      showError(result.error || 'Failed to withdraw submission');
    }
  };

  // ── Invite accept/decline ─────────────────────────────────────────────────────────────
  const handleAcceptInvite = async (collabId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('collab_participants')
        .update({ invite_status: 'accepted' })
        .eq('collab_id', collabId)
        .eq('profile_id', user.id);
      if (error) { showError('Failed to accept invitation'); return; }
      setActiveCollabs(prev =>
        prev.map(c => c.id === collabId ? { ...c, isPendingInvite: false } : c)
      );
      showSuccess('Invitation accepted');
    } catch {
      showError('Failed to accept invitation');
    }
  };

  const handleDeclineInvite = async (collabId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('collab_participants')
        .update({ invite_status: 'declined' })
        .eq('collab_id', collabId)
        .eq('profile_id', user.id);
      if (error) { showError('Failed to decline invitation'); return; }
      setActiveCollabs(prev => prev.filter(c => c.id !== collabId));
      showSuccess('Invitation declined');
    } catch {
      showError('Failed to decline invitation');
    }
  };

  // ── Data helpers (unchanged) ──────────────────────────────────────────────────────────
  const getCollabType = (type: string | undefined): string => {
    if (!type || type === 'regular' || type === 'fullSpread') return 'chain';
    return type;
  };

  const getRecipientName = (profiles: CommunicationProfile | CommunicationProfile[] | undefined): string => {
    if (!profiles) return 'Unknown Recipient';
    if (Array.isArray(profiles)) {
      if (profiles.length > 0) {
        const p = profiles[0];
        return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
      }
      return 'Unknown Recipient';
    }
    return `${profiles.first_name || ''} ${profiles.last_name || ''}`.trim() || 'Unknown';
  };

  // ── Data loading (unchanged) ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const periodResult = await getCurrentPeriod(supabase);
        if (periodResult?.success && periodResult.period) {
          setCurrentPeriod(periodResult.period as Period);
        }

        const draftResult = await fetchCurrentPeriodDraft(supabase);
        if (draftResult.success && draftResult.draft) {
          const draft = draftResult.draft;
          let title = draft.page_title || '';
          if (!title && draft.content_entries?.length > 0) title = draft.content_entries[0].title || '';
          if (!title) title = 'Untitled';
          const fmt: string = draft.format || 'image';
          const rawBody: string = draft.content_entries?.[0]?.body || '';
          const excerpt = rawBody.length > 80 ? rawBody.slice(0, 80).trimEnd() + '…' : rawBody;
          const entries = [...(draft.content_entries || [])].sort(
            (a: { order_index?: number }, b: { order_index?: number }) => (a.order_index ?? 0) - (b.order_index ?? 0)
          );
          const thumbEntry = entries.find((e: { is_feature?: boolean }) => e.is_feature) || entries[0];
          setContentSubmission({
            id: draft.id,
            title,
            status: draft.status,
            period: periodResult?.period?.name || '',
            date: new Date(draft.updated_at).toLocaleDateString(),
            type: draft.type || 'photo',
            imageCount: (draft.content_entries || []).length,
            format: fmt,
            textExcerpt: fmt === 'text' ? excerpt : undefined,
            thumbnail: fmt === 'text' ? undefined : (thumbEntry?.media_url || undefined),
          });
        } else {
          setContentSubmission(null);
        }

        const collabsResult = await getUserCollabs(supabase);
        if (collabsResult) {
          const combined = [
            ...(collabsResult.private || []),
            ...(collabsResult.community || []),
            ...(collabsResult.local || []),
          ];
          const collabIds = combined.map((c) => (c as unknown as CollabData).id);
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          let submittedCollabIds: string[] = [];
          if (currentUser && collabIds.length > 0) {
            const { data: subData } = await supabase
              .from('collab_submissions')
              .select('collab_id')
              .eq('contributor_id', currentUser.id)
              .eq('status', 'submitted')
              .in('collab_id', collabIds);
            submittedCollabIds = subData?.map(s => s.collab_id) || [];
          }
          setActiveCollabs(combined.map((c) => {
            const cd = c as unknown as CollabData;
            const status = submittedCollabIds.includes(cd.id) ? 'submitted' : 'draft';
            return {
              id: cd.id,
              title: cd.title,
              mode: cd.participation_mode || (cd.is_private ? 'private' : 'community'),
              location: cd.location,
              participants: cd.participantCount || 0,
              type: getCollabType(cd.type),
              status: status as string,
              userRole: cd.userRole,
              isPendingInvite: cd.isPendingInvite,
            };
          }));
        }

        const [draftComms, submittedComms] = await Promise.all([
          getDraftCommunications(supabase),
          getSubmittedCommunications(supabase),
        ]);
        const allComms: Communication[] = [];
        if (draftComms.success && draftComms.drafts) {
          allComms.push(...draftComms.drafts.map(c => ({
            id: c.id,
            subject: c.subject || 'No Subject',
            status: 'draft',
            recipient: getRecipientName(c.profiles),
            date: new Date(c.updated_at).toLocaleDateString(),
          })));
        }
        if (submittedComms.success && submittedComms.submissions) {
          allComms.push(...submittedComms.submissions.map(c => ({
            id: c.id,
            subject: c.subject || 'No Subject',
            status: 'submitted',
            recipient: getRecipientName(c.profiles),
            date: new Date(c.created_at || Date.now()).toLocaleDateString(),
          })));
        }
        setCommunications(allComms);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
          if (profileData?.avatar_url) setAvatarUrl(profileData.avatar_url);
        }

        setIsLoading(false);
      } catch {
        showError('Failed to load dashboard data');
        setIsLoading(false);
      }
    };
    loadData();
  }, [supabase]);

  // ── Visual-only handlers ────────────────────────────────────────────────────────────
  const toggleSection = (id: string) => {
    setActiveSection(prev => (prev === id ? null : id));
  };

  // ── Inline dialog components (restyled) ───────────────────────────────────────────
  // v2 tokens (Phase 12): --bg2 card, 1px --line2, radius 12, 45% scrim; ghost = outlined ink2,
  // destructive = outlined orange (no filled colored panel per the color rules).
  const dialogOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
  };
  const dialogCard: React.CSSProperties = {
    background: 'var(--bg2)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)',
    borderRadius: 12, maxWidth: '320px', width: '90%', padding: '20px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  };
  const dialogTitle: React.CSSProperties = {
    font: `400 22px/1.1 ${SERIF}`, color: 'var(--ink)',
    marginBottom: '10px',
  };
  const dialogBody: React.CSSProperties = {
    font: `400 13.5px/1.5 ${SANS}`, color: 'var(--ink2)',
    marginBottom: '20px',
  };
  const dialogFooter: React.CSSProperties = {
    display: 'flex', justifyContent: 'flex-end', gap: '10px',
  };
  const ghostBtn: React.CSSProperties = {
    padding: '10px 14px', background: 'transparent',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)', borderRadius: 5,
    font: `500 12px/1 ${SANS}`, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: 'var(--ink2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
  };
  const destructiveBtn: React.CSSProperties = {
    padding: '10px 14px', background: 'transparent',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--orange)', borderRadius: 5,
    font: `500 12px/1 ${SANS}`, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: 'var(--orange)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
  };

  const ConfirmationDialog = () => {
    if (!showConfirm) return null;
    const text = confirmAction.action === 'leave'
      ? 'Are you sure you want to leave this collaboration?'
      : confirmAction.action === 'withdraw'
      ? 'Are you sure you want to withdraw this communication?'
      : 'Are you sure you want to proceed?';
    return (
      <div style={dialogOverlay}>
        <div style={dialogCard}>
          <div style={dialogTitle}>Confirm</div>
          <div style={dialogBody}>{text}</div>
          <div style={dialogFooter}>
            <button style={ghostBtn} onClick={() => setShowConfirm(false)}>Cancel</button>
            <button style={destructiveBtn} onClick={handleConfirmAction}>Confirm</button>
          </div>
        </div>
      </div>
    );
  };

  const DeleteCommDialog = () => {
    if (!showDeleteConfirm) return null;
    return (
      <div style={dialogOverlay}>
        <div style={dialogCard}>
          <div style={dialogTitle}>Delete Communication</div>
          <div style={dialogBody}>Are you sure you want to delete this draft? This cannot be undone.</div>
          <div style={dialogFooter}>
            <button style={ghostBtn} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
            <button style={destructiveBtn} onClick={handleDeleteCommunication}>Delete</button>
          </div>
        </div>
      </div>
    );
  };

  const DeleteContentDialog = () => {
    if (!showDeleteContentConfirm) return null;
    return (
      <div style={dialogOverlay}>
        <div style={dialogCard}>
          <div style={dialogTitle}>Delete Content</div>
          <div style={dialogBody}>Are you sure you want to delete this submission? This cannot be undone.</div>
          <div style={dialogFooter}>
            <button style={ghostBtn} onClick={() => setShowDeleteContentConfirm(false)}>Cancel</button>
            <button style={destructiveBtn} onClick={handleDeleteContent}>Delete</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Loading state ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageShell align="center">
        <p style={{ margin: 0, textAlign: 'center', font: `400 12px/1 ${MONO}`, letterSpacing: '0.14em', color: 'var(--ink3)' }}>loading…</p>
      </PageShell>
    );
  }

  // v2 section row (design `.brow`): 48px IconTile, serif 24 title, serif 20 count, 14px chevron.
  // Active row's tile takes the section color. Tap → toggleSection (unchanged).
  const SectionRow = ({ id, label, count, icon }: { id: string; label: string; count: number; icon: IconName }) => {
    const open = activeSection === id;
    return (
      <div
        role="button"
        aria-expanded={open}
        onClick={() => toggleSection(id)}
        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 0', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
      >
        <IconTile icon={icon} accent={open ? SECTION_ACCENT[id] : undefined} style={{ transition: 'border-color 0.2s, color 0.2s, background 0.2s' }} />
        <h3 style={{ margin: 0, font: `400 24px/1.1 ${SERIF}`, color: 'var(--ink)', flex: 1, minWidth: 0 }}>{label}</h3>
        <span style={{ font: `400 20px/1 ${SERIF}`, color: 'var(--ink2)', flex: 'none' }}>{count}</span>
        <Icon name="chevron" size={14} strokeWidth={1.5} style={{ color: 'var(--ink3)', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms' }} />
      </div>
    );
  };

  const Expandable = ({ id, children }: { id: string; children: React.ReactNode }) => (
    <div style={{
      maxHeight: activeSection === id ? '1400px' : '0',
      overflow: 'hidden',
      opacity: activeSection === id ? 1 : 0,
      transition: 'max-height 200ms ease-out, opacity 200ms ease-out', // README Interactions: open/close 200ms ease-out
    }}>
      <div style={{ paddingBottom: '20px' }}>{children}</div>
    </div>
  );

  // ── v2 expanded-row chrome (design `.bsub` / `.bitem` / `.piece` / `.msg` / `.badd` / `.mark`) ──
  const modeOf = (m: string): CollabMode => (m === 'private' ? 'private' : m === 'local' ? 'local' : 'community');
  const itemRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0 12px 8px' };
  const itemTitle: React.CSSProperties = { margin: 0, font: `400 19px/1.1 ${SERIF}`, color: 'var(--ink)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
  const subLabel: React.CSSProperties = { display: 'block', padding: '12px 0 2px 8px' };
  const emptyLine: React.CSSProperties = { margin: 0, padding: '14px 0 4px 8px', font: `italic 400 15px/1.4 ${SERIF}`, color: 'var(--ink3)' };
  const quietAction = (warn?: boolean): React.CSSProperties => ({
    font: `500 11px/1 ${SANS}`, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: warn ? 'var(--orange)' : 'var(--ink3)', background: 'none', border: 0, padding: 0, cursor: 'pointer',
  });
  const outlinedBtn = (accent?: Accent): React.CSSProperties => ({
    font: `500 11px/1 ${SANS}`, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 10px', borderRadius: 5,
    borderWidth: 1, borderStyle: 'solid', borderColor: accent ? accentVar(accent) : 'var(--line2)',
    color: accent ? accentVar(accent) : 'var(--ink2)', background: 'transparent', cursor: 'pointer', flex: 'none',
  });
  // 22px right slot: green ✓ when submitted, otherwise empty (design `.mark` / `.mark.done`).
  const Mark = ({ done }: { done: boolean }) => (
    <span aria-label={done ? 'submitted' : undefined} style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: 'none', color: 'var(--green)' }}>
      {done && (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style={{ display: 'block', stroke: 'currentColor', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  );
  // Footer line + 36px "+" square (design `.badd`). The whole line is one tap.
  const AddRow = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <div role="button" onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 14px 8px', font: `400 13.5px/1 ${SANS}`, color: 'var(--ink3)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
      <span>{label}</span>
      <span aria-hidden="true" style={{ width: 36, height: 36, borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)', borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--ink2)', font: `300 20px/1 ${SANS}`, flex: 'none' }}>+</span>
    </div>
  );

  // ── Season bar data (from the already-loaded period; CountdownTimer unchanged) ──
  const periodStart = currentPeriod ? new Date(currentPeriod.start_date).getTime() : 0;
  const periodEnd = currentPeriod ? new Date(currentPeriod.end_date).getTime() : 0;
  const nowMs = Date.now();
  const elapsedPct = periodEnd > periodStart
    ? Math.min(100, Math.max(0, ((nowMs - periodStart) / (periodEnd - periodStart)) * 100))
    : 0;
  const daysLeft = periodEnd ? Math.ceil((periodEnd - nowMs) / 86400000) : Infinity;
  const urgent = daysLeft <= 7; // the only urgency signal: stronger orange + glow

  // ── Up next (new): at most one item, by priority, from data already on the page ──
  const upNext = ((): { message: string; go: () => void } | null => {
    const invite = activeCollabs.find(c => c.isPendingInvite);
    if (invite) return { message: `${invite.title} invited you`, go: () => setActiveSection('collabs') };
    if (daysLeft <= 14) {
      const due = activeCollabs.find(c => !c.isPendingInvite && c.status !== 'submitted');
      if (due) {
        const n = Math.max(0, daysLeft);
        return { message: `${due.title} due in ${n} day${n === 1 ? '' : 's'}`, go: () => router.push(`/collabs/${due.id}/submit`) };
      }
    }
    const draftNote = communications.find(c => c.status === 'draft');
    if (draftNote) return { message: `Finish your note to ${draftNote.recipient}`, go: () => router.push(`/communicate/${draftNote.id}`) };
    if (!contentSubmission) return { message: 'Submit your first piece', go: () => router.push('/submit') };
    return null;
  })();

  const tabStyle = (on: boolean): React.CSSProperties => ({
    font: `500 13px/1 ${SANS}`,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: on ? 'var(--ink)' : 'var(--ink3)',
    background: 'none',
    borderWidth: '0 0 1px 0',
    borderStyle: 'solid',
    borderColor: on ? 'var(--ink)' : 'transparent',
    padding: '0 0 14px',
    marginBottom: -1,
    cursor: on ? 'default' : 'pointer',
    WebkitTapHighlightColor: 'transparent',
  });

  // ── Main return ──────────────────────────────────────────────────────────────
  return (
    <PageShell
      // Header — design `.top`: wordmark 22px serif ("//" in --ink3) + 32px avatar → /profile
      header={(
        <>
          <div style={{ font: `400 22px/1 ${SERIF}`, color: 'var(--ink)' }}>
            online<span style={{ color: 'var(--ink3)' }}>{'//'}</span>offline
          </div>
          <Link href="/profile" aria-label="Profile" style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', position: 'relative', flex: 'none', display: 'block', background: 'linear-gradient(135deg,#4a4f47,#26292a)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)' }}>
            {avatarUrl && <NextImage src={avatarUrl} alt="Profile" fill sizes="32px" style={{ objectFit: 'cover' }} />}
          </Link>
        </>
      )}
    >
      {/* ── Toasts ── */}
      {/* v2 Toast driven by the unchanged showSuccess/showError (they clear the message after 3s). */}
      <Toast open={!!successMessage} message={successMessage} accent="green" duration={0} onClose={() => setSuccessMessage('')} />
      <Toast open={!!errorMessage} message={errorMessage} accent="orange" duration={0} onClose={() => setErrorMessage('')} />

      {/* ── Dialogs ── */}
      <ConfirmationDialog />
      <DeleteCommDialog />
      <DeleteContentDialog />

      {/* ── Season bar — design `.season`: italic serif name, 1px track with orange elapsed fill, mono days remaining ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 22 }}>
        <span style={{ font: `italic 400 17px/1 ${SERIF}`, color: 'var(--ink2)', whiteSpace: 'nowrap' }}>
          {currentPeriod ? `${currentPeriod.season} ${currentPeriod.year}` : '—'}
        </span>
        <span aria-hidden="true" style={{ flex: 1, minWidth: 0, height: 1, background: 'var(--line2)', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, top: urgent ? -0.5 : 0, height: urgent ? 2 : 1, width: `${elapsedPct}%`, background: 'var(--orange)', boxShadow: urgent ? '0 0 8px color-mix(in oklch, var(--orange) 60%, transparent)' : 'none', transition: 'width 0.4s' }} />
        </span>
        <span style={{ font: `400 12px/1 ${MONO}`, color: 'var(--ink2)', whiteSpace: 'nowrap' }}>
          {currentPeriod?.end_date && (
            <><b style={{ color: 'var(--orange)', fontWeight: 500, textShadow: urgent ? '0 0 10px color-mix(in oklch, var(--orange) 55%, transparent)' : 'none' }}><CountdownTimer endDate={currentPeriod.end_date} /></b>{' remaining'}</>
          )}
        </span>
      </div>

      {/* ── Tabs — design `.tabs`: CONTRIBUTE (active, ink underline) / CURATE → /curate ── */}
      <div style={{ display: 'flex', gap: 26, paddingTop: 26, borderWidth: '0 0 1px 0', borderStyle: 'solid', borderColor: 'var(--line)' }}>
        <button type="button" style={tabStyle(true)}>Contribute</button>
        <button type="button" onClick={() => router.push('/curate')} style={tabStyle(false)}>Curate</button>
      </div>

        {/* ══════════════════════
            CONTRIBUTE TAB
        ══════════════════════ */}
        {(
          <div style={{ padding: '6px 0 80px' }}>

            {/* ── Up next strip — design `.next`: bg2 card, line2 border, faint gold radial, one item max ── */}
            {upNext && (
              <div style={{ margin: '12px 0 6px', padding: '16px 18px', borderRadius: 12, background: 'var(--bg2)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}>
                <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120px 60px at 0% 50%, color-mix(in oklch, var(--gold) 14%, transparent), transparent)', pointerEvents: 'none' }} />
                <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                  <SectionLabel accent="gold" style={{ display: 'block', marginBottom: 6 }}>Up next</SectionLabel>
                  <h4 style={{ margin: 0, font: `400 19px/1.15 ${SERIF}`, color: 'var(--ink)' }}>{upNext.message}</h4>
                </div>
                <button type="button" onClick={upNext.go} style={{ position: 'relative', font: `500 11.5px/1 ${SANS}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)', padding: '10px 12px', borderRadius: 6, background: 'transparent', cursor: 'pointer', flex: 'none' }}>View</button>
              </div>
            )}

            {/* ── Content section ── */}
            <div style={{ borderBottom: '1px solid var(--line)', overflow: 'hidden' }}>
              <SectionRow id="content" label="Content" count={contentSubmission ? 1 : 0} icon="camera" />
              <Expandable id="content">
                {/* Piece — design `.piece`: 56px thumb, serif 21 title, 12.5 meta, italic orange status. Tap → /submit?draft */}
                {contentSubmission ? (
                  <>
                    <div onClick={() => router.push(`/submit?draft=${contentSubmission.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0 14px 8px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                      <span style={{ width: 56, height: 56, borderRadius: 8, borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)', background: 'repeating-linear-gradient(135deg,#1e1c18 0 6px,#171613 6px 12px)', overflow: 'hidden', flex: 'none', display: 'grid', placeItems: 'center', color: 'var(--ink3)' }}>
                        {contentSubmission.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={contentSubmission.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : contentSubmission.format === 'text' ? (
                          <Icon name="quill" size={18} strokeWidth={1.5} />
                        ) : null}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: 0, font: `400 21px/1.1 ${SERIF}`, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contentSubmission.title}</h4>
                        <p style={{ margin: '5px 0 0', font: `400 12.5px/1 ${SANS}`, color: 'var(--ink3)' }}>
                          {contentSubmission.format === 'text'
                            ? 'Text'
                            : `${contentSubmission.imageCount} image${contentSubmission.imageCount !== 1 ? 's' : ''}`}
                          {' · '}
                          <span style={{ textTransform: 'capitalize' }}>{contentSubmission.type}</span>
                        </p>
                      </div>
                      {contentSubmission.status === 'submitted' && (
                        <span style={{ font: `italic 400 13px/1 ${SERIF}`, color: 'var(--orange)', flex: 'none' }}>submitted</span>
                      )}
                      {contentSubmission.status === 'published' && (
                        <span style={{ font: `italic 400 13px/1 ${SERIF}`, color: 'var(--green)', flex: 'none' }}>published</span>
                      )}
                    </div>
                    {/* Quiet action line — design `.rowacts`: Withdraw → handleWithdrawContent · Delete → DeleteContentDialog → handleDeleteContent */}
                    <div style={{ display: 'flex', gap: 18, padding: '0 0 12px 78px' }}>
                      {contentSubmission.status === 'submitted' && (
                        <button type="button" onClick={e => { e.stopPropagation(); handleWithdrawContent(); }} style={quietAction()}>Withdraw</button>
                      )}
                      <button type="button" onClick={e => { e.stopPropagation(); setDeleteContentId(contentSubmission.id); setShowDeleteContentConfirm(true); }} style={quietAction(true)}>Delete</button>
                    </div>
                  </>
                ) : (
                  /* Empty: the row itself is the one tap → /submit */
                  <AddRow label="Submit work" onClick={() => router.push('/submit')} />
                )}
              </Expandable>
            </div>

            {/* ── Collaborations section ── */}
            {(() => {
              const pendingInvites = activeCollabs.filter(c => c.isPendingInvite);
              const activeOnes = activeCollabs.filter(c => !c.isPendingInvite);
              return (
            <div style={{ borderBottom: '1px solid var(--line)', overflow: 'hidden' }}>
              <SectionRow id="collabs" label="Collaborations" count={activeCollabs.length} icon="people" />
              <Expandable id="collabs">
                {/* INVITED — Accept / Decline only; invited rows do not route */}
                {pendingInvites.length > 0 && <SectionLabel style={subLabel}>Invited</SectionLabel>}
                {pendingInvites.map(collab => (
                  <div key={collab.id} style={itemRow}>
                    <TypeTile type={modeOf(collab.mode)} />
                    <h4 style={itemTitle}>{collab.title}</h4>
                    <span style={{ display: 'flex', gap: 6, flex: 'none' }}>
                      <button type="button" onClick={() => handleAcceptInvite(collab.id)} style={outlinedBtn('gold')}>Accept</button>
                      <button type="button" onClick={() => handleDeclineInvite(collab.id)} style={outlinedBtn()}>Decline</button>
                    </span>
                  </div>
                ))}

                {/* ACTIVE — body tap → /collabs/[id]/submit (one tap); swipe left → Leave (existing confirm) */}
                {activeOnes.length > 0 && <SectionLabel style={subLabel}>Active</SectionLabel>}
                {activeOnes.map(collab => (
                  <SwipeRow key={collab.id} action="Leave" accent="orange" onAction={() => showConfirmDialog('leave', collab.id)}>
                    <div onClick={() => router.push(`/collabs/${collab.id}/submit`)} style={{ ...itemRow, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                      <TypeTile type={modeOf(collab.mode)} />
                      <h4 style={itemTitle}>{collab.title}</h4>
                      {collab.mode === 'private' && (
                        /* add-person → /collabs/[id]/invite: lead manages invites, member sees the roster (same page) */
                        <button
                          type="button"
                          aria-label={collab.userRole === 'lead' ? 'Invite' : 'Participants'}
                          title={collab.userRole === 'lead' ? 'Invite' : 'Participants'}
                          onClick={e => { e.stopPropagation(); router.push(`/collabs/${collab.id}/invite`); }}
                          style={{ width: 28, height: 28, borderRadius: 7, display: 'grid', placeItems: 'center', color: 'var(--ink3)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line)', background: 'transparent', cursor: 'pointer', flex: 'none', padding: 0 }}
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style={{ display: 'block', stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                            <circle cx="10" cy="8" r="3.5" />
                            <path d="M3 20c0-3.9 3.1-7 7-7 1.4 0 2.7.4 3.8 1.1M18 14v6M15 17h6" />
                          </svg>
                        </button>
                      )}
                      <Mark done={collab.status === 'submitted'} />
                    </div>
                  </SwipeRow>
                ))}

                {activeOnes.length === 0 && pendingInvites.length === 0 && (
                  <p style={emptyLine}>No active collaborations</p>
                )}

                <AddRow label="Join a new collaboration" onClick={() => router.push('/collabs')} />
              </Expandable>
            </div>
              );
            })()}

            {/* ── Communications section ── */}
            <div style={{ overflow: 'hidden' }}>
              <SectionRow id="comms" label="Communications" count={communications.length} icon="envelope" />
              <Expandable id="comms">
                {/* design `.msg`: gold initial tile, serif 19 name, italic one-line preview, ✓ if sent. Tap → /communicate/[id]; swipe → Withdraw / Delete */}
                {communications.length > 0 ? (
                  communications.map(comm => (
                    <SwipeRow
                      key={comm.id}
                      action={comm.status === 'submitted' ? 'Withdraw' : 'Delete'}
                      accent="orange"
                      onAction={() => {
                        if (comm.status === 'submitted') showConfirmDialog('withdraw', comm.id);
                        else { setDeleteCommId(comm.id); setShowDeleteConfirm(true); }
                      }}
                    >
                      <div onClick={() => router.push(`/communicate/${comm.id}`)} style={{ ...itemRow, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                        <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 7, display: 'grid', placeItems: 'center', color: 'var(--gold)', background: tint('gold'), flex: 'none', font: `400 13px/1 ${SERIF}` }}>
                          {(comm.recipient || '?').charAt(0).toLowerCase()}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ ...itemTitle, flex: 'none' }}>{comm.recipient}</h4>
                          <p style={{ margin: '4px 0 0', font: `italic 400 13px/1 ${SERIF}`, color: 'var(--ink3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{comm.subject}</p>
                        </div>
                        <Mark done={comm.status === 'submitted'} />
                      </div>
                    </SwipeRow>
                  ))
                ) : (
                  <p style={emptyLine}>No messages yet this season</p>
                )}

                <AddRow label="Write to a curator" onClick={() => router.push('/communicate/new')} />
              </Expandable>
            </div>

          </div>
        )}
    </PageShell>
  );
}

// ── CountdownTimer ─────────────────────────────────────────────────────────────────────────────

function CountdownTimer({ endDate }: { endDate: string }) {
  const [display, setDisplay] = React.useState('');

  React.useEffect(() => {
    const update = () => {
      const now = Date.now();
      const end = new Date(endDate).getTime();
      const diff = end - now;
      if (diff <= 0) { setDisplay('0d'); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      if (days > 1) setDisplay(`${days}d`);
      else if (days === 1) setDisplay(`${hours + 24}h`);
      else setDisplay(`${hours}h`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [endDate]);

  return <>{display}</>;
}
