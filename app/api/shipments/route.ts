import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch shipments with order information
    const { data: shipments, error } = await supabase
      .from('shipments')
      .select(`
        *,
        orders (
          order_no,
          customer_name,
          customer_phone,
          shipping_address,
          pccc_code
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching shipments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data to match frontend expectations
    const transformedShipments = shipments?.map(shipment => ({
      id: shipment.id,
      order_id: shipment.order_id,
      order_no: shipment.orders?.order_no,
      customer_name: shipment.orders?.customer_name,
      customer_phone: shipment.orders?.customer_phone,
      shipping_address: shipment.orders?.shipping_address,
      pccc_code: shipment.orders?.pccc_code,
      tracking_no: shipment.tracking_no,
      courier: shipment.courier,
      shipped_at: shipment.shipped_at,
      delivered_at: shipment.delivered_at,
      photo_url: shipment.photo_url,
      status: shipment.delivered_at ? 'DELIVERED' : shipment.tracking_no ? 'SHIPPED' : 'PENDING',
      created_at: shipment.created_at,
      updated_at: shipment.updated_at,
    })) || []

    return NextResponse.json(transformedShipments)
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { order_id } = body

    // Create shipment record
    const { data: shipment, error } = await supabase
      .from('shipments')
      .insert({
        order_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating shipment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(shipment, { status: 201 })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}