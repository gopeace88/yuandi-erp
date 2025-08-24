export const dynamic = 'force-dynamic'

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

    const { completion_note } = body

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

    // SHIPPED 상태가 아니면 완료 불가
    if (order.status !== 'SHIPPED') {
      return NextResponse.json(
        { error: '배송 중인 주문만 완료할 수 있습니다' },
        { status: 400 }
      )
    }

    // 주문 상태를 DONE으로 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'DONE',
        completion_note,
        completed_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('주문 완료 업데이트 실패:', updateError)
      return NextResponse.json(
        { error: '주문 완료 처리에 실패했습니다' },
        { status: 500 }
      )
    }

    // 이벤트 로그 기록
    await supabase
      .from('event_logs')
      .insert({
        table_name: 'orders',
        record_id: orderId,
        action: 'complete',
        actor: 'system', // TODO: 실제 사용자 정보
        new_values: {
          status: 'DONE',
          completion_note
        }
      })

    // 캐시 무효화
    revalidatePath('/orders')
    revalidatePath(`/orders/${orderId}`)

    return NextResponse.json({
      message: '주문이 완료되었습니다'
    })

  } catch (error) {
    console.error('주문 완료 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}