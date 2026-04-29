'use client';

import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { saveCommunication } from '@/lib/supabase/communications';
import { canCommunicateWith } from '@/lib/supabase/profiles';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  bio?: string;
}

type PressState = 'rest' | 'pressing' | 'releasing';

export default function CommunicateEditorPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const communicationId = id && id !== 'new' ? id : null;

  const router = useRouter();
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [permissionCheckComplete, setPermissionCheckComplete] = useState(false);
  const [currentStage, setCurrentStage] = useState<'recipient' | 'compose'>('recipient');
  const [submitPress, setSubmitPress] = useState<PressState>('rest');
  const [savePress, setSavePress] = useState<PressState>('rest');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [withdrawPress, setWithdrawPress] = useState<PressState>('rest');
  const [withdrawing, setWithdrawing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const WORD_LIMIT = 250;

  // ── load existing communication ──────────────────────────────────────────────
  useEffect(() => {
    if (!communicationId) return;
    setLoading(true);
    const fetchCommunication = async () => {
      try {
        const { data, error } = await supabase
          .from('communications')
          .select('*, profiles:recipient_id (id, first_name, last_name, avatar_url)')
          .eq('id', communicationId)
          .single();
        if (error) throw error;
        if (data) {
          if (data.status !== 'draft') {
            setIsReadOnly(true);
          }
          setSubject(data.subject || '');
          setContent(data.content || '');
          if (data.profiles) {
            const p: Profile = {
              id: data.profiles.id || '',
              first_name: data.profiles.first_name || '',
              last_name: data.profiles.last_name || '',
              avatar_url: data.profiles.avatar_url,
            };
            setSelectedRecipient(p);
            const result = await canCommunicateWith(p.id);
            setHasPermission(result.allowed);
            setPermissionCheckComplete(true);
            setCurrentStage('compose');
          }
          calculateWordCount(data.content || '');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load communication');
      } finally {
        setLoading(false);
      }
    };
    fetchCommunication();
  }, [communicationId, router, supabase]);

  useEffect(() => { calculateWordCount(content); }, [content]);

  // ── helpers ──────────────────────────────────────────────────────────────────
  const calculateWordCount = (text: string) => {
    setWordCount(!text?.trim() ? 0 : text.trim().split(/\s+/).length);
  };

  const searchContributors = async (term: string) => {
    if (!term?.length) { setSearchResults([]); return; }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, is_public, bio')
        .or(`first_name.ilike.%${term.trim()}%,last_name.ilike.%${term.trim()}%`)
        .limit(10);
      if (error) { setError('Search failed: ' + error.message); return; }
      setSearchResults((data || []).filter(p => p.is_public === true));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search error');
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    searchContributors(term);
    setShowSearchResults(true);
  };

  const selectRecipient = async (recipient: Profile) => {
    setSelectedRecipient(recipient);
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
    const result = await canCommunicateWith(recipient.id);
    setHasPermission(result.allowed);
    setPermissionCheckComplete(true);
    setCurrentStage('compose');
  };

  const handleSaveDraft = async () => {
    if (!selectedRecipient) { setError('Please select a recipient'); return; }
    if (!subject.trim()) { setError('Please enter a subject'); return; }
    if (!hasPermission) { setError('You do not have permission to communicate with this user'); return; }
    setSaving(true); setError(null);
    try {
      const result = await saveCommunication({
        id: communicationId || undefined,
        recipient_id: selectedRecipient.id,
        subject: subject.trim(),
        content: content.trim(),
        image_url: null,
      });
      if (!result.success) throw new Error(result.error ? String(result.error) : 'Failed to save draft');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRecipient) { setError('Please select a recipient'); return; }
    if (!subject.trim()) { setError('Please enter a subject'); return; }
    if (wordCount > WORD_LIMIT) { setError(`Content exceeds the ${WORD_LIMIT} word limit`); return; }
    if (!hasPermission) { setError('You do not have permission to communicate with this user'); return; }
    setSubmitting(true); setError(null);
    try {
      const saveResult = await saveCommunication({
        id: communicationId || undefined,
        recipient_id: selectedRecipient.id,
        subject: subject.trim(),
        content: content.trim(),
        image_url: null,
      });
      if (!saveResult.success) throw new Error(saveResult.error ? String(saveResult.error) : 'Failed to save');
      const commId = communicationId || (saveResult.communication && saveResult.communication.id);
      if (!commId) throw new Error('Failed to get communication ID');
      const { error: updateErr } = await supabase
        .from('communications')
        .update({ status: 'submitted', updated_at: new Date().toISOString(), word_count: wordCount })
        .eq('id', commId)
        .eq('status', 'draft');
      if (updateErr) throw updateErr;
      await supabase.from('communication_notifications').insert({
        communication_id: commId,
        recipient_id: selectedRecipient.id,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!communicationId) return;
    setWithdrawing(true); setError(null);
    try {
      const { error: updateErr } = await supabase
        .from('communications')
        .update({ status: 'draft' })
        .eq('id', communicationId);
      if (updateErr) throw updateErr;
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw');
    } finally {
      setWithdrawing(false);
    }
  };

  // ── press mechanic style helper ──────────────────────────────────────────────
  const pressStyle = (state: PressState, amber = false): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: amber ? 'var(--neon-amber)' : (state === 'rest' ? 'var(--paper-3)' : 'var(--neon-accent)'),
    textShadow: amber ? '0 0 8px var(--glow-amber)' : 'none',
    padding: '9px 20px',
    background: state === 'pressing'
      ? (amber ? 'rgba(224,168,48,0.2)' : 'rgba(224,90,40,0.18)')
      : (amber ? 'rgba(224,168,48,0.08)' : 'var(--ground-3)'),
    border: `1px solid ${state !== 'rest'
      ? (amber ? 'rgba(224,168,48,0.45)' : 'rgba(224,90,40,0.5)')
      : (amber ? 'rgba(224,168,48,0.28)' : 'var(--rule-mid)')}`,
    borderBottom: `2px solid ${state === 'pressing'
      ? (amber ? 'rgba(224,168,48,0.55)' : 'rgba(224,90,40,0.6)')
      : (amber ? 'rgba(224,168,48,0.35)' : 'var(--ground-4)')}`,
    borderRadius: 2,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    transform: state === 'pressing' ? 'translateY(2px)' : 'translateY(0)',
    boxShadow: state === 'pressing' ? 'none'
      : amber
        ? '0 2px 0 rgba(224,168,48,0.2), 0 0 14px rgba(224,168,48,0.06)'
        : '0 2px 0 var(--ground-4), 0 3px 6px rgba(0,0,0,0.4)',
    transition: state === 'releasing'
      ? 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease, background 0.3s'
      : 'transform 0.08s cubic-bezier(0.4,0,0.6,1), box-shadow 0.08s, background 0.08s',
  });

  const releasePress = (set: (s: PressState) => void) => {
    set('releasing');
    setTimeout(() => set('rest'), 220);
  };

  // ── loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--lt-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--paper-4)' }}>loading…</span>
      </div>
    );
  }

  const recipientName = selectedRecipient
    ? `${selectedRecipient.first_name} ${selectedRecipient.last_name}`.trim()
    : '';

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--lt-bg)', display: 'flex', flexDirection: 'column', color: 'var(--lt-text)' }}>

      {/* ── header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--lt-bg)', borderBottom: '1px solid var(--lt-rule)', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {currentStage === 'recipient' || !selectedRecipient || isReadOnly ? (
          <Link href="/dashboard" style={{ color: 'var(--lt-text-3)', lineHeight: 0, display: 'block' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : (
          <button
            onClick={() => {
              setSearchTerm(recipientName);
              searchContributors(recipientName);
              setShowSearchResults(true);
              setCurrentStage('recipient');
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lt-text-3)', lineHeight: 0, padding: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <div>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--lt-text-2)' }}>
            {isReadOnly ? 'Message' : communicationId ? 'Edit message' : 'New message'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: isReadOnly ? 'var(--neon-accent)' : 'var(--neon-amber)', boxShadow: isReadOnly ? '0 0 6px var(--glow-accent)' : '0 0 6px var(--glow-amber)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lt-text-3)' }}>{isReadOnly ? 'Sent' : 'Draft'}</span>
          </div>
        </div>
      </header>

      {/* ── error banner ── */}
      {error && (
        <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: 'rgba(224,90,40,0.07)', border: '1px solid rgba(224,90,40,0.25)', borderRadius: 2 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--neon-accent)', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ── permission warning ── */}
      {permissionCheckComplete && !hasPermission && selectedRecipient && (
        <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: 'rgba(224,168,48,0.06)', border: '1px solid rgba(224,168,48,0.2)', borderRadius: 2 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--neon-amber)', margin: '0 0 4px' }}>Permission required</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--lt-text-3)', margin: 0 }}>
            Request access to {selectedRecipient.first_name}&apos;s profile before sending.
          </p>
        </div>
      )}

      {/* ── recipient stage ── */}
      {currentStage === 'recipient' && (
        <div style={{ flex: 1, padding: '20px 16px' }}>
          <div style={{ background: 'var(--lt-card)', border: '1px solid var(--lt-card-bdr)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ position: 'relative' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--lt-text-3)', pointerEvents: 'none' }}>
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1" />
                  <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  placeholder="Search for a curator…"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => setShowSearchResults(true)}
                  autoFocus
                  style={{ width: '100%', background: 'var(--lt-bg)', border: '1px solid var(--lt-card-bdr)', borderRadius: 2, padding: '9px 12px 9px 30px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--lt-text)', outline: 'none', caretColor: 'var(--neon-amber)' }}
                />
              </div>

              {showSearchResults && searchResults.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {searchResults.map(p => (
                    <div
                      key={p.id}
                      onClick={() => selectRecipient(p)}
                      style={{ padding: '14px 0', borderTop: '1px solid var(--rule)', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--neon-amber)', textShadow: '0 0 6px var(--glow-amber)' }}>to</span>
                          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(224,168,48,0.25), transparent)' }} />
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', color: 'var(--paper)', lineHeight: 1.1, opacity: 0.88, marginBottom: '3px' }}>
                          {p.first_name} {p.last_name}
                        </div>
                        {p.bio && (
                          <div style={{ fontFamily: 'var(--font-sans)', fontStyle: 'italic', fontSize: '12px', color: 'var(--paper-4)' }}>
                            {p.bio.length > 60 ? p.bio.slice(0, 60) + '…' : p.bio}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showSearchResults && searchTerm && searchResults.length === 0 && (
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--lt-text-3)', marginTop: 16, textAlign: 'center' }}>
                  No results found
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── compose stage ── */}
      {currentStage === 'compose' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 16px 0' }}>
          {/* recipient hero */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lt-text-3)', margin: '0 0 5px' }}>To</p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 24, color: 'var(--lt-text)', margin: 0 }}>{recipientName}</p>
          </div>

          <div style={{ background: 'var(--lt-card)', border: '1px solid var(--lt-card-bdr)', borderRadius: 2, flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
            {/* subject */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--lt-rule)' }}>
              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                readOnly={isReadOnly}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 500, color: 'var(--lt-text)', caretColor: 'var(--neon-amber)' }}
              />
            </div>

            {/* body */}
            <div style={{ flex: 1, position: 'relative', padding: '12px 16px 36px' }}>
              <textarea
                ref={textareaRef}
                placeholder="Write your message…"
                value={content}
                onChange={e => setContent(e.target.value)}
                readOnly={isReadOnly}
                style={{ width: '100%', minHeight: 200, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.65, color: 'var(--lt-text)', caretColor: 'var(--neon-amber)' }}
              />
              <span style={{
                position: 'absolute', bottom: 12, right: 16,
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em',
                color: wordCount > WORD_LIMIT ? 'var(--neon-accent)' : 'var(--neon-amber)',
                textShadow: wordCount > WORD_LIMIT ? '0 0 8px var(--glow-accent)' : '0 0 8px var(--glow-amber)',
                opacity: wordCount === 0 ? 0.35 : 1,
                transition: 'color 0.2s',
                pointerEvents: 'none',
              }}>
                {wordCount} / {WORD_LIMIT}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── action bar ── */}
      {currentStage === 'compose' && (
        <div style={{ position: 'sticky', bottom: 0, background: 'var(--lt-bg)', borderTop: '1px solid var(--lt-rule)', padding: '12px 16px', display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
          {isReadOnly ? (
            <>
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--neon-accent)', textShadow: '0 0 8px var(--glow-accent)' }}>sent</span>
              <button
                onPointerDown={() => setWithdrawPress('pressing')}
                onPointerUp={() => releasePress(setWithdrawPress)}
                onPointerLeave={() => { if (withdrawPress === 'pressing') releasePress(setWithdrawPress); }}
                onClick={handleWithdraw}
                disabled={withdrawing}
                style={pressStyle(withdrawPress)}
              >
                {withdrawing ? 'Withdrawing…' : 'Withdraw'}
              </button>
            </>
          ) : (
            <>
              <button
                onPointerDown={() => setSavePress('pressing')}
                onPointerUp={() => releasePress(setSavePress)}
                onPointerLeave={() => { if (savePress === 'pressing') releasePress(setSavePress); }}
                onClick={handleSaveDraft}
                disabled={!selectedRecipient || !subject || saving || submitting || !hasPermission}
                style={{ ...pressStyle(savePress), opacity: (!selectedRecipient || !subject || !hasPermission) ? 0.4 : 1 }}
              >
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button
                onPointerDown={() => setSubmitPress('pressing')}
                onPointerUp={() => releasePress(setSubmitPress)}
                onPointerLeave={() => { if (submitPress === 'pressing') releasePress(setSubmitPress); }}
                onClick={handleSubmit}
                disabled={!selectedRecipient || !subject || !content.trim() || saving || submitting || wordCount > WORD_LIMIT || !hasPermission}
                style={{ ...pressStyle(submitPress, true), opacity: (!selectedRecipient || !subject || !content.trim() || !hasPermission || wordCount > WORD_LIMIT) ? 0.4 : 1 }}
              >
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
