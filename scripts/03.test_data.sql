-- =====================================================
-- YUANDI ERP - BULK TEST DATA (대용량 테스트 데이터)
-- 상품 120개, 주문 400개 생성
-- 다양한 주문 상태 포함 (paid, shipped, done, refunded)
-- Updated: 2025-01-13 - Increased to 400 orders with PCCC
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
    v_category_id INTEGER;
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
    FOR v_category_id IN SELECT id FROM categories LOOP
        -- 각 카테고리당 13-14개 제품 생성 (총 120개 정도)
        FOR i IN 1..14 LOOP
            v_brand_idx := (v_counter % 8) + 1;
            v_model_idx := (v_counter % 15) + 1;
            v_color_idx := (v_counter % 10) + 1;
            v_size_idx := (v_counter % 11) + 1;
            
            -- SKU 생성
            v_sku := 'PRD-' || LPAD(v_counter::TEXT, 4, '0') || '-' || 
                     SUBSTR(MD5(RANDOM()::TEXT), 1, 6);
            
            -- 가격 생성 (판매가: 50만원 ~ 2000만원, 원가: 판매가의 60-80%)
            v_price_krw := ROUND((RANDOM() * 19500000 + 500000) / 10000) * 10000;
            v_price_cny := ROUND(v_price_krw * (0.6 + RANDOM() * 0.2) / 190);  -- 원가는 판매가의 60-80%
            
            -- 재고 생성 (0 ~ 50개)
            v_stock := FLOOR(RANDOM() * 51)::INTEGER;
            
            INSERT INTO products (
                sku, category_id, 
                name_ko, name_zh, 
                model, 
                color_ko, color_zh, 
                brand_ko, brand_zh, 
                size, 
                price_krw, cost_cny, 
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
        'refunded'::order_status
    ];
    v_payment_options payment_method[] := ARRAY[
        'card'::payment_method,
        'transfer'::payment_method,
        'cash'::payment_method
    ];
    -- PCCC는 동적으로 생성 (더 이상 배열 사용하지 않음)
    -- 총 140명의 고객 생성:
    -- - 최고 단골: 10명 (각 10회 주문)
    -- - 일반 단골: 20명 (각 6회 주문)
    -- - 가끔 고객: 20명 (각 3회 주문)
    -- - 재구매 고객: 30명 (각 2회 주문)
    -- - 신규 고객: 60명 (각 1회 주문)
    v_order_number TEXT;
    v_customer_name TEXT;
    v_customer_phone TEXT;
    v_customer_pccc TEXT;
    v_status order_status;
    v_payment payment_method;
    v_subtotal NUMERIC;
    v_date_counter INTEGER := 0;
