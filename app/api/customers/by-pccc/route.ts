import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pccc = searchParams.get('pccc');

    if (!pccc) {
      return NextResponse.json(
        { error: 'PCCC is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // PCCC로 가장 최근 주문 정보 조회
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        customer_name,
        customer_phone,
        customer_email,
        customer_messenger_id,
        shipping_address_line1,
        shipping_address_line2,
        shipping_postal_code,
        customer_memo,
        pccc
      `)
      .eq('pccc', pccc)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching customer by PCCC:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customer information' },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { found: false, message: 'No customer found with this PCCC' },
        { status: 200 }
      );
    }

    // 주문 횟수 조회
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('pccc', pccc);

    const customerData = {
      found: true,
      customer: {
        ...orders[0],
        order_count: count || 0,
        is_repeat_customer: (count || 0) >= 2
      }
    };

    return NextResponse.json(customerData);
  } catch (error) {
    console.error('Error in customer lookup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}