/**
 * Advanced Performance Optimization Utilities
 * 
 * Implements lazy loading, memoization, virtualization, and other performance patterns
 */

import { lazy, Suspense, ComponentType } from 'react'
import dynamic from 'next/dynamic'

// ============================================================================
// Lazy Loading Utilities
// ============================================================================

/**
 * Enhanced lazy loading with retry logic
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries: number = 3,
  delay: number = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: any
    
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn()
      } catch (error) {
        lastError = error
        
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
          
          // Reload the page if chunk failed to load
          if (error?.message?.includes('Loading chunk')) {
            window.location.reload()
            break
          }
        }
      }
    }
    
    throw lastError
  })
}

/**
 * Dynamic import with loading and error states
 */
export function dynamicWithStates<P = {}>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: ComponentType
    error?: ComponentType<{ error: Error; retry: () => void }>
    ssr?: boolean
    suspense?: boolean
  }
) {
  return dynamic(loader, {
    loading: options?.loading || (() => null), // LoadingSpinner
    ssr: options?.ssr ?? true,
    suspense: options?.suspense ?? false
  })
}

// ============================================================================
// Memoization Utilities
// ============================================================================

/**
 * Deep memoization for complex objects
 */
export class DeepMemo<T> {
  private cache = new Map<string, { value: T; timestamp: number }>()
  private maxAge: number
  private maxSize: number

  constructor(maxAge: number = 5 * 60 * 1000, maxSize: number = 100) {
    this.maxAge = maxAge
    this.maxSize = maxSize
  }

  get(key: any, factory: () => T): T {
    const cacheKey = this.getCacheKey(key)
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.maxAge) {
      return cached.value
    }
    
    const value = factory()
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0]
      this.cache.delete(oldestKey)
    }
    
    this.cache.set(cacheKey, { value, timestamp: Date.now() })
    return value
  }

  clear() {
    this.cache.clear()
  }

  private getCacheKey(key: any): string {
    return JSON.stringify(key, this.replacer)
  }

  private replacer(key: string, value: any) {
    if (value instanceof Map) {
      return { __type: 'Map', value: Array.from(value.entries()) }
    }
    if (value instanceof Set) {
      return { __type: 'Set', value: Array.from(value) }
    }
    return value
  }
}

/**
 * Async memoization with cache invalidation
 */
export class AsyncMemo<T> {
  private cache = new Map<string, Promise<T>>()
  private results = new Map<string, { value: T; timestamp: number }>()
  private maxAge: number

  constructor(maxAge: number = 5 * 60 * 1000) {
    this.maxAge = maxAge
  }

  async get(key: any, factory: () => Promise<T>): Promise<T> {
    const cacheKey = JSON.stringify(key)
    
    // Check if we have a fresh result
    const result = this.results.get(cacheKey)
    if (result && Date.now() - result.timestamp < this.maxAge) {
      return result.value
    }
    
    // Check if there's a pending promise
    const pending = this.cache.get(cacheKey)
    if (pending) {
      return pending
    }
    
    // Create new promise
    const promise = factory().then(value => {
      this.results.set(cacheKey, { value, timestamp: Date.now() })
      this.cache.delete(cacheKey)
      return value
    }).catch(error => {
      this.cache.delete(cacheKey)
      throw error
    })
    
    this.cache.set(cacheKey, promise)
    return promise
  }

  invalidate(key?: any) {
    if (key) {
      const cacheKey = JSON.stringify(key)
      this.cache.delete(cacheKey)
      this.results.delete(cacheKey)
    } else {
      this.cache.clear()
      this.results.clear()
    }
  }
}

// ============================================================================
// Request Deduplication
// ============================================================================

/**
 * Deduplicate concurrent requests
 */
export class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>()

  async execute<T>(
    key: string,
    factory: () => Promise<T>
  ): Promise<T> {
    // Check if there's a pending request
    const pending = this.pending.get(key)
    if (pending) {
      return pending
    }
    
    // Create new request
    const promise = factory().finally(() => {
      this.pending.delete(key)
    })
    
    this.pending.set(key, promise)
    return promise
  }
}

// ============================================================================
// Virtualization Utilities
// ============================================================================

/**
 * Virtual list configuration
 */
export interface VirtualListConfig {
  itemHeight: number | ((index: number) => number)
  overscan?: number
  estimatedItemHeight?: number
  getScrollElement?: () => HTMLElement | null
}

