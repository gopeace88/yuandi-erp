import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    
    // URL 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('product_id');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // 기본 쿼리 생성
    let query = supabase
      .from('inventory_movements')
      .select(`
        *,
        products (
          id,
          name,
          sku
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // 필터 적용
    if (productId) {
      query = query.eq('product_id', productId);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data: movements, error } = await query;
    
    if (error) {
      console.error('Movements fetch error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(movements || []);
  } catch (error) {
    console.error('Error fetching movements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();
    
    // 현재 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 사용자 이름 가져오기
    let userName = 'User';
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('name')
      .eq('id', user.id)
      .single();
    userName = profile?.name || user.email?.split('@')[0] || 'User';
    
    const { product_id, type, quantity, from_location, to_location, notes } = body;
    
    // 입력 검증
    if (!product_id || !type || !quantity) {
      return NextResponse.json(
        { error: 'Product ID, type, and quantity are required' },
        { status: 400 }
      );
    }
    
    // 트랜잭션 시작을 위한 개별 작업
    const operations = [];
    
    // 1. 재고 이동 기록 생성
    const movementData = {
      product_id,
      type,
      quantity: Math.abs(quantity), // 항상 양수로 저장
      from_location: from_location || (type === 'inbound' ? 'supplier' : 'warehouse'),
      to_location: to_location || (type === 'inbound' ? 'warehouse' : 'customer'),
      reference_type: type === 'inbound' ? 'purchase' : type === 'outbound' ? 'sales' : 'adjustment',
      reference_id: `${type.toUpperCase()}-${Date.now()}`,
      notes,
      created_by: userName  // 사용자 이름 사용
    };
    
    const { data: movement, error: movementError } = await supabase
      .from('inventory_movements')
      .insert(movementData)
      .select()
      .single();
    
    if (movementError) {
      console.error('Movement creation error:', movementError);
      return NextResponse.json(
        { error: movementError.message },
        { status: 500 }
      );
    }
    
    // 2. 재고 수량 업데이트
    // 먼저 현재 재고 확인
    const { data: currentInventory, error: inventoryFetchError } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', product_id)
      .single();
    
    if (inventoryFetchError && inventoryFetchError.code !== 'PGRST116') {
      console.error('Inventory fetch error:', inventoryFetchError);
      return NextResponse.json(
        { error: inventoryFetchError.message },
        { status: 500 }
      );
    }
    
    let inventoryUpdate;
    if (currentInventory) {
      // 기존 재고 업데이트
      let newOnHand = currentInventory.on_hand;
      
      if (type === 'inbound') {
        newOnHand += Math.abs(quantity);
      } else if (type === 'outbound') {
        newOnHand -= Math.abs(quantity);
      } else if (type === 'adjustment') {
        newOnHand += quantity; // 조정은 양수/음수 모두 가능
      }
      
      // 음수 재고 방지
      if (newOnHand < 0) {
        return NextResponse.json(
          { error: 'Insufficient inventory' },
          { status: 400 }
        );
      }
      
      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          on_hand: newOnHand,
          available: newOnHand - (currentInventory.reserved || 0),
          last_counted_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('product_id', product_id);
      
      if (updateError) {
        console.error('Inventory update error:', updateError);
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // 새 재고 레코드 생성 (입고인 경우만)
      if (type !== 'inbound') {
        return NextResponse.json(
          { error: 'No inventory record found for this product' },
          { status: 400 }
        );
      }
      
      const { error: createError } = await supabase
        .from('inventory')
        .insert({
          product_id,
          on_hand: Math.abs(quantity),
          reserved: 0,
          available: Math.abs(quantity),
          location: 'MAIN',
          last_counted_at: new Date().toISOString(),
          created_by: user.id
        });
      
      if (createError) {
        console.error('Inventory creation error:', createError);
        return NextResponse.json(
          { error: createError.message },
          { status: 500 }
        );
      }
    }
    
    // 3. 출납장부 기록 생성 (입고/출고인 경우)
    if (type === 'inbound' || type === 'outbound') {
      // 상품 정보 조회하여 금액 계산
      const { data: product } = await supabase
        .from('products')
        .select('name, cost_krw, price_krw')
        .eq('id', product_id)
        .single();
      
      if (product) {
        const amount = type === 'inbound' 
          ? -(product.cost_krw * Math.abs(quantity)) // 입고는 비용 (지출)
          : product.price_krw * Math.abs(quantity);  // 출고는 수익
        
        const cashbookData = {
          transaction_date: new Date().toISOString().slice(0, 10),
          type: type === 'inbound' ? 'inbound' : 'sale',  // 입고는 inbound, 출고는 sale 유형 사용
          category: type === 'inbound' ? 'purchase' : 'sales',
          amount_krw: type === 'inbound' ? -amount : amount,  // 입고는 지출(음수), 출고는 수입(양수)
          description: `${type === 'inbound' ? '상품 입고' : '상품 출고'} - ${product.name} ${Math.abs(quantity)}개`,
          reference_type: 'inventory_movement',
          reference_id: movement.id,
          created_by: userName,  // 사용자 이름 사용
          balance_krw: 0 // 잔액은 트리거나 별도 계산으로 처리
        };
        
        const { error: cashbookError } = await supabase
          .from('cashbook_transactions')
          .insert(cashbookData);
        
        if (cashbookError) {
          console.error('Cashbook entry creation error:', cashbookError);
          // 출납장부 기록 실패해도 재고 이동은 진행
        }
      }
    }
    
    return NextResponse.json({ 
      success: true,
      movement: movement
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating movement:', error);
    return NextResponse.json(
      { error: 'Failed to create movement' },
      { status: 500 }
    );
  }
}