import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // 재고 부족 상품 조회
    const { data: lowStockProducts } = await supabase
      .from('products')
      .select(`
        id,
        sku,
        name,
        category,
        on_hand,
        low_stock_threshold
      `)
      .eq('active', true)
      .filter('on_hand', 'lte', 'low_stock_threshold')
      .order('on_hand', { ascending: true })
      .limit(10)

    return NextResponse.json(lowStockProducts || [])

  } catch (error) {
    console.error('Low stock API 오류:', error)
    return NextResponse.json(
      { error: '재고 부족 상품을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}