import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    
    // 오늘 날짜 범위 계산
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 이번 주 시작일 계산
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    // 이번 달 시작일 계산
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // 오늘 주문 조회
    const { data: todayOrders, error: todayError } = await supabase
      .from('orders')
      .select('total_krw')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .in('status', ['paid', 'shipped', 'done']);
    
    if (todayError) {
      console.error('Today orders error:', todayError);
    }
    
    // 이번 주 주문 조회
    const { data: weekOrders, error: weekError } = await supabase
      .from('orders')
      .select('total_krw')
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .in('status', ['paid', 'shipped', 'done']);
    
    if (weekError) {
      console.error('Week orders error:', weekError);
    }
    
    // 이번 달 주문 조회
    const { data: monthOrders, error: monthError } = await supabase
      .from('orders')
      .select('total_krw')
      .gte('created_at', monthStart.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .in('status', ['paid', 'shipped', 'done']);
    
    if (monthError) {
      console.error('Month orders error:', monthError);
    }
    
    // 전체 주문 조회
    const { data: allOrders, error: allError } = await supabase
      .from('orders')
      .select('total_krw')
      .in('status', ['paid', 'shipped', 'done']);
    
    if (allError) {
      console.error('All orders error:', allError);
    }
    
    // 재고 현황 조회
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select(`
        *,
        products!inner (
          id,
          name,
          sku,
          low_stock_threshold
        )
      `);
    
    if (inventoryError) {
      console.error('Inventory error:', inventoryError);
    }
    
    // 통계 계산
    const todayTotal = todayOrders?.reduce((sum, order) => sum + (order.total_krw || 0), 0) || 0;
    const weekTotal = weekOrders?.reduce((sum, order) => sum + (order.total_krw || 0), 0) || 0;
    const monthTotal = monthOrders?.reduce((sum, order) => sum + (order.total_krw || 0), 0) || 0;
    const allTotal = allOrders?.reduce((sum, order) => sum + (order.total_krw || 0), 0) || 0;
    
    // 재고 통계 계산
    const totalProducts = inventory?.length || 0;
    const lowStockProducts = inventory?.filter(item => 
      item.on_hand <= (item.products?.low_stock_threshold || 5)
    ).length || 0;
    const outOfStockProducts = inventory?.filter(item => 
      item.on_hand <= 0
    ).length || 0;
    
    // 주문 상태별 카운트
    const { data: orderStatusCounts } = await supabase
      .from('orders')
      .select('status')
      .in('status', ['paid', 'shipped', 'done', 'cancelled', 'refunded']);
    
    const statusCounts = {
      paid: 0,
      shipped: 0,
      done: 0,
      cancelled: 0,
      refunded: 0
    };
    
    orderStatusCounts?.forEach(order => {
      if (order.status) {
        statusCounts[order.status as keyof typeof statusCounts]++;
      }
    });
    
    return NextResponse.json({
      sales: {
        today: todayTotal,
        todayCount: todayOrders?.length || 0,
        week: weekTotal,
        weekCount: weekOrders?.length || 0,
        month: monthTotal,
        monthCount: monthOrders?.length || 0,
        total: allTotal,
        totalCount: allOrders?.length || 0
      },
      inventory: {
        total: totalProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts
      },
      orderStatus: statusCounts,
      summary: {
        totalRevenue: allTotal,
        totalOrders: allOrders?.length || 0,
        avgOrderValue: allOrders?.length ? allTotal / allOrders.length : 0,
        inventoryValue: 0 // 필요시 계산 추가
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}