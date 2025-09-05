/**
 * 시스템 테스트 - Phase 3: 주문 데이터 생성
 * UI 시뮬레이션을 통한 주문 1000건 생성
 */

import { createClient } from '@supabase/supabase-js';
import { generateOrderNumber } from '../../lib/domain/services/order-number.service';
import { validatePCCC } from '../../lib/domain/services/pccc.service';
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

// 고객 데이터 템플릿
const customerTemplates = {
  korean: {
    lastNames: ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'],
    firstNames: ['민수', '지영', '서연', '준호', '수진', '영희', '철수', '미나', '현우', '은지'],
    cities: ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '수원', '성남'],
    districts: ['강남구', '서초구', '송파구', '강서구', '마포구', '영등포구', '구로구', '노원구', '중구', '종로구'],
    postcodes: ['06234', '07345', '08456', '09567', '10678', '11789', '12890', '13901', '14012', '15123']
  },
  chinese: {
    lastNames: ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴'],
    firstNames: ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '洋', '艳'],
    cities: ['上海', '北京', '广州', '深圳', '成都', '杭州', '武汉', '西安', '重庆', '青岛'],
    districts: ['浦东新区', '黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区'],
    postcodes: ['200000', '100000', '510000', '518000', '610000', '310000', '430000', '710000', '400000', '266000']
  }
};

// 랜덤 선택 헬퍼
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 전화번호 생성
function generatePhoneNumber(isKorean: boolean): string {
  if (isKorean) {
    const prefix = randomChoice(['010', '011', '016', '017', '018', '019']);
    const middle = String(randomBetween(1000, 9999));
    const last = String(randomBetween(1000, 9999));
    return `${prefix}-${middle}-${last}`;
  } else {
    // 중국 전화번호
    const prefix = randomChoice(['138', '139', '186', '187', '188']);
    const number = String(randomBetween(10000000, 99999999));
    return `+86-${prefix}${number}`;
  }
}

// PCCC 생성
function generatePCCC(): string {
  const prefix = randomChoice(['P', 'M']);
  const year = randomBetween(50, 99); // 1950-1999
  const month = String(randomBetween(1, 12)).padStart(2, '0');
  const day = String(randomBetween(1, 28)).padStart(2, '0');
  const random = String(randomBetween(100000, 999999));
  return `${prefix}${year}${month}${day}${random}`;
}

