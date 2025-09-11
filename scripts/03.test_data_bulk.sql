-- =====================================================
-- YUANDI ERP - BULK TEST DATA (대용량 테스트 데이터)
-- 상품 100개 이상, 주문 200개 이상 생성
-- 다양한 주문 상태 포함 (paid, shipped, done, cancelled, refunded)
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

-- =====================================================
-- 1. PRODUCTS 대량 생성 (120개 상품)
-- =====================================================

-- 제품 생성을 위한 임시 함수
DO $$
DECLARE
    v_category_id UUID;
    v_brand_names TEXT[][] := ARRAY[
        ARRAY['Louis Vuitton', '路易威登'],
        ARRAY['Gucci', '古驰'],
        ARRAY['Chanel', '香奈儿'],
        ARRAY['Hermes', '爱马仕'],
        ARRAY['Prada', '普拉达'],
        ARRAY['Dior', '迪奥'],
        ARRAY['Burberry', '博柏利'],
        ARRAY['Balenciaga', '巴黎世家']
    ];
    v_model_names TEXT[][] := ARRAY[
        ARRAY['Speedy', '스피디', 'Speedy包'],
        ARRAY['Neverfull', '네버풀', 'Neverfull包'],
        ARRAY['Alma', '알마', 'Alma包'],
        ARRAY['Marmont', '마몬트', 'Marmont包'],
        ARRAY['Dionysus', '디오니소스', 'Dionysus包'],
        ARRAY['Jackie', '재키', 'Jackie包'],
        ARRAY['Classic', '클래식', '经典款'],
        ARRAY['Boy', '보이백', 'Boy包'],
        ARRAY['Coco', '코코', 'Coco包'],
        ARRAY['Birkin', '버킨', 'Birkin包'],
        ARRAY['Kelly', '켈리', 'Kelly包'],
        ARRAY['Constance', '콘스탄스', 'Constance包'],
        ARRAY['Galleria', '갤러리아', 'Galleria包'],
        ARRAY['Cahier', '카이에', 'Cahier包'],
        ARRAY['Lady', '레이디', 'Lady包']
    ];
    v_colors TEXT[][] := ARRAY[
        ARRAY['Black', '블랙', '黑色'],
        ARRAY['Brown', '브라운', '棕色'],
        ARRAY['Red', '레드', '红色'],
        ARRAY['Navy', '네이비', '海军蓝'],
        ARRAY['White', '화이트', '白色'],
        ARRAY['Pink', '핑크', '粉色'],
        ARRAY['Blue', '블루', '蓝色'],
        ARRAY['Gray', '그레이', '灰色'],
        ARRAY['Beige', '베이지', '米色'],
        ARRAY['Gold', '골드', '金色']
    ];
    v_sizes TEXT[] := ARRAY['XS', 'S', 'M', 'L', 'XL', '25', '30', '35', 'MM', 'PM', 'GM'];
    v_counter INTEGER := 1;
    v_sku TEXT;
    v_price_krw NUMERIC;
    v_price_cny NUMERIC;
    v_stock INTEGER;
    v_brand_idx INTEGER;
    v_model_idx INTEGER;
    v_color_idx INTEGER;
    v_size_idx INTEGER;
