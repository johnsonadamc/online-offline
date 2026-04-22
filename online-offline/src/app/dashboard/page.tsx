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

  // ── SVG helpers for section icons ────────────────────────────────────────
  const ChevronIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24">
      <polyline points="9,18 15,12 9,6" stroke="var(--paper-5)" strokeWidth="2" fill="none" />
    </svg>
  );
  const XIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" />
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );

  const SectionHeader = ({
    id, label, subtitle, icon,
  }: {
    id: string; label: string; subtitle: string; icon: React.ReactNode;
  }) => (
    <div
      onClick={() => toggleSection(id)}
      style={{ padding: '17px 0', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
    >
      <div style={{
        width: '40px', height: '40px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '2px',
        background: iconBoxBg(id),
        border: `1px solid ${iconBoxBorder(id)}`,
        boxShadow: iconBoxShadow(id),
        transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--paper)',
          lineHeight: 1.1, marginBottom: '2px', opacity: 0.88,
          textShadow: activeSection === id ? `0 0 16px ${sectionColors[id].rgba01.replace('0.1', '0.2')}` : 'none',
          transition: 'text-shadow 0.3s',
        }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--paper-4)' }}>{subtitle}</div>
      </div>
      <div style={{
        width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        transform: activeSection === id ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <ChevronIcon />
      </div>
    </div>
  );

  const OpenRule = ({ id }: { id: string }) => (
    <div style={{
      height: '1px', marginBottom: '2px',
      opacity: activeSection === id ? 1 : 0,
      background: sectionColors[id].neon,
      boxShadow: `0 0 8px 1px ${sectionColors[id].glow}`,
      transition: 'opacity 0.3s',
    }} />
  );

  const Expandable = ({ id, children }: { id: string; children: React.ReactNode }) => (
    <div style={{
      maxHeight: activeSection === id ? '1400px' : '0',
      overflow: 'hidden',
      opacity: activeSection === id ? 1 : 0,
      transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
    }}>
      <div style={{ paddingBottom: '20px' }}>{children}</div>
    </div>
  );

  // ── Main return ────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--ground)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: 'var(--ground)', position: 'relative' }}>

        {/* ── Toasts ── */}
        {successMessage && (
          <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 1000, background: 'var(--ground-3)', border: '1px solid rgba(78,196,122,0.3)', borderLeft: '3px solid var(--neon-green)', padding: '10px 14px', borderRadius: '2px', boxShadow: '-3px 0 10px -2px var(--glow-green)' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--neon-green)' }}>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 1000, background: 'var(--ground-3)', border: '1px solid rgba(224,90,40,0.3)', borderLeft: '3px solid var(--neon-accent)', padding: '10px 14px', borderRadius: '2px' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--neon-accent)' }}>{errorMessage}</span>
          </div>
        )}

        {/* ── Dialogs ── */}
        <ConfirmationDialog />
        <DeleteCommDialog />
        <DeleteContentDialog />

        {/* ── Header ── */}
        <div style={{ padding: '22px 26px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 10 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', letterSpacing: '0.04em', color: 'var(--paper)', opacity: 0.88, textShadow: '0 0 20px var(--glow-paper)' }}>
            online<span style={{ color: 'var(--paper-5)', margin: '0 1px' }}>//</span>offline
          </div>
          <Link href="/profile" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--ground-3)', border: '1px solid var(--rule-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, textDecoration: 'none' }}>
            {avatarUrl ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <NextImage src={avatarUrl} alt="Profile" fill sizes="28px" style={{ objectFit: 'cover' }} />
              </div>
            ) : (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 500, color: 'var(--paper-3)' }}>
                ○
              </span>
            )}
          </Link>
        </div>

        {/* ── Thick rule ── */}
        <div style={{ height: '1px', background: 'var(--paper)', margin: '13px 26px 0', opacity: 0.8, boxShadow: '0 0 6px 1px rgba(240,235,226,0.25), 0 0 20px rgba(240,235,226,0.08)', position: 'relative', zIndex: 10 }} />

        {/* ── Period strip ── */}
        <div style={{ padding: '9px 26px 0', display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 10 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '12px', color: 'var(--paper-3)', whiteSpace: 'nowrap' }}>
            {currentPeriod ? `${currentPeriod.season} ${currentPeriod.year}` : '—'}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, var(--rule-mid), transparent)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--paper-4)', whiteSpace: 'nowrap' }}>
            {currentPeriod?.end_date && (
              <><strong style={{ color: 'var(--neon-accent)', fontWeight: 500, textShadow: '0 0 8px var(--glow-accent), 0 0 20px rgba(224,90,40,0.12)' }}><CountdownTimer endDate={currentPeriod.end_date} /></strong>{' remaining'}</>
            )}
          </span>
        </div>

        {/* ── Tab bar ── */}
        <div style={{ display: 'flex', padding: '0 26px', borderBottom: '1px solid var(--rule)', marginTop: '14px', position: 'relative', zIndex: 10 }}>
          {(['contribute', 'curate'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 0', marginRight: '26px',
                fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 400,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: activeTab === tab ? 'var(--paper)' : 'var(--paper-5)',
                opacity: activeTab === tab ? 0.88 : 1,
                background: 'none', border: 'none',
                borderBottom: activeTab === tab ? '1px solid var(--paper)' : '1px solid transparent',
                marginBottom: '-1px', cursor: 'pointer',
                textShadow: activeTab === tab ? '0 0 12px var(--glow-paper)' : 'none',
                transition: 'color 0.2s, text-shadow 0.2s',
              }}
            >
              {tab === 'contribute' ? 'Contribute' : 'Curate'}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════
            CONTRIBUTE TAB
        ══════════════════════════════════════ */}
        {activeTab === 'contribute' && (
          <div style={{ padding: '16px 26px 80px', position: 'relative', zIndex: 10 }}>

            {/* ── Content section ── */}
            <div style={{ borderTop: '1px solid var(--rule)', overflow: 'hidden' }}>
              <SectionHeader
                id="content"
                label="Content"
                subtitle={contentSubmission ? 'Your work this season — 1 submission' : 'No submissions yet this season'}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" overflow="visible">
                    <rect x="2" y="7" width="20" height="14" rx="1.5" stroke={iconStroke('content')} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ filter: iconFilter('content'), transition: 'stroke 0.3s, filter 0.3s' }} />
                    <circle cx="12" cy="14" r="4.5" stroke={iconStroke('content')} strokeWidth="1.5" fill="none" style={{ filter: iconFilter('content'), transition: 'stroke 0.3s, filter 0.3s' }} />
                    <circle cx="12" cy="14" r="2" stroke={iconStroke('content')} strokeWidth="1.5" fill="none" style={{ transition: 'stroke 0.3s' }} />
                    <rect x="7" y="5" width="4" height="3" rx="1" fill={iconStroke('content')} style={{ transition: 'fill 0.3s' }} />
                    <line x1="17" y1="9.5" x2="20" y2="9.5" stroke={iconStroke('content')} strokeWidth="1.5" strokeLinecap="round" style={{ transition: 'stroke 0.3s' }} />
                  </svg>
                }
              />
              <OpenRule id="content" />
              <Expandable id="content">
                {/* Content item or empty state */}
                {contentSubmission ? (
                  <div onClick={() => router.push(`/submit?draft=${contentSubmission.id}`)} style={{ padding: '18px 0', borderTop: '1px solid var(--rule)', cursor: 'pointer', position: 'relative' }}>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteContentId(contentSubmission.id); setShowDeleteContentConfirm(true); }}
                      style={{ position: 'absolute', top: '14px', right: 0, width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--paper-5)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <XIcon />
                    </button>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--paper-5)', marginBottom: '8px' }}>
                      {contentSubmission.period}
                    </div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', color: 'var(--paper)', lineHeight: 1.05, marginBottom: '12px', letterSpacing: '-0.01em', opacity: 0.88 }}>
                      {contentSubmission.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--paper-4)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span>{contentSubmission.imageCount} image{contentSubmission.imageCount !== 1 ? 's' : ''}</span>
                        <span style={{ color: 'var(--paper-5)' }}>·</span>
                        <span style={{ textTransform: 'capitalize' }}>{contentSubmission.type}</span>
                      </div>
                      {contentSubmission.status === 'submitted' && (
                        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '12px', color: 'var(--neon-accent)', textShadow: '0 0 8px var(--glow-accent), 0 0 20px rgba(224,90,40,0.12)' }}>submitted</span>
                      )}
                      {contentSubmission.status === 'published' && (
                        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '12px', color: 'var(--neon-green)', textShadow: '0 0 8px var(--glow-green)' }}>published</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px 0', borderTop: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'var(--ground-3)', border: '1px solid var(--rule-mid)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="1.5" stroke="var(--paper-4)" strokeWidth="1.5" fill="none"/><circle cx="12" cy="14" r="4.5" stroke="var(--paper-4)" strokeWidth="1.5" fill="none"/></svg>
                    </div>
                    <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '14px', color: 'var(--paper-4)' }}>No submission this season</span>
                  </div>
                )}

                {/* Submit press button */}
                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--paper-4)' }}>
                    {contentSubmission ? 'Add more work this season' : 'Submit work this season'}
                  </span>
                  <button
                    className={`press-btn${submitPress === 'pressing' ? ' pressing' : ''}${submitPress === 'releasing' ? ' releasing' : ''}`}
                    onClick={pressSubmit}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2"/></svg>
                    Submit
                  </button>
                </div>
              </Expandable>
            </div>

            {/* ── Collaborations section ── */}
            <div style={{ borderTop: '1px solid var(--rule)', overflow: 'hidden' }}>
              <SectionHeader
                id="collabs"
                label="Collaborations"
                subtitle={
                  activeCollabs.length === 0
                    ? 'No active collaborations'
                    : `${activeCollabs.length} active`
                }
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" overflow="visible">
                    <circle cx="6" cy="9" r="2.5" stroke={iconStroke('collabs')} strokeWidth="1.3" fill="none" style={{ filter: iconFilter('collabs'), transition: 'stroke 0.3s, filter 0.3s' }} />
                    <path d="M1,20 C1,15.5 3.5,13.5 6,13.5 C7.2,13.5 8.3,14 9.1,14.8" stroke={iconStroke('collabs')} strokeWidth="1.3" fill="none" style={{ transition: 'stroke 0.3s' }} />
                    <circle cx="18" cy="9" r="2.5" stroke={iconStroke('collabs')} strokeWidth="1.3" fill="none" style={{ transition: 'stroke 0.3s' }} />
                    <path d="M23,20 C23,15.5 20.5,13.5 18,13.5 C16.8,13.5 15.7,14 14.9,14.8" stroke={iconStroke('collabs')} strokeWidth="1.3" fill="none" style={{ transition: 'stroke 0.3s' }} />
                    <circle cx="12" cy="8" r="3" stroke={iconStroke('collabs')} strokeWidth="1.5" fill="none" style={{ filter: iconFilter('collabs'), transition: 'stroke 0.3s, filter 0.3s' }} />
                    <path d="M5.5,21 C5.5,16 8.2,14 12,14 C15.8,14 18.5,16 18.5,21" stroke={iconStroke('collabs')} strokeWidth="1.5" fill="none" style={{ transition: 'stroke 0.3s' }} />
                  </svg>
                }
              />
              <OpenRule id="collabs" />
              <Expandable id="collabs">
                {activeCollabs.length > 0 ? (
                  activeCollabs.map(collab => {
                    const ms = modeStyle[collab.mode] || modeStyle.community;
                    const modeLabel = collab.mode === 'local' && collab.location
                      ? `Local · ${collab.location}`
                      : collab.mode.charAt(0).toUpperCase() + collab.mode.slice(1);
                    return (
                      <div
                        key={collab.id}
                        onClick={() => router.push(`/collabs/${collab.id}`)}
                        style={{
                          padding: '14px 0 14px 14px',
                          borderTop: '1px solid var(--rule)',
                          borderLeft: `2px solid ${ms.border}`,
                          boxShadow: ms.shadow,
                          marginLeft: '-1px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: ms.label, marginBottom: '5px' }}>
                            {modeLabel}
                          </div>
                          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', color: 'var(--paper)', lineHeight: 1.1, opacity: 0.88, marginBottom: '4px' }}>
                            {collab.title}
                          </div>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--paper-4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ textTransform: 'capitalize' }}>{collab.type}</span>
                            <span style={{ color: 'var(--paper-5)' }}>·</span>
                            <span>{collab.participants} participant{collab.participants !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                          {collab.status === 'submitted' && (
                            <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '11px', color: 'var(--neon-accent)', textShadow: '0 0 8px var(--glow-accent)' }}>submitted</span>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); showConfirmDialog('leave', collab.id); }}
                            style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--paper-5)', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            <XIcon />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '24px 0', borderTop: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '14px', color: 'var(--paper-4)' }}>No active collaborations</span>
                  </div>
                )}

                {/* Browse CTA */}
                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--paper-4)' }}>Join a new collaboration</span>
                  <button
                    onClick={() => router.push('/collabs')}
                    style={{
                      padding: '7px 14px', background: 'transparent',
                      border: '1px solid var(--rule-mid)', borderRadius: '2px',
                      fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: 'var(--paper-3)', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2"/></svg>
                    Browse
                  </button>
                </div>
              </Expandable>
            </div>

            {/* ── Communications section ── */}
            <div style={{ borderTop: '1px solid var(--rule)', overflow: 'hidden' }}>
              <SectionHeader
                id="comms"
                label="Communications"
                subtitle={
                  communications.length === 0
                    ? 'No messages yet'
                    : communications.filter(c => c.status === 'draft').length > 0
                    ? `${communications.filter(c => c.status === 'draft').length} draft in progress`
                    : `${communications.length} sent this season`
                }
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" overflow="visible">
                    <rect x="2" y="8" width="20" height="13" rx="1.5" stroke={iconStroke('comms')} strokeWidth="1.5" fill="none" style={{ filter: iconFilter('comms'), transition: 'stroke 0.3s, filter 0.3s' }} />
                    <line x1="6" y1="14" x2="14" y2="14" stroke={iconStroke('comms')} strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0.5, transition: 'stroke 0.3s' }} />
                    <path d="M2,8 L12,3 L22,8" stroke={iconStroke('comms')} strokeWidth="1.5" fill="none" strokeLinejoin="round" style={{ transition: 'stroke 0.3s' }} />
                    <circle cx="12" cy="8" r="1.2" fill={iconStroke('comms')} style={{ transition: 'fill 0.3s' }} />
                  </svg>
                }
              />
              <OpenRule id="comms" />
              <Expandable id="comms">
                {communications.length > 0 ? (
                  communications.map(comm => (
                    <div
                      key={comm.id}
                      onClick={() => router.push(`/communicate?id=${comm.id}`)}
                      style={{
                        padding: '14px 0',
                        borderTop: '1px solid var(--rule)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700,
                            letterSpacing: '0.18em', textTransform: 'uppercase',
                            color: 'var(--neon-amber)', textShadow: '0 0 6px var(--glow-amber)',
                          }}>to</span>
                          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(224,168,48,0.25), transparent)' }} />
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', color: 'var(--paper)', lineHeight: 1.1, opacity: 0.88, marginBottom: '3px' }}>
                          {comm.recipient}
                        </div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontStyle: 'italic', fontSize: '12px', color: 'var(--paper-4)', marginBottom: '3px' }}>
                          {comm.subject}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--paper-5)', letterSpacing: '0.06em' }}>
                          {comm.date}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                        {comm.status === 'submitted' && (
                          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '11px', color: 'var(--neon-accent)', textShadow: '0 0 8px var(--glow-accent)' }}>sent</span>
                        )}
                        {comm.status === 'draft' && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--paper-5)' }}>draft</span>
                        )}
                        {comm.status === 'submitted' ? (
                          <button
                            onClick={e => { e.stopPropagation(); showConfirmDialog('withdraw', comm.id); }}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--paper-5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            withdraw
                          </button>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteCommId(comm.id); setShowDeleteConfirm(true); }}
                            style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--paper-5)', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            <XIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '24px 0', borderTop: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '14px', color: 'var(--paper-4)' }}>No messages yet this season</span>
                  </div>
                )}

                {/* New comm CTA */}
                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--paper-4)' }}>Write to a curator</span>
                  <button
                    onClick={() => router.push('/communicate')}
                    style={{
                      padding: '7px 14px', background: 'transparent',
                      border: '1px solid var(--rule-mid)', borderRadius: '2px',
                      fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: 'var(--paper-3)', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2"/></svg>
                    New
                  </button>
                </div>
              </Expandable>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════
            CURATE TAB
        ══════════════════════════════════════ */}
        {activeTab === 'curate' && (
          <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)' }}>
            {/* Ambient glow layer */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
              background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(78,196,122,0.04) 0%, transparent 70%)',
            }} />

            <div style={{ position: 'relative', zIndex: 1, padding: '20px 26px 100px' }}>
              {/* Light-table header */}
              <div style={{ marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--lt-rule)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '13px', color: 'var(--lt-text-2)', letterSpacing: '0.02em' }}>
                    Curation mode
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon-green)', textShadow: '0 0 8px var(--glow-green)' }}>
                    ● active
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--lt-text-3)' }}>
                  {currentPeriod ? `${currentPeriod.season} ${currentPeriod.year}` : '—'} · Select what goes in your magazine
                </div>
              </div>

              {/* Open curate call-to-action */}
              <button
                onClick={() => router.push('/curate')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '20px', marginBottom: '12px',
                  background: 'rgba(78,196,122,0.07)',
                  border: '1px solid rgba(78,196,122,0.2)',
                  borderRadius: '2px', cursor: 'pointer',
                  boxShadow: '0 0 24px rgba(78,196,122,0.05)',
                  transition: 'background 0.2s, border-color 0.2s',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--lt-text)', marginBottom: '4px', opacity: 0.88 }}>
                    Open curation table
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--lt-text-3)' }}>
                    Browse contributors, collabs, and campaigns
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: 0.5 }}>
                  <polyline points="9,18 15,12 9,6" stroke="var(--neon-green)" strokeWidth="2" fill="none" />
                </svg>
              </button>

              {/* Quick stats */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: '1px', background: 'var(--lt-rule)',
                border: '1px solid var(--lt-rule)', borderRadius: '2px',
                overflow: 'hidden', marginBottom: '20px',
              }}>
                {[
                  { label: 'Contributors', val: '—' },
                  { label: 'Collabs', val: '—' },
                  { label: 'Est. pages', val: '—' },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: 'var(--lt-card)', padding: '12px 10px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lt-text-3)', marginBottom: '5px' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--lt-text)', opacity: 0.75 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Season deadline reminder */}
              {currentPeriod?.end_date && (
                <div style={{ padding: '14px', background: 'var(--lt-card)', border: '1px solid var(--lt-card-bdr)', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '2px', height: '32px', background: 'var(--neon-amber)', boxShadow: '0 0 6px var(--glow-amber)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--neon-amber)', textShadow: '0 0 6px var(--glow-amber)', marginBottom: '3px' }}>
                      Deadline
                    </div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--lt-text-2)' }}>
                      <CountdownTimer endDate={currentPeriod.end_date} /> remaining to finalize selections
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── CountdownTimer ─────────────────────────────────────────────────────────────

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
