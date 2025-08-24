import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { exportToExcel, getOrderExcelColumns } from '@/lib/excel/excelUtils'
import { Locale } from '@/lib/i18n/config'

// GET: 주문 목록 엑셀 다운로드
export async function GET(request: NextRequest) {
  try {
    // 권한 체크
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin만 엑셀 다운로드 가능
    if (session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')
    const locale = (searchParams.get('locale') || 'ko') as Locale

    const supabase = await createServerSupabaseClient()
    
    // 주문 데이터 조회
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          subtotal
        ),
        shipments (
          courier,
          tracking_no,
          shipped_at,
          delivered_at
        )
      `)

    // 필터 적용
    if (status) {
      query = query.eq('status', status)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    if (search) {
      query = query.or(`order_no.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // 엑셀용 데이터 변환
    const exportData = orders.map((order: any) => ({
      order_no: order.order_no,
      created_at: order.created_at,
      status: getStatusLabel(order.status, locale),
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email || '',
      pccc_code: order.pccc_code,
      shipping_address: `${order.shipping_address} ${order.shipping_address_detail || ''}`.trim(),
      zip_code: order.zip_code,
      total_amount: order.total_amount,
      product_count: order.order_items?.length || 0,
      product_list: order.order_items?.map((item: any) => 
        `${item.product_name} x${item.quantity}`
      ).join(', ') || '',
      courier: order.shipments?.[0]?.courier || '',
      tracking_no: order.shipments?.[0]?.tracking_no || '',
      shipped_at: order.shipments?.[0]?.shipped_at || '',
      delivered_at: order.shipments?.[0]?.delivered_at || '',
      customer_memo: order.customer_memo || '',
      internal_memo: order.internal_memo || ''
    }))

    // 요약 정보
    const summary = {
      total_orders: orders.length,
      total_amount: orders.reduce((sum: number, order: any) => sum + order.total_amount, 0),
      status_breakdown: orders.reduce((acc: Record<string, number>, order: any) => {
        acc[order.status] = (acc[order.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    // Footer 데이터 생성
    const footerData = [
      [], // 빈 줄
      [locale === 'ko' ? '=== 요약 ===' : '=== 总结 ==='],
      [
        locale === 'ko' ? '총 주문 수:' : '总订单数:',
        summary.total_orders,
        locale === 'ko' ? '총 금액:' : '总金额:',
        summary.total_amount
      ]
    ]

    // 상태별 통계 추가
    Object.entries(summary.status_breakdown).forEach(([status, count]) => {
      footerData.push([
        getStatusLabel(status, locale),
        count
      ])
    })

    // 엑셀 파일 생성 및 다운로드
    exportToExcel({
      filename: locale === 'ko' ? '주문목록' : '订单列表',
      sheetName: locale === 'ko' ? '주문' : '订单',
      columns: getOrderExcelColumns(locale),
      data: exportData,
      locale,
      includeTimestamp: true,
      autoFilter: true,
      footerData
    })

    return NextResponse.json({ 
      success: true,
      message: locale === 'ko' ? '엑셀 파일이 생성되었습니다' : 'Excel文件已生成'
    })
  } catch (error) {
    console.error('Export orders to Excel error:', error)
    return NextResponse.json(
      { error: 'Failed to export orders' },
      { status: 500 }
    )
  }
}

function getStatusLabel(status: string, locale: Locale): string {
  const statusLabels = locale === 'ko' ? {
    'PAID': '결제완료',
    'SHIPPED': '배송중',
    'DONE': '완료',
    'REFUNDED': '환불'
  } : {
    'PAID': '已付款',
    'SHIPPED': '配送中',
    'DONE': '已完成',
    'REFUNDED': '已退款'
  }
  return statusLabels[status as keyof typeof statusLabels] || status
}