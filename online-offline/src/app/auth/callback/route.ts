import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/auth?error=auth', requestUrl.origin));
  }

  // Read incoming cookies (contains the PKCE code verifier if applicable)
  const cookieStore = await cookies();

  // Build the success redirect first so the storage adapter can write
  // session cookies directly onto it before we return it.
  const successResponse = NextResponse.redirect(new URL('/', requestUrl.origin));

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: true,
        storage: {
          getItem: (key: string) => cookieStore.get(key)?.value ?? null,
          setItem: (key: string, value: string) => {
            successResponse.cookies.set(key, value, {
              path: '/',
              sameSite: 'lax',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              maxAge: 60 * 60 * 24 * 365,
            });
          },
          removeItem: (key: string) => {
            successResponse.cookies.delete(key);
          },
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
    return NextResponse.redirect(new URL('/auth?error=auth', requestUrl.origin));
  }

  return successResponse;
}
