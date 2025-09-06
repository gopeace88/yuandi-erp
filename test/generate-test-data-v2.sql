-- YUANDI ERP 테스트 데이터 생성 스크립트 v2
-- 실제 스키마에 맞춰 수정된 버전

-- 기존 데이터 삭제 (필요시)
-- TRUNCATE orders, order_items, products, product_categories, inventory, inventory_transactions CASCADE;

-- 0. 테스트를 위한 사용자 처리
-- 주의: 실제 운영에서는 Supabase Auth를 통해 사용자를 생성해야 합니다
-- 테스트 데이터에서는 기존 사용자를 사용하거나 NULL을 사용합니다

-- 1. 카테고리 데이터 (10개)
INSERT INTO product_categories (name, description, is_active) VALUES
('가방', '각종 가방 제품', true),
('신발', '운동화 및 구두', true),
('화장품', '스킨케어 및 메이크업', true),
('전자제품', '스마트폰 액세서리', true),
('의류', '남녀 의류', true),
('시계', '손목시계 및 스마트워치', true),
('액세서리', '목걸이, 반지 등', true),
('건강식품', '비타민 및 영양제', true),
('주방용품', '조리도구 및 식기', true),
('완구', '어린이 장난감', true)
ON CONFLICT (name) DO NOTHING;

-- 2. 상품 및 재고 데이터 (100개)
DO $$
DECLARE
    i INTEGER;
    cat_id UUID;
    prod_id UUID;
    brand_names TEXT[] := ARRAY['나이키', '아디다스', '구찌', '샤넬', '루이비통', '에르메스', '프라다', '버버리', '코치', '발렌시아가'];
    colors TEXT[] := ARRAY['블랙', '화이트', '레드', '블루', '그린', '옐로우', '핑크', '그레이', '브라운', '네이비'];
    models TEXT[] := ARRAY['2024-A', '2024-B', 'PRO-X', 'SLIM', 'MAX', 'PLUS', 'LITE', 'ULTRA', 'CLASSIC', 'PREMIUM'];
BEGIN
    FOR i IN 1..100 LOOP
        -- 랜덤 카테고리 선택
        SELECT id INTO cat_id FROM product_categories ORDER BY RANDOM() LIMIT 1;
        
        -- 상품 추가
        INSERT INTO products (
            category_id,
            sku,
            name,
            model,
            color,
            manufacturer,
            brand,
            cost_cny,
            price_krw,
            weight_g,
            dimensions_cm,
            description,
            low_stock_threshold,
            notes,
            is_active
        ) VALUES (
            cat_id,
            'SKU-' || LPAD(i::TEXT, 5, '0'),
            '상품명 ' || i,
            models[1 + (i % 10)],
            colors[1 + (i % 10)],
            '제조사 ' || ((i % 20) + 1),
            brand_names[1 + (i % 10)],
            100 + (i * 10),  -- 100 ~ 1100 CNY
            (100 + (i * 10)) * 180,  -- CNY를 KRW로 변환 (환율 180)
            200 + (i * 5),  -- 무게: 200g ~ 700g
            '10x8x' || (5 + (i % 10)),  -- 크기
            '테스트 상품 ' || i || '번입니다. 고품질 제품으로 인기가 많습니다.',
            5,
            '테스트 노트 ' || i,
            true
        ) RETURNING id INTO prod_id;
        
        -- inventory 테이블에 재고 추가
        INSERT INTO inventory (product_id, on_hand, allocated)
        VALUES (prod_id, 50 + (i % 100), 0);
    END LOOP;
END $$;

-- 3. 주문 데이터 (100개)
DO $$
DECLARE
    i INTEGER;
    j INTEGER;
    prod_id UUID;
    prod_price DECIMAL;
    order_id UUID;
    subtotal DECIMAL;
    customer_names TEXT[] := ARRAY['김철수', '이영희', '박지민', '최수현', '정하나', '강민준', '윤서연', '임도윤', '황예진', '송지우'];
    customer_phones TEXT[] := ARRAY['010-1234-5678', '010-2345-6789', '010-3456-7890', '010-4567-8901', '010-5678-9012'];
    addresses TEXT[] := ARRAY[
        '서울시 강남구 테헤란로 123',
        '서울시 서초구 서초대로 456', 
        '서울시 송파구 올림픽로 789',
        '경기도 성남시 분당구 판교로 321',
        '인천시 연수구 송도대로 654'
    ];
    cities TEXT[] := ARRAY['서울', '서울', '서울', '성남', '인천'];
    states TEXT[] := ARRAY['서울특별시', '서울특별시', '서울특별시', '경기도', '인천광역시'];
    statuses order_status[] := ARRAY['paid', 'shipped', 'done', 'paid', 'shipped']::order_status[];
    couriers courier_type[] := ARRAY['cj', 'hanjin', 'logen', 'cway', 'kdexp']::courier_type[];