// 고객 데이터 생성
async function findOrCreateCustomer(orderIndex: number) {
  const isKorean = Math.random() > 0.3; // 70% 한국 고객
  const template = isKorean ? customerTemplates.korean : customerTemplates.chinese;
  
  const lastName = randomChoice(template.lastNames);
  const firstName = randomChoice(template.firstNames);
  const name = lastName + firstName;
  const phone = generatePhoneNumber(isKorean);
  
  // 기존 고객 확인 (20% 확률로 재구매 고객)
  if (Math.random() < 0.2 && orderIndex > 10) {
    const { data: existingCustomers } = await supabase
      .from('customers')
      .select('*')
      .limit(10);
    
    if (existingCustomers && existingCustomers.length > 0) {
      return randomChoice(existingCustomers);
    }
  }
  
  // 새 고객 생성
  const customerData = {
    name,
    phone,
    email: `customer${orderIndex}@test.com`,
    address: `${randomChoice(template.cities)} ${randomChoice(template.districts)} 테스트로 ${randomBetween(1, 999)}`,
    postcode: randomChoice(template.postcodes),
    pccc: generatePCCC(),
    notes: `테스트 고객 #${orderIndex}`,
    total_orders: 0,
    total_amount: 0,
    created_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('customers')
    .insert(customerData)
    .select()
    .single();
  
  if (error) {
    console.error('고객 생성 실패:', error);
    return null;
  }
  
  return data;
}

// 주문 아이템 생성
async function createOrderItems(orderId: string, products: any[]) {
  const itemCount = randomBetween(1, 5); // 주문당 1-5개 상품
  const selectedProducts = [];
  const orderItems = [];
  
  for (let i = 0; i < itemCount; i++) {
    const product = randomChoice(products.filter(p => p.on_hand > 0));
    if (!product) continue;
    
    const quantity = Math.min(randomBetween(1, 3), product.on_hand);
    const unitPrice = product.selling_price_krw;
    const subtotal = unitPrice * quantity;
    
    orderItems.push({
      order_id: orderId,
      product_id: product.id,
      quantity,
      unit_price: unitPrice,
      subtotal,
      notes: null,
      created_at: new Date().toISOString()
    });
    
    selectedProducts.push({ product, quantity });
  }
  
  // 주문 아이템 저장
  const { error } = await supabase
    .from('order_items')
    .insert(orderItems);
  
  if (error) {
    console.error('주문 아이템 생성 실패:', error);
    return null;
  }
  
  // 재고 차감
  for (const { product, quantity } of selectedProducts) {
    const { error: stockError } = await supabase
      .from('products')
      .update({
        on_hand: product.on_hand - quantity,
        allocated: product.allocated + quantity
      })
      .eq('id', product.id);
    
    if (stockError) {
      console.error('재고 업데이트 실패:', stockError);
    }
    
    // 재고 이동 기록
    await supabase
      .from('inventory_movements')
      .insert({
        product_id: product.id,
        type: 'OUT',
        quantity,
        from_location: 'WAREHOUSE',
        to_location: 'CUSTOMER',
        reason: '판매',
        reference_type: 'ORDER',
        reference_id: orderId,
        created_at: new Date().toISOString()
      });
  }
  
  return orderItems;
}

// 주문 생성
async function createOrder(orderIndex: number, products: any[]) {
  try {
    // 1. 고객 정보 생성/조회
    const customer = await findOrCreateCustomer(orderIndex);
    if (!customer) return null;
    
    // 2. 주문번호 생성
    const orderNumber = await generateOrderNumber(supabase);
    
    // 3. 주문 상태 결정 (시간 경과에 따른 분포)
    let status = 'PAID';
    const statusProbability = Math.random();
    if (orderIndex < 500) {
      // 과거 주문은 대부분 완료
      if (statusProbability < 0.7) status = 'DONE';
      else if (statusProbability < 0.85) status = 'SHIPPED';
      else if (statusProbability < 0.95) status = 'PAID';
      else status = 'REFUNDED';
    } else {
      // 최근 주문은 다양한 상태
      if (statusProbability < 0.3) status = 'PAID';
      else if (statusProbability < 0.6) status = 'SHIPPED';
      else if (statusProbability < 0.9) status = 'DONE';
      else status = 'REFUNDED';
    }
    
    // 4. 배송 정보
    const shippingFee = randomBetween(2500, 5000);
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + randomBetween(2, 7));
    
    // 5. 주문 생성
    const orderData = {
      order_no: orderNumber,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email,
      shipping_postcode: customer.postcode,
      shipping_address: customer.address,
      shipping_address_detail: `${randomBetween(101, 2099)}호`,
      pccc: customer.pccc,
      status,
      total_amount: 0, // 나중에 업데이트
      shipping_fee: shippingFee,
      payment_method: randomChoice(['CARD', 'BANK', 'CASH']),
      paid_at: status !== 'PENDING' ? new Date().toISOString() : null,
      shipped_at: ['SHIPPED', 'DONE'].includes(status) ? new Date().toISOString() : null,
      delivered_at: status === 'DONE' ? new Date().toISOString() : null,
      notes: `테스트 주문 #${orderIndex}`,
      created_at: new Date(Date.now() - randomBetween(0, 30 * 24 * 60 * 60 * 1000)).toISOString()
    };
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (error) {
      console.error('주문 생성 실패:', error);
      return null;
    }
    
    // 6. 주문 아이템 생성
    const orderItems = await createOrderItems(order.id, products);
    if (!orderItems) return null;
    
    // 7. 총액 업데이트
    const itemTotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalAmount = itemTotal + shippingFee;
    
    await supabase
      .from('orders')
      .update({ 
        total_amount: totalAmount,
        item_total: itemTotal
      })
      .eq('id', order.id);
    
    // 8. 캐시북 기록 (결제된 주문만)
    if (['PAID', 'SHIPPED', 'DONE'].includes(status)) {
      await supabase
        .from('cashbook')
        .insert({
          transaction_date: orderData.paid_at,
          type: 'INCOME',
          category: 'SALES',
          amount: totalAmount,
          description: `주문 ${orderNumber} 결제`,
          reference_type: 'ORDER',
          reference_id: order.id,
          payment_method: orderData.payment_method,
          created_at: new Date().toISOString()
        });
    }
    
    // 9. 환불 처리 (REFUNDED 상태)
    if (status === 'REFUNDED') {
      await supabase
        .from('cashbook')
        .insert({
          transaction_date: new Date().toISOString(),
          type: 'EXPENSE',
          category: 'REFUND',
          amount: totalAmount,
          description: `주문 ${orderNumber} 환불`,
          reference_type: 'ORDER',
          reference_id: order.id,
          payment_method: orderData.payment_method,
          created_at: new Date().toISOString()
        });
    }
    
    return order;
    
  } catch (error) {
    console.error('주문 생성 오류:', error);
    return null;
  }
}

