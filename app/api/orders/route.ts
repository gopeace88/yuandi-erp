export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { getEventLogger } from '@/lib/middleware/event-logger'
import { OrderNumberGenerator } from '@/lib/core/utils/OrderNumberGenerator'
import { InventoryManager } from '@/lib/core/services/InventoryManager'
import { CashbookService } from '@/lib/core/services/CashbookService'

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
    
    // 비즈니스 로직 서비스 초기화
    const inventoryManager = new InventoryManager(supabase)
    const cashbookService = new CashbookService(supabase)
    
    // 1. 재고 검증
    const stockValidation = await inventoryManager.validateStock(
      body.items.map((item: any) => ({
        productId: item.product_id,
        quantity: item.quantity
      }))
    )
    
    if (!stockValidation.valid) {
      return NextResponse.json(
        { error: stockValidation.errors.join('; ') },
        { status: 400 }
      )
    }
    
    // 2. 주문번호 생성
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('order_no')
      .gte('created_at', new Date().toISOString().split('T')[0])
    
    const orderNo = await OrderNumberGenerator.generate(
      existingOrders?.map(o => o.order_no) || []
    )

    // 3. 주문 생성
    const totalAmount = body.items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unit_price), 0
    )
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_no: orderNo,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        customer_email: body.customer_email || null,
        pccc_code: body.pccc_code,
        shipping_address: body.shipping_address,
        shipping_address_detail: body.shipping_address_detail || null,
        zip_code: body.zip_code,
        customer_memo: body.customer_memo || null,
        internal_memo: body.internal_memo || null,
        status: 'PAID',
        total_amount: totalAmount,
        created_by: session.user.id
      })
      .select()
      .single()

    if (orderError) throw orderError
    
    // 4. 주문 아이템 생성
    const orderItems = body.items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      sku: item.sku,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.quantity * item.unit_price
    }))
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
    
    if (itemsError) {
      // 롤백: 주문 삭제
      await supabase.from('orders').delete().eq('id', order.id)
      throw itemsError
    }
    
    // 5. 재고 차감
    const deductResult = await inventoryManager.deductStock(
      body.items.map((item: any) => ({
        productId: item.product_id,
        quantity: item.quantity
      }))
    )
    
    if (!deductResult.success) {
      // 롤백: 주문 및 아이템 삭제
      await supabase.from('order_items').delete().eq('order_id', order.id)
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error(deductResult.message || 'Failed to deduct stock')
    }
    
    // 6. 출납장부 기록
    await cashbookService.recordSale(order.id, totalAmount, orderNo)

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