BEGIN
    -- 각 카테고리별로 제품 생성
    FOR v_category_id IN (SELECT id FROM categories) LOOP
        -- 각 카테고리당 13-14개 제품 생성 (총 120개 정도)
        FOR i IN 1..14 LOOP
            v_brand_idx := (v_counter % 8) + 1;
            v_model_idx := (v_counter % 15) + 1;
            v_color_idx := (v_counter % 10) + 1;
            v_size_idx := (v_counter % 11) + 1;
            
            -- SKU 생성
            v_sku := 'PRD-' || LPAD(v_counter::TEXT, 4, '0') || '-' || 
                     SUBSTR(MD5(RANDOM()::TEXT), 1, 6);
            
            -- 가격 생성 (50만원 ~ 2000만원 범위)
            v_price_krw := ROUND((RANDOM() * 19500000 + 500000) / 10000) * 10000;
            v_price_cny := ROUND(v_price_krw / 190);
            
            -- 재고 생성 (0 ~ 50개)
            v_stock := FLOOR(RANDOM() * 51)::INTEGER;
            
            INSERT INTO products (
                sku, category_id, 
                name_ko, name_zh, 
                model, 
                color_ko, color_zh, 
                brand_ko, brand_zh, 
                size, 
                unit_price_krw, unit_price_cny, 
                on_hand, 
                is_active
            ) VALUES (
                v_sku, v_category_id,
                v_model_names[v_model_idx][2] || ' ' || v_counter,
                v_model_names[v_model_idx][3] || ' ' || v_counter,
                v_model_names[v_model_idx][1],
                v_colors[v_color_idx][2],
                v_colors[v_color_idx][3],
                v_brand_names[v_brand_idx][1],
                v_brand_names[v_brand_idx][2],
                v_sizes[v_size_idx],
                v_price_krw,
                v_price_cny,
                v_stock,
                RANDOM() > 0.1  -- 90% 확률로 활성화
            );
            
            v_counter := v_counter + 1;
            EXIT WHEN v_counter > 120;
        END LOOP;
        EXIT WHEN v_counter > 120;
    END LOOP;
END $$;

-- =====================================================
-- 2. ORDERS 대량 생성 (250개 주문)
-- =====================================================

DO $$
DECLARE
    v_admin_id UUID;
    v_order_date DATE;
    v_customer_names TEXT[] := ARRAY[
        '김철수', '이영희', '박민수', '최지우', '정하나', 
        '강민호', '조은비', '윤서준', '임수정', '한지민',
        '송민기', '김나영', '이준호', '박서연', '최동욱',
        '정유진', '강태양', '조민서', '윤하늘', '임채원',
        '한승우', '송지은', '김도윤', '이서아', '박준영'
    ];
    v_status_options order_status[] := ARRAY[
        'paid'::order_status, 
        'shipped'::order_status, 
        'done'::order_status, 
        'cancelled'::order_status, 
        'refunded'::order_status
    ];
    v_payment_options payment_method[] := ARRAY[
        'card'::payment_method,
        'transfer'::payment_method,
        'cash'::payment_method
    ];
    v_order_number TEXT;
    v_customer_name TEXT;
    v_customer_phone TEXT;
    v_status order_status;
    v_payment payment_method;
    v_subtotal NUMERIC;
    v_date_counter INTEGER := 0;
