/**
 * Reusable query builders for common database operations
 * 
 * Provides consistent query patterns and filters
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface QueryFilter {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'contains' | 'containedBy' | 'is' | 'or'
  value: any
}

export interface QueryOptions {
  select?: string
  filters?: QueryFilter[]
  search?: {
    query: string
    fields: string[]
  }
  pagination?: {
    page: number
    limit: number
  }
  orderBy?: {
    field: string
    ascending?: boolean
  }
  count?: boolean
}

/**
 * Base query builder class
 */
export class QueryBuilder {
  private query: any
  
  constructor(
    private supabase: SupabaseClient,
    private table: string
  ) {
    this.query = this.supabase.from(table)
  }

  /**
   * Apply select clause
   */
  select(columns: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated' }) {
    this.query = this.query.select(columns, options)
    return this
  }

  /**
   * Apply filters
   */
  filter(filters: QueryFilter[]) {
    filters.forEach(filter => {
      switch (filter.operator) {
        case 'or':
          this.query = this.query.or(filter.value)
          break
        case 'like':
        case 'ilike':
          this.query = this.query[filter.operator](filter.field, filter.value)
          break
        default:
          this.query = this.query[filter.operator](filter.field, filter.value)
      }
    })
    return this
  }

  /**
   * Apply search across multiple fields
   */
  search(query: string, fields: string[]) {
    if (query && fields.length > 0) {
      const searchConditions = fields
        .map(field => `${field}.ilike.%${query}%`)
        .join(',')
      this.query = this.query.or(searchConditions)
    }
    return this
  }

  /**
   * Apply pagination
   */
  paginate(page: number = 1, limit: number = 20) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    this.query = this.query.range(from, to)
    return this
  }

  /**
   * Apply ordering
   */
  orderBy(field: string, ascending: boolean = false) {
    this.query = this.query.order(field, { ascending })
    return this
  }

  /**
   * Execute query
   */
  async execute() {
    const { data, error, count } = await this.query
    
    if (error) {
      throw new Error(error.message)
    }
    
    return { data, count }
  }

  /**
   * Get the raw query (for advanced operations)
   */
  getQuery() {
    return this.query
  }
}

/**
 * Product-specific query builder
 */
export class ProductQueryBuilder extends QueryBuilder {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'products')
  }

  /**
   * Filter by low stock
   */
  lowStock(threshold?: number) {
    if (threshold) {
      this.getQuery().lte('on_hand', threshold)
    } else {
      // Use the product's own low_stock_threshold
      this.getQuery().filter('on_hand', 'lte', this.getQuery().raw('low_stock_threshold'))
    }
    return this
  }

  /**
   * Filter by active status
   */
  active(isActive: boolean = true) {
    this.getQuery().eq('active', isActive)
    return this
  }

  /**
   * Filter by category
   */
  category(category: string) {
    this.getQuery().eq('category', category)
    return this
  }

  /**
   * Include inventory movements
   */
  withInventoryMovements(limit?: number) {
    let inventorySelect = 'inventory_movements(*)'
    if (limit) {
      inventorySelect = `inventory_movements(*)${limit ? `.limit(${limit})` : ''}`
    }
    
    const currentSelect = this.getQuery()._select || '*'
    this.select(`${currentSelect}, ${inventorySelect}`)
    return this
  }
}

/**
 * Order-specific query builder
 */
