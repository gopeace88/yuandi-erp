-- =====================================================
-- YUANDI ERP - TEST DATA
-- 테스트 데이터 생성 스크립트
-- 새로운 다국어 스키마에 맞게 업데이트됨
-- =====================================================

-- 기존 데이터 삭제 (CASCADE로 연관 데이터도 삭제)
TRUNCATE TABLE event_logs CASCADE;
TRUNCATE TABLE cashbook_transactions CASCADE;
TRUNCATE TABLE inventory_movements CASCADE;
TRUNCATE TABLE shipments CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE products CASCADE;
-- categories는 스키마 초기화시 생성되므로 삭제하지 않음
-- user_profiles도 관리자 계정이 있으므로 삭제하지 않음

-- 1. Products (브랜드별 명품 상품)
INSERT INTO products (sku, category_id, name_ko, name_zh, model, color_ko, color_zh, brand_ko, brand_zh, size, unit_price_krw, unit_price_cny, on_hand) VALUES
-- Louis Vuitton 제품
('LV-SPEEDY30-BRN-LV-A1B2C', (SELECT id FROM categories WHERE code = 'louis_vuitton'), '스피디 30', 'Speedy 30', 'SPEEDY30', '브라운', '棕色', 'Louis Vuitton', '路易威登', '30', 2850000.00, 15000.00, 3),
('LV-NEVERFULL-MM-LV-D3E4F', (SELECT id FROM categories WHERE code = 'louis_vuitton'), '네버풀 MM', 'Neverfull MM', 'NEVERFULL', '모노그램', '老花', 'Louis Vuitton', '路易威登', 'MM', 2100000.00, 11000.00, 5),
('LV-ALMA-BB-LV-G4H5I', (SELECT id FROM categories WHERE code = 'louis_vuitton'), '알마 BB', 'Alma BB', 'ALMA', '에피블랙', '黑色皮革', 'Louis Vuitton', '路易威登', 'BB', 1950000.00, 10200.00, 4),

-- Gucci 제품
('GU-MARMONT-BLK-GU-J6K7L', (SELECT id FROM categories WHERE code = 'gucci'), '마몬트 백', 'Marmont包', 'MARMONT', '블랙', '黑色', 'Gucci', '古驰', 'M', 1950000.00, 10200.00, 4),
('GU-DIONYSUS-RED-GU-M8N9O', (SELECT id FROM categories WHERE code = 'gucci'), '디오니소스', 'Dionysus', 'DIONYSUS', '레드', '红色', 'Gucci', '古驰', 'S', 3200000.00, 16800.00, 2),
('GU-JACKIE-BRN-GU-P0Q1R', (SELECT id FROM categories WHERE code = 'gucci'), '재키 1961', 'Jackie 1961', 'JACKIE', '브라운', '棕色', 'Gucci', '古驰', 'M', 2750000.00, 14400.00, 3),

-- Chanel 제품
('CH-CLASSIC-BLK-CH-S2T3U', (SELECT id FROM categories WHERE code = 'chanel'), '클래식 플랩백', '经典翻盖包', 'CLASSIC', '블랙', '黑色', 'Chanel', '香奈儿', 'M', 8500000.00, 44700.00, 2),
('CH-BOY-NAVY-CH-V4W5X', (SELECT id FROM categories WHERE code = 'chanel'), '보이백', 'Boy包', 'BOY', '네이비', '海军蓝', 'Chanel', '香奈儿', 'M', 6200000.00, 32600.00, 1),
('CH-COCO-WHT-CH-Y6Z7A', (SELECT id FROM categories WHERE code = 'chanel'), '코코 핸들', 'Coco Handle', 'COCO', '화이트', '白色', 'Chanel', '香奈儿', 'M', 7100000.00, 37300.00, 1),

-- Hermes 제품
('HM-BIRKIN30-BLK-HM-B8C9D', (SELECT id FROM categories WHERE code = 'hermes'), '버킨 30', 'Birkin 30', 'BIRKIN30', '블랙', '黑色', 'Hermes', '爱马仕', '30', 15000000.00, 78900.00, 1),
('HM-KELLY25-GLD-HM-E0F1G', (SELECT id FROM categories WHERE code = 'hermes'), '켈리 25', 'Kelly 25', 'KELLY25', '골드', '金色', 'Hermes', '爱马仕', '25', 12000000.00, 63100.00, 1),
('HM-CONSTANCE-ETN-HM-H2I3J', (SELECT id FROM categories WHERE code = 'hermes'), '콘스탄스', 'Constance', 'CONSTANCE', '에토프', '大象灰', 'Hermes', '爱马仕', '18', 10500000.00, 55200.00, 1),

