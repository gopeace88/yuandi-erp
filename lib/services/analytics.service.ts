import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// Analytics 관련 타입 정의
export interface SalesAnalytics {
  period: string
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  growthRate: number
  topProducts: ProductAnalytics[]
  topCustomers: CustomerAnalytics[]
  salesByCategory: CategorySales[]
  salesTrend: TrendData[]
}

export interface ProductAnalytics {
  productId: string
  productName: string
  sku: string
  totalSold: number
  totalRevenue: number
  averagePrice: number
  profitMargin: number
  turnoverRate: number
}

export interface CustomerAnalytics {
  customerId: string
  customerName: string
  totalOrders: number
  totalSpent: number
  averageOrderValue: number
  lastOrderDate: Date
  customerLifetimeValue: number
  segment: 'VIP' | 'Regular' | 'New' | 'Churned'
}

export interface CategorySales {
  category: string
  totalRevenue: number
  totalQuantity: number
  productCount: number
  growthRate: number
}

export interface TrendData {
  date: string
  revenue: number
  orders: number
  units: number
  customers: number
}

export interface InventoryAnalytics {
  totalProducts: number
  totalValue: number
  averageStockLevel: number
  stockTurnoverRate: number
  lowStockProducts: number
  outOfStockProducts: number
  fastMovingProducts: ProductAnalytics[]
  slowMovingProducts: ProductAnalytics[]
  abcAnalysis: ABCAnalysis
  stockAging: StockAging[]
}

export interface ABCAnalysis {
  categoryA: ProductAnalytics[] // 80% of revenue
  categoryB: ProductAnalytics[] // 15% of revenue
  categoryC: ProductAnalytics[] // 5% of revenue
}

export interface StockAging {
  productId: string
  productName: string
  sku: string
  daysInStock: number
  quantity: number
  value: number
  category: 'Fresh' | 'Good' | 'Slow' | 'Dead'
}

export interface PerformanceMetrics {
  orderProcessingTime: {
    average: number
    p50: number
    p95: number
    p99: number
  }
  fulfillmentRate: number
  returnRate: number
  customerSatisfactionScore: number
  inventoryAccuracy: number
  stockoutRate: number
}

