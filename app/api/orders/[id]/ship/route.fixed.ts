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
    const body = await request.json()

    const { 
      tracking_number, 
      courier,
      tracking_number_cn,
      courier_cn,
      shipment_photo_url,
      shipping_fee,
      actual_weight,
      volume_weight
    } = body

    // 입력값 검증 - 한국 또는 중국 택배사 중 하나는 필수
    if ((!tracking_number || !courier) && (!tracking_number_cn || !courier_cn)) {
      return NextResponse.json(
        { error: '최소 하나의 택배사 정보는 필수입니다' },
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

    // 이미 shipment가 있는지 확인
    const { data: existingShipment } = await supabase
      .from('shipments')
      .select('id')
      .eq('order_id', orderId)
      .single()

    // 한국 배송 추적 URL 생성
    let tracking_url = null
    if (courier && tracking_number) {
      switch (courier.toLowerCase()) {
        case 'cj':
        case 'cj대한통운':
        case 'cjlogistics':
          tracking_url = `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvNoText=${tracking_number}`
          break
        case 'hanjin':
        case '한진택배':
          tracking_url = `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnum=${tracking_number}`
          break
        case 'lotte':
        case '롯데택배':
          tracking_url = `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${tracking_number}`
          break
        case '로젠택배':
        case 'logen':
          tracking_url = `https://www.ilogen.com/web/personal/trace/${tracking_number}`
          break
        case 'post':
        case '우체국택배':
        case 'koreapost':
          tracking_url = `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${tracking_number}`
          break
        case '쿠팡':
        case 'coupang':
          tracking_url = `https://www.coupanglogistics.com/tracking/${tracking_number}`
          break
      }
    }

    // 중국 배송 추적 URL 생성
    let tracking_url_cn = null
    if (courier_cn && tracking_number_cn) {
      switch (courier_cn.toLowerCase()) {
        case 'sf':
        case 'sfexpress':
        case '순풍':
          tracking_url_cn = `https://www.sf-express.com/cn/sc/dynamic_function/waybill/#search/bill-number/${tracking_number_cn}`
          break
        case 'yto':
        case '운달':
          tracking_url_cn = `https://www.yto.net.cn/gw/service/1001/track/${tracking_number_cn}`
          break
        case 'zto':
        case '중통':
          tracking_url_cn = `https://www.zto.com/express/result?billcode=${tracking_number_cn}`
          break
        case 'sto':
        case '신통':
          tracking_url_cn = `https://www.sto.cn/web/single.html?billcode=${tracking_number_cn}`
          break
        case 'yunda':
        case '윤다':
          tracking_url_cn = `https://www.yundaex.com/cn/track/detail?number=${tracking_number_cn}`
          break
        case 'jd':
        case '경동':
          tracking_url_cn = `https://www.jdl.com/#/order/search?waybillCode=${tracking_number_cn}`
          break
      }
    }

    // Shipment 데이터 준비
    const shipmentData = {
      order_id: orderId,
      courier: courier || null,
      tracking_no: tracking_number || null,
      tracking_url: tracking_url || null,
      courier_cn: courier_cn || null,
      tracking_no_cn: tracking_number_cn || null,
      tracking_url_cn: tracking_url_cn || null,
      shipment_photo_url: shipment_photo_url || null,
      shipping_fee: shipping_fee || 0,
      actual_weight: actual_weight || null,
      volume_weight: volume_weight || null,
      shipped_at: new Date().toISOString()
    }

    // Shipment 생성 또는 업데이트
    if (existingShipment) {
      // 이미 있으면 업데이트
      const { error: updateError } = await supabase
        .from('shipments')
        .update(shipmentData)
        .eq('order_id', orderId)

      if (updateError) {
        console.error('배송 정보 업데이트 실패:', updateError)
        return NextResponse.json(
          { error: '배송 정보 업데이트에 실패했습니다' },
          { status: 500 }
        )
      }
    } else {
      // 없으면 생성
      const { error: insertError } = await supabase
        .from('shipments')
        .insert(shipmentData)

      if (insertError) {
        console.error('배송 정보 생성 실패:', insertError)
        return NextResponse.json(
          { error: '배송 정보 생성에 실패했습니다' },
          { status: 500 }
        )
      }
    }

    // 주문 상태를 SHIPPED로 업데이트
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'SHIPPED',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (orderUpdateError) {
      console.error('주문 상태 업데이트 실패:', orderUpdateError)
      return NextResponse.json(
        { error: '주문 상태 업데이트에 실패했습니다' },
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
          tracking_number_cn,
          courier_cn
        }
      })

    // 캐시 무효화
    revalidatePath('/orders')
    revalidatePath(`/orders/${orderId}`)

    return NextResponse.json({
      message: '배송 정보가 등록되었습니다',
      tracking_url,
      tracking_url_cn
    })

  } catch (error) {
    console.error('배송 등록 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}