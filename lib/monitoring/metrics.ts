import { EventEmitter } from 'events'

// 메트릭 타입 정의
export interface Metric {
  name: string
  value: number
  timestamp: Date
  tags?: Record<string, string>
  type: 'counter' | 'gauge' | 'histogram' | 'timer'
}

export interface MetricsSummary {
  counters: Record<string, number>
  gauges: Record<string, number>
  histograms: Record<string, HistogramData>
  timers: Record<string, TimerData>
}

interface HistogramData {
  count: number
  sum: number
  min: number
  max: number
  mean: number
  p50: number
  p95: number
  p99: number
}

interface TimerData {
  count: number
  totalTime: number
  avgTime: number
  minTime: number
  maxTime: number
}

// 메트릭 수집기 클래스
export class MetricsCollector extends EventEmitter {
  private counters: Map<string, number> = new Map()
  private gauges: Map<string, number> = new Map()
  private histograms: Map<string, number[]> = new Map()
  private timers: Map<string, number[]> = new Map()
  private flushInterval: NodeJS.Timeout | null = null

  constructor(private flushPeriod = 60000) {
    super()
    this.startFlushing()
  }

  // 카운터 증가
  increment(name: string, value = 1, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags)
    const current = this.counters.get(key) || 0
    this.counters.set(key, current + value)
    
    this.emit('metric', {
      name,
      value,
      timestamp: new Date(),
      tags,
      type: 'counter'
    } as Metric)
  }

  // 카운터 감소
  decrement(name: string, value = 1, tags?: Record<string, string>): void {
    this.increment(name, -value, tags)
  }

  // 게이지 설정
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags)
    this.gauges.set(key, value)
    
    this.emit('metric', {
      name,
      value,
      timestamp: new Date(),
      tags,
      type: 'gauge'
    } as Metric)
  }

  // 히스토그램 기록
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags)
    const values = this.histograms.get(key) || []
    values.push(value)
    this.histograms.set(key, values)
    
    this.emit('metric', {
      name,
      value,
      timestamp: new Date(),
      tags,
      type: 'histogram'
    } as Metric)
  }

  // 타이머 시작
  startTimer(name: string, tags?: Record<string, string>): () => void {
    const startTime = Date.now()
    
    return () => {
      const duration = Date.now() - startTime
      this.timer(name, duration, tags)
    }
  }

  // 타이머 기록
  timer(name: string, duration: number, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags)
    const values = this.timers.get(key) || []
    values.push(duration)
    this.timers.set(key, values)
    
    this.emit('metric', {
      name,
      value: duration,
      timestamp: new Date(),
      tags,
      type: 'timer'
    } as Metric)
  }

  // 메트릭 요약 조회
  getSummary(): MetricsSummary {
    const summary: MetricsSummary = {
      counters: {},
      gauges: {},
      histograms: {},
      timers: {}
    }

    // 카운터 요약
    this.counters.forEach((value, key) => {
      summary.counters[key] = value
    })

    // 게이지 요약
    this.gauges.forEach((value, key) => {
      summary.gauges[key] = value
    })

    // 히스토그램 요약
    this.histograms.forEach((values, key) => {
      summary.histograms[key] = this.calculateHistogram(values)
    })

    // 타이머 요약
    this.timers.forEach((values, key) => {
      summary.timers[key] = this.calculateTimer(values)
    })

    return summary
  }

  // 메트릭 리셋
  reset(): void {
    this.counters.clear()
    this.gauges.clear()
    this.histograms.clear()
    this.timers.clear()
  }

  // 주기적 플러시
  private startFlushing(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }

    this.flushInterval = setInterval(() => {
      this.flush()
    }, this.flushPeriod)
  }

  // 메트릭 플러시
  private flush(): void {
    const summary = this.getSummary()
    this.emit('flush', summary)
    
    // 카운터와 히스토그램은 리셋 (게이지는 유지)
    this.counters.clear()
    this.histograms.clear()
    this.timers.clear()
  }

  // 키 생성
  private getKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name
    }

    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join(',')

    return `${name}{${tagString}}`
  }

  // 히스토그램 계산
  private calculateHistogram(values: number[]): HistogramData {
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        mean: 0,
        p50: 0,
        p95: 0,
        p99: 0
      }
    }

    const sorted = [...values].sort((a, b) => a - b)
    const count = sorted.length
    const sum = sorted.reduce((acc, val) => acc + val, 0)
    const mean = sum / count

    return {
      count,
      sum,
      min: sorted[0],
      max: sorted[count - 1],
      mean,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99)
    }
  }

  // 타이머 계산
  private calculateTimer(values: number[]): TimerData {
    if (values.length === 0) {
      return {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: 0,
        maxTime: 0
      }
    }

    const count = values.length
    const totalTime = values.reduce((acc, val) => acc + val, 0)
    const avgTime = totalTime / count
    const minTime = Math.min(...values)
    const maxTime = Math.max(...values)

    return {
      count,
      totalTime,
      avgTime,
      minTime,
      maxTime
    }
  }

  // 백분위수 계산
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1
    return sorted[Math.max(0, index)]
  }

  // 정리
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    this.removeAllListeners()
    this.reset()
  }
}

// 글로벌 메트릭 수집기 인스턴스
export const metrics = new MetricsCollector()

// 익스프레스 미들웨어
export function metricsMiddleware() {
  return (req: any, res: any, next: any) => {
    const endTimer = metrics.startTimer('http.request.duration', {
      method: req.method,
      path: req.path
    })

    // 응답 완료 시 메트릭 기록
    res.on('finish', () => {
      endTimer()
      
      metrics.increment('http.requests', 1, {
        method: req.method,
        path: req.path,
        status: res.statusCode.toString()
      })

      if (res.statusCode >= 400) {
        metrics.increment('http.errors', 1, {
          method: req.method,
          path: req.path,
          status: res.statusCode.toString()
        })
      }
    })

    next()
  }
}

// 비즈니스 메트릭 헬퍼
export const businessMetrics = {
  // 주문 메트릭
  orderCreated: (amount: number) => {
    metrics.increment('orders.created')
    metrics.histogram('orders.amount', amount)
  },

  orderCompleted: (duration: number) => {
    metrics.increment('orders.completed')
    metrics.timer('orders.processing_time', duration)
  },

  orderCancelled: () => {
    metrics.increment('orders.cancelled')
  },

  // 재고 메트릭
  inventoryUpdated: (productId: string, quantity: number) => {
    metrics.gauge(`inventory.level.${productId}`, quantity)
  },

  lowStockAlert: () => {
    metrics.increment('inventory.low_stock_alerts')
  },

  // 매출 메트릭
  revenue: (amount: number, currency: string) => {
    metrics.histogram('revenue', amount, { currency })
  },

  // 사용자 메트릭
  userLogin: () => {
    metrics.increment('users.logins')
  },

  userActivity: (action: string) => {
    metrics.increment('users.activities', 1, { action })
  }
}

export default metrics