// 더 많은 배송 데이터 생성
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa3dmZXN2bW9oZnBva2dlcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTE2NzAsImV4cCI6MjA3MTI4NzY3MH0.QmsOZrnjMPfr8LxZ_Sp-1S2B9_30RgOvxWPqp2TGk24';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateMoreShipments() {
  try {
    console.log('더 많은 배송 데이터 생성 중...');
    
    // 주문 10개 가져오기
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number')
      .limit(10);
    
    if (!orders || orders.length === 0) {
      console.log('주문이 없습니다.');
      return;
    }
    
    const couriers = ['cj', 'hanjin', 'lotte', 'epost', 'logen'];
    const statuses = ['preparing', 'in_transit', 'out_for_delivery', 'delivered'];
    
    const shipments = [];
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      
      const shipment = {
        order_id: order.id,
        courier: couriers[i % couriers.length],
        tracking_number: `${couriers[i % couriers.length].toUpperCase()}${Date.now()}${String(i).padStart(2, '0')}`,
        tracking_url: `https://tracker.delivery/${couriers[i % couriers.length]}`,
        status: statuses[i % statuses.length],
        weight_g: Math.floor(Math.random() * 2000) + 500,
        shipping_cost_krw: Math.floor(Math.random() * 5000) + 3000,
        package_count: Math.floor(Math.random() * 3) + 1,
        delivery_notes: `${order.order_number} 배송`
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
      console.log('생성된 데이터 샘플:', {
        tracking_number: data[0].tracking_number,
        courier: data[0].courier,
        status: data[0].status
      });
    }
    
  } catch (error) {
    console.error('오류:', error);
  }
}

generateMoreShipments();