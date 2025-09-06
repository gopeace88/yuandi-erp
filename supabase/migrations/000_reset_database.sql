-- YUANDI ERP 데이터베이스 리셋 스크립트
-- 주의: 이 스크립트는 모든 데이터를 삭제합니다!
-- 실행 전 백업을 권장합니다.

-- =================================
-- 1. 기존 RLS 정책 제거
-- =================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- =================================
-- 2. 기존 트리거 제거
-- =================================
DO $$ 
DECLARE
    trig RECORD;
BEGIN
    FOR trig IN 
        SELECT trigger_name, event_object_schema, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', 
            trig.trigger_name, trig.event_object_schema, trig.event_object_table);
    END LOOP;
END $$;

-- =================================
-- 3. 기존 함수 제거
-- =================================
DROP FUNCTION IF EXISTS generate_sku CASCADE;
DROP FUNCTION IF EXISTS generate_order_number CASCADE;
DROP FUNCTION IF EXISTS check_stock_availability CASCADE;
DROP FUNCTION IF EXISTS allocate_stock CASCADE;
DROP FUNCTION IF EXISTS deallocate_stock CASCADE;
DROP FUNCTION IF EXISTS consume_stock CASCADE;
DROP FUNCTION IF EXISTS calculate_cashbook_balance CASCADE;
DROP FUNCTION IF EXISTS get_dashboard_stats CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS log_changes CASCADE;
DROP FUNCTION IF EXISTS create_inventory_transaction CASCADE;
DROP FUNCTION IF EXISTS update_cashbook_balance CASCADE;
DROP FUNCTION IF EXISTS handle_order_status_change CASCADE;

-- =================================
-- 4. 기존 테이블 제거 (의존성 순서 고려)
-- =================================

-- 배송 관련 테이블
DROP TABLE IF EXISTS shipment_tracking_events CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;

-- 주문 관련 테이블
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- 재고 관련 테이블
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;

-- 상품 관련 테이블
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- 출납장부 테이블
DROP TABLE IF EXISTS cashbook_transactions CASCADE;
DROP TABLE IF EXISTS cashbook CASCADE;

-- 사용자 관련 테이블
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 시스템 관련 테이블
DROP TABLE IF EXISTS system_health_logs CASCADE;
DROP TABLE IF EXISTS event_logs CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- =================================
-- 5. 기존 타입 제거
-- =================================
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS courier_type CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS language_code CASCADE;

-- =================================
-- 6. 확장 기능은 유지 (필요한 경우)
-- =================================
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =================================
-- 완료 메시지
-- =================================
DO $$ 
BEGIN
    RAISE NOTICE '=================================';
    RAISE NOTICE '데이터베이스 리셋 완료!';
    RAISE NOTICE '=================================';
    RAISE NOTICE '모든 테이블, 함수, 트리거, 정책이 제거되었습니다.';
    RAISE NOTICE '이제 001_initial_schema.sql을 실행하여 새로운 스키마를 생성하세요.';
    RAISE NOTICE '=================================';
END $$;