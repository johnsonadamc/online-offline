"use client";
import React, { useState } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { useRouter } from 'next/navigation';
import { Input, Pill, ProgressSteps, SectionLabel, SANS, SERIF, MONO } from '@/components/v2';

// Design System v2 — README-pages.md §8 "/onboarding". Ink only: green is
// reserved for "adds to the issue" and first appears on the dashboard.

type ContentType = 'photography' | 'art' | 'poetry' | 'essay' | null;

// "Writing" covers poetry + essay (both gold). The DB column content_type only
// accepts poetry | essay, so the Writing pill opens a Poetry / Essay choice.
const WRITING_PILLS: { label: string; value: 'poetry' | 'essay' }[] = [
  { label: 'Poetry', value: 'poetry' },
  { label: 'Essay', value: 'essay' },
];

type Role = 'contributor' | 'curator' | 'both';

// ── v2 chrome (design HTML .btn.ink / .btn.ghost / .radio / .opt) ────────────
const btnBase: React.CSSProperties = {
  font: `500 12px/1 ${SANS}`,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  padding: '15px 18px',
  borderRadius: 5,
  border: 0,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
};
const inkBtn = (disabled?: boolean): React.CSSProperties => ({
  ...btnBase,
  flex: 1,
  color: 'var(--bg)',
  background: 'var(--ink)',
  opacity: disabled ? 0.4 : 1,
  cursor: disabled ? 'default' : 'pointer',
});
const ghostBtn: React.CSSProperties = {
  ...btnBase,
  flex: 'none',
  color: 'var(--ink3)',
  background: 'transparent',
};

function Radio({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: `1px solid ${on ? 'var(--ink)' : 'var(--line2)'}`,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      {on && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ink)' }} />}
    </span>
  );
}

function OptionRow({ title, sub, on, onClick }: { title: string; sub?: string; on: boolean; onClick: () => void }) {
  return (
    <div
      role="radio"
      aria-checked={on}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 0',
        borderBottom: '1px solid var(--line)',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: 0, font: `400 22px/1.1 ${SERIF}`, color: 'var(--ink)' }}>{title}</h4>
        {sub && <p style={{ margin: '4px 0 0', font: `400 12.5px/1.3 ${SANS}`, color: 'var(--ink3)' }}>{sub}</p>}
      </div>
      <Radio on={on} />
    </div>
  );
}

