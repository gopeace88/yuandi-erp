import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // For root path, allow it to pass through
  if (pathname === '/') {
    const response = NextResponse.next()
    response.headers.set('x-locale', 'ko')
    return response
  }

  // Check if URL already has a locale
  const pathnameHasLocale = ['ko', 'zh-CN'].some((locale) =>
    pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  // If already has locale, continue
  if (pathnameHasLocale) {
    const locale = pathname.split('/')[1]
    const response = NextResponse.next()
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

  return redirectResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}