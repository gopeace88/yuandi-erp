/**
 * Next.js Middleware for YUANDI
 * 
 * Handles HTTPS enforcement, security headers, authentication,
 * and request routing at the edge
 */

import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

/**
 * Security headers configuration
 */
const SECURITY_HEADERS = {
  // XSS Protection
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  
  // Frame Options
  'X-Frame-Options': 'DENY',
  
  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; '),
  
  // Strict Transport Security (HSTS)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
}

/**
 * Rate limiting configuration
 */
const RATE_LIMITS = {
  api: {
    window: 60 * 1000, // 1 minute
    max: 60, // requests per window
  },
  auth: {
    window: 15 * 60 * 1000, // 15 minutes
    max: 5, // attempts per window
  },
  public: {
    window: 60 * 1000, // 1 minute
    max: 100, // requests per window
  },
}

/**
 * Request tracking for rate limiting
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>()

/**
 * HTTPS enforcement
 */
function enforceHTTPS(request: NextRequest): NextResponse | null {
  // Skip HTTPS enforcement in development
  if (process.env.NODE_ENV === 'development') {
    return null
  }

  const proto = request.headers.get('x-forwarded-proto')
  const host = request.headers.get('host')

  // Redirect to HTTPS if not secure
  if (proto !== 'https' && host && !host.includes('localhost')) {
    const secureUrl = new URL(request.url)
    secureUrl.protocol = 'https:'
    
    return NextResponse.redirect(secureUrl, {
      status: 301,
      headers: {
        'Strict-Transport-Security': SECURITY_HEADERS['Strict-Transport-Security'],
      },
    })
  }

  return null
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  // Apply all security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

/**
 * Rate limiting check
 */
function checkRateLimit(
  identifier: string,
  limits: { window: number; max: number }
): boolean {
  const now = Date.now()
  const record = requestCounts.get(identifier)

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + limits.window,
    })
    return true
  }

  if (record.count >= limits.max) {
    return false
  }

  record.count++
  return true
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  const ip = 
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  
  const pathname = request.nextUrl.pathname
  return `${ip}:${pathname}`
}

/**
 * Check if path requires authentication
 */
function requiresAuth(pathname: string): boolean {
  const protectedPaths = [
    '/dashboard',
    '/orders',
    '/inventory',
    '/products',
    '/cashbook',
    '/users',
    '/settings',
    '/api/orders',
    '/api/products',
    '/api/inventory',
    '/api/cashbook',
    '/api/users',
    '/api/export',
  ]

  return protectedPaths.some(path => pathname.startsWith(path))
}

/**
 * Check if path is public API
 */
function isPublicAPI(pathname: string): boolean {
  const publicPaths = [
    '/api/track',
    '/api/auth',
    '/track',
  ]

  return publicPaths.some(path => pathname.startsWith(path))
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Language Detection and Routing
  // Skip static files and API routes for i18n
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if URL already has a locale
  const pathnameHasLocale = ['ko', 'zh-CN', 'en'].some((locale) =>
    pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  // If already has locale, continue
  if (pathnameHasLocale) {
    const currentLocale = pathname.split('/')[1]
    const response = NextResponse.next()
    response.headers.set('x-locale', currentLocale)
    return response
  }

  // Detect locale from cookie or Accept-Language
  let locale = request.cookies.get('locale')?.value || 'ko'
  
  if (!request.cookies.get('locale')) {
    const acceptLanguage = request.headers.get('accept-language') || ''
    if (acceptLanguage.toLowerCase().includes('zh')) {
      locale = 'zh-CN'
    } else if (acceptLanguage.toLowerCase().includes('en')) {
      locale = 'en'
    } else {
      locale = 'ko'
    }
  }

  // Redirect with locale prefix
  const redirectUrl = new URL(`/${locale}${pathname}`, request.url)
  redirectUrl.search = request.nextUrl.search
  
  const redirectResponse = NextResponse.redirect(redirectUrl)
  redirectResponse.cookies.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })
  
  return redirectResponse

  // 2. HTTPS Enforcement
  const httpsRedirect = enforceHTTPS(request)
  if (httpsRedirect) {
    return httpsRedirect
  }

  // 2. Rate Limiting (disabled in development)
  if (process.env.NODE_ENV !== 'development') {
    const clientId = getClientIdentifier(request)
    let rateLimit = RATE_LIMITS.public

    if (pathname.startsWith('/api/auth')) {
      rateLimit = RATE_LIMITS.auth
    } else if (pathname.startsWith('/api')) {
      rateLimit = RATE_LIMITS.api
    }

    if (!checkRateLimit(clientId, rateLimit)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimit.window / 1000)),
          ...SECURITY_HEADERS,
        },
      })
    }
  }

  // 3. Create response
  let response = NextResponse.next()

  // Set locale cookie if not present
  if (!request.cookies.get('locale')) {
    response.cookies.set('locale', locale, {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })
  }

  // Add locale to response headers for server components
  response.headers.set('x-locale', locale)

  // 4. Authentication Check - Cookie-based for development
  if (requiresAuth(pathname)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Middleware - checking auth for:', pathname)
    }
    
    // Check for session cookies
    const sessionCookie = request.cookies.get('session')
    const userCookie = request.cookies.get('user')
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Middleware - sessionCookie:', sessionCookie ? 'exists' : 'missing')
      console.log('Middleware - userCookie:', userCookie ? 'exists' : 'missing')
    }
    
    if (!sessionCookie || !userCookie) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Middleware - redirecting to /auth/signin (missing cookies)')
      }
      const loginUrl = new URL('/auth/signin', request.url)
      return NextResponse.redirect(loginUrl)
    }
    
    try {
      const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf8'))
      const userData = JSON.parse(Buffer.from(userCookie.value, 'base64').toString('utf8'))
      const sessionExpires = new Date(sessionData.expires)
      const now = new Date()
      
      if (sessionExpires <= now) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Middleware - session expired, redirecting to /auth/signin')
        }
        const loginUrl = new URL('/auth/signin', request.url)
        return NextResponse.redirect(loginUrl)
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Middleware - session valid, allowing access')
      }
      
      // Check user role for admin paths
      if (pathname.startsWith('/dashboard/users') || pathname.startsWith('/api/users')) {
        if (userData.role !== 'Admin') {
          return new NextResponse('Forbidden', {
            status: 403,
            headers: SECURITY_HEADERS,
          })
        }
      }

      // Add user info to request headers for API routes
      if (pathname.startsWith('/api')) {
        response.headers.set('x-user-id', userData.id)
        response.headers.set('x-user-role', userData.role || 'user')
      }
    } catch (error) {
      console.log('Middleware - session parse error, redirecting to /auth/signin')
      const loginUrl = new URL('/auth/signin', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 5. CORS for public API
  if (isPublicAPI(pathname)) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }
  }

  // 6. Apply Security Headers
  response = applySecurityHeaders(response)

  // 7. Add request ID for tracking
  const requestId = crypto.randomUUID()
  response.headers.set('x-request-id', requestId)

  // 8. Add server timing header for performance monitoring
  if (process.env.NODE_ENV === 'development') {
    const processingTime = Date.now()
    response.headers.set(
      'Server-Timing',
      `middleware;dur=${Date.now() - processingTime}`
    )
  }

  return response
}

/**
 * Middleware configuration
 * Specify which paths the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

/**
 * Cleanup old rate limit records periodically
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of requestCounts.entries()) {
      if (now > record.resetTime) {
        requestCounts.delete(key)
      }
    }
  }, 60 * 1000) // Clean up every minute
}