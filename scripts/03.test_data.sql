-- =====================================================
-- YUANDI ERP - TEST DATA
-- 테스트 데이터 생성 스크립트
-- =====================================================

-- 기존 데이터 삭제 (CASCADE로 연관 데이터도 삭제)
TRUNCATE TABLE event_logs CASCADE;
TRUNCATE TABLE cashbook_transactions CASCADE;
TRUNCATE TABLE inventory_movements CASCADE;
TRUNCATE TABLE shipments CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE inventory CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE exchange_rates CASCADE;
TRUNCATE TABLE cashbook_types CASCADE;
TRUNCATE TABLE user_profiles CASCADE;
TRUNCATE TABLE system_settings CASCADE;

-- 1. System Settings
INSERT INTO system_settings (key, value, value_type, category, name_ko, name_zh, description_ko, description_zh) VALUES
('LOW_STOCK_THRESHOLD', '10', 'number', 'inventory', '재고 부족 기준', '库存不足标准', '재고 부족 경고 기준 수량', '库存不足警告标准数量'),
('DEFAULT_EXCHANGE_RATE', '185', 'number', 'finance', '기본 환율', '默认汇率', 'CNY to KRW 기본 환율', 'CNY到KRW默认汇率'),
('ORDER_NUMBER_PREFIX', '', 'string', 'order', '주문번호 접두사', '订单号前缀', '주문번호 앞에 붙는 접두사 (현재 사용안함)', '订单号前面的前缀 (当前未使用)');

-- 2. Categories
INSERT INTO categories (code, name, name_ko, name_zh, description, display_order, active) VALUES
('BAG', '가방', '가방', '包', '핸드백, 백팩 등', 1, true),
('WATCH', '시계', '시계', '手表', '손목시계, 스마트워치', 2, true),
('COSMETIC', '화장품', '화장품', '化妆品', '스킨케어, 메이크업', 3, true),
('ELEC', '전자제품', '전자제품', '电子产品', '스마트폰, 태블릿 등', 4, true),
('SHOES', '신발', '신발', '鞋子', '운동화, 구두 등', 5, true);

-- 3. Products (재고 정보 포함)
-- category_id를 사용하여 categories 테이블과 올바르게 연결
INSERT INTO products (sku, category_id, category, name, model, color, brand, cost_cny, price_krw, on_hand, low_stock_threshold, is_active) VALUES
-- 가방류
('BAG-LX2024-BLK-YD-001', (SELECT id FROM categories WHERE code = 'BAG'), '가방', '프리미엄 가죽 핸드백', 'LX2024', '블랙', 'YUANDI', 500, 125000, 15, 5, true),
('BAG-LX2024-BRN-YD-002', (SELECT id FROM categories WHERE code = 'BAG'), '가방', '프리미엄 가죽 핸드백', 'LX2024', '브라운', 'YUANDI', 500, 125000, 8, 5, true),
('BAG-BP2024-GRY-YD-003', (SELECT id FROM categories WHERE code = 'BAG'), '가방', '비즈니스 백팩', 'BP2024', '그레이', 'YUANDI', 300, 75000, 25, 10, true),

-- 시계류
('WATCH-SW100-SLV-TB-001', (SELECT id FROM categories WHERE code = 'WATCH'), '시계', '스마트워치 프로', 'SW100', '실버', 'TechBrand', 350, 89000, 12, 5, true),
('WATCH-CL200-GLD-LX-002', (SELECT id FROM categories WHERE code = 'WATCH'), '시계', '클래식 가죽시계', 'CL200', '골드', 'Luxury', 450, 115000, 6, 3, true),

-- 화장품
('COSM-SK001-SET-BP-001', (SELECT id FROM categories WHERE code = 'COSMETIC'), '화장품', '스킨케어 세트', 'SK001', '-', 'BeautyPlus', 250, 67000, 30, 10, true),
('COSM-MK002-RED-BP-002', (SELECT id FROM categories WHERE code = 'COSMETIC'), '화장품', '립스틱 세트', 'MK002', '레드', 'BeautyPlus', 150, 39000, 45, 15, true),

