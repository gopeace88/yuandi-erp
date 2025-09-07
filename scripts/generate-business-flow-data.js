const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ===================================
// PRD 비즈니스 워크플로우 테스트 데이터
// ===================================

async function cleanDatabase() {
    console.log('🗑️ 기존 데이터 삭제 중...');
    
    // 순서 중요: 참조 관계 때문에 역순으로 삭제
    const tables = [
        'shipment_tracking_events',
        'shipments', 
        'cashbook_transactions',
        'inventory_transactions',
        'order_items',
        'orders',
        'inventory',
        'products',
        'product_categories',
        'event_logs'
    ];

    for (const table of tables) {
        const { error } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) {
            console.log(`⚠️ ${table} 삭제 중 오류 (무시):`, error.message);
        } else {
            console.log(`✅ ${table} 테이블 초기화됨`);
        }
    }
}

async function createCategories() {
    console.log('📦 상품 카테고리 생성 중...');
    
    const categories = [
        { name: '가방', description: '핸드백, 백팩, 크로스백 등' },
        { name: '신발', description: '운동화, 구두, 부츠 등' },
        { name: '화장품', description: '스킨케어, 메이크업 제품' },
        { name: '전자제품', description: '스마트폰 액세서리, 이어폰 등' },
        { name: '의류', description: '남녀 의류, 아우터' },
        { name: '시계', description: '손목시계, 스마트워치' },
        { name: '액세서리', description: '목걸이, 귀걸이, 반지' },
        { name: '건강식품', description: '비타민, 영양제' },
        { name: '주방용품', description: '조리도구, 식기' },
        { name: '완구', description: '장난감, 피규어' }
    ];

    const { data, error } = await supabase
        .from('product_categories')
        .insert(categories)
        .select();
    
    if (error) {
        console.error('❌ 카테고리 생성 실패:', error);
        return null;
    }
    
    console.log(`✅ 카테고리 ${data.length}개 생성됨`);
    return data;
}