-- Burberry 제품
('BB-TRENCH-BEI-BB-K4L5M', (SELECT id FROM categories WHERE code = 'burberry'), '트렌치코트', '风衣', 'TRENCH', '베이지', '米色', 'Burberry', '博柏利', 'M', 2800000.00, 14700.00, 3),
('BB-CHECK-BRN-BB-N6O7P', (SELECT id FROM categories WHERE code = 'burberry'), '체크 머플러', '格纹围巾', 'CHECK', '브라운체크', '棕色格纹', 'Burberry', '博柏利', 'OS', 580000.00, 3000.00, 8),

-- Prada 제품
('PR-GALLERIA-BLK-PR-Q8R9S', (SELECT id FROM categories WHERE code = 'prada'), '갤러리아 백', 'Galleria包', 'GALLERIA', '블랙', '黑色', 'Prada', '普拉达', 'M', 3400000.00, 17900.00, 2),
('PR-CAHIER-RED-PR-T0U1V', (SELECT id FROM categories WHERE code = 'prada'), '카이에 백', 'Cahier包', 'CAHIER', '레드', '红色', 'Prada', '普拉达', 'S', 2900000.00, 15200.00, 2),

-- Dior 제품
('DR-LADYDIOR-PNK-DR-W2X3Y', (SELECT id FROM categories WHERE code = 'dior'), '레이디 디올', 'Lady Dior', 'LADYDIOR', '핑크', '粉色', 'Dior', '迪奥', 'M', 5800000.00, 30500.00, 2),
('DR-SADDLE-BLU-DR-Z4A5B', (SELECT id FROM categories WHERE code = 'dior'), '새들백', 'Saddle包', 'SADDLE', '블루', '蓝色', 'Dior', '迪奥', 'M', 3950000.00, 20700.00, 2),

-- Balenciaga 제품
('BL-HOURGLASS-WHT-BL-C6D7E', (SELECT id FROM categories WHERE code = 'balenciaga'), '아워글라스', 'Hourglass', 'HOURGLASS', '화이트', '白色', 'Balenciaga', '巴黎世家', 'S', 2900000.00, 15200.00, 3),
('BL-CITY-GRY-BL-F8G9H', (SELECT id FROM categories WHERE code = 'balenciaga'), '시티백', 'City包', 'CITY', '그레이', '灰色', 'Balenciaga', '巴黎世家', 'M', 2450000.00, 12800.00, 2),

-- 기타 브랜드 제품
('OT-WALLET-BRN-YSL-I0J1K', (SELECT id FROM categories WHERE code = 'other'), 'YSL 지갑', 'YSL钱包', 'WALLET', '브라운', '棕色', 'YSL', '圣罗兰', 'OS', 680000.00, 3500.00, 8),
('OT-SCARF-BLU-FD-L2M3N', (SELECT id FROM categories WHERE code = 'other'), '펜디 스카프', 'Fendi围巾', 'SCARF', '블루', '蓝色', 'Fendi', '芬迪', 'OS', 450000.00, 2300.00, 10),
('OT-BELT-BLK-VER-O4P5Q', (SELECT id FROM categories WHERE code = 'other'), '베르사체 벨트', 'Versace腰带', 'BELT', '블랙', '黑色', 'Versace', '范思哲', '95', 780000.00, 4100.00, 5);

-- 2. Sample Orders (관리자 계정 사용)
-- Order 1: 결제완료 상태 (오늘)
INSERT INTO orders (
    order_number, customer_name, customer_phone, 
    status, order_date, subtotal_krw, total_krw, 
    payment_method, notes, created_by
) VALUES (
    '250911-001', '김철수', '010-1111-2222',
    'paid'::order_status, CURRENT_DATE, 2850000, 2850000,
    'card'::payment_method, 'VIP 고객, 빠른 배송 요청', 
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
);

-- Order 2: 배송중 상태 (어제)
INSERT INTO orders (
    order_number, customer_name, customer_phone,
    status, order_date, subtotal_krw, total_krw,
    payment_method, notes, created_by
) VALUES (
    '250910-001', '이영희', '010-2222-3333',
    'shipped'::order_status, CURRENT_DATE - INTERVAL '1 day', 1950000, 1950000,
    'transfer'::payment_method, '선물 포장 요청',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
);

