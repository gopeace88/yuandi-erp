import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id } = params;

    // 입력 데이터 검증
    if (!body.tracking_number || !body.courier) {
      return NextResponse.json(
        { error: '운송장 번호와 택배사는 필수입니다' },
        { status: 400 }
      );
    }

    // 1. 주문 정보 가져오기
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 2. 이미 배송 정보가 있는지 확인
    const { data: existingShipment } = await supabase
      .from('shipments')
      .select('*')
      .eq('order_id', id)
      .single();

    let shipmentResult;

    if (existingShipment) {
      // 3-1. 기존 배송 정보 업데이트
      const { data, error } = await supabase
        .from('shipments')
        .update({
          tracking_number: body.tracking_number,
          courier: body.courier,
          shipment_note: body.shipment_note || null,
          shipment_photo_url: body.shipment_photo_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', id)
        .select()
        .single();

      if (error) {
        console.error('배송 정보 업데이트 실패:', error);
        return NextResponse.json(
          { error: '배송 정보 업데이트에 실패했습니다' },
          { status: 500 }
        );
      }
      shipmentResult = data;
    } else {
      // 3-2. 새로운 배송 정보 생성
      const { data, error } = await supabase
        .from('shipments')
        .insert({
          order_id: id,
          tracking_number: body.tracking_number,
          courier: body.courier,
          shipment_note: body.shipment_note || null,
          shipment_photo_url: body.shipment_photo_url || null,
          status: 'shipped'
        })
        .select()
        .single();

      if (error) {
        console.error('배송 정보 생성 실패:', error);
        return NextResponse.json(
          { error: '배송 정보 생성에 실패했습니다' },
          { status: 500 }
        );
      }
      shipmentResult = data;
    }

    // 4. 주문 상태를 'shipped'로 변경
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'shipped',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('주문 상태 업데이트 실패:', updateError);
      return NextResponse.json(
        { error: '주문 상태 업데이트에 실패했습니다' },
        { status: 500 }
      );
    }

    // 5. 이벤트 로그 기록
    await supabase
      .from('event_logs')
      .insert({
        entity_type: 'order',
        entity_id: id,
        action: 'ship',
        details: {
          tracking_number: body.tracking_number,
          courier: body.courier,
          previous_status: order.status,
          new_status: 'shipped'
        },
        user_id: null // TODO: 실제 사용자 ID 사용
      });

    return NextResponse.json({
      success: true,
      shipment: shipmentResult,
      message: '배송 정보가 성공적으로 등록되었습니다'
    });

  } catch (error) {
    console.error('배송 등록 오류:', error);
    return NextResponse.json(
      { error: '배송 등록 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}