import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const exemptPaths = ['/onboarding', '/auth', '/api', '/_next', '/favicon.ico']
  if (exemptPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const cookieValue = request.cookies.get('sb-cbdiujvqpirrvzodfujm-auth-token')?.value

  if (!cookieValue) {
    return NextResponse.next()
  }

  let accessToken: string | undefined
  try {
    const session = JSON.parse(decodeURIComponent(cookieValue))
    accessToken = session?.access_token
  } catch {
    return NextResponse.next()
  }

  if (!accessToken) {
    return NextResponse.next()
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profile_types?select=type`,
      {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    )

    if (res.ok) {
      const rows = await res.json()
      if (Array.isArray(rows) && rows.length === 0) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  } catch (e) {
    console.error('middleware profile_types check failed:', e)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