export class OrderQueryBuilder extends QueryBuilder {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'orders')
  }

  /**
   * Filter by status
   */
  status(status: string | string[]) {
    if (Array.isArray(status)) {
      this.getQuery().in('status', status)
    } else {
      this.getQuery().eq('status', status)
    }
    return this
  }

  /**
   * Filter by date range
   */
  dateRange(startDate?: string, endDate?: string) {
    if (startDate) {
      this.getQuery().gte('created_at', startDate)
    }
    if (endDate) {
      this.getQuery().lte('created_at', endDate)
    }
    return this
  }

  /**
   * Filter by customer
   */
  customer(customerId?: string, customerName?: string, customerPhone?: string) {
    if (customerId) {
      this.getQuery().eq('customer_id', customerId)
    }
    if (customerName) {
      this.getQuery().ilike('customer_name', `%${customerName}%`)
    }
    if (customerPhone) {
      this.getQuery().ilike('customer_phone', `%${customerPhone}%`)
    }
    return this
  }

  /**
   * Include related data
   */
  withRelations(includeItems = true, includeShipments = true) {
    let relations = []
    
    if (includeItems) {
      relations.push(`order_items (
        id,
        product_id,
        sku,
        product_name,
        quantity,
        unit_price,
        subtotal
      )`)
    }
    
    if (includeShipments) {
      relations.push(`shipments (
        id,
        courier,
        tracking_no,
        shipped_at,
        delivered_at
      )`)
    }
    
    if (relations.length > 0) {
      const currentSelect = this.getQuery()._select || '*'
      this.select(`${currentSelect}, ${relations.join(', ')}`)
    }
    
    return this
  }
}

/**
 * Analytics query builder
 */
export class AnalyticsQueryBuilder {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get sales summary for a date range
   */
  async getSalesSummary(startDate: string, endDate?: string) {
    let query = this.supabase
      .from('orders')
      .select('total_amount, created_at', { count: 'exact' })
      .eq('status', 'delivered')
      .gte('created_at', startDate)

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error, count } = await query

    if (error) throw error

    const totalSales = data?.reduce((sum, order) => sum + order.total_amount, 0) || 0
    
    return {
      totalSales,
      orderCount: count || 0,
      averageOrderValue: count ? totalSales / count : 0
    }
  }

  /**
   * Get popular products
   */
  async getPopularProducts(limit: number = 5, days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await this.supabase
      .rpc('get_popular_products', {
        start_date: startDate.toISOString(),
        limit_count: limit
      })

    if (error) throw error
    return data
  }

  /**
   * Get inventory value
   */
  async getInventoryValue() {
    const { data, error } = await this.supabase
      .from('products')
      .select('on_hand, cost_cny')
      .eq('active', true)

    if (error) throw error

    return data?.reduce((sum, product) => 
      sum + (product.on_hand * product.cost_cny), 0
    ) || 0
  }

  /**
   * Get order status distribution
   */
  async getOrderStatusDistribution() {
    const { data, error } = await this.supabase
      .rpc('get_order_status_distribution')

    if (error) throw error
    return data
  }
}

/**
 * Transaction query builder for complex operations
 */
export class TransactionBuilder {
  private operations: Array<() => Promise<any>> = []
  
  constructor(private supabase: SupabaseClient) {}

  /**
   * Add an insert operation
   */
  insert(table: string, data: any) {
    this.operations.push(async () => {
      const { data: result, error } = await this.supabase
        .from(table)
        .insert(data)
        .select()
        .single()
      
      if (error) throw error
      return result
    })
    return this
  }

  /**
   * Add an update operation
   */
  update(table: string, id: string, data: any) {
    this.operations.push(async () => {
      const { data: result, error } = await this.supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return result
    })
    return this
  }

  /**
   * Add a delete operation
   */
  delete(table: string, id: string) {
    this.operations.push(async () => {
      const { error } = await this.supabase
        .from(table)
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return { deleted: true, id }
    })
    return this
  }

  /**
   * Execute all operations
   * Note: This is not a true transaction in Supabase
   * Consider using database functions for true transactions
   */
  async execute() {
    const results = []
    
    try {
      for (const operation of this.operations) {
        const result = await operation()
        results.push(result)
      }
      return { success: true, results }
    } catch (error) {
      // Rollback would go here if Supabase supported it
      throw error
    }
  }
}

/**
 * Helper function to create query builders
 */
export function createQueryBuilder(supabase: SupabaseClient, table: string) {
  switch (table) {
    case 'products':
      return new ProductQueryBuilder(supabase)
    case 'orders':
      return new OrderQueryBuilder(supabase)
    default:
      return new QueryBuilder(supabase, table)
  }
}

export function createAnalyticsBuilder(supabase: SupabaseClient) {
  return new AnalyticsQueryBuilder(supabase)
}

export function createTransactionBuilder(supabase: SupabaseClient) {
  return new TransactionBuilder(supabase)
}