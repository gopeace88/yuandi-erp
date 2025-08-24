import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    
    // 최근 10개 주문 조회
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_no,
        customer_name,
        customer_phone,
        total_amount,
        status,
        created_at,
        order_items (
          id,
          product_name,
          quantity,
          unit_price
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) throw error
    
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Recent orders error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent orders' },
      { status: 500 }
    )
  }
}