// 진행 상황 표시
function showProgress(current: number, total: number, status: string) {
  const percentage = Math.floor((current / total) * 100);
  const bar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
  process.stdout.write(`\r  ${bar} ${percentage}% (${current}/${total}) - ${status}`);
}

// 메인 실행 함수
async function seedOrders() {
  console.log('\n========================================');
  console.log('   주문 데이터 생성 (1000건)');
  console.log('========================================\n');
  
  // 상품 조회
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true);
  
  if (productError || !products || products.length === 0) {
    console.error('❌ 상품을 찾을 수 없습니다. 먼저 상품을 생성하세요.');
    process.exit(1);
  }
  
  console.log(`📦 ${products.length}개 상품 로드 완료\n`);
  
  const TOTAL_ORDERS = 1000;
  let successCount = 0;
  let failCount = 0;
  const statusCount: { [key: string]: number } = {
    PAID: 0,
    SHIPPED: 0,
    DONE: 0,
    REFUNDED: 0
  };
  
  console.log('📝 주문 생성 중...\n');
  
  for (let i = 0; i < TOTAL_ORDERS; i++) {
    const order = await createOrder(i + 1, products);
    
    if (order) {
      successCount++;
      statusCount[order.status]++;
    } else {
      failCount++;
    }
    
    showProgress(i + 1, TOTAL_ORDERS, order?.status || 'FAILED');
    
    // API rate limiting 방지
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n');
  
  // 통계 출력
  console.log('\n📊 생성 통계:');
  console.log(`  ✅ 성공: ${successCount}건`);
  console.log(`  ❌ 실패: ${failCount}건`);
  
  console.log('\n📋 주문 상태 분포:');
  Object.entries(statusCount).forEach(([status, count]) => {
    const percentage = Math.floor((count / successCount) * 100);
    console.log(`  • ${status}: ${count}건 (${percentage}%)`);
  });
  
  // 매출 통계
  const { data: salesData } = await supabase
    .from('orders')
    .select('total_amount, status');
  
  if (salesData) {
    const totalSales = salesData
      .filter(o => ['PAID', 'SHIPPED', 'DONE'].includes(o.status))
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
    
    console.log('\n💰 매출 통계:');
    console.log(`  • 총 매출: ₩${totalSales.toLocaleString()}`);
    console.log(`  • 평균 주문액: ₩${Math.floor(totalSales / successCount).toLocaleString()}`);
  }
  
  if (failCount > 50) {
    console.error('\n⚠️  실패율이 높습니다. 데이터베이스 연결을 확인하세요.');
    process.exit(1);
  }
  
  console.log('\n✅ 주문 데이터 생성 완료!');
  console.log('다음 단계: npm run test:system:shipments');
}

// 스크립트 실행
if (require.main === module) {
  seedOrders().catch(console.error);
}

export { seedOrders };