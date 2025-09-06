// 수정된 Shipments 테스트 데이터 생성
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa3dmZXN2bW9oZnBva2dlcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTE2NzAsImV4cCI6MjA3MTI4NzY3MH0.QmsOZrnjMPfr8LxZ_Sp-1S2B9_30RgOvxWPqp2TGk24';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createShipmentsFixed() {
  console.log('=== 수정된 Shipments 데이터 생성 ===\n');
  
  try {
    // 1. shipped, done 상태 주문들 조회
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, status, total_krw')
      .in('status', ['shipped', 'done'])
      .limit(10);
    
    if (ordersError) {
      console.error('주문 조회 실패:', ordersError);
      return;
    }
    
    if (!orders || orders.length === 0) {
      console.log('shipped/done 상태 주문이 없습니다. paid 상태 주문을 사용합니다.');
      
      // paid 상태 주문으로 대체
      const { data: paidOrders, error: paidError } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, status, total_krw')
        .eq('status', 'paid')
        .limit(10);
        
      if (paidError || !paidOrders || paidOrders.length === 0) {
        console.log('사용할 주문이 없습니다.');
        return;
      }
      
      console.log(`${paidOrders.length}개 paid 주문을 사용합니다.`);
      
      // 2. 올바른 enum 값으로 배송 데이터 생성
      const couriers = ['cj', 'hanjin', 'lotte', 'epost', 'logen'];
      const shipments = [];
      
      for (let i = 0; i < Math.min(paidOrders.length, 5); i++) {
        const order = paidOrders[i];
        const courier = couriers[i % couriers.length];
        
        const shipment = {
          order_id: order.id,
          courier: courier,
          tracking_number: `${courier.toUpperCase()}${String(Date.now()).slice(-8)}${String(i).padStart(2, '0')}`,
          tracking_url: `https://tracker.delivery/#/${courier}`,
          shipping_cost_krw: Math.floor(Math.random() * 5000) + 3000,
          weight_g: Math.floor(Math.random() * 2000) + 500
        };
        
        shipments.push(shipment);
      }
      
      console.log(`${shipments.length}개 배송 데이터를 생성합니다...`);
      
      // 3. 데이터 삽입
      const { data: insertedShipments, error: insertError } = await supabase
        .from('shipments')
        .insert(shipments)
        .select('*');
      
      if (insertError) {
        console.error('❌ 배송 데이터 삽입 실패:', insertError);
      } else {
        console.log(`✅ ${insertedShipments?.length || 0}개 배송 데이터 생성 완료!`);
        
        if (insertedShipments && insertedShipments.length > 0) {
          console.log('\n생성된 배송 데이터 샘플:');
          const sample = insertedShipments[0];
          console.log('주문번호:', paidOrders.find(o => o.id === sample.order_id)?.order_number);
          console.log('택배사:', sample.courier);
          console.log('운송장번호:', sample.tracking_number);
          console.log('배송비:', sample.shipping_cost_krw + '원');
          console.log('무게:', sample.weight_g + 'g');
          
          console.log('\n전체 컬럼들:', Object.keys(sample));
        }
      }
      
    } else {
      console.log(`${orders.length}개 shipped/done 주문을 사용합니다.`);
    }
    
  } catch (error) {
    console.error('배송 데이터 생성 중 오류:', error);
  }
}

createShipmentsFixed();