-- YUANDI ERP Seed Data
-- Initial data for development and testing

-- =============================================
-- TEST USERS (Create via Supabase Auth Dashboard)
-- =============================================
-- Admin User: admin@yuandi.com (password: Admin123!)
-- Order Manager: order@yuandi.com (password: Order123!)
-- Ship Manager: ship@yuandi.com (password: Ship123!)

-- Note: First create users in Supabase Auth, then insert profiles

-- =============================================
-- SAMPLE PRODUCTS
-- =============================================
INSERT INTO products (
    category, name, model, color, brand, 
    cost_cny, sale_price_krw, on_hand, low_stock_threshold
) VALUES 
    ('ELECTRONICS', 'iPhone 15 Pro', 'A3102', 'Natural Titanium', 'Apple', 
     7999, 1800000, 15, 5),
    
    ('ELECTRONICS', 'iPhone 15 Pro', 'A3102', 'Blue Titanium', 'Apple', 
     7999, 1800000, 8, 5),
    
    ('ELECTRONICS', 'AirPods Pro 2', 'A3048', 'White', 'Apple', 
     1799, 400000, 25, 10),
    
    ('FASHION', 'Classic Handbag', 'CF-M', 'Black', 'Chanel', 
     45000, 10000000, 3, 2),
    
    ('FASHION', 'Speedy 30', 'M41526', 'Monogram', 'Louis Vuitton', 
     9500, 2100000, 5, 3),
    
    ('COSMETICS', 'La Mer Cream', '60ML', 'Standard', 'La Mer', 
     2500, 550000, 20, 10),
    
    ('COSMETICS', 'Advanced Night Repair', '50ML', 'Standard', 'Estee Lauder', 
     800, 180000, 30, 15),
    
    ('SUPPLEMENTS', 'Omega-3', '180caps', 'Standard', 'Nordic Naturals', 
     250, 55000, 50, 20),
    
    ('SUPPLEMENTS', 'Vitamin D3', '365caps', 'Standard', 'NOW Foods', 
     120, 28000, 60, 25),
    
    ('TOYS', 'LEGO Creator Expert', '10297', 'Multi', 'LEGO', 
     1200, 280000, 10, 5);

-- =============================================
-- SAMPLE ORDERS (After creating users)
-- =============================================
-- These should be inserted after you have created users and have their IDs

/*
-- Example order creation (uncomment and update user_id after creating users)

-- First, get a user_id for the created_by field
-- Replace 'YOUR_USER_ID_HERE' with actual user ID from auth.users

INSERT INTO orders (
    customer_name, customer_phone, customer_email, pccc_code,
    shipping_address, zip_code, status, total_amount, created_by
) VALUES 
    ('김철수', '01012345678', 'kim@example.com', 'P123456789012',
     '서울특별시 강남구 테헤란로 123', '06234', 'PAID', 1800000, 'YOUR_USER_ID_HERE'),
    
    ('이영희', '01098765432', 'lee@example.com', 'P987654321098',
     '서울특별시 서초구 강남대로 456', '06789', 'SHIPPED', 400000, 'YOUR_USER_ID_HERE'),
    
    ('박민수', '01055556666', 'park@example.com', 'P555666777888',
     '경기도 성남시 분당구 판교로 789', '13579', 'DONE', 2100000, 'YOUR_USER_ID_HERE');

-- Add order items for the orders
-- You'll need to get the actual order IDs and product IDs after insertion

*/

-- =============================================
-- SAMPLE CASHBOOK ENTRIES
-- =============================================
-- These will be automatically created when orders are processed

-- =============================================
-- SAMPLE INVENTORY MOVEMENTS
-- =============================================
-- These will be automatically created when inventory changes

-- =============================================
-- CONFIGURATION DATA
-- =============================================

-- Courier companies
CREATE TABLE IF NOT EXISTS courier_companies (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tracking_url_template VARCHAR(500)
);