BEGIN
    -- 관리자 ID 가져오기
    SELECT id INTO v_admin_id FROM user_profiles WHERE role = 'admin' LIMIT 1;
    
    -- 250개 주문 생성 (최근 60일간의 주문)
    FOR i IN 1..250 LOOP
        -- 날짜 설정 (과거 60일부터 오늘까지 분산)
        v_date_counter := FLOOR(i / 5);  -- 날짜당 약 5개 주문
        v_order_date := CURRENT_DATE - INTERVAL '60 days' + (v_date_counter || ' days')::INTERVAL;
        
        -- 주문번호 생성 (날짜별 일련번호)
        v_order_number := TO_CHAR(v_order_date, 'YYMMDD') || '-' || 
                         LPAD(((i - 1) % 5 + 1)::TEXT, 3, '0');
        
        -- 고객 정보 생성
        v_customer_name := v_customer_names[((i - 1) % 25) + 1];
        v_customer_phone := '010-' || LPAD(((1000 + i * 7) % 9000 + 1000)::TEXT, 4, '0') || 
                           '-' || LPAD(((i * 13) % 9000 + 1000)::TEXT, 4, '0');
        
        -- 주문 상태 설정 (분포: paid 30%, shipped 25%, done 30%, cancelled 10%, refunded 5%)
        IF i <= 75 THEN
            v_status := 'paid'::order_status;  -- 30%
        ELSIF i <= 138 THEN
            v_status := 'shipped'::order_status;  -- 25%
        ELSIF i <= 213 THEN
            v_status := 'done'::order_status;  -- 30%
        ELSIF i <= 238 THEN
            v_status := 'cancelled'::order_status;  -- 10%
        ELSE
            v_status := 'refunded'::order_status;  -- 5%
        END IF;
        
        -- 결제 방법 랜덤 선택
        v_payment := v_payment_options[((i - 1) % 3) + 1];
        
        -- 주문 금액 생성 (50만원 ~ 5000만원)
        v_subtotal := ROUND((RANDOM() * 49500000 + 500000) / 10000) * 10000;
        
        INSERT INTO orders (
            order_number, 
            customer_name, 
            customer_phone,
            customer_email,
            pccc,
            shipping_address_line1,
            shipping_postal_code,
            status, 
            order_date, 
            subtotal_krw, 
            total_krw,
            payment_method, 
            notes, 
            created_by
        ) VALUES (
            v_order_number,
            v_customer_name,
            v_customer_phone,
            LOWER(REPLACE(v_customer_name, ' ', '')) || i || '@example.com',
            'P' || LPAD(((i * 31) % 100000000 + 10000000)::TEXT, 12, '0'),
            CASE (i % 5)
                WHEN 0 THEN '서울시 강남구 청담동 ' || (i % 100 + 1) || '-' || (i % 50 + 1)
                WHEN 1 THEN '서울시 송파구 잠실동 ' || (i % 100 + 1) || '-' || (i % 50 + 1)
                WHEN 2 THEN '부산시 해운대구 우동 ' || (i % 100 + 1) || '-' || (i % 50 + 1)
                WHEN 3 THEN '경기도 성남시 분당구 ' || (i % 100 + 1) || '-' || (i % 50 + 1)
                ELSE '인천시 연수구 송도동 ' || (i % 100 + 1) || '-' || (i % 50 + 1)
            END,
            LPAD(((i * 117) % 90000 + 10000)::TEXT, 5, '0'),
            v_status,
            v_order_date,
            v_subtotal,
            v_subtotal,
            v_payment,
            CASE (i % 10)
                WHEN 0 THEN 'VIP 고객, 빠른 배송 요청'
                WHEN 1 THEN '선물 포장 요청'
                WHEN 2 THEN '도매 구매'
                WHEN 3 THEN '재구매 고객'
                WHEN 4 THEN '신규 고객'
                WHEN 5 THEN '생일 선물용'
                WHEN 6 THEN '급한 배송 요청'
                WHEN 7 THEN '세금계산서 발행 요청'
                WHEN 8 THEN '해외 배송 문의'
                ELSE NULL
            END,
            v_admin_id
        );
    END LOOP;
END $$;

-- =====================================================
-- 3. ORDER ITEMS 생성 (주문당 1-5개 상품)
-- =====================================================

DO $$
DECLARE
    v_order RECORD;
    v_product RECORD;
    v_num_items INTEGER;
    v_quantity INTEGER;
    v_unit_price NUMERIC;
    v_total_price NUMERIC;
    v_items_total NUMERIC;
    v_product_count INTEGER;
BEGIN
    -- 각 주문에 대해 상품 추가
    FOR v_order IN (SELECT id, total_krw FROM orders) LOOP
        -- 주문당 상품 개수 (1-5개)
        v_num_items := FLOOR(RANDOM() * 5 + 1)::INTEGER;
        v_items_total := 0;
        v_product_count := 0;
        
        -- 랜덤하게 상품 선택하여 추가
        FOR v_product IN (
            SELECT id, unit_price_krw, on_hand 
            FROM products 
            WHERE is_active = true 
            ORDER BY RANDOM() 
            LIMIT v_num_items
        ) LOOP
            -- 수량 설정 (1-3개)
            v_quantity := FLOOR(RANDOM() * 3 + 1)::INTEGER;
            
            -- 가격 계산
            v_unit_price := v_product.unit_price_krw;
            v_total_price := v_unit_price * v_quantity;
            v_items_total := v_items_total + v_total_price;
            v_product_count := v_product_count + 1;
            
            INSERT INTO order_items (
                order_id,
                product_id,
                quantity,
                unit_price_krw,
                total_price_krw
            ) VALUES (
                v_order.id,
                v_product.id,
                v_quantity,
                v_unit_price,
                v_total_price
            );
        END LOOP;
        
        -- 주문 총액 업데이트 (실제 상품 총액으로)
        IF v_product_count > 0 THEN
            UPDATE orders 
            SET subtotal_krw = v_items_total,
                total_krw = v_items_total
            WHERE id = v_order.id;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- 4. SHIPMENTS 생성 (shipped, done 상태 주문에 대해)
