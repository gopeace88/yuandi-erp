-- YUANDI ERP 데이터베이스 검증 스크립트
-- 1. 현재 스키마 확인
-- 2. 데이터 초기화 (profiles 제외)
-- 3. 테스트 데이터 생성
-- 4. 업무 플로우 검증

-- =============================================
-- STEP 1: 현재 테이블 구조 확인
-- =============================================
SELECT '=== 테이블 목록 ===' as step;
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =============================================
-- STEP 2: 데이터 초기화 (profiles 제외)
-- =============================================
SELECT '=== 데이터 초기화 시작 ===' as step;

-- 외래 키 제약 조건 임시 비활성화
SET session_replication_role = 'replica';

-- 테이블 데이터 삭제 (profiles 제외)
TRUNCATE TABLE event_logs CASCADE;
TRUNCATE TABLE cashbook CASCADE;
TRUNCATE TABLE inventory_movements CASCADE;
TRUNCATE TABLE shipments CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE products CASCADE;

-- 외래 키 제약 조건 재활성화
SET session_replication_role = 'origin';

SELECT '데이터 초기화 완료' as status;

-- =============================================
-- STEP 3: 테스트 데이터 생성
-- =============================================
SELECT '=== 테스트 데이터 생성 ===' as step;

-- 3.1 테스트 사용자 확인 (이미 있어야 함)
SELECT id, name, email, role FROM profiles;

-- 3.2 상품 데이터 생성
INSERT INTO products (
    category, name, model, color, brand,
    cost_cny, sale_price_krw, on_hand, low_stock_threshold,
    image_url, active
) VALUES 
    ('electronics', 'iPhone 15 Pro', 'iPhone15Pro', 'Blue', 'Apple', 
     800.00, 1250000, 25, 5, null, true),
    ('electronics', 'iPhone 15 Pro', 'iPhone15Pro', 'Black', 'Apple', 
     800.00, 1250000, 30, 5, null, true),
    ('electronics', 'Galaxy S24 Ultra', 'S24Ultra', 'White', 'Samsung', 
     750.00, 1150000, 15, 3, null, true),
    ('fashion', 'Premium Jacket', 'WinterJacket2024', 'Brown', 'Zara', 
     120.00, 180000, 8, 2, null, true),
    ('fashion', 'Premium Jacket', 'WinterJacket2024', 'Black', 'Zara', 
     120.00, 180000, 5, 2, null, true),
    ('beauty', 'Perfume Set', 'FloralCollection', 'Pink', 'Chanel', 
     200.00, 320000, 3, 1, null, true);

SELECT '상품 생성 완료: ' || COUNT(*) || '개' as status FROM products;

-- 3.3 주문 데이터 생성 (PAID 상태)
-- 주문 1: 정상 주문
INSERT INTO orders (
    order_date, customer_name, customer_phone, customer_email,
    pccc_code, shipping_address, shipping_address_detail, zip_code,
    status, total_amount, customer_memo, internal_memo
) VALUES (
    CURRENT_DATE, '김철수', '01012345678', 'kim@example.com',
    'P123456789012', '서울시 강남구 테헤란로 123', '101동 202호', '06234',
    'PAID', 1250000, '빠른 배송 부탁드립니다', '우수 고객'
);

-- 주문 아이템 추가
INSERT INTO order_items (
    order_id, product_id, sku, product_name,
    product_category, product_model, product_color, product_brand,
    quantity, unit_price, subtotal
)
SELECT 
    o.id, p.id, p.sku, p.name,
    p.category, p.model, p.color, p.brand,
    1, p.sale_price_krw, p.sale_price_krw
FROM orders o, products p
WHERE o.customer_name = '김철수'
  AND p.name = 'iPhone 15 Pro'
  AND p.color = 'Blue'
LIMIT 1;

-- 재고 차감
UPDATE products p
SET on_hand = on_hand - 1
FROM order_items oi
WHERE oi.product_id = p.id
  AND oi.order_id = (SELECT id FROM orders WHERE customer_name = '김철수');

-- 재고 이동 기록
INSERT INTO inventory_movements (
    product_id, movement_type, quantity,
    balance_before, balance_after,
    ref_type, ref_id, ref_no
)
SELECT 
    oi.product_id, 'sale', -1,
    p.on_hand + 1, p.on_hand,
    'order', oi.order_id, o.order_no
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
WHERE o.customer_name = '김철수';

-- 출납장부 기록
INSERT INTO cashbook (
    transaction_date, type, amount, currency, amount_krw,
    ref_type, ref_id, ref_no, description
)
SELECT 
    CURRENT_DATE, 'sale', o.total_amount, 'KRW', o.total_amount,
    'order', o.id, o.order_no, '상품 판매: ' || o.customer_name
FROM orders o
WHERE o.customer_name = '김철수';

-- 주문 2: 배송 중 상태
INSERT INTO orders (
    order_date, customer_name, customer_phone, customer_email,
    pccc_code, shipping_address, zip_code,
    status, total_amount
) VALUES (
    CURRENT_DATE - INTERVAL '1 day', '이영희', '01098765432', 'lee@example.com',
    'P987654321098', '부산시 해운대구 마린시티 456', '48120',
    'SHIPPED', 1150000
);

-- 배송 정보 추가
INSERT INTO shipments (
    order_id, courier, tracking_no, tracking_url,
    shipping_fee, shipped_at
)
SELECT 
    id, 'CJ대한통운', '123456789012', 
    'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=123456789012',
    3000, NOW() - INTERVAL '6 hours'
