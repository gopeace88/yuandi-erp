export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'

// GET: 상품 검색 (주문 생성시 사용)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ products: [] })
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('id, sku, name, model, color, brand, cost_cny, sale_price_krw, on_hand')
      .eq('active', true)
      .gt('on_hand', 0) // 재고가 있는 상품만
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,model.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(20)

    if (error) throw error

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Product search error:', error)
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    )
  }
}