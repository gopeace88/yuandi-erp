/**
 * Sentry Edge Configuration for YUANDI
 * 
 * This file configures the Sentry SDK for edge runtime
 * (middleware and edge API routes)
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

// Only initialize Sentry if DSN is provided and not in development
const isEnabled = 
  SENTRY_DSN && 
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PUBLIC_ENABLE_SENTRY === 'true'

if (isEnabled) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Environment configuration
    environment: process.env.NODE_ENV,
    
    // Performance Monitoring (lower rate for edge)
    tracesSampleRate: 0.05,
    
    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    
    // Debug mode
    debug: false,
    
    // Edge-specific configuration
    transportOptions: {
      // Use fetch for edge runtime
      fetchParameters: {
        keepalive: true,
      },
    },
    
    // Filtering
    beforeSend(event, hint) {
      // Filter out specific errors
      if (event.exception) {
        const error = hint.originalException
        
        // Ignore rate limit errors
        if (error?.message?.includes('Too Many Requests')) {
          return null
        }
        
        // Sanitize request data
        if (event.request) {
          // Remove sensitive headers
          if (event.request.headers) {
            delete event.request.headers['authorization']
            delete event.request.headers['cookie']
            delete event.request.headers['x-api-key']
            delete event.request.headers['x-csrf-token']
          }
          
          // Remove sensitive cookies
          if (event.request.cookies) {
            event.request.cookies = '[Filtered]'
          }
        }
        
        // Add edge context
        event.contexts = {
          ...event.contexts,
          edge: {
            region: process.env.VERCEL_REGION || 'unknown',
            runtime: 'edge',
          },
        }
      }
      
      return event
    },
    
    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.level === 'debug') {
        return null
      }
      
      // Add edge context to breadcrumbs
      breadcrumb.data = {
        ...breadcrumb.data,
        runtime: 'edge',
      }
      
      return breadcrumb
    },
    
    // Edge-specific ignore patterns
    ignoreErrors: [
      'EdgeRuntimeError',
      'Too Many Requests',
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
    ],
  })

  console.log('🔍 Sentry initialized for edge runtime')
} else {
  console.log('🔍 Sentry is disabled in edge runtime')
}

// Helper for middleware error handling
export function captureMiddlewareError(
  error: Error,
  request: Request,
  context?: Record<string, any>
) {
  if (!isEnabled) return

  Sentry.withScope((scope) => {
    // Set request context
    scope.setContext('request', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(
        Array.from(request.headers.entries()).filter(
          ([key]) => !['authorization', 'cookie'].includes(key.toLowerCase())
        )
      ),
    })
    
    // Set edge context
    scope.setContext('edge', {
      region: process.env.VERCEL_REGION,
      runtime: 'edge',
      ...context,
    })
    
    // Set level
    scope.setLevel('error')
    
    // Capture
    Sentry.captureException(error)
  })
}

// Export for manual usage
export { Sentry }