-- Order 3: 배송완료 상태 (2일 전)
INSERT INTO orders (
    order_number, customer_name, customer_phone,
    status, order_date, subtotal_krw, total_krw,
    payment_method, created_by
) VALUES (
    '250909-001', '박민수', '010-3333-4444',
    'done'::order_status, CURRENT_DATE - INTERVAL '2 days', 5200000, 5200000,
    'card'::payment_method, 
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
);

-- Order 4: 환불 상태 (3일 전)
INSERT INTO orders (
    order_number, customer_name, customer_phone,
    status, order_date, subtotal_krw, total_krw,
    payment_method, notes, created_by
) VALUES (
    '250908-001', '최지우', '010-4444-5555',
    'refunded'::order_status, CURRENT_DATE - INTERVAL '3 days', 580000, 580000,
    'cash'::payment_method, '사이즈 교환 불가로 환불',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
);

-- Order 5: 대량 주문 (결제완료, 오늘)
INSERT INTO orders (
    order_number, customer_name, customer_phone,
    status, order_date, subtotal_krw, total_krw,
    payment_method, notes, created_by
) VALUES (
    '250911-002', '정하나', '010-5555-6666',
    'paid'::order_status, CURRENT_DATE, 7300000, 7300000,
    'transfer'::payment_method, '도매 구매, 세금계산서 발행 요청',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
);

-- 3. Order Items (주문 상품)
-- Order 1의 상품 (LV 스피디)
INSERT INTO order_items (
    order_id, product_id, quantity, unit_price_krw, total_price_krw
)
SELECT 
    o.id, p.id, 1, p.unit_price_krw, p.unit_price_krw
FROM orders o
CROSS JOIN products p
WHERE o.order_number = '250911-001' 
AND p.sku = 'LV-SPEEDY30-BRN-LV-A1B2C';

-- Order 2의 상품 (구찌 마몬트)
INSERT INTO order_items (
    order_id, product_id, quantity, unit_price_krw, total_price_krw
)
SELECT 
    o.id, p.id, 1, p.unit_price_krw, p.unit_price_krw
FROM orders o
CROSS JOIN products p
WHERE o.order_number = '250910-001' 
AND p.sku = 'GU-MARMONT-BLK-GU-J6K7L';

-- Order 3의 상품 (구찌 디오니소스 + 프라다 갤러리아)
INSERT INTO order_items (
    order_id, product_id, quantity, unit_price_krw, total_price_krw
)
SELECT 
    o.id, p.id, 1, p.unit_price_krw, p.unit_price_krw
FROM orders o
CROSS JOIN products p
WHERE o.order_number = '250909-001' 
AND p.sku IN ('GU-DIONYSUS-RED-GU-M8N9O', 'PR-GALLERIA-BLK-PR-Q8R9S');

-- Order 4의 상품 (버버리 체크 머플러)
INSERT INTO order_items (
    order_id, product_id, quantity, unit_price_krw, total_price_krw
)
SELECT 
    o.id, p.id, 1, p.unit_price_krw, p.unit_price_krw
FROM orders o
CROSS JOIN products p
WHERE o.order_number = '250908-001' 
AND p.sku = 'BB-CHECK-BRN-BB-N6O7P';

-- Order 5의 상품 (대량 - LV 네버풀 2개, 구찌 재키 1개, 버버리 체크 3개)
INSERT INTO order_items (order_id, product_id, quantity, unit_price_krw, total_price_krw)
SELECT o.id, p.id, 2, p.unit_price_krw, p.unit_price_krw * 2
FROM orders o CROSS JOIN products p
WHERE o.order_number = '250911-002' AND p.sku = 'LV-NEVERFULL-MM-LV-D3E4F'
UNION ALL
SELECT o.id, p.id, 1, p.unit_price_krw, p.unit_price_krw
FROM orders o CROSS JOIN products p
WHERE o.order_number = '250911-002' AND p.sku = 'GU-JACKIE-BRN-GU-P0Q1R'
UNION ALL
SELECT o.id, p.id, 3, p.unit_price_krw, p.unit_price_krw * 3
FROM orders o CROSS JOIN products p
WHERE o.order_number = '250911-002' AND p.sku = 'BB-CHECK-BRN-BB-N6O7P';