-- 전자제품
('ELEC-EP100-WHT-SN-001', (SELECT id FROM categories WHERE code = 'ELEC'), '전자제품', '무선 이어폰', 'EP100', '화이트', 'SoundTech', 200, 52000, 20, 10, true),
('ELEC-TB200-BLK-TC-002', (SELECT id FROM categories WHERE code = 'ELEC'), '전자제품', '태블릿 10인치', 'TB200', '블랙', 'TechCorp', 800, 195000, 5, 3, true),

-- 신발
('SHOE-RN300-WHT-NK-001', (SELECT id FROM categories WHERE code = 'SHOES'), '신발', '러닝화', 'RN300', '화이트', 'SportBrand', 300, 78000, 18, 8, true),
('SHOE-DR400-BLK-CL-002', (SELECT id FROM categories WHERE code = 'SHOES'), '신발', '정장 구두', 'DR400', '블랙', 'Classic', 400, 98000, 10, 5, true);

-- 4. Exchange Rates
INSERT INTO exchange_rates (base_currency, target_currency, rate, source, valid_from, is_active) VALUES
('CNY', 'KRW', 195.00, 'manual', CURRENT_DATE, true);

-- 5. Cashbook Types
INSERT INTO cashbook_types (code, name_ko, name_zh, type, color, display_order, is_system, active) VALUES
-- 수입 유형
('SALE', '판매', '销售', 'income', '#10B981', 1, true, true),
('REFUND_CANCEL', '환불취소', '退款取消', 'income', '#059669', 2, true, true),
('OTHER_INCOME', '기타수입', '其他收入', 'income', '#34D399', 3, false, true),

-- 지출 유형
('INBOUND', '재고입고', '库存入库', 'expense', '#EF4444', 4, true, true),
('REFUND', '환불', '退款', 'expense', '#DC2626', 5, true, true),
('SHIPPING', '배송비', '运费', 'expense', '#F87171', 6, true, true),
('OPERATION_COST', '운영비', '运营费', 'expense', '#FCA5A5', 7, false, true),
('OTHER_EXPENSE', '기타지출', '其他支出', 'expense', '#FBBF24', 8, false, true),

-- 조정 유형
('ADJUSTMENT', '조정', '调整', 'adjustment', '#6B7280', 9, true, true),
('LOSS', '손실', '损失', 'adjustment', '#9CA3AF', 10, true, true),
('CORRECTION', '정정', '更正', 'adjustment', '#D1D5DB', 11, false, true);

-- 6. Sample Orders (간단한 개별 INSERT)
-- Order 1: 결제완료 상태
INSERT INTO orders (
    id, order_number, order_date, customer_name, customer_phone, customer_email,
    pccc, shipping_address_line1, shipping_address_line2, shipping_postal_code,
    status, subtotal_krw, shipping_fee_krw, total_krw, created_at
) VALUES (
    gen_random_uuid(), '241201-001', CURRENT_DATE, '김철수', '010-1111-2222', 'kim@example.com',
    'P123456789012', '서울시 강남구 테헤란로 123', '101동 202호', '06234',
    'paid', 125000, 0, 125000, NOW()
);

-- Order 2: 배송중 상태
INSERT INTO orders (
    id, order_number, order_date, customer_name, customer_phone, customer_email,
    pccc, shipping_address_line1, shipping_address_line2, shipping_postal_code,
    status, subtotal_krw, shipping_fee_krw, total_krw, shipped_at, created_at
) VALUES (
    gen_random_uuid(), '241201-002', CURRENT_DATE - INTERVAL '1 day', '이영희', '010-2222-3333', 'lee@example.com',
    'P234567890123', '부산시 해운대구 해운대로 456', '201동 303호', '48099',
    'shipped', 89000, 3000, 92000, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '1 day'
);