/**
 * Calculate visible range for virtual scrolling
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemCount: number,
  config: VirtualListConfig
): { start: number; end: number } {
  const { itemHeight, overscan = 3 } = config
  
  if (typeof itemHeight === 'number') {
    // Fixed height items
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const end = Math.min(itemCount, start + visibleCount + overscan * 2)
    
    return { start, end }
  } else {
    // Variable height items
    let accumulatedHeight = 0
    let start = 0
    let end = itemCount
    
    for (let i = 0; i < itemCount; i++) {
      const height = itemHeight(i)
      
      if (accumulatedHeight < scrollTop - containerHeight) {
        start = i
      }
      
      if (accumulatedHeight > scrollTop + containerHeight * 2) {
        end = i
        break
      }
      
      accumulatedHeight += height
    }
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(itemCount, end + overscan)
    }
  }
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Batch processor for heavy operations
 */
export class BatchProcessor<T, R> {
  private queue: Array<{ item: T; resolve: (value: R) => void; reject: (error: any) => void }> = []
  private processing = false
  private batchSize: number
  private delay: number
  private processor: (batch: T[]) => Promise<R[]>

  constructor(
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = 10,
    delay: number = 0
  ) {
    this.processor = processor
    this.batchSize = batchSize
    this.delay = delay
  }

  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject })
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    
    // Wait for more items if configured
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay))
    }
    
    // Take a batch from the queue
    const batch = this.queue.splice(0, this.batchSize)
    
    try {
      const results = await this.processor(batch.map(b => b.item))
      
      batch.forEach((item, index) => {
        item.resolve(results[index])
      })
    } catch (error) {
      batch.forEach(item => {
        item.reject(error)
      })
    }
    
    this.processing = false
    
    // Process next batch if queue is not empty
    if (this.queue.length > 0) {
      this.processQueue()
    }
  }
}

// ============================================================================
// Image Optimization
// ============================================================================

/**
 * Progressive image loading
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'auto'
  } = {}
): string {
  // If using Next.js Image Optimization API
  const params = new URLSearchParams()
  
  if (options.width) params.append('w', options.width.toString())
  if (options.height) params.append('h', options.height.toString())
  if (options.quality) params.append('q', options.quality.toString())
  if (options.format) params.append('f', options.format)
  
  return `/_next/image?url=${encodeURIComponent(url)}&${params.toString()}`
}

/**
 * Lazy load images with intersection observer
 */
export class ImageLazyLoader {
  private observer: IntersectionObserver
  private images = new Map<Element, string>()

  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: '50px',
        threshold: 0.01,
        ...options
      }
    )
  }

  observe(element: Element, src: string) {
    this.images.set(element, src)
    this.observer.observe(element)
  }

  unobserve(element: Element) {
    this.images.delete(element)
    this.observer.unobserve(element)
  }

  disconnect() {
    this.observer.disconnect()
    this.images.clear()
  }

  private handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const src = this.images.get(entry.target)
        
        if (src) {
          if (entry.target instanceof HTMLImageElement) {
            entry.target.src = src
          } else {
            entry.target.setAttribute('style', `background-image: url(${src})`)
          }
          
          this.unobserve(entry.target)
        }
      }
    })
  }
}

// ============================================================================
// Worker Pool
// ============================================================================

/**
 * Web Worker pool for CPU-intensive tasks
 */
export class WorkerPool {
  private workers: Worker[] = []
  private queue: Array<{
    data: any
    resolve: (value: any) => void
    reject: (error: any) => void
  }> = []
  private busy = new Set<Worker>()

  constructor(
    workerScript: string,
    poolSize: number = navigator.hardwareConcurrency || 4
  ) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript)
      this.workers.push(worker)
    }
  }

  async execute<T = any>(data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker()
      
      if (worker) {
        this.runTask(worker, data, resolve, reject)
      } else {
        this.queue.push({ data, resolve, reject })
      }
    })
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate())
    this.workers = []
    this.queue = []
    this.busy.clear()
  }

  private getAvailableWorker(): Worker | null {
    return this.workers.find(w => !this.busy.has(w)) || null
  }

  private runTask(
    worker: Worker,
    data: any,
    resolve: (value: any) => void,
    reject: (error: any) => void
  ) {
    this.busy.add(worker)
    
    const handleMessage = (event: MessageEvent) => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      this.busy.delete(worker)
      
      resolve(event.data)
      this.processQueue()
    }
    
    const handleError = (error: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      this.busy.delete(worker)
      
      reject(error)
      this.processQueue()
    }
    
    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)
    worker.postMessage(data)
  }

  private processQueue() {
    if (this.queue.length === 0) return
    
    const worker = this.getAvailableWorker()
    if (!worker) return
    
    const task = this.queue.shift()!
    this.runTask(worker, task.data, task.resolve, task.reject)
  }
}

// ============================================================================
// Default Components
// ============================================================================

// LoadingSpinner should be moved to a .tsx file
// function LoadingSpinner() {
//   return (
//     <div className="flex items-center justify-center p-4">
//       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//     </div>
//   )
// }