BEGIN
    -- 관리자 ID 가져오기
    SELECT id INTO v_admin_id FROM user_profiles WHERE role = 'admin' LIMIT 1;
    
    -- 400개 주문 생성 (과거 90일 ~ 10일 전까지의 주문 데이터)
    FOR i IN 1..400 LOOP
        -- 날짜 설정 (과거 90일 전부터 10일 전까지 분산)
        v_date_counter := FLOOR(i / 5);  -- 날짜당 약 5개 주문
        -- 90일 전부터 시작하되, 최대 80일까지만 더해서 10일 전까지만 데이터 생성
        v_order_date := CURRENT_DATE - INTERVAL '90 days' + (LEAST(v_date_counter, 80) || ' days')::INTERVAL;
        
        -- 주문번호 생성 (날짜별 일련번호)
        v_order_number := TO_CHAR(v_order_date, 'YYMMDD') || '-' || 
                         LPAD(((i - 1) % 5 + 1)::TEXT, 3, '0');
        
        -- 고객 정보 생성
        v_customer_name := v_customer_names[((i - 1) % 25) + 1];
        v_customer_phone := '010-' || LPAD(((1000 + i * 7) % 9000 + 1000)::TEXT, 4, '0') || 
                           '-' || LPAD(((i * 13) % 9000 + 1000)::TEXT, 4, '0');
        
        -- PCCC 할당 (현실적인 고객 분포)
        -- 처음 50개 주문: PCCC 1-5번을 10번씩 사용 (각 고객당 10회 주문 = 최고 단골 5명)
        -- 다음 50개 주문: PCCC 6-10번을 10번씩 사용 (각 고객당 10회 주문 = 최고 단골 5명)
        -- 다음 60개 주문: PCCC 11-20번을 6번씩 사용 (각 고객당 6회 주문 = 일반 단골 10명)
        -- 다음 60개 주문: PCCC 21-30번을 6번씩 사용 (각 고객당 6회 주문 = 일반 단골 10명)
        -- 다음 60개 주문: PCCC 31-50번을 3번씩 사용 (각 고객당 3회 주문 = 가끔 오는 고객 20명)
        -- 다음 60개 주문: PCCC 51-80번을 2번씩 사용 (각 고객당 2회 주문 = 재구매 고객 30명)
        -- 나머지 60개 주문: PCCC 81-140번을 1번씩 사용 (각 고객당 1회 주문 = 신규 고객 60명)
        IF i <= 50 THEN
            v_customer_pccc := 'P' || LPAD(((i - 1) / 10 + 1)::TEXT, 11, '0');  -- PCCC 1-5
        ELSIF i <= 100 THEN
            v_customer_pccc := 'P' || LPAD(((i - 51) / 10 + 6)::TEXT, 11, '0');  -- PCCC 6-10
        ELSIF i <= 160 THEN
            v_customer_pccc := 'P' || LPAD(((i - 101) / 6 + 11)::TEXT, 11, '0');  -- PCCC 11-20
        ELSIF i <= 220 THEN
            v_customer_pccc := 'P' || LPAD(((i - 161) / 6 + 21)::TEXT, 11, '0');  -- PCCC 21-30
        ELSIF i <= 280 THEN
            v_customer_pccc := 'P' || LPAD(((i - 221) / 3 + 31)::TEXT, 11, '0');  -- PCCC 31-50
        ELSIF i <= 340 THEN
            v_customer_pccc := 'P' || LPAD(((i - 281) / 2 + 51)::TEXT, 11, '0');  -- PCCC 51-80
        ELSE
            v_customer_pccc := 'P' || LPAD((i - 340 + 80)::TEXT, 11, '0');  -- PCCC 81-140
        END IF;
        
        -- 주문 상태 설정 (분포: paid 25%, shipped 25%, done 35%, refunded 15%)
        IF i <= 100 THEN
            v_status := 'paid'::order_status;  -- 25% (100건)
        ELSIF i <= 200 THEN
            v_status := 'shipped'::order_status;  -- 25% (100건)
        ELSIF i <= 340 THEN
            v_status := 'done'::order_status;  -- 35% (140건)
        ELSE
            v_status := 'refunded'::order_status;  -- 15% (60건)
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
            customer_messenger_id,
            customer_memo,
            pccc,
            shipping_address_line1,
            shipping_address_line2,
            shipping_postal_code,
            status, 
            order_date, 
            subtotal_krw, 
            total_krw,
            payment_method,
            paid_at,
            notes, 
            created_by
        ) VALUES (
            v_order_number,
            v_customer_name,
            v_customer_phone,
            v_customer_name || '@example.com',  -- customer_email
            'kakao_' || SUBSTR(v_customer_phone, 4, 8),  -- customer_messenger_id
            CASE (i % 10)
                WHEN 0 THEN '빠른 배송 부탁드립니다'
                WHEN 1 THEN '선물포장 해주세요'
                WHEN 2 THEN '오후에 배송 부탁드립니다'
                WHEN 3 THEN '안전하게 포장해주세요'
                WHEN 4 THEN '문 앞에 놓아주세요'
                WHEN 5 THEN '경비실에 맡겨주세요'
                WHEN 6 THEN '주말 배송 가능한가요?'
                WHEN 7 THEN '배송 전 연락 부탁드립니다'
                WHEN 8 THEN '선물용이니 가격표 제거 부탁드립니다'
                ELSE NULL
            END,  -- customer_memo
            v_customer_pccc,  -- pccc (단골 고객 생성을 위해 중복 사용)
            '서울시 강남구 테헤란로 ' || (i % 100 + 1) || '길 ' || (i % 50 + 1),  -- shipping_address_line1
            (i % 10 + 1) || '층 ' || (i % 20 + 101) || '호',  -- shipping_address_line2
            LPAD(((i % 900) + 100)::TEXT, 3, '0') || LPAD(((i % 900) + 100)::TEXT, 3, '0'),  -- shipping_postal_code
            v_status,
            v_order_date,
            v_subtotal,
            v_subtotal,
            v_payment,
            v_order_date + INTERVAL '1 hour',  -- paid_at
            CASE (i % 15)
                WHEN 0 THEN 'VIP 고객, 빠른 배송 요청'
                WHEN 1 THEN '선물 포장 요청'
                WHEN 2 THEN '도매 구매 고객'
                WHEN 3 THEN '재구매 고객 - 할인 적용'
                WHEN 4 THEN '신규 고객 - 이벤트 쿠폰 사용'
                WHEN 5 THEN '생일 선물용 구매'
                WHEN 6 THEN '급한 배송 요청 - 항공 배송'
                WHEN 7 THEN '세금계산서 발행 요청'
                WHEN 8 THEN '해외 배송 문의 - 일본'
                WHEN 9 THEN '대량 구매 고객'
                WHEN 10 THEN '품절 후 재입고 알림 요청'
                WHEN 11 THEN '카카오톡 상담 후 구매'
                WHEN 12 THEN '인스타그램 광고 보고 구매'
                WHEN 13 THEN '친구 추천으로 구매'
                ELSE NULL
            END,
            v_admin_id
        );
    END LOOP;
