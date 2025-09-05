import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tracking_no, courier, status, delivered_at } = body

    // Update shipment
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (tracking_no !== undefined) updateData.tracking_no = tracking_no
    if (courier !== undefined) updateData.courier = courier
    if (delivered_at !== undefined) updateData.delivered_at = delivered_at
    
    // If tracking info is provided, set shipped_at
    if (tracking_no && courier && !updateData.shipped_at) {
      updateData.shipped_at = new Date().toISOString()
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (shipmentError) {
      console.error('Error updating shipment:', shipmentError)
      return NextResponse.json({ error: shipmentError.message }, { status: 500 })
    }

    // Update order status if needed
    if (status === 'SHIPPED' && shipment.order_id) {
      await supabase
        .from('orders')
        .update({ 
          status: 'SHIPPED',
          updated_at: new Date().toISOString()
        })
        .eq('id', shipment.order_id)
    } else if (status === 'DELIVERED' && shipment.order_id) {
      await supabase
        .from('orders')
        .update({ 
          status: 'DONE',
          updated_at: new Date().toISOString()
        })
        .eq('id', shipment.order_id)
    }

    return NextResponse.json(shipment)
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}