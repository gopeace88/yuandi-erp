import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

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
  await supabase.auth.getSession()

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
    const locale = pathname.split('/')[1]
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