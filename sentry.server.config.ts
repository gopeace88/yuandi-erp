/**
 * Sentry Server Configuration for YUANDI
 * 
 * This file configures the Sentry SDK for server-side error tracking
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
    
    // Profile sample rate (requires tracing)
    profilesSampleRate: 0.1,
    
    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    
    // Server name
    serverName: process.env.VERCEL_REGION || 'unknown',
    
    // Debug mode
    debug: false,
    
    // Integrations
    integrations: [
      // HTTP integration
      new Sentry.Integrations.Http({
        tracing: true,
        breadcrumbs: true,
      }),
      
      // Prisma integration (if using Prisma with Supabase)
      // new Sentry.Integrations.Prisma({ client: prisma }),
      
      // Request data
      new Sentry.Integrations.RequestData({
        include: {
          cookies: false, // Don't include cookies for privacy
          data: true,
          headers: true,
          ip: true,
          query_string: true,
          url: true,
          user: {
            id: true,
            username: true,
            email: false, // Don't include email for privacy
          },
        },
      }),
      
      // Node specific
      new Sentry.Integrations.Console(),
      new Sentry.Integrations.ContextLines(),
      new Sentry.Integrations.LinkedErrors(),
    ],
    
    // Filtering
    beforeSend(event, hint) {
      // Filter out specific errors
      if (event.exception) {
        const error = hint.originalException
        
        // Ignore expected errors
        if (
          error?.message?.includes('NEXT_NOT_FOUND') ||
          error?.message?.includes('NEXT_REDIRECT')
        ) {
          return null
        }
        
        // Sanitize sensitive data
        if (event.request) {
          // Remove authorization headers
          if (event.request.headers) {
            delete event.request.headers['authorization']
            delete event.request.headers['cookie']
            delete event.request.headers['x-api-key']
          }
          
          // Remove sensitive query params
          if (event.request.query_string) {
            const params = new URLSearchParams(event.request.query_string)
            params.delete('token')
            params.delete('api_key')
            params.delete('secret')
            event.request.query_string = params.toString()
          }
        }
        
        // Remove sensitive environment variables
        if (event.extra?.env) {
          const sensitiveKeys = [
            'SUPABASE_API_KEY',
            'CSRF_SECRET',
            'ENCRYPTION_KEY',
            'NEXTAUTH_SECRET',
            'DATABASE_URL',
          ]
          
          sensitiveKeys.forEach(key => {
            if (event.extra.env[key]) {
              event.extra.env[key] = '[Filtered]'
            }
          })
        }
      }
      
      return event
    },
    
    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out noisy breadcrumbs
      if (
        breadcrumb.category === 'console' && 
        breadcrumb.level === 'debug'
      ) {
        return null
      }
      
      // Sanitize database queries
      if (breadcrumb.category === 'db') {
        if (breadcrumb.data?.query) {
          // Remove potential sensitive data from queries
          breadcrumb.data.query = breadcrumb.data.query
            .replace(/password\s*=\s*'[^']*'/gi, "password='[Filtered]'")
            .replace(/token\s*=\s*'[^']*'/gi, "token='[Filtered]'")
        }
      }
      
      return breadcrumb
    },
    
    // Transport options
    transportOptions: {
      // Shutdown timeout
      shutdownTimeout: 2000,
    },
    
    // Additional options
    ignoreErrors: [
      // Next.js specific
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
      
      // Common errors
      'AbortError',
      'Non-Error promise rejection captured',
      
      // Network errors
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
    ],
    
    // Async context strategy
    // @ts-ignore
    asyncContextStrategy: 'auto',
  })

  // Log initialization
  console.log('🔍 Sentry initialized for server-side error tracking')
} else {
  console.log('🔍 Sentry is disabled on server in this environment')
}

// Helper function to capture API errors
export function captureAPIError(
  error: Error,
  context: {
    api?: string
    method?: string
    userId?: string
    [key: string]: any
  }
) {
  if (!isEnabled) return

  Sentry.withScope((scope) => {
    // Set context
    scope.setContext('api', {
      endpoint: context.api,
      method: context.method,
    })
    
    // Set user
    if (context.userId) {
      scope.setUser({ id: context.userId })
    }
    
    // Set extras
    Object.entries(context).forEach(([key, value]) => {
      if (key !== 'api' && key !== 'method' && key !== 'userId') {
        scope.setExtra(key, value)
      }
    })
    
    // Set level
    scope.setLevel('error')
    
    // Capture
    Sentry.captureException(error)
  })
}

// Helper function for performance monitoring
export function measureAPIPerformance(
  name: string,
  fn: () => Promise<any>
) {
  if (!isEnabled) return fn()

  const transaction = Sentry.startTransaction({
    op: 'api',
    name,
  })

  Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction))

  return fn()
    .then(result => {
      transaction.setStatus('ok')
      return result
    })
    .catch(error => {
      transaction.setStatus('internal_error')
      throw error
    })
    .finally(() => {
      transaction.finish()
    })
}

// Export for manual usage
export { Sentry }