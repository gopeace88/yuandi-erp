import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    // Get transactions
    const { data: transactions, error, count } = await supabase
      .from('cashbook')
      .select('*', { count: 'exact' })
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)
    
    if (error) {
      console.error('Error fetching cashbook:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    // Calculate totals
    const { data: totals } = await supabase
      .from('cashbook')
      .select('type, amount_krw')
    
    let totalIncome = 0
    let totalExpense = 0
    
    if (totals) {
      totals.forEach((t: any) => {
        if (t.amount_krw > 0) {
          totalIncome += t.amount_krw
        } else {
          totalExpense += Math.abs(t.amount_krw)
        }
      })
    }
    
    const balance = totalIncome - totalExpense
    
    // Get monthly profit
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: monthlyData } = await supabase
      .from('cashbook')
      .select('amount_krw')
      .gte('transaction_date', `${currentMonth}-01`)
      .lte('transaction_date', `${currentMonth}-31`)
    
    let monthlyProfit = 0
    if (monthlyData) {
      monthlyProfit = monthlyData.reduce((sum: number, t: any) => sum + t.amount_krw, 0)
    }
    
    return NextResponse.json({
      transactions: transactions || [],
      summary: {
        balance,
        income: totalIncome,
        expense: totalExpense,
        monthlyProfit
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error in cashbook API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cashbook data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceSupabaseClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('cashbook')
      .insert({
        ...body,
        transaction_date: body.transaction_date || new Date().toISOString().split('T')[0],
        currency: body.currency || 'KRW',
        fx_rate: body.fx_rate || 1,
        amount_krw: body.amount_krw || body.amount
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating transaction:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in cashbook POST:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}