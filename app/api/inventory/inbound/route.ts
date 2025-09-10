import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();
    
    // 현재 사용자 정보 가져오기 (선택적)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || '00000000-0000-0000-0000-000000000000';
    
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
    
    const { product_id, quantity, unit_cost, note } = body;
    
    // 입력 검증
    if (!product_id || !quantity) {
      return NextResponse.json(
        { error: 'Product ID and quantity are required' },
        { status: 400 }
      );
    }
    
    // 1. 현재 상품 정보 조회 (products 테이블의 on_hand 사용)
    const { data: currentProduct, error: productFetchError } = await supabase
      .from('products')
      .select('id, name, on_hand, cost_cny, price_krw')
      .eq('id', product_id)
      .single();
    
    if (productFetchError) {
      console.error('Product fetch error:', productFetchError);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // 2. 재고 이동 기록 생성 (실제 스키마에 맞춘 필드들)
    const movementData = {
      product_id,
      movement_type: 'inbound' as const,
      quantity: Math.abs(quantity),
      balance_before: currentProduct.on_hand || 0,
      balance_after: (currentProduct.on_hand || 0) + Math.abs(quantity),
      unit_cost: unit_cost || currentProduct.cost_cny || 0,
      total_cost: (unit_cost || currentProduct.cost_cny || 0) * Math.abs(quantity),
      note: note || '재고 입고',
      movement_date: new Date().toISOString(),
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
    
    // 3. products 테이블의 on_hand 업데이트
    const newOnHand = (currentProduct.on_hand || 0) + Math.abs(quantity);
    
    const { error: productUpdateError } = await supabase
      .from('products')
      .update({ 
        on_hand: newOnHand,
        updated_at: new Date().toISOString()
      })
      .eq('id', product_id);
    
    if (productUpdateError) {
      console.error('Product on_hand update error:', productUpdateError);
      return NextResponse.json(
        { error: 'Failed to update product stock' },
        { status: 500 }
      );
    }
    
    // 4. 출납장부 기록 생성 (입고는 지출) - 실제 스키마에 맞춘 필드들
    const totalCost = (unit_cost || currentProduct.cost_cny || 0) * Math.abs(quantity);
    
    const cashbookData = {
      transaction_date: new Date().toISOString().slice(0, 10),
      type: 'inbound' as const,
      amount: totalCost, // 지출 금액 (양수로 기록)
      amount_krw: totalCost,
      currency: 'KRW' as const,
      fx_rate: 1.0, // KRW 기준이므로 1.0
      description: `${currentProduct.name} 재고 입고 (${Math.abs(quantity)}개)`,
      ref_type: 'inventory_movement',
      ref_id: movement.id,
      note: note || '재고 입고',
      created_by: userName  // 사용자 이름 사용
    };
    
    const { error: cashbookError } = await supabase
      .from('cashbook_transactions')
      .insert(cashbookData);
    
    if (cashbookError) {
      console.error('Cashbook entry creation error:', cashbookError);
      // 출납장부 기록 실패해도 재고 입고는 성공
    }
    
    return NextResponse.json({ 
      success: true,
      movement: movement
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error processing inbound:', error);
    return NextResponse.json(
      { error: 'Failed to process inbound' },
      { status: 500 }
    );
  }
}