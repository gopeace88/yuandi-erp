import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // 인기 상품 TOP 5 (최근 30일 기준)
    const { data: popularProducts } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        products (
          id,
          sku,
          name,
          category,
          brand
        ),
        orders!inner (
          created_at,
          status
        )
      `)
      .gte('orders.created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .in('orders.status', ['PAID', 'SHIPPED', 'DONE'])

    // 상품별 판매량 집계
    const productSales = popularProducts?.reduce((acc: Record<string, any>, item: any) => {
      const productId = item.product_id
      if (!acc[productId]) {
        acc[productId] = {
          product: item.products,
          totalQuantity: 0,
          orderCount: 0
        }
      }
      acc[productId].totalQuantity += item.quantity
      acc[productId].orderCount += 1
      return acc
    }, {}) || {}

    // 판매량 순으로 정렬하여 TOP 5 추출
    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5)
      .map((item: any) => ({
        id: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        category: item.product.category,
        brand: item.product.brand,
        totalQuantity: item.totalQuantity,
        orderCount: item.orderCount
      }))

    return NextResponse.json(topProducts)

  } catch (error) {
    console.error('Popular products API 오류:', error)
    return NextResponse.json(
      { error: '인기 상품 데이터를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}