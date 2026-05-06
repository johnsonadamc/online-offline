import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const exemptPaths = ['/onboarding', '/auth', '/api', '/_next', '/favicon.ico']
  if (exemptPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log('middleware:', pathname, 'user:', user?.id, 'error:', userError)

  if (!user) {
    return supabaseResponse
  }

  try {
    const { data: profileTypes, error: ptError } = await supabase
      .from('profile_types')
      .select('type')
      .eq('profile_id', user.id)
      .limit(1)
    console.log('profile_types result:', profileTypes, 'user:', user.id, 'error:', ptError)
    if (!profileTypes || profileTypes.length === 0) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  } catch (e) {
    console.error('middleware profile_types check failed:', e)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
