-- YUANDI ERP 테스트 데이터 생성 스크립트
-- 100개씩의 테스트 데이터를 생성합니다.

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
('완구', '어린이 장난감', true);

-- 2. 상품 데이터 (100개)
DO $$
DECLARE
    i INTEGER;
    cat_id UUID;
    brand_names TEXT[] := ARRAY['나이키', '아디다스', '구찌', '샤넬', '루이비통', '에르메스', '프라다', '버버리', '코치', '발렌시아가'];
    colors TEXT[] := ARRAY['블랙', '화이트', '레드', '블루', '그린', '옐로우', '핑크', '그레이', '브라운', '네이비'];
    models TEXT[] := ARRAY['2024-A', '2024-B', 'PRO-X', 'SLIM', 'MAX', 'PLUS', 'LITE', 'ULTRA', 'CLASSIC', 'PREMIUM'];
BEGIN
    FOR i IN 1..100 LOOP
        -- 랜덤 카테고리 선택
        SELECT id INTO cat_id FROM product_categories ORDER BY RANDOM() LIMIT 1;
        
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
            5,
            '테스트 상품 ' || i || '번 입니다.',
            true
        );
        
        -- inventory 테이블에 재고 추가
        INSERT INTO inventory (product_id, on_hand, allocated)
        SELECT id, 50 + (i % 100), 0 FROM products WHERE sku = 'SKU-' || LPAD(i::TEXT, 5, '0');
    END LOOP;
END $$;

-- 3. 고객/주문 데이터 (100개)
DO $$
DECLARE
    i INTEGER;
    prod_id UUID;
    prod_price DECIMAL;
    order_id UUID;
    customer_names TEXT[] := ARRAY['김철수', '이영희', '박지민', '최수현', '정하나', '강민준', '윤서연', '임도윤', '황예진', '송지우'];
    customer_phones TEXT[] := ARRAY['010-1234-5678', '010-2345-6789', '010-3456-7890', '010-4567-8901', '010-5678-9012'];
    addresses TEXT[] := ARRAY[
        '서울시 강남구 테헤란로 123',
        '서울시 서초구 서초대로 456', 
        '서울시 송파구 올림픽로 789',
        '경기도 성남시 분당구 판교로 321',
        '인천시 연수구 송도대로 654'
    ];
    statuses TEXT[] := ARRAY['PAID', 'SHIPPED', 'DONE', 'PAID', 'SHIPPED'];
BEGIN
    FOR i IN 1..100 LOOP
        -- 랜덤 상품 선택
        SELECT id, price_krw INTO prod_id, prod_price FROM products ORDER BY RANDOM() LIMIT 1;
        
        -- 주문 생성
        INSERT INTO orders (
            id,
            order_no,
            order_date,
            customer_name,
            customer_phone,
            customer_email,
            pccc_code,
            shipping_address,
            shipping_address_detail,
            zip_code,
            status,
            total_amount,
            notes
        ) VALUES (
            gen_random_uuid(),
            'ORD-2025010' || (5 + (i / 20)) || '-' || LPAD(((i - 1) % 20 + 1)::TEXT, 3, '0'),
            CURRENT_DATE - INTERVAL '1 day' * (100 - i),
            customer_names[1 + (i % 10)] || ' ' || i,
            customer_phones[1 + (i % 5)],
            'customer' || i || '@example.com',
            'P' || LPAD(i::TEXT, 12, '0'),
            addresses[1 + (i % 5)],
            i || '동 ' || (100 + i) || '호',
            LPAD(((10000 + i * 10) % 99999)::TEXT, 5, '0'),
            statuses[1 + (i % 5)],
            prod_price * (1 + (i % 3)),  -- 1~3개 구매
            '테스트 주문 ' || i
        ) RETURNING id INTO order_id;
        
        -- 주문 아이템 생성
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            unit_price,
            subtotal
        ) VALUES (
            order_id,
            prod_id,
            1 + (i % 3),
            prod_price,
            prod_price * (1 + (i % 3))
        );
        
        -- 재고 차감 (PAID, SHIPPED 상태인 경우만)
        IF statuses[1 + (i % 5)] IN ('PAID', 'SHIPPED') THEN
            UPDATE products 
            SET on_hand = on_hand - (1 + (i % 3))
            WHERE id = prod_id AND on_hand >= (1 + (i % 3));
        END IF;
        
        -- SHIPPED 상태인 경우 배송 정보 추가
        IF statuses[1 + (i % 5)] = 'SHIPPED' THEN
            INSERT INTO shipments (
                order_id,
                tracking_no,
                courier,
                shipped_date,
                estimated_arrival,
                actual_arrival,
                status,
                notes
            ) VALUES (
                order_id,
                'TRK' || LPAD(i::TEXT, 10, '0'),
                CASE WHEN i % 3 = 0 THEN 'CJ대한통운' WHEN i % 3 = 1 THEN '한진택배' ELSE '로젠택배' END,
                CURRENT_DATE - INTERVAL '1 day' * (90 - i),
                CURRENT_DATE - INTERVAL '1 day' * (87 - i),
                NULL,
                'in_transit',
                '배송 중'
            );
        END IF;
        
        -- 출납장부에 기록 (PAID 상태인 경우)
        IF statuses[1 + (i % 5)] = 'PAID' THEN
            INSERT INTO cashbook (
                transaction_date,
                type,
                ref_type,
                ref_no,
                amount,
                currency,
                fx_rate,
                amount_krw,
                description,
                note,
                bank_name,
                account_no
            ) VALUES (
                CURRENT_DATE - INTERVAL '1 day' * (100 - i),
                'income',
                'order',
                'ORD-2025010' || (5 + (i / 20)) || '-' || LPAD(((i - 1) % 20 + 1)::TEXT, 3, '0'),
                prod_price * (1 + (i % 3)),
                'KRW',
                1,
                prod_price * (1 + (i % 3)),
                '주문 결제: ' || customer_names[1 + (i % 10)] || ' ' || i,
                '테스트 결제',
                '국민은행',
                '123-456-789012'
            );
        END IF;
    END LOOP;
