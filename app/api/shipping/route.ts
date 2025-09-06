import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    
    // URL 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // 배송 데이터 조회 (shipments 테이블만 먼저)
    let query = supabase
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false });
    
    // 필터 적용 (임시로 status 필터 제거)
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    // 페이지네이션 적용
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    const { data: shipments, error } = await query;
    
    if (error) {
      console.error('Shipping fetch error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // 전체 개수 가져오기
    const { count } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true });
    
    // 상태별 통계 가져오기
    const { data: statusStats } = await supabase
      .from('orders')
      .select('status')
      .in('status', ['PAID', 'SHIPPED', 'DONE']);
    
    const stats = {
      pending: statusStats?.filter(s => s.status === 'PAID').length || 0,
      shipped: statusStats?.filter(s => s.status === 'SHIPPED').length || 0,
      completed: statusStats?.filter(s => s.status === 'DONE').length || 0
    };
    
    return NextResponse.json({
      shipments: shipments || [],
      stats,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Shipping API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}