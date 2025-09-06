// CJ택배만 사용해서 배송 데이터 생성
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa3dmZXN2bW9oZnBva2dlcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTE2NzAsImV4cCI6MjA3MTI4NzY3MH0.QmsOZrnjMPfr8LxZ_Sp-1S2B9_30RgOvxWPqp2TGk24';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateCJShipments() {
  try {
    console.log('CJ택배 배송 데이터 생성 중...');
    
    // 아직 배송 데이터가 없는 주문들 가져오기
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id, 
        order_number,
        customer_name
      `)
      .limit(8);
    
    if (!orders || orders.length === 0) {
      console.log('주문이 없습니다.');
      return;
    }
    
    console.log(`${orders.length}개 주문에 대한 배송 데이터 생성 중...`);
    
    const shipments = [];
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      
      const shipment = {
        order_id: order.id,
        courier: 'cj', // CJ택배만 사용
        tracking_number: `CJ${Date.now()}${String(i).padStart(3, '0')}`,
        tracking_url: 'https://www.cjlogistics.com/ko/tracking',
        weight_g: Math.floor(Math.random() * 2000) + 500, // 500-2500g
        shipping_cost_krw: Math.floor(Math.random() * 5000) + 3000, // 3000-8000원
        package_count: Math.floor(Math.random() * 2) + 1, // 1-2개
        delivery_notes: `${order.customer_name} 주문배송`
      };
      
      shipments.push(shipment);
    }
    
    const { data, error } = await supabase
      .from('shipments')
      .insert(shipments)
      .select('*');
    
    if (error) {
      console.error('❌ 실패:', error);
    } else {
      console.log(`✅ ${data.length}개 배송 데이터 생성 완료!`);
      console.log('생성된 첫 번째 데이터:');
      console.log('주문번호:', orders[0].order_number);
      console.log('운송장:', data[0].tracking_number);
      console.log('무게:', data[0].weight_g + 'g');
      console.log('배송비:', data[0].shipping_cost_krw + '원');
    }
    
  } catch (error) {
    console.error('오류:', error.message);
  }
}

generateCJShipments();