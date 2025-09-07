import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    
    // URL 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // 기본 쿼리 생성
    let query = supabase
      .from('cashbook_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });
    
    // 필터 적용
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    
    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }
    
    // 페이지네이션 적용
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    const { data: transactions, error } = await query;
    
    if (error) {
      console.error('Cashbook fetch error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // 전체 개수 가져오기
    const { count } = await supabase
      .from('cashbook_transactions')
      .select('*', { count: 'exact', head: true });
    
    // 잔액 계산을 위한 요약 정보
    const { data: allTransactions } = await supabase
      .from('cashbook_transactions')
      .select('amount_krw, type')
      .order('transaction_date', { ascending: true });
    
    const summary = allTransactions?.reduce((acc, t) => {
      const amount = t.amount_krw || 0;
      if (amount > 0) {
        acc.income += amount;
      } else {
        acc.expense += Math.abs(amount);
      }
      acc.balance += amount;
      return acc;
    }, { balance: 0, income: 0, expense: 0 }) || { balance: 0, income: 0, expense: 0 };
    
    // 이번 달 수익
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { data: monthlyTransactions } = await supabase
      .from('cashbook_transactions')
      .select('amount_krw')
      .gte('transaction_date', currentMonth + '-01')
      .lt('transaction_date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString());
    
    const monthlyProfit = monthlyTransactions?.reduce((sum, t) => sum + (t.amount_krw || 0), 0) || 0;
    summary.monthlyProfit = monthlyProfit;
    
    return NextResponse.json({
      transactions: transactions || [],
      summary,
      pagination: {
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Cashbook API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();
    
    // 거래 생성
    const { data: transaction, error } = await supabase
      .from('cashbook_transactions')
      .insert({
        type: body.type,
        amount_krw: body.amountKrw,
        amount_cny: body.amountCny,
        exchange_rate: body.exchangeRate || 1,
        description: body.description,
        transaction_date: body.date || new Date().toISOString(),
        category: body.category,
        reference_type: body.referenceType,
        reference_id: body.referenceId,
        notes: body.notes
      })
      .select()
      .single();
    
    if (error) {
      console.error('Transaction creation error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      transaction: {
        id: transaction.id
      }
    });
  } catch (error) {
    console.error('Transaction creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}