import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    
    // URL 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // 기본 쿼리 생성
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            name,
            sku
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    // 필터 적용
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,order_number.ilike.%${search}%`);
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    // 페이지네이션 적용
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    const { data: orders, error } = await query;
    
    if (error) {
      console.error('Orders fetch error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // 전체 개수 가져오기
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    // 응답 데이터 변환
    const transformedOrders = orders?.map(order => ({
      id: order.id,
      order_no: order.order_number,
      order_date: order.created_at,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email,
      pccc_code: order.pccc,
      shipping_address: order.shipping_address_line1,
      shipping_address_detail: order.shipping_address_line2,
      zip_code: order.shipping_postal_code,
      status: order.status,
      total_amount: order.total_krw,
      order_items: order.order_items?.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name || '',
        sku: item.products?.sku || '',
        quantity: item.quantity,
        unit_price: item.unit_price_krw,
        total_price: item.total_price_krw
      }))
    })) || [];
    
    return NextResponse.json({
      orders: transformedOrders,
      total: count || 0,
      page,
      limit
    });
  } catch (error) {
    console.error('Orders API error:', error);
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
    
    // 주문 번호 생성
    const today = new Date();
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
    
    // 오늘 날짜의 마지막 주문 번호 조회
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('order_number')
      .like('order_number', `ORD-${dateStr}-%`)
      .order('order_number', { ascending: false })
      .limit(1)
      .single();
    
    let orderNumber;
    if (lastOrder) {
      const lastNum = parseInt(lastOrder.order_number.split('-')[2]);
      orderNumber = `ORD-${dateStr}-${String(lastNum + 1).padStart(3, '0')}`;
    } else {
      orderNumber = `ORD-${dateStr}-001`;
    }
    
    // 주문 생성
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: body.customerName,
        customer_phone: body.customerPhone,
        customer_email: body.customerEmail,
        pccc: body.pcccCode,
        shipping_address_line1: body.shippingAddress,
        shipping_address_line2: body.shippingAddressDetail,
        shipping_postal_code: body.zipCode,
        shipping_city: body.city || '',
        shipping_state: body.state || '',
        status: 'paid',
        subtotal_krw: body.totalAmount,
        shipping_fee_krw: body.shippingFee || 0,
        total_krw: body.totalAmount + (body.shippingFee || 0),
        payment_method: body.paymentMethod || 'card',
        paid_at: new Date().toISOString(),
        notes: body.customerMemo
      })
      .select()
      .single();
    
    if (orderError) {
      console.error('Order creation error:', orderError);
      return NextResponse.json(
        { error: orderError.message },
        { status: 500 }
      );
    }
    
    // 주문 아이템 생성
    if (body.productId && body.quantity) {
      const { data: product } = await supabase
        .from('products')
        .select('price_krw')
        .eq('id', body.productId)
        .single();
      
      const unitPrice = product?.price_krw || 0;
      
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: body.productId,
          quantity: body.quantity,
          unit_price_krw: unitPrice,
          total_price_krw: unitPrice * body.quantity
        });
      
      if (itemError) {
        console.error('Order item creation error:', itemError);
      }
      
      // 재고 업데이트
      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({ 
          allocated: supabase.raw('allocated + ?', [body.quantity])
        })
        .eq('product_id', body.productId);
      
      if (inventoryError) {
        console.error('Inventory update error:', inventoryError);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      order: {
        id: order.id,
        orderNo: orderNumber
      }
    });
  } catch (error) {
    console.error('Order creation error:', error);
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
    const { id, status, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    // 상태 업데이트 처리
    if (status) {
      let updateFields: any = { status };
      
      // 상태에 따른 추가 필드 업데이트
      if (status === 'shipped') {
        updateFields.shipped_at = new Date().toISOString();
      } else if (status === 'done') {
        updateFields.delivered_at = new Date().toISOString();
      } else if (status === 'cancelled' || status === 'refunded') {
        updateFields.cancelled_at = new Date().toISOString();
        
        // 재고 복구
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', id);
        
        if (orderItems) {
          for (const item of orderItems) {
            await supabase
              .from('inventory')
              .update({
                allocated: supabase.raw('allocated - ?', [item.quantity])
              })
              .eq('product_id', item.product_id);
          }
        }
      }
      
      const { error } = await supabase
        .from('orders')
        .update(updateFields)
        .eq('id', id);
      
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }
    
    // 기타 필드 업데이트
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}