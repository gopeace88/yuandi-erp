// Shipments 테스트 데이터 생성
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa3dmZXN2bW9oZnBva2dlcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTE2NzAsImV4cCI6MjA3MTI4NzY3MH0.QmsOZrnjMPfr8LxZ_Sp-1S2B9_30RgOvxWPqp2TGk24';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createShipmentsData() {
  console.log('=== Shipments 테스트 데이터 생성 ===\n');
  
  try {
    // 1. shipped, done 상태의 주문들 조회
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
      console.log('배송 대상 주문이 없습니다.');
      return;
    }
    
    console.log(`${orders.length}개 주문에 대한 배송 데이터를 생성합니다.`);
    
    // 2. 각 주문에 대해 배송 데이터 생성
    const couriers = ['CJ대한통운', '한진택배', '로젠택배', '우체국택배', '롯데택배'];
    const shipments = [];
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const courier = couriers[i % couriers.length];
      
      const shipment = {
        order_id: order.id,
        courier: courier,
        tracking_number: `${courier.substring(0, 2).toUpperCase()}${String(Date.now()).slice(-8)}${String(i).padStart(2, '0')}`,
        tracking_url: `https://tracking.example.com/${courier}`,
        shipping_cost_krw: Math.floor(Math.random() * 5000) + 3000, // 3000-8000원
        weight_g: Math.floor(Math.random() * 2000) + 500, // 500-2500g
        package_images: [`https://example.com/package${i+1}.jpg`],
        notes: `${order.customer_name} 주문 배송`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      shipments.push(shipment);
    }
    
    // 3. 배송 데이터 삽입
    const { data: insertedShipments, error: insertError } = await supabase
      .from('shipments')
      .insert(shipments)
      .select('*');
    
    if (insertError) {
      console.error('배송 데이터 삽입 실패:', insertError);
      
      // 스키마 정보 다시 확인
      console.log('\n=== Shipments 스키마 재확인 ===');
      const { data: emptyData, error: schemaError } = await supabase
        .from('shipments')
        .select('*')
        .limit(0);
        
      if (schemaError) {
        console.log('스키마 확인 실패:', schemaError);
      } else {
        console.log('Shipments 테이블이 존재합니다. 컬럼 제약 조건을 확인하세요.');
      }
    } else {
      console.log(`✅ ${insertedShipments?.length || 0}개 배송 데이터 생성 완료!`);
      
      if (insertedShipments && insertedShipments.length > 0) {
        console.log('\n생성된 샘플 데이터:');
        console.log('주문번호:', orders[0].order_number);
        console.log('택배사:', insertedShipments[0].courier);
        console.log('운송장번호:', insertedShipments[0].tracking_number);
        console.log('배송비:', insertedShipments[0].shipping_cost_krw + '원');
      }
    }
    
  } catch (error) {
    console.error('배송 데이터 생성 중 오류:', error);
  }
}

createShipmentsData();