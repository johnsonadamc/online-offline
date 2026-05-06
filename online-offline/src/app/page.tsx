"use client";
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [isSignUp, setIsSignUp] = React.useState(false);
  const router = useRouter();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        alert(error.message);
      } else {
        alert('Check your email for the confirmation link!');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
      } else {
        router.push('/dashboard');
      }
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ground-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(245,169,63,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '390px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--neon-amber)',
            marginBottom: '12px',
            opacity: 0.7,
          }}>
            slowcial media
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '36px',
            fontWeight: 400,
            color: 'var(--paper-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1,
            margin: 0,
          }}>
            online//offline
          </h1>
          <div style={{
            width: '40px',
            height: '1px',
            background: 'var(--rule-color)',
            margin: '16px auto 0',
            opacity: 0.4,
          }} />
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--lt-surface)',
          border: '1px solid var(--rule-color)',
          borderRadius: '2px',
          padding: '28px 24px',
        }}>
          {/* Mode label */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--neon-amber)',
            marginBottom: '20px',
            opacity: 0.8,
          }}>
            {isSignUp ? 'Create account' : 'Sign in'}
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--paper-secondary)',
                marginBottom: '6px',
                opacity: 0.7,
              }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--ground-raised)',
                  border: '1px solid var(--rule-color)',
                  borderRadius: '2px',
                  color: 'var(--paper-primary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--neon-amber)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--rule-color)'; }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--paper-secondary)',
                marginBottom: '6px',
                opacity: 0.7,
              }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--ground-raised)',
                  border: '1px solid var(--rule-color)',
                  borderRadius: '2px',
                  color: 'var(--paper-primary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--neon-amber)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--rule-color)'; }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="press-btn-green"
              style={{
                marginTop: '8px',
                padding: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Working...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '20px 0',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--rule-color)', opacity: 0.3 }} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--paper-secondary)',
              opacity: 0.5,
            }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--rule-color)', opacity: 0.3 }} />
          </div>

          {/* Toggle mode */}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              border: '1px solid var(--rule-color)',
              borderRadius: '2px',
              color: 'var(--paper-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--neon-amber)';
              e.currentTarget.style.color = 'var(--neon-amber)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--rule-color)';
              e.currentTarget.style.color = 'var(--paper-secondary)';
            }}
          >
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>

        {/* Footer tagline */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.1em',
          color: 'var(--paper-secondary)',
          opacity: 0.35,
        }}>
          deliberate by design
        </div>
      </div>
    </div>
  );
}
