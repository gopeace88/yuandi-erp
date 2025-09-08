'use client'

import { useState, useEffect } from 'react'
import { Locale, LOCALE_STORAGE_KEY, defaultLocale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'
import { SalesChartWrapper } from '@/app/components/dashboard/sales-chart-wrapper'
import { OrderStatusChartWrapper } from '@/app/components/dashboard/order-status-chart-wrapper'
import { RecentOrdersTable } from '@/app/components/dashboard/recent-orders-table'
import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  totalProducts: number
  inventoryValue: number
  lowStock: number
  outOfStock: number
}

interface SalesData {
  date: string
  amount: number
}

interface OrderStatusData {
  status: string
  label: string
  count: number
}

export function DashboardContent() {
  const [locale, setLocale] = useState<Locale>(defaultLocale)
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    inventoryValue: 0,
    lowStock: 0,
    outOfStock: 0
  })
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusData[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
      }
    }
  }, [])

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      const handleLocaleChange = (e: CustomEvent) => {
        setLocale(e.detail.locale)
      }
      window.addEventListener('localeChange' as any, handleLocaleChange)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('localeChange' as any, handleLocaleChange)
      }
    }
  }, [])

  const t = (key: string) => translate(locale, key)

  // 대시보드 데이터 불러오기
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      // 1. 제품 통계 조회
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, price_krw, low_stock_threshold')
        .eq('is_active', true)
      
      if (!productsError && products) {
        // inventory 테이블에서 재고 정보 조회
        const { data: inventory } = await supabase
          .from('inventory')
          .select('product_id, on_hand')
        
        const inventoryMap = new Map(
          inventory?.map(item => [item.product_id, item.on_hand]) || []
        )
        
        let totalValue = 0
        let lowStockCount = 0
        let outOfStockCount = 0
        
        products.forEach(product => {
          const stock = inventoryMap.get(product.id) || 0
          totalValue += (product.price_krw || 0) * stock
          
          if (stock === 0) {
            outOfStockCount++
          } else if (stock < (product.low_stock_threshold || 5)) {
            lowStockCount++
          }
        })
        
        setStats({
          totalProducts: products.length,
          inventoryValue: totalValue,
          lowStock: lowStockCount,
          outOfStock: outOfStockCount
        })
      }
      
      // 2. 최근 7일 매출 데이터 조회
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('created_at, total_krw, status')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })
      
      if (!ordersError && orders) {
        // 날짜별 매출 집계
        const salesByDate = new Map<string, number>()
        const statusCounts = new Map<string, number>()
        
        orders.forEach(order => {
          const date = new Date(order.created_at).toISOString().split('T')[0]
          salesByDate.set(date, (salesByDate.get(date) || 0) + (order.total_krw || 0))
          
          statusCounts.set(order.status, (statusCounts.get(order.status) || 0) + 1)
        })
        
        // 매출 차트 데이터
        const salesArray = Array.from(salesByDate.entries()).map(([date, amount]) => ({
          date,
          amount
        }))
        setSalesData(salesArray)
        
        // 주문 상태 차트 데이터
        const statusArray = [
          { status: 'paid', label: t('orders.status.paid'), count: statusCounts.get('paid') || 0 },
          { status: 'shipped', label: t('orders.status.shipped'), count: statusCounts.get('shipped') || 0 },
          { status: 'done', label: t('orders.status.done'), count: statusCounts.get('done') || 0 },
          { status: 'refunded', label: t('orders.status.refunded'), count: statusCounts.get('refunded') || 0 },
        ]
        setOrderStatusData(statusArray)
      }
      
      // 3. 최근 주문 조회
      const { data: recentOrdersData, error: recentOrdersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          total_krw,
          status,
          created_at,
          order_items (
            id,
            quantity,
            unit_price_krw,
            product_id,
            products (
              name
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (!recentOrdersError && recentOrdersData) {
        // 데이터 형식 변환
        const formattedOrders = recentOrdersData.map(order => ({
          id: order.id,
          order_no: order.order_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          total_amount: order.total_krw || 0,
          status: order.status,
          created_at: order.created_at,
          order_items: order.order_items?.map((item: any) => ({
            id: item.id,
            product_name: item.products?.name || 'Unknown Product',
            quantity: item.quantity,
            unit_price: item.unit_price_krw
          })) || []
        }))
        setRecentOrders(formattedOrders)
      }
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchDashboardData()
  }, [])

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `₩${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `₩${(value / 1000).toFixed(0)}K`
    }
    return `₩${value.toFixed(0)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">데이터를 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8">{t('dashboard.title')}</h1>
      
      {/* 통계 정보 */}
      <div className="bg-white px-4 py-2 rounded-lg shadow mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-700">
          <span>
            <span className="text-gray-500">{t('dashboard.totalProducts')}:</span>
            <span className="ml-2 font-medium">{stats.totalProducts}개</span>
          </span>
          <span>
            <span className="text-gray-500">{t('dashboard.inventoryValue')}:</span>
            <span className="ml-2 font-medium">{formatCurrency(stats.inventoryValue)}</span>
          </span>
          <span>
            <span className="text-gray-500">{t('dashboard.lowStock')}:</span>
            <span className="ml-2 font-medium text-yellow-600">{stats.lowStock}개</span>
          </span>
          <span>
            <span className="text-gray-500">{t('dashboard.outOfStock')}:</span>
            <span className="ml-2 font-medium text-red-600">{stats.outOfStock}개</span>
          </span>
        </div>
      </div>
      
      {/* 차트 영역 - 모바일에서 세로 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <div className="chart bg-white rounded-lg shadow p-3 sm:p-4">
          <h2 className="text-base sm:text-lg font-semibold mb-2">{t('dashboard.salesTrend')}</h2>
          <SalesChartWrapper data={salesData.length > 0 ? salesData : [
            { date: new Date().toISOString().split('T')[0], amount: 0 }
          ]} />
        </div>
        <div className="chart bg-white rounded-lg shadow p-3 sm:p-4">
          <h2 className="text-base sm:text-lg font-semibold mb-2">{t('dashboard.orderStatus')}</h2>
          <OrderStatusChartWrapper data={orderStatusData} />
        </div>
      </div>
      
      {/* 최근 주문 테이블 */}
      <RecentOrdersTable 
        orders={recentOrders} 
        onRefresh={fetchDashboardData}
      />
    </div>
  )
}