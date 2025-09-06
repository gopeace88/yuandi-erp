-- ==========================================
-- YUANDI ERP System - Test Data Generator
-- ==========================================
-- Purpose: Generate 1000+ records for each entity
-- Date: 2025-09-06
-- ==========================================

-- Configuration
DO $$
DECLARE
    v_product_count INTEGER := 1200;
    v_order_count INTEGER := 1500;
    v_user_count INTEGER := 50;
    i INTEGER;
    j INTEGER;
    v_product_id UUID;
    v_order_id UUID;
    v_user_id UUID;
    v_sku VARCHAR(100);
    v_order_no VARCHAR(50);
    v_tracking_no VARCHAR(100);
    v_current_balance DECIMAL(12,0) := 10000000; -- Initial balance 10M KRW
BEGIN
    RAISE NOTICE 'Starting test data generation...';
    
    -- ==========================================
    -- 1. Generate Users (50 users)
    -- ==========================================
    RAISE NOTICE 'Generating % users...', v_user_count;
    
    FOR i IN 1..v_user_count LOOP
        INSERT INTO users (email, name, role, language, active)
        VALUES (
            'user' || i || '@yuandi.com',
            CASE 
                WHEN i % 3 = 0 THEN '김' || i || '호'
                WHEN i % 3 = 1 THEN '이' || i || '수'
                ELSE '박' || i || '민'
            END,
            CASE 
                WHEN i <= 5 THEN 'admin'
                WHEN i <= 20 THEN 'order_manager'
                WHEN i <= 35 THEN 'ship_manager'
                ELSE 'customer'
            END,
            CASE WHEN i % 2 = 0 THEN 'ko' ELSE 'zh-CN' END,
            true
        );
    END LOOP;
    
    -- ==========================================
    -- 2. Generate Products (1200 products)
    -- ==========================================
    RAISE NOTICE 'Generating % products...', v_product_count;
    
    FOR i IN 1..v_product_count LOOP
        v_sku := generate_sku(
            CASE (i % 10)
                WHEN 0 THEN 'BAG'
                WHEN 1 THEN 'SHOES'
                WHEN 2 THEN 'CLOTH'
                WHEN 3 THEN 'ACC'
                WHEN 4 THEN 'WATCH'
                WHEN 5 THEN 'JEWEL'
                WHEN 6 THEN 'COSM'
                WHEN 7 THEN 'ELEC'
                WHEN 8 THEN 'FOOD'
                ELSE 'MISC'
            END,
            'MODEL' || LPAD(i::TEXT, 4, '0'),
            CASE (i % 8)
                WHEN 0 THEN 'BLACK'
                WHEN 1 THEN 'WHITE'
                WHEN 2 THEN 'RED'
                WHEN 3 THEN 'BLUE'
                WHEN 4 THEN 'GREEN'
                WHEN 5 THEN 'YELLOW'
                WHEN 6 THEN 'PINK'
                ELSE 'MULTI'
            END,
            CASE (i % 15)
                WHEN 0 THEN 'GUCCI'
                WHEN 1 THEN 'PRADA'
                WHEN 2 THEN 'CHANEL'
                WHEN 3 THEN 'LV'
                WHEN 4 THEN 'HERMES'
                WHEN 5 THEN 'DIOR'
                WHEN 6 THEN 'FENDI'
                WHEN 7 THEN 'CELINE'
                WHEN 8 THEN 'VERSACE'
                WHEN 9 THEN 'BURBERRY'
                WHEN 10 THEN 'NIKE'
                WHEN 11 THEN 'ADIDAS'
                WHEN 12 THEN 'APPLE'
                WHEN 13 THEN 'SAMSUNG'
                ELSE 'GENERIC'
            END
        );
        
        INSERT INTO products (
            sku, category, name, name_zh, model, color, brand,
            cost_cny, cost_krw, sale_price_krw, on_hand, low_stock_threshold,
            description, active
        ) VALUES (
            v_sku,
            CASE (i % 10)
                WHEN 0 THEN 'BAG'
                WHEN 1 THEN 'SHOES'
                WHEN 2 THEN 'CLOTH'
                WHEN 3 THEN 'ACC'
                WHEN 4 THEN 'WATCH'
                WHEN 5 THEN 'JEWEL'
                WHEN 6 THEN 'COSM'
                WHEN 7 THEN 'ELEC'
                WHEN 8 THEN 'FOOD'
                ELSE 'MISC'
            END,
            '테스트 상품 ' || i,
            '测试产品 ' || i,
            'MODEL' || LPAD(i::TEXT, 4, '0'),
            CASE (i % 8)
                WHEN 0 THEN 'BLACK'
                WHEN 1 THEN 'WHITE'
                WHEN 2 THEN 'RED'
                WHEN 3 THEN 'BLUE'
                WHEN 4 THEN 'GREEN'
                WHEN 5 THEN 'YELLOW'
                WHEN 6 THEN 'PINK'
                ELSE 'MULTI'
            END,
            CASE (i % 15)
                WHEN 0 THEN 'GUCCI'
                WHEN 1 THEN 'PRADA'
                WHEN 2 THEN 'CHANEL'
                WHEN 3 THEN 'LV'
                WHEN 4 THEN 'HERMES'
                WHEN 5 THEN 'DIOR'
                WHEN 6 THEN 'FENDI'
                WHEN 7 THEN 'CELINE'
                WHEN 8 THEN 'VERSACE'
                WHEN 9 THEN 'BURBERRY'
                WHEN 10 THEN 'NIKE'
                WHEN 11 THEN 'ADIDAS'
                WHEN 12 THEN 'APPLE'
                WHEN 13 THEN 'SAMSUNG'
                ELSE 'GENERIC'
            END,
            100 + (i % 1000) * 10,  -- cost_cny: 100-10,100 CNY
            (100 + (i % 1000) * 10) * 185,  -- cost_krw (exchange rate: 185)
            (100 + (i % 1000) * 10) * 185 * 1.3,  -- sale_price_krw (30% markup)
            50 + (i % 100),  -- on_hand: 50-150
            CASE 
                WHEN i % 10 = 0 THEN 10
                WHEN i % 10 < 5 THEN 5
                ELSE 3
            END,
            '이것은 테스트 상품 ' || i || '의 설명입니다. 페이지네이션 테스트를 위한 대량 데이터입니다.',
            i % 20 != 0  -- 5% inactive
        )
        RETURNING id INTO v_product_id;
        
        -- Add initial inventory movement for each product
        INSERT INTO inventory_movements (
            product_id, movement_type, quantity, reference_type, memo
        ) VALUES (
            v_product_id,
            'INBOUND',
            50 + (i % 100),
            'INITIAL',
            '초기 재고 입고'
        );
    END LOOP;
    
    -- ==========================================
    -- 3. Generate Orders (1500 orders)
    -- ==========================================
    RAISE NOTICE 'Generating % orders...', v_order_count;
    
    FOR i IN 1..v_order_count LOOP
        -- Generate order with varying dates (spread over last 6 months)
        v_order_no := 'ORD-' || TO_CHAR(CURRENT_DATE - (i % 180), 'YYMMDD') || '-' || LPAD((i % 999 + 1)::TEXT, 3, '0');
        
        INSERT INTO orders (
            order_no, customer_name, customer_phone, customer_email,
            status, payment_method, total_amount,
            shipping_name, shipping_phone, shipping_address, shipping_address_detail,
            zip_code, pccc_code,
            internal_memo, customer_memo,
            order_date, payment_date, shipped_date, completed_date
        ) VALUES (
            v_order_no,
            CASE (i % 100)
                WHEN 0 THEN '김철수'
                WHEN 1 THEN '이영희'
                WHEN 2 THEN '박민수'
                WHEN 3 THEN '최지우'
                WHEN 4 THEN '정다은'
                WHEN 5 THEN '강호동'
                WHEN 6 THEN '유재석'
                WHEN 7 THEN '송지효'
                WHEN 8 THEN '김종국'
                WHEN 9 THEN '하하'
                ELSE '테스트고객' || (i % 100)
            END,
            '010' || LPAD(((i * 1234) % 10000)::TEXT, 4, '0') || LPAD(((i * 5678) % 10000)::TEXT, 4, '0'),
            'customer' || i || '@test.com',
            CASE (i % 4)
                WHEN 0 THEN 'PAID'
                WHEN 1 THEN 'SHIPPED'
                WHEN 2 THEN 'DONE'
                ELSE 'PAID'
            END,
            CASE (i % 3)
                WHEN 0 THEN '신용카드'
                WHEN 1 THEN '계좌이체'
                ELSE '무통장입금'
            END,
            50000 + (i % 100) * 10000,  -- 50,000 - 1,050,000 KRW
            CASE (i % 100)
                WHEN 0 THEN '김철수'
                WHEN 1 THEN '이영희'
                WHEN 2 THEN '박민수'
                WHEN 3 THEN '최지우'
                WHEN 4 THEN '정다은'
                WHEN 5 THEN '강호동'
                WHEN 6 THEN '유재석'
                WHEN 7 THEN '송지효'
                WHEN 8 THEN '김종국'
                WHEN 9 THEN '하하'
                ELSE '수령인' || (i % 100)
            END,
            '010' || LPAD(((i * 4321) % 10000)::TEXT, 4, '0') || LPAD(((i * 8765) % 10000)::TEXT, 4, '0'),
            CASE (i % 5)
                WHEN 0 THEN '서울특별시 강남구 테헤란로 ' || (i % 100) || '길 ' || (i % 50)
                WHEN 1 THEN '경기도 성남시 분당구 판교로 ' || (i % 100) || '번길 ' || (i % 30)
                WHEN 2 THEN '부산광역시 해운대구 마린시티 ' || (i % 50) || '로 ' || (i % 20)
                WHEN 3 THEN '인천광역시 연수구 송도동 ' || (i % 100) || '-' || (i % 100)
                ELSE '대전광역시 유성구 대학로 ' || (i % 80) || '번길 ' || (i % 40)
            END,
            CASE (i % 3)
                WHEN 0 THEN '101동 ' || (i % 30 + 1) || '01호'
                WHEN 1 THEN (i % 10 + 1) || '층'
                ELSE '상가 ' || (i % 5 + 1) || '호'
            END,
            LPAD(((i * 123) % 100000)::TEXT, 5, '0'),
            CASE 
                WHEN i % 10 < 3 THEN 'P' || LPAD(((i * 987) % 1000000000000)::TEXT, 12, '0')
                WHEN i % 10 < 6 THEN 'M' || LPAD(((i * 654) % 1000000000000)::TEXT, 12, '0')
                ELSE NULL
            END,
            '내부 메모 #' || i || ' - 페이지네이션 테스트용',
            CASE WHEN i % 5 = 0 THEN '고객 요청사항 #' || i ELSE NULL END,
            CURRENT_TIMESTAMP - (i % 180 || ' days')::INTERVAL,
            CURRENT_TIMESTAMP - (i % 180 || ' days')::INTERVAL + '1 hour'::INTERVAL,
            CASE 
                WHEN i % 4 IN (1, 2) THEN CURRENT_TIMESTAMP - ((i % 180) - 2 || ' days')::INTERVAL
                ELSE NULL
            END,
            CASE 
                WHEN i % 4 = 2 THEN CURRENT_TIMESTAMP - ((i % 180) - 5 || ' days')::INTERVAL
                ELSE NULL
            END
        )
        RETURNING id INTO v_order_id;
        
        -- Add 1-5 order items per order
        FOR j IN 1..(1 + i % 5) LOOP
            -- Select a random product
            SELECT id INTO v_product_id 
            FROM products 
            OFFSET floor(random() * v_product_count) 
            LIMIT 1;
            
            INSERT INTO order_items (
                order_id, product_id, quantity, unit_price, subtotal
            ) VALUES (
                v_order_id,
                v_product_id,
                1 + (j % 3),  -- quantity: 1-3
                50000 + (j * 10000),  -- unit_price
                (1 + (j % 3)) * (50000 + (j * 10000))  -- subtotal
            );
            
            -- Add inventory movement for order
            INSERT INTO inventory_movements (
                product_id, movement_type, quantity, 
                reference_type, reference_id, memo
            ) VALUES (
                v_product_id,
                'OUTBOUND',
                -(1 + (j % 3)),
                'ORDER',
                v_order_id,
                '주문 출고: ' || v_order_no
            );
            
            -- Update product on_hand
            UPDATE products 
            SET on_hand = on_hand - (1 + (j % 3))
            WHERE id = v_product_id;
        END LOOP;
        
        -- Add cashbook entry for order
        v_current_balance := v_current_balance + (50000 + (i % 100) * 10000);
        INSERT INTO cashbook (
            transaction_date, transaction_type, category, amount, balance,
            reference_type, reference_id, description
        ) VALUES (
            CURRENT_TIMESTAMP - (i % 180 || ' days')::INTERVAL,
            '판매',
            '상품판매',
            50000 + (i % 100) * 10000,
            v_current_balance,
            'ORDER',
            v_order_id,
            '주문 ' || v_order_no || ' 판매 수익'
        );
        
        -- Generate shipment for SHIPPED and DONE orders
        IF i % 4 IN (1, 2) THEN
            v_tracking_no := CASE (i % 5)
                WHEN 0 THEN '1234' || LPAD(i::TEXT, 8, '0')
                WHEN 1 THEN '5678' || LPAD(i::TEXT, 8, '0')
                WHEN 2 THEN '9012' || LPAD(i::TEXT, 8, '0')
                WHEN 3 THEN '3456' || LPAD(i::TEXT, 8, '0')
                ELSE '7890' || LPAD(i::TEXT, 8, '0')
            END;
            
            INSERT INTO shipments (
                order_id, tracking_no, courier, status,
                shipped_date, delivered_date, memo
            ) VALUES (
                v_order_id,
                v_tracking_no,
                CASE (i % 5)
                    WHEN 0 THEN 'CJ대한통운'
                    WHEN 1 THEN '한진택배'
                    WHEN 2 THEN '롯데택배'
                    WHEN 3 THEN '우체국택배'
                    ELSE '로젠택배'
                END,
                CASE 
                    WHEN i % 4 = 2 THEN 'DELIVERED'
                    ELSE 'IN_TRANSIT'
                END,
                CURRENT_TIMESTAMP - ((i % 180) - 2 || ' days')::INTERVAL,
                CASE 
                    WHEN i % 4 = 2 THEN CURRENT_TIMESTAMP - ((i % 180) - 5 || ' days')::INTERVAL
                    ELSE NULL
                END,
                '배송 메모 #' || i
            );
            
            -- Add cashbook entry for shipping
            v_current_balance := v_current_balance - 3000;
            INSERT INTO cashbook (
                transaction_date, transaction_type, category, amount, balance,
                reference_type, reference_id, description
            ) VALUES (
                CURRENT_TIMESTAMP - ((i % 180) - 2 || ' days')::INTERVAL,
                '배송',
                '배송비',
                -3000,
                v_current_balance,
                'SHIPMENT',
                v_order_id,
                '주문 ' || v_order_no || ' 배송비'
            );
        END IF;
        
        -- Add refund entries for some orders (5%)
        IF i % 20 = 0 THEN
            UPDATE orders 
            SET status = 'REFUNDED', 
                refunded_date = CURRENT_TIMESTAMP - ((i % 180) - 10 || ' days')::INTERVAL
            WHERE id = v_order_id;
            
            -- Add refund cashbook entry
            v_current_balance := v_current_balance - (50000 + (i % 100) * 10000);
            INSERT INTO cashbook (
                transaction_date, transaction_type, category, amount, balance,
                reference_type, reference_id, description
            ) VALUES (
                CURRENT_TIMESTAMP - ((i % 180) - 10 || ' days')::INTERVAL,
                '환불',
                '판매환불',
                -(50000 + (i % 100) * 10000),
                v_current_balance,
                'REFUND',
                v_order_id,
                '주문 ' || v_order_no || ' 환불'
            );
        END IF;
    END LOOP;
    
    -- ==========================================
    -- 4. Add additional cashbook entries for diversity
    -- ==========================================
    RAISE NOTICE 'Generating additional cashbook entries...';
    
    FOR i IN 1..500 LOOP
        v_current_balance := v_current_balance + 
            CASE (i % 5)
                WHEN 0 THEN -50000  -- 지출
                WHEN 1 THEN 100000  -- 수입
                WHEN 2 THEN -30000  -- 지출
                WHEN 3 THEN 200000  -- 수입
                ELSE -10000  -- 지출
            END;
            
        INSERT INTO cashbook (
            transaction_date, transaction_type, category, amount, balance,
            description, memo
        ) VALUES (
            CURRENT_TIMESTAMP - ((i * 8) % 365 || ' days')::INTERVAL,
            CASE (i % 6)
                WHEN 0 THEN '입고'
                WHEN 1 THEN '조정'
                WHEN 2 THEN '기타수입'
                WHEN 3 THEN '기타지출'
                WHEN 4 THEN '운영비'
                ELSE '세금'
            END,
            CASE (i % 6)
                WHEN 0 THEN '상품구매'
                WHEN 1 THEN '재고조정'
                WHEN 2 THEN '기타'
                WHEN 3 THEN '기타'
                WHEN 4 THEN '운영'
                ELSE '세무'
            END,
            CASE (i % 5)
                WHEN 0 THEN -50000
                WHEN 1 THEN 100000
                WHEN 2 THEN -30000
                WHEN 3 THEN 200000
                ELSE -10000
            END,
            v_current_balance,
            '추가 거래 #' || i,
            '페이지네이션 테스트용 추가 데이터'
        );
    END LOOP;
    
    -- ==========================================
    -- 5. Generate Event Logs
    -- ==========================================
    RAISE NOTICE 'Generating event logs...';
    
    FOR i IN 1..2000 LOOP
        INSERT INTO event_logs (
            event_type, entity_type, entity_id,
            actor_email, changes, ip_address, user_agent
        ) VALUES (
            CASE (i % 5)
                WHEN 0 THEN 'CREATE'
                WHEN 1 THEN 'UPDATE'
                WHEN 2 THEN 'DELETE'
                WHEN 3 THEN 'LOGIN'
                ELSE 'VIEW'
            END,
            CASE (i % 4)
                WHEN 0 THEN 'ORDER'
                WHEN 1 THEN 'PRODUCT'
                WHEN 2 THEN 'SHIPMENT'
                ELSE 'USER'
            END,
            gen_random_uuid(),
            'user' || (i % 50 + 1) || '@yuandi.com',
            jsonb_build_object(
                'action', 'test_action_' || i,
                'timestamp', CURRENT_TIMESTAMP - (i || ' hours')::INTERVAL
            ),
            ('192.168.1.' || (i % 254 + 1))::INET,
            'Mozilla/5.0 Test Agent ' || i
        );
    END LOOP;
    
    -- ==========================================
    -- Summary
    -- ==========================================
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Test data generation completed!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Users created: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Products created: %', (SELECT COUNT(*) FROM products);
    RAISE NOTICE 'Orders created: %', (SELECT COUNT(*) FROM orders);
    RAISE NOTICE 'Order items created: %', (SELECT COUNT(*) FROM order_items);
    RAISE NOTICE 'Shipments created: %', (SELECT COUNT(*) FROM shipments);
    RAISE NOTICE 'Inventory movements: %', (SELECT COUNT(*) FROM inventory_movements);
    RAISE NOTICE 'Cashbook entries: %', (SELECT COUNT(*) FROM cashbook);
    RAISE NOTICE 'Event logs: %', (SELECT COUNT(*) FROM event_logs);
    RAISE NOTICE '===========================================';
    
END $$;