export class AnalyticsService {
  private supabase: SupabaseClient

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * 매출 분석 데이터 조회
   */
  async getSalesAnalytics(startDate: Date, endDate: Date): Promise<SalesAnalytics> {
    const { data: salesData, error: salesError } = await this.supabase
      .rpc('get_sales_analytics', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

    if (salesError) {
      throw new Error(`매출 분석 조회 실패: ${salesError.message}`)
    }

    // 상품별 분석
    const topProducts = await this.getTopProducts(startDate, endDate, 10)
    
    // 고객별 분석
    const topCustomers = await this.getTopCustomers(startDate, endDate, 10)
    
    // 카테고리별 분석
    const salesByCategory = await this.getSalesByCategory(startDate, endDate)
    
    // 트렌드 분석
    const salesTrend = await this.getSalesTrend(startDate, endDate)

    // 성장률 계산
    const previousPeriod = this.getPreviousPeriod(startDate, endDate)
    const previousSales = await this.getTotalRevenue(previousPeriod.start, previousPeriod.end)
    const growthRate = previousSales > 0 ? 
      ((salesData.total_revenue - previousSales) / previousSales) * 100 : 0

    return {
      period: `${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`,
      totalRevenue: salesData.total_revenue,
      totalOrders: salesData.total_orders,
      averageOrderValue: salesData.average_order_value,
      growthRate,
      topProducts,
      topCustomers,
      salesByCategory,
      salesTrend
    }
  }

  /**
   * 재고 분석 데이터 조회
   */
  async getInventoryAnalytics(): Promise<InventoryAnalytics> {
    // 기본 재고 통계
    const { data: basicStats, error: statsError } = await this.supabase
      .rpc('get_inventory_statistics')

    if (statsError) {
      throw new Error(`재고 통계 조회 실패: ${statsError.message}`)
    }

    // ABC 분석
    const abcAnalysis = await this.performABCAnalysis()
    
    // 빠른/느린 이동 상품
    const fastMovingProducts = await this.getFastMovingProducts(10)
    const slowMovingProducts = await this.getSlowMovingProducts(10)
    
    // 재고 노화 분석
    const stockAging = await this.getStockAging()

    return {
      totalProducts: basicStats.total_products,
      totalValue: basicStats.total_value,
      averageStockLevel: basicStats.average_stock_level,
      stockTurnoverRate: basicStats.turnover_rate,
      lowStockProducts: basicStats.low_stock_products,
      outOfStockProducts: basicStats.out_of_stock_products,
      fastMovingProducts,
      slowMovingProducts,
      abcAnalysis,
      stockAging
    }
  }

  /**
   * 성과 지표 조회
   */
  async getPerformanceMetrics(startDate: Date, endDate: Date): Promise<PerformanceMetrics> {
    const { data: metrics, error } = await this.supabase
      .rpc('get_performance_metrics', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

    if (error) {
      throw new Error(`성과 지표 조회 실패: ${error.message}`)
    }

    return {
      orderProcessingTime: {
        average: metrics.avg_processing_time,
        p50: metrics.p50_processing_time,
        p95: metrics.p95_processing_time,
        p99: metrics.p99_processing_time
      },
      fulfillmentRate: metrics.fulfillment_rate,
      returnRate: metrics.return_rate,
      customerSatisfactionScore: metrics.customer_satisfaction_score,
      inventoryAccuracy: metrics.inventory_accuracy,
      stockoutRate: metrics.stockout_rate
    }
  }

  /**
   * 고객 세분화 분석
   */
  async getCustomerSegmentation(): Promise<{
    vip: CustomerAnalytics[]
    regular: CustomerAnalytics[]
    new: CustomerAnalytics[]
    churned: CustomerAnalytics[]
  }> {
    const { data, error } = await this.supabase
      .rpc('get_customer_segmentation')

    if (error) {
      throw new Error(`고객 세분화 분석 실패: ${error.message}`)
    }

    return {
      vip: data.filter((c: any) => c.segment === 'VIP'),
      regular: data.filter((c: any) => c.segment === 'Regular'),
      new: data.filter((c: any) => c.segment === 'New'),
      churned: data.filter((c: any) => c.segment === 'Churned')
    }
  }

  /**
   * 예측 분석
   */
  async getForecastData(type: 'sales' | 'demand' | 'inventory', days: number): Promise<{
    historical: TrendData[]
    forecast: TrendData[]
    confidence: number
  }> {
    const { data, error } = await this.supabase
      .rpc('get_forecast_data', {
        p_type: type,
        p_days: days
      })

    if (error) {
      throw new Error(`예측 분석 실패: ${error.message}`)
    }

    // 간단한 선형 회귀 예측 (실제로는 더 정교한 ML 모델 사용)
    const forecast = this.generateSimpleForecast(data.historical, days)

    return {
      historical: data.historical,
      forecast: forecast.data,
      confidence: forecast.confidence
    }
  }

  /**
   * 대시보드 요약 데이터
   */
  async getDashboardSummary(period: 'today' | 'week' | 'month' | 'year' = 'month'): Promise<{
    sales: {
      current: number
      previous: number
      growth: number
    }
    orders: {
      current: number
      previous: number
      growth: number
    }
    customers: {
      current: number
      previous: number
      growth: number
    }
    inventory: {
      totalValue: number
      lowStock: number
      outOfStock: number
    }
    alerts: Array<{
      type: 'warning' | 'error' | 'info'
      message: string
      count: number
    }>
  }> {
    const dates = this.getPeriodDates(period)
    const previousDates = this.getPreviousPeriod(dates.start, dates.end)

    // 병렬로 데이터 조회
    const [currentSales, previousSales, currentOrders, previousOrders, 
           currentCustomers, previousCustomers, inventoryStats, alerts] = await Promise.all([
      this.getTotalRevenue(dates.start, dates.end),
      this.getTotalRevenue(previousDates.start, previousDates.end),
      this.getTotalOrders(dates.start, dates.end),
      this.getTotalOrders(previousDates.start, previousDates.end),
      this.getNewCustomers(dates.start, dates.end),
      this.getNewCustomers(previousDates.start, previousDates.end),
      this.getInventoryStats(),
      this.getSystemAlerts()
    ])

    return {
      sales: {
        current: currentSales,
        previous: previousSales,
        growth: this.calculateGrowthRate(currentSales, previousSales)
      },
      orders: {
        current: currentOrders,
        previous: previousOrders,
        growth: this.calculateGrowthRate(currentOrders, previousOrders)
      },
      customers: {
        current: currentCustomers,
        previous: previousCustomers,
        growth: this.calculateGrowthRate(currentCustomers, previousCustomers)
      },
      inventory: {
        totalValue: inventoryStats.total_value,
        lowStock: inventoryStats.low_stock_count,
        outOfStock: inventoryStats.out_of_stock_count
      },
      alerts
    }
  }

  /**
   * 커스텀 리포트 생성
   */
  async generateCustomReport(config: {
    name: string
    type: 'sales' | 'inventory' | 'customers' | 'performance'
    dateRange: { start: Date; end: Date }
    filters: Record<string, any>
    groupBy: string[]
    metrics: string[]
  }): Promise<{
    reportId: string
    data: any[]
    summary: any
    generatedAt: Date
  }> {
    const reportId = `report_${Date.now()}`
    
    // SQL 쿼리 동적 생성
    const query = this.buildCustomQuery(config)
    
    const { data, error } = await this.supabase
      .rpc('execute_custom_report', {
        p_query: query,
        p_params: config.filters
      })

    if (error) {
      throw new Error(`커스텀 리포트 생성 실패: ${error.message}`)
    }

    // 리포트 저장
    await this.saveReport({
      id: reportId,
      name: config.name,
      config,
      data,
      generatedAt: new Date()
    })

    return {
      reportId,
      data: data.rows,
      summary: data.summary,
      generatedAt: new Date()
    }
  }

  // Private helper methods

  private async getTopProducts(startDate: Date, endDate: Date, limit: number): Promise<ProductAnalytics[]> {
    const { data, error } = await this.supabase
      .rpc('get_top_products', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_limit: limit
      })

    if (error) throw error
    return data || []
  }

  private async getTopCustomers(startDate: Date, endDate: Date, limit: number): Promise<CustomerAnalytics[]> {
    const { data, error } = await this.supabase
      .rpc('get_top_customers', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_limit: limit
      })

    if (error) throw error
    return data || []
  }

