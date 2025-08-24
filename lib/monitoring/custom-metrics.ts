/**
 * Custom Performance Metrics for YUANDI
 * 
 * Tracks business-specific metrics and KPIs
 */

/**
 * Business metrics tracking
 */
export class BusinessMetrics {
  private static instance: BusinessMetrics
  private metrics: Map<string, any[]> = new Map()
  private timers: Map<string, number> = new Map()

  private constructor() {}

  static getInstance(): BusinessMetrics {
    if (!this.instance) {
      this.instance = new BusinessMetrics()
    }
    return this.instance
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now())
  }

  /**
   * End timing and record the metric
   */
  endTimer(name: string): number | null {
    const startTime = this.timers.get(name)
    if (!startTime) return null

    const duration = performance.now() - startTime
    this.timers.delete(name)
    
    this.recordMetric(`${name}_duration`, duration)
    return duration
  }

  /**
   * Record a metric value
   */
  recordMetric(name: string, value: any): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push({
      value,
      timestamp: Date.now(),
    })

    // Keep only last 100 values
    if (values.length > 100) {
      values.shift()
    }

    // Send to monitoring service if threshold exceeded
    this.checkThresholds(name, value)
  }

  /**
   * Get metric statistics
   */
  getMetricStats(name: string): {
    count: number
    average: number
    min: number
    max: number
    latest: any
  } | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null

    const numbers = values
      .map(v => v.value)
      .filter(v => typeof v === 'number') as number[]

    if (numbers.length === 0) {
      return {
        count: values.length,
        average: 0,
        min: 0,
        max: 0,
        latest: values[values.length - 1].value,
      }
    }

    return {
      count: values.length,
      average: numbers.reduce((a, b) => a + b, 0) / numbers.length,
      min: Math.min(...numbers),
      max: Math.max(...numbers),
      latest: values[values.length - 1].value,
    }
  }

  /**
   * Check if metrics exceed thresholds
   */
  private checkThresholds(name: string, value: any): void {
    const thresholds: Record<string, number> = {
      'api_response_time': 3000, // 3 seconds
      'database_query_time': 1000, // 1 second
      'page_load_time': 5000, // 5 seconds
      'error_rate': 0.01, // 1%
      'cart_abandonment_rate': 0.7, // 70%
    }

    const threshold = thresholds[name]
    if (threshold && typeof value === 'number' && value > threshold) {
      this.alertThresholdExceeded(name, value, threshold)
    }
  }

  /**
   * Alert when threshold is exceeded
   */
  private alertThresholdExceeded(
    metric: string,
    value: number,
    threshold: number
  ): void {
    console.warn(`⚠️ Metric threshold exceeded: ${metric}`, {
      value,
      threshold,
      exceededBy: ((value - threshold) / threshold * 100).toFixed(2) + '%',
    })

    // Send alert to monitoring service
    if (process.env.NEXT_PUBLIC_MONITORING_URL) {
      fetch(process.env.NEXT_PUBLIC_MONITORING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'threshold_exceeded',
          metric,
          value,
          threshold,
          timestamp: Date.now(),
        }),
      }).catch(console.error)
    }
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {}
    
    this.metrics.forEach((values, name) => {
      result[name] = this.getMetricStats(name)
    })
    
    return result
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear()
    this.timers.clear()
  }
}

/**
 * Order metrics
 */
export const OrderMetrics = {
  // Track order creation
  trackOrderCreation: (orderId: string, value: number, itemCount: number) => {
    const metrics = BusinessMetrics.getInstance()
    metrics.recordMetric('orders_created', 1)
    metrics.recordMetric('order_value', value)
    metrics.recordMetric('items_per_order', itemCount)
  },

  // Track order completion
  trackOrderCompletion: (orderId: string, duration: number) => {
    const metrics = BusinessMetrics.getInstance()
    metrics.recordMetric('orders_completed', 1)
    metrics.recordMetric('order_fulfillment_time', duration)
  },

  // Track order cancellation
  trackOrderCancellation: (orderId: string, reason: string) => {
    const metrics = BusinessMetrics.getInstance()
    metrics.recordMetric('orders_cancelled', 1)
    metrics.recordMetric(`cancellation_reason_${reason}`, 1)
  },

  // Track refund
  trackRefund: (orderId: string, amount: number) => {
    const metrics = BusinessMetrics.getInstance()
    metrics.recordMetric('refunds_processed', 1)
    metrics.recordMetric('refund_amount', amount)
  },
}

/**
 * Inventory metrics
 */
