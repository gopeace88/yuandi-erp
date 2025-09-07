const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyData() {
    console.log('🔍 생성된 데이터 확인 중...\n');

    try {
        // 카테고리 확인
        const { data: categories, error: catError } = await supabase
            .from('product_categories')
            .select('*');

        if (catError) {
            console.error('카테고리 조회 오류:', catError);
        } else {
            console.log(`📂 카테고리: ${categories.length}개`);
            categories.forEach(cat => {
                console.log(`  - ${cat.name}: ${cat.description}`);
            });
        }

        // 상품 확인
        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('*');

        if (prodError) {
            console.error('상품 조회 오류:', prodError);
        } else {
            console.log(`\n📦 상품: ${products.length}개`);
            products.slice(0, 5).forEach(prod => {
                console.log(`  - ${prod.sku}: ${prod.name} (${prod.brand} ${prod.color}) - ${prod.price_krw.toLocaleString()}원`);
            });
            if (products.length > 5) {
                console.log(`  ... 외 ${products.length - 5}개`);
            }
        }

        // 재고 확인
        const { data: inventory, error: invError } = await supabase
            .from('inventory')
            .select('*');

        if (invError) {
            console.error('재고 조회 오류:', invError);
        } else {
            console.log(`\n📊 재고: ${inventory.length}개`);
            const totalStock = inventory.reduce((sum, inv) => sum + inv.on_hand, 0);
            console.log(`  - 총 재고 수량: ${totalStock}개`);
        }

        // 주문 확인
        const { data: orders, error: orderError } = await supabase
            .from('orders')
            .select('*');

        if (orderError) {
            console.error('주문 조회 오류:', orderError);
        } else {
            console.log(`\n🛒 주문: ${orders.length}개`);
            orders.slice(0, 3).forEach(order => {
                console.log(`  - ${order.order_number}: ${order.customer_name} - ${order.status} - ${order.total_krw.toLocaleString()}원`);
            });
            if (orders.length > 3) {
                console.log(`  ... 외 ${orders.length - 3}개`);
            }
        }

        // 주문 아이템 확인
        const { data: orderItems, error: itemError } = await supabase
            .from('order_items')
            .select('*');

        if (itemError) {
            console.error('주문 아이템 조회 오류:', itemError);
        } else {
            console.log(`\n🛍️ 주문 아이템: ${orderItems.length}개`);
        }

        // 사용자 확인
        const { data: users, error: userError } = await supabase
            .from('user_profiles')
            .select('*');

        if (userError) {
            console.error('사용자 조회 오류:', userError);
        } else {
            console.log(`\n👥 사용자: ${users.length}개`);
            users.forEach(user => {
                console.log(`  - ${user.email}: ${user.name} (${user.role})`);
            });
        }

        console.log('\n✅ 데이터 확인 완료!');

    } catch (error) {
        console.error('❌ 데이터 확인 중 오류:', error);
    }
}

verifyData().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
});
