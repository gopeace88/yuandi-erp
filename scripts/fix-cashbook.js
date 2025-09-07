const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_API_KEY
);

async function fixCashbook() {
    console.log('📊 출납장부 데이터 수정 시작...');
    
    // 관리자 계정 확인
    const { data: adminUser, error: adminError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', 'admin@yuandi.com')
        .single();
    
    if (adminError || !adminUser) {
        console.error('❌ 관리자 계정을 찾을 수 없습니다');
        return;
    }
    
    // 상품 조회
    const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku, cost_cny');
    
    if (productsError) {
        console.error('❌ 상품 조회 실패:', productsError);
        return;
    }
    
    // 재고 조회
    const { data: inventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('product_id, on_hand');
    
    if (inventoryError) {
        console.error('❌ 재고 조회 실패:', inventoryError);
        return;
    }
    
    // 재고 맵 생성
    const inventoryMap = {};
    inventory.forEach(inv => {
        inventoryMap[inv.product_id] = inv.on_hand;
    });
    
    // 출납장부 트랜잭션 생성
    const cashbookTransactions = [];
    const currentDate = new Date();
    
    for (const product of products) {
        const stock = inventoryMap[product.id] || 0;
        if (stock > 0) {
            // 금액 계산 (오버플로우 방지)
            const purchaseAmountCny = Math.min(product.cost_cny * stock, 10000); // 최대 1만 CNY
            const purchaseAmountKrw = Math.min(purchaseAmountCny * 180, 1800000); // 최대 180만원
            
            cashbookTransactions.push({
                transaction_date: new Date(currentDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                type: 'inventory_purchase',
                amount_krw: -purchaseAmountKrw,
                amount_cny: -purchaseAmountCny,
                exchange_rate: 180,
                balance_krw: 0,
                description: `${product.name} 구매 (${stock}개) - ${product.sku}`,
                reference_type: 'product',
                reference_id: product.id,
                category: '상품구매',
                created_by: adminUser.id
            });
        }
    }
    
    console.log(`💰 출납장부 트랜잭션 ${cashbookTransactions.length}개 생성 중...`);
    
    // 배치로 삽입
    const batchSize = 50;
    for (let i = 0; i < cashbookTransactions.length; i += batchSize) {
        const batch = cashbookTransactions.slice(i, i + batchSize);
        const { error } = await supabase
            .from('cashbook_transactions')
            .insert(batch);
        
        if (error) {
            console.error(`❌ 출납장부 배치 ${i/batchSize + 1} 생성 실패:`, error);
        } else {
            console.log(`✅ 출납장부 배치 ${i/batchSize + 1} 생성 완료`);
        }
    }
    
    console.log('✨ 출납장부 데이터 수정 완료!');
}

fixCashbook().catch(console.error);