import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getUserRole, isRoleAllowed, type UserRole } from '@/lib/auth/roles'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Create a response object to mutate
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_API_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const allowMockRole = process.env.NODE_ENV !== 'production'
  const mockRoleCookie = allowMockRole
    ? (request.cookies.get('mock-role')?.value as UserRole | undefined)
    : undefined

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return response
  }

  // For root path, redirect to Korean version
  if (pathname === '/') {
    const locale = 'ko'
    const redirectUrl = new URL(`/${locale}`, request.url)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    // Copy Supabase cookies to redirect response
    request.cookies.getAll().forEach(cookie => {
      if (cookie.name.startsWith('sb-')) {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      }
    })
    return redirectResponse
  }

  // Check if URL already has a locale
  const pathnameHasLocale = ['ko', 'zh-CN'].some((locale) =>
    pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  // If already has locale, continue
  if (pathnameHasLocale) {
    const segments = pathname.split('/').filter(Boolean)
    const locale = segments[0]
    const section = segments[1] || ''

    const routePermissions: Record<string, UserRole[]> = {
      dashboard: ['admin', 'order_manager', 'ship_manager'],
      inventory: ['admin', 'order_manager'],
      orders: ['admin', 'order_manager'],
      shipments: ['admin', 'ship_manager'],
      cashbook: ['admin'],
      settings: ['admin'],
      users: ['admin'],
      products: ['admin', 'order_manager'],
    }

    const publicSections = new Set(['login', 'track', 'auth', 'api'])

    if (section && routePermissions[section]) {
      let role: UserRole = null

      if (session?.user?.id) {
        role = await getUserRole(supabase, session.user.id)
      } else if (mockRoleCookie && process.env.NODE_ENV === 'development') {
        // Only allow mock role in development environment
        role = mockRoleCookie as UserRole
      }

      if (!role) {
        const loginUrl = new URL(`/${locale}/auth/signin`, request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }

      if (!isRoleAllowed(role, routePermissions[section])) {
        const fallbackUrl = new URL(`/${locale}/dashboard`, request.url)
        return NextResponse.redirect(fallbackUrl)
      }
    } else if (section && !publicSections.has(section)) {
      // For any other authenticated section, ensure session exists or mock role is provided (dev only)
      if (!session && !(mockRoleCookie && process.env.NODE_ENV === 'development')) {
        const loginUrl = new URL(`/${locale}/auth/signin`, request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    response.headers.set('x-locale', locale)
    return response
  }

  // For other paths without locale, redirect to Korean version
  const locale = 'ko'
  const redirectUrl = new URL(`/${locale}${pathname}`, request.url)
  redirectUrl.search = request.nextUrl.search

  const redirectResponse = NextResponse.redirect(redirectUrl)
  redirectResponse.cookies.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })

  // Copy Supabase cookies to redirect response
  request.cookies.getAll().forEach(cookie => {
    if (cookie.name.startsWith('sb-')) {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    }
  })

  return redirectResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
