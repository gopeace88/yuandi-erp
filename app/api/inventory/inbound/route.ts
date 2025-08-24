export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'

// POST: 재고 입고 처리
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin과 OrderManager만 접근 가능
    if (session.user.role !== 'Admin' && session.user.role !== 'OrderManager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { product_id, quantity, unit_cost, ref_no, note } = body

    if (!product_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Invalid product_id or quantity' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 현재 재고 확인
    const { data: product } = await supabase
      .from('products')
      .select('on_hand, cost_cny')
      .eq('id', product_id)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const balanceBefore = product.on_hand
    const balanceAfter = balanceBefore + quantity
    const totalCost = unit_cost ? unit_cost * quantity : null

    // 재고 이동 기록 생성
    const { data: movement, error: movementError } = await supabase
      .from('inventory_movements')
      .insert({
        product_id,
        movement_type: 'inbound',
        quantity,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        ref_type: 'inbound',
        ref_no,
        unit_cost: unit_cost || product.cost_cny,
        total_cost: totalCost || (product.cost_cny * quantity),
        note,
        movement_date: new Date().toISOString(),
        created_by: session.user.id
      })
      .select()
      .single()

    if (movementError) throw movementError

    // 상품 재고 업데이트
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({
        on_hand: balanceAfter,
        updated_at: new Date().toISOString(),
        updated_by: session.user.id
      })
      .eq('id', product_id)
      .select()
      .single()

    if (updateError) throw updateError

    // 출납장부 기록 (비용 발생)
    if (totalCost && totalCost > 0) {
      await supabase
        .from('cashbook')
        .insert({
          transaction_date: new Date().toISOString(),
          type: 'inbound',
          amount: totalCost,
          currency: 'CNY',
          fx_rate: 180, // 기본 환율 (실제로는 API에서 가져와야 함)
          amount_krw: totalCost * 180,
          ref_type: 'inventory_movement',
          ref_id: movement.id,
          ref_no,
          description: `입고: ${updatedProduct.name} ${quantity}개`,
          note,
          created_by: session.user.id
        })
    }

    return NextResponse.json({
      movement,
      product: updatedProduct
    }, { status: 201 })
  } catch (error) {
    console.error('Inventory inbound error:', error)
    return NextResponse.json(
      { error: 'Failed to process inbound inventory' },
      { status: 500 }
    )
  }
}