const Wordmark = () => (
  <div style={{ font: `400 19px/1 ${SERIF}`, color: 'var(--ink)' }}>
    online<span style={{ color: 'var(--ink3)' }}>{'//'}</span>offline
  </div>
);

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


  // ── v2 UI glue (state semantics unchanged: isContributor / isCurator / contentType) ──
  const role: Role | null = isContributor && isCurator ? 'both' : isContributor ? 'contributor' : isCurator ? 'curator' : null;
  const handleSelectRole = (next: Role) => {
    const wantContributor = next !== 'curator';
    const wantCurator = next !== 'contributor';
    if (wantContributor !== isContributor) handleToggleContributor();
    if (wantCurator !== isCurator) setIsCurator(wantCurator);
  };

  const isWriting = contentType === 'poetry' || contentType === 'essay';
  const [writingOpen, setWritingOpen] = useState(false);
  const showWriting = writingOpen || isWriting;
  const handleWritingPill = () => {
    if (isWriting && contentType) {
      handleTogglePill(contentType); // clears it
      setWritingOpen(false);
    } else {
      setWritingOpen(v => !v);
    }
  };

  const goBack = () => setStep(s => Math.max(1, s - 1));
  const goNext = () => {
    if (step === 1 && step1Valid) setStep(2);
    else if (step === 2 && step2Valid) setStep(3);
  };
  const canContinue = step === 1 ? step1Valid : step === 2 ? step2Valid : false;

  const hero: React.CSSProperties = { margin: 0, font: `400 30px/1.1 ${SERIF}`, color: 'var(--ink)' };
  const heroSub: React.CSSProperties = { margin: '8px 0 0', font: `400 13px/1.4 ${SANS}`, color: 'var(--ink2)' };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      color: 'var(--ink)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: SANS,
    }}>
      {/* Header — design `.top`: wordmark + mono "N / 3" */}
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '22px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 38, boxSizing: 'content-box' }}>
        <Wordmark />
        <SectionLabel>{step} / 3</SectionLabel>
      </div>

      {/* Scroll region — design `.scroll` */}
      <div style={{ flex: 1, width: '100%', maxWidth: 560, margin: '0 auto', padding: '0 24px 32px' }}>
        <ProgressSteps total={3} current={step} style={{ paddingTop: 26 }} />

        {step === 1 && (
          <>
            <div style={{ paddingTop: 34 }}>
              <h2 style={hero}>What&rsquo;s your name?</h2>
              <p style={heroSub}>As it should appear in print.</p>
            </div>
            <div style={{ paddingTop: 8 }}>
              <Input
                label="First name"
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoFocus
                autoComplete="given-name"
              />
              <Input
                label="Last name"
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && step1Valid) setStep(2); }}
                autoComplete="family-name"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ paddingTop: 34 }}>
              <h2 style={hero}>How will you take part?</h2>
              <p style={heroSub}>You can add a role later from your profile.</p>
            </div>
            <div role="radiogroup" aria-label="Role" style={{ paddingTop: 14 }}>
              <OptionRow title="Contributor" sub="Submit work each season" on={role === 'contributor'} onClick={() => handleSelectRole('contributor')} />
              <OptionRow title="Curator" sub="Assemble and receive the issue" on={role === 'curator'} onClick={() => handleSelectRole('curator')} />
              <OptionRow title="Both" on={role === 'both'} onClick={() => handleSelectRole('both')} />
            </div>

            {isContributor && (
              <>
                <div style={{ paddingTop: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <SectionLabel>What do you make?</SectionLabel>
                </div>
                <div style={{ display: 'flex', gap: 6, padding: '12px 0 4px', flexWrap: 'wrap' }}>
                  <Pill accent="blue" icon="camera" label="Photo" selected={contentType === 'photography'} onClick={() => handleTogglePill('photography')} />
                  <Pill accent="purple" icon="brush" label="Art" selected={contentType === 'art'} onClick={() => handleTogglePill('art')} />
                  <Pill accent="gold" icon="quill" label="Writing" selected={isWriting} tinted={!isWriting && writingOpen} onClick={handleWritingPill} />
                </div>
                {showWriting && (
                  <div style={{ display: 'flex', gap: 6, padding: '6px 0 4px' }}>
                    {WRITING_PILLS.map(p => (
                      <Pill
                        key={p.value}
                        accent="gold"
                        label={p.label}
                        selected={contentType === p.value}
                        tinted={contentType !== p.value}
                        onClick={() => handleTogglePill(p.value)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ paddingTop: 34 }}>
              <h2 style={hero}>Welcome, {firstName}.</h2>
              <p style={heroSub}>Here&rsquo;s how you&rsquo;re joining this season.</p>
            </div>
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 26, paddingTop: 22 }}>
              <p style={{ margin: 0, font: `italic 400 19px/1.35 ${SERIF}`, color: 'var(--ink)' }}>
                {confirmationLine()}
              </p>
              <p style={{ margin: '14px 0 0', font: `400 13px/1.4 ${SANS}`, color: 'var(--ink2)' }}>
                You can complete your profile — address, payment info — at any time.
              </p>
            </div>
            {error && (
              <p role="alert" style={{ margin: '18px 0 0', font: `400 12px/1.5 ${MONO}`, color: 'var(--orange)' }}>
                {error}
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer — design `.foot`: ghost Back + ink primary */}
      <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '16px 24px 26px', display: 'flex', alignItems: 'center', gap: 12 }}>
          {step > 1 ? (
            <button type="button" onClick={goBack} disabled={saving} style={{ ...ghostBtn, opacity: saving ? 0.4 : 1 }}>Back</button>
          ) : (
            <span aria-hidden="true" style={{ ...ghostBtn, visibility: 'hidden' }}>Back</span>
          )}
          {step < 3 ? (
            <button type="button" onClick={goNext} disabled={!canContinue} style={inkBtn(!canContinue)}>Continue</button>
          ) : saving ? (
            <div style={{ flex: 1, textAlign: 'center', font: `400 12px/1 ${MONO}`, color: 'var(--ink3)', padding: '15px 18px' }}>loading…</div>
          ) : (
            <button type="button" onClick={handleEnter} style={inkBtn(false)}>Enter online//offline →</button>
          )}
        </div>
      </div>
    </div>
  );
}