-- Order 3: 배송완료 상태
INSERT INTO orders (
    id, order_number, order_date, customer_name, customer_phone, customer_email,
    pccc, shipping_address_line1, shipping_postal_code,
    status, subtotal_krw, shipping_fee_krw, total_krw, 
    shipped_at, delivered_at, created_at
) VALUES (
    gen_random_uuid(), '241130-001', CURRENT_DATE - INTERVAL '2 days', '박민수', '010-3333-4444', 'park@example.com',
    'P345678901234', '대전시 유성구 대학로 789', '34134',
    'done', 106000, 0, 106000,
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days'
);

-- Order 4: 환불 상태
INSERT INTO orders (
    id, order_number, order_date, customer_name, customer_phone,
    pccc, shipping_address_line1, shipping_postal_code,
    status, subtotal_krw, shipping_fee_krw, total_krw, created_at
) VALUES (
    gen_random_uuid(), '241129-001', CURRENT_DATE - INTERVAL '3 days', '최지우', '010-4444-5555',
    'P456789012345', '인천시 연수구 송도동 123', '21984',
    'refunded', 78000, 0, 78000, NOW() - INTERVAL '3 days'
);

-- Order 5: 결제완료 상태 (대량 주문)
INSERT INTO orders (
    id, order_number, order_date, customer_name, customer_phone, customer_email,
    customer_messenger_id, pccc, shipping_address_line1, shipping_postal_code,
    status, subtotal_krw, shipping_fee_krw, total_krw, customer_memo, created_at
) VALUES (
    gen_random_uuid(), '241201-003', CURRENT_DATE, '정하나', '010-5555-6666', 'jung@example.com',
    'kakao_jung', 'P567890123456', '광주시 서구 상무대로 321', '61947',
    'paid', 156000, 0, 156000, '빠른 배송 부탁드립니다', NOW()
);

-- 7. Order Items (주문 상품 정보)
-- Order 1의 상품
INSERT INTO order_items (
    order_id, product_id, sku, product_name, product_category, 
    product_model, product_color, product_brand,
    quantity, unit_price_krw, total_price_krw
)
SELECT 
    o.id, p.id, p.sku, p.name, p.category,
    p.model, p.color, p.brand,
    1, p.price_krw, p.price_krw
FROM orders o, products p
WHERE o.order_number = '241201-001' 
AND p.sku = 'BAG-LX2024-BLK-YD-001';

-- Order 2의 상품
INSERT INTO order_items (
    order_id, product_id, sku, product_name, product_category,
    product_model, product_color, product_brand,
    quantity, unit_price_krw, total_price_krw
)
SELECT 
    o.id, p.id, p.sku, p.name, p.category,
    p.model, p.color, p.brand,
    1, p.price_krw, p.price_krw
FROM orders o, products p
WHERE o.order_number = '241201-002' 
AND p.sku = 'WATCH-SW100-SLV-TB-001';

-- Order 3의 상품 (복수)
INSERT INTO order_items (
    order_id, product_id, sku, product_name, product_category,
    product_model, product_color, product_brand,
    quantity, unit_price_krw, total_price_krw
)
SELECT 
    o.id, p.id, p.sku, p.name, p.category,
    p.model, p.color, p.brand,
    1, p.price_krw, p.price_krw
FROM orders o, products p
WHERE o.order_number = '241130-001' 
AND p.sku IN ('COSM-SK001-SET-BP-001', 'COSM-MK002-RED-BP-002');

-- Order 4의 상품
INSERT INTO order_items (
    order_id, product_id, sku, product_name, product_category,
    product_model, product_color, product_brand,
    quantity, unit_price_krw, total_price_krw
)
SELECT 
    o.id, p.id, p.sku, p.name, p.category,
    p.model, p.color, p.brand,
    1, p.price_krw, p.price_krw
FROM orders o, products p
WHERE o.order_number = '241129-001' 
AND p.sku = 'SHOE-RN300-WHT-NK-001';

-- Order 5의 상품 (대량)
INSERT INTO order_items (
    order_id, product_id, sku, product_name, product_category,
    product_model, product_color, product_brand,
    quantity, unit_price_krw, total_price_krw
)
SELECT 
    o.id, p.id, p.sku, p.name, p.category,
    p.model, p.color, p.brand,
    3, p.price_krw, p.price_krw * 3
