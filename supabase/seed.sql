-- YUANDI ERP Database Seed Data
-- ================================
-- Based on 002_schema_v2.sql structure

-- Note: Create user in Supabase Auth first:
-- Email: admin@yuandi.com
-- Password: yuandi123!

-- 1. Create admin user profile (after auth user is created)
-- You need to get the actual user ID from Supabase Auth
-- This is a placeholder - replace with actual UUID
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the admin user ID from auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@yuandi.com';
    
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO user_profiles (id, name, email, phone, role, language, timezone, is_active)
        VALUES (
            admin_user_id,
            'System Admin',
            'admin@yuandi.com',
            '010-1234-5678',
            'admin',
            'ko',
            'Asia/Seoul',
            true
        ) ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
    ELSE
        RAISE NOTICE 'Admin user not found in auth.users. Please create user first.';
    END IF;
END $$;

-- 2. Insert sample products
INSERT INTO products (sku, category, name, model, color, brand, cost_cny, sale_price_krw, on_hand, low_stock_threshold, active) VALUES
('BAG-TB001-BLK-COACH-A1B2C', 'bags', 'Coach Tote Bag', 'TB001', 'Black', 'Coach', 1200.00, 250000, 15, 5, true),
('BAG-CB002-BRN-COACH-D3E4F', 'bags', 'Coach Crossbody', 'CB002', 'Brown', 'Coach', 900.00, 180000, 8, 5, true),
('WAL-LW003-BLK-COACH-G5H6I', 'wallets', 'Coach Long Wallet', 'LW003', 'Black', 'Coach', 400.00, 85000, 25, 10, true),
('WAL-SW004-RED-COACH-J7K8L', 'wallets', 'Coach Small Wallet', 'SW004', 'Red', 'Coach', 300.00, 65000, 12, 5, true),
('ACC-KC005-SLV-COACH-M9N0P', 'accessories', 'Coach Keychain', 'KC005', 'Silver', 'Coach', 150.00, 35000, 30, 10, true),
('BAG-BP006-BLK-MCM-Q1R2S', 'bags', 'MCM Backpack', 'BP006', 'Black', 'MCM', 2000.00, 420000, 5, 3, true),
('BAG-TB007-WHT-MCM-T3U4V', 'bags', 'MCM Tote Bag', 'TB007', 'White', 'MCM', 1800.00, 380000, 3, 3, true),
('WAL-CW008-BLK-LV-W5X6Y', 'wallets', 'Louis Vuitton Card Wallet', 'CW008', 'Black', 'Louis Vuitton', 350.00, 75000, 20, 5, true),
('ACC-SC009-BLU-HERM-Z7A8B', 'accessories', 'Hermes Scarf', 'SC009', 'Blue', 'Hermes', 500.00, 105000, 10, 3, true),
('BAG-SH010-BRN-PRADA-C9D0E', 'bags', 'Prada Shoulder Bag', 'SH010', 'Brown', 'Prada', 1500.00, 315000, 7, 3, true)
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    cost_cny = EXCLUDED.cost_cny,
    sale_price_krw = EXCLUDED.sale_price_krw,
    on_hand = EXCLUDED.on_hand,
    updated_at = NOW();

-- 3. Insert sample orders
INSERT INTO orders (order_number, order_date, customer_name, customer_phone, customer_email, pccc, shipping_address_line1, shipping_address_line2, shipping_postal_code, status, total_krw, currency, customer_memo, internal_memo) VALUES
('ORD-250107-001', '2025-01-07', '김민정', '010-2222-3333', 'minjung@example.com', 'P123456789012', '서울시 강남구 테헤란로 123', '아파트 101동 202호', '06234', 'paid', 335000, 'KRW', '빠른 배송 부탁드려요', '우수 고객'),
('ORD-250107-002', '2025-01-07', '이서연', '010-3333-4444', 'seoyeon@example.com', 'P234567890123', '서울시 서초구 강남대로 456', '오피스텔 501호', '06789', 'shipped', 180000, 'KRW', NULL, '택배 발송 완료'),
('ORD-250107-003', '2025-01-07', '박지훈', '010-4444-5555', 'jihoon@example.com', 'P345678901234', '경기도 성남시 분당구 판교로 789', NULL, '13456', 'delivered', 420000, 'KRW', '선물 포장 부탁드립니다', '선물 포장 완료'),
('ORD-250106-001', '2025-01-06', '최유나', '010-5555-6666', 'yuna@example.com', 'P456789012345', '부산시 해운대구 마린시티 123', '아파트 205동 1502호', '48120', 'paid', 150000, 'KRW', NULL, NULL),
('ORD-250106-002', '2025-01-06', '정태호', '010-6666-7777', 'taeho@example.com', 'P567890123456', '대구시 수성구 범어로 456', NULL, '42123', 'shipped', 315000, 'KRW', '출장 중이니 경비실에 맡겨주세요', '경비실 보관 요청')
ON CONFLICT (order_number) DO NOTHING;

-- 4. Insert order items (only if orders exist)
DO $$
DECLARE
    order1_id UUID;
    order2_id UUID;
    order3_id UUID;
    product1_id UUID;
    product2_id UUID;
    product3_id UUID;
    product4_id UUID;