-- 4. Shipments (배송 정보)
-- 배송중인 주문
INSERT INTO shipments (
    order_id, shipping_address, shipping_method,
    korea_tracking_number, korea_shipping_company,
    shipped_date
)
SELECT 
    o.id, 
    '서울시 강남구 청담동 123-45 명품아파트 101동 2001호',
    'express'::shipping_method,
    'CJ123456789012',
    'CJ대한통운',
    CURRENT_DATE - INTERVAL '1 day'
FROM orders o
WHERE o.order_number = '250910-001';

-- 배송완료 주문
INSERT INTO shipments (
    order_id, shipping_address, shipping_method,
    korea_tracking_number, korea_shipping_company,
    china_tracking_number, china_shipping_company,
    shipped_date, delivered_date
)
SELECT 
    o.id,
    '부산시 해운대구 마린시티 456-78 럭셔리타워 2301호',
    'international'::shipping_method,
    'CJ987654321098',
    'CJ대한통운',
    'SF123456789',
    '顺丰速运',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE - INTERVAL '1 day'
FROM orders o
WHERE o.order_number = '250909-001';

-- 5. Inventory Movements (재고 이동)
-- 초기 재고 입고
INSERT INTO inventory_movements (
    product_id, movement_type, quantity, 
    previous_quantity, new_quantity, 
    reference_type, notes, created_by
) 
SELECT 
    p.id, 
    'inbound'::movement_type, 
    p.on_hand,
    0, 
    p.on_hand,
    'adjustment'::reference_type, 
    '초기 재고 입고 - ' || p.brand_ko || ' ' || p.name_ko,
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
FROM products p;

-- 판매로 인한 재고 감소
INSERT INTO inventory_movements (
    product_id, movement_type, quantity,
    previous_quantity, new_quantity,
    reference_type, reference_id, notes, created_by
)
SELECT 
    oi.product_id,
    'sale'::movement_type,
    -oi.quantity,
    p.on_hand + oi.quantity,
    p.on_hand,
    'order'::reference_type,
    oi.order_id,
    '주문 판매 #' || o.order_number || ' - ' || o.customer_name,
    o.created_by
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN orders o ON o.id = oi.order_id
WHERE o.status NOT IN ('cancelled', 'refunded');

-- 6. Cashbook Transactions (가계부)
-- 초기 재고 입고 비용
INSERT INTO cashbook_transactions (
    transaction_date, category, description, amount_krw,
    payment_method, notes, created_by
) VALUES (
    CURRENT_DATE - INTERVAL '7 days', 
    '재고입고', 
    '초기 명품 재고 입고 (23개 제품)', 
    -125000000,  -- 1.25억원
    'transfer'::payment_method,
    '해외 직구 및 병행수입',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
);

-- 판매 수입
INSERT INTO cashbook_transactions (
    transaction_date, category, description, amount_krw,
    payment_method, order_id, notes, created_by
)
SELECT 
    o.order_date,
    '판매',
    '명품 판매 - ' || o.customer_name,
    o.total_krw,
    o.payment_method,
    o.id,
    '주문번호: ' || o.order_number,
    o.created_by
FROM orders o
WHERE o.status NOT IN ('cancelled', 'refunded');

-- 환불 처리
INSERT INTO cashbook_transactions (
    transaction_date, category, description, amount_krw,
    payment_method, order_id, notes, created_by
)
SELECT 
    o.order_date + INTERVAL '1 day',
    '환불',
    '주문 환불 - ' || o.customer_name,
    -o.total_krw,
    o.payment_method,
    o.id,
    '환불사유: ' || COALESCE(o.notes, '고객 요청'),
    o.created_by
FROM orders o
WHERE o.status = 'refunded';

-- 운영비
INSERT INTO cashbook_transactions (
    transaction_date, category, description, amount_krw,
    payment_method, notes, created_by
) VALUES 
(
    CURRENT_DATE - INTERVAL '5 days',
    '운영비',
    '9월 사무실 임대료',
    -3500000,
    'transfer'::payment_method,
    '강남구 청담동 사무실',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
),
(
    CURRENT_DATE - INTERVAL '3 days',
    '배송비',
    'EMS 국제배송비 정산',
    -285000,
    'card'::payment_method,
    'EMS 월간 정산',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
);

-- 7. 재고 업데이트 (판매 수량 반영)
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
SELECT 'Cashbook Transactions', COUNT(*) FROM cashbook_transactions
ORDER BY table_name;