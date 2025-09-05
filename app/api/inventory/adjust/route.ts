import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { product_id, quantity, reason } = body

    // Get current product stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('on_hand')
      .eq('id', product_id)
      .single()

    if (productError) {
      console.error('Error fetching product:', productError)
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Calculate new stock (quantity is the adjustment amount, can be negative)
    const newStock = (product.on_hand || 0) + quantity

    if (newStock < 0) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })
    }

    // Update product stock
    const { error: updateError } = await supabase
      .from('products')
      .update({ 
        on_hand: newStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', product_id)

    if (updateError) {
      console.error('Error updating product stock:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Create inventory movement record
    const { data: movement, error: movementError } = await supabase
      .from('inventory_movements')
      .insert({
        product_id,
        type: 'ADJUSTMENT',
        quantity,
        reason,
        created_by: user.id,
      })
      .select()
      .single()

    if (movementError) {
      console.error('Error creating inventory movement:', movementError)
      // Try to rollback stock update
      await supabase
        .from('products')
        .update({ 
          on_hand: product.on_hand,
          updated_at: new Date().toISOString()
        })
        .eq('id', product_id)
      
      return NextResponse.json({ error: movementError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      movement,
      new_stock: newStock 
    }, { status: 201 })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}