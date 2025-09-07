-- ====================================================================
-- Schema Consistency Fix Migration
-- Date: 2025-01-07
-- Purpose: 001_initial_schema.sql을 기준으로 모든 스키마 통일
-- ====================================================================

-- 1. User Role Enum 통일 (소문자 언더스코어 형식)
-- ====================================================================
DO $$ 
BEGIN
    -- 기존 타입이 대문자로 되어 있다면 수정
    IF EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'user_role' AND e.enumlabel IN ('admin', 'order_manager', 'ship_manager')
    ) THEN
        -- 임시 타입 생성
        CREATE TYPE user_role_new AS ENUM ('admin', 'order_manager', 'ship_manager', 'customer');
        
        -- 모든 테이블의 user_role 컬럼을 새 타입으로 변경
        ALTER TABLE profiles ALTER COLUMN role TYPE user_role_new USING 
            CASE role::text
                WHEN 'admin' THEN 'admin'::user_role_new
                WHEN 'order_manager' THEN 'order_manager'::user_role_new
                WHEN 'ship_manager' THEN 'ship_manager'::user_role_new
                ELSE role::text::user_role_new
            END;
            
        ALTER TABLE event_logs ALTER COLUMN actor_role TYPE user_role_new USING 
            CASE actor_role::text
                WHEN 'admin' THEN 'admin'::user_role_new
                WHEN 'order_manager' THEN 'order_manager'::user_role_new
                WHEN 'ship_manager' THEN 'ship_manager'::user_role_new
                ELSE actor_role::text::user_role_new
            END;
        
        -- 기존 타입 삭제하고 새 타입으로 교체
        DROP TYPE user_role CASCADE;
        ALTER TYPE user_role_new RENAME TO user_role;
    END IF;
END $$;

-- 2. Order Status Enum 통일 (소문자 형식)
-- ====================================================================
DO $$ 
BEGIN
    -- 기존 타입이 대문자로 되어 있다면 수정
    IF EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'order_status' AND e.enumlabel IN ('paid', 'shipped', 'delivered', 'cancelled', 'refunded')
    ) THEN
        -- 임시 타입 생성
        CREATE TYPE order_status_new AS ENUM ('paid', 'shipped', 'delivered', 'cancelled', 'refunded');
        
        -- orders 테이블의 status 컬럼을 새 타입으로 변경
        ALTER TABLE orders ALTER COLUMN status TYPE order_status_new USING 
            CASE status::text
                WHEN 'paid' THEN 'paid'::order_status_new
                WHEN 'shipped' THEN 'shipped'::order_status_new
                WHEN 'delivered' THEN 'delivered'::order_status_new
                WHEN 'cancelled' THEN 'cancelled'::order_status_new
                WHEN 'refunded' THEN 'refunded'::order_status_new
                ELSE status::text::order_status_new
            END;
        
        -- 기존 타입 삭제하고 새 타입으로 교체
        DROP TYPE order_status CASCADE;
        ALTER TYPE order_status_new RENAME TO order_status;
    END IF;
END $$;

-- 3. Orders 테이블 컬럼명 통일
-- ====================================================================
DO $$ 
BEGIN
    -- order_no → order_number
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'order_no') THEN
        ALTER TABLE orders RENAME COLUMN order_no TO order_number;
    END IF;
    
    -- pccc_code → pccc
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'pccc_code') THEN
        ALTER TABLE orders RENAME COLUMN pccc_code TO pccc;
    END IF;
    
    -- shipping_address → shipping_address_line1
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'shipping_address'
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'orders' AND column_name = 'shipping_address_line1')) THEN
        ALTER TABLE orders RENAME COLUMN shipping_address TO shipping_address_line1;
    END IF;
    
    -- shipping_address_detail → shipping_address_line2
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'shipping_address_detail') THEN
        ALTER TABLE orders RENAME COLUMN shipping_address_detail TO shipping_address_line2;
    END IF;
    
    -- zip_code → shipping_postal_code (필요한 경우)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'zip_code'
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'orders' AND column_name = 'shipping_postal_code')) THEN
        ALTER TABLE orders RENAME COLUMN zip_code TO shipping_postal_code;
    END IF;
    
    -- total_amount → total_krw (필요한 경우)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'total_amount'
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'orders' AND column_name = 'total_krw')) THEN
        ALTER TABLE orders RENAME COLUMN total_amount TO total_krw;
    END IF;
END $$;

-- 4. RLS 정책 업데이트 (소문자 role 사용)
-- ====================================================================

-- 기존 정책 삭제 및 재생성
DROP POLICY IF EXISTS "admin_full_access" ON profiles;
DROP POLICY IF EXISTS "order_manager_access" ON products;
DROP POLICY IF EXISTS "ship_manager_access" ON shipments;

-- 새 정책 생성 (소문자 role 값 사용)
CREATE POLICY "admin_full_access" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "order_manager_access" ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'order_manager')
        )
    );

CREATE POLICY "ship_manager_access" ON shipments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'ship_manager')
        )
    );

-- 5. 함수 업데이트 (소문자 role 사용)
-- ====================================================================
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role FROM profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 기본값 업데이트
-- ====================================================================
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'order_manager';
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'paid';

-- 7. 검증 쿼리
-- ====================================================================
DO $$ 
BEGIN
    RAISE NOTICE '=== Schema Consistency Check ===';
    
    -- User Role 확인
    RAISE NOTICE 'User Role values: %', 
        (SELECT string_agg(enumlabel, ', ') FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'user_role');
    
    -- Order Status 확인
    RAISE NOTICE 'Order Status values: %', 
        (SELECT string_agg(enumlabel, ', ') FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'order_status');
    
    -- Orders 테이블 컬럼 확인
    RAISE NOTICE 'Orders table columns: %', 
        (SELECT string_agg(column_name, ', ') FROM information_schema.columns WHERE table_name = 'orders' AND column_name LIKE '%order%' OR column_name LIKE '%ship%' ORDER BY ordinal_position);
END $$;

-- ====================================================================
-- Migration Complete
-- 모든 스키마가 001_initial_schema.sql 기준으로 통일되었습니다.
-- ====================================================================