-- =====================================================

INSERT INTO shipments (
    order_id, 
    shipping_address, 
    shipping_method,
    korea_tracking_number, 
    korea_shipping_company,
    china_tracking_number,
    china_shipping_company,
    shipped_date,
    delivered_date
)
SELECT 
    o.id,
    o.shipping_address_line1,
    CASE 
        WHEN RANDOM() < 0.3 THEN 'express'::shipping_method
        WHEN RANDOM() < 0.6 THEN 'standard'::shipping_method
        ELSE 'international'::shipping_method
    END,
    'KR' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 12, '0'),
    CASE FLOOR(RANDOM() * 4)::INTEGER
        WHEN 0 THEN 'CJ대한통운'
        WHEN 1 THEN '한진택배'
        WHEN 2 THEN '로젠택배'
        ELSE '우체국택배'
    END,
    CASE WHEN RANDOM() < 0.3 THEN 
        'CN' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 10, '0')
    ELSE NULL END,
    CASE WHEN RANDOM() < 0.3 THEN 
        CASE FLOOR(RANDOM() * 3)::INTEGER
            WHEN 0 THEN '顺丰速运'
            WHEN 1 THEN '韵达快递'
            ELSE 'EMS中国'
        END
    ELSE NULL END,
    o.order_date + INTERVAL '1 day' * FLOOR(RANDOM() * 3 + 1)::INTEGER,
    CASE 
        WHEN o.status = 'done' THEN 
            o.order_date + INTERVAL '1 day' * FLOOR(RANDOM() * 7 + 3)::INTEGER
        ELSE NULL 
    END
FROM orders o
WHERE o.status IN ('shipped', 'done');

-- =====================================================
-- 5. INVENTORY MOVEMENTS 생성
-- =====================================================

-- 초기 재고 입고 기록
INSERT INTO inventory_movements (
    product_id, 
    movement_type, 
    quantity,
    previous_quantity, 
    new_quantity,
    reference_type, 
    notes, 
    created_by
)
SELECT 
    p.id,
    'inbound'::movement_type,
    p.on_hand + 50,  -- 초기 재고를 현재보다 50개 많게 설정
    0,
    p.on_hand + 50,
    'adjustment'::reference_type,
    '초기 재고 입고',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
FROM products p;

-- 판매로 인한 재고 이동 (주문 상태가 cancelled, refunded가 아닌 경우)
INSERT INTO inventory_movements (
    product_id,
    movement_type,
    quantity,
    previous_quantity,
    new_quantity,
    reference_type,
    reference_id,
    notes,
    created_by
)
SELECT 
    oi.product_id,
    'sale'::movement_type,
    -oi.quantity,
    p.on_hand + oi.quantity,
    p.on_hand,
    'order'::reference_type,
    oi.order_id,
    '주문 #' || o.order_number,
    o.created_by
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
WHERE o.status NOT IN ('cancelled', 'refunded');

-- =====================================================
-- 6. CASHBOOK TRANSACTIONS 생성
-- =====================================================

-- 초기 자본금
INSERT INTO cashbook_transactions (
    transaction_date, 
    category, 
    description, 
    amount_krw,
    payment_method, 
    notes, 
    created_by
) VALUES (
    CURRENT_DATE - INTERVAL '90 days',
    '자본금',
    '초기 운영 자본금',
    500000000,  -- 5억원
    'transfer'::payment_method,
    '사업 시작 자본금',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
);

-- 재고 매입 비용 (월별로)
INSERT INTO cashbook_transactions (
    transaction_date,
    category,
    description,
    amount_krw,
    payment_method,
    notes,
    created_by
)
SELECT 
    CURRENT_DATE - (n || ' days')::INTERVAL,
    '매입',
    TO_CHAR(CURRENT_DATE - (n || ' days')::INTERVAL, 'MM') || '월 재고 매입',
    -(RANDOM() * 50000000 + 10000000)::NUMERIC,  -- -1천만원 ~ -6천만원
    'transfer'::payment_method,
    '명품 재고 매입',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
FROM generate_series(0, 60, 15) AS n;  -- 15일마다

