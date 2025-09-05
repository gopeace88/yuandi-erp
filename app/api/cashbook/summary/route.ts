import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

// This route uses cookies for authentication
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const thisMonthStart = startOfMonth(now).toISOString().split('T')[0]
    const thisMonthEnd = endOfMonth(now).toISOString().split('T')[0]
    const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString().split('T')[0]
    const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString().split('T')[0]

    // Get all-time totals
    const { data: allTimeData } = await supabase
      .from('cashbook')
      .select('type, amount')

    let totalIncome = 0
    let totalExpense = 0
    
    allTimeData?.forEach(entry => {
      if (entry.type === 'INCOME') {
        totalIncome += entry.amount
      } else {
        totalExpense += entry.amount
      }
    })

    // Get current month data
    const { data: thisMonthData } = await supabase
      .from('cashbook')
      .select('type, amount')
      .gte('date', thisMonthStart)
      .lte('date', thisMonthEnd)

    let monthlyIncome = 0
    let monthlyExpense = 0
    
    thisMonthData?.forEach(entry => {
      if (entry.type === 'INCOME') {
        monthlyIncome += entry.amount
      } else {
        monthlyExpense += entry.amount
      }
    })

    // Get previous month data
    const { data: lastMonthData } = await supabase
      .from('cashbook')
      .select('type, amount')
      .gte('date', lastMonthStart)
      .lte('date', lastMonthEnd)

    let previousMonthIncome = 0
    let previousMonthExpense = 0
    
    lastMonthData?.forEach(entry => {
      if (entry.type === 'INCOME') {
        previousMonthIncome += entry.amount
      } else {
        previousMonthExpense += entry.amount
      }
    })

    // Get current balance (last entry)
    const { data: lastEntry } = await supabase
      .from('cashbook')
      .select('balance_after')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const summary = {
      total_income: totalIncome,
      total_expense: totalExpense,
      net_profit: totalIncome - totalExpense,
      current_balance: lastEntry?.balance_after || 0,
      monthly_income: monthlyIncome,
      monthly_expense: monthlyExpense,
      previous_month_income: previousMonthIncome,
      previous_month_expense: previousMonthExpense,
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}