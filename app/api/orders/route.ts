export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { getEventLogger } from '@/lib/middleware/event-logger'

// GET: 주문 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin과 OrderManager만 접근 가능
    if (session.user.role !== 'Admin' && session.user.role !== 'OrderManager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          sku,
          product_name,
          quantity,
          unit_price,
          subtotal
        ),
        shipments (
          id,
          courier,
          tracking_no,
          shipped_at,
          delivered_at
        )
      `, { count: 'exact' })

    // 필터 적용
    if (status) {
      query = query.eq('status', status)
    }
    
    if (search) {
      query = query.or(`order_no.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    return NextResponse.json({
      orders: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST: 새 주문 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin과 OrderManager만 접근 가능
    if (session.user.role !== 'Admin' && session.user.role !== 'OrderManager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    // 재고 확인
    const productIds = body.items.map((item: any) => item.product_id)
    const { data: products } = await supabase
      .from('products')
      .select('id, on_hand, sale_price_krw')
      .in('id', productIds)

    // 재고 부족 체크
    for (const item of body.items) {
      const product = products?.find(p => p.id === item.product_id)
      if (!product || product.on_hand < item.quantity) {
        return NextResponse.json(
          { error: `재고 부족: ${item.product_name}` },
          { status: 400 }
        )
      }
    }

    // 트랜잭션 시작 (Supabase는 자동 트랜잭션 지원 안함, RPC 함수 사용)
    const { data: order, error: orderError } = await supabase.rpc(
      'create_order_with_items',
      {
        p_customer_name: body.customer_name,
        p_customer_phone: body.customer_phone,
        p_customer_email: body.customer_email || null,
        p_pccc_code: body.pccc_code,
        p_shipping_address: body.shipping_address,
        p_shipping_address_detail: body.shipping_address_detail || null,
        p_zip_code: body.zip_code,
        p_customer_memo: body.customer_memo || null,
        p_internal_memo: body.internal_memo || null,
        p_items: body.items,
        p_created_by: session.user.id
      }
    )

    if (orderError) throw orderError

    // 이벤트 로그 기록
    const logger = getEventLogger()
    await logger.logOrderEvent(
      'INSERT',
      order.id,
      null,
      order,
      `주문 생성: ${order.order_no} - ${body.customer_name}`,
      request
    )

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}