END $$;

-- 4. 추가 출납장부 데이터 (50개 - 지출 내역)
DO $$
DECLARE
    i INTEGER;
    expense_types TEXT[] := ARRAY['shipping', 'purchase', 'refund', 'adjustment', 'fee'];
    expense_descs TEXT[] := ARRAY['배송비', '상품 구매', '환불 처리', '재고 조정', '수수료'];
BEGIN
    FOR i IN 1..50 LOOP
        INSERT INTO cashbook (
            transaction_date,
            type,
            ref_type,
            ref_no,
            amount,
            currency,
            fx_rate,
            amount_krw,
            description,
            note,
            bank_name,
            account_no
        ) VALUES (
            CURRENT_DATE - INTERVAL '1 day' * (50 - i),
            'expense',
            expense_types[1 + (i % 5)],
            'EXP-' || LPAD(i::TEXT, 6, '0'),
            -1 * (10000 + (i * 1000)),  -- 음수로 지출 표시
            'KRW',
            1,
            -1 * (10000 + (i * 1000)),
            expense_descs[1 + (i % 5)] || ' ' || i,
            '테스트 지출 ' || i,
            '신한은행',
            '987-654-321098'
        );
    END LOOP;
END $$;

-- 5. 재고 이동 기록 (50개)
DO $$
DECLARE
    i INTEGER;
    prod_id UUID;
    movement_types TEXT[] := ARRAY['inbound', 'outbound', 'adjustment', 'transfer', 'return'];
BEGIN
    FOR i IN 1..50 LOOP
        SELECT id INTO prod_id FROM products ORDER BY RANDOM() LIMIT 1;
        
        INSERT INTO inventory_movements (
            product_id,
            type,
            quantity,
            ref_type,
            ref_no,
            before_qty,
            after_qty,
            notes
        ) VALUES (
            prod_id,
            movement_types[1 + (i % 5)],
            CASE WHEN movement_types[1 + (i % 5)] = 'outbound' THEN -1 * (1 + (i % 10)) ELSE (1 + (i % 10)) END,
            'manual',
            'MV-' || LPAD(i::TEXT, 6, '0'),
            100,
            100 + CASE WHEN movement_types[1 + (i % 5)] = 'outbound' THEN -1 * (1 + (i % 10)) ELSE (1 + (i % 10)) END,
            '테스트 재고 이동 ' || i
        );
    END LOOP;
END $$;

-- 데이터 생성 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '테스트 데이터 생성 완료!';
    RAISE NOTICE '- 카테고리: 10개';
    RAISE NOTICE '- 상품: 100개';
    RAISE NOTICE '- 주문: 100개';
    RAISE NOTICE '- 배송: 약 40개 (SHIPPED 상태)';
    RAISE NOTICE '- 출납장부: 150개 (수입 100 + 지출 50)';
    RAISE NOTICE '- 재고이동: 50개';
END $$;