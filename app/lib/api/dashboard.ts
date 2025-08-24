import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'

export async function getDashboardData() {
  const session = await getServerSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  const supabase = await createServerSupabaseClient()
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const startOfDay = new Date(today.setHours(0, 0, 0, 0))
  const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0))
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  
  // 오늘 매출
  const { data: todaySalesData } = await supabase
    .from('orders')
    .select('total_amount')
    .gte('created_at', startOfDay.toISOString())
    .in('status', ['PAID', 'SHIPPED', 'DONE'])
  
  // 어제 매출
  const { data: yesterdaySalesData } = await supabase
    .from('orders')
    .select('total_amount')
    .gte('created_at', startOfYesterday.toISOString())
    .lt('created_at', startOfDay.toISOString())
    .in('status', ['PAID', 'SHIPPED', 'DONE'])
  
  // 신규 주문
  const { data: newOrdersData } = await supabase
    .from('orders')
    .select('id')
    .gte('created_at', startOfDay.toISOString())
  
  // 어제 주문
  const { data: yesterdayOrdersData } = await supabase
    .from('orders')
    .select('id')
    .gte('created_at', startOfYesterday.toISOString())
    .lt('created_at', startOfDay.toISOString())
  
  // 활성 상품 수
  const { data: productsData } = await supabase
    .from('products')
    .select('id')
    .eq('active', true)
  
  // 이번 달 고객 수
  const { data: customersData } = await supabase
    .from('orders')
    .select('customer_phone')
    .gte('created_at', startOfMonth.toISOString())
  
  // 매출 추이 (최근 7일)
  const salesTrend = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const start = new Date(date.setHours(0, 0, 0, 0))
    const end = new Date(date.setHours(23, 59, 59, 999))
    
    const { data } = await supabase
      .from('orders')
      .select('total_amount')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .in('status', ['PAID', 'SHIPPED', 'DONE'])
    
    salesTrend.push({
      date: start.toISOString().split('T')[0],
      sales: data?.reduce((sum, order) => sum + order.total_amount, 0) || 0
    })
  }
  
  // 주문 상태별 개수
  const { data: orderStatusData } = await supabase
    .from('orders')
    .select('status')
    .gte('created_at', startOfMonth.toISOString())
  
  const orderStatus = {
    paid: orderStatusData?.filter(o => o.status === 'PAID').length || 0,
    shipped: orderStatusData?.filter(o => o.status === 'SHIPPED').length || 0,
    done: orderStatusData?.filter(o => o.status === 'DONE').length || 0,
    refunded: orderStatusData?.filter(o => o.status === 'REFUNDED').length || 0,
  }
  
  // 최근 주문
  const { data: recentOrders } = await supabase
    .from('orders')
    .select(`
      id,
      order_no,
      customer_name,
      total_amount,
      status,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(5)
  
  // 재고 부족 상품
  let lowStockProducts = []
  if (session.user.role === 'Admin' || session.user.role === 'OrderManager') {
    const { data } = await supabase
      .from('products')
      .select('id, name, on_hand, low_stock_threshold')
      .lte('on_hand', supabase.raw('low_stock_threshold'))
      .eq('active', true)
      .limit(5)
    
    lowStockProducts = data || []
  }
  
  const todaySales = todaySalesData?.reduce((sum, order) => sum + order.total_amount, 0) || 0
  const yesterdaySales = yesterdaySalesData?.reduce((sum, order) => sum + order.total_amount, 0) || 0
  const salesGrowth = yesterdaySales > 0 
    ? Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100)
    : 0
  
  const newOrders = newOrdersData?.length || 0
  const yesterdayOrders = yesterdayOrdersData?.length || 0
  const orderGrowth = yesterdayOrders > 0
    ? Math.round(((newOrders - yesterdayOrders) / yesterdayOrders) * 100)
    : 0
  
  const uniqueCustomers = new Set(customersData?.map(c => c.customer_phone) || [])
  
  return {
    todaySales,
    salesGrowth,
    newOrders,
    orderGrowth,
    totalProducts: productsData?.length || 0,
    activeCustomers: uniqueCustomers.size,
    salesTrend,
    orderStatus,
    recentOrders: recentOrders || [],
    lowStockProducts
  }
}