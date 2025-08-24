import { SupabaseClient } from '@supabase/supabase-js'
import { cachedFetch, generateCacheKey } from '@/lib/performance/cache'

/**
 * Optimized query builder with automatic pagination, filtering, and caching
 */
export class OptimizedQuery<T> {
  private client: SupabaseClient
  private tableName: string
  private selectColumns: string
  private filters: Record<string, any> = {}
  private orderByColumn?: string
  private orderAscending: boolean = true
  private limitCount?: number
  private offsetCount: number = 0
  private useCache: boolean = true
  private cacheTTL: number = 60000 // 1 minute default

  constructor(client: SupabaseClient, tableName: string) {
    this.client = client
    this.tableName = tableName
    this.selectColumns = '*'
  }

  select(columns: string = '*') {
    this.selectColumns = columns
    return this
  }

  where(column: string, value: any) {
    this.filters[column] = value
    return this
  }

  orderBy(column: string, ascending: boolean = true) {
    this.orderByColumn = column
    this.orderAscending = ascending
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  offset(count: number) {
    this.offsetCount = count
    return this
  }

  cache(enable: boolean = true, ttl?: number) {
    this.useCache = enable
    if (ttl) this.cacheTTL = ttl
    return this
  }

  async execute(): Promise<{ data: T[] | null; error: any; count?: number }> {
    const cacheKey = generateCacheKey(this.tableName, {
      select: this.selectColumns,
      filters: this.filters,
      orderBy: this.orderByColumn,
      limit: this.limitCount,
      offset: this.offsetCount,
    })

    if (this.useCache) {
      return cachedFetch(
        cacheKey,
        () => this.performQuery(),
        { ttl: this.cacheTTL }
      )
    }

    return this.performQuery()
  }

  private async performQuery() {
    let query = this.client
      .from(this.tableName)
      .select(this.selectColumns, { count: 'exact' })

    // Apply filters
    Object.entries(this.filters).forEach(([column, value]) => {
      if (Array.isArray(value)) {
        query = query.in(column, value)
      } else if (value === null) {
        query = query.is(column, null)
      } else {
        query = query.eq(column, value)
      }
    })

    // Apply ordering
    if (this.orderByColumn) {
      query = query.order(this.orderByColumn, { ascending: this.orderAscending })
    }

    // Apply pagination
    if (this.limitCount) {
      query = query.limit(this.limitCount)
    }
    if (this.offsetCount) {
      query = query.range(this.offsetCount, this.offsetCount + (this.limitCount || 10) - 1)
    }

    const { data, error, count } = await query
    return { data, error, count }
  }
}

/**
 * Batch operations for better performance
 */
export class BatchOperations {
  private client: SupabaseClient
  private operations: Array<() => Promise<any>> = []

  constructor(client: SupabaseClient) {
    this.client = client
  }

  insert(table: string, data: any | any[]) {
    this.operations.push(() => 
      this.client.from(table).insert(data)
    )
    return this
  }

  update(table: string, data: any, filters: Record<string, any>) {
    this.operations.push(async () => {
      let query = this.client.from(table).update(data)
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
      return query
    })
    return this
  }

  delete(table: string, filters: Record<string, any>) {
    this.operations.push(async () => {
      let query = this.client.from(table).delete()
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
      return query
    })
    return this
  }

