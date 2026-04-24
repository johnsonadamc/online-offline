'use client';

import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Search, X, User } from 'lucide-react';
import { saveCommunication } from '@/lib/supabase/communications';
import { canCommunicateWith } from '@/lib/supabase/profiles';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export default function CommunicateEditorPage() {
  const params = useParams();
  const id = params?.id as string;
  const communicationId = id !== 'new' ? id : null;

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
  const [submitPress, setSubmitPress] = useState<'rest' | 'pressing' | 'releasing'>('rest');
  const [hasPermission, setHasPermission] = useState(true);
  const [permissionCheckComplete, setPermissionCheckComplete] = useState(false);
  const [currentStage, setCurrentStage] = useState<'recipient' | 'compose'>('recipient');
  const [searchFocused, setSearchFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const WORD_LIMIT = 250;

  // Load existing communication if editing
  useEffect(() => {
    const fetchCommunication = async () => {
      if (!communicationId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('communications')
          .select(`*, profiles:recipient_id (id, first_name, last_name, avatar_url)`)
          .eq('id', communicationId)
          .single();

        if (error) throw error;

        if (data) {
          if (data.status !== 'draft') {
            setError('This communication cannot be edited anymore');
            router.push('/dashboard');
            return;
          }
          setSubject(data.subject || '');
          setContent(data.content || '');
          if (data.profiles) {
            const profileData: Profile = {
              id: data.profiles.id || '',
              first_name: data.profiles.first_name || '',
              last_name: data.profiles.last_name || '',
              avatar_url: data.profiles.avatar_url,
            };
            setSelectedRecipient(profileData);
            const result = await canCommunicateWith(profileData.id);
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

  useEffect(() => {
    calculateWordCount(content);
  }, [content]);

  const calculateWordCount = (text: string) => {
    setWordCount(!text || text.trim() === '' ? 0 : text.trim().split(/\s+/).length);
  };

  const searchContributors = async (term: string) => {
    if (!term || term.length < 1) { setSearchResults([]); return; }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, is_public')
        .or(`first_name.ilike.%${term.trim()}%,last_name.ilike.%${term.trim()}%`)
        .limit(10);
      if (error) { setError('Search failed: ' + error.message); return; }
      setSearchResults(data ? data.filter(p => p.is_public === true) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
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
    if (!selectedRecipient || !subject.trim() || !hasPermission) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveCommunication({
        id: communicationId || undefined,
        recipient_id: selectedRecipient.id,
        subject: subject.trim(),
        content: content.trim(),
        image_url: null,
      });
      if (!result.success) throw new Error(String(result.error) || 'Failed to save draft');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRecipient || !subject.trim() || !content.trim() || wordCount > WORD_LIMIT || !hasPermission) return;
    setSubmitting(true);
    setError(null);
    try {
      const saveResult = await saveCommunication({
        id: communicationId || undefined,
        recipient_id: selectedRecipient.id,
        subject: subject.trim(),
        content: content.trim(),
        image_url: null,
      });
      if (!saveResult.success) throw new Error(String(saveResult.error) || 'Failed to save');
      const commId = communicationId || (saveResult.communication && saveResult.communication.id);
      if (!commId) throw new Error('Failed to get communication ID');
      const { error } = await supabase
        .from('communications')
        .update({ status: 'submitted', updated_at: new Date().toISOString(), word_count: wordCount })
        .eq('id', commId)
        .eq('status', 'draft');
      if (error) throw error;
      await supabase
        .from('communication_notifications')
        .insert({ communication_id: commId, recipient_id: selectedRecipient.id });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const pressSubmit = () => {
    if (submitPress !== 'rest' || submitting || saving) return;
    setSubmitPress('pressing');
    setTimeout(() => {
      setSubmitPress('releasing');
      handleSubmit();
      setTimeout(() => setSubmitPress('rest'), 220);
    }, 160);
  };

  const canSubmit = !!(selectedRecipient && subject.trim() && content.trim() && !saving && !submitting && wordCount <= WORD_LIMIT && hasPermission);
  const canSave = !!(selectedRecipient && subject.trim() && !saving && !submitting && hasPermission);

  const wordCountColor =
    wordCount > WORD_LIMIT ? 'var(--neon-accent)' :
    wordCount > WORD_LIMIT * 0.8 ? 'var(--neon-amber)' :
    'var(--paper-4)';

  if (loading) {
    return (
      <div style={{ background: 'var(--ground)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.14em', color: 'var(--paper-4)' }}>
          loading…
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--ground)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* ── Header ── */}
        <div style={{ padding: '20px 22px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            {currentStage === 'compose' && selectedRecipient ? (
              <button
                onClick={() => setCurrentStage('recipient')}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
              >
                <ArrowLeft size={12} />
                Back
              </button>
            ) : (
              <Link
                href="/dashboard"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper-4)', textDecoration: 'none' }}
              >
                <ArrowLeft size={12} />
                Dashboard
              </Link>
            )}
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', letterSpacing: '0.04em', color: 'var(--paper-2)' }}>
              online<span style={{ color: 'var(--paper-5)', margin: '0 1px' }}>//</span>offline
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(224,168,48,0.6)', textShadow: '0 0 8px rgba(224,168,48,0.22)' }}>
              Comm
            </div>
          </div>

          {/* Thick rule */}
          <div style={{ height: '1px', background: 'var(--paper)', opacity: 0.6, boxShadow: '0 0 6px 1px rgba(240,235,226,0.2)', marginBottom: '10px' }} />

          {/* Subtitle row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '12px', color: 'var(--paper-3)', whiteSpace: 'nowrap' }}>
              {communicationId ? 'edit message' : 'new message'}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, var(--rule), transparent)' }} />
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={{ margin: '0 22px 16px', background: 'rgba(224,90,40,0.07)', border: '1px solid rgba(224,90,40,0.22)', borderLeft: '3px solid var(--neon-accent)', borderRadius: '1px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <AlertCircle size={14} color="var(--neon-accent)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--paper-2)', margin: 0, lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        {/* ── Permission warning ── */}
        {permissionCheckComplete && !hasPermission && selectedRecipient && (
          <div style={{ margin: '0 22px 16px', background: 'rgba(224,168,48,0.06)', border: '1px solid rgba(224,168,48,0.2)', borderLeft: '3px solid var(--neon-amber)', borderRadius: '1px', padding: '12px 14px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon-amber)', marginBottom: '5px', margin: '0 0 5px' }}>
              Permission required
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--paper-3)', margin: 0, lineHeight: 1.5 }}>
              Request access to {selectedRecipient.first_name}&apos;s profile before sending.
            </p>
          </div>
        )}

        {/* ══ STAGE 1: Recipient ══ */}
        {currentStage === 'recipient' && (
          <div style={{ flex: 1, padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--paper-4)' }}>
              Select curator
            </div>

            {/* Search input */}
            {!selectedRecipient && (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <Search size={13} color={searchFocused ? 'var(--neon-amber)' : 'var(--paper-4)'} />
                </div>
                <input
                  type="text"
                  placeholder="Search by name…"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => { setShowSearchResults(true); setSearchFocused(true); }}
                  onBlur={() => setSearchFocused(false)}
                  style={{
                    width: '100%',
                    background: 'var(--ground-3)',
                    border: searchFocused ? '1px solid rgba(224,168,48,0.35)' : '1px solid var(--rule-mid)',
                    boxShadow: searchFocused ? '0 0 0 2px rgba(224,168,48,0.07)' : 'none',
                    borderRadius: '2px',
                    color: 'var(--paper)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                    padding: '10px 12px 10px 34px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  } as React.CSSProperties}
                />
              </div>
            )}

            {/* Search results */}
            {!selectedRecipient && showSearchResults && searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {searchResults.map(profile => (
                  <div
                    key={profile.id}
                    onClick={() => selectRecipient(profile)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--ground-3)', border: '1px solid var(--rule)', borderRadius: '1px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(224,168,48,0.25)'; e.currentTarget.style.background = 'var(--ground-4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.background = 'var(--ground-3)'; }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(224,168,48,0.1)', border: '1px solid rgba(224,168,48,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {profile.avatar_url
                        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <User size={14} color="var(--neon-amber)" />
                      }
                    </div>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--paper)' }}>
                      {profile.first_name} {profile.last_name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!selectedRecipient && showSearchResults && searchTerm && searchResults.length === 0 && (
              <div style={{ padding: '28px 0', textAlign: 'center', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '14px', color: 'var(--paper-4)' }}>
                No curators found
              </div>
            )}

            {/* Selected recipient card */}
            {selectedRecipient && (
              <div style={{ background: 'var(--ground-3)', border: '1px solid var(--rule-mid)', borderLeft: '3px solid var(--neon-amber)', borderRadius: '1px', padding: '14px 16px', boxShadow: '-3px 0 12px -2px rgba(224,168,48,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon-amber)', textShadow: '0 0 8px var(--glow-amber)', display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                      <span style={{ display: 'inline-block', width: '14px', height: '1px', background: 'var(--neon-amber)', opacity: 0.4, boxShadow: '0 0 4px rgba(224,168,48,0.4)' }} />
                      to
                    </div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--paper)', lineHeight: 1.1 }}>
                      {selectedRecipient.first_name} {selectedRecipient.last_name}
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedRecipient(null); setCurrentStage('recipient'); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--paper-5)', padding: '6px', lineHeight: 0, WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Continue button */}
            {selectedRecipient && (
              <button
                onClick={() => setCurrentStage('compose')}
                disabled={!hasPermission}
                className="press-btn"
                style={{ width: '100%', justifyContent: 'center', opacity: hasPermission ? 1 : 0.45 }}
              >
                Continue →
              </button>
            )}
          </div>
        )}

        {/* ══ STAGE 2: Compose ══ */}
        {currentStage === 'compose' && (
          <div style={{ flex: 1, padding: '0 22px', display: 'flex', flexDirection: 'column' }}>

            {/* Recipient hero */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--neon-amber)', textShadow: '0 0 8px var(--glow-amber)', display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
                <span style={{ display: 'inline-block', width: '14px', height: '1px', background: 'var(--neon-amber)', opacity: 0.4, boxShadow: '0 0 4px rgba(224,168,48,0.4)' }} />
                to
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', color: 'var(--paper)', lineHeight: 1.1 }}>
                {selectedRecipient?.first_name} {selectedRecipient?.last_name}
              </div>
            </div>

            {/* Compose card */}
            <div style={{ background: 'var(--ground-3)', border: '1px solid var(--rule-mid)', borderRadius: '1px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', marginBottom: '14px', minHeight: '280px' }}>

              {/* Subject */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper-4)', marginBottom: '6px' }}>
                  Subject
                </div>
                <input
                  type="text"
                  placeholder="What's this about…"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--paper)', padding: 0, boxSizing: 'border-box' } as React.CSSProperties}
                />
              </div>

              {/* Message body */}
              <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <textarea
                  ref={textareaRef}
                  placeholder="Write your message here…"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  style={{
                    flex: 1,
                    width: '100%',
                    minHeight: '180px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    color: 'var(--paper-2)',
                    padding: '12px 16px 36px',
                    boxSizing: 'border-box',
                  } as React.CSSProperties}
                />
                {/* Word count — bottom right of textarea */}
                <div style={{ position: 'absolute', bottom: '10px', right: '14px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', color: wordCountColor, textShadow: wordCount > WORD_LIMIT * 0.8 ? '0 0 8px var(--glow-amber)' : 'none', transition: 'color 0.2s', pointerEvents: 'none' }}>
                  {wordCount}<span style={{ opacity: 0.45 }}>/{WORD_LIMIT}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Action bar (compose stage only) ── */}
        {currentStage === 'compose' && (
          <div style={{ flexShrink: 0, padding: '12px 22px 28px', background: 'var(--ground-2)', borderTop: '1px solid var(--rule)', display: 'flex', gap: '10px', alignItems: 'center' }}>

            {/* Status label */}
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '12px', color: 'var(--paper-5)' }}>
                draft
              </span>
            </div>

            {/* Save draft — ghost */}
            <button
              onClick={handleSaveDraft}
              disabled={!canSave}
              style={{
                padding: '9px 16px',
                background: 'transparent',
                border: '1px solid var(--rule-mid)',
                borderRadius: '2px',
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--paper-3)',
                cursor: canSave ? 'pointer' : 'not-allowed',
                opacity: canSave ? 1 : 0.38,
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              {saving ? 'saving…' : 'save draft'}
            </button>

            {/* Submit — amber press mechanic */}
            <button
              onClick={pressSubmit}
              disabled={!canSubmit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: canSubmit ? 'var(--neon-amber)' : 'var(--paper-4)',
                textShadow: canSubmit ? '0 0 8px var(--glow-amber)' : 'none',
                padding: '9px 20px',
                background: canSubmit ? 'rgba(224,168,48,0.1)' : 'var(--ground-3)',
                border: canSubmit ? '1px solid rgba(224,168,48,0.28)' : '1px solid var(--rule)',
                borderBottom: canSubmit ? '2px solid rgba(224,168,48,0.32)' : '2px solid var(--rule-mid)',
                borderRadius: '2px',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                opacity: canSubmit ? 1 : 0.38,
                transform: submitPress === 'pressing' ? 'translateY(2px)' : 'translateY(0)',
                boxShadow: submitPress === 'pressing'
                  ? '0 0 0 transparent'
                  : canSubmit ? '0 2px 0 rgba(224,168,48,0.22), 0 0 14px rgba(224,168,48,0.07)' : 'none',
                transition: submitPress === 'releasing'
                  ? 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease'
                  : 'transform 0.08s, box-shadow 0.08s',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              {submitting ? 'sending…' : 'submit'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
