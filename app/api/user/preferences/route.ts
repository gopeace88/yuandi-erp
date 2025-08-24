export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'

// PATCH: 사용자 환경설정 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { preferredLocale, timezone, currency } = body

    const supabase = await createServerSupabaseClient()
    
    // 프로필 업데이트
    const updateData: any = {}
    if (preferredLocale) updateData.locale = preferredLocale
    if (timezone) updateData.timezone = timezone
    if (currency) updateData.currency = currency
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      preferences: {
        preferredLocale: data.locale,
        timezone: data.timezone,
        currency: data.currency
      }
    })
  } catch (error) {
    console.error('User preferences update error:', error)
    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    )
  }
}

// GET: 사용자 환경설정 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('locale, timezone, currency')
      .eq('id', session.user.id)
      .single()

    if (error) throw error

    return NextResponse.json({
      preferredLocale: data.locale || 'ko',
      timezone: data.timezone || 'Asia/Seoul',
      currency: data.currency || 'KRW'
    })
  } catch (error) {
    console.error('User preferences fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user preferences' },
      { status: 500 }
    )
  }
}