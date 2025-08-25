export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const orderId = params.id

    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // PAID 상태가 아니면 취소 불가
    if (order.status !== 'PAID') {
      return NextResponse.json(
        { error: '결제 완료 상태의 주문만 취소할 수 있습니다' },
        { status: 400 }
      )
    }

    // 주문 상태를 CANCELLED로 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('주문 취소 업데이트 실패:', updateError)
      return NextResponse.json(
        { error: '주문 취소 처리에 실패했습니다' },
        { status: 500 }
      )
    }

    // 재고 복구
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId)

    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        // 재고 증가
        await supabase.rpc('increment_product_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity
        })

        // 재고 이동 기록
        await supabase
          .from('inventory_movements')
          .insert({
            product_id: item.product_id,
            movement_type: 'adjustment',
            quantity: item.quantity,
            ref_type: 'order_cancel',
            ref_id: orderId,
            note: '주문 취소로 인한 재고 복구'
          })
      }
    }

    // 출납장부에 취소 기록
    await supabase
      .from('cashbook')
      .insert({
        type: 'refund',
        amount: -order.total_amount,
        currency: 'KRW',
        amount_krw: -order.total_amount,
        ref_type: 'order',
        ref_id: orderId,
        ref_no: order.order_no,
        description: `주문 취소: ${order.order_no}`
      })

    // 이벤트 로그 기록
    await supabase
      .from('event_logs')
      .insert({
        table_name: 'orders',
        record_id: orderId,
        action: 'cancel',
        actor: 'system', // TODO: 실제 사용자 정보
        new_values: {
          status: 'CANCELLED'
        }
      })

    // 캐시 무효화
    revalidatePath('/orders')
    revalidatePath(`/orders/${orderId}`)

    return NextResponse.json({
      message: '주문이 취소되었습니다'
    })

  } catch (error) {
    console.error('주문 취소 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}