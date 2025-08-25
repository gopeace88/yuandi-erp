import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    // Build query for count
    let countQuery = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
    
    if (search) {
      countQuery = countQuery.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%`)
    }
    
    if (status) {
      countQuery = countQuery.eq('status', status)
    }
    
    const { count } = await countQuery
    
    // Build query for data
    let dataQuery = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to)
    
    if (search) {
      dataQuery = dataQuery.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%`)
    }
    
    if (status) {
      dataQuery = dataQuery.eq('status', status)
    }
    
    const { data, error } = await dataQuery
    
    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({
      data: data || [],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Error in orders API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceSupabaseClient()
    const body = await request.json()
    
    // Generate order number
    const today = new Date().toISOString().slice(2, 10).replace(/-/g, '')
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .like('order_number', `ORD-${today}-%`)
    
    const orderNumber = `ORD-${today}-${String((count || 0) + 1).padStart(3, '0')}`
    
    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...body,
        order_number: orderNumber,
        status: body.status || 'PAID',
        order_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating order:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in orders POST:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}

// 통계 API
export async function OPTIONS(request: NextRequest) {
  try {
    const supabase = await createServiceSupabaseClient()
    
    const { data, error } = await supabase
      .from('orders')
      .select('status')
    
    if (error) {
      console.error('Error fetching stats:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    const stats = {
      total: data?.length || 0,
      processing: data?.filter((o: any) => o.status === 'PAID' || o.status === 'SHIPPED').length || 0,
      delivered: data?.filter((o: any) => o.status === 'DONE').length || 0,
      refunded: data?.filter((o: any) => o.status === 'REFUNDED').length || 0
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error in stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}