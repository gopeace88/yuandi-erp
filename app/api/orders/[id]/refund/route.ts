import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const orderId = params.id
    const body = await request.json()

    const { refund_reason, refund_note, refund_amount } = body

    // 입력값 검증
    if (!refund_reason) {
      return NextResponse.json(
        { error: '환불 사유는 필수입니다' },
        { status: 400 }
      )
    }

    // 주문 정보 조회 (주문 상품도 함께)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          products (
            id,
            sku,
            name
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // DONE 상태는 환불 불가 (완료된 주문)
    if (order.status === 'DONE') {
      return NextResponse.json(
        { error: '완료된 주문은 환불할 수 없습니다' },
        { status: 400 }
      )
    }

    // 이미 환불된 주문인지 확인
    if (order.status === 'REFUNDED') {
      return NextResponse.json(
        { error: '이미 환불된 주문입니다' },
        { status: 400 }
      )
    }

    // 트랜잭션으로 환불 처리
    const { error: transactionError } = await supabase.rpc('process_order_refund', {
      p_order_id: orderId,
      p_refund_reason: refund_reason,
      p_refund_note: refund_note,
      p_refund_amount: refund_amount || order.final_amount
    })

    if (transactionError) {
      console.error('환불 처리 실패:', transactionError)
      return NextResponse.json(
        { error: '환불 처리에 실패했습니다' },
        { status: 500 }
      )
    }

    // 이벤트 로그 기록
    await supabase
      .from('event_logs')
      .insert({
        table_name: 'orders',
        record_id: orderId,
        action: 'refund',
        actor: 'system', // TODO: 실제 사용자 정보
        new_values: {
          status: 'REFUNDED',
          refund_reason,
          refund_note,
          refund_amount: refund_amount || order.final_amount
        }
      })

    // 캐시 무효화
    revalidatePath('/orders')
    revalidatePath(`/orders/${orderId}`)

    return NextResponse.json({
      message: '환불이 처리되었습니다'
    })

  } catch (error) {
    console.error('환불 처리 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}