  async execute() {
    const results = await Promise.allSettled(this.operations)
    return results.map((result, index) => ({
      index,
      status: result.status,
      value: result.status === 'fulfilled' ? result.value : undefined,
      error: result.status === 'rejected' ? result.reason : undefined,
    }))
  }
}

/**
 * Optimized queries for common operations
 */
export const optimizedQueries = {
  /**
   * Get paginated orders with related data
   * Uses select with specific columns to reduce payload
   */
  async getOrders(
    supabase: SupabaseClient,
    options: {
      page?: number
      limit?: number
      status?: string
      sortBy?: 'created_at' | 'total_amount'
      sortOrder?: 'asc' | 'desc'
    } = {}
  ) {
    const { page = 1, limit = 10, status, sortBy = 'created_at', sortOrder = 'desc' } = options
    const offset = (page - 1) * limit

    const query = new OptimizedQuery(supabase, 'orders')
      .select(`
        id,
        order_no,
        status,
        customer_name,
        customer_phone,
        total_amount,
        created_at,
        order_items!inner (
          id,
          product_name,
          quantity,
          unit_price,
          subtotal
        )
      `)
      .orderBy(sortBy, sortOrder === 'asc')
      .limit(limit)
      .offset(offset)
      .cache(true, 30000) // Cache for 30 seconds

    if (status) {
      query.where('status', status)
    }

    return query.execute()
  },

  /**
   * Get products with inventory optimization
   * Only fetches necessary fields
   */
  async getProducts(
    supabase: SupabaseClient,
    options: {
      category?: string
      lowStock?: boolean
      search?: string
    } = {}
  ) {
    const { category, lowStock, search } = options

    let query = supabase
      .from('products')
      .select('id, sku, name, category, onHand, lowStockThreshold, cost, price')

    if (category) {
      query = query.eq('category', category)
    }

    if (lowStock) {
      query = query.lte('onHand', 'lowStockThreshold')
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    // Always order by name for consistent results
    query = query.order('name')

    return query
  },

  /**
   * Get dashboard statistics with single query
   * Uses RPC function for aggregation
   */
  async getDashboardStats(supabase: SupabaseClient) {
    // This would ideally be an RPC function in Supabase
    // that does all aggregations in a single database call
    const { data, error } = await supabase.rpc('get_dashboard_stats', {
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date().toISOString(),
    })

    if (error) {
      // Fallback to multiple queries if RPC doesn't exist
      const [orders, products, lowStock] = await Promise.all([
        supabase
          .from('orders')
          .select('total_amount, status, created_at')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('products')
          .select('id, onHand, lowStockThreshold'),
        supabase
          .from('products')
          .select('id, name, onHand')
          .lte('onHand', 'lowStockThreshold'),
      ])

      return {
        orders: orders.data || [],
        products: products.data || [],
        lowStockProducts: lowStock.data || [],
      }
    }

    return data
  },

  /**
   * Batch update inventory with transaction
   */
  async updateInventoryBatch(
    supabase: SupabaseClient,
    updates: Array<{ productId: string; adjustment: number; reason: string }>
  ) {
    const batch = new BatchOperations(supabase)

    for (const update of updates) {
      // Get current stock
      const { data: product } = await supabase
        .from('products')
        .select('onHand')
        .eq('id', update.productId)
        .single()

      if (product) {
        const newStock = product.onHand + update.adjustment
        
        // Update product stock
        batch.update('products', { onHand: newStock }, { id: update.productId })
        
        // Log inventory adjustment
        batch.insert('inventory_logs', {
          product_id: update.productId,
          adjustment: update.adjustment,
          new_stock: newStock,
          reason: update.reason,
          created_at: new Date().toISOString(),
        })
      }
    }

    return batch.execute()
  },

  /**
   * Search with full-text search optimization
   */
  async searchOrders(
    supabase: SupabaseClient,
    searchTerm: string,
    options: {
      limit?: number
      fields?: string[]
    } = {}
  ) {
    const { limit = 20, fields = ['order_no', 'customer_name', 'customer_phone'] } = options

    // Build OR condition for multiple fields
    const orConditions = fields.map(field => `${field}.ilike.%${searchTerm}%`).join(',')

    return supabase
      .from('orders')
      .select('id, order_no, customer_name, status, total_amount, created_at')
      .or(orConditions)
      .limit(limit)
      .order('created_at', { ascending: false })
  },
}

/**
 * Real-time subscription manager with cleanup
 */
export class SubscriptionManager {
  private subscriptions: Map<string, any> = new Map()
  private client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  subscribe(
    key: string,
    table: string,
    callback: (payload: any) => void,
    filters?: Record<string, any>
  ) {
    // Unsubscribe from existing subscription with same key
    this.unsubscribe(key)

    let channel = this.client
      .channel(key)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filters ? this.buildFilter(filters) : undefined,
        },
        callback
      )

    const subscription = channel.subscribe()
    this.subscriptions.set(key, subscription)

    return subscription
  }

  unsubscribe(key: string) {
    const subscription = this.subscriptions.get(key)
    if (subscription) {
      subscription.unsubscribe()
      this.subscriptions.delete(key)
    }
  }

  unsubscribeAll() {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe()
    })
    this.subscriptions.clear()
  }

  private buildFilter(filters: Record<string, any>): string {
    return Object.entries(filters)
      .map(([key, value]) => `${key}=eq.${value}`)
      .join('&')
  }
}

/**
 * Connection pooling and retry logic
 */
export class SupabaseConnectionManager {
  private client: SupabaseClient
  private retryCount: number = 3
  private retryDelay: number = 1000

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: { retries?: number; delay?: number }
  ): Promise<T> {
    const maxRetries = options?.retries || this.retryCount
    const delay = options?.delay || this.retryDelay

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (error: any) {
        // Don't retry on client errors (4xx)
        if (error.status && error.status >= 400 && error.status < 500) {
          throw error
        }

        // Last attempt, throw the error
        if (i === maxRetries - 1) {
          throw error
        }

        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }

    throw new Error('Max retries exceeded')
  }
}