  private async getSalesByCategory(startDate: Date, endDate: Date): Promise<CategorySales[]> {
    const { data, error } = await this.supabase
      .rpc('get_sales_by_category', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

    if (error) throw error
    return data || []
  }

  private async getSalesTrend(startDate: Date, endDate: Date): Promise<TrendData[]> {
    const { data, error } = await this.supabase
      .rpc('get_sales_trend', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

    if (error) throw error
    return data || []
  }

  private async performABCAnalysis(): Promise<ABCAnalysis> {
    const { data, error } = await this.supabase
      .rpc('perform_abc_analysis')

    if (error) throw error

    const totalRevenue = data.reduce((sum: number, item: any) => sum + item.revenue, 0)
    let cumulativeRevenue = 0

    const categoryA: ProductAnalytics[] = []
    const categoryB: ProductAnalytics[] = []
    const categoryC: ProductAnalytics[] = []

    data.forEach((item: any) => {
      cumulativeRevenue += item.revenue
      const percentage = (cumulativeRevenue / totalRevenue) * 100

      if (percentage <= 80) {
        categoryA.push(item)
      } else if (percentage <= 95) {
        categoryB.push(item)
      } else {
        categoryC.push(item)
      }
    })

    return { categoryA, categoryB, categoryC }
  }

  private async getFastMovingProducts(limit: number): Promise<ProductAnalytics[]> {
    const { data, error } = await this.supabase
      .rpc('get_fast_moving_products', { p_limit: limit })

    if (error) throw error
    return data || []
  }

  private async getSlowMovingProducts(limit: number): Promise<ProductAnalytics[]> {
    const { data, error } = await this.supabase
      .rpc('get_slow_moving_products', { p_limit: limit })

    if (error) throw error
    return data || []
  }

  private async getStockAging(): Promise<StockAging[]> {
    const { data, error } = await this.supabase
      .rpc('get_stock_aging')

    if (error) throw error
    return data || []
  }

  private async getTotalRevenue(startDate: Date, endDate: Date): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('get_total_revenue', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

    if (error) throw error
    return data || 0
  }

  private async getTotalOrders(startDate: Date, endDate: Date): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('get_total_orders', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

    if (error) throw error
    return data || 0
  }

  private async getNewCustomers(startDate: Date, endDate: Date): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('get_new_customers', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

    if (error) throw error
    return data || 0
  }

  private async getInventoryStats(): Promise<any> {
    const { data, error } = await this.supabase
      .rpc('get_inventory_stats')

    if (error) throw error
    return data || {}
  }

  private async getSystemAlerts(): Promise<Array<{
    type: 'warning' | 'error' | 'info'
    message: string
    count: number
  }>> {
    const alerts: Array<{ type: 'warning' | 'error' | 'info', message: string, count: number }> = []

    // 저재고 알림
    const lowStockCount = await this.getLowStockCount()
    if (lowStockCount > 0) {
      alerts.push({
        type: 'warning',
        message: '재고 부족 상품',
        count: lowStockCount
      })
    }

    // 대기 중인 주문
    const pendingOrders = await this.getPendingOrdersCount()
    if (pendingOrders > 0) {
      alerts.push({
        type: 'info',
        message: '처리 대기 주문',
        count: pendingOrders
      })
    }

    return alerts
  }

  private async getLowStockCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lte('on_hand', 'low_stock_threshold')
      .eq('is_active', true)

    if (error) throw error
    return count || 0
  }

  private async getPendingOrdersCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING')

    if (error) throw error
    return count || 0
  }