async function createProducts(categories, adminUser) {
    console.log('🛍️ 상품 및 재고 생성 중...');
    
    const brands = ['나이키', '아디다스', '샤넬', '루이비통', '프라다', '구찌', '에르메스', '버버리', '코치', '발렌시아가'];
    const colors = ['블랙', '화이트', '레드', '블루', '그린', '브라운', '그레이', '네이비', '베이지', '핑크'];
    const models = ['2024-A', '2024-B', 'PRO', 'MAX', 'PLUS', 'LITE', 'ULTRA', 'CLASSIC', 'PREMIUM', 'LIMITED'];
    
    const products = [];
    const inventories = [];
    const inventoryTransactions = [];
    const cashbookTransactions = [];
    const currentDate = new Date();
    const adminId = adminUser.id;
    
    // 500개 상품 생성
    for (let i = 1; i <= 500; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const brand = brands[i % brands.length];
        const color = colors[i % colors.length];
        const model = models[i % models.length];
        
        // SKU 생성: [카테고리]-[모델]-[색상]-[브랜드]-[HASH5]
        const hash = Math.random().toString(36).substring(2, 7).toUpperCase();
        const sku = `${category.name.substring(0, 2)}-${model}-${color.substring(0, 2)}-${brand.substring(0, 2)}-${hash}`;
        
        const costCny = 100 + Math.floor(Math.random() * 50000); // 100-50,000 CNY (최대 900만원)
        const priceKrw = Math.floor(costCny * 180 * 1.5); // 환율 180, 마진 50% (최대 1천3백만원)
        
        products.push({
            sku: sku,
            category_id: category.id,
            name: `${brand} ${category.name} ${model}`,
            model: model,
            color: color,
            manufacturer: `제조사${(i % 20) + 1}`,
            brand: brand,
            cost_cny: costCny,
            price_krw: priceKrw,
            weight_g: 200 + Math.floor(Math.random() * 800),
            dimensions_cm: `${10 + Math.floor(Math.random() * 20)}x${10 + Math.floor(Math.random() * 20)}x${5 + Math.floor(Math.random() * 15)}`,
            description: `${brand} 브랜드의 ${category.name} 제품입니다. ${model} 모델, ${color} 색상`,
            low_stock_threshold: 5,
            notes: `입고 예정일: ${new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
            is_active: true
        });
    }
    
    // 배치로 상품 삽입
    const batchSize = 50;
    const createdProducts = [];
    
    for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const { data, error } = await supabase
            .from('products')
            .insert(batch)
            .select();
        
        if (error) {
            console.error(`❌ 상품 배치 ${i/batchSize + 1} 생성 실패:`, error);
            continue;
        }
        
        createdProducts.push(...data);
    }
    
    console.log(`✅ 상품 ${createdProducts.length}개 생성됨`);
    
    // 재고 생성 및 입고 처리 (비즈니스 플로우: 상품 등록 → 재고 입고 → 출납장부 지출)
    
    for (const product of createdProducts) {
        // 초기 재고: 20-200개 사이 랜덤
        const initialStock = 20 + Math.floor(Math.random() * 180);
        
        inventories.push({
            product_id: product.id,
            on_hand: initialStock,
            allocated: 0
            // available은 generated column이므로 제외
        });
        
        // 재고 입고 트랜잭션 생성
        inventoryTransactions.push({
            product_id: product.id,
            transaction_type: 'inbound',
            quantity: initialStock,
            cost_per_unit_cny: product.cost_cny,
            total_cost_cny: product.cost_cny * initialStock,
            reference_type: 'initial_stock',
            reference_id: null,
            notes: '초기 재고 입고',
            created_by: adminId,
            created_at: new Date(currentDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        // 출납장부 지출 기록 (상품 구매 비용)
        // 스키마 확대로 더 큰 금액 가능 (NUMERIC 12,2 = 최대 100억원)
        const purchaseAmountCny = Math.min(product.cost_cny * initialStock, 5000000); // 최대 500만 CNY
        const purchaseAmountKrw = Math.min(purchaseAmountCny * 180, 900000000); // 최대 9억원
        cashbookTransactions.push({
            transaction_date: new Date(currentDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            type: 'expense',
            amount_krw: -purchaseAmountKrw,
            amount_cny: -purchaseAmountCny,
            exchange_rate: 180,
            balance_krw: Math.floor(Math.random() * 100000000), // 0~1억원 사이 랜덤 잔액
            description: `${product.name} 구매 (${initialStock}개) - ${product.sku}`,
            reference_type: 'product',
            reference_id: product.id,
            category: '상품구매',
            created_by: adminId
        });
    }
    
    // 재고 배치 삽입
    for (let i = 0; i < inventories.length; i += batchSize) {
        const batch = inventories.slice(i, i + batchSize);
        const { error } = await supabase
            .from('inventory')
            .insert(batch);
        
        if (error) {
            console.error(`❌ 재고 배치 ${i/batchSize + 1} 생성 실패:`, error);
        }
    }
    
    console.log(`✅ 재고 데이터 ${inventories.length}개 생성됨`);
    
    // 재고 이동 트랜잭션 삽입
    for (let i = 0; i < inventoryTransactions.length; i += batchSize) {
        const batch = inventoryTransactions.slice(i, i + batchSize);
        const { error } = await supabase
            .from('inventory_transactions')
            .insert(batch);
        
        if (error) {
            console.error(`❌ 재고 이동 배치 ${i/batchSize + 1} 생성 실패:`, error);
        }
    }
    
    console.log(`✅ 재고 이동 트랜잭션 ${inventoryTransactions.length}개 생성됨`);
    
    // 출납장부 트랜잭션 삽입
    for (let i = 0; i < cashbookTransactions.length; i += batchSize) {
        const batch = cashbookTransactions.slice(i, i + batchSize);
        const { error } = await supabase
            .from('cashbook_transactions')
            .insert(batch);
        
        if (error) {
            console.error(`❌ 출납장부 배치 ${i/batchSize + 1} 생성 실패:`, error);
        }
    }
    
    console.log(`✅ 출납장부 지출 기록 ${cashbookTransactions.length}개 생성됨`);
    
    return createdProducts;
}

async function createBusinessFlowOrders(products, adminId) {
    console.log('📋 비즈니스 플로우에 따른 주문 생성 중...');
    
    const customers = [
        { name: '김철수', phone: '010-1234-5678', email: 'kim@example.com' },
        { name: '이영희', phone: '010-2345-6789', email: 'lee@example.com' },
        { name: '박지민', phone: '010-3456-7890', email: 'park@example.com' },
        { name: '최수현', phone: '010-4567-8901', email: 'choi@example.com' },
        { name: '정하나', phone: '010-5678-9012', email: 'jung@example.com' },
        { name: '강민준', phone: '010-6789-0123', email: 'kang@example.com' },
        { name: '윤서연', phone: '010-7890-1234', email: 'yoon@example.com' },
        { name: '임도윤', phone: '010-8901-2345', email: 'lim@example.com' },
        { name: '황예진', phone: '010-9012-3456', email: 'hwang@example.com' },
        { name: '송지우', phone: '010-0123-4567', email: 'song@example.com' }
    ];
    
    const addresses = [
        { line1: '서울시 강남구 테헤란로 123', city: '서울', state: '서울특별시', postal: '06234' },
        { line1: '서울시 서초구 서초대로 456', city: '서울', state: '서울특별시', postal: '06587' },
        { line1: '서울시 송파구 올림픽로 789', city: '서울', state: '서울특별시', postal: '05505' },
        { line1: '경기도 성남시 분당구 판교로 321', city: '성남', state: '경기도', postal: '13494' },
        { line1: '인천시 연수구 송도대로 654', city: '인천', state: '인천광역시', postal: '21984' }
    ];
    
    const couriers = ['cj', 'hanjin', 'logen', 'cway', 'kdexp'];
    
    // 500개 주문 생성 (다양한 상태 분포)
    // - 200개: paid (결제완료, 배송대기)
    // - 150개: shipped (배송중)
    // - 100개: done (배송완료)
    // - 50개: refunded (환불)
    
    const orderDistribution = [
        { status: 'paid', count: 200 },
        { status: 'shipped', count: 150 },
        { status: 'done', count: 100 },
        { status: 'refunded', count: 50 }
    ];
    
    let orderCounter = 0;
    const createdOrders = [];
    
    for (const dist of orderDistribution) {
        for (let i = 0; i < dist.count; i++) {
            orderCounter++;
            const customer = customers[orderCounter % customers.length];
            const address = addresses[orderCounter % addresses.length];
            const orderDate = new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)); // 최근 90일
            
            // 주문번호 생성: ORD-YYMMDD-###
            const dateStr = orderDate.toISOString().slice(2, 10).replace(/-/g, '');
            const orderNumber = `ORD-${dateStr}-${String(orderCounter).padStart(3, '0')}`;
            
            // PCCC 코드 생성 (P + 11자리 숫자)
            const pccc = `P${String(Math.floor(Math.random() * 99999999999)).padStart(11, '0')}`;
            
            // 주문 데이터
            const orderData = {
                order_number: orderNumber,
                customer_name: customer.name,
                customer_phone: customer.phone,
                customer_email: customer.email,
                shipping_address_line1: address.line1,
                shipping_address_line2: `${orderCounter}동 ${100 + orderCounter}호`,
                shipping_city: address.city,
                shipping_state: address.state,
                shipping_postal_code: address.postal,
                pccc: pccc,
                status: dist.status,
                subtotal_krw: 0, // 나중에 계산
                shipping_fee_krw: orderCounter % 3 === 0 ? 3000 : 0, // 3개 중 1개는 배송비
                total_krw: 0, // 나중에 계산
                payment_method: 'card',
                paid_at: orderDate.toISOString(),
                notes: `테스트 주문 ${orderCounter} - ${dist.status} 상태`,
                created_by: adminId
            };
            
            // shipped, done 상태인 경우 송장 정보 추가
            if (dist.status === 'shipped' || dist.status === 'done') {
                orderData.courier = couriers[orderCounter % couriers.length];
                orderData.tracking_number = `TRK${dateStr}${String(orderCounter).padStart(6, '0')}`;
                orderData.shipped_at = new Date(orderDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
            }
            
            // done 상태인 경우 배송완료 시간 추가
            if (dist.status === 'done') {
                orderData.delivered_at = new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
            }
            
            // 주문 생성
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert(orderData)
                .select()
                .single();
            
            if (orderError) {
                console.error(`❌ 주문 ${orderNumber} 생성 실패:`, orderError);
                continue;
            }
            
            // 주문 아이템 추가 (1-3개 상품)
            const itemCount = 1 + Math.floor(Math.random() * 3);
            let subtotal = 0;
            
            for (let j = 0; j < itemCount; j++) {
                const product = products[Math.floor(Math.random() * products.length)];
                const quantity = 1 + Math.floor(Math.random() * 3); // 1-3개
                
                const itemData = {
                    order_id: order.id,
                    product_id: product.id,
                    quantity: quantity,
                    unit_price_krw: product.price_krw,
                    total_price_krw: product.price_krw * quantity
                };
                
                const { error: itemError } = await supabase
                    .from('order_items')
                    .insert(itemData);
                
                if (itemError) {
                    console.error(`❌ 주문 아이템 생성 실패:`, itemError);
                    continue;
                }
                
                subtotal += itemData.total_price_krw;
                
                // 재고 차감 (paid, shipped, done 상태만)
                if (dist.status !== 'refunded' && dist.status !== 'cancelled') {
                    // 먼저 현재 allocated 값을 가져옴
                    const { data: inv } = await supabase
                        .from('inventory')
                        .select('allocated')
                        .eq('product_id', product.id)
                        .single();
                    
                    await supabase
                        .from('inventory')
                        .update({ 
                            allocated: (inv?.allocated || 0) + quantity
                        })
                        .eq('product_id', product.id);
                    
                    // 재고 이동 기록
                    await supabase
                        .from('inventory_transactions')
                        .insert({
                            product_id: product.id,
                            transaction_type: 'outbound',
                            quantity: -quantity,
                            reference_id: order.id,
                            reference_type: 'order',
                            notes: `주문 ${orderNumber} 출고`,
                            created_by: adminId
                        });
                }
            }
            
            // 주문 총액 업데이트
            await supabase
                .from('orders')
                .update({
                    subtotal_krw: subtotal,
                    total_krw: subtotal + orderData.shipping_fee_krw
                })
                .eq('id', order.id);
            
            // 출납장부 기록 (수입)
            if (dist.status !== 'cancelled') {
                await supabase
                    .from('cashbook_transactions')
                    .insert({
                        type: 'order_payment',
                        amount_krw: subtotal + orderData.shipping_fee_krw,
                        balance_krw: 0, // 트리거로 계산됨
                        description: `주문 ${orderNumber} 결제`,
                        reference_id: order.id,
                        reference_type: 'order',
                        transaction_date: orderDate.toISOString().split('T')[0],
                        category: 'sales',
                        created_by: adminId
                    });
            }
            
            // 환불인 경우 환불 기록
            if (dist.status === 'refunded') {
                await supabase
                    .from('cashbook_transactions')
                    .insert({
                        type: 'refund',
                        amount_krw: -(subtotal + orderData.shipping_fee_krw),
                        balance_krw: 0,
                        description: `주문 ${orderNumber} 환불`,
                        reference_id: order.id,
                        reference_type: 'order',
                        transaction_date: new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        category: 'refund',
                        created_by: adminId
                    });
            }
            
            createdOrders.push(order);
        }
        
        console.log(`✅ ${dist.status} 상태 주문 ${dist.count}개 생성됨`);
    }
    
    return createdOrders;
}

async function createInventoryTransactions(products, adminId) {
    console.log('📥 재고 입고 기록 생성 중...');
    
    // 100개의 입고 기록 생성
    for (let i = 0; i < 100; i++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = 10 + Math.floor(Math.random() * 90); // 10-100개
        const costPerUnit = 50 + Math.floor(Math.random() * 450); // 50-500 CNY
        
        // 재고 증가
        const { data: currentInv } = await supabase
            .from('inventory')
            .select('on_hand')
            .eq('product_id', product.id)
            .single();
        
        await supabase
            .from('inventory')
            .update({ 
                on_hand: (currentInv?.on_hand || 0) + quantity
            })
            .eq('product_id', product.id);
        
        // 입고 기록
        await supabase
            .from('inventory_transactions')
            .insert({
                product_id: product.id,
                transaction_type: 'inbound',
                quantity: quantity,
                cost_per_unit_cny: costPerUnit,
                total_cost_cny: costPerUnit * quantity,
                reference_type: 'purchase',
                notes: `입고 처리 #${i + 1}`,
                created_by: adminId
            });
        
        // 출납장부 기록 (구매 지출)
        await supabase
            .from('cashbook_transactions')
            .insert({
                type: 'inventory_purchase',
                amount_krw: -(costPerUnit * quantity * 180), // CNY를 KRW로 변환
                amount_cny: costPerUnit * quantity,
                exchange_rate: 180,
                balance_krw: 0,
                description: `상품 구매 - 입고 #${i + 1}`,
                reference_type: 'inventory',
                transaction_date: new Date(Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                category: 'purchase',
                created_by: adminId
            });
    }
    
    console.log('✅ 입고 기록 100개 생성됨');
}

async function createOperationalExpenses(adminId) {
    console.log('💸 운영비 지출 기록 생성 중...');
    
    const expenses = [
        { amount: 150000, category: 'shipping', desc: '택배비 정산' },
        { amount: 200000, category: 'rent', desc: '사무실 임대료' },
        { amount: 50000, category: 'utility', desc: '인터넷/전화요금' },
        { amount: 80000, category: 'supplies', desc: '사무용품 구매' },
        { amount: 120000, category: 'shipping', desc: '국제 배송비' },
        { amount: 30000, category: 'tax', desc: '세무 서비스' },
        { amount: 45000, category: 'marketing', desc: '광고비' },
        { amount: 60000, category: 'shipping', desc: '포장 자재' },
        { amount: 100000, category: 'misc', desc: '기타 운영비' },
        { amount: 75000, category: 'software', desc: '소프트웨어 라이선스' }
    ];
    
    for (let i = 0; i < 20; i++) {
        const expense = expenses[i % expenses.length];
        
        await supabase
            .from('cashbook_transactions')
            .insert({
                type: 'expense',
                amount_krw: -expense.amount,
                balance_krw: 0,
                description: expense.desc,
                transaction_date: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                category: expense.category,
                created_by: adminId
            });
    }
    
    console.log('✅ 운영비 지출 20개 생성됨');
}

async function main() {
    try {
        console.log('🚀 PRD 비즈니스 워크플로우 테스트 데이터 생성 시작...\n');
        
        // 1. 관리자 계정 확인
        const { data: adminUser } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', 'admin@yuandi.com')
            .single();
        
        if (!adminUser) {
            console.error('❌ 관리자 계정을 찾을 수 없습니다. 먼저 admin@yuandi.com 계정을 생성하세요.');
            return;
        }
        
        const adminId = adminUser.id;
        console.log('✅ 관리자 계정 확인됨\n');
        
        // 2. 기존 데이터 삭제
        await cleanDatabase();
        console.log('');
        
        // 3. 카테고리 생성
        const categories = await createCategories();
        if (!categories) return;
        console.log('');
        
        // 4. 상품 및 재고 생성
        const products = await createProducts(categories, adminUser);
        if (!products || products.length === 0) return;
        console.log('');
        
        // 5. 비즈니스 플로우에 따른 주문 생성
        await createBusinessFlowOrders(products, adminId);
        console.log('');
        
        // 6. 재고 입고 기록 생성
        await createInventoryTransactions(products, adminId);
        console.log('');
        
        // 7. 운영비 지출 기록
        await createOperationalExpenses(adminId);
        console.log('');
        
        // 8. 통계 출력
        const { data: stats } = await supabase.rpc('get_database_stats');
        
        console.log('========================================');
        console.log('🎉 테스트 데이터 생성 완료!');
        console.log('========================================');
        console.log('📊 생성된 데이터 통계:');
        console.log('- 상품 카테고리: 10개');
        console.log('- 상품: 500개');
        console.log('- 주문: 500개 (paid:200, shipped:150, done:100, refunded:50)');
        console.log('- 재고 입고: 100건');
        console.log('- 출납장부: 다수 기록');
        console.log('========================================');
        console.log('💡 비즈니스 워크플로우:');
        console.log('1. 재고 입고 → products & inventory 생성');
        console.log('2. 주문 생성(PAID) → 재고 차감 & 출납장부 기록');
        console.log('3. 배송 시작(SHIPPED) → 송장번호 등록');
        console.log('4. 배송 완료(DONE) → 완료 처리');
        console.log('5. 환불(REFUNDED) → 출납장부 환불 기록 (재고 복구 X)');
        console.log('========================================');
        
    } catch (error) {
        console.error('❌ 데이터 생성 중 오류:', error);
    }
}

// 실행
main().then(() => {
    console.log('✨ 스크립트 완료');
    process.exit(0);
}).catch((error) => {
    console.error('❌ 스크립트 실패:', error);
    process.exit(1);
});