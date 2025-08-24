export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // 총 상품 수
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)

    // 총 재고 가치 (원가 기준)
    const { data: inventoryValue } = await supabase
      .from('products')
      .select('cost_cny, on_hand')
      .eq('active', true)

    const totalValue = inventoryValue?.reduce((sum, product: any) => 
      sum + (product.cost_cny * product.on_hand), 0
    ) || 0

    // 재고 부족 상품 수
    const { count: lowStockCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .filter('on_hand', 'lte', 'low_stock_threshold')

    // 품절 상품 수
    const { count: outOfStockCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .eq('on_hand', 0)

    return NextResponse.json({
      totalProducts: totalProducts || 0,
      totalValue,
      lowStockCount: lowStockCount || 0,
      outOfStockCount: outOfStockCount || 0
    })

  } catch (error) {
    console.error('Dashboard summary API 오류:', error)
    return NextResponse.json(
      { error: '대시보드 요약 정보를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}