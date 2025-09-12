import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, quantity, type, reason, note, skip_cashbook } = body;

    const supabase = await createServerSupabase();
    
    // 현재 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || '00000000-0000-0000-0000-000000000000';

    // 현재 상품 정보 조회
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('on_hand, name, model, color, category')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const currentStock = product.on_hand || 0;
    const newStock = currentStock + quantity;

    // 재고가 음수가 되는지 확인
    if (newStock < 0) {
      return NextResponse.json(
        { error: 'Insufficient stock. Cannot reduce below 0' },
        { status: 400 }
      );
    }

    // 상품 재고 업데이트
    const { error: updateError } = await supabase
      .from('products')
      .update({ on_hand: newStock })
      .eq('id', product_id);

    if (updateError) {
      console.error('Failed to update product stock:', updateError);
      return NextResponse.json(
        { error: 'Failed to update stock' },
        { status: 500 }
      );
    }

    // 재고 이동 내역 기록 (올바른 필드명 사용)
    const { data: movement, error: movementError } = await supabase
      .from('inventory_movements')
      .insert({
        product_id,
        movement_type: 'adjustment',
        quantity,
        previous_quantity: currentStock,
        new_quantity: newStock,
        note: note || `Stock adjustment - ${reason}`,
        movement_date: new Date().toISOString(),
        created_by: userId
      })
      .select()
      .single();

    if (movementError) {
      console.error('Failed to record inventory movement:', movementError);
      // 재고 이동 기록 실패는 치명적이지 않으므로 계속 진행
    }

    // 출납장부 기록 (skip_cashbook가 false인 경우)
    if (!skip_cashbook && type === 'loss') {
      // 손실의 경우 adjustment 유형으로 기록
      const { error: cashbookError } = await supabase
        .from('cashbook_transactions')
        .insert({
          transaction_date: new Date().toISOString().slice(0, 10),
          type: 'adjustment',
          category: 'loss',  // 손실 출납유형
          amount: 0,  // 재고 조정은 금액 영향 없음
          amount_krw: 0,
          currency: 'KRW',
          fx_rate: 1.0,
          description: `${product.name} 재고 조정 (${Math.abs(quantity)}개 ${quantity > 0 ? '증가' : '감소'})`,
          ref_type: 'inventory_movement',
          ref_id: movement?.id,
          note: note || reason,
          created_by: userId
        });
      
      if (cashbookError) {
        console.error('Failed to create cashbook entry:', cashbookError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        product_id,
        previous_stock: currentStock,
        new_stock: newStock,
        adjustment: quantity
      }
    });
  } catch (error: any) {
    console.error('Stock adjustment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to adjust stock' },
      { status: 500 }
    );
  }
}