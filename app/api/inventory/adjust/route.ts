import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'

// POST: 재고 조정 처리
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
    const { product_id, adjustment_type, quantity, reason, note } = body

    if (!product_id || !adjustment_type || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['increase', 'decrease'].includes(adjustment_type)) {
      return NextResponse.json(
        { error: 'Invalid adjustment_type. Must be increase or decrease' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 현재 재고 확인
    const { data: product } = await supabase
      .from('products')
      .select('on_hand, cost_cny, name')
      .eq('id', product_id)
      .single() as any

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const balanceBefore = (product as any).on_hand
    const adjustmentQuantity = adjustment_type === 'increase' ? quantity : -quantity
    const balanceAfter = balanceBefore + adjustmentQuantity

    // 재고가 음수가 되지 않도록 체크
    if (balanceAfter < 0) {
      return NextResponse.json(
        { error: 'Insufficient inventory for adjustment' },
        { status: 400 }
      )
    }

    // 재고 이동 기록 생성
    const movementType = adjustment_type === 'increase' ? 'adjustment' : 'disposal'
    const { data: movement, error: movementError } = await supabase
      .from('inventory_movements')
      .insert({
        product_id,
        movement_type: movementType,
        quantity: Math.abs(adjustmentQuantity),
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        ref_type: 'adjustment',
        ref_no: `ADJ-${Date.now()}`,
        unit_cost: (product as any).cost_cny,
        total_cost: (product as any).cost_cny * Math.abs(adjustmentQuantity),
        note: `${reason}: ${note || ''}`,
        movement_date: new Date().toISOString(),
        created_by: session.user.id
      } as any)
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
      } as any)
      .eq('id', product_id)
      .select()
      .single()

    if (updateError) throw updateError

    // 출납장부 기록 (조정으로 인한 손익)
    const adjustmentValue = product.cost_cny * Math.abs(adjustmentQuantity)
    if (adjustmentValue > 0) {
      await supabase
        .from('cashbook')
        .insert({
          transaction_date: new Date().toISOString(),
          type: 'adjustment',
          amount: adjustment_type === 'increase' ? -adjustmentValue : adjustmentValue,
          currency: 'CNY',
          fx_rate: 180,
          amount_krw: (adjustment_type === 'increase' ? -adjustmentValue : adjustmentValue) * 180,
          ref_type: 'inventory_movement',
          ref_id: movement.id,
          ref_no: movement.ref_no,
          description: `재고조정: ${product.name} ${adjustment_type === 'increase' ? '+' : '-'}${quantity}개`,
          note: `${reason}: ${note || ''}`,
          created_by: session.user.id
        } as any)
    }

    return NextResponse.json({
      movement,
      product: updatedProduct,
      adjustment: {
        type: adjustment_type,
        quantity,
        balanceBefore,
        balanceAfter,
        reason,
        note
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Inventory adjustment error:', error)
    return NextResponse.json(
      { error: 'Failed to process inventory adjustment' },
      { status: 500 }
    )
  }
}