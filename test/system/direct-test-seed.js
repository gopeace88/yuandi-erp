#!/usr/bin/env node

/**
 * 직접 테스트 데이터 생성 - HTTP API 사용
 * 상품 100건, 주문 1000건, 송장 500건 생성
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 환경 변수 로드
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

// Supabase REST API 호출 함수
async function supabaseRequest(method, path, body = null) {
  const url = new URL(supabaseUrl);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: 443,
      path: `/rest/v1${path}`,
      method: method,
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = data ? JSON.parse(data) : null;
            resolve({ success: true, data: result, status: res.statusCode });
          } catch (e) {
            resolve({ success: true, data: data, status: res.statusCode });
          }
        } else {
          console.error(`API Error (${res.statusCode}):`, data);
          resolve({ success: false, error: data, status: res.statusCode });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// SKU 생성 함수
function generateSKU(category, model, color, brand) {
  const catCode = category.substring(0, 3).toUpperCase();
  const modelCode = model ? model.substring(0, 3).toUpperCase() : 'XXX';
  const colorCode = color ? color.substring(0, 2).toUpperCase() : 'XX';
  const brandCode = brand ? brand.substring(0, 3).toUpperCase() : 'XXX';
  const hash = crypto.randomBytes(2).toString('hex').toUpperCase();
  
  return `${catCode}-${modelCode}-${colorCode}-${brandCode}-${hash}`;
}

// 주문 번호 생성
function generateOrderNumber(index) {
  const date = new Date();
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(index + 1).padStart(3, '0');
  
  return `ORD-${year}${month}${day}-${seq}`;
}

// 랜덤 선택 헬퍼
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Phase 1: 상품 데이터 생성 (100건)
async function seedProducts() {
  console.log('\n📦 Phase 1: 상품 데이터 생성 (100건)');
  
  const categories = ['가방', '신발', '의류', '액세서리', '화장품', '전자제품', '잡화'];
  const brands = ['Nike', 'Adidas', 'Gucci', 'LV', 'Chanel', 'Apple', 'Samsung', 'Prada'];
  const colors = ['Black', 'White', 'Red', 'Blue', 'Green', 'Brown', 'Gray', 'Pink'];
  
  const products = [];
  let successCount = 0;
  
  for (let i = 0; i < 100; i++) {
    const category = randomChoice(categories);
    const brand = randomChoice(brands);
    const color = randomChoice(colors);
    const model = `Model-${i + 1}`;
    
    const product = {
      category,
      name: `${brand} ${category} ${model}`,
      model,
      color,
      brand,  // Changed from 'manufacturer'
      sku: generateSKU(category, model, color, brand),
      cost_cny: randomBetween(100, 5000),
      sale_price_krw: randomBetween(20000, 1000000),  // Changed from 'price_krw'
      on_hand: randomBetween(5, 50),
      low_stock_threshold: 5,  // Changed from 'reorder_point'
      barcode: `BAR${randomBetween(100000000, 999999999)}`,
      active: true,  // Changed from 'is_active'
      created_at: new Date().toISOString()
    };
    
    const result = await supabaseRequest('POST', '/products', product);
    
    if (result.success) {
      successCount++;
      products.push(result.data[0] || result.data);
      process.stdout.write(`\r  생성 중: ${successCount}/100`);
    }
  }
  
  console.log(`\n  ✅ ${successCount}개 상품 생성 완료`);
  return products;
}

// Phase 2: 주문 데이터 생성 (1000건)
async function seedOrders(products) {
  console.log('\n📋 Phase 2: 주문 데이터 생성 (1000건)');
  
  const customerNames = [
    '김철수', '이영희', '박민수', '최지우', '정대한',
    '张伟', '李娜', '王芳', '刘洋', '陈静'
  ];
  
  const addresses = [
    '서울특별시 강남구 테헤란로 123',
    '서울특별시 서초구 서초대로 456',
    '경기도 성남시 분당구 판교로 789',
    '부산광역시 해운대구 해운대로 321',
    '인천광역시 연수구 송도로 654'
  ];
  
  let successCount = 0;
  
  for (let i = 0; i < 1000; i++) {
    const customerName = randomChoice(customerNames);
    const isKorean = !customerName.match(/[\u4e00-\u9fa5]/);
    
    // 주문 아이템 먼저 계산 (총액 계산을 위해)
    let orderTotal = 0;
    const orderItems = [];
    
    if (products.length > 0) {
      const itemCount = randomBetween(1, 3);
      for (let j = 0; j < itemCount; j++) {
        const product = randomChoice(products);
        const quantity = randomBetween(1, 3);
        const unitPrice = product.sale_price_krw || randomBetween(20000, 100000);
        const subtotal = unitPrice * quantity;
        
        orderItems.push({
          product,
          quantity,
          unitPrice,
          subtotal
        });
        
        orderTotal += subtotal;
      }
    }
    
    // 주문 생성 (계산된 총액 사용)
    const order = {
      order_no: generateOrderNumber(i),  // Changed from 'order_number'
      order_date: new Date(Date.now() - randomBetween(0, 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customer_name: customerName,
      customer_phone: `010${randomBetween(1000, 9999)}${randomBetween(1000, 9999)}`,
      customer_email: `customer${i}@test.com`,
      shipping_address: randomChoice(addresses),
      zip_code: String(randomBetween(10000, 99999)),  // Changed from 'shipping_postcode'
      pccc_code: isKorean 
        ? `P${randomBetween(100000000000, 999999999999)}` 
        : `C${randomBetween(100000000000, 999999999999)}`,  // Chinese customers also get PCCC
      status: randomChoice(['PAID', 'PAID', 'PAID', 'SHIPPED', 'DONE', 'REFUNDED']),  // More PAID status
      total_amount: orderTotal || randomBetween(50000, 1000000),  // Use calculated total
      currency: 'KRW',
      customer_memo: `고객 메모 #${i + 1}`,
      internal_memo: `테스트 주문 #${i + 1}`,  // Changed from 'notes'
      created_at: new Date(Date.now() - randomBetween(0, 30) * 24 * 60 * 60 * 1000).toISOString()
    };
    
    const result = await supabaseRequest('POST', '/orders', order);
    
    if (result.success) {
      successCount++;
      
      // 주문 아이템 생성 (미리 계산된 아이템 사용)
      const orderId = result.data[0]?.id || result.data.id;
      if (orderId && orderItems.length > 0) {
        for (const item of orderItems) {
          const orderItem = {
            order_id: orderId,
            product_id: item.product.id,
            sku: item.product.sku,  // Changed from product_sku
            product_name: item.product.name,
            product_category: item.product.category,
            product_model: item.product.model,
            product_color: item.product.color,
            product_brand: item.product.brand,
            quantity: item.quantity,
            unit_price: item.unitPrice,  // Changed from price
            subtotal: item.subtotal
          };
          
          await supabaseRequest('POST', '/order_items', orderItem);
        }
      }
      
      process.stdout.write(`\r  생성 중: ${successCount}/1000`);
    }
    
    // Rate limiting
    if (i % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n  ✅ ${successCount}개 주문 생성 완료`);
  return successCount;
}

// Phase 3: 송장 데이터 생성 (500건)
async function seedShipments() {
  console.log('\n🚚 Phase 3: 송장 데이터 생성 (500건)');
  
  // 배송 가능한 주문 조회
  const ordersResult = await supabaseRequest('GET', '/orders?status=in.(PAID,SHIPPED)&limit=500');
  
  if (!ordersResult.success || !ordersResult.data || ordersResult.data.length === 0) {
    console.log('  ⚠️  배송 가능한 주문이 없습니다.');
    return 0;
  }
  
  const orders = ordersResult.data;
  const couriers = [
    { name: 'CJ대한통운', code: 'cj' },
    { name: '한진택배', code: 'hanjin' },
    { name: '우체국택배', code: 'epost' },
    { name: '롯데택배', code: 'lotte' }
  ];
  
  let successCount = 0;
  const targetCount = Math.min(500, orders.length);
  
  for (let i = 0; i < targetCount; i++) {
    const order = orders[i];
    const courier = randomChoice(couriers);
    const trackingNo = `${Date.now()}${randomBetween(1000, 9999)}`;
    
    const shipment = {
      order_id: order.id,
      courier: courier.name,
      courier_code: courier.code,
      tracking_no: trackingNo,
      tracking_url: `https://tracker.delivery/#/${courier.code}/${trackingNo}`,
      shipped_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    const result = await supabaseRequest('POST', '/shipments', shipment);
    
    if (result.success) {
      successCount++;
      
      // 주문 상태 업데이트
      const deliveryStatus = randomChoice(['SHIPPED', 'SHIPPED', 'DONE']);
      await supabaseRequest('PATCH', `/orders?id=eq.${order.id}`, { 
        status: deliveryStatus
      });
      
      if (deliveryStatus === 'DONE') {
        await supabaseRequest('PATCH', `/shipments?id=eq.${result.data[0]?.id || result.data.id}`, { 
          delivered_at: new Date().toISOString()
        });
      }
      
      process.stdout.write(`\r  생성 중: ${successCount}/${targetCount}`);
    }
    
    // Rate limiting
    if (i % 20 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n  ✅ ${successCount}개 송장 생성 완료`);
  return successCount;
}

// 생성된 데이터 통계
async function showStatistics() {
  console.log('\n📊 생성된 데이터 통계:');
  
  const tables = ['products', 'orders', 'order_items', 'shipments', 'inventory_movements', 'cashbook'];
  
  for (const table of tables) {
    const result = await supabaseRequest('GET', `/${table}?select=id&limit=1`);
    if (result.success && result.data) {
      // Get count from a different approach
      const countResult = await supabaseRequest('GET', `/${table}?select=*&limit=1000`);
      if (countResult.success && countResult.data) {
        console.log(`  • ${table}: ${countResult.data.length}건`);
      }
    }
  }
}

// 메인 실행 함수
async function main() {
  console.log('========================================');
  console.log('   테스트 데이터 생성 시작');
  console.log('========================================');
  
  try {
    const startTime = Date.now();
    
    // 1. 상품 데이터 생성
    const products = await seedProducts();
    
    // 2. 주문 데이터 생성
    await seedOrders(products);
    
    // 3. 송장 데이터 생성
    await seedShipments();
    
    // 4. 통계 표시
    await showStatistics();
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ 모든 테스트 데이터 생성 완료!');
    console.log(`   총 실행 시간: ${totalTime}초`);
    console.log('\n📝 다음 단계:');
    console.log('   node test/system/direct-test-verify.js');
    
  } catch (error) {
    console.error('\n❌ 데이터 생성 중 오류:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { seedProducts, seedOrders, seedShipments };