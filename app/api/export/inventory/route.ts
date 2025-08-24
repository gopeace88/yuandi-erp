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

    // Fetch inventory data
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching inventory:', error)
      return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
    }

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(products || [])
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory')

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Return Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="inventory_${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    console.error('Export inventory API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  */
}