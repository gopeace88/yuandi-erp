import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // 상태별 주문 수 집계
    const { data: statusCounts } = await supabase
      .from('orders')
      .select('status')

    const statusDistribution = statusCounts?.reduce((acc: Record<string, number>, order: any) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {}) || {}

    // 한국어 라벨과 함께 반환
    const statusLabels = {
      PAID: '결제완료',
      SHIPPED: '배송중',
      DONE: '완료',
      REFUNDED: '환불'
    }

    const chartData = Object.entries(statusDistribution).map(([status, count]) => ({
      status,
      label: statusLabels[status as keyof typeof statusLabels] || status,
      count
    }))

    return NextResponse.json(chartData)

  } catch (error) {
    console.error('Order status API 오류:', error)
    return NextResponse.json(
      { error: '주문 상태 분포를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}