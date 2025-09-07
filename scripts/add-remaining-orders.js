const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addRemainingOrders() {
    console.log('📋 나머지 주문 데이터 추가 중...');
    
    // 관리자 ID 가져오기
    const { data: adminUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', 'admin@yuandi.com')
        .single();
    
    if (!adminUser) {
        console.error('❌ 관리자 계정을 찾을 수 없습니다.');
        return;
    }
    
    const adminId = adminUser.id;
    
    // 상품 목록 가져오기
    const { data: products } = await supabase
        .from('products')
        .select('id, price_krw')
        .limit(100);
    
    if (!products || products.length === 0) {
        console.error('❌ 상품을 찾을 수 없습니다.');
        return;
    }
    
    const customers = [
        { name: '김철수', phone: '010-1234-5678', email: 'kim@example.com' },
        { name: '이영희', phone: '010-2345-6789', email: 'lee@example.com' },
        { name: '박지민', phone: '010-3456-7890', email: 'park@example.com' },
        { name: '최수현', phone: '010-4567-8901', email: 'choi@example.com' },
        { name: '정하나', phone: '010-5678-9012', email: 'jung@example.com' }
    ];
    
    const addresses = [
        { line1: '서울시 강남구 테헤란로 123', city: '서울', state: '서울특별시', postal: '06234' },
        { line1: '서울시 서초구 서초대로 456', city: '서울', state: '서울특별시', postal: '06587' },
        { line1: '경기도 성남시 분당구 판교로 321', city: '성남', state: '경기도', postal: '13494' }
    ];
    
    const couriers = ['cj', 'hanjin', 'logen', 'cway', 'kdexp'];
    
    // 나머지 shipped 주문 추가 (109개 더)
    console.log('🚚 shipped 상태 주문 추가 중...');
    for (let i = 1; i <= 109; i++) {
        const customer = customers[i % customers.length];
        const address = addresses[i % addresses.length];
        const orderDate = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
        const dateStr = orderDate.toISOString().slice(2, 10).replace(/-/g, '');
        const orderNumber = `ORD-${dateStr}-S${String(i).padStart(3, '0')}`;
        const pccc = `P${String(Math.floor(Math.random() * 99999999999)).padStart(11, '0')}`;
        
        const orderData = {
            order_number: orderNumber,
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_email: customer.email,
            shipping_address_line1: address.line1,
            shipping_city: address.city,
            shipping_state: address.state,
            shipping_postal_code: address.postal,
            pccc: pccc,
            status: 'shipped',
            subtotal_krw: 0,
            shipping_fee_krw: i % 3 === 0 ? 3000 : 0,
            total_krw: 0,
            payment_method: 'card',
            paid_at: orderDate.toISOString(),
            courier: couriers[i % couriers.length],
            tracking_number: `TRK${dateStr}S${String(i).padStart(5, '0')}`,
            shipped_at: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            notes: `배송중 주문 ${i}`,
            created_by: adminId
        };
        
        const { data: order, error } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single();
        
        if (error) {
            console.error(`❌ 주문 생성 실패:`, error.message);
            continue;
        }
        
        // 주문 아이템 추가
        const product = products[i % products.length];
        const quantity = 1 + (i % 2);
        const subtotal = product.price_krw * quantity;
        
        await supabase
            .from('order_items')
            .insert({
                order_id: order.id,
                product_id: product.id,
                quantity: quantity,
                unit_price_krw: product.price_krw,
                total_price_krw: subtotal
            });
        
        // 주문 총액 업데이트
        await supabase
            .from('orders')
            .update({
                subtotal_krw: subtotal,
                total_krw: subtotal + orderData.shipping_fee_krw
            })
            .eq('id', order.id);
    }
    
    // done 상태 주문 추가 (100개)
    console.log('✅ done 상태 주문 추가 중...');
    for (let i = 1; i <= 100; i++) {
        const customer = customers[i % customers.length];
        const address = addresses[i % addresses.length];
        const orderDate = new Date(Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000));
        const dateStr = orderDate.toISOString().slice(2, 10).replace(/-/g, '');
        const orderNumber = `ORD-${dateStr}-D${String(i).padStart(3, '0')}`;
        const pccc = `P${String(Math.floor(Math.random() * 99999999999)).padStart(11, '0')}`;
        
        const orderData = {
            order_number: orderNumber,
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_email: customer.email,
            shipping_address_line1: address.line1,
            shipping_city: address.city,
            shipping_state: address.state,
            shipping_postal_code: address.postal,
            pccc: pccc,
            status: 'done',
            subtotal_krw: 0,
            shipping_fee_krw: i % 4 === 0 ? 3000 : 0,
            total_krw: 0,
            payment_method: 'card',
            paid_at: orderDate.toISOString(),
            courier: couriers[i % couriers.length],
            tracking_number: `TRK${dateStr}D${String(i).padStart(5, '0')}`,
            shipped_at: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            delivered_at: new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            notes: `배송완료 주문 ${i}`,
            created_by: adminId
        };
        
        const { data: order, error } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single();
        
        if (error) {
            console.error(`❌ 주문 생성 실패:`, error.message);
            continue;
        }
        
        // 주문 아이템 추가
        const product = products[i % products.length];
        const quantity = 1 + (i % 3);
        const subtotal = product.price_krw * quantity;
        
        await supabase
            .from('order_items')
            .insert({
                order_id: order.id,
                product_id: product.id,
                quantity: quantity,
                unit_price_krw: product.price_krw,
                total_price_krw: subtotal
            });
        
        // 주문 총액 업데이트
        await supabase
            .from('orders')
            .update({
                subtotal_krw: subtotal,
                total_krw: subtotal + orderData.shipping_fee_krw
            })
            .eq('id', order.id);
    }
    
    // refunded 상태 주문 추가 (50개)
    console.log('💸 refunded 상태 주문 추가 중...');
    for (let i = 1; i <= 50; i++) {
        const customer = customers[i % customers.length];
        const address = addresses[i % addresses.length];
        const orderDate = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
        const dateStr = orderDate.toISOString().slice(2, 10).replace(/-/g, '');
        const orderNumber = `ORD-${dateStr}-R${String(i).padStart(3, '0')}`;
        const pccc = `P${String(Math.floor(Math.random() * 99999999999)).padStart(11, '0')}`;
        
        const orderData = {
            order_number: orderNumber,
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_email: customer.email,
            shipping_address_line1: address.line1,
            shipping_city: address.city,
            shipping_state: address.state,
            shipping_postal_code: address.postal,
            pccc: pccc,
            status: 'refunded',
            subtotal_krw: 0,
            shipping_fee_krw: 0,
            total_krw: 0,
            payment_method: 'card',
            paid_at: orderDate.toISOString(),
            notes: `환불 처리된 주문 ${i}`,
            created_by: adminId
        };
        
        const { data: order, error } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single();
        
        if (error) {
            console.error(`❌ 주문 생성 실패:`, error.message);
            continue;
        }
        
        // 주문 아이템 추가
        const product = products[i % products.length];
        const quantity = 1;
        const subtotal = product.price_krw * quantity;
        
        await supabase
            .from('order_items')
            .insert({
                order_id: order.id,
                product_id: product.id,
                quantity: quantity,
                unit_price_krw: product.price_krw,
                total_price_krw: subtotal
            });
        
        // 주문 총액 업데이트
        await supabase
            .from('orders')
            .update({
                subtotal_krw: subtotal,
                total_krw: subtotal
            })
            .eq('id', order.id);
        
        // 환불 기록 추가
        await supabase
            .from('cashbook_transactions')
            .insert({
                type: 'refund',
                amount_krw: -subtotal,
                balance_krw: 0,
                description: `주문 ${orderNumber} 환불`,
                reference_id: order.id,
                reference_type: 'order',
                transaction_date: new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                category: 'refund',
                created_by: adminId
            });
    }
    
    console.log('✅ 나머지 주문 데이터 생성 완료!');
}

// 실행
addRemainingOrders().then(() => {
    console.log('✨ 완료');
    process.exit(0);
}).catch((error) => {
    console.error('❌ 실패:', error);
    process.exit(1);
});