END $$;

-- =====================================================
-- 3. ORDER ITEMS 생성 (주문당 1개 상품만)
-- =====================================================

DO $$
DECLARE
    v_order RECORD;
    v_product RECORD;
    v_quantity INTEGER;
    v_unit_price NUMERIC;
    v_total_price NUMERIC;
BEGIN
    -- 각 주문에 대해 상품 1개만 추가
    FOR v_order IN (SELECT id, total_krw FROM orders) LOOP
        -- 랜덤하게 상품 1개 선택
        SELECT id, price_krw, on_hand 
        INTO v_product
        FROM products 
        WHERE is_active = true 
        ORDER BY RANDOM() 
        LIMIT 1;
        
        -- 수량은 항상 1개로 설정
        v_quantity := 1;
        
        -- 가격 계산
        v_unit_price := v_product.price_krw;
        v_total_price := v_unit_price * v_quantity;
        
        -- 주문 아이템 추가 (주문당 1개만)
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            price_krw,
            total_price_krw
        ) VALUES (
            v_order.id,
            v_product.id,
            v_quantity,
            v_unit_price,
            v_total_price
        );
        
        -- 주문 총액 업데이트 (상품 1개 가격으로)
        UPDATE orders 
        SET subtotal_krw = v_total_price,
            total_krw = v_total_price
        WHERE id = v_order.id;
    END LOOP;
END $$;

-- =====================================================
-- 4. SHIPMENTS 생성 (shipped, done 상태 주문에 대해)
-- =====================================================

INSERT INTO shipments (
    order_id, 
    shipping_address,
    shipping_address_line1,
    shipping_address_line2,
    shipping_postal_code,
    shipping_method,
    -- 새로운 통합 컬럼
    courier,
    tracking_number,
    tracking_url,
    shipping_cost_cny,
    shipping_cost_krw,
    status,
    -- 레거시 컬럼 (하위 호환성)
    korea_tracking_number, 
    korea_shipping_company,
    china_tracking_number,
    china_shipping_company,
    shipped_date,
    delivered_date,
    actual_delivery_date
)
SELECT 
    o.id,
    -- shipping_address (주문의 배송 주소와 동일하게 설정)
    o.shipping_address_line1 || ' ' || o.shipping_address_line2,
    -- shipping_address_line1 (주문에서 가져오기)
    o.shipping_address_line1,
    -- shipping_address_line2 (주문에서 가져오기)
    o.shipping_address_line2,
    -- shipping_postal_code (주문에서 가져오기)
    o.shipping_postal_code,
    -- shipping_method (주문 상태에 따라 적절히 분배)
    CASE 
        WHEN o.status = 'done' AND RANDOM() < 0.3 THEN 'express'::shipping_method
        WHEN o.status = 'done' THEN 'standard'::shipping_method
        WHEN RANDOM() < 0.5 THEN 'express'::shipping_method
        ELSE 'standard'::shipping_method
    END,
    -- courier (중국 택배사 기준)
    CASE FLOOR(RANDOM() * 3)::INTEGER
        WHEN 0 THEN 'YUANSUN'
        WHEN 1 THEN 'SF'
        ELSE 'EMS'
    END,
    -- tracking_number
    'CN' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 10, '0'),
    -- tracking_url
    'https://track.example.com/cn/' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 10, '0'),
    -- shipping_cost_cny
    FLOOR(RANDOM() * 200 + 50)::DECIMAL(10,2),
    -- shipping_cost_krw
    FLOOR((RANDOM() * 200 + 50) * 180)::DECIMAL(12,0),
    -- status
    CASE 
        WHEN o.status = 'done' THEN 'delivered'
        ELSE 'in_transit'
    END,
    -- 레거시 컬럼들
    'KR' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 12, '0'),
    CASE FLOOR(RANDOM() * 4)::INTEGER
        WHEN 0 THEN 'CJ대한통운'
        WHEN 1 THEN '한진택배'
        WHEN 2 THEN '로젠택배'
        ELSE '우체국택배'
    END,
    'CN' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 10, '0'),
    CASE FLOOR(RANDOM() * 3)::INTEGER
        WHEN 0 THEN '顺丰速运'
        WHEN 1 THEN '韵达快递'
        ELSE 'EMS中国'
    END,
    o.order_date + INTERVAL '1 day' * FLOOR(RANDOM() * 3 + 1)::INTEGER,
    CASE 
        WHEN o.status = 'done' THEN 
            o.order_date + INTERVAL '1 day' * FLOOR(RANDOM() * 7 + 3)::INTEGER
        ELSE NULL 
    END,
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