FROM orders WHERE customer_name = '이영희';

-- 주문 3: 완료 상태
INSERT INTO orders (
    order_date, customer_name, customer_phone,
    pccc_code, shipping_address, zip_code,
    status, total_amount
) VALUES (
    CURRENT_DATE - INTERVAL '5 days', '박민수', '01055556666',
    'P111222333444', '대전시 유성구 대학로 789', '34111',
    'DONE', 320000
);

-- 주문 4: 환불 상태
INSERT INTO orders (
    order_date, customer_name, customer_phone,
    pccc_code, shipping_address, zip_code,
    status, total_amount, internal_memo
) VALUES (
    CURRENT_DATE - INTERVAL '7 days', '최지우', '01077778888',
    'P555666777888', '인천시 연수구 송도대로 321', '21984',
    'REFUNDED', 180000, '제품 불량으로 환불 처리'
);

-- 환불 출납장부 기록
INSERT INTO cashbook (
    transaction_date, type, amount, currency, amount_krw,
    ref_type, ref_id, description
)
SELECT 
    CURRENT_DATE, 'refund', -o.total_amount, 'KRW', -o.total_amount,
    'order', o.id, '환불: ' || o.customer_name || ' - 제품 불량'
FROM orders o
WHERE o.customer_name = '최지우';

SELECT '주문 생성 완료: ' || COUNT(*) || '개' as status FROM orders;

-- =============================================
-- STEP 4: 업무 플로우 검증
-- =============================================
SELECT '=== 업무 플로우 검증 ===' as step;

-- 4.1 주문 상태별 집계
SELECT '--- 주문 상태별 현황 ---' as test;
SELECT status, COUNT(*) as count, SUM(total_amount) as total_amount
FROM orders
GROUP BY status
ORDER BY status;

-- 4.2 재고 현황 확인
SELECT '--- 재고 현황 ---' as test;
SELECT name, model, color, on_hand, low_stock_threshold,
       CASE 
           WHEN on_hand = 0 THEN '품절'
           WHEN on_hand <= low_stock_threshold THEN '재고부족'
           ELSE '정상'
       END as stock_status
FROM products
ORDER BY on_hand ASC;

-- 4.3 출납장부 잔액 확인
SELECT '--- 출납장부 요약 ---' as test;
SELECT type, 
       COUNT(*) as transaction_count,
       SUM(amount_krw) as total_amount
FROM cashbook
GROUP BY type;

SELECT '총 잔액: ' || SUM(amount_krw) as balance
FROM cashbook;

-- 4.4 재고 이동 이력 확인
SELECT '--- 재고 이동 이력 ---' as test;
SELECT p.name, p.model, p.color,
       im.movement_type, im.quantity, im.balance_after,
       im.created_at
FROM inventory_movements im
JOIN products p ON p.id = im.product_id
ORDER BY im.created_at DESC
LIMIT 5;

-- 4.5 주문번호 생성 테스트
SELECT '--- 주문번호 생성 테스트 ---' as test;
SELECT generate_order_number() as new_order_no;

-- 4.6 SKU 생성 테스트  
SELECT '--- SKU 생성 테스트 ---' as test;
SELECT generate_sku('electronics', 'TestModel', 'Red', 'TestBrand') as new_sku;

-- 4.7 고객 조회 시뮬레이션 (이름 + 전화번호)
SELECT '--- 고객 조회 테스트 ---' as test;
SELECT order_no, customer_name, customer_phone, status, total_amount, order_date
FROM orders
WHERE customer_name = '김철수' AND customer_phone = '01012345678';

-- 4.8 배송 추적 정보 확인
SELECT '--- 배송 정보 확인 ---' as test;
SELECT o.order_no, o.customer_name, o.status,
       s.courier, s.tracking_no, s.shipped_at
FROM orders o
LEFT JOIN shipments s ON s.order_id = o.id
WHERE o.status IN ('SHIPPED', 'DONE');

-- =============================================
-- STEP 5: 데이터 무결성 검증
-- =============================================
SELECT '=== 데이터 무결성 검증 ===' as step;

-- 5.1 주문 총액과 아이템 합계 일치 확인
SELECT '--- 주문 총액 검증 ---' as test;
SELECT o.order_no, o.total_amount as order_total,
       COALESCE(SUM(oi.subtotal), 0) as items_total,
       CASE 
           WHEN o.total_amount = COALESCE(SUM(oi.subtotal), 0) THEN 'OK'
           ELSE 'ERROR'
       END as validation
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.order_no, o.total_amount;

-- 5.2 재고 음수 체크
SELECT '--- 재고 음수 체크 ---' as test;
SELECT name, model, color, on_hand
FROM products
WHERE on_hand < 0;

-- 5.3 필수 필드 NULL 체크
SELECT '--- 필수 필드 검증 ---' as test;
SELECT 'Orders' as table_name, COUNT(*) as null_count
FROM orders
WHERE order_no IS NULL OR customer_name IS NULL OR pccc_code IS NULL
UNION ALL
SELECT 'Products' as table_name, COUNT(*) as null_count
FROM products
WHERE sku IS NULL OR name IS NULL OR cost_cny IS NULL;

-- =============================================
-- STEP 6: 권한 검증 (RLS)
-- =============================================
SELECT '=== RLS 정책 확인 ===' as step;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT '=== 검증 완료 ===' as final_status;