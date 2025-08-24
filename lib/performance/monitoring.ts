/**
 * Performance Monitoring Utilities for YUANDI
 */

/**
 * Web Vitals monitoring
 */
export function reportWebVitals(metric: any) {
  // Send to analytics endpoint
  if (metric.label === 'web-vital') {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      label: metric.label,
    })

    // Send to your analytics endpoint
    if (process.env.NEXT_PUBLIC_ANALYTICS_URL) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(console.error)
    }
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric)
  }
}

/**
 * Performance Observer for monitoring
 */
export class PerformanceMonitor {
  private observer?: PerformanceObserver
  private metrics: Map<string, number[]> = new Map()

  start() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return
    }

    // Monitor Long Tasks
    this.observeLongTasks()
    
    // Monitor Layout Shifts
    this.observeLayoutShifts()
    
    // Monitor First Input Delay
    this.observeFirstInputDelay()
    
    // Monitor Resource Timing
    this.observeResourceTiming()
  }

  private observeLongTasks() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
            })
            this.recordMetric('longTask', entry.duration)
          }
        }
      })
      observer.observe({ entryTypes: ['longtask'] })
    } catch (e) {
      // Long task observer not supported
    }
  }

  private observeLayoutShifts() {
    try {
      const observer = new PerformanceObserver((list) => {
        let cls = 0
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            cls += (entry as any).value
          }
        }
        if (cls > 0) {
          this.recordMetric('layoutShift', cls)
        }
      })
      observer.observe({ entryTypes: ['layout-shift'] })
    } catch (e) {
      // Layout shift observer not supported
    }
  }

  private observeFirstInputDelay() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = (entry as any).processingStart - entry.startTime
          this.recordMetric('firstInputDelay', fid)
        }
      })
      observer.observe({ entryTypes: ['first-input'] })
    } catch (e) {
      // First input delay observer not supported
    }
  }

  private observeResourceTiming() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 1000) {
            console.warn('Slow resource:', {
              name: entry.name,
              duration: entry.duration,
              type: (entry as any).initiatorType,
            })
          }
        }
      })
      observer.observe({ entryTypes: ['resource'] })
    } catch (e) {
      // Resource timing observer not supported
    }
  }

  private recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)
    
    // Send to analytics if threshold exceeded
    this.checkThresholds(name, value)
  }

  private checkThresholds(name: string, value: number) {
    const thresholds = {
      longTask: 100,
      layoutShift: 0.1,
      firstInputDelay: 100,
    }

    if (thresholds[name as keyof typeof thresholds] && 
        value > thresholds[name as keyof typeof thresholds]) {
      this.sendAlert(name, value)
    }
  }

  private sendAlert(metric: string, value: number) {
    // Send performance alert to monitoring service
    if (process.env.NEXT_PUBLIC_MONITORING_URL) {
      fetch(process.env.NEXT_PUBLIC_MONITORING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'performance_alert',
          metric,
          value,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(console.error)
    }
  }

  getMetrics() {
    const result: Record<string, any> = {}
    
    this.metrics.forEach((values, name) => {
      result[name] = {
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values),
        min: Math.min(...values),
        values: values.slice(-10), // Last 10 values
      }
    })
    
    return result
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = undefined
    }
  }
}

/**
 * API Performance Tracking
 */
export class APIPerformanceTracker {
  private requests: Map<string, { start: number; end?: number }> = new Map()

  startRequest(id: string) {
    this.requests.set(id, { start: performance.now() })
  }

  endRequest(id: string) {
    const request = this.requests.get(id)
    if (request) {
      request.end = performance.now()
      const duration = request.end - request.start
      
      // Log slow requests
      if (duration > 1000) {
        console.warn(`Slow API request (${id}): ${duration.toFixed(2)}ms`)
      }
      
      this.requests.delete(id)
      return duration
    }
    return 0
  }

  getAverageResponseTime(): number {
    const completed = Array.from(this.requests.values())
      .filter(r => r.end)
      .map(r => r.end! - r.start)
    
    if (completed.length === 0) return 0
    return completed.reduce((a, b) => a + b, 0) / completed.length
  }
}

/**
 * Component render performance tracking
 */
export function measureComponentPerformance(componentName: string) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      componentDidMount() {
        performance.mark(`${componentName}-mount-start`)
        // @ts-ignore
        super.componentDidMount?.()
        performance.mark(`${componentName}-mount-end`)
        performance.measure(
          `${componentName}-mount`,
          `${componentName}-mount-start`,
          `${componentName}-mount-end`
        )
      }

      componentDidUpdate() {
        performance.mark(`${componentName}-update-start`)
        // @ts-ignore
        super.componentDidUpdate?.()
        performance.mark(`${componentName}-update-end`)
        performance.measure(
          `${componentName}-update`,
          `${componentName}-update-start`,
          `${componentName}-update-end`
        )
      }
    }
  }
}

/**
 * Custom performance marks for business logic
 */
export class BusinessMetrics {
  static markStart(name: string) {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${name}-start`)
    }
  }

  static markEnd(name: string) {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${name}-end`)
      try {
        performance.measure(name, `${name}-start`, `${name}-end`)
        const measures = performance.getEntriesByName(name, 'measure')
        if (measures.length > 0) {
          const duration = measures[measures.length - 1].duration
          
          // Log to console in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`)
          }
          
          return duration
        }
      } catch (e) {
        // Marks might not exist
      }
    }
    return 0
  }

  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.markStart(name)
    try {
      const result = await fn()
      return result
    } finally {
      this.markEnd(name)
    }
  }

  static measure<T>(name: string, fn: () => T): T {
    this.markStart(name)
    try {
      const result = fn()
      return result
    } finally {
      this.markEnd(name)
    }
  }
}

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring() {
  if (typeof window === 'undefined') return

  const monitor = new PerformanceMonitor()
  monitor.start()

  // Log navigation timing
  window.addEventListener('load', () => {
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    if (navTiming) {
      console.log('Navigation Timing:', {
        domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart,
        loadComplete: navTiming.loadEventEnd - navTiming.loadEventStart,
        domInteractive: navTiming.domInteractive - navTiming.fetchStart,
        pageLoadTime: navTiming.loadEventEnd - navTiming.fetchStart,
      })
    }
  })

  // Return cleanup function
  return () => {
    monitor.stop()
  }
}