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

    const { tracking_number, courier, shipment_note, shipment_photo_url } = body

    // 입력값 검증
    if (!tracking_number || !courier) {
      return NextResponse.json(
        { error: '운송장 번호와 택배사는 필수입니다' },
        { status: 400 }
      )
    }

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

    // PAID 상태가 아니면 배송 불가
    if (order.status !== 'PAID') {
      return NextResponse.json(
        { error: '결제 완료된 주문만 배송할 수 있습니다' },
        { status: 400 }
      )
    }

    // 배송 추적 URL 생성
    let tracking_url = null
    switch (courier.toLowerCase()) {
      case 'cj':
      case 'cjlogistics':
        tracking_url = `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvNoText=${tracking_number}`
        break
      case 'hanjin':
        tracking_url = `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnum=${tracking_number}`
        break
      case 'lotte':
        tracking_url = `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${tracking_number}`
        break
      case 'kunyoung':
        tracking_url = `https://www.kunyoung.com/goods/goods_01.php?mulno=${tracking_number}`
        break
      case 'post':
      case 'koreapost':
        tracking_url = `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${tracking_number}`
        break
      case 'ems':
        tracking_url = `https://service.epost.go.kr/trace.RetrieveEmsTrace.comm?POST_CODE=${tracking_number}`
        break
      default:
        // 기타 택배사는 URL 없음
        break
    }

    // 주문 상태를 SHIPPED로 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'SHIPPED',
        tracking_number,
        courier,
        tracking_url,
        shipment_note,
        shipment_photo_url,
        shipped_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('배송 정보 업데이트 실패:', updateError)
      return NextResponse.json(
        { error: '배송 정보 업데이트에 실패했습니다' },
        { status: 500 }
      )
    }

    // 이벤트 로그 기록
    await supabase
      .from('event_logs')
      .insert({
        table_name: 'orders',
        record_id: orderId,
        action: 'ship',
        actor: 'system', // TODO: 실제 사용자 정보
        new_values: {
          status: 'SHIPPED',
          tracking_number,
          courier,
          tracking_url,
          shipment_note,
          shipment_photo_url
        }
      })

    // 캐시 무효화
    revalidatePath('/orders')
    revalidatePath(`/orders/${orderId}`)

    return NextResponse.json({
      message: '배송 정보가 등록되었습니다',
      tracking_url
    })

  } catch (error) {
    console.error('배송 등록 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}