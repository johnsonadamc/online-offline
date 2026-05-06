"use client";
import React, { useState } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { useRouter } from 'next/navigation';

type ContentType = 'photography' | 'art' | 'poetry' | 'essay' | null;

const CONTENT_PILLS: { label: string; value: NonNullable<ContentType> }[] = [
  { label: 'Photography', value: 'photography' },
  { label: 'Art', value: 'art' },
  { label: 'Poetry', value: 'poetry' },
  { label: 'Essay', value: 'essay' },
];

function usePressState() {
  const [state, setState] = useState<'rest' | 'pressing' | 'releasing'>('rest');
  const press = (onRelease: () => void) => {
    if (state !== 'rest') return;
    setState('pressing');
    setTimeout(() => {
      setState('releasing');
      onRelease();
      setTimeout(() => setState('rest'), 220);
    }, 160);
  };
  return { state, press };
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useSupabase();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isContributor, setIsContributor] = useState(false);
  const [isCurator, setIsCurator] = useState(false);
  const [contentType, setContentType] = useState<ContentType>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const continueBtn = usePressState();
  const backBtn = usePressState();
  const enterBtn = usePressState();

  const step1Valid = firstName.trim().length > 0 && lastName.trim().length > 0;
  const step2Valid = isContributor || isCurator;

  const handleToggleContributor = () => {
    const next = !isContributor;
    setIsContributor(next);
    if (!next) setContentType(null);
  };

  const handleTogglePill = (val: NonNullable<ContentType>) => {
    setContentType(prev => (prev === val ? null : val));
  };

  const confirmationLine = () => {
    if (isContributor && isCurator) {
      return contentType
        ? `You're joining as a contributor and curator, submitting ${contentType} this season.`
        : `You're joining as a contributor and curator.`;
    }
    if (isContributor) {
      return contentType
        ? `You're joining as a contributor, submitting ${contentType} this season.`
        : `You're joining as a contributor.`;
    }
    return `You're joining as a curator.`;
  };

  const handleEnter = async () => {
    setSaving(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upsert profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          content_type: contentType,
        }, { onConflict: 'id' });
      if (profileError) throw profileError;

      // Insert profile_types — deduplicated
      const types: string[] = [];
      if (isContributor) types.push('contributor');
      if (isCurator) types.push('curator');

      for (const type of types) {
        // Check for existing row — ignore read errors (RLS may block SELECT)
        const { data: existing, error: selectError } = await supabase
          .from('profile_types')
          .select('profile_id')
          .eq('profile_id', user.id)
          .eq('type', type)
          .maybeSingle();

        if (selectError) {
          // RLS may block SELECT — log it but still attempt the insert
          console.warn('[onboarding] profile_types SELECT error (will attempt insert anyway):', selectError);
        }

        if (!existing) {
          const { error: insertError } = await supabase
            .from('profile_types')
            .insert({ profile_id: user.id, type });

          if (insertError) {
            console.error('[onboarding] profile_types INSERT failed for type:', type, insertError);
            throw new Error(
              `Failed to set role "${type}": ${insertError.message}. ` +
              `Code: ${insertError.code}. Check RLS policies on profile_types.`
            );
          }
          console.log('[onboarding] profile_types INSERT succeeded for type:', type, 'user:', user.id);
        } else {
          console.log('[onboarding] profile_types row already exists for type:', type, 'user:', user.id);
        }
      }

      // Redirect
      if (isCurator && !isContributor) {
        window.location.href = '/curate';
      } else {
        window.location.href = '/submit';
      }
    } catch (err) {
      setSaving(false);
      console.error('[onboarding] handleEnter failed:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  // ── Step dots ────────────────────────────────────────────────────────────────
  const StepDots = () => (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '36px' }}>
      {[1, 2, 3].map(n => (
        <div key={n} style={{
          width: n === step ? 20 : 6,
          height: 6,
          borderRadius: 3,
          background: n === step
            ? 'var(--neon-accent)'
            : n < step
              ? 'var(--paper-5)'
              : 'var(--ground-4)',
          transition: 'width 0.25s ease, background 0.25s ease',
        }} />
      ))}
    </div>
  );

  // ── Shared container ─────────────────────────────────────────────────────────
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--ground)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: 'var(--font-sans)',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '440px',
    position: 'relative',
    zIndex: 1,
  };

  // ── Press button builder ─────────────────────────────────────────────────────
  const continueButtonStyle = (ps: 'rest' | 'pressing' | 'releasing'): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    padding: '13px 20px',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--neon-accent)',
    background: ps === 'pressing' ? 'rgba(224,90,40,0.32)' : 'rgba(224,90,40,0.22)',
    border: '1px solid rgba(224,90,40,0.55)',
    borderBottom: ps === 'pressing' ? '1px solid rgba(224,90,40,0.55)' : '2px solid rgba(224,90,40,0.6)',
    borderRadius: '2px',
    cursor: 'pointer',
    transform: ps === 'pressing' ? 'translateY(2px)' : 'translateY(0)',
    boxShadow: ps === 'pressing'
      ? 'none'
      : '0 2px 0 rgba(224,90,40,0.3), 0 0 14px rgba(224,90,40,0.08)',
    transition: ps === 'releasing'
      ? 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease'
      : 'transform 0.08s, box-shadow 0.08s',
    textShadow: '0 0 8px var(--glow-accent)',
  });

  const backButtonStyle = (ps: 'rest' | 'pressing' | 'releasing'): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    padding: '11px 20px',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--paper-4)',
    background: 'transparent',
    border: '1px solid rgba(240,235,226,0.18)',
    borderBottom: '1px solid rgba(240,235,226,0.18)',
    borderRadius: '2px',
    cursor: 'pointer',
    transform: ps === 'pressing' ? 'translateY(1px)' : 'translateY(0)',
    boxShadow: 'none',
    transition: ps === 'releasing'
      ? 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)'
      : 'transform 0.08s',
  });

  // ── Role card ────────────────────────────────────────────────────────────────
  const RoleCard = ({
    selected,
    onToggle,
    title,
    description,
    accentColor,
    glowColor,
  }: {
    selected: boolean;
    onToggle: () => void;
    title: string;
    description: string;
    accentColor: string;
    glowColor: string;
  }) => (
    <div
      onClick={onToggle}
      style={{
        padding: '18px 20px',
        background: selected ? `rgba(${accentColor}, 0.07)` : 'var(--ground-2)',
        border: selected
          ? `1px solid rgba(${accentColor}, 0.35)`
          : '1px solid var(--rule-mid)',
        borderLeft: selected
          ? `2px solid rgba(${accentColor}, 0.9)`
          : '2px solid transparent',
        borderRadius: '2px',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        boxShadow: selected ? `-3px 0 10px -2px rgba(${accentColor}, 0.25)` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Checkbox indicator */}
        <div style={{
          width: 16,
          height: 16,
          borderRadius: '2px',
          border: selected
            ? `1px solid rgba(${accentColor}, 0.8)`
            : '1px solid var(--rule-strong)',
          background: selected ? `rgba(${accentColor}, 0.2)` : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s',
          boxShadow: selected ? `0 0 6px rgba(${accentColor}, 0.3)` : 'none',
        }}>
          {selected && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.5 6L8 1" stroke={`rgba(${accentColor}, 1)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', color: 'var(--paper)', fontWeight: 400 }}>
          {title}
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        color: 'var(--paper-3)',
        lineHeight: 1.5,
        marginTop: '10px',
        paddingLeft: '28px',
        fontWeight: 300,
      }}>
        {description}
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 1 — Name
  // ────────────────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          {/* Wordmark */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--neon-amber)', opacity: 0.7, marginBottom: '10px' }}>
              slowcial media
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 400, color: 'var(--paper)', margin: 0, letterSpacing: '-0.01em' }}>
              online//offline
            </h1>
          </div>

          <StepDots />

          <div style={{
            background: 'var(--ground-2)',
            border: '1px solid var(--rule-mid)',
            borderRadius: '2px',
            padding: '28px 24px',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper-4)', marginBottom: '6px' }}>
              Step 1 of 3
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: 'var(--paper)', margin: '0 0 24px', letterSpacing: '-0.01em' }}>
              What's your name?
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {/* First name */}
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper-4)', marginBottom: '6px' }}>
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--ground-3)',
                    border: '1px solid var(--rule-mid)',
                    borderRadius: '2px',
                    color: 'var(--paper)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(224,90,40,0.5)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--rule-mid)'; }}
                />
              </div>

              {/* Last name */}
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper-4)', marginBottom: '6px' }}>
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && step1Valid) continueBtn.press(() => setStep(2)); }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--ground-3)',
                    border: '1px solid var(--rule-mid)',
                    borderRadius: '2px',
                    color: 'var(--paper)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(224,90,40,0.5)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--rule-mid)'; }}
                />
              </div>
            </div>

            <button
              disabled={!step1Valid}
              onClick={() => continueBtn.press(() => setStep(2))}
              style={{
                ...continueButtonStyle(continueBtn.state),
                opacity: step1Valid ? 1 : 0.35,
                cursor: step1Valid ? 'pointer' : 'not-allowed',
              }}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 2 — Role + Content Type
  // ────────────────────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--neon-amber)', opacity: 0.7, marginBottom: '10px' }}>
              slowcial media
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 400, color: 'var(--paper)', margin: 0, letterSpacing: '-0.01em' }}>
              online//offline
            </h1>
          </div>

          <StepDots />

          <div style={{
            background: 'var(--ground-2)',
            border: '1px solid var(--rule-mid)',
            borderRadius: '2px',
            padding: '28px 24px',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper-4)', marginBottom: '6px' }}>
              Step 2 of 3
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: 'var(--paper)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              How will you participate?
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 300, color: 'var(--paper-3)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Select one or both. You can add a role later from your profile.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {/* Contributor card */}
              <div>
                <RoleCard
                  selected={isContributor}
                  onToggle={handleToggleContributor}
                  title="Contributor"
                  description="Submit photography, art, poetry, or essays each quarter. Your work may be selected for a curator's printed magazine."
                  accentColor="224,90,40"
                  glowColor="var(--glow-accent)"
                />

                {/* Content type pills — fade in when contributor selected */}
                <div style={{
                  overflow: 'hidden',
                  maxHeight: isContributor ? '80px' : '0',
                  opacity: isContributor ? 1 : 0,
                  transition: 'max-height 0.3s ease, opacity 0.25s ease',
                  marginTop: isContributor ? '10px' : '0',
                  paddingLeft: '2px',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--paper-4)', marginBottom: '8px' }}>
                    What do you make?
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {CONTENT_PILLS.map(pill => {
                      const active = contentType === pill.value;
                      return (
                        <button
                          key={pill.value}
                          onClick={() => handleTogglePill(pill.value)}
                          style={{
                            padding: '5px 12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: active ? 'var(--neon-accent)' : 'var(--paper-4)',
                            background: active ? 'rgba(224,90,40,0.14)' : 'var(--ground-3)',
                            border: active ? '1px solid rgba(224,90,40,0.45)' : '1px solid var(--rule-mid)',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {pill.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Curator card */}
              <RoleCard
                selected={isCurator}
                onToggle={() => setIsCurator(v => !v)}
                title="Curator"
                description="Browse contributor work each quarter and assemble a personalized printed magazine. You receive a physical copy."
                accentColor="224,168,48"
                glowColor="var(--glow-amber)"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                disabled={!step2Valid}
                onClick={() => continueBtn.press(() => setStep(3))}
                style={{
                  ...continueButtonStyle(continueBtn.state),
                  opacity: step2Valid ? 1 : 0.35,
                  cursor: step2Valid ? 'pointer' : 'not-allowed',
                }}
              >
                Continue →
              </button>
              <button
                onClick={() => backBtn.press(() => setStep(1))}
                style={backButtonStyle(backBtn.state)}
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 3 — Confirmation
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--neon-amber)', opacity: 0.7, marginBottom: '10px' }}>
            slowcial media
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 400, color: 'var(--paper)', margin: 0, letterSpacing: '-0.01em' }}>
            online//offline
          </h1>
        </div>

        <StepDots />

        <div style={{
          background: 'var(--ground-2)',
          border: '1px solid var(--rule-mid)',
          borderRadius: '2px',
          padding: '28px 24px',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper-4)', marginBottom: '6px' }}>
            Step 3 of 3
          </div>

          {/* Name greeting */}
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: 'var(--paper)', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Welcome, {firstName}.
          </h2>

          {/* Rule */}
          <div style={{ height: '1px', background: 'var(--paper)', opacity: 0.08, boxShadow: '0 0 6px 1px rgba(240,235,226,0.15)', marginBottom: '20px' }} />

          {/* Confirmation text */}
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '16px',
            fontStyle: 'italic',
            color: 'var(--paper-2)',
            lineHeight: 1.6,
            margin: '0 0 12px',
          }}>
            {confirmationLine()}
          </p>

          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.04em',
            color: 'var(--paper-4)',
            margin: '0 0 28px',
            lineHeight: 1.6,
          }}>
            You can complete your profile — address, payment info — at any time.
          </p>

          {error && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--neon-accent)', marginBottom: '16px' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {saving ? (
              <div style={{ textAlign: 'center', padding: '13px', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--paper-4)' }}>
                loading…
              </div>
            ) : (
              <button
                onClick={() => enterBtn.press(handleEnter)}
                style={continueButtonStyle(enterBtn.state)}
              >
                Enter online//offline →
              </button>
            )}
            <button
              onClick={() => backBtn.press(() => setStep(2))}
              style={backButtonStyle(backBtn.state)}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
