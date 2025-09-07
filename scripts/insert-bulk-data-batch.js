#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertBulkDataBatch() {
    console.log('🚀 대량 테스트 데이터 배치 생성 시작...');
    
    try {
        // 1. 기존 데이터 삭제 (사용자 계정 제외)
        console.log('📝 기존 데이터 삭제 중...');
        
        const tables = [
            'cashbook_transactions', 'event_logs', 'inventory_transactions',
            'order_items', 'orders', 'inventory', 'products', 
            'product_categories', 'shipment_tracking_events', 
            'shipments', 'system_settings'
        ];
        
        for (const table of tables) {
            const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) console.log(`${table} 삭제 오류 (무시):`, error.message);
        }
        
        // user_profiles에서 admin@yuandi.com이 아닌 사용자 삭제
        await supabase.from('user_profiles').delete().neq('email', 'admin@yuandi.com');

        // 2. 카테고리 데이터 생성 (배치)
        console.log('📂 카테고리 데이터 생성 중...');
        const categories = [
            { name: '가방', description: '각종 가방 제품', is_active: true },
            { name: '신발', description: '운동화 및 구두', is_active: true },
            { name: '화장품', description: '스킨케어 및 메이크업', is_active: true },
            { name: '전자제품', description: '스마트폰 액세서리', is_active: true },
            { name: '의류', description: '남녀 의류', is_active: true },
            { name: '시계', description: '손목시계 및 스마트워치', is_active: true },
            { name: '액세서리', description: '목걸이, 반지 등', is_active: true },
            { name: '건강식품', description: '비타민 및 영양제', is_active: true },
            { name: '주방용품', description: '조리도구 및 식기', is_active: true },
            { name: '완구', description: '어린이 장난감', is_active: true }
        ];

        const { data: categoriesData } = await supabase
            .from('product_categories')
            .upsert(categories, { onConflict: 'name' })
            .select();

        console.log(`✅ 카테고리 ${categoriesData.length}개 생성 완료`);

        // 3. 상품 데이터 배치 생성 (500개)
        console.log('📦 상품 데이터 배치 생성 중...');
        const brands = ['나이키', '아디다스', '구찌', '샤넬', '루이비통', '에르메스', '프라다', '버버리', '코치', '발렌시아가'];
        const colors = ['블랙', '화이트', '레드', '블루', '그린', '옐로우', '핑크', '그레이', '브라운', '네이비'];
        const models = ['2024-A', '2024-B', 'PRO-X', 'SLIM', 'MAX', 'PLUS', 'LITE', 'ULTRA', 'CLASSIC', 'PREMIUM'];

        // 배치 크기
        const batchSize = 50;
        const totalProducts = 500;
        
        for (let batch = 0; batch < Math.ceil(totalProducts / batchSize); batch++) {
            const products = [];
            const inventory = [];
            
            for (let i = 1; i <= batchSize && (batch * batchSize + i) <= totalProducts; i++) {
                const productIndex = batch * batchSize + i;
                const category = categoriesData[productIndex % categoriesData.length];
                const brand = brands[productIndex % brands.length];
                const color = colors[productIndex % colors.length];
                const model = models[productIndex % models.length];
                
                const costCny = 100 + (productIndex * 10);
                const priceKrw = costCny * 180;
                const weight = 200 + (productIndex * 5);
                
                const productId = `${Date.now()}-${productIndex}`;
                
                products.push({
                    category_id: category.id,
                    sku: `SKU-${productIndex.toString().padStart(5, '0')}`,
                    name: `상품명 ${productIndex}`,
                    model: model,
                    color: color,
                    manufacturer: `제조사 ${(productIndex % 20) + 1}`,
                    brand: brand,
                    cost_cny: costCny,
                    price_krw: priceKrw,
                    weight_g: weight,
                    dimensions_cm: `10x8x${5 + (productIndex % 10)}`,
                    description: `테스트 상품 ${productIndex}번입니다. 고품질 제품으로 인기가 많습니다.`,
                    low_stock_threshold: 5,
                    notes: `테스트 노트 ${productIndex}`,
                    is_active: true
                });
            }
            
            // 상품 배치 삽입
            const { data: batchProducts, error: productError } = await supabase
                .from('products')
                .insert(products)
                .select('id');
            
            if (productError) {
                console.error(`배치 ${batch + 1} 상품 생성 오류:`, productError);
                continue;
            }
            
            // 재고 배치 삽입
            const inventoryData = batchProducts.map((product, index) => ({
                product_id: product.id,
                on_hand: 50 + ((batch * batchSize + index + 1) % 100),
                allocated: 0
            }));
            
            await supabase.from('inventory').insert(inventoryData);
            
            console.log(`배치 ${batch + 1}/${Math.ceil(totalProducts / batchSize)} 완료 (상품 ${batchProducts.length}개)`);
        }

        // 4. 주문 데이터 배치 생성 (500개)
        console.log('🛒 주문 데이터 배치 생성 중...');
        
        const customerNames = ['김철수', '이영희', '박지민', '최수현', '정하나', '강민준', '윤서연', '임도윤', '황예진', '송지우'];
        const customerPhones = ['010-1234-5678', '010-2345-6789', '010-3456-7890', '010-4567-8901', '010-5678-9012'];
        const addresses = ['서울시 강남구 테헤란로 123', '서울시 서초구 서초대로 456', '서울시 송파구 올림픽로 789', '경기도 성남시 분당구 판교로 321', '인천시 연수구 송도대로 654'];
        const cities = ['서울', '서울', '서울', '성남', '인천'];
        const states = ['서울특별시', '서울특별시', '서울특별시', '경기도', '인천광역시'];
        const statuses = ['paid', 'shipped', 'done', 'paid', 'shipped'];
        const couriers = ['cj', 'hanjin', 'logen', 'cway', 'kdexp'];

        // 상품 데이터 가져오기
        const { data: productsData } = await supabase
            .from('products')
            .select('id, price_krw')
            .limit(100); // 처음 100개만 사용

        const totalOrders = 500;
        
        for (let batch = 0; batch < Math.ceil(totalOrders / batchSize); batch++) {
            const orders = [];
            
            for (let i = 1; i <= batchSize && (batch * batchSize + i) <= totalOrders; i++) {
                const orderIndex = batch * batchSize + i;
                const customerName = customerNames[orderIndex % customerNames.length];
                const customerPhone = customerPhones[orderIndex % customerPhones.length];
                const address = addresses[orderIndex % addresses.length];
                const city = cities[orderIndex % cities.length];
                const state = states[orderIndex % states.length];
                const status = statuses[orderIndex % statuses.length];
                const courier = couriers[orderIndex % couriers.length];
                
                const orderDate = new Date(Date.now() - (totalOrders - orderIndex) * 24 * 60 * 60 * 1000);
                const orderNumber = `ORD-${orderDate.toISOString().slice(2, 8)}-${orderIndex.toString().padStart(3, '0')}`;
                const pccc = `P${orderIndex.toString().padStart(11, '0')}`;
                const trackingNumber = (status === 'shipped' || status === 'done') ? `TRK${orderIndex.toString().padStart(10, '0')}` : null;
                
                // 랜덤 상품 가격으로 총액 계산
                const randomProduct = productsData[orderIndex % productsData.length];
                const subtotal = randomProduct.price_krw * (1 + (orderIndex % 2));
                const shippingFee = orderIndex % 3 === 0 ? 3000 : 0;
                const total = subtotal + shippingFee;
                
                orders.push({
                    order_number: orderNumber,
                    customer_name: `${customerName} ${orderIndex}`,
                    customer_phone: customerPhone,
                    customer_email: `customer${orderIndex}@example.com`,
                    shipping_address_line1: `${address} ${orderIndex}동 ${100 + orderIndex}호`,
                    shipping_city: city,
                    shipping_state: state,
                    shipping_postal_code: ((10000 + orderIndex * 10) % 99999).toString().padStart(5, '0'),
                    pccc: pccc,
                    status: status,
                    subtotal_krw: subtotal,
                    shipping_fee_krw: shippingFee,
                    total_krw: total,
                    payment_method: 'card',
                    paid_at: orderDate.toISOString(),
                    courier: (status === 'shipped' || status === 'done') ? courier : null,
                    tracking_number: trackingNumber,
                    notes: `테스트 주문 ${orderIndex}`
                });
            }
            
            // 주문 배치 삽입
            const { data: batchOrders, error: orderError } = await supabase
                .from('orders')
                .insert(orders)
                .select('id');
            
            if (orderError) {
                console.error(`배치 ${batch + 1} 주문 생성 오류:`, orderError);
                continue;
            }
            
            // 주문 아이템 배치 삽입
            const orderItems = [];
            for (let j = 0; j < batchOrders.length; j++) {
                const order = batchOrders[j];
                const orderIndex = batch * batchSize + j + 1;
                const product = productsData[orderIndex % productsData.length];
                const quantity = 1 + (orderIndex % 2);
                
                orderItems.push({
                    order_id: order.id,
                    product_id: product.id,
                    quantity: quantity,
                    unit_price_krw: product.price_krw,
                    total_price_krw: product.price_krw * quantity
                });
            }
            
            await supabase.from('order_items').insert(orderItems);
            
            console.log(`배치 ${batch + 1}/${Math.ceil(totalOrders / batchSize)} 완료 (주문 ${batchOrders.length}개)`);
        }

        console.log('✅ 대량 테스트 데이터 생성 완료!');
        console.log('📊 생성된 데이터:');
        console.log('- 카테고리: 10개');
        console.log('- 상품: 500개');
        console.log('- 주문: 500개');
        console.log('- 주문 아이템: 500개');
        console.log('- 재고: 500개');
        
    } catch (error) {
        console.error('❌ 대량 데이터 생성 중 오류:', error);
    }
}

// 스크립트 실행
insertBulkDataBatch().then(() => {
    console.log('🎉 배치 처리 완료');
    process.exit(0);
}).catch((error) => {
    console.error('❌ 배치 처리 실패:', error);
    process.exit(1);
});