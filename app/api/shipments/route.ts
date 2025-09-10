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
    
    // 배송 정보 생성 - 중국 배송 정보를 메인으로 사용
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert({
        order_id: body.orderId,
        // 중국 배송 정보를 메인 tracking_number와 courier로 사용 (필수)
        tracking_number: body.trackingNumberCn || body.trackingNumber,
        courier: body.courierCn || body.courier || 'other',
        tracking_url: body.trackingUrlCn || body.trackingUrl,
        shipping_cost_cny: shippingCostCny || null,
        shipping_cost_krw: shippingCostKrw,
        weight_g: body.weight || null,
        package_images: body.packageImages || [],
        status: 'in_transit',
        delivery_notes: body.notes || '',
        estimated_delivery_date: body.estimatedDelivery || null,
        package_count: 1
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
    
    // 주문 상태 업데이트
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'shipped',
        // 중국 배송 정보를 메인으로 저장 (한국 배송 정보는 나중에 추가 가능)
        courier: body.courierCn || body.courier || 'other',
        tracking_number: body.trackingNumberCn || body.trackingNumber
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
      
      // 현재 잔액 조회
      const { data: lastTransaction } = await supabase
        .from('cashbook_transactions')
        .select('balance_krw')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const currentBalance = lastTransaction?.balance_krw || 0;
      const newBalance = currentBalance - shippingCostKrw; // 배송비는 지출
      
      const { error: cashbookError } = await supabase
        .from('cashbook_transactions')
        .insert({
          transaction_date: new Date().toISOString().slice(0, 10),
          type: 'shipping' as const,  // 배송 유형 사용
          amount: -shippingCostCny,  // 기본 amount는 CNY (지출이므로 음수)
          amount_krw: -shippingCostKrw,  // 원화 환산 금액 (지출이므로 음수)
          amount_cny: shippingCostCny,  // 위안화 금액 (양수로 기록)
          currency: 'CNY' as const,
          exchange_rate: CNY_TO_KRW_RATE,
          balance_krw: newBalance,
          description: `배송비 - ${orderData?.order_number} (${orderData?.customer_name}) [¥${shippingCostCny}]`,
          reference_type: 'shipment',
          reference_id: shipment.id,
          category: 'shipping',
          tags: ['shipping_cost', orderData?.order_number, body.courierCn || body.courier],
          created_by: userName  // 사용자 이름 사용
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