BEGIN
    FOR i IN 1..100 LOOP
        -- 랜덤 상품 선택 (최대 3개)
        subtotal := 0;
        
        -- 주문 생성
        INSERT INTO orders (
            order_number,
            customer_name,
            customer_phone,
            customer_email,
            shipping_address_line1,
            shipping_city,
            shipping_state,
            shipping_postal_code,
            pccc,
            status,
            subtotal_krw,
            shipping_fee_krw,
            total_krw,
            payment_method,
            paid_at,
            courier,
            tracking_number,
            notes
        ) VALUES (
            'ORD-' || TO_CHAR(CURRENT_DATE - INTERVAL '1 day' * (100 - i), 'YYMMDD') || '-' || LPAD(((i - 1) % 20 + 1)::TEXT, 3, '0'),
            customer_names[1 + (i % 10)] || ' ' || i,
            customer_phones[1 + (i % 5)],
            'customer' || i || '@example.com',
            addresses[1 + (i % 5)] || ' ' || i || '동 ' || (100 + i) || '호',
            cities[1 + (i % 5)],
            states[1 + (i % 5)],
            LPAD(((10000 + i * 10) % 99999)::TEXT, 5, '0'),
            'P' || LPAD(i::TEXT, 11, '0'),
            statuses[1 + (i % 5)],
            0,  -- 일단 0으로 설정, 나중에 업데이트
            CASE WHEN i % 3 = 0 THEN 3000 ELSE 0 END,  -- 배송비
            0,  -- 일단 0으로 설정, 나중에 업데이트
            'card',
            CURRENT_TIMESTAMP - INTERVAL '1 day' * (100 - i),
            CASE WHEN statuses[1 + (i % 5)] IN ('shipped', 'done') THEN couriers[1 + (i % 5)] ELSE NULL END,
            CASE WHEN statuses[1 + (i % 5)] IN ('shipped', 'done') THEN 'TRK' || LPAD(i::TEXT, 10, '0') ELSE NULL END,
            '테스트 주문 ' || i
        ) RETURNING id INTO order_id;
        
        -- 주문 아이템 추가 (1~3개)
        FOR j IN 1..(1 + (i % 3)) LOOP
            -- 랜덤 상품 선택
            SELECT p.id, p.price_krw 
            INTO prod_id, prod_price 
            FROM products p
            INNER JOIN inventory inv ON p.id = inv.product_id
            WHERE inv.on_hand > 0
            ORDER BY RANDOM() 
            LIMIT 1;
            
            -- 주문 아이템 생성
            INSERT INTO order_items (
                order_id,
                product_id,
                quantity,
                unit_price_krw,
                total_price_krw
            ) VALUES (
                order_id,
                prod_id,
                1 + (j % 2),  -- 1~2개
                prod_price,
                prod_price * (1 + (j % 2))
            );
            
            subtotal := subtotal + (prod_price * (1 + (j % 2)));
            
            -- 재고 차감 (paid, shipped, done 상태인 경우)
            IF statuses[1 + (i % 5)] IN ('paid', 'shipped', 'done') THEN
                UPDATE inventory 
                SET allocated = allocated + (1 + (j % 2))
                WHERE product_id = prod_id;
                
                -- 재고 거래 기록
                INSERT INTO inventory_transactions (
                    product_id,
                    transaction_type,
                    quantity,
                    reference_type,
                    reference_id,
                    notes
                ) VALUES (
                    prod_id,
                    'outbound',
                    -(1 + (j % 2)),
                    'order',
                    order_id,
                    '주문 출고'
                );
            END IF;
        END LOOP;
        
        -- 주문 총액 업데이트
        UPDATE orders 
        SET subtotal_krw = subtotal,
            total_krw = subtotal + shipping_fee_krw
        WHERE id = order_id;
        
        -- shipped, done 상태인 경우 배송 날짜 업데이트
        IF statuses[1 + (i % 5)] IN ('shipped', 'done') THEN
            UPDATE orders
            SET shipped_at = paid_at + INTERVAL '1 day'
            WHERE id = order_id;
        END IF;
        
        -- done 상태인 경우 완료 날짜 업데이트
        IF statuses[1 + (i % 5)] = 'done' THEN
            UPDATE orders
            SET delivered_at = paid_at + INTERVAL '3 days'
            WHERE id = order_id;
        END IF;
    END LOOP;
