export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get event log statistics
    const { data, error } = await supabase
      .from('event_logs')
      .select('event_type, count')
      .order('count', { ascending: false })

    if (error) {
      console.error('Error fetching event log stats:', error)
      return NextResponse.json({ error: 'Failed to fetch event log stats' }, { status: 500 })
    }

    // Group by event type
    const stats = data?.reduce((acc: any, log: any) => {
      if (!acc[log.event_type]) {
        acc[log.event_type] = 0
      }
      acc[log.event_type] += log.count || 1
      return acc
    }, {})

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Event log stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}