INSERT INTO courier_companies (code, name, tracking_url_template) VALUES
    ('cj', 'CJ대한통운', 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo={trackingNo}'),
    ('hanjin', '한진택배', 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2={trackingNo}'),
    ('lotte', '롯데택배', 'https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo={trackingNo}'),
    ('post', '우체국택배', 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1={trackingNo}'),
    ('logen', '로젠택배', 'https://www.ilogen.com/web/personal/trace/{trackingNo}'),
    ('cvsnet', 'GS25편의점택배', 'https://www.cvsnet.co.kr/invoice/tracking.do?invoice_no={trackingNo}'),
    ('cu', 'CU편의점택배', 'https://www.cupost.co.kr/postbox/delivery/localResult.cupost?invoice_no={trackingNo}');

-- =============================================
-- HELPER FUNCTIONS FOR TESTING
-- =============================================

-- Function to generate test orders
CREATE OR REPLACE FUNCTION generate_test_orders(num_orders INTEGER)
RETURNS void AS $$
DECLARE
    i INTEGER;
    v_user_id UUID;
    v_product RECORD;
    v_order_id UUID;
BEGIN
    -- Get first admin user
    SELECT id INTO v_user_id FROM profiles WHERE role = 'Admin' LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No admin user found. Please create users first.';
        RETURN;
    END IF;
    
    FOR i IN 1..num_orders LOOP
        -- Create order
        INSERT INTO orders (
            customer_name, 
            customer_phone, 
            pccc_code,
            shipping_address, 
            zip_code, 
            status, 
            total_amount,
            created_by
        ) VALUES (
            '테스트고객' || i,
            '0101234' || LPAD(i::TEXT, 4, '0'),
            'P' || LPAD(i::TEXT, 12, '0'),
            '서울시 테스트구 테스트로 ' || i,
            LPAD(i::TEXT, 5, '0'),
            CASE 
                WHEN i % 4 = 0 THEN 'DONE'
                WHEN i % 3 = 0 THEN 'SHIPPED'
                WHEN i % 2 = 0 THEN 'REFUNDED'
                ELSE 'PAID'
            END,
            0,
            v_user_id
        ) RETURNING id INTO v_order_id;
        
        -- Add random items to order
        FOR v_product IN 
            SELECT * FROM products 
            WHERE active = true 
            ORDER BY RANDOM() 
            LIMIT (1 + (RANDOM() * 3)::INTEGER)
        LOOP
            INSERT INTO order_items (
                order_id,
                product_id,
                sku,
                product_name,
                quantity,
                unit_price,
                subtotal
            ) VALUES (
                v_order_id,
                v_product.id,
                v_product.sku,
                v_product.name,
                1 + (RANDOM() * 2)::INTEGER,
                COALESCE(v_product.sale_price_krw, v_product.cost_cny * 180),
                COALESCE(v_product.sale_price_krw, v_product.cost_cny * 180) * (1 + (RANDOM() * 2)::INTEGER)
            );
        END LOOP;
        
        -- Update order total
        UPDATE orders 
        SET total_amount = (
            SELECT SUM(subtotal) FROM order_items WHERE order_id = v_order_id
        )
        WHERE id = v_order_id;
    END LOOP;
    
    RAISE NOTICE 'Generated % test orders', num_orders;
END;
$$ LANGUAGE plpgsql;

-- To generate test data, run:
-- SELECT generate_test_orders(20);

-- =============================================
-- CLEANUP FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_test_data()
RETURNS void AS $$
BEGIN
    -- Delete test orders and related data
    DELETE FROM orders WHERE customer_name LIKE '테스트고객%';
    
    -- Reset sequences if needed
    -- This is optional and depends on your needs
    
    RAISE NOTICE 'Test data cleaned up';
END;
$$ LANGUAGE plpgsql;

-- To cleanup test data, run:
-- SELECT cleanup_test_data();