-- Inventory 테이블 초기화 (products 테이블과 동기화)
INSERT INTO inventory (product_id, on_hand, allocated)
SELECT id, on_hand, 0 FROM products
ON CONFLICT (product_id) 
DO UPDATE SET 
    on_hand = EXCLUDED.on_hand,
    allocated = 0,
    updated_at = NOW();

-- 초기 재고 입고 기록
INSERT INTO inventory_movements (
    product_id, 
    movement_type, 
    quantity,
    previous_quantity, 
    new_quantity,
    reference_type, 
    note,  -- notes -> note로 변경
    movement_date,  -- 추가
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
    NOW(),  -- movement_date 추가
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
FROM products p;

-- 판매로 인한 재고 이동 (주문 상태가 refunded가 아닌 경우)
INSERT INTO inventory_movements (
    product_id,
    movement_type,
    quantity,
    previous_quantity,
    new_quantity,
    reference_type,
    reference_id,
    note,  -- notes -> note로 변경
    movement_date,  -- 추가
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
    o.order_date,  -- movement_date로 주문 날짜 사용
    o.created_by
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
WHERE o.status NOT IN ('refunded');

-- =====================================================
-- 6. CASHBOOK TRANSACTIONS 생성
-- =====================================================

-- 초기 자본금
INSERT INTO cashbook_transactions (
    transaction_date,
    type,
    category,
    amount,
    amount_krw,
    currency,
    fx_rate,
    description,
    note,
    created_by
) VALUES (
    CURRENT_DATE - INTERVAL '90 days',
    'income',
    'other_income',  -- 기타수입 출납유형
    500000000,
    500000000,  -- 5억원
    'KRW',
    1.0,
    '초기 운영 자본금',
    '사업 시작 자본금',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
);

-- 재고 매입 비용 (월별로)
INSERT INTO cashbook_transactions (
    transaction_date,
    type,
    category,
    amount,
    amount_krw,
    currency,
    fx_rate,
    description,
    note,
    created_by
)
SELECT 
    CURRENT_DATE - (n || ' days')::INTERVAL,
    'expense',
    'inbound',  -- 입고 출납유형
    (RANDOM() * 50000000 + 10000000)::NUMERIC,  -- 1천만원 ~ 6천만원 (양수)
    (RANDOM() * 50000000 + 10000000)::NUMERIC,
    'KRW',
    1.0,
    TO_CHAR(CURRENT_DATE - (n || ' days')::INTERVAL, 'MM') || '월 재고 매입',
    '명품 재고 매입',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
FROM generate_series(0, 60, 15) AS n;  -- 15일마다

-- 판매 수입 (완료된 주문들)
INSERT INTO cashbook_transactions (
    transaction_date,
    type,
    category,
    amount,
    amount_krw,
    currency,
    fx_rate,
    description,
    ref_type,
    ref_id,
    note,
    created_by
)
SELECT 
    o.order_date,
    'income',
    'sale',  -- 판매 출납유형
    o.total_krw,
    o.total_krw,
    'KRW',
    1.0,
    '상품 판매 - ' || o.customer_name,
    'order',
    o.id::TEXT,
    '주문 #' || o.order_number,
    o.created_by
FROM orders o
WHERE o.status IN ('paid', 'shipped', 'done');

-- 환불 처리
INSERT INTO cashbook_transactions (
    transaction_date,
    type,
    category,
    amount,
    amount_krw,
    currency,
    fx_rate,
    description,
    ref_type,
    ref_id,
    note,
    created_by
)
SELECT 
    o.order_date + INTERVAL '3 days',
    'expense',
    'refund',  -- 환불 출납유형
    o.total_krw,  -- 지출은 양수
    o.total_krw,
    'KRW',
    1.0,
    '주문 환불 - ' || o.customer_name,
    'order',
    o.id::TEXT,
    '환불 처리 #' || o.order_number,
    o.created_by
FROM orders o
WHERE o.status = 'refunded';

-- 운영비 (월별) - 과거 3개월분 임대료만
INSERT INTO cashbook_transactions (
    transaction_date,
    type,
    category,
    amount,
    amount_krw,
    currency,
    fx_rate,
    description,
    note,
    created_by
)
SELECT 
    -- 과거 각 월의 25일로 고정 (미래 날짜 없음)
    CURRENT_DATE - INTERVAL '1 month' - INTERVAL '5 days',  -- 전달 25일 정도
    'expense',
    'operation_cost',
    3500000,
    3500000,
    'KRW',
    1.0,
    TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'MM') || '월 사무실 임대료',
    '강남 사무실',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
UNION ALL
SELECT 
    CURRENT_DATE - INTERVAL '2 month' - INTERVAL '5 days',  -- 전전달 25일 정도
    'expense',
    'operation_cost',
    3500000,
    3500000,
    'KRW',
    1.0,
    TO_CHAR(CURRENT_DATE - INTERVAL '2 month', 'MM') || '월 사무실 임대료',
    '강남 사무실',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
UNION ALL
SELECT 
    CURRENT_DATE - INTERVAL '3 month' - INTERVAL '5 days',  -- 3달전 25일 정도
    'expense',
    'operation_cost',
    3500000,
    3500000,
    'KRW',
    1.0,
    TO_CHAR(CURRENT_DATE - INTERVAL '3 month', 'MM') || '월 사무실 임대료',
    '강남 사무실',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1);

