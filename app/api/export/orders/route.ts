export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
// import * as XLSX from 'xlsx' // Temporarily disabled for Vercel deployment

export async function GET(request: NextRequest) {
  // Temporarily return error for Excel export
  return NextResponse.json(
    { error: 'Excel export is temporarily disabled' },
    { status: 503 }
  )
  
  /* Original code - to be re-enabled after fixing SSR issues
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication - admin only
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(orders || [])
    XLSX.utils.book_append_sheet(wb, ws, 'Orders')

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Return Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="orders_${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    console.error('Export orders API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  */
}