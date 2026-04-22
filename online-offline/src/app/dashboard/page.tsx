"use client";

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';

import {
  fetchCurrentPeriodDraft,
  getCurrentPeriod,
  deleteContent
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

// ── Interfaces ────────────────────────────────────────────────────────────────

interface ContentSubmission {
  id: string;
  title: string;
  status: string;
  period: string;
  date: string;
  type: string;
  imageCount: number;
}

interface ActiveCollab {
  id: string;
  title: string;
  mode: string;
  location?: string | null;
  participants: number;
  type: string;
  status?: string;
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

interface Activity {
  id: string;
  type: string;
  user: string;
  action: string;
  time: string;
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  // ── Existing state (unchanged) ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'contribute' | 'curate'>('contribute');
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
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // ── Visual-only UI state ────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<string | null>('content');
  const [submitPress, setSubmitPress] = useState<'rest' | 'pressing' | 'releasing'>('rest');

  // ── Notification helpers (unchanged) ───────────────────────────────────────
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };
  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 3000);
  };

  // ── Confirm dialog helpers (unchanged) ────────────────────────────────────
  const showConfirmDialog = (action: string, id: string) => {
    setConfirmAction({ action, id });
    setShowConfirm(true);
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmAction.action === 'leave') {
        const result = await leaveCollab(confirmAction.id);
        if (result.success) {
          setActiveCollabs(prev => prev.filter(c => c.id !== confirmAction.id));
          showSuccess('Successfully left collaboration');
        } else {
          showError(result.error || 'Failed to leave collaboration');
        }
      } else if (confirmAction.action === 'withdraw') {
        const result = await withdrawCommunication(confirmAction.id);
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
      const result = await deleteDraftCommunication(deleteCommId);
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
      const result = await deleteContent(deleteContentId);
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

  // ── Data helpers (unchanged) ───────────────────────────────────────────────
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

  // ── Data loading (unchanged) ───────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const periodResult = await getCurrentPeriod();
        if (periodResult?.success && periodResult.period) {
          setCurrentPeriod(periodResult.period as Period);
        }

        const draftResult = await fetchCurrentPeriodDraft();
        if (draftResult.success && draftResult.draft) {
          const draft = draftResult.draft;
          let title = draft.page_title || '';
          if (!title && draft.content_entries?.length > 0) title = draft.content_entries[0].title || '';
          if (!title) title = 'Untitled';
          setContentSubmission({
            id: draft.id,
            title,
            status: draft.status,
            period: periodResult?.period?.name || '',
            date: new Date(draft.updated_at).toLocaleDateString(),
            type: draft.type || 'photo',
            imageCount: (draft.content_entries || []).length,
          });
        } else {
          setContentSubmission(null);
        }

        const collabsResult = await getUserCollabs();
        if (collabsResult) {
          const combined = [
            ...(collabsResult.private || []),
            ...(collabsResult.community || []),
            ...(collabsResult.local || []),
          ];
          setActiveCollabs(combined.map((c) => {
            const cd = c as unknown as CollabData;
            const status = cd.status || cd.metadata?.status || 'draft';
            return {
              id: cd.id,
              title: cd.title,
              mode: cd.participation_mode || (cd.is_private ? 'private' : 'community'),
              location: cd.location,
              participants: cd.participantCount || 0,
              type: getCollabType(cd.type),
              status: status as string,
            };
          }));
        }

        const [draftComms, submittedComms] = await Promise.all([
          getDraftCommunications(),
          getSubmittedCommunications(),
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

        setRecentActivity([
          { id: '1', type: 'content', user: 'Recent Curator', action: 'viewed your content', time: '2 hours ago' },
          { id: '2', type: 'collab', user: 'Collaboration Member', action: 'joined your collaboration', time: 'Yesterday' },
        ]);

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

  // ── Visual-only handlers ───────────────────────────────────────────────────
  const toggleSection = (id: string) => {
    setActiveSection(prev => (prev === id ? null : id));
  };

  const pressSubmit = () => {
    if (submitPress !== 'rest') return;
    setSubmitPress('pressing');
    const href = contentSubmission ? `/submit?draft=${contentSubmission.id}` : '/submit';
    setTimeout(() => {
      setSubmitPress('releasing');
      router.push(href);
      setTimeout(() => setSubmitPress('rest'), 220);
    }, 160);
  };

  // ── Inline dialog components (restyled) ───────────────────────────────────
  const dialogOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
  };
  const dialogCard: React.CSSProperties = {
    background: 'var(--ground-3)', border: '1px solid var(--rule-mid)',
    borderRadius: '2px', maxWidth: '320px', width: '90%', padding: '20px',
  };
  const dialogTitle: React.CSSProperties = {
    fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--paper)',
    marginBottom: '10px', opacity: 0.88,
  };
  const dialogBody: React.CSSProperties = {
    fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--paper-3)',
    marginBottom: '20px', lineHeight: 1.5,
  };
  const dialogFooter: React.CSSProperties = {
    display: 'flex', justifyContent: 'flex-end', gap: '10px',
  };
  const ghostBtn: React.CSSProperties = {
    padding: '8px 14px', background: 'transparent',
    border: '1px solid var(--rule-mid)', borderRadius: '2px',
    fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em',
    textTransform: 'uppercase', color: 'var(--paper-3)', cursor: 'pointer',
  };
  const destructiveBtn: React.CSSProperties = {
    padding: '8px 14px',
    background: 'rgba(224,90,40,0.12)', border: '1px solid rgba(224,90,40,0.4)',
    borderRadius: '2px',
    fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em',
    textTransform: 'uppercase', color: 'var(--neon-accent)', cursor: 'pointer',
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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ background: 'var(--ground)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.14em', color: 'var(--paper-4)' }}>
          loading…
        </p>
      </div>
    );
  }

  // ── Shared style helpers ───────────────────────────────────────────────────
  const sectionColors: Record<string, { neon: string; glow: string; rgba01: string; rgba04: string }> = {
    content: {
      neon: 'var(--neon-accent)',
      glow: 'var(--glow-accent)',
      rgba01: 'rgba(224,90,40,0.1)',
      rgba04: 'rgba(224,90,40,0.4)',
    },
    collabs: {
      neon: 'var(--neon-blue)',
      glow: 'var(--glow-blue)',
      rgba01: 'rgba(90,159,212,0.1)',
      rgba04: 'rgba(90,159,212,0.4)',
    },
    comms: {
      neon: 'var(--neon-amber)',
      glow: 'var(--glow-amber)',
      rgba01: 'rgba(224,168,48,0.1)',
      rgba04: 'rgba(224,168,48,0.4)',
    },
  };

  const modeStyle: Record<string, { border: string; shadow: string; label: string }> = {
    community: {
      border: 'var(--neon-blue)',
      shadow: '-3px 0 10px -2px var(--glow-blue)',
      label: 'var(--neon-blue)',
    },
    local: {
      border: 'var(--neon-green)',
      shadow: '-3px 0 10px -2px var(--glow-green)',
      label: 'var(--neon-green)',
    },
    private: {
      border: 'var(--neon-purple)',
      shadow: '-3px 0 10px -2px var(--glow-purple)',
      label: 'var(--neon-purple)',
    },
  };

  const iconStroke = (sec: string) =>
    activeSection === sec ? sectionColors[sec].neon : 'var(--paper-4)';
  const iconFilter = (sec: string) =>
    activeSection === sec ? `drop-shadow(0 0 4px ${sectionColors[sec].glow})` : 'none';
  const iconBoxBg = (sec: string) =>
    activeSection === sec ? sectionColors[sec].rgba01 : 'var(--ground-3)';
  const iconBoxBorder = (sec: string) =>
    activeSection === sec ? sectionColors[sec].rgba04 : 'var(--rule-mid)';
  const iconBoxShadow = (sec: string) =>
    activeSection === sec
      ? `0 0 10px 2px ${sectionColors[sec].glow}, 0 0 28px 4px ${sectionColors[sec].rgba01}, inset 0 0 10px ${sectionColors[sec].rgba01}`
      : 'inset 0 1px 4px rgba(0,0,0,0.5)';

  // PART 1 ENDS HERE — return statement begins in part 2
