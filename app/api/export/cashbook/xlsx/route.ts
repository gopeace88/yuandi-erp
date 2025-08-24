export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { exportToExcel, getCashbookExcelColumns } from '@/lib/excel/excelUtils'
import { Locale } from '@/lib/i18n/config'

// GET: 출납장부 엑셀 다운로드
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const transactionType = searchParams.get('type')
    const category = searchParams.get('category')
    const locale = (searchParams.get('locale') || 'ko') as Locale

    const supabase = await createServerSupabaseClient()
    
    // 출납장부 데이터 조회
    let query = supabase
      .from('cashbooks')
      .select(`
        id,
        transaction_date,
        transaction_type,
        category,
        description,
        amount,
        balance,
        order_id,
        order_no,
        customer_name,
        payment_method,
        note,
        created_at,
        updated_at
      `)

    // 필터 적용
    if (startDate) {
      query = query.gte('transaction_date', startDate)
    }
    if (endDate) {
      query = query.lte('transaction_date', endDate)
    }
    if (transactionType) {
      query = query.eq('transaction_type', transactionType)
    }
    if (category) {
      query = query.eq('category', category)
    }

    const { data: transactions, error } = await query
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    // 엑셀용 데이터 변환
    const exportData = transactions.map((transaction: any) => ({
      transaction_date: transaction.transaction_date,
      transaction_type: getTransactionTypeLabel(transaction.transaction_type, locale),
      category: getCategoryLabel(transaction.category, locale),
      description: transaction.description,
      income: transaction.transaction_type === 'INCOME' ? transaction.amount : 0,
      expense: transaction.transaction_type === 'EXPENSE' ? transaction.amount : 0,
      balance: transaction.balance,
      order_no: transaction.order_no || '',
      customer_name: transaction.customer_name || '',
      payment_method: getPaymentMethodLabel(transaction.payment_method, locale),
      note: transaction.note || ''
    }))

    // 요약 정보 계산
    const summary = {
      total_income: transactions
        .filter((t: any) => t.transaction_type === 'INCOME')
        .reduce((sum: number, t: any) => sum + t.amount, 0),
      total_expense: transactions
        .filter((t: any) => t.transaction_type === 'EXPENSE')
        .reduce((sum: number, t: any) => sum + t.amount, 0),
      transaction_count: transactions.length,
      final_balance: transactions.length > 0 ? (transactions[0] as any).balance : 0
    }

    // 카테고리별 통계
    const categoryStats = transactions.reduce((acc: any, transaction: any) => {
      const cat = transaction.category || 'OTHER'
      if (!acc[cat]) {
        acc[cat] = {
          income: 0,
          expense: 0,
          count: 0
        }
      }
      acc[cat].count++
      if (transaction.transaction_type === 'INCOME') {
        acc[cat].income += transaction.amount
      } else {
        acc[cat].expense += transaction.amount
      }
      return acc
    }, {} as Record<string, any>)

    // Footer 데이터 생성
    const footerData = [
      [], // 빈 줄
      [locale === 'ko' ? '=== 출납 요약 ===' : '=== 账务总结 ==='],
      [
        locale === 'ko' ? '총 수입:' : '总收入:',
        summary.total_income,
        locale === 'ko' ? '총 지출:' : '总支出:',
        summary.total_expense,
        locale === 'ko' ? '최종 잔액:' : '最终余额:',
        summary.final_balance
      ],
      [
        locale === 'ko' ? '거래 건수:' : '交易笔数:',
        summary.transaction_count,
        locale === 'ko' ? '순이익:' : '净利润:',
        summary.total_income - summary.total_expense
      ],
      [],
      [locale === 'ko' ? '카테고리별 통계' : '分类统计']
    ]

    // 카테고리별 통계 추가
    Object.entries(categoryStats).forEach(([category, stats]: [string, any]) => {
      footerData.push([
        getCategoryLabel(category, locale),
        locale === 'ko' ? `${stats.count}건` : `${stats.count}笔`,
        locale === 'ko' ? `수입: ${stats.income}` : `收入: ${stats.income}`,
        locale === 'ko' ? `지출: ${stats.expense}` : `支出: ${stats.expense}`
      ])
    })

    // 날짜 범위 정보 추가
    if (startDate || endDate) {
      footerData.push([])
      footerData.push([
        locale === 'ko' ? '조회 기간:' : '查询期间:',
        startDate || '',
        '~',
        endDate || ''
      ])
    }

    // 엑셀 파일 생성 및 다운로드
    exportToExcel({
      filename: locale === 'ko' ? '출납장부' : '账本',
      sheetName: locale === 'ko' ? '출납내역' : '账务明细',
      columns: getCashbookExcelColumns(locale),
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
    console.error('Export cashbook to Excel error:', error)
    return NextResponse.json(
      { error: 'Failed to export cashbook' },
      { status: 500 }
    )
  }
}

function getTransactionTypeLabel(type: string, locale: Locale): string {
  const labels = locale === 'ko' ? {
    'INCOME': '수입',
    'EXPENSE': '지출'
  } : {
    'INCOME': '收入',
    'EXPENSE': '支出'
  }
  return labels[type as keyof typeof labels] || type
}

function getCategoryLabel(category: string, locale: Locale): string {
  const labels = locale === 'ko' ? {
    'SALES': '매출',
    'PURCHASE': '매입',
    'SHIPPING': '배송비',
    'REFUND': '환불',
    'FEE': '수수료',
    'TAX': '세금',
    'OTHER': '기타'
  } : {
    'SALES': '销售',
    'PURCHASE': '采购',
    'SHIPPING': '运费',
    'REFUND': '退款',
    'FEE': '手续费',
    'TAX': '税费',
    'OTHER': '其他'
  }
  return labels[category as keyof typeof labels] || category
}

function getPaymentMethodLabel(method: string | null, locale: Locale): string {
  if (!method) return ''
  
  const labels = locale === 'ko' ? {
    'CARD': '카드',
    'BANK': '계좌이체',
    'CASH': '현금',
    'PAYPAL': '페이팔',
    'ALIPAY': '알리페이',
    'WECHAT': '위챗페이',
    'OTHER': '기타'
  } : {
    'CARD': '信用卡',
    'BANK': '银行转账',
    'CASH': '现金',
    'PAYPAL': 'PayPal',
    'ALIPAY': '支付宝',
    'WECHAT': '微信支付',
    'OTHER': '其他'
  }
  return labels[method as keyof typeof labels] || method
}