"use client";
import React from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { useRouter } from 'next/navigation';
import { Input, SANS, SERIF } from '@/components/v2';

// Design System v2 — README-pages.md §9 "/ sign in". Ink only (green is
// reserved for "adds to the issue"; its first appearance is the dashboard).

export default function Home() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [isSignUp, setIsSignUp] = React.useState(false);
  const router = useRouter();
  const supabase = useSupabase();

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
      minHeight: '100dvh',
      background: 'var(--bg)',
      color: 'var(--ink)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '40px 32px',
      fontFamily: SANS,
    }}>
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        {/* Wordmark — design `.center .wm`: 34px serif, "//" in --ink3 */}
        <h1 style={{
          margin: 0,
          font: `400 34px/1 ${SERIF}`,
          textAlign: 'center',
          color: 'var(--ink)',
          letterSpacing: 0,
        }}>
          online<span style={{ color: 'var(--ink3)' }}>{'//'}</span>offline
        </h1>
        {/* 40px hairline — design `.center hr` */}
        <div style={{ width: 40, height: 1, background: 'var(--line2)', margin: '22px auto 30px' }} />

        <form onSubmit={handleAuth}>
          <Input
            type="email"
            required
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div style={{ paddingTop: 18 }}>
            <Input
              type="password"
              required
              placeholder="Password"
              aria-label="Password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Ink primary — design `.btn.ink` */}
          <div style={{ paddingTop: 30, display: 'flex' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                font: `500 12px/1 ${SANS}`,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                padding: '15px 18px',
                borderRadius: 5,
                border: 0,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                color: 'var(--bg)',
                background: 'var(--ink)',
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.4 : 1,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {loading ? 'Working…' : (isSignUp ? 'Create account' : 'Sign in')}
            </button>
          </div>
        </form>

        {/* Mode toggle — design `.link` */}
        <div style={{ textAlign: 'center', paddingTop: 22 }}>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              font: `400 13px/1 ${SANS}`,
              color: 'var(--ink3)',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>
      </div>
    </div>
  );
}
