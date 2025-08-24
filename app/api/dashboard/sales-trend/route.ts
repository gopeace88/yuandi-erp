import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // 최근 7일간의 매출 데이터
    const { data: salesData } = await supabase
      .from('orders')
      .select('final_amount, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .in('status', ['PAID', 'SHIPPED', 'DONE'])
      .order('created_at', { ascending: true })

    // 날짜별로 매출 집계
    const salesByDate = salesData?.reduce((acc: Record<string, number>, order: any) => {
      const date = new Date(order.created_at).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + order.final_amount
      return acc
    }, {}) || {}

    // 최근 7일 날짜 배열 생성
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
      return date.toISOString().split('T')[0]
    })

    // 차트용 데이터 생성
    const chartData = last7Days.map(date => ({
      date,
      amount: salesByDate[date] || 0
    }))

    return NextResponse.json(chartData)

  } catch (error) {
    console.error('Sales trend API 오류:', error)
    return NextResponse.json(
      { error: '매출 트렌드 데이터를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}