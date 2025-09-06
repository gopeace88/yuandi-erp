// 배송관리 페이지 디버깅 - 실제 데이터 조회 테스트
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa3dmZXN2bW9oZnBva2dlcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTE2NzAsImV4cCI6MjA3MTI4NzY3MH0.QmsOZrnjMPfr8LxZ_Sp-1S2B9_30RgOvxWPqp2TGk24';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugShipments() {
  console.log('=== 배송관리 페이지 디버깅 ===\n');
  
  try {
    // 1. Orders 테이블 상태 확인
    console.log('1. Orders 테이블 상태별 개수 확인:');
    const { data: orderStats, error: orderStatsError } = await supabase
      .from('orders')
      .select('status')
      .order('status');
    
    if (orderStatsError) {
      console.log('Orders 조회 에러:', orderStatsError);
    } else {
      const statusCounts = {};
      orderStats.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      console.log('상태별 주문 개수:', statusCounts);
    }
    
    // 2. 배송 대상 주문 조회 (원래 쿼리와 동일)
    console.log('\n2. 배송 대상 주문 조회 (paid, shipped, done):');
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_phone,
        status,
        total_krw,
        created_at,
        order_items (
          quantity,
          products (
            name
          )
        )
      `)
      .in('status', ['paid', 'shipped', 'done'])
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (ordersError) {
      console.log('배송 대상 주문 조회 에러:', ordersError);
    } else {
      console.log(`조회된 주문 개수: ${ordersData?.length || 0}`);
      if (ordersData && ordersData.length > 0) {
        console.log('샘플 주문:', ordersData[0]);
      }
    }
    
    // 3. Shipments 테이블 확인
    console.log('\n3. Shipments 테이블 확인:');
    const { data: shipmentsData, error: shipmentsError } = await supabase
      .from('shipments')
      .select(`
        id,
        order_id,
        courier,
        tracking_number,
        shipping_cost_krw,
        created_at,
        orders (
          order_number,
          customer_name
        )
      `)
      .limit(5);
      
    if (shipmentsError) {
      console.log('Shipments 조회 에러:', shipmentsError);
    } else {
      console.log(`배송 데이터 개수: ${shipmentsData?.length || 0}`);
      if (shipmentsData && shipmentsData.length > 0) {
        console.log('샘플 배송:', shipmentsData[0]);
      }
    }
    
    // 4. Orders와 Shipments 관계 확인
    console.log('\n4. Orders-Shipments 관계 확인:');
    const { data: joinData, error: joinError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        shipments (
          id,
          courier,
          tracking_number
        )
      `)
      .in('status', ['paid', 'shipped', 'done'])
      .limit(3);
      
    if (joinError) {
      console.log('조인 쿼리 에러:', joinError);
    } else {
      console.log('조인된 데이터 샘플:');
      joinData?.forEach(order => {
        console.log(`주문 ${order.order_number} (${order.status}): 배송 ${order.shipments?.length || 0}개`);
      });
    }
    
  } catch (error) {
    console.error('전체 디버깅 실패:', error);
  }
}

debugShipments();