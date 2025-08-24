import { unstable_cache } from 'next/cache'
import { cache } from 'react'

/**
 * In-memory cache for client-side data
 */
class MemoryCache {
  private cache: Map<string, { data: any; timestamp: number }>
  private ttl: number

  constructor(ttl: number = 5 * 60 * 1000) { // Default 5 minutes
    this.cache = new Map()
    this.ttl = ttl
  }

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  get(key: string) {
    const item = this.cache.get(key)
    if (!item) return null

    const isExpired = Date.now() - item.timestamp > this.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  clear() {
    this.cache.clear()
  }

  delete(key: string) {
    this.cache.delete(key)
  }
}

// Global cache instances
export const apiCache = new MemoryCache(5 * 60 * 1000) // 5 minutes
export const userCache = new MemoryCache(10 * 60 * 1000) // 10 minutes
export const productCache = new MemoryCache(30 * 60 * 1000) // 30 minutes

/**
 * Cache key generator for consistent caching
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('-')
  return `${prefix}-${sortedParams}`
}

/**
 * API response cache wrapper
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number
    revalidate?: boolean
    cache?: MemoryCache
  }
): Promise<T> {
  const cacheInstance = options?.cache || apiCache
  
  // Check if we should revalidate
  if (!options?.revalidate) {
    const cached = cacheInstance.get(key)
    if (cached) {
      return cached as T
    }
  }

  // Fetch fresh data
  const data = await fetcher()
  cacheInstance.set(key, data)
  
  return data
}

/**
 * React Server Component cache
 * Caches data fetching functions across requests
 */
export const getCachedProducts = unstable_cache(
  async (category?: string) => {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()
    
    let query = supabase.from('products').select('*')
    
    if (category) {
      query = query.eq('category', category)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data
  },
  ['products'],
  {
    revalidate: 60, // Revalidate every 60 seconds
    tags: ['products'],
  }
)

export const getCachedOrders = unstable_cache(
  async (status?: string, limit: number = 10) => {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()
    
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data
  },
  ['orders'],
  {
    revalidate: 30, // Revalidate every 30 seconds
    tags: ['orders'],
  }
)

/**
 * React cache for request deduplication
 * Ensures same data isn't fetched multiple times in a single request
 */
export const getUser = cache(async (userId: string) => {
  const { createServerSupabaseClient } = await import('@/lib/supabase/server')
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
})

/**
 * SWR configuration for client-side caching
 */
export const swrConfig = {
  refreshInterval: 30000, // 30 seconds
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  keepPreviousData: true,
  fallback: {},
  
  // Global fetcher
  fetcher: async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) {
      const error = new Error('An error occurred while fetching the data.')
      throw error
    }
    return res.json()
  },
}

/**
 * Revalidation helper for ISR pages
 */
export async function revalidateCache(tags: string[]) {
  try {
    const response = await fetch('/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': process.env.NEXT_PUBLIC_REVALIDATE_SECRET || '',
      },
      body: JSON.stringify({ tags }),
    })
    
    return response.ok
  } catch (error) {
    console.error('Failed to revalidate cache:', error)
    return false
  }
}

/**
 * Cache headers for API routes
 */
export const cacheHeaders = {
  none: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  },
  short: {
    'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20',
  },
  medium: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
  },
  long: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
  },
  permanent: {
    'Cache-Control': 'public, max-age=31536000, immutable',
  },
}

/**
 * Session storage cache for temporary data
 */
export class SessionCache {
  private prefix: string

  constructor(prefix: string = 'yuandi') {
    this.prefix = prefix
  }

  set(key: string, value: any) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`${this.prefix}-${key}`, JSON.stringify(value))
    }
  }

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    
    const item = sessionStorage.getItem(`${this.prefix}-${key}`)
    if (!item) return null
    
    try {
      return JSON.parse(item) as T
    } catch {
      return null
    }
  }

  remove(key: string) {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`${this.prefix}-${key}`)
    }
  }

  clear() {
    if (typeof window !== 'undefined') {
      Object.keys(sessionStorage)
        .filter(key => key.startsWith(this.prefix))
        .forEach(key => sessionStorage.removeItem(key))
    }
  }
}

export const sessionCache = new SessionCache('yuandi')

/**
 * Local storage cache with expiration
 */
export class LocalCache {
  private prefix: string

  constructor(prefix: string = 'yuandi') {
    this.prefix = prefix
  }

  set(key: string, value: any, ttl?: number) {
    if (typeof window !== 'undefined') {
      const item = {
        value,
        expires: ttl ? Date.now() + ttl : null,
      }
      localStorage.setItem(`${this.prefix}-${key}`, JSON.stringify(item))
    }
  }

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    
    const itemStr = localStorage.getItem(`${this.prefix}-${key}`)
    if (!itemStr) return null
    
    try {
      const item = JSON.parse(itemStr)
      
      // Check expiration
      if (item.expires && Date.now() > item.expires) {
        localStorage.removeItem(`${this.prefix}-${key}`)
        return null
      }
      
      return item.value as T
    } catch {
      return null
    }
  }

  remove(key: string) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${this.prefix}-${key}`)
    }
  }

  clear() {
    if (typeof window !== 'undefined') {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .forEach(key => localStorage.removeItem(key))
    }
  }
}

export const localCache = new LocalCache('yuandi')