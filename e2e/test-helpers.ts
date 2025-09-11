/**
 * E2E 테스트용 헬퍼 함수
 * 01.working_schema_reset.sql 스키마 기반
 * 상품 100개+, 주문 300개+ 생성
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 한국 시간 기준 주문번호 생성
 */
function generateOrderNumber(date: Date, sequence: number): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const seq = sequence.toString().padStart(3, '0');
  return `${year}${month}${day}-${seq}`;
}

/**
 * 랜덤 PCCC 코드 생성
 */
function generatePCCC(): string {
  const digits = Math.floor(Math.random() * 99999999999).toString().padStart(11, '0');
  return `P${digits}`;
}

/**
 * 랜덤 전화번호 생성
 */
function generatePhoneNumber(): string {
  const middle = Math.floor(Math.random() * 9000 + 1000);
  const last = Math.floor(Math.random() * 9000 + 1000);
  return `010-${middle}-${last}`;
}

/**
 * 랜덤 주소 생성
 */
function generateAddress(): { 
  zipCode: string; 
  address: string; 
  addressDetail: string; 
} {
  const cities = [
    { city: '서울특별시', districts: ['강남구', '강동구', '강북구', '서초구', '송파구', '마포구', '영등포구', '종로구'] },
    { city: '경기도', districts: ['성남시', '수원시', '용인시', '고양시', '안양시', '부천시', '화성시', '파주시'] },
    { city: '부산광역시', districts: ['해운대구', '수영구', '사하구', '동래구', '부산진구', '남구', '중구'] },
    { city: '인천광역시', districts: ['남동구', '부평구', '계양구', '연수구', '서구', '미추홀구'] },
  ];

  const selectedCity = cities[Math.floor(Math.random() * cities.length)];
  const district = selectedCity.districts[Math.floor(Math.random() * selectedCity.districts.length)];
  const road = ['테헤란로', '강남대로', '올림픽로', '한강대로', '디지털로', '서초대로'][Math.floor(Math.random() * 6)];
  const building = Math.floor(Math.random() * 500 + 1);
  const unit = Math.floor(Math.random() * 2000 + 101);

  return {
    zipCode: Math.floor(Math.random() * 90000 + 10000).toString(),
    address: `${selectedCity.city} ${district} ${road} ${building}`,
    addressDetail: `${unit}호`
  };
}

/**
 * 데이터베이스 초기화 및 시드 데이터 생성
 */