END $$;

-- 4. 캐시북 데이터 (수입/지출)
DO $$
DECLARE
    i INTEGER;
    user_id UUID;
    expense_descs TEXT[] := ARRAY['배송비', '상품 구매', '환불 처리', '세금', '수수료'];
BEGIN
    -- 기존 user_profiles에서 첫 번째 사용자 가져오기
    -- 없으면 스킵
    SELECT id INTO user_id FROM user_profiles LIMIT 1;
    
    IF user_id IS NULL THEN
        RAISE NOTICE 'user_profiles 테이블에 사용자가 없습니다. cashbook_transactions 생성을 건너뜁니다.';
        RETURN;
    END IF;
    
    -- 주문 수입 기록 (orders에서 자동 생성)
    INSERT INTO cashbook_transactions (
        type,
        amount_krw,
        balance_krw,
        amount_cny,
        exchange_rate,
        description,
        reference_id,
        reference_type,
        transaction_date,
        category,
        created_by
    )
    SELECT 
        'order_payment'::transaction_type,
        total_krw,
        0, -- 나중에 트리거로 업데이트됨
        NULL,
        1,
        '주문 결제: ' || customer_name,
        id,
        'order',
        paid_at::DATE,
        'sales',
        user_id
    FROM orders
    WHERE status IN ('paid', 'shipped', 'done')
    AND paid_at IS NOT NULL;
    
    -- 지출 기록 (50개)
    FOR i IN 1..50 LOOP
        INSERT INTO cashbook_transactions (
            type,
            amount_krw,
            balance_krw,
            description,
            transaction_date,
            category,
            created_by
        ) VALUES (
            'expense'::transaction_type,
            -(10000 + (i * 1000)), -- 지출은 음수
            0, -- 나중에 트리거로 업데이트됨
            expense_descs[1 + (i % 5)] || ' ' || i,
            CURRENT_DATE - INTERVAL '1 day' * (50 - i),
            expense_descs[1 + (i % 5)],
            user_id
        );
    END LOOP;
END $$;

-- 5. 재고 입고 기록 (50개)
DO $$
DECLARE
    i INTEGER;
    prod_id UUID;
BEGIN
    FOR i IN 1..50 LOOP
        -- 랜덤 상품 선택
        SELECT id INTO prod_id 
        FROM products 
        ORDER BY RANDOM() 
        LIMIT 1;
        
        -- 재고 추가
        UPDATE inventory 
        SET on_hand = on_hand + (10 + (i % 20))
        WHERE product_id = prod_id;
        
        -- 재고 거래 기록
        INSERT INTO inventory_transactions (
            product_id,
            transaction_type,
            quantity,
            cost_per_unit_cny,
            total_cost_cny,
            reference_type,
            notes
        ) VALUES (
            prod_id,
            'inbound',
            10 + (i % 20),
            50 + (i * 2),
            (50 + (i * 2)) * (10 + (i % 20)),
            'purchase',
            '입고 처리 #' || i
        );
    END LOOP;
END $$;

-- 통계 출력
DO $$
DECLARE
    cat_count INTEGER;
    prod_count INTEGER;
    order_count INTEGER;
    inv_count INTEGER;
    cash_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO cat_count FROM product_categories;
    SELECT COUNT(*) INTO prod_count FROM products;
    SELECT COUNT(*) INTO order_count FROM orders;
    SELECT COUNT(*) INTO inv_count FROM inventory WHERE on_hand > 0;
    SELECT COUNT(*) INTO cash_count FROM cashbook_transactions;
    
    RAISE NOTICE '테스트 데이터 생성 완료!';
    RAISE NOTICE '- 카테고리: % 개', cat_count;
    RAISE NOTICE '- 상품: % 개', prod_count;
    RAISE NOTICE '- 주문: % 개', order_count;
    RAISE NOTICE '- 재고 보유 상품: % 개', inv_count;
    RAISE NOTICE '- 출납장부: % 개', cash_count;
END $$;