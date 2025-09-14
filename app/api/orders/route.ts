import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    
    // URL 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    
    // PCCC로 고객 정보 조회 요청 처리
    const pccc = searchParams.get('pccc');
    if (pccc) {
      // PCCC로 가장 최근 주문 정보 조회
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          customer_name,
          customer_phone,
          customer_email,
          customer_messenger_id,
          shipping_address_line1,
          shipping_address_line2,
          shipping_postal_code,
          customer_memo,
          pccc
        `)
        .eq('pccc', pccc)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching customer by PCCC:', error);
        return NextResponse.json(
          { error: 'Failed to fetch customer information' },
          { status: 500 }
        );
      }

      if (!orders || orders.length === 0) {
        return NextResponse.json(
          { found: false, message: 'No customer found with this PCCC' },
          { status: 200 }
        );
      }

      // 주문 횟수 조회
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('pccc', pccc);

      const customerData = {
        found: true,
        customer: {
          ...orders[0],
          order_count: count || 0,
          is_repeat_customer: (count || 0) >= 2
        }
      };

      return NextResponse.json(customerData);
    }
    
    // 일반 주문 목록 조회 로직
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
        unit_price: item.price_krw,
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
      .like('order_number', `${dateStr}-%`)
      .order('order_number', { ascending: false })
      .limit(1)
      .single();
    
    let orderNumber;
    if (lastOrder) {
      const lastNum = parseInt(lastOrder.order_number.split('-')[1]);
      orderNumber = `${dateStr}-${String(lastNum + 1).padStart(3, '0')}`;
    } else {
      orderNumber = `${dateStr}-001`;
    }
    
    // 주문 생성
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: body.customerName,
        customer_phone: body.customerPhone,
        customer_email: body.customerEmail,
        customer_messenger_id: body.customerMessengerId || null,  // 메신저 ID 추가
        pccc: body.pcccCode,
        shipping_address_line1: body.shippingAddress,
        shipping_address_line2: body.shippingAddressDetail,
        shipping_postal_code: body.zipCode,
        status: 'paid',
        subtotal_krw: body.totalAmount,
        total_krw: body.totalAmount,
        payment_method: body.paymentMethod || 'card',
        paid_at: new Date().toISOString(),
        customer_memo: body.customerMemo,
        notes: body.notes
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
        .select('*')
        .eq('id', body.productId)
        .single();
      
      // 커스텀 가격이 있으면 사용, 없으면 상품의 기본 가격 사용
      const unitPrice = body.customPrice || product?.price_krw || 0;
      
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: body.productId,
          quantity: body.quantity,
          price_krw: unitPrice,
          total_price_krw: unitPrice * body.quantity
        });
      
      if (itemError) {
        console.error('Order item creation error:', itemError);
      }
      
      // products 테이블의 on_hand 감소 (inventory 테이블은 없음)
      const { data: currentProduct } = await supabase
        .from('products')
        .select('on_hand')
        .eq('id', body.productId)
        .single();
      
      if (currentProduct && currentProduct.on_hand >= body.quantity) {
        const newOnHand = currentProduct.on_hand - body.quantity;
        
        const { error: productError } = await supabase
          .from('products')
          .update({ on_hand: newOnHand })
          .eq('id', body.productId);
        
        if (productError) {
          console.error('Product on_hand update error:', productError);
        }
        
        // 사용자 ID 가져오기 - 테스트 환경에서는 admin 사용자 사용
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || '78502b6d-13e7-4acc-94a7-23a797de3519'; // admin 사용자
        
        // 재고 이동 내역 기록 (판매) - 올바른 필드명 사용
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert({
            product_id: body.productId,
            movement_type: 'sale',
            quantity: -body.quantity, // 판매는 음수로 기록
            previous_quantity: currentProduct.on_hand,
            new_quantity: newOnHand,
            note: `주문 #${orderNumber}`,
            movement_date: new Date().toISOString(),
            created_by: userId  // UUID 사용
          });
        
        if (movementError) {
          console.error('Inventory movement creation error:', movementError);
        }
      }
    }
    
    // 현재 사용자 정보 가져오기
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const cashbookUserId = currentUser?.id || '78502b6d-13e7-4acc-94a7-23a797de3519';
    
    // 출납장부에 판매 수익 기록
    const cashbookData = {
      transaction_date: new Date().toISOString().slice(0, 10),
      type: 'income' as const,  // 'sale'이 아닌 'income' 사용
      category: 'sale',  // 출납유형 코드
      amount: order.total_krw,  // 기본 amount는 KRW (주문은 원화)
      amount_krw: order.total_krw,  // 주문은 수입이므로 양수
      currency: 'KRW' as const,
      fx_rate: 1.0,
      description: `[ORDER_SALE] ${orderNumber} (${body.customerName})`,
      ref_type: 'order',
      ref_id: order.id,
      note: `주문번호: ${orderNumber}`,
      created_by: cashbookUserId  // UUID 사용
    };
    
    const { error: cashbookError } = await supabase
      .from('cashbook_transactions')
      .insert(cashbookData);
    
    if (cashbookError) {
      console.error('❌ Cashbook entry creation error:', cashbookError);
      // 출납장부 기록 실패해도 주문은 진행
    } else {
      console.log('✅ 출납장부 기록 성공: 주문 수익 ₩', order.total_krw);
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
        // cancelled_at 컬럼이 없으므로 제거
        // updateFields.cancelled_at = new Date().toISOString();
        
        // 재고 복구
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', id);
        
        if (orderItems) {
          for (const item of orderItems) {
            // inventory 테이블의 allocated 값 차감
            const { data: currentInventory } = await supabase
              .from('inventory')
              .select('allocated')
              .eq('product_id', item.product_id)
              .single();
            
            if (currentInventory) {
              const currentAllocated = currentInventory.allocated || 0;
              const newAllocated = Math.max(0, currentAllocated - item.quantity); // 음수 방지
              
              await supabase
                .from('inventory')
                .update({
                  allocated: newAllocated
                })
                .eq('product_id', item.product_id);
            }
            
            // products 테이블의 on_hand 값 복구 (다시 증가)
            const { data: currentProduct } = await supabase
              .from('products')
              .select('on_hand')
              .eq('id', item.product_id)
              .single();
            
            if (currentProduct) {
              const newOnHand = (currentProduct.on_hand || 0) + item.quantity;
              
              await supabase
                .from('products')
                .update({ on_hand: newOnHand })
                .eq('id', item.product_id);
              
              // 사용자 이름 가져오기
              let userName = 'System';
              const { data: { user } } = await supabase.auth.getUser();
              if (user?.id) {
                const { data: profile } = await supabase
                  .from('user_profiles')
                  .select('name')
                  .eq('id', user.id)
                  .single();
                userName = profile?.name || user.email?.split('@')[0] || 'User';
              }
              
              // 재고 이동 내역 기록 (환불/취소)
              const { error: movementError } = await supabase
                .from('inventory_movements')
                .insert({
                  product_id: item.product_id,
                  movement_type: 'adjustment',
                  quantity: item.quantity, // 환불은 양수로 기록 (재고 증가)
                  previous_quantity: currentProduct.on_hand,
                  new_quantity: newOnHand,
                  note: `주문 ${status === 'refunded' ? '환불' : '취소'} #${id}`,
                  movement_date: new Date().toISOString(),
                  created_by: user?.id || '78502b6d-13e7-4acc-94a7-23a797de3519'  // admin 사용자
                });
              
              if (movementError) {
                console.error('Inventory movement creation error:', movementError);
              }
            }
          }
        }
        
        // 환불 처리 시 출납장부에 기록
        if (status === 'refunded') {
          // 주문 정보 조회
          const { data: orderData } = await supabase
            .from('orders')
            .select('order_number, total_krw, customer_name')
            .eq('id', id)
            .single();
          
          if (orderData) {
            // 현재 사용자 정보 가져오기
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || '78502b6d-13e7-4acc-94a7-23a797de3519'; // admin 사용자
            
            const { error: cashbookError } = await supabase
              .from('cashbook_transactions')
              .insert({
                transaction_date: new Date().toISOString().slice(0, 10),
                type: 'expense' as const,  // 'refund'가 아닌 'expense' 사용
                category: 'refund',  // 출납유형 코드
                amount: -Math.abs(orderData.total_krw), // 지출 금액 (지출이므로 음수)
                amount_krw: -Math.abs(orderData.total_krw), // 환불은 지출이므로 음수
                currency: 'KRW' as const,
                fx_rate: 1.0,
                description: `[ORDER_REFUND] ${orderData.order_number} (${orderData.customer_name})`,
                ref_type: 'order',
                ref_id: id,
                note: `주문번호: ${orderData.order_number}`,
                created_by: userId  // UUID 사용
              });
            
            if (cashbookError) {
              console.error('❌ Cashbook refund entry error:', cashbookError);
            } else {
              console.log('✅ 출납장부 환불 기록 성공: -₩', orderData.total_krw);
            }
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