export const InventoryMetrics = {
  // Track stock levels
  trackStockLevel: (productId: string, quantity: number) => {
    const metrics = BusinessMetrics.getInstance()
    metrics.recordMetric(`stock_level_${productId}`, quantity)
    
    // Track low stock
    if (quantity < 5) {
      metrics.recordMetric('low_stock_products', 1)
    }
    
    // Track out of stock
    if (quantity === 0) {
      metrics.recordMetric('out_of_stock_products', 1)
    }
  },

  // Track inbound
  trackInbound: (productId: string, quantity: number) => {
    const metrics = BusinessMetrics.getInstance()
    metrics.recordMetric('inbound_shipments', 1)
    metrics.recordMetric('inbound_quantity', quantity)
  },

  // Track adjustment
  trackAdjustment: (productId: string, quantity: number, reason: string) => {
    const metrics = BusinessMetrics.getInstance()
    metrics.recordMetric('inventory_adjustments', 1)
    metrics.recordMetric(`adjustment_reason_${reason}`, 1)
  },
}

/**
 * User metrics
 */
export const UserMetrics = {
  // Track user session
  trackSession: (userId: string, duration: number) => {
    const metrics = BusinessMetrics.getInstance()
    metrics.recordMetric('user_sessions', 1)
    metrics.recordMetric('session_duration', duration)
  },

  // Track user action
  trackAction: (userId: string, action: string) => {
    const metrics = BusinessMetrics.getInstance()
    metrics.recordMetric(`user_action_${action}`, 1)
  },

  // Track conversion
  trackConversion: (userId: string, type: string, value?: number) => {
    const metrics = BusinessMetrics.getInstance()
    metrics.recordMetric(`conversion_${type}`, 1)
    if (value) {
      metrics.recordMetric(`conversion_value_${type}`, value)
    }
  },
}

/**
 * System metrics
 */
export const SystemMetrics = {
  // Track API performance
  trackAPICall: (endpoint: string, method: string, duration: number, status: number) => {
    const metrics = BusinessMetrics.getInstance()
    metrics.recordMetric('api_calls', 1)
    metrics.recordMetric(`api_${method}_${endpoint}`, duration)
    
    // Track errors
    if (status >= 400) {
      metrics.recordMetric('api_errors', 1)
      metrics.recordMetric(`api_error_${status}`, 1)
    }
    
    // Track slow APIs
    if (duration > 3000) {
      metrics.recordMetric('slow_api_calls', 1)
    }
  },

  // Track database query
  trackDatabaseQuery: (table: string, operation: string, duration: number) => {
    const metrics = BusinessMetrics.getInstance()
    metrics.recordMetric('database_queries', 1)
    metrics.recordMetric(`db_${operation}_${table}`, duration)
    
    // Track slow queries
    if (duration > 1000) {
      metrics.recordMetric('slow_database_queries', 1)
    }
  },

  // Track cache performance
  trackCache: (key: string, hit: boolean) => {
    const metrics = BusinessMetrics.getInstance()
    metrics.recordMetric('cache_requests', 1)
    metrics.recordMetric(hit ? 'cache_hits' : 'cache_misses', 1)
  },

  // Track memory usage
  trackMemory: () => {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      const metrics = BusinessMetrics.getInstance()
      
      metrics.recordMetric('memory_used', memory.usedJSHeapSize)
      metrics.recordMetric('memory_total', memory.totalJSHeapSize)
      metrics.recordMetric('memory_limit', memory.jsHeapSizeLimit)
      
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      if (usagePercent > 90) {
        console.warn('⚠️ High memory usage:', usagePercent.toFixed(2) + '%')
      }
    }
  },
}

/**
 * Initialize metrics collection
 */
export function initializeMetrics(): void {
  if (typeof window === 'undefined') return

  // Track page visibility
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      BusinessMetrics.getInstance().recordMetric('page_hidden', 1)
    } else {
      BusinessMetrics.getInstance().recordMetric('page_visible', 1)
    }
  })

  // Track memory periodically
  setInterval(() => {
    SystemMetrics.trackMemory()
  }, 60000) // Every minute

  // Track online/offline
  window.addEventListener('online', () => {
    BusinessMetrics.getInstance().recordMetric('connection_online', 1)
  })

  window.addEventListener('offline', () => {
    BusinessMetrics.getInstance().recordMetric('connection_offline', 1)
  })

  console.log('📊 Custom metrics initialized')
}

/**
 * Export metrics for reporting
 */
export function exportMetrics(): Record<string, any> {
  return BusinessMetrics.getInstance().getAllMetrics()
}

/**
 * Reset all metrics
 */
export function resetMetrics(): void {
  BusinessMetrics.getInstance().clearMetrics()
}