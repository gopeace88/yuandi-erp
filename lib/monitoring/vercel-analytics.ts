/**
 * Vercel Analytics and Performance Monitoring for YUANDI
 * 
 * Integrates Vercel Analytics, Speed Insights, and custom metrics
 */

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

/**
 * Custom event tracking
 */
export const trackEvent = (
  eventName: string,
  properties?: Record<string, any>
) => {
  // Vercel Analytics
  if (typeof window !== 'undefined' && window.va) {
    window.va('event', eventName, properties)
  }

  // Google Analytics (if configured)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties)
  }

  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Event tracked:', eventName, properties)
  }
}

/**
 * Page view tracking
 */
export const trackPageView = (url: string) => {
  // Vercel Analytics (automatic)
  
  // Google Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!, {
      page_path: url,
    })
  }
}

/**
 * E-commerce event tracking
 */
export const trackEcommerce = {
  // Product view
  viewProduct: (product: {
    id: string
    name: string
    category: string
    price: number
    currency?: string
  }) => {
    trackEvent('view_item', {
      currency: product.currency || 'KRW',
      value: product.price,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
      }],
    })
  },

  // Add to cart
  addToCart: (product: {
    id: string
    name: string
    category: string
    price: number
    quantity: number
    currency?: string
  }) => {
    trackEvent('add_to_cart', {
      currency: product.currency || 'KRW',
      value: product.price * product.quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: product.quantity,
      }],
    })
  },

  // Begin checkout
  beginCheckout: (items: any[], totalValue: number) => {
    trackEvent('begin_checkout', {
      currency: 'KRW',
      value: totalValue,
      items,
    })
  },

  // Purchase
  purchase: (order: {
    id: string
    value: number
    items: any[]
    shipping?: number
    tax?: number
    currency?: string
  }) => {
    trackEvent('purchase', {
      transaction_id: order.id,
      currency: order.currency || 'KRW',
      value: order.value,
      shipping: order.shipping || 0,
      tax: order.tax || 0,
      items: order.items,
    })
  },

  // Refund
  refund: (order: {
    id: string
    value: number
    items?: any[]
    currency?: string
  }) => {
    trackEvent('refund', {
      transaction_id: order.id,
      currency: order.currency || 'KRW',
      value: order.value,
      items: order.items,
    })
  },
}

/**
 * User event tracking
 */
export const trackUser = {
  // Sign up
  signUp: (method: string) => {
    trackEvent('sign_up', { method })
  },

  // Login
  login: (method: string) => {
    trackEvent('login', { method })
  },

  // Logout
  logout: () => {
    trackEvent('logout')
  },

  // Profile update
  updateProfile: () => {
    trackEvent('profile_updated')
  },
}

/**
 * Performance metrics tracking
 */
export const trackPerformance = {
  // API call timing
  apiCall: (endpoint: string, duration: number, success: boolean) => {
    trackEvent('api_call', {
      endpoint,
      duration,
      success,
      category: 'performance',
    })

    // Log slow API calls
    if (duration > 3000) {
      console.warn(`Slow API call: ${endpoint} took ${duration}ms`)
    }
  },

  // Page load timing
  pageLoad: (page: string, metrics: {
    fcp?: number // First Contentful Paint
    lcp?: number // Largest Contentful Paint
    fid?: number // First Input Delay
    cls?: number // Cumulative Layout Shift
    ttfb?: number // Time to First Byte
  }) => {
    trackEvent('page_performance', {
      page,
      ...metrics,
      category: 'performance',
    })
  },

  // Custom timing
  customTiming: (name: string, duration: number) => {
    trackEvent('custom_timing', {
      name,
      duration,
      category: 'performance',
    })
  },
}

/**
 * Error tracking (supplement to Sentry)
 */
export const trackError = {
  // JavaScript error
  jsError: (error: Error, context?: Record<string, any>) => {
    trackEvent('js_error', {
      message: error.message,
      stack: error.stack,
      ...context,
      category: 'error',
    })
  },

  // API error
  apiError: (endpoint: string, status: number, message?: string) => {
    trackEvent('api_error', {
      endpoint,
      status,
      message,
      category: 'error',
    })
  },

  // Form validation error
  validationError: (form: string, field: string, message: string) => {
    trackEvent('validation_error', {
      form,
      field,
      message,
      category: 'error',
    })
  },
}

/**
 * Feature usage tracking
 */
export const trackFeature = {
  // Search
  search: (query: string, resultsCount: number) => {
    trackEvent('search', {
      query: query.substring(0, 50), // Truncate for privacy
      results_count: resultsCount,
      category: 'feature',
    })
  },

  // Filter
  filter: (filterType: string, value: string) => {
    trackEvent('filter_applied', {
      filter_type: filterType,
      value,
      category: 'feature',
    })
  },

  // Sort
  sort: (sortBy: string, order: 'asc' | 'desc') => {
    trackEvent('sort_applied', {
      sort_by: sortBy,
      order,
      category: 'feature',
    })
  },

  // Export
  export: (type: string, count: number) => {
    trackEvent('export', {
      type,
      count,
      category: 'feature',
    })
  },

  // Share
  share: (method: string, content: string) => {
    trackEvent('share', {
      method,
      content,
      category: 'feature',
    })
  },
}

/**
 * A/B Testing tracking
 */
export const trackExperiment = (
  experimentName: string,
  variant: string
) => {
  trackEvent('experiment_exposure', {
    experiment_name: experimentName,
    variant,
    category: 'experiment',
  })
}

/**
 * Custom Web Vitals reporter
 */
export function reportWebVitals(metric: {
  id: string
  name: string
  value: number
  label: string
}) {
  // Send to Vercel Analytics (automatic)
  
  // Custom handling
  const vitals: Record<string, number> = {}
  
  switch (metric.name) {
    case 'FCP':
      vitals.fcp = Math.round(metric.value)
      break
    case 'LCP':
      vitals.lcp = Math.round(metric.value)
      break
    case 'FID':
      vitals.fid = Math.round(metric.value)
      break
    case 'CLS':
      vitals.cls = metric.value
      break
    case 'TTFB':
      vitals.ttfb = Math.round(metric.value)
      break
  }

  // Track performance metrics
  if (Object.keys(vitals).length > 0) {
    trackPerformance.pageLoad(window.location.pathname, vitals)
  }

  // Log poor performance
  if (metric.label === 'web-vital') {
    const thresholds: Record<string, number> = {
      FCP: 1800,
      LCP: 2500,
      FID: 100,
      CLS: 0.1,
      TTFB: 800,
    }

    if (metric.value > (thresholds[metric.name] || Infinity)) {
      console.warn(`Poor ${metric.name}: ${metric.value}`)
    }
  }
}

// Analytics Provider Component should be moved to a .tsx file
// export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
//   return (
//     <>
//       {children}
//       <Analytics 
//         mode={process.env.NODE_ENV === 'production' ? 'production' : 'development'}
//         debug={process.env.NODE_ENV === 'development'}
//       />
//       <SpeedInsights 
//         debug={process.env.NODE_ENV === 'development'}
//         sampleRate={process.env.NODE_ENV === 'production' ? 0.1 : 1}
//       />
//     </>
//   )
// }

// Type declarations for window object
declare global {
  interface Window {
    va?: (command: string, ...args: any[]) => void
    gtag?: (...args: any[]) => void
  }
}