-- 판매 수입 (완료된 주문들)
INSERT INTO cashbook_transactions (
    transaction_date,
    category,
    description,
    amount_krw,
    payment_method,
    order_id,
    notes,
    created_by
)
SELECT 
    o.order_date,
    '판매',
    '상품 판매 - ' || o.customer_name,
    o.total_krw,
    o.payment_method,
    o.id,
    '주문 #' || o.order_number,
    o.created_by
FROM orders o
WHERE o.status IN ('paid', 'shipped', 'done');

-- 환불 처리
INSERT INTO cashbook_transactions (
    transaction_date,
    category,
    description,
    amount_krw,
    payment_method,
    order_id,
    notes,
    created_by
)
SELECT 
    o.order_date + INTERVAL '3 days',
    '환불',
    '주문 환불 - ' || o.customer_name,
    -o.total_krw,
    o.payment_method,
    o.id,
    '환불 처리 #' || o.order_number,
    o.created_by
FROM orders o
WHERE o.status = 'refunded';

-- 운영비 (월별)
INSERT INTO cashbook_transactions (
    transaction_date,
    category,
    description,
    amount_krw,
    payment_method,
    notes,
    created_by
)
SELECT 
    DATE_TRUNC('month', CURRENT_DATE - (n || ' days')::INTERVAL) + INTERVAL '25 days',
    '운영비',
    TO_CHAR(CURRENT_DATE - (n || ' days')::INTERVAL, 'MM') || '월 사무실 임대료',
    -3500000,
    'transfer'::payment_method,
    '강남 사무실',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
FROM generate_series(0, 60, 30) AS n;  -- 30일마다

-- 기타 운영비
INSERT INTO cashbook_transactions (
    transaction_date,
    category,
    description,
    amount_krw,
    payment_method,
    notes,
    created_by
)
VALUES
    (CURRENT_DATE - INTERVAL '45 days', '마케팅', '온라인 광고비', -2500000, 'card'::payment_method, 'SNS 마케팅', (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)),
    (CURRENT_DATE - INTERVAL '30 days', '배송비', '국제배송 정산', -1850000, 'transfer'::payment_method, 'EMS/DHL', (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)),
    (CURRENT_DATE - INTERVAL '20 days', '인건비', '직원 급여', -8500000, 'transfer'::payment_method, '3명 급여', (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)),
    (CURRENT_DATE - INTERVAL '10 days', '세금', '부가세 납부', -4200000, 'transfer'::payment_method, '3분기 부가세', (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)),
    (CURRENT_DATE - INTERVAL '5 days', '수수료', '카드 수수료', -850000, 'card'::payment_method, '월 카드 수수료', (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1));

-- =====================================================
-- 7. 최종 데이터 확인
-- =====================================================

-- 결과 요약
SELECT 'Test Data Summary' as title;
SELECT '===================' as line;
SELECT 'Categories: ' || COUNT(*)::TEXT as result FROM categories
UNION ALL
SELECT 'Products: ' || COUNT(*)::TEXT FROM products
UNION ALL
SELECT 'Orders Total: ' || COUNT(*)::TEXT FROM orders
UNION ALL
SELECT '  - Paid: ' || COUNT(*)::TEXT FROM orders WHERE status = 'paid'
UNION ALL
SELECT '  - Shipped: ' || COUNT(*)::TEXT FROM orders WHERE status = 'shipped'
UNION ALL
SELECT '  - Done: ' || COUNT(*)::TEXT FROM orders WHERE status = 'done'
UNION ALL
SELECT '  - Cancelled: ' || COUNT(*)::TEXT FROM orders WHERE status = 'cancelled'
UNION ALL
SELECT '  - Refunded: ' || COUNT(*)::TEXT FROM orders WHERE status = 'refunded'
UNION ALL
SELECT 'Order Items: ' || COUNT(*)::TEXT FROM order_items
UNION ALL
SELECT 'Shipments: ' || COUNT(*)::TEXT FROM shipments
UNION ALL
SELECT 'Inventory Movements: ' || COUNT(*)::TEXT FROM inventory_movements
UNION ALL
SELECT 'Cashbook Transactions: ' || COUNT(*)::TEXT FROM cashbook_transactions
ORDER BY 1;