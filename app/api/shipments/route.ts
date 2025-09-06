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
    
    // 배송 정보 생성
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert({
        order_id: body.orderId,
        courier: body.courier,
        tracking_number: body.trackingNumber,
        shipped_at: body.shippedAt || new Date().toISOString(),
        estimated_delivery: body.estimatedDelivery,
        notes: body.notes
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
        shipped_at: new Date().toISOString(),
        courier: body.courier,
        tracking_number: body.trackingNumber
      })
      .eq('id', body.orderId);
    
    if (orderError) {
      console.error('Order update error:', orderError);
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