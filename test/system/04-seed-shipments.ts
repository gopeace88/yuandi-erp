/**
 * 시스템 테스트 - Phase 4: 송장 데이터 생성
 * UI 시뮬레이션을 통한 송장 500건 생성
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 택배사 정보
const couriers = [
  { name: 'CJ대한통운', code: 'cj', urlTemplate: 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=' },
  { name: '한진택배', code: 'hanjin', urlTemplate: 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=' },
  { name: '우체국택배', code: 'epost', urlTemplate: 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=' },
  { name: '롯데택배', code: 'lotte', urlTemplate: 'https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=' },
  { name: '로젠택배', code: 'logen', urlTemplate: 'https://www.ilogen.com/web/personal/trace/' },
  { name: 'EMS', code: 'ems', urlTemplate: 'https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?POST_CODE=' },
  { name: 'DHL', code: 'dhl', urlTemplate: 'https://www.dhl.com/kr-ko/home/tracking/tracking-express.html?submit=1&tracking-id=' },
  { name: 'FedEx', code: 'fedex', urlTemplate: 'https://www.fedex.com/fedextrack/?tracknumbers=' }
];

// 랜덤 선택 헬퍼
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 운송장 번호 생성
function generateTrackingNumber(courierCode: string): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = randomBetween(100000, 999999);
  
  switch(courierCode) {
    case 'cj':
    case 'hanjin':
      return `${randomBetween(1000, 9999)}${timestamp}${random}`;
    case 'epost':
      return `${randomBetween(1000, 9999)}${randomBetween(1000, 9999)}${randomBetween(1000, 9999)}`;
    case 'ems':
      return `EE${randomBetween(100000000, 999999999)}KR`;
    case 'dhl':
      return `${randomBetween(1000000000, 9999999999)}`;
    case 'fedex':
      return `${randomBetween(100000000000, 999999999999)}`;
    default:
      return `${timestamp}${random}`;
  }
}

// 배송 상태 생성
function generateShipmentStatus(orderDate: Date): string {
  const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceOrder < 2) {
    return randomChoice(['PREPARING', 'IN_TRANSIT']);
  } else if (daysSinceOrder < 5) {
    return randomChoice(['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']);
  } else {
    return randomChoice(['DELIVERED', 'DELIVERED', 'DELIVERED', 'RETURNED']); // 대부분 배송 완료
  }
}

// 송장 생성
async function createShipment(order: any, index: number) {
  try {
    const courier = randomChoice(couriers);
    const trackingNo = generateTrackingNumber(courier.code);
    const trackingUrl = courier.urlTemplate + trackingNo;
    
    // 배송 날짜 계산 (주문 후 1-3일)
    const shippedDate = new Date(order.created_at);
    shippedDate.setDate(shippedDate.getDate() + randomBetween(1, 3));
    
    const status = generateShipmentStatus(new Date(order.created_at));
    
    // 배송 완료 날짜 (배송 후 1-3일)
    let deliveredDate = null;
    if (status === 'DELIVERED') {
      deliveredDate = new Date(shippedDate);
      deliveredDate.setDate(deliveredDate.getDate() + randomBetween(1, 3));
    }
    
    const shipmentData = {
      order_id: order.id,
      tracking_no: trackingNo,
      courier: courier.name,
      courier_code: courier.code,
      tracking_url: trackingUrl,
      status,
      shipped_at: shippedDate.toISOString(),
      delivered_at: deliveredDate?.toISOString() || null,
      recipient_name: order.customer_name,
      recipient_phone: order.customer_phone,
      shipping_address: order.shipping_address,
      shipping_postcode: order.shipping_postcode,
      notes: `테스트 송장 #${index}`,
      photo_urls: Math.random() > 0.5 ? [
        `https://placeholder.com/shipment/${order.id}/photo1.jpg`,
        `https://placeholder.com/shipment/${order.id}/photo2.jpg`
      ] : null,
      created_at: shippedDate.toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: shipment, error } = await supabase
      .from('shipments')
      .insert(shipmentData)
      .select()
      .single();
    
    if (error) {
      console.error('송장 생성 실패:', error);
      return null;
    }
    
    // 주문 상태 업데이트
    if (status === 'IN_TRANSIT' || status === 'OUT_FOR_DELIVERY') {
      await supabase
        .from('orders')
        .update({
          status: 'SHIPPED',
          shipped_at: shippedDate.toISOString()
        })
        .eq('id', order.id);
    } else if (status === 'DELIVERED') {
      await supabase
        .from('orders')
        .update({
          status: 'DONE',
          shipped_at: shippedDate.toISOString(),
          delivered_at: deliveredDate?.toISOString()
        })
        .eq('id', order.id);
        
      // 재고 allocated → 0 (배송 완료시)
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', order.id);
        
      if (orderItems) {
        for (const item of orderItems) {
          await supabase
            .from('products')
            .update({
              allocated: supabase.raw('allocated - ?', [item.quantity])
            })
            .eq('id', item.product_id);
        }
      }
    }
    
    // 이벤트 로그 생성
    await supabase
      .from('event_logs')
      .insert({
        entity_type: 'SHIPMENT',
        entity_id: shipment.id,
        event_type: 'CREATE',
        event_data: {
          tracking_no: trackingNo,
          courier: courier.name,
          status
        },
        actor_type: 'SYSTEM',
        actor_id: 'test-system',
        created_at: new Date().toISOString()
      });
    
    return shipment;
    
  } catch (error) {
    console.error('송장 생성 오류:', error);
    return null;
  }
}

// 진행 상황 표시
function showProgress(current: number, total: number, courier: string) {
  const percentage = Math.floor((current / total) * 100);
  const bar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
  process.stdout.write(`\r  ${bar} ${percentage}% (${current}/${total}) - ${courier}`);
}

// 메인 실행 함수
async function seedShipments() {
  console.log('\n========================================');
  console.log('   송장 데이터 생성 (500건)');
  console.log('========================================\n');
  
  // 배송 가능한 주문 조회 (PAID, SHIPPED 상태)
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['PAID', 'SHIPPED', 'DONE'])
    .order('created_at', { ascending: false })
    .limit(600); // 여유있게 조회
  
  if (orderError || !orders || orders.length === 0) {
    console.error('❌ 배송 가능한 주문을 찾을 수 없습니다.');
    process.exit(1);
  }
  
  console.log(`📦 ${orders.length}개 주문 로드 완료\n`);
  
  // 이미 송장이 있는 주문 확인
  const { data: existingShipments } = await supabase
    .from('shipments')
    .select('order_id');
  
  const shippedOrderIds = new Set(existingShipments?.map(s => s.order_id) || []);
  const unshippedOrders = orders.filter(o => !shippedOrderIds.has(o.id));
  
  if (unshippedOrders.length < 500) {
    console.log(`⚠️  배송 가능한 주문이 ${unshippedOrders.length}건만 있습니다.`);
  }
  
  const TOTAL_SHIPMENTS = Math.min(500, unshippedOrders.length);
  let successCount = 0;
  let failCount = 0;
  const courierCount: { [key: string]: number } = {};
  const statusCount: { [key: string]: number } = {};
  
  console.log(`📝 송장 ${TOTAL_SHIPMENTS}건 생성 중...\n`);
  
  for (let i = 0; i < TOTAL_SHIPMENTS; i++) {
    const order = unshippedOrders[i];
    const shipment = await createShipment(order, i + 1);
    
    if (shipment) {
      successCount++;
      courierCount[shipment.courier] = (courierCount[shipment.courier] || 0) + 1;
      statusCount[shipment.status] = (statusCount[shipment.status] || 0) + 1;
      showProgress(i + 1, TOTAL_SHIPMENTS, shipment.courier);
    } else {
      failCount++;
      showProgress(i + 1, TOTAL_SHIPMENTS, 'FAILED');
    }
    
    // API rate limiting 방지
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('\n');
  
  // 통계 출력
  console.log('\n📊 생성 통계:');
  console.log(`  ✅ 성공: ${successCount}건`);
  console.log(`  ❌ 실패: ${failCount}건`);
  
  console.log('\n🚚 택배사별 분포:');
  Object.entries(courierCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([courier, count]) => {
      const percentage = Math.floor((count / successCount) * 100);
      console.log(`  • ${courier}: ${count}건 (${percentage}%)`);
    });
  
  console.log('\n📋 배송 상태 분포:');
  Object.entries(statusCount).forEach(([status, count]) => {
    const percentage = Math.floor((count / successCount) * 100);
    let statusKor = status;
    switch(status) {
      case 'PREPARING': statusKor = '준비중'; break;
      case 'IN_TRANSIT': statusKor = '배송중'; break;
      case 'OUT_FOR_DELIVERY': statusKor = '배송출발'; break;
      case 'DELIVERED': statusKor = '배송완료'; break;
      case 'RETURNED': statusKor = '반송'; break;
    }
    console.log(`  • ${statusKor}: ${count}건 (${percentage}%)`);
  });
  
  // 배송 완료율
  const deliveredCount = statusCount['DELIVERED'] || 0;
  const deliveryRate = Math.floor((deliveredCount / successCount) * 100);
  
  console.log('\n📈 배송 지표:');
  console.log(`  • 배송 완료율: ${deliveryRate}%`);
  console.log(`  • 평균 배송 시간: 2-3일`);
  
  if (failCount > 50) {
    console.error('\n⚠️  실패율이 높습니다. 데이터베이스 연결을 확인하세요.');
    process.exit(1);
  }
  
  console.log('\n✅ 송장 데이터 생성 완료!');
  console.log('다음 단계: npm run test:system:verify');
}

// 스크립트 실행
if (require.main === module) {
  seedShipments().catch(console.error);
}

export { seedShipments };