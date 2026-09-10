'use client';

import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSupabase } from '@/lib/supabase/useSupabase';
import Link from 'next/link';
import { saveCommunication } from '@/lib/supabase/communications';
import { canCommunicateWith, sendFollowRequest } from '@/lib/supabase/profiles';
import { PageShell, SectionLabel, SearchField, RosterRow, Pill, Input, Textarea, WordCount, Toast, Icon, SERIF, SANS, MONO } from '@/components/v2';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  bio?: string;
}

// Design `.rr .n`: "S. Chen" — first initial + last name.
const shortName = (first: string, last: string): string =>
  first && last ? `${first[0]}. ${last}` : `${first} ${last}`.trim();

export default function CommunicateEditorPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const communicationId = id && id !== 'new' ? id : null;

  const router = useRouter();
  const supabase = useSupabase();

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
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // v2 additions — UI only. successMessage feeds the green Toast; requested marks the access Pill;
  // the image slot is a LOCAL preview: handleSaveDraft/handleSubmit are frozen and write image_url: null,
  // so an attached image is never persisted (wire uploadMedia + image_url in a follow-up).
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
            const result = await canCommunicateWith(supabase, p.id);
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
    const result = await canCommunicateWith(supabase, recipient.id);
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
      const result = await saveCommunication(supabase, {
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
      const saveResult = await saveCommunication(supabase, {
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

  // ── request access (mirrors profile/page.tsx handleFollowRequest → sendFollowRequest) ────
  const handleRequestAccess = async () => {
    if (!selectedRecipient) return;
    try {
      const result = await sendFollowRequest(supabase, selectedRecipient.id);
      if (result.success) {
        setRequested(true);
        setSuccessMessage(result.status === 'pending' ? 'Access request sent!' : 'Access granted to public profile.');
        if (result.status === 'approved') {
          const check = await canCommunicateWith(supabase, selectedRecipient.id);
          setHasPermission(check.allowed);
        }
      } else {
        setError(`Error: ${result.error || 'Failed to send request'}`);
      }
    } catch {
      setError('An unexpected error occurred');
    }
  };

  // ── image slot (local preview only — see the state comment above) ─────────────
  const handleImagePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    e.currentTarget.value = '';
  };
  const handleImageRemove = () => {
    setImagePreview(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return null; });
  };
  useEffect(() => () => { if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  // ── header (design `.top`: "‹ Dashboard" · status word · "Note" gold) ────────
  const header = (
    <>
      <Link href="/dashboard" style={{ font: `500 12px/1 ${SANS}`, color: 'var(--ink2)', textDecoration: 'none', flex: 'none' }}>‹ Dashboard</Link>
      <span style={{ font: `italic 400 15px/1 ${SERIF}`, color: isReadOnly ? 'var(--orange)' : 'var(--ink3)' }}>{isReadOnly ? 'sent' : 'draft'}</span>
      <span style={{ font: `500 12px/1 ${SANS}`, color: 'var(--gold)', flex: 'none' }}>Note</span>
    </>
  );

  // ── loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageShell header={header} align="center">
        <p style={{ margin: 0, textAlign: 'center', font: `400 12px/1 ${MONO}`, letterSpacing: '0.14em', color: 'var(--ink3)' }}>loading…</p>
      </PageShell>
    );
  }

  const recipientName = selectedRecipient
    ? `${selectedRecipient.first_name} ${selectedRecipient.last_name}`.trim()
    : '';

  // v2 footer buttons (design `.btn`)
  const btnBase: React.CSSProperties = {
    font: `500 12px/1 ${SANS}`, letterSpacing: '0.14em', textTransform: 'uppercase',
    padding: '15px 18px', borderRadius: 5, textAlign: 'center', flex: 'none', whiteSpace: 'nowrap',
    cursor: 'pointer', background: 'transparent', borderWidth: 0, WebkitTapHighlightColor: 'transparent',
  };
  const btnSec: React.CSSProperties = { ...btnBase, color: 'var(--ink2)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)' };
  const btnGhost: React.CSSProperties = { ...btnBase, color: 'var(--ink3)' };
  const btnPri: React.CSSProperties = {
    ...btnBase, flex: 1, color: '#0d0c0a', background: 'var(--gold)',
    boxShadow: '0 0 28px color-mix(in oklch, var(--gold) 35%, transparent)',
  };
  const sendDisabled = !selectedRecipient || !subject || !content.trim() || saving || submitting || wordCount > WORD_LIMIT || !hasPermission;
  const saveDisabled = !selectedRecipient || !subject || saving || submitting || !hasPermission;

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <PageShell
      header={header}
      // Footer only in the compose stage (as before): Save draft → handleSaveDraft · Send → handleSubmit
      // (disabled per the unchanged condition) · sent: ghost Withdraw → handleWithdraw
      footer={currentStage === 'compose' ? (isReadOnly ? (
        <button type="button" onClick={handleWithdraw} disabled={withdrawing} style={{ ...btnGhost, opacity: withdrawing ? 0.4 : 1 }}>
          {withdrawing ? 'Withdrawing…' : 'Withdraw'}
        </button>
      ) : (
        <>
          <button type="button" onClick={handleSaveDraft} disabled={saveDisabled} style={{ ...btnSec, opacity: (!selectedRecipient || !subject || !hasPermission) ? 0.4 : 1, cursor: saveDisabled ? 'default' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedRecipient || !subject || !content.trim() || saving || submitting || wordCount > WORD_LIMIT || !hasPermission}
            style={{ ...btnPri, opacity: (!selectedRecipient || !subject || !content.trim() || !hasPermission || wordCount > WORD_LIMIT) ? 0.4 : 1, cursor: sendDisabled ? 'default' : 'pointer' }}
          >
            {submitting ? 'Sending…' : 'Send'}
          </button>
        </>
      )) : undefined}
      columnStyle={{ paddingBottom: 32 }}
    >
      <Toast open={!!error} message={error} accent="orange" duration={0} onClose={() => setError(null)} />
      <Toast open={!!successMessage} message={successMessage} accent="green" onClose={() => setSuccessMessage(null)} />

      {/* ── Recipient hero — design `.field .k` TO + `.in.big` 30px name with chevron ── */}
      <div style={{ paddingTop: 26 }}>
        <SectionLabel style={{ display: 'block', marginBottom: 8 }}>To</SectionLabel>
        {currentStage === 'compose' && selectedRecipient ? (
          <button
            type="button"
            disabled={isReadOnly}
            aria-label="Change recipient"
            onClick={() => {
              setSearchTerm(recipientName);
              searchContributors(recipientName);
              setShowSearchResults(true);
              setCurrentStage('recipient');
            }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 0 10px', background: 'transparent', borderWidth: '0 0 1px 0', borderStyle: 'solid', borderColor: 'var(--line2)', textAlign: 'left', cursor: isReadOnly ? 'default' : 'pointer', WebkitTapHighlightColor: 'transparent' }}
          >
            <span style={{ font: `400 30px/1.15 ${SERIF}`, color: 'var(--ink)', minWidth: 0 }}>{recipientName}</span>
            {!isReadOnly && <Icon name="chevron" size={12} strokeWidth={1.5} style={{ color: 'var(--ink3)', transform: 'rotate(90deg)' }} />}
          </button>
        ) : (
          <>
            <SearchField
              placeholder="Search for a curator…"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => setShowSearchResults(true)}
              autoFocus
              aria-label="Search for a curator"
            />
            {showSearchResults && searchResults.map((p, i) => (
              <RosterRow
                key={p.id}
                name={shortName(p.first_name, p.last_name)}
                sub={p.bio ? (p.bio.length > 60 ? p.bio.slice(0, 60) + '…' : p.bio) : undefined}
                avatarUrl={p.avatar_url || undefined}
                initial={(p.first_name || p.last_name || '?')[0]?.toLowerCase()}
                last={i === searchResults.length - 1}
                onClick={() => selectRecipient(p)}
              />
            ))}
            {showSearchResults && searchTerm && searchResults.length === 0 && (
              <p style={{ margin: 0, paddingTop: 18, font: `italic 400 15px/1.4 ${SERIF}`, color: 'var(--ink3)' }}>No results found</p>
            )}
          </>
        )}
      </div>

      {currentStage === 'compose' && (
        <>
          {/* Permission gate (unchanged logic) → italic line + gold Request pill */}
          {permissionCheckComplete && !hasPermission && selectedRecipient && (
            <div style={{ paddingTop: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 0, font: `italic 400 15px/1.4 ${SERIF}`, color: 'var(--ink3)' }}>
                Request access to {selectedRecipient.first_name}&apos;s profile before sending.
              </p>
              {requested ? (
                <span style={{ font: `400 12px/1 ${MONO}`, color: 'var(--ink3)' }}>requested</span>
              ) : (
                <Pill accent="gold" label="Request" tinted onClick={handleRequestAccess} />
              )}
            </div>
          )}

          {/* Subject — italic serif 18 */}
          <div style={{ paddingTop: 18 }}>
            <Input
              placeholder="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              readOnly={isReadOnly}
              aria-label="Subject"
              style={{ font: `italic 400 18px/1.3 ${SERIF}` }}
            />
          </div>

          {/* Body — Textarea ≥220 + WordCount (wordCount / WORD_LIMIT unchanged) */}
          <Textarea
            ref={textareaRef}
            placeholder="Write your message…"
            value={content}
            onChange={e => setContent(e.target.value)}
            readOnly={isReadOnly}
            minHeight={220}
            aria-label="Message"
            style={{ marginTop: 14, color: 'var(--ink)' }}
          />
          <WordCount count={wordCount} limit={WORD_LIMIT} />

          {/* Image — design `.img` dashed slot; local preview only (never persisted, see state comment) */}
          {!isReadOnly && (
            <>
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImagePick} style={{ display: 'none' }} />
              {imagePreview ? (
                <div style={{ marginTop: 18, position: 'relative', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--line2)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Attached image preview" style={{ display: 'block', width: '100%', maxHeight: 240, objectFit: 'cover' }} />
                  <button type="button" aria-label="Remove image" onClick={handleImageRemove} style={{ position: 'absolute', right: 12, top: 12, width: 26, height: 26, borderRadius: '50%', borderWidth: 0, background: 'rgba(13,12,10,0.7)', display: 'grid', placeItems: 'center', color: 'var(--ink2)', font: `300 16px/1 ${SANS}`, cursor: 'pointer' }}>×</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  style={{ marginTop: 18, width: '100%', borderWidth: 1, borderStyle: 'dashed', borderColor: 'var(--line2)', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, font: `400 13.5px/1 ${SANS}`, color: 'var(--ink3)', background: 'transparent', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}
                >
                  <Icon name="camera" size={16} strokeWidth={1.5} />
                  Add an image (optional)
                </button>
              )}
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
