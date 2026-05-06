import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          },
          detectSessionInUrl: false,
          persistSession: false,
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.set('sb-access-token', data.session.access_token, {
        httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600, path: '/',
      });
      response.cookies.set('sb-refresh-token', data.session.refresh_token!, {
        httpOnly: true, secure: true, sameSite: 'lax', maxAge: 86400, path: '/',
      });
      return response;
    }
  }

  return NextResponse.redirect(new URL('/auth?error=auth', request.url));
}
