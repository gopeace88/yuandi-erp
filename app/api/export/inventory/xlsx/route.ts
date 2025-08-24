import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { exportToExcel, getInventoryExcelColumns } from '@/lib/excel/excelUtils'
import { Locale } from '@/lib/i18n/config'

// GET: 재고 현황 엑셀 다운로드
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
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock') === 'true'
    const search = searchParams.get('search')
    const locale = (searchParams.get('locale') || 'ko') as Locale

    const supabase = await createServerSupabaseClient()
    
    // 재고 데이터 조회
    let query = supabase
      .from('products')
      .select(`
        id,
        sku,
        name,
        category,
        model,
        color,
        brand,
        cost_cny,
        sale_price_krw,
        on_hand,
        reserved,
        low_stock_threshold,
        is_active,
        created_at,
        updated_at
      `)

    // 필터 적용
    if (category) {
      query = query.eq('category', category)
    }

    if (lowStock) {
      // 재고가 임계치 이하인 제품만
      query = query.lte('on_hand', 'low_stock_threshold')
    }

    if (search) {
      query = query.or(`sku.ilike.%${search}%,name.ilike.%${search}%,brand.ilike.%${search}%`)
    }

    // 활성 제품만 조회
    query = query.eq('is_active', true)

    const { data: products, error } = await query
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    // 엑셀용 데이터 변환
    const exportData = products.map((product: any) => ({
      sku: product.sku,
      name: product.name,
      category: product.category,
      model: product.model,
      color: product.color,
      brand: product.brand,
      cost_cny: product.cost_cny,
      sale_price_krw: product.sale_price_krw,
      on_hand: product.on_hand,
      reserved: product.reserved || 0,
      available: product.on_hand - (product.reserved || 0),
      low_stock_threshold: product.low_stock_threshold,
      stock_status: getStockStatus(product.on_hand, product.low_stock_threshold, locale),
      inventory_value_cny: product.on_hand * product.cost_cny,
      inventory_value_krw: product.on_hand * product.sale_price_krw,
      margin_rate: calculateMarginRate(product.sale_price_krw, product.cost_cny),
      created_at: product.created_at,
      updated_at: product.updated_at
    }))

    // 요약 정보
    const summary = {
      total_products: products.length,
      total_inventory_value_cny: exportData.reduce((sum, item) => sum + item.inventory_value_cny, 0),
      total_inventory_value_krw: exportData.reduce((sum, item) => sum + item.inventory_value_krw, 0),
      out_of_stock: exportData.filter(item => item.on_hand === 0).length,
      low_stock: exportData.filter(item => item.on_hand > 0 && item.on_hand <= item.low_stock_threshold).length,
      sufficient_stock: exportData.filter(item => item.on_hand > item.low_stock_threshold).length
    }

    // Footer 데이터 생성
    const footerData = [
      [], // 빈 줄
      [locale === 'ko' ? '=== 재고 요약 ===' : '=== 库存总结 ==='],
      [
        locale === 'ko' ? '총 제품 수:' : '总产品数:',
        summary.total_products,
        locale === 'ko' ? '총 재고 가치(CNY):' : '总库存价值(CNY):',
        summary.total_inventory_value_cny,
        locale === 'ko' ? '총 재고 가치(KRW):' : '总库存价值(KRW):',
        summary.total_inventory_value_krw
      ],
      [],
      [locale === 'ko' ? '재고 상태' : '库存状态'],
      [
        locale === 'ko' ? '품절:' : '缺货:',
        summary.out_of_stock,
        locale === 'ko' ? '재고부족:' : '库存不足:',
        summary.low_stock,
        locale === 'ko' ? '충분:' : '充足:',
        summary.sufficient_stock
      ]
    ]

    // 카테고리별 통계 추가
    const categoryStats = products.reduce((acc: any, product: any) => {
      if (!acc[product.category]) {
        acc[product.category] = {
          count: 0,
          value_cny: 0,
          value_krw: 0
        }
      }
      acc[product.category].count++
      acc[product.category].value_cny += product.on_hand * product.cost_cny
      acc[product.category].value_krw += product.on_hand * product.sale_price_krw
      return acc
    }, {} as Record<string, any>)

    footerData.push([])
    footerData.push([locale === 'ko' ? '카테고리별 통계' : '分类统计'])
    Object.entries(categoryStats).forEach(([category, stats]: [string, any]) => {
      footerData.push([
        category,
        locale === 'ko' ? `${stats.count}개` : `${stats.count}个`,
        `CNY ${stats.value_cny}`,
        `KRW ${stats.value_krw}`
      ])
    })

    // 엑셀 파일 생성 및 다운로드
    exportToExcel({
      filename: locale === 'ko' ? '재고현황' : '库存现状',
      sheetName: locale === 'ko' ? '재고' : '库存',
      columns: getInventoryExcelColumns(locale),
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
    console.error('Export inventory to Excel error:', error)
    return NextResponse.json(
      { error: 'Failed to export inventory' },
      { status: 500 }
    )
  }
}

function getStockStatus(onHand: number, threshold: number, locale: Locale): string {
  if (onHand === 0) {
    return locale === 'ko' ? '품절' : '缺货'
  } else if (onHand <= threshold) {
    return locale === 'ko' ? '부족' : '不足'
  } else {
    return locale === 'ko' ? '충분' : '充足'
  }
}

function calculateMarginRate(salePrice: number, costPrice: number): number {
  if (salePrice <= 0 || costPrice <= 0) return 0
  
  // 환율 가정 (CNY to KRW, 1 CNY = 180 KRW)
  const EXCHANGE_RATE = 180
  const costInKRW = costPrice * EXCHANGE_RATE
  const margin = ((salePrice - costInKRW) / salePrice) * 100
  
  return Math.round(margin * 10) / 10 // 소수점 1자리
}