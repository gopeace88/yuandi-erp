const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 환경 변수 로드
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// SQL 실행 함수 제거 - Supabase REST API 사용

async function insertTestData() {
    console.log('🚀 테스트 데이터 생성 시작...');

    try {
        // 1. 기존 데이터 삭제 (사용자 계정 제외)
        console.log('📝 기존 데이터 삭제 중...');

        // 각 테이블의 데이터를 개별적으로 삭제
        const tables = [
            'cashbook_transactions',
            'event_logs',
            'inventory_transactions',
            'order_items',
            'orders',
            'inventory',
            'products',
            'product_categories',
            'shipment_tracking_events',
            'shipments',
            'system_settings'
        ];

        for (const table of tables) {
            console.log(`${table} 테이블 데이터 삭제 중...`);
            const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) {
                console.log(`${table} 삭제 오류 (무시):`, error.message);
            }
        }

        // user_profiles에서 admin@yuandi.com이 아닌 사용자 삭제
        const { error: userError } = await supabase
            .from('user_profiles')
            .delete()
            .neq('email', 'admin@yuandi.com');

        if (userError) {
            console.log('사용자 삭제 오류 (무시):', userError.message);
        }

        // 2. 카테고리 데이터 생성
        console.log('📂 카테고리 데이터 생성 중...');
        const categories = [
            ['가방', '각종 가방 제품', true],
            ['신발', '운동화 및 구두', true],
            ['화장품', '스킨케어 및 메이크업', true],
            ['전자제품', '스마트폰 액세서리', true],
            ['의류', '남녀 의류', true],
            ['시계', '손목시계 및 스마트워치', true],
            ['액세서리', '목걸이, 반지 등', true],
            ['건강식품', '비타민 및 영양제', true],
            ['주방용품', '조리도구 및 식기', true],
            ['완구', '어린이 장난감', true]
        ];

        for (const [name, description, isActive] of categories) {
            const { error } = await supabase
                .from('product_categories')
                .upsert({
                    name: name,
                    description: description,
                    is_active: isActive
                }, { onConflict: 'name' });

            if (error) {
                console.log(`카테고리 ${name} 생성 오류:`, error.message);
            }
        }

        // 3. 상품 데이터 생성 (20개)
        console.log('📦 상품 데이터 생성 중...');
        const brands = ['나이키', '아디다스', '구찌', '샤넬', '루이비통', '에르메스', '프라다', '버버리', '코치', '발렌시아가'];
        const colors = ['블랙', '화이트', '레드', '블루', '그린', '옐로우', '핑크', '그레이', '브라운', '네이비'];
        const models = ['2024-A', '2024-B', 'PRO-X', 'SLIM', 'MAX', 'PLUS', 'LITE', 'ULTRA', 'CLASSIC', 'PREMIUM'];

        // 먼저 카테고리 ID 가져오기
        const { data: categoriesData } = await supabase
            .from('product_categories')
            .select('id, name');

        if (!categoriesData || categoriesData.length === 0) {
            console.error('❌ 카테고리 데이터가 없습니다.');
            return;
        }

        for (let i = 1; i <= 20; i++) {
            const category = categoriesData[i % categoriesData.length];
            const brand = brands[i % brands.length];
            const color = colors[i % colors.length];
            const model = models[i % models.length];

            const costCny = 100 + (i * 10);
            const priceKrw = costCny * 180;
            const weight = 200 + (i * 5);

            const { data: product, error: productError } = await supabase
                .from('products')
                .upsert({
                    category_id: category.id,
                    sku: `SKU-${i.toString().padStart(5, '0')}`,
                    name: `상품명 ${i}`,
                    model: model,
                    color: color,
                    manufacturer: `제조사 ${(i % 20) + 1}`,
                    brand: brand,
                    cost_cny: costCny,
                    price_krw: priceKrw,
                    weight_g: weight,
                    dimensions_cm: `10x8x${5 + (i % 10)}`,
                    description: `테스트 상품 ${i}번입니다. 고품질 제품으로 인기가 많습니다.`,
                    low_stock_threshold: 5,
                    notes: `테스트 노트 ${i}`,
                    is_active: true
                }, { onConflict: 'sku' })
                .select()
                .single();

            if (productError) {
                console.error(`상품 ${i} 생성 오류:`, productError);
                continue;
            }

            // 재고 데이터 생성
            await supabase
                .from('inventory')
                .insert({
                    product_id: product.id,
                    on_hand: 50 + (i % 100),
                    allocated: 0
                });
        }

        // 4. 주문 데이터 생성 (10개)
        console.log('🛒 주문 데이터 생성 중...');
        const customerNames = ['김철수', '이영희', '박지민', '최수현', '정하나', '강민준', '윤서연', '임도윤', '황예진', '송지우'];
        const customerPhones = ['010-1234-5678', '010-2345-6789', '010-3456-7890', '010-4567-8901', '010-5678-9012'];
        const addresses = [
            '서울시 강남구 테헤란로 123',
            '서울시 서초구 서초대로 456',
            '서울시 송파구 올림픽로 789',
            '경기도 성남시 분당구 판교로 321',
            '인천시 연수구 송도대로 654'
        ];
        const cities = ['서울', '서울', '서울', '성남', '인천'];
        const states = ['서울특별시', '서울특별시', '서울특별시', '경기도', '인천광역시'];
        const statuses = ['paid', 'shipped', 'done', 'paid', 'shipped'];
        const couriers = ['cj', 'hanjin', 'logen', 'cway', 'kdexp'];

        // 상품 데이터 가져오기
        const { data: productsData } = await supabase
            .from('products')
            .select('id, price_krw');

        if (!productsData || productsData.length === 0) {
            console.error('❌ 상품 데이터가 없습니다.');
            return;
        }

        for (let i = 1; i <= 10; i++) {
            const customerName = customerNames[i % customerNames.length];
            const customerPhone = customerPhones[i % customerPhones.length];
            const address = addresses[i % addresses.length];
            const city = cities[i % cities.length];
            const state = states[i % states.length];
            const status = statuses[i % statuses.length];
            const courier = couriers[i % couriers.length];

            const orderNumber = `ORD-${new Date().toISOString().slice(2, 8)}-${i.toString().padStart(3, '0')}`;
            const pccc = `P${i.toString().padStart(11, '0')}`;
            const trackingNumber = status === 'shipped' || status === 'done' ? `TRK${i.toString().padStart(10, '0')}` : null;

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    order_number: orderNumber,
                    customer_name: `${customerName} ${i}`,
                    customer_phone: customerPhone,
                    customer_email: `customer${i}@example.com`,
                    shipping_address_line1: `${address} ${i}동 ${100 + i}호`,
                    shipping_city: city,
                    shipping_state: state,
                    shipping_postal_code: ((10000 + i * 10) % 99999).toString().padStart(5, '0'),
                    pccc: pccc,
                    status: status,
                    subtotal_krw: 0, // 나중에 업데이트
                    shipping_fee_krw: i % 3 === 0 ? 3000 : 0,
                    total_krw: 0, // 나중에 업데이트
                    payment_method: 'card',
                    paid_at: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000).toISOString(),
                    courier: (status === 'shipped' || status === 'done') ? courier : null,
                    tracking_number: trackingNumber,
                    notes: `테스트 주문 ${i}`
                })
                .select()
                .single();

            if (orderError) {
                console.error(`주문 ${i} 생성 오류:`, orderError);
                continue;
            }

            // 주문 아이템 생성 (1-2개)
            const itemCount = 1 + (i % 2);
            let subtotal = 0;

            for (let j = 0; j < itemCount; j++) {
                const product = productsData[j % productsData.length];
                const quantity = 1 + (j % 2);
                const totalPrice = product.price_krw * quantity;
                subtotal += totalPrice;

                await supabase
                    .from('order_items')
                    .insert({
                        order_id: order.id,
                        product_id: product.id,
                        quantity: quantity,
                        unit_price_krw: product.price_krw,
                        total_price_krw: totalPrice
                    });
            }

            // 주문 총액 업데이트
            const total = subtotal + (i % 3 === 0 ? 3000 : 0);
            await supabase
                .from('orders')
                .update({
                    subtotal_krw: subtotal,
                    total_krw: total
                })
                .eq('id', order.id);
        }

        // 5. 출납장부 데이터 생성
        console.log('💰 출납장부 데이터 생성 중...');
        
        // Admin 사용자 ID 가져오기
        const { data: adminUser } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', 'admin@yuandi.com')
            .single();
        
        if (!adminUser) {
            console.log('❌ Admin 사용자를 찾을 수 없습니다.');
            return;
        }
        
        const adminId = adminUser.id;
        const cashbookEntries = [];
        
        // 수입 데이터 (주문 결제)
        let balance = 0;
        for (let i = 1; i <= 10; i++) {
            const amount = 50000 + (i * 10000);
            balance += amount;
            cashbookEntries.push({
                type: 'income',
                category: 'sales',
                amount_krw: amount,
                balance_krw: balance,
                amount_cny: null,
                exchange_rate: 180,
                description: `주문 #${i} 결제 - 테스트 판매 수입`,
                transaction_date: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reference_type: 'order',
                reference_id: null,
                tags: ['판매', '수입'],
                created_by: adminId
            });
        }
        
        // 지출 데이터 (상품 구매)
        for (let i = 1; i <= 10; i++) {
            const cnyAmount = 200 + (i * 50);
            const krwAmount = cnyAmount * 180;
            balance -= krwAmount;
            cashbookEntries.push({
                type: 'expense',
                category: 'purchase',
                amount_krw: krwAmount,
                balance_krw: balance,
                amount_cny: cnyAmount,
                exchange_rate: 180,
                description: `상품 구매 #${i} - 테스트 구매 지출`,
                transaction_date: new Date(Date.now() - (15 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reference_type: 'purchase',
                reference_id: null,
                tags: ['구매', '지출'],
                created_by: adminId
            });
        }
        
        // 기타 지출 (운영비)
        balance -= 150000;
        cashbookEntries.push({
            type: 'expense',
            category: 'shipping',
            amount_krw: 150000,
            balance_krw: balance,
            amount_cny: null,
            exchange_rate: 180,
            description: '배송비 정산 - 월간 배송비',
            transaction_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reference_type: null,
            reference_id: null,
            tags: ['배송비', '운영비'],
            created_by: adminId
        });
        
        balance -= 200000;
        cashbookEntries.push({
            type: 'expense',
            category: 'operational',
            amount_krw: 200000,
            balance_krw: balance,
            amount_cny: null,
            exchange_rate: 180,
            description: '사무실 임대료 - 월간 임대료',
            transaction_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reference_type: null,
            reference_id: null,
            tags: ['임대료', '운영비'],
            created_by: adminId
        });
        
        // 출납장부 데이터 삽입
        for (const entry of cashbookEntries) {
            const { error } = await supabase
                .from('cashbook_transactions')
                .insert(entry);
            
            if (error) {
                console.log(`출납장부 항목 생성 오류:`, error.message);
            }
        }
        
        console.log('✅ 테스트 데이터 생성 완료!');
        console.log('📊 생성된 데이터:');
        console.log('- 카테고리: 10개');
        console.log('- 상품: 20개');
        console.log('- 주문: 10개');
        console.log('- 재고: 20개');
        console.log('- 출납장부: 22개');

    } catch (error) {
        console.error('❌ 테스트 데이터 생성 중 오류:', error);
    }
}

// 스크립트 실행
insertTestData().then(() => {
    console.log('🎉 스크립트 실행 완료');
    process.exit(0);
}).catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
});