export async function seedDatabase() {
  console.log('🚀 Starting database seeding...');

  try {
    // 1. 기존 데이터 삭제 (순서 중요 - 외래키 제약)
    console.log('🧹 Cleaning existing data...');
    await supabase.from('inventory_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('cashbook_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('shipments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('cashbook_types').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. 카테고리 생성 (PRD 기반)
    console.log('📁 Creating categories...');
    const categories = [
      { code: 'louis_vuitton', name: 'Louis Vuitton', name_ko: 'Louis Vuitton', name_zh: '路易威登', display_order: 1 },
      { code: 'gucci', name: 'Gucci', name_ko: 'Gucci', name_zh: '古驰', display_order: 2 },
      { code: 'chanel', name: 'Chanel', name_ko: 'Chanel', name_zh: '香奈儿', display_order: 3 },
      { code: 'hermes', name: 'Hermes', name_ko: 'Hermes', name_zh: '爱马仕', display_order: 4 },
      { code: 'burberry', name: 'Burberry', name_ko: 'Burberry', name_zh: '博柏利', display_order: 5 },
      { code: 'prada', name: 'Prada', name_ko: 'Prada', name_zh: '普拉达', display_order: 6 },
      { code: 'dior', name: 'Dior', name_ko: 'Dior', name_zh: '迪奥', display_order: 7 },
      { code: 'balenciaga', name: 'Balenciaga', name_ko: 'Balenciaga', name_zh: '巴黎世家', display_order: 8 },
      { code: 'other', name: '기타', name_ko: '기타', name_zh: '其他', display_order: 999 }
    ];

    const { data: createdCategories } = await supabase
      .from('categories')
      .insert(categories)
      .select();

    // 3. 출납유형 생성
    console.log('💰 Creating cashbook types...');
    const cashbookTypes = [
      { code: 'sale', name_ko: '판매', name_zh: '销售', type: 'income', color: '#10B981', display_order: 1, is_system: true },
      { code: 'refund_cancel', name_ko: '환불취소', name_zh: '退款取消', type: 'income', color: '#059669', display_order: 2, is_system: true },
      { code: 'other_income', name_ko: '기타수입', name_zh: '其他收入', type: 'income', color: '#14B8A6', display_order: 3, is_system: true },
      { code: 'inbound', name_ko: '입고', name_zh: '入库', type: 'expense', color: '#EF4444', display_order: 10, is_system: true },
      { code: 'refund', name_ko: '환불', name_zh: '退款', type: 'expense', color: '#DC2626', display_order: 11, is_system: true },
      { code: 'shipping', name_ko: '배송비', name_zh: '运费', type: 'expense', color: '#F59E0B', display_order: 12, is_system: true },
      { code: 'operation_cost', name_ko: '운영비', name_zh: '运营费', type: 'expense', color: '#F97316', display_order: 13, is_system: true },
      { code: 'other_expense', name_ko: '기타지출', name_zh: '其他支出', type: 'expense', color: '#FB923C', display_order: 14, is_system: true },
      { code: 'adjustment', name_ko: '조정', name_zh: '调整', type: 'adjustment', color: '#6B7280', display_order: 20, is_system: true }
    ];

    await supabase.from('cashbook_types').insert(cashbookTypes);

    // 4. 상품 생성 (100개+)
    console.log('📦 Creating products...');
    const products = [];
    const productTypes = [
      { type: '가방', type_zh: '包', models: ['Speedy', 'Neverfull', 'Alma', 'Keepall', 'Capucines'] },
      { type: '지갑', type_zh: '钱包', models: ['Zippy', 'Sarah', 'Clemence', 'Multiple', 'Brazza'] },
      { type: '신발', type_zh: '鞋', models: ['Sneaker', 'Loafer', 'Boot', 'Pump', 'Sandal'] },
      { type: '액세서리', type_zh: '配饰', models: ['Belt', 'Scarf', 'Keychain', 'Bracelet', 'Ring'] },
      { type: '의류', type_zh: '服装', models: ['Coat', 'Jacket', 'Dress', 'Shirt', 'Pants'] }
    ];

    const colors = [
      { ko: '블랙', zh: '黑色', en: 'Black' },
      { ko: '브라운', zh: '棕色', en: 'Brown' },
      { ko: '베이지', zh: '米色', en: 'Beige' },
      { ko: '화이트', zh: '白色', en: 'White' },
      { ko: '레드', zh: '红色', en: 'Red' },
      { ko: '블루', zh: '蓝色', en: 'Blue' },
      { ko: '그린', zh: '绿色', en: 'Green' },
      { ko: '핑크', zh: '粉色', en: 'Pink' }
    ];

    let productIndex = 0;
    for (const category of createdCategories || []) {
      if (category.code === 'other') continue;
      
      for (const productType of productTypes) {
        for (const model of productType.models) {
          for (const color of colors.slice(0, 3)) { // 각 모델당 3개 색상
            productIndex++;
            if (productIndex > 120) break; // 120개 제한
            
            const sku = `${category.code.toUpperCase().slice(0, 3)}-${model.toUpperCase().slice(0, 3)}-${color.en.toUpperCase().slice(0, 3)}-${productIndex.toString().padStart(3, '0')}`;
            const baseCostCNY = Math.floor(Math.random() * 50000 + 5000);
            
            products.push({
              sku,
              category: category.code,
              category_id: category.id,
              name: `${category.name} ${model} ${productType.type}`,
              name_ko: `${category.name_ko} ${model} ${productType.type}`,
              name_zh: `${category.name_zh} ${model} ${productType.type_zh}`,
              model: model,
              color: color.en,
              color_ko: color.ko,
              color_zh: color.zh,
              brand: category.name,
              brand_ko: category.name_ko,
              brand_zh: category.name_zh,
              manufacturer: category.name,
              cost_cny: baseCostCNY,
              price_krw: Math.floor(baseCostCNY * 195 * 1.5), // 1.5배 마진
              exchange_rate: 195,
              low_stock_threshold: 5,
              on_hand: Math.floor(Math.random() * 50 + 10),
              is_active: true
            });
          }
          if (productIndex > 120) break;
        }
        if (productIndex > 120) break;
      }
    }

    const { data: createdProducts } = await supabase
      .from('products')
      .insert(products)
      .select();

    console.log(`✅ Created ${createdProducts?.length || 0} products`);

    // 5. 인벤토리 초기화
    console.log('📊 Initializing inventory...');
    const inventoryItems = createdProducts?.map(product => ({
      product_id: product.id,
      on_hand: product.on_hand,
      allocated: 0,
      location: 'MAIN'
    })) || [];

    await supabase.from('inventory').insert(inventoryItems);

    // 6. 주문 생성 (300개+)
    console.log('📝 Creating orders...');
    const orders = [];
    const orderItems = [];
    const shipments = [];
    const cashbookTransactions = [];
    
    const customerNames = [
      '김철수', '이영희', '박민수', '최지우', '정대한', '강민아', '조현우', '윤서연',
      '임도윤', '한지민', '서준호', '신유나', '권태양', '문소리', '배수지', '송민호'
    ];

    const orderStatuses = [
      { status: 'paid', weight: 0.2 },      // 20%
      { status: 'shipped', weight: 0.3 },   // 30%
      { status: 'delivered', weight: 0.3 }, // 30%
      { status: 'done', weight: 0.1 },      // 10%
      { status: 'refunded', weight: 0.05 }, // 5%
      { status: 'cancelled', weight: 0.05 } // 5%
    ];

    const couriers = ['CJ대한통운', '한진택배', '로젠택배', '우체국택배', '롯데택배'];
    const chinaCouriers = ['顺丰速运', '圆通速递', '中通快递', '韵达快递', '申通快递'];

    // 최근 30일간의 주문 생성
    const today = new Date();
    let totalOrderCount = 0;

    for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
      const orderDate = new Date(today);
      orderDate.setDate(orderDate.getDate() - daysAgo);
      
      // 하루에 8~15개 주문
      const dailyOrderCount = Math.floor(Math.random() * 8 + 8);
      
      for (let seq = 1; seq <= dailyOrderCount; seq++) {
        totalOrderCount++;
        if (totalOrderCount > 350) break; // 350개 제한
        
        const orderNo = generateOrderNumber(orderDate, seq);
        const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];
        const address = generateAddress();
        
        // 상태 결정 (가중치 기반)
        const rand = Math.random();
        let cumWeight = 0;
        let orderStatus = 'paid';
        for (const s of orderStatuses) {
          cumWeight += s.weight;
          if (rand < cumWeight) {
            orderStatus = s.status;
            break;
          }
        }

        // 1~3개 상품 주문
        const itemCount = Math.floor(Math.random() * 3 + 1);
        const selectedProducts = createdProducts
          ?.sort(() => Math.random() - 0.5)
          .slice(0, itemCount) || [];
        
        let totalAmount = 0;
        const orderItemsForThisOrder = [];

        for (const product of selectedProducts) {
          const quantity = Math.floor(Math.random() * 3 + 1);
          const unitPrice = product.price_krw;
          const itemTotal = unitPrice * quantity;
          totalAmount += itemTotal;

          orderItemsForThisOrder.push({
            product_id: product.id,
            sku: product.sku,
            product_name: product.name_ko,
            quantity,
            unit_price: unitPrice,
            total_price: itemTotal
          });
        }

        const order = {
          order_number: orderNo,
          customer_name: customerName,
          customer_phone: generatePhoneNumber(),
          customer_email: `${customerName.replace(/\s/g, '').toLowerCase()}@example.com`,
          customer_messenger_id: `kakao_${customerName.replace(/\s/g, '')}`,
          pccc: generatePCCC(),
          shipping_postal_code: address.zipCode,
          shipping_address_line1: address.address,
          shipping_address_line2: address.addressDetail,
          status: orderStatus,
          payment_method: ['card', 'bank_transfer', 'kakao_pay'][Math.floor(Math.random() * 3)],
          total_krw: totalAmount,
          shipping_fee_krw: orderStatus !== 'cancelled' ? 3000 : 0,
          customer_memo: Math.random() > 0.7 ? '빠른 배송 부탁드립니다' : null,
          created_at: orderDate.toISOString(),
          updated_at: orderDate.toISOString()
        };

        orders.push(order);

        // 배송 정보 생성 (shipped, delivered, done 상태만)
        if (['shipped', 'delivered', 'done'].includes(orderStatus)) {
          const shippedDate = new Date(orderDate);
          shippedDate.setDate(shippedDate.getDate() + 1);
          
          const shipment = {
            order_number: orderNo,
            customer_name: customerName,
            customer_phone: order.customer_phone,
            shipping_address: `${address.address} ${address.addressDetail}`,
            shipping_postal_code: address.zipCode,
            courier_korea: couriers[Math.floor(Math.random() * couriers.length)],
            tracking_number_korea: Math.floor(Math.random() * 9000000000000 + 1000000000000).toString(),
            courier_china: chinaCouriers[Math.floor(Math.random() * chinaCouriers.length)],
            tracking_number_china: 'SF' + Math.floor(Math.random() * 9000000000 + 1000000000).toString(),
            status: orderStatus === 'shipped' ? 'in_transit' : 'delivered',
            shipped_at: shippedDate.toISOString(),
            delivered_at: orderStatus !== 'shipped' ? new Date(shippedDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() : null,
            notes: '정상 배송',
            created_at: shippedDate.toISOString()
          };
          shipments.push(shipment);
        }

        // 출납장부 기록 생성
        if (orderStatus !== 'cancelled') {
          // 판매 수입
          cashbookTransactions.push({
            transaction_date: orderDate.toISOString().split('T')[0],
            type: 'sale',
            amount: totalAmount,
            currency: 'KRW',
            fx_rate: 1,
            amount_krw: totalAmount,
            description: `주문 판매 - ${customerName}`,
            reference_type: 'order',
            notes: `주문번호: ${orderNo}`,
            created_at: orderDate.toISOString()
          });

          // 환불 처리
          if (orderStatus === 'refunded') {
            const refundDate = new Date(orderDate);
            refundDate.setDate(refundDate.getDate() + 5);
            
            cashbookTransactions.push({
              transaction_date: refundDate.toISOString().split('T')[0],
              type: 'refund',
              amount: -totalAmount,
              currency: 'KRW',
              fx_rate: 1,
              amount_krw: -totalAmount,
              description: `주문 환불 - ${customerName}`,
              reference_type: 'order',
              notes: `주문번호: ${orderNo} 환불`,
              created_at: refundDate.toISOString()
            });
          }
        }
      }
      if (totalOrderCount > 350) break;
    }

    // 주문 생성
    const { data: createdOrders } = await supabase
      .from('orders')
      .insert(orders)
      .select();

    console.log(`✅ Created ${createdOrders?.length || 0} orders`);

    // 주문 아이템 생성
    if (createdOrders) {
      for (let i = 0; i < createdOrders.length; i++) {
        const order = createdOrders[i];
        const itemCount = Math.floor(Math.random() * 3 + 1);
        const selectedProducts = createdProducts
          ?.sort(() => Math.random() - 0.5)
          .slice(0, itemCount) || [];
        
        for (const product of selectedProducts) {
          const quantity = Math.floor(Math.random() * 3 + 1);
          orderItems.push({
            order_id: order.id,
            product_id: product.id,
            sku: product.sku,
            product_name: product.name_ko,
            quantity,
            unit_price: product.price_krw,
            total_price: product.price_krw * quantity
          });
        }
      }

      await supabase.from('order_items').insert(orderItems);
      console.log(`✅ Created ${orderItems.length} order items`);
    }

    // 배송 정보 생성
    if (shipments.length > 0) {
      // order_id 매핑
      const shipmentsWithOrderId = shipments.map(shipment => {
        const order = createdOrders?.find(o => o.order_number === shipment.order_number);
        return {
          ...shipment,
          order_id: order?.id
        };
      });

      await supabase.from('shipments').insert(shipmentsWithOrderId);
      console.log(`✅ Created ${shipments.length} shipments`);
    }

    // 출납장부 생성
    if (cashbookTransactions.length > 0) {
      // reference_id 매핑
      const transactionsWithRefId = cashbookTransactions.map(transaction => {
        if (transaction.reference_type === 'order' && transaction.notes) {
          const orderNoMatch = transaction.notes.match(/주문번호: ([\d-]+)/);
          if (orderNoMatch) {
            const order = createdOrders?.find(o => o.order_number === orderNoMatch[1]);
            return {
              ...transaction,
              reference_id: order?.id
            };
          }
        }
        return transaction;
      });

      await supabase.from('cashbook_transactions').insert(transactionsWithRefId);
      console.log(`✅ Created ${cashbookTransactions.length} cashbook transactions`);
    }

    // 7. 재고 이동 기록 생성
    console.log('📈 Creating inventory movements...');
    const movements = [];
    
    // 각 상품에 대해 초기 입고 기록
    for (const product of createdProducts || []) {
      movements.push({
        product_id: product.id,
        type: 'inbound',
        quantity: product.on_hand + 20, // 초기 재고 + 추가
        reference_type: 'manual',
        notes: '초기 재고 입고',
        created_at: new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // 주문에 따른 출고 기록
    for (const orderItem of orderItems.slice(0, 100)) { // 샘플로 100개만
      movements.push({
        product_id: orderItem.product_id,
        type: 'outbound',
        quantity: -orderItem.quantity,
        reference_type: 'order',
        reference_id: orderItem.order_id,
        notes: '주문 출고'
      });
    }

    await supabase.from('inventory_movements').insert(movements);
    console.log(`✅ Created ${movements.length} inventory movements`);

    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Summary:
      - Categories: ${createdCategories?.length || 0}
      - Products: ${createdProducts?.length || 0}
      - Orders: ${createdOrders?.length || 0}
      - Order Items: ${orderItems.length}
      - Shipments: ${shipments.length}
      - Cashbook Transactions: ${cashbookTransactions.length}
      - Inventory Movements: ${movements.length}
    `);

    return {
      categories: createdCategories,
      products: createdProducts,
      orders: createdOrders
    };

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

/**
 * 테스트용 관리자 계정 생성
 */
export async function createTestAdmin() {
  const email = 'admin@test.com';
  const password = 'Test1234!';

  try {
    // Supabase Auth로 사용자 생성
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;

    // user_profiles에 프로필 생성
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        email,
        name: '테스트 관리자',
        role: 'admin',
        is_active: true
      })
      .select()
      .single();

    if (profileError) throw profileError;

    console.log('✅ Test admin created:', email);
    return { email, password, profile };
  } catch (error) {
    console.error('❌ Error creating test admin:', error);
    throw error;
  }
}

/**
 * 테스트 데이터 정리
 */
export async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');

  try {
    // 역순으로 삭제 (외래키 제약)
    await supabase.from('inventory_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('cashbook_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('shipments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('✅ Test data cleaned up successfully');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    throw error;
  }
}

// CLI 실행 지원
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'seed':
      seedDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    
    case 'cleanup':
      cleanupTestData()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    
    case 'create-admin':
      createTestAdmin()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    
    default:
      console.log(`
        Usage:
          npx ts-node e2e/test-helpers.ts seed       # Seed database with test data
          npx ts-node e2e/test-helpers.ts cleanup    # Clean up test data
          npx ts-node e2e/test-helpers.ts create-admin # Create test admin account
      `);
      process.exit(1);
  }
}