import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();
    
    console.log('🔥 API 입고 요청 받음:', body);
    
    // 현재 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser();
    let userId = user?.id;
    let userName = 'System';

    // 인증된 사용자가 없는 경우 (테스트 환경 등)
    if (!userId) {
      // admin@yuandi.com 사용자 찾기
      const { data: adminProfile } = await supabase
        .from('user_profiles')
        .select('id, name')
        .eq('email', 'admin@yuandi.com')
        .single();

      if (adminProfile) {
        userId = adminProfile.id;
        userName = adminProfile.name || 'Admin';
        console.log('📋 테스트 환경: admin 사용자 사용', userId);
      } else {
        // admin 사용자도 없으면 에러
        console.error('❌ No authenticated user and no admin user found');
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    } else {
      // 인증된 사용자가 있으면 프로필 가져오기
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('id', userId)
        .single();
      userName = profile?.name || user.email?.split('@')[0] || 'User';
    }
    
    const { product_id, quantity, unit_cost, note } = body;
    
    console.log('📋 파싱된 데이터:', { product_id, quantity, unit_cost, note });
    console.log('📋 product_id 타입:', typeof product_id);
    
    // 입력 검증
    if (!product_id || !quantity) {
      return NextResponse.json(
        { error: 'Product ID and quantity are required' },
        { status: 400 }
      );
    }
    
    // 1. 현재 상품 정보 조회 (products 테이블의 on_hand 사용)
    console.log('🔍 상품 조회 시작:', product_id);
    const { data: currentProduct, error: productFetchError } = await supabase
      .from('products')
      .select('id, name_ko, name_zh, on_hand, cost_cny, price_krw')
      .eq('id', product_id)
      .single();
    
    console.log('🔍 상품 조회 결과:', currentProduct);
    console.log('🔍 상품 조회 에러:', productFetchError);
    
    if (productFetchError) {
      console.error('❌ Product fetch error:', productFetchError);
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
      previous_quantity: currentProduct.on_hand || 0,
      new_quantity: (currentProduct.on_hand || 0) + Math.abs(quantity),
      note: note || '재고 입고',
      movement_date: new Date().toISOString(),
      created_by: userId  // UUID 사용
    };
    
    const { data: movement, error: movementError } = await supabase
      .from('inventory_movements')
      .insert(movementData)
      .select()
      .single();
    
    if (movementError) {
      console.error('❌ Movement creation error:', movementError);
      console.error('❌ Movement data was:', movementData);
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
      console.error('❌ Product on_hand update error:', productUpdateError);
      console.error('❌ Update values were: on_hand =', newOnHand, ', product_id =', product_id);
      return NextResponse.json(
        { error: 'Failed to update product stock' },
        { status: 500 }
      );
    }
    
    console.log('✅ 재고 업데이트 성공: product_id =', product_id, ', new on_hand =', newOnHand);
    
    // 4. 출납장부 기록 생성 (입고는 지출) - 실제 스키마에 맞춘 필드들
    const totalCost = (unit_cost || currentProduct.cost_cny || 0) * Math.abs(quantity);
    
    const cashbookData = {
      transaction_date: new Date().toISOString().slice(0, 10),
      type: 'expense' as const,  // 'inbound'가 아닌 'expense' 사용
      category: 'inbound',  // 출납유형 코드
      amount: -Math.abs(totalCost), // 지출 금액 (지출이므로 음수)
      amount_krw: -Math.abs(totalCost), // 입고는 지출이므로 음수
      currency: 'KRW' as const,
      fx_rate: 1.0, // KRW 기준이므로 1.0
      description: `[INVENTORY_INBOUND] ${currentProduct.name_ko || currentProduct.name_zh || ''} (${Math.abs(quantity)})`,
      ref_type: 'inventory_movement',
      ref_id: movement.id,
      note: note || '재고 입고',
      created_by: userId  // UUID 사용
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