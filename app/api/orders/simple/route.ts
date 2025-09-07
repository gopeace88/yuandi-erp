import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    
    // URL 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // 기본 쿼리 생성
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, status, total_krw, created_at')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error('Orders fetch error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // 전체 개수 가져오기
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      orders: orders || [],
      pagination: {
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Orders simple API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}