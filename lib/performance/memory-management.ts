import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * Memory leak prevention utilities
 */

/**
 * Hook to cleanup subscriptions and timers
 */
export function useCleanup() {
  const cleanupFns = useRef<Array<() => void>>([])

  const addCleanup = useCallback((fn: () => void) => {
    cleanupFns.current.push(fn)
  }, [])

  useEffect(() => {
    return () => {
      cleanupFns.current.forEach(fn => fn())
      cleanupFns.current = []
    }
  }, [])

  return addCleanup
}

/**
 * Hook for safe async operations that prevents state updates on unmounted components
 */
export function useSafeAsync<T>() {
  const isMounted = useRef(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T | null>(null)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const execute = useCallback(async (asyncFunction: () => Promise<T>) => {
    setLoading(true)
    setError(null)

    try {
      const result = await asyncFunction()
      if (isMounted.current) {
        setData(result)
      }
      return result
    } catch (err) {
      if (isMounted.current) {
        setError(err as Error)
      }
      throw err
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [])

  return { execute, loading, error, data }
}

/**
 * AbortController manager for cancellable requests
 */
export class AbortManager {
  private controllers: Map<string, AbortController> = new Map()

  create(key: string): AbortController {
    // Abort existing controller with same key
    this.abort(key)

    const controller = new AbortController()
    this.controllers.set(key, controller)
    return controller
  }

  abort(key: string) {
    const controller = this.controllers.get(key)
    if (controller) {
      controller.abort()
      this.controllers.delete(key)
    }
  }

  abortAll() {
    this.controllers.forEach(controller => controller.abort())
    this.controllers.clear()
  }

  getSignal(key: string): AbortSignal | undefined {
    return this.controllers.get(key)?.signal
  }
}

/**
 * Hook for abort controller management
 */
export function useAbortController(key?: string) {
  const managerRef = useRef(new AbortManager())
  const keyRef = useRef(key || 'default')

  useEffect(() => {
    const manager = managerRef.current
    return () => {
      manager.abortAll()
    }
  }, [])

  const getSignal = useCallback(() => {
    const controller = managerRef.current.create(keyRef.current)
    return controller.signal
  }, [])

  const abort = useCallback(() => {
    managerRef.current.abort(keyRef.current)
  }, [])

  return { getSignal, abort }
}

/**
 * Event listener cleanup hook
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: Window | HTMLElement | null = window,
  options?: boolean | AddEventListenerOptions
) {
  const savedHandler = useRef(handler)

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    if (!element?.addEventListener) return

    const eventListener = (event: Event) => savedHandler.current(event as WindowEventMap[K])
    element.addEventListener(eventName, eventListener, options)

    return () => {
      element.removeEventListener(eventName, eventListener, options)
    }
  }, [eventName, element, options])
}

/**
 * Intersection Observer with cleanup
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        setEntry(entry)
      },
      options
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref, options?.root, options?.rootMargin, options?.threshold])

  return { isIntersecting, entry }
}

/**
 * Debounced callback with cleanup
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delay)
  }, [delay]) as T
}

/**
 * WeakMap-based cache for object references
 */
export class WeakCache<K extends object, V> {
  private cache = new WeakMap<K, V>()

  set(key: K, value: V) {
    this.cache.set(key, value)
  }

  get(key: K): V | undefined {
    return this.cache.get(key)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }
}

/**
 * Resource pool for reusable objects
 */
export class ResourcePool<T> {
  private pool: T[] = []
  private factory: () => T
  private reset: (item: T) => void
  private maxSize: number

  constructor(
    factory: () => T,
    reset: (item: T) => void,
    maxSize: number = 10
  ) {
    this.factory = factory
    this.reset = reset
    this.maxSize = maxSize
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.factory()
  }

  release(item: T) {
    if (this.pool.length < this.maxSize) {
      this.reset(item)
      this.pool.push(item)
    }
  }

  clear() {
    this.pool = []
  }
}

/**
 * Memory usage monitor
 */
export class MemoryMonitor {
  private checkInterval: number = 60000 // 1 minute
  private threshold: number = 100 * 1024 * 1024 // 100MB
  private intervalId?: NodeJS.Timeout

  start(onHighMemory?: (usage: number) => void) {
    if (typeof window === 'undefined' || !('performance' in window)) return

    this.intervalId = setInterval(() => {
      // @ts-ignore - memory is not in TypeScript types yet
      const memory = performance.memory
      if (memory) {
        const usage = memory.usedJSHeapSize
        if (usage > this.threshold && onHighMemory) {
          onHighMemory(usage)
        }
      }
    }, this.checkInterval)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
  }

  getMemoryInfo() {
    if (typeof window === 'undefined' || !('performance' in window)) return null

    // @ts-ignore
    const memory = performance.memory
    if (!memory) return null

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    }
  }
}

/**
 * Lazy initialization for expensive objects
 */
export class LazyInit<T> {
  private value?: T
  private initializer: () => T

  constructor(initializer: () => T) {
    this.initializer = initializer
  }

  get(): T {
    if (!this.value) {
      this.value = this.initializer()
    }
    return this.value
  }

  reset() {
    this.value = undefined
  }
}

/**
 * Dispose pattern implementation
 */
export interface IDisposable {
  dispose(): void
}

export class DisposableStore implements IDisposable {
  private disposables: Set<IDisposable> = new Set()

  add<T extends IDisposable>(disposable: T): T {
    this.disposables.add(disposable)
    return disposable
  }

  dispose() {
    this.disposables.forEach(d => d.dispose())
    this.disposables.clear()
  }
}

/**
 * Hook for disposable resources
 */
export function useDisposable() {
  const storeRef = useRef(new DisposableStore())

  useEffect(() => {
    return () => {
      storeRef.current.dispose()
    }
  }, [])

  return storeRef.current
}