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
    
    // 응답 데이터 변환
    const transformedTransactions = transactions?.map(transaction => ({
      id: transaction.id,
      date: transaction.transaction_date,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amountKrw: transaction.amount_krw,
      amountCny: transaction.amount_cny,
      exchangeRate: transaction.exchange_rate,
      reference: transaction.reference_type,
      notes: transaction.notes
    })) || [];
    
    return NextResponse.json({
      transactions: transformedTransactions,
      total: count || 0,
      page,
      limit
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