export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { getEventLogger } from '@/lib/middleware/event-logger'

// 변경 사항 설명 생성
function getChangeDescription(before: any, after: any): string {
  const changes: string[] = []
  
  if (before.status !== after.status) {
    changes.push(`상태: ${before.status} → ${after.status}`)
  }
  if (before.customer_name !== after.customer_name) {
    changes.push(`고객명: ${before.customer_name} → ${after.customer_name}`)
  }
  if (before.customer_phone !== after.customer_phone) {
    changes.push(`연락처 변경`)
  }
  if (before.shipping_address !== after.shipping_address) {
    changes.push(`배송주소 변경`)
  }
  if (before.internal_memo !== after.internal_memo) {
    changes.push(`내부메모 ${before.internal_memo ? '수정' : '추가'}`)
  }
  
  return changes.length > 0 ? changes.join(', ') : '정보 수정'
}

// GET: 주문 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          sku,
          product_name,
          product_category,
          product_model,
          product_color,
          product_brand,
          quantity,
          unit_price,
          subtotal
        ),
        shipments (
          id,
          courier,
          courier_code,
          tracking_no,
          tracking_url,
          shipping_fee,
          shipped_at,
          delivered_at
        ),
        profiles:created_by (
          name,
          email
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Order fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PATCH: 주문 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 주문 상태 확인
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // DONE이나 REFUNDED 상태는 수정 불가
    if (currentOrder.status === 'DONE' || currentOrder.status === 'REFUNDED') {
      return NextResponse.json(
        { error: 'Cannot modify completed or refunded orders' },
        { status: 400 }
      )
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
        updated_by: session.user.id
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    // 이벤트 로그 기록
    const logger = getEventLogger()
    await logger.logOrderEvent(
      'UPDATE',
      params.id,
      currentOrder,
      order,
      `주문 수정: ${order.order_no} - ${getChangeDescription(currentOrder, order)}`,
      request
    )

    return NextResponse.json(order)
  } catch (error) {
    console.error('Order update error:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

// DELETE: 주문 삭제 (Admin only, PAID 상태만)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin만 삭제 가능
    if (session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // 주문 상태 확인
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // PAID 상태만 삭제 가능
    if (currentOrder.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Only PAID orders can be deleted' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    // 이벤트 로그 기록
    const logger = getEventLogger()
    await logger.logOrderEvent(
      'DELETE',
      params.id,
      currentOrder,
      null,
      `주문 삭제: ${currentOrder.order_no} - ${currentOrder.customer_name}`,
      request
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Order deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    )
  }
}