-- 기타 운영비
INSERT INTO cashbook_transactions (
    transaction_date,
    type,
    category,
    amount,
    amount_krw,
    currency,
    fx_rate,
    description,
    note,
    created_by
)
VALUES
    (CURRENT_DATE - INTERVAL '45 days', 'expense', 'other_expense', 2500000, 2500000, 'KRW', 1.0, '온라인 광고비', 'SNS 마케팅', (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)),
    (CURRENT_DATE - INTERVAL '30 days', 'expense', 'shipping_fee', 1850000, 1850000, 'KRW', 1.0, '국제배송 정산', 'EMS/DHL', (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)),
    (CURRENT_DATE - INTERVAL '20 days', 'expense', 'operation_cost', 8500000, 8500000, 'KRW', 1.0, '직원 급여', '3명 급여', (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)),
    (CURRENT_DATE - INTERVAL '15 days', 'expense', 'other_expense', 4200000, 4200000, 'KRW', 1.0, '부가세 납부', '3분기 부가세', (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)),
    (CURRENT_DATE - INTERVAL '12 days', 'expense', 'other_expense', 850000, 850000, 'KRW', 1.0, '카드 수수료', '월 카드 수수료', (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1));

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
SELECT '  - Refunded: ' || COUNT(*)::TEXT FROM orders WHERE status = 'refunded'
UNION ALL
SELECT 'Order Items: ' || COUNT(*)::TEXT FROM order_items
UNION ALL
SELECT 'Shipments: ' || COUNT(*)::TEXT FROM shipments
UNION ALL
SELECT 'Inventory Movements: ' || COUNT(*)::TEXT FROM inventory_movements
UNION ALL
SELECT 'Cashbook Transactions: ' || COUNT(*)::TEXT FROM cashbook_transactions
UNION ALL
SELECT '===================' as line2
UNION ALL
SELECT 'Customer Statistics (PCCC):' as result
UNION ALL
SELECT '  - Total Customers: ' || COUNT(DISTINCT pccc)::TEXT FROM orders WHERE pccc IS NOT NULL
UNION ALL
SELECT '  - Repeat Customers (2+ orders): ' || COUNT(*)::TEXT FROM (
    SELECT pccc, COUNT(*) as order_count 
    FROM orders 
    WHERE pccc IS NOT NULL 
    GROUP BY pccc 
    HAVING COUNT(*) >= 2
) AS repeat_customers
UNION ALL
SELECT '  - Top Customer Orders: ' || MAX(order_count)::TEXT FROM (
    SELECT pccc, COUNT(*) as order_count 
    FROM orders 
    WHERE pccc IS NOT NULL 
    GROUP BY pccc
) AS customer_orders
ORDER BY 1;