BEGIN
    -- Get order IDs
    SELECT id INTO order1_id FROM orders WHERE order_number = 'ORD-250107-001';
    SELECT id INTO order2_id FROM orders WHERE order_number = 'ORD-250107-002';
    SELECT id INTO order3_id FROM orders WHERE order_number = 'ORD-250107-003';
    
    -- Get product IDs
    SELECT id INTO product1_id FROM products WHERE sku = 'BAG-TB001-BLK-COACH-A1B2C';
    SELECT id INTO product2_id FROM products WHERE sku = 'WAL-LW003-BLK-COACH-G5H6I';
    SELECT id INTO product3_id FROM products WHERE sku = 'BAG-CB002-BRN-COACH-D3E4F';
    SELECT id INTO product4_id FROM products WHERE sku = 'BAG-BP006-BLK-MCM-Q1R2S';
    
    -- Insert order items if both order and product exist
    IF order1_id IS NOT NULL AND product1_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, product_id, sku, product_name, product_category, product_model, product_color, product_brand, quantity, unit_price, subtotal)
        SELECT order1_id, id, sku, name, category, model, color, brand, 1, 250000, 250000
        FROM products WHERE id = product1_id
        ON CONFLICT DO NOTHING;
    END IF;
    
    IF order1_id IS NOT NULL AND product2_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, product_id, sku, product_name, product_category, product_model, product_color, product_brand, quantity, unit_price, subtotal)
        SELECT order1_id, id, sku, name, category, model, color, brand, 1, 85000, 85000
        FROM products WHERE id = product2_id
        ON CONFLICT DO NOTHING;
    END IF;
    
    IF order2_id IS NOT NULL AND product3_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, product_id, sku, product_name, product_category, product_model, product_color, product_brand, quantity, unit_price, subtotal)
        SELECT order2_id, id, sku, name, category, model, color, brand, 1, 180000, 180000
        FROM products WHERE id = product3_id
        ON CONFLICT DO NOTHING;
    END IF;
    
    IF order3_id IS NOT NULL AND product4_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, product_id, sku, product_name, product_category, product_model, product_color, product_brand, quantity, unit_price, subtotal)
        SELECT order3_id, id, sku, name, category, model, color, brand, 1, 420000, 420000
        FROM products WHERE id = product4_id
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 5. Insert sample shipments for shipped/delivered orders
INSERT INTO shipments (order_id, courier, courier_code, tracking_no, tracking_url, shipping_fee, shipped_at)
SELECT 
    id,
    'CJ대한통운',
    'kr.cjlogistics',
    '123456789012',
    'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=123456789012',
    3000,
    '2025-01-07 10:00:00'::timestamptz
FROM orders
WHERE order_number = 'ORD-250107-002'
ON CONFLICT (order_id) DO NOTHING;

INSERT INTO shipments (order_id, courier, courier_code, tracking_no, tracking_url, shipping_fee, shipped_at, delivered_at)
SELECT 
    id,
    '한진택배',
    'kr.hanjin', 
    '987654321098',
    'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=987654321098',
    3500,
    '2025-01-06 14:00:00'::timestamptz,
    '2025-01-07 16:00:00'::timestamptz
FROM orders
WHERE order_number = 'ORD-250107-003'
ON CONFLICT (order_id) DO NOTHING;

-- 6. Insert inventory movements
INSERT INTO inventory_movements (product_id, movement_type, quantity, balance_before, balance_after, ref_type, ref_no, unit_cost, total_cost, note, movement_date)
SELECT 
    id,
    'inbound',
    20,
    0,
    20,
    'purchase',
    'PO-2025-001',
    1200.00,
    24000.00,
    '초기 재고 입고',
    '2025-01-01'
FROM products
WHERE sku = 'BAG-TB001-BLK-COACH-A1B2C'
ON CONFLICT DO NOTHING;

-- 7. Insert cashbook entries
INSERT INTO cashbook_transactions (transaction_date, transaction_type, amount, currency, exchange_rate, amount_krw, reference_type, reference_id, description, notes)
VALUES
    ('2025-01-07', 'sale', 335000, 'KRW', 1, 335000, 'order', 'ORD-250107-001', '주문 결제', '김민정 고객'),
    ('2025-01-07', 'sale', 180000, 'KRW', 1, 180000, 'order', 'ORD-250107-002', '주문 결제', '이서연 고객'),
    ('2025-01-07', 'sale', 420000, 'KRW', 1, 420000, 'order', 'ORD-250107-003', '주문 결제', '박지훈 고객'),
    ('2025-01-06', 'sale', 150000, 'KRW', 1, 150000, 'order', 'ORD-250106-001', '주문 결제', '최유나 고객'),
    ('2025-01-06', 'sale', 315000, 'KRW', 1, 315000, 'order', 'ORD-250106-002', '주문 결제', '정태호 고객'),
    ('2025-01-01', 'inbound', 24000, 'CNY', 185, 4440000, 'purchase', 'PO-2025-001', '상품 매입', 'Coach 가방 매입'),
    ('2025-01-07', 'shipping', 3000, 'KRW', 1, 3000, 'shipment', '123456789012', '배송비', 'CJ대한통운'),
    ('2025-01-06', 'shipping', 3500, 'KRW', 1, 3500, 'shipment', '987654321098', '배송비', '한진택배')
ON CONFLICT DO NOTHING;