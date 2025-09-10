import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, quantity, type, reason, note, skip_cashbook } = body;

    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // 재고 이동 내역 기록
    const { error: movementError } = await supabase
      .from('inventory_movements')
      .insert({
        product_id,
        product_name: product.name,
        product_model: product.model,
        product_color: product.color,
        product_category: product.category,
        type: 'adjustment',
        quantity,
        balance_before: currentStock,
        balance_after: newStock,
        note: note || `Stock adjustment - ${reason}`,
        created_by: 'admin' // TODO: 실제 사용자 정보 사용
      });

    if (movementError) {
      console.error('Failed to record inventory movement:', movementError);
      // 재고 이동 기록 실패는 치명적이지 않으므로 계속 진행
    }

    // skip_cashbook가 true이므로 출납장부에는 기록하지 않음

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