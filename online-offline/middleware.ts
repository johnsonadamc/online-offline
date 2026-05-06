import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { pathname } = req.nextUrl;

  // Exempt routes — never redirect these
  if (
    pathname === '/' ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return res;
  }

  const { data: { session } } = await supabase.auth.getSession();

  // Not authenticated — let the page handle it
  if (!session) {
    return res;
  }

  // Check for at least one profile_types row
  const { data: profileTypes } = await supabase
    .from('profile_types')
    .select('type')
    .eq('profile_id', session.user.id)
    .limit(1);

  if (!profileTypes || profileTypes.length === 0) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
