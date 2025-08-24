/**
 * Sentry Client Configuration for YUANDI
 * 
 * This file configures the Sentry SDK for client-side error tracking
 * and performance monitoring
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
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session Replay
    replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors
    replaysSessionSampleRate: 0.1, // Capture 10% of all sessions
    
    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    
    // Debug mode
    debug: false,
    
    // Integrations
    integrations: [
      // Browser Tracing
      new Sentry.BrowserTracing({
        // Set sampling rate for performance monitoring
        tracingOrigins: [
          'localhost',
          process.env.NEXT_PUBLIC_APP_URL || 'https://yuandi.com',
          /^\//,
        ],
        // Capture interactions
        routingInstrumentation: Sentry.nextRouterInstrumentation(),
      }),
      
      // Session Replay
      new Sentry.Replay({
        // Privacy settings
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
        
        // Sampling
        sessionSampleRate: 0.1,
        errorSampleRate: 1.0,
        
        // Network recording
        networkDetailAllowUrls: [
          process.env.NEXT_PUBLIC_APP_URL || 'https://yuandi.com',
        ],
        networkRequestHeaders: ['X-Request-Id'],
        networkResponseHeaders: ['X-Request-Id'],
      }),
      
      // Breadcrumbs
      new Sentry.Breadcrumbs({
        console: process.env.NODE_ENV !== 'production',
        dom: true,
        fetch: true,
        history: true,
        sentry: true,
        xhr: true,
      }),
    ],
    
    // Filtering
    beforeSend(event, hint) {
      // Filter out specific errors
      if (event.exception) {
        const error = hint.originalException
        
        // Ignore network errors in development
        if (
          process.env.NODE_ENV === 'development' &&
          error?.message?.includes('NetworkError')
        ) {
          return null
        }
        
        // Ignore specific third-party errors
        if (
          error?.message?.includes('Non-Error promise rejection captured') ||
          error?.message?.includes('ResizeObserver loop limit exceeded')
        ) {
          return null
        }
        
        // Sanitize sensitive data
        if (event.request?.cookies) {
          event.request.cookies = '[Filtered]'
        }
        
        if (event.user) {
          // Only keep user ID, remove PII
          event.user = {
            id: event.user.id,
          }
        }
      }
      
      return event
    },
    
    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null
      }
      
      // Sanitize data in breadcrumbs
      if (breadcrumb.data && breadcrumb.data.url) {
        // Remove query parameters that might contain sensitive data
        const url = new URL(breadcrumb.data.url)
        url.search = ''
        breadcrumb.data.url = url.toString()
      }
      
      return breadcrumb
    },
    
    // Transport options
    transportOptions: {
      // Retry failed requests
      fetchParameters: {
        keepalive: true,
      },
    },
    
    // Additional options
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      
      // Network errors
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      
      // Safari specific
      'Non-Error promise rejection',
      'NotAllowedError',
      
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
    
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      
      // Firefox extensions  
      /^moz-extension:\/\//i,
      
      // Safari extensions
      /^safari-extension:\/\//i,
      
      // Other common extensions
      /^resource:\/\//i,
      /^webkit-masked-url:\/\//i,
    ],
    
    allowUrls: [
      'localhost',
      process.env.NEXT_PUBLIC_APP_URL || 'https://yuandi.com',
    ],
  })

  // Set user context after authentication
  if (typeof window !== 'undefined') {
    // This would be called after user logs in
    // Example: Sentry.setUser({ id: user.id, email: user.email })
  }

  // Log initialization
  console.log('🔍 Sentry initialized for error tracking')
} else {
  console.log('🔍 Sentry is disabled in this environment')
}

// Export for manual error capturing
export { Sentry }