FROM orders o, products p
WHERE o.order_number = '241201-003' 
AND p.sku = 'ELEC-EP100-WHT-SN-001';

-- 8. Shipments (배송 정보)
INSERT INTO shipments (
    order_id, courier, tracking_number, tracking_url,
    shipping_fee, shipped_at, created_at
)
SELECT 
    id, 'CJ대한통운', '123456789012', 
    'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=123456789012',
    3000, shipped_at, shipped_at
FROM orders
WHERE order_number = '241201-002';

-- 9. Inventory Movements (재고 이동 내역)
-- 초기 재고 입고
INSERT INTO inventory_movements (
    product_id, movement_type, quantity, balance_before, balance_after,
    unit_cost, total_cost, note, movement_date
) 
SELECT 
    id, 'inbound', on_hand, 0, on_hand,
    cost_cny, cost_cny * on_hand, '초기 재고 입고', CURRENT_DATE - INTERVAL '7 days'
FROM products;

-- 판매로 인한 재고 감소
INSERT INTO inventory_movements (
    product_id, movement_type, quantity, balance_before, balance_after,
    ref_type, ref_id, note, movement_date
)
SELECT 
    oi.product_id, 'sale', -oi.quantity, p.on_hand + oi.quantity, p.on_hand,
    'order', oi.order_id, '주문 판매', o.order_date
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN orders o ON o.id = oi.order_id
WHERE o.status NOT IN ('cancelled', 'refunded');

-- 10. Cashbook Transactions (출납장부)
-- 재고 입고 지출
INSERT INTO cashbook_transactions (
    transaction_date, type, amount_krw, currency, exchange_rate,
    reference_type, description, notes, balance_krw
)
VALUES (
    CURRENT_DATE - INTERVAL '7 days', 'inbound', 
    -14785000, 'KRW', 185.0,
    'inventory', '초기 재고 입고', '전체 상품 입고',
    -14785000
);

-- 판매 수입 
WITH order_amounts AS (
    SELECT 
        ROW_NUMBER() OVER (ORDER BY order_date, created_at) as rn,
        order_date, 
        total_krw,
        id,
        customer_name,
        order_number
    FROM orders
    WHERE status NOT IN ('cancelled', 'refunded')
)
INSERT INTO cashbook_transactions (
    transaction_date, type, amount_krw, currency, exchange_rate,
    reference_type, reference_id, description, notes, balance_krw
)
SELECT 
    order_date, 
    'sale', 
    total_krw, 
    'KRW', 
    1.0,
    'order', 
    id, 
    '주문 판매 - ' || customer_name, 
    order_number,
    -14785000 + SUM(total_krw) OVER (ORDER BY rn)
FROM order_amounts;

-- 환불 지출
INSERT INTO cashbook_transactions (
    transaction_date, type, amount_krw, currency, exchange_rate,
    reference_type, reference_id, description, notes, balance_krw
)
SELECT 
    order_date + INTERVAL '1 day', 
    'refund', 
    -total_krw, 
    'KRW', 
    1.0,
    'order', 
    id, 
    '주문 환불 - ' || customer_name, 
    order_number,
    (SELECT SUM(amount_krw) FROM cashbook_transactions) - total_krw
FROM orders
WHERE status = 'refunded';

-- 11. 재고 정보 업데이트 (판매된 수량 반영)
UPDATE products p
SET on_hand = p.on_hand - COALESCE((
    SELECT SUM(oi.quantity)
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = p.id
    AND o.status NOT IN ('cancelled', 'refunded')
), 0);

-- 결과 확인
SELECT 'Test data created successfully!' as status;
SELECT 'Categories' as table_name, COUNT(*) as count FROM categories
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Items', COUNT(*) FROM order_items
UNION ALL
SELECT 'Shipments', COUNT(*) FROM shipments
UNION ALL
SELECT 'Inventory Movements', COUNT(*) FROM inventory_movements
UNION ALL
SELECT 'Cashbook Transactions', COUNT(*) FROM cashbook_transactions;