  private getPreviousPeriod(startDate: Date, endDate: Date): { start: Date; end: Date } {
    const duration = endDate.getTime() - startDate.getTime()
    return {
      start: new Date(startDate.getTime() - duration),
      end: new Date(endDate.getTime() - duration)
    }
  }

  private getPeriodDates(period: string): { start: Date; end: Date } {
    const now = new Date()
    const start = new Date()
    
    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        break
      case 'week':
        start.setDate(now.getDate() - 7)
        break
      case 'month':
        start.setMonth(now.getMonth() - 1)
        break
      case 'year':
        start.setFullYear(now.getFullYear() - 1)
        break
      default:
        start.setMonth(now.getMonth() - 1)
    }

    return { start, end: now }
  }

  private calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  private generateSimpleForecast(historical: TrendData[], days: number): {
    data: TrendData[]
    confidence: number
  } {
    // 간단한 선형 회귀 예측 (실제로는 더 정교한 ML 모델 사용)
    if (historical.length < 2) {
      return { data: [], confidence: 0 }
    }

    const lastValues = historical.slice(-7) // 최근 7일 사용
    const avgGrowth = this.calculateAverageGrowth(lastValues)
    const forecast: TrendData[] = []

    for (let i = 1; i <= days; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      
      const lastRevenue = historical[historical.length - 1].revenue
      const projectedRevenue = lastRevenue * (1 + avgGrowth) ** i

      forecast.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.max(0, projectedRevenue),
        orders: Math.round(projectedRevenue / 150000), // 평균 주문 금액 가정
        units: Math.round(projectedRevenue / 50000), // 평균 단가 가정
        customers: Math.round(projectedRevenue / 200000) // 고객당 평균 구매 가정
      })
    }

    const confidence = Math.max(0.3, Math.min(0.9, 0.8 - (days / 100)))

    return { data: forecast, confidence }
  }

  private calculateAverageGrowth(data: TrendData[]): number {
    if (data.length < 2) return 0

    let totalGrowth = 0
    let growthCount = 0

    for (let i = 1; i < data.length; i++) {
      const current = data[i].revenue
      const previous = data[i - 1].revenue
      
      if (previous > 0) {
        totalGrowth += (current - previous) / previous
        growthCount++
      }
    }

    return growthCount > 0 ? totalGrowth / growthCount : 0
  }

  private buildCustomQuery(config: any): string {
    // SQL 쿼리 동적 생성 로직
    // 실제 구현에서는 SQL 인젝션 방지를 위한 안전한 쿼리 빌더 사용
    return 'SELECT * FROM custom_report_view'
  }

  private async saveReport(report: any): Promise<void> {
    const { error } = await this.supabase
      .from('custom_reports')
      .insert({
        id: report.id,
        name: report.name,
        config: report.config,
        generated_at: report.generatedAt.toISOString()
      })

    if (error) {
      console.error('리포트 저장 실패:', error)
    }
  }
}