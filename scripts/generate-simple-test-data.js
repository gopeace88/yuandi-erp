/**
 * 간단한 테스트 데이터 생성 스크립트
 * 새로운 스키마에 맞춰 테스트 데이터를 생성합니다.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY || process.env.NEXT_PUBLIC_SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL과 API Key가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateTestData() {
  try {
    console.log('🗑️ 기존 데이터 삭제 중...');
    
    // 기존 데이터 삭제 (CASCADE로 연관 데이터도 삭제)
    await supabase.from('event_logs').delete().neq('id', 0);
    await supabase.from('cashbook_transactions').delete().neq('id', 0);
    await supabase.from('inventory_movements').delete().neq('id', 0);
    await supabase.from('shipments').delete().neq('id', 0);
    await supabase.from('order_items').delete().neq('id', 0);
    await supabase.from('orders').delete().neq('id', 0);
    await supabase.from('products').delete().neq('id', 0);
    
    console.log('✅ 기존 데이터 삭제 완료');
    
    // 1. 상품 생성 (30개)
    console.log('📦 상품 생성 중...');
    const products = [];
    const brands = ['Louis Vuitton', 'Gucci', 'Chanel', 'Hermes', 'Prada'];
    const models = ['Speedy', 'Neverfull', 'Alma', 'Marmont', 'Classic'];
    const colors = ['Black', 'Brown', 'Red', 'Navy', 'White'];
    const sizes = ['S', 'M', 'L', 'PM', 'MM'];
    
    // 카테고리 가져오기
    const { data: categories } = await supabase.from('categories').select('id');
    
    for (let i = 1; i <= 30; i++) {
      const brandIdx = (i - 1) % brands.length;
      const modelIdx = (i - 1) % models.length;
      const colorIdx = (i - 1) % colors.length;
      const sizeIdx = (i - 1) % sizes.length;
      const categoryIdx = (i - 1) % categories.length;
      
      const product = {
        sku: `PRD-${String(i).padStart(4, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        category_id: categories[categoryIdx].id,
        name_ko: `${models[modelIdx]} ${i}`,
        name_zh: `${models[modelIdx]}包 ${i}`,
        model: models[modelIdx],
        color_ko: colors[colorIdx],
        color_zh: colors[colorIdx],
        brand_ko: brands[brandIdx],
        brand_zh: brands[brandIdx],
        size: sizes[sizeIdx],
        price_krw: Math.floor(Math.random() * 1950 + 50) * 10000,  // 50만원 ~ 2000만원
        cost_cny: Math.floor(Math.random() * 5000 + 500),  // 500 ~ 5500 CNY
        on_hand: Math.floor(Math.random() * 51),  // 0 ~ 50개
        is_active: true
      };
      
      products.push(product);
    }
    
    const { error: productError } = await supabase.from('products').insert(products);
    if (productError) throw productError;
    console.log('✅ 상품 30개 생성 완료');
    
    // 2. 주문 생성 (50개)
    console.log('📋 주문 생성 중...');
    const { data: insertedProducts } = await supabase.from('products').select('id, price_krw');
    const { data: adminUser } = await supabase.from('user_profiles').select('id').eq('role', 'admin').single();
    
    const orders = [];
    const customerNames = ['김민수', '이영희', '박철수', '최지영', '정대호'];
    const statuses = ['paid', 'shipped', 'done', 'cancelled', 'refunded'];
    const paymentMethods = ['card', 'cash', 'transfer'];
    
    for (let i = 1; i <= 50; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 60));  // 최근 60일 내
      
      const order = {
        order_number: `${date.toISOString().slice(2, 10).replace(/-/g, '')}-${String(i).padStart(3, '0')}`,
        customer_name: customerNames[i % customerNames.length],
        customer_phone: `010-${String(1000 + i).padStart(4, '0')}-${String(1000 + i * 2).padStart(4, '0')}`,
        customer_email: `customer${i}@example.com`,
        customer_messenger_id: `kakao_${i}`,
        customer_memo: i % 3 === 0 ? '빠른 배송 부탁드립니다' : null,
        pccc: `P${String(Math.floor(Math.random() * 99999999999) + 1).padStart(11, '0')}`,
        shipping_address_line1: `서울시 강남구 테헤란로 ${i}길 ${i}`,
        shipping_address_line2: `${(i % 10) + 1}층 ${100 + i}호`,
        shipping_postal_code: String(100 + i).padStart(3, '0') + String(100 + i).padStart(3, '0'),
        status: i <= 10 ? 'paid' : statuses[i % statuses.length],
        order_date: date.toISOString().slice(0, 10),
        subtotal_krw: Math.floor(Math.random() * 495 + 5) * 100000,  // 50만원 ~ 5000만원
        total_krw: Math.floor(Math.random() * 495 + 5) * 100000,
        payment_method: paymentMethods[i % paymentMethods.length],
        paid_at: date.toISOString(),
        notes: i % 5 === 0 ? 'VIP 고객' : null,
        created_by: adminUser?.id || null,
        created_at: date.toISOString(),
        updated_at: date.toISOString()
      };
      
      orders.push(order);
    }
    
    const { error: orderError } = await supabase.from('orders').insert(orders);
    if (orderError) throw orderError;
    console.log('✅ 주문 50개 생성 완료');
    
    // 3. 주문 아이템 생성
    console.log('🛒 주문 아이템 생성 중...');
    const { data: insertedOrders } = await supabase.from('orders').select('id');
    const orderItems = [];
    
    for (const order of insertedOrders) {
      const numItems = Math.floor(Math.random() * 3) + 1;  // 1-3개 아이템
      
      for (let j = 0; j < numItems; j++) {
        const product = insertedProducts[Math.floor(Math.random() * insertedProducts.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;  // 1-3개
        
        orderItems.push({
          order_id: order.id,
          product_id: product.id,
          quantity: quantity,
          price_krw: product.price_krw,
          total_price_krw: product.price_krw * quantity
        });
      }
    }
    
    const { error: itemError } = await supabase.from('order_items').insert(orderItems);
    if (itemError) throw itemError;
    console.log('✅ 주문 아이템 생성 완료');
    
    // 4. 배송 정보 생성 (shipped, done 상태의 주문에 대해)
    console.log('🚚 배송 정보 생성 중...');
    const { data: shippedOrders } = await supabase
      .from('orders')
      .select('id')
      .in('status', ['shipped', 'done']);
    
    const shipments = [];
    for (const order of shippedOrders) {
      const shippedDate = new Date();
      shippedDate.setDate(shippedDate.getDate() - Math.floor(Math.random() * 30));
      
      shipments.push({
        order_id: order.id,
        shipping_address: '서울시 강남구',
        shipping_method: 'standard',
        korea_tracking_number: `KR${String(Math.floor(Math.random() * 999999999) + 1).padStart(9, '0')}`,
        china_tracking_number: `CN${String(Math.floor(Math.random() * 999999999) + 1).padStart(9, '0')}`,
        korea_shipping_company: 'CJ대한통운',
        china_shipping_company: 'YUANSUN',
        shipped_date: shippedDate.toISOString().slice(0, 10)
      });
    }
    
    if (shipments.length > 0) {
      const { error: shipmentError } = await supabase.from('shipments').insert(shipments);
      if (shipmentError) throw shipmentError;
      console.log(`✅ 배송 정보 ${shipments.length}개 생성 완료`);
    }
    
    console.log('\n✨ 모든 테스트 데이터 생성 완료!');
    console.log('생성된 데이터:');
    console.log(`- 상품: 30개`);
    console.log(`- 주문: 50개`);
    console.log(`- 주문 아이템: ${orderItems.length}개`);
    console.log(`- 배송 정보: ${shipments.length}개`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

generateTestData();