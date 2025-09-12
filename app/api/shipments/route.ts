import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    
    // URL 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');
    
    // 기본 쿼리 생성
    let query = supabase
      .from('shipments')
      .select(`
        *,
        shipping_cost_cny,
        shipping_cost_krw,
        orders (
          id,
          order_number,
          customer_name,
          customer_phone,
          shipping_address_line1,
          shipping_address_line2,
          shipping_postal_code
        )
      `)
      .order('created_at', { ascending: false });
    
    // 필터 적용
    if (orderId) {
      query = query.eq('order_id', orderId);
    }
    
    const { data: shipments, error } = await query;
    
    if (error) {
      console.error('Shipments fetch error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      shipments: shipments || []
    });
  } catch (error) {
    console.error('Shipments API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();
    
    // 배송비는 필수
    if (!body.shippingCost || body.shippingCost <= 0) {
      return NextResponse.json(
        { error: '배송비는 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }
    
    // CNY to KRW 환율 (대략적인 값, 실제로는 API나 설정에서 가져와야 함)
    const CNY_TO_KRW_RATE = 180;
    
    // 배송비 변환: CNY -> KRW
    const shippingCostCny = body.shippingCost;
    const shippingCostKrw = shippingCostCny * CNY_TO_KRW_RATE;
    
    // 주문 정보 가져오기 (배송지 정보 포함)
    const { data: orderData } = await supabase
      .from('orders')
      .select('shipping_address_line1, shipping_address_line2, shipping_postal_code')
      .eq('id', body.orderId)
      .single();
    
    // 배송 정보 생성 - 단순화된 스키마 사용
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert({
        order_id: body.orderId,
        // 배송지 정보
        shipping_address: orderData ? 
          `${orderData.shipping_address_line1} ${orderData.shipping_address_line2 || ''}`.trim() : '',
        shipping_address_line1: orderData?.shipping_address_line1 || '',
        shipping_address_line2: orderData?.shipping_address_line2 || '',
        shipping_postal_code: orderData?.shipping_postal_code || '',
        // 배송 방법
        shipping_method: 'express', // 기본값
        // 단순화된 배송 정보 (중국택배사가 초기에 정해지고 송장번호는 하나)
        courier: body.courierCn || 'YUANSUN',
        tracking_number: body.trackingNumberCn || body.trackingNumber,
        tracking_url: body.trackingUrlCn || body.trackingUrl || null,
        // 배송비
        shipping_cost_cny: shippingCostCny,
        shipping_cost_krw: shippingCostKrw,
        // 날짜
        shipped_date: new Date().toISOString().split('T')[0],
        // 상태
        status: 'in_transit',
        // 메모
        notes: body.notes || `배송비: ${shippingCostCny} CNY (₩${shippingCostKrw.toLocaleString()})`
      })
      .select()
      .single();
    
    if (shipmentError) {
      console.error('Shipment creation error:', shipmentError);
      return NextResponse.json(
        { error: shipmentError.message },
        { status: 500 }
      );
    }
    
    // 주문 상태 업데이트 (orders 테이블에는 courier, tracking_number 컬럼이 없을 수 있음)
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'shipped',
        shipped_at: new Date().toISOString()
      })
      .eq('id', body.orderId);
    
    if (orderError) {
      console.error('Order update error:', orderError);
    }
    
    // 배송비가 있으면 출납장부에 기록
    if (shippingCostKrw && shippingCostKrw > 0) {
      // 현재 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      
      // 사용자 이름 가져오기
      let userName = 'System';
      if (user?.id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        userName = profile?.name || user.email?.split('@')[0] || 'User';
      }
      
      // 주문 정보 조회
      const { data: orderData } = await supabase
        .from('orders')
        .select('order_number, customer_name')
        .eq('id', body.orderId)
        .single();
      
      const { error: cashbookError } = await supabase
        .from('cashbook_transactions')
        .insert({
          transaction_date: new Date().toISOString().slice(0, 10),
          type: 'expense',  // 지출
          category: 'shipping_fee',  // 배송비 카테고리 (DB 스키마에 맞게)
          amount: -Math.abs(shippingCostCny),  // CNY 금액 (지출이므로 음수)
          amount_krw: -Math.abs(shippingCostKrw),  // 원화 환산 금액 (지출이므로 음수)
          currency: 'CNY',
          fx_rate: CNY_TO_KRW_RATE,
          description: `배송비 - ${orderData?.order_number} (${orderData?.customer_name})`,
          ref_type: 'shipment',
          ref_id: shipment.id.toString(),
          note: `주문번호: ${orderData?.order_number || ''}, 중국 운송장: ${body.trackingNumberCn || ''}`,
          created_by: user?.id || '00000000-0000-0000-0000-000000000000'  // UUID 타입
        });
      
      if (cashbookError) {
        console.error('❌ Cashbook entry creation error:', cashbookError);
        // 출납장부 기록 실패해도 배송 등록은 진행
      } else {
        console.log('✅ 출납장부 배송비 기록 성공: ₩', shippingCostKrw, `(¥${shippingCostCny})`);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      shipment: {
        id: shipment.id
      }
    });
  } catch (error) {
    console.error('Shipment creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Shipment ID is required' },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Shipment update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}