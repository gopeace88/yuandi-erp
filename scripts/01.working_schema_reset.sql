-- =====================================================
-- YUANDI ERP - WORKING SCHEMA RESET
-- user_profiles 의존성 해결
-- =====================================================

-- 1. 테이블 삭제 (IF EXISTS로 안전)
DROP TABLE IF EXISTS event_logs CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS cashbook_transactions CASCADE;
DROP TABLE IF EXISTS cashbook_types CASCADE;  -- cashbook_types 추가
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;  -- user_profiles도 삭제 추가

SELECT 'Tables dropped successfully' as status;

-- 2. 타입 삭제
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS movement_type CASCADE;
DROP TYPE IF EXISTS cashbook_type CASCADE;
DROP TYPE IF EXISTS currency_type CASCADE;
DROP TYPE IF EXISTS locale_type CASCADE;

SELECT 'Types dropped successfully' as status;

-- 3. 타입 생성
-- PRD에서는 ADMIN, ORDER_MANAGER, SHIP_MANAGER로 표기하지만
-- 실제 DB에서는 소문자로 저장 (API 호환성 유지)
CREATE TYPE user_role AS ENUM ('admin', 'order_manager', 'ship_manager');
CREATE TYPE order_status AS ENUM ('paid', 'shipped', 'done', 'refunded', 'cancelled');
CREATE TYPE movement_type AS ENUM ('inbound', 'sale', 'adjustment', 'disposal');
-- PRD 정의 출납유형을 모두 포함 (시드 데이터와 완전 일치)
CREATE TYPE cashbook_type AS ENUM (
  -- 수입 유형
  'sale', 'refund_cancel', 'other_income',
  -- 지출 유형  
  'inbound', 'refund', 'shipping', 'operation_cost', 'other_expense',
  -- 조정 유형
  'adjustment', 'loss', 'correction'
);
CREATE TYPE currency_type AS ENUM ('KRW', 'CNY', 'USD');
CREATE TYPE locale_type AS ENUM ('ko', 'zh-CN', 'en');

SELECT 'Types created successfully' as status;

-- =====================================================
-- 4. User Profiles 테이블 생성
-- =====================================================

-- user_profiles 테이블 생성 (auth.users와 연결)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255),  -- API에서 사용 (해시된 비밀번호)
    role user_role NOT NULL DEFAULT 'order_manager',
    preferred_language VARCHAR(10) DEFAULT 'ko',
    locale locale_type DEFAULT 'ko',  -- PRD 정의에 따른 ENUM 적용
    phone VARCHAR(20),
    last_login_at TIMESTAMPTZ,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_profiles 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login_at);

-- RLS 정책 설정 (현재 무한 재귀 문제로 인해 비활성화)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (중복 방지)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

SELECT 'User profiles table created successfully!' as status;

-- =====================================================
-- 5. 메인 테이블 생성
-- =====================================================

-- Categories
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ko VARCHAR(100) NOT NULL,
    name_zh VARCHAR(100) NOT NULL, 
    description TEXT,
    display_order INTEGER DEFAULT 999,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID -- 외래키 제거, 단순 UUID
);

-- Products 
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    category_id UUID REFERENCES categories(id),
    name VARCHAR(200) NOT NULL,
    model VARCHAR(100),
    color VARCHAR(50),
    brand VARCHAR(100),
    manufacturer VARCHAR(100),  -- API에서 사용하는 필드 추가
    cost_cny DECIMAL(10,2) NOT NULL,
    price_krw DECIMAL(12,2),  -- sale_price_krw와 호환
    cost_krw DECIMAL(12,2),  -- 환율 자동 계산 필드
    price_cny DECIMAL(10,2),  -- 환율 자동 계산 필드
    exchange_rate DECIMAL(10,4) DEFAULT 195.00,
    low_stock_threshold INTEGER DEFAULT 5,
    on_hand INTEGER DEFAULT 0,
    barcode VARCHAR(50),
    image_url VARCHAR(500),
    description TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,  -- API에서 active로 사용
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID -- 외래키 제거, 단순 UUID
);

-- Cashbook Types (출납유형 관리)
CREATE TABLE cashbook_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name_ko VARCHAR(100) NOT NULL,
    name_zh VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'adjustment')),
    color VARCHAR(7) DEFAULT '#6B7280',
    description TEXT,
    display_order INTEGER DEFAULT 999,
    is_system BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID -- 외래키 제거, 단순 UUID
);

-- Inventory 
CREATE TABLE inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    on_hand INTEGER DEFAULT 0,
    allocated INTEGER DEFAULT 0,
    reserved INTEGER DEFAULT 0,  -- API에서 사용 (allocated의 별명)
    available INTEGER GENERATED ALWAYS AS (on_hand - allocated) STORED,
    location VARCHAR(50) DEFAULT 'MAIN',  -- API에서 사용
    last_counted_at TIMESTAMPTZ,  -- API에서 사용
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,  -- API에서 사용
    UNIQUE(product_id)
);

-- Orders
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_no VARCHAR(20) UNIQUE,  -- NULL 허용으로 변경 (트리거에서 자동 설정)
    order_number VARCHAR(20) UNIQUE NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    customer_messenger_id VARCHAR(100),
    pccc VARCHAR(20) NOT NULL,  -- API에서 pccc 사용
    shipping_address_line1 TEXT NOT NULL,  -- shipping_address → shipping_address_line1로 변경
    shipping_address_line2 TEXT,  -- shipping_address_detail → shipping_address_line2로 변경
    shipping_postal_code VARCHAR(10) NOT NULL,  -- zip_code → shipping_postal_code로 변경
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    status order_status NOT NULL DEFAULT 'paid',
    subtotal_krw DECIMAL(12,2) NOT NULL,
    shipping_fee_krw DECIMAL(12,2) DEFAULT 0,
    total_krw DECIMAL(12,2) NOT NULL,  -- total_amount 제거하고 total_krw만 사용
    currency currency_type DEFAULT 'KRW',
    payment_method VARCHAR(50) DEFAULT 'card',
    paid_at TIMESTAMPTZ,
    courier VARCHAR(50),  -- Shipments API에서 Orders 테이블 업데이트 시 사용 (113라인)
    tracking_number VARCHAR(50),  -- Shipments API에서 Orders 테이블 업데이트 시 사용 (114라인)
    shipped_at TIMESTAMPTZ,  -- order_status가 'shipped'로 변경될 때 설정
    delivered_at TIMESTAMPTZ,  -- order_status가 'done'(배송완료)으로 변경될 때 설정
    customer_memo TEXT,
    notes TEXT,  -- internal_memo → notes로 변경
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID, -- 외래키 제거
    updated_by UUID  -- 외래키 제거
);

-- Order Items
CREATE TABLE order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    product_category VARCHAR(50),
    product_model VARCHAR(100),
    product_color VARCHAR(50),
    product_brand VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2),  -- 호환성을 위해 유지
    unit_price_krw DECIMAL(12,2) NOT NULL,  -- API에서 사용하는 실제 필드
    subtotal DECIMAL(10,2),  -- 호환성을 위해 유지
    total_price_krw DECIMAL(12,2) NOT NULL,  -- API에서 사용하는 실제 필드
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipments
CREATE TABLE shipments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    courier VARCHAR(50),
    courier_code VARCHAR(20),
    tracking_no VARCHAR(50),
    tracking_number VARCHAR(50),  -- API에서 사용
    tracking_barcode VARCHAR(100),
    tracking_url VARCHAR(500),
    courier_cn VARCHAR(50),
    tracking_no_cn VARCHAR(100),
    tracking_url_cn VARCHAR(500),
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    shipping_cost_cny DECIMAL(10,2),  -- API에서 사용
    shipping_cost_krw DECIMAL(12,2),  -- API에서 사용
    actual_weight DECIMAL(10,2),
    volume_weight DECIMAL(10,2),
    weight_g INTEGER,  -- API에서 사용 (그램 단위)
    shipment_note TEXT,
    delivery_notes TEXT,  -- API에서 사용 (92라인)
    shipment_photo_url VARCHAR(500),
    receipt_photo_url VARCHAR(500),
    package_images TEXT[],  -- API에서 사용 (이미지 URL 배열)
    status VARCHAR(20) DEFAULT 'pending',  -- API에서 사용
    estimated_delivery_date DATE,  -- API에서 사용 (93라인)
    package_count INTEGER DEFAULT 1,  -- API에서 사용 (94라인)
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID -- 외래키 제거
);

-- Inventory Movements
CREATE TABLE inventory_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    ref_type VARCHAR(50),
    ref_id UUID,
    ref_no VARCHAR(50),
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(12,2),
    note TEXT,
    movement_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID -- 외래키 제거
);


-- Cashbook Transactions
CREATE TABLE cashbook_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type cashbook_type NOT NULL,
    amount DECIMAL(12,2),  -- NULL 허용 (amount_krw, amount_cny 사용)
    amount_cny DECIMAL(12,2),  -- API에서 사용하는 amount_cny 필드 추가
    currency currency_type DEFAULT 'KRW',
    exchange_rate DECIMAL(10,4) DEFAULT 1,  -- fx_rate → exchange_rate로 변경
    amount_krw DECIMAL(12,2) NOT NULL,
    reference_type VARCHAR(50),  -- ref_type → reference_type으로 변경
    reference_id UUID,  -- ref_id → reference_id로 변경
    ref_no VARCHAR(50),
    description TEXT,
    notes TEXT,  -- note → notes로 변경
    bank_name VARCHAR(50),
    account_no VARCHAR(50),
    category VARCHAR(50),  -- API에서 사용하는 category 필드 추가
    tags TEXT[],
    balance_krw DECIMAL(12,2) NOT NULL,  -- 잔액 필드 추가 (API에서 사용, 필수)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID -- 외래키 제거
);

-- Exchange Rates
CREATE TABLE exchange_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    base_currency VARCHAR(10) NOT NULL,
    target_currency VARCHAR(10) NOT NULL,
    rate DECIMAL(10,4) NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    valid_from DATE NOT NULL,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(base_currency, target_currency, valid_from)
);

-- Event Logs
CREATE TABLE event_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID, -- 외래키 제거
    actor_name VARCHAR(100),
    actor_role user_role,
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50),
    event_severity VARCHAR(20) DEFAULT 'info',
    entity_type VARCHAR(50),
    entity_id UUID,
    entity_name VARCHAR(200),
    action VARCHAR(50),
    before_data JSONB,
    after_data JSONB,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Settings (시스템 설정)
CREATE TABLE system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    value_type VARCHAR(20) NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
    category VARCHAR(50) DEFAULT 'general',
    name_ko VARCHAR(100) NOT NULL,
    name_zh VARCHAR(100) NOT NULL,
    description_ko TEXT,
    description_zh TEXT,
    min_value DECIMAL(10,2),
    max_value DECIMAL(10,2),
    default_value TEXT,
    is_required BOOLEAN DEFAULT true,
    is_editable BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 999,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

SELECT 'Tables created successfully' as status;

-- =====================================================
-- 5. 인덱스
-- =====================================================
CREATE INDEX idx_categories_code ON categories(code);
CREATE INDEX idx_categories_active ON categories(active);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_cashbook_transactions_date ON cashbook_transactions(transaction_date);
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

SELECT 'Indexes created successfully' as status;

-- =====================================================
-- 6. 함수 & 트리거
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sync inventory (products 테이블의 on_hand 값을 inventory로 동기화)
CREATE OR REPLACE FUNCTION sync_inventory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory (product_id, on_hand, allocated)
    VALUES (NEW.id, NEW.on_hand, 0)
    ON CONFLICT (product_id)
    DO UPDATE SET
        on_hand = NEW.on_hand,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sync order numbers (order_number → order_no)
CREATE OR REPLACE FUNCTION sync_order_numbers()
RETURNS TRIGGER AS $$
BEGIN
    -- order_number를 order_no에 복사 (API는 order_number만 INSERT)
    IF NEW.order_number IS NOT NULL AND NEW.order_no IS NULL THEN
        NEW.order_no = NEW.order_number;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sync category from category_id
CREATE OR REPLACE FUNCTION sync_product_category()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.category_id IS NOT NULL THEN
        SELECT code INTO NEW.category 
        FROM categories 
        WHERE id = NEW.category_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER sync_inventory_trigger AFTER INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION sync_inventory();
CREATE TRIGGER sync_order_numbers_trigger BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION sync_order_numbers();
CREATE TRIGGER sync_product_category_trigger BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION sync_product_category();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Functions and triggers created successfully' as status;

-- =====================================================
-- 7. 시드 데이터
-- =====================================================

-- Categories
INSERT INTO categories (code, name, name_ko, name_zh, display_order) VALUES
('louis_vuitton', 'Louis Vuitton', 'Louis Vuitton', '路易威登', 1),
('gucci', 'Gucci', 'Gucci', '古驰', 2),
('chanel', 'Chanel', 'Chanel', '香奈儿', 3),
('hermes', 'Hermes', 'Hermes', '爱马仕', 4),
('burberry', 'Burberry', 'Burberry', '博柏利', 5),
('prada', 'Prada', 'Prada', '普拉다', 6),
('dior', 'Dior', 'Dior', '迪奥', 7),
('balenciaga', 'Balenciaga', 'Balenciaga', '巴黎世家', 8),
('other', '기타', '기타', '其他', 999);

-- Cashbook Types (기본 출납유형 데이터)
INSERT INTO cashbook_types (code, name_ko, name_zh, type, color, description, display_order, is_system) VALUES
-- 수입 유형
('sale', '판매', '销售', 'income', '#10B981', '고객 주문에 따른 수입', 1, true),
('refund_cancel', '환불취소', '退款取消', 'income', '#059669', '환불 취소로 인한 수입', 2, true),
('other_income', '기타수입', '其他收入', 'income', '#14B8A6', '기타 수입', 3, true),
-- 지출 유형
('inbound', '입고', '入库', 'expense', '#EF4444', '상품 구매/입고 시 발생하는 지출', 10, true),
('refund', '환불', '退款', 'expense', '#DC2626', '고객 환불로 인한 지출', 11, true),
('shipping', '배송비', '运费', 'expense', '#F59E0B', '배송 관련 비용', 12, true),
('operation_cost', '운영비', '运营费', 'expense', '#F97316', '사무실 임대료, 인건비 등', 13, true),
('other_expense', '기타지출', '其他支出', 'expense', '#FB923C', '기타 지출', 14, true),
-- 조정 유형
('adjustment', '조정', '调整', 'adjustment', '#6B7280', '재고 조정 등 기타 조정 항목', 20, true),
('loss', '손실', '损失', 'adjustment', '#9CA3AF', '재고 손실, 파손 등', 21, true),
('correction', '정정', '更正', 'adjustment', '#A1A1AA', '입력 오류 정정', 22, true);

-- Exchange Rates (CNY만 필요)
INSERT INTO exchange_rates (base_currency, target_currency, rate, source, valid_from, is_active) VALUES
('CNY', 'KRW', 195.0000, 'system', CURRENT_DATE, true);

-- System Settings (재고 부족 임계값만 추가)
INSERT INTO system_settings (key, value, value_type, category, name_ko, name_zh, description_ko, description_zh, min_value, max_value, default_value, display_order, is_editable) VALUES
('low_stock_threshold_default', '2', 'number', 'inventory', '기본 재고 부족 임계값', '默认库存不足阈值', '신규 상품 등록 시 기본 재고 부족 임계값', '注册新产品时的默认库存不足阈值', 1, 100, '2', 1, true);

SELECT 'Seed data inserted successfully' as status;

-- =====================================================
-- 8. 관리자 계정 설정 (옵션)
-- =====================================================
-- 주의: auth.users에 관리자 계정이 이미 생성되어 있어야 함
-- 관리자 계정이 있다면 user_profiles에 프로필 생성

-- 기존 관리자 프로필 확인 및 생성
-- admin@yuandi.com 계정의 ID를 찾아서 프로필 생성
-- (Supabase Dashboard에서 수동으로 사용자를 먼저 생성해야 함)

/*
-- 예시: 관리자 프로필 수동 삽입 (auth.users에서 ID 확인 후)
INSERT INTO user_profiles (
    id,  -- auth.users의 ID와 동일해야 함
    email,
    name,
    role,
    preferred_language,
    locale,
    active
) VALUES (
    'YOUR-AUTH-USER-ID-HERE',  -- Supabase Dashboard에서 확인
    'admin@yuandi.com',
    '시스템 관리자',
    'admin',
    'ko',
    'ko',
    true
) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    active = true;
*/

SELECT 'Admin account setup note: Please create user in Supabase Dashboard first' as note;

-- =====================================================
-- 9. 최종 확인
-- =====================================================
SELECT 
  'FINAL CHECK' as phase,
  'user_profiles' as table_name, COUNT(*) as count FROM user_profiles
UNION ALL
SELECT 'FINAL CHECK', 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'FINAL CHECK', 'products', COUNT(*) FROM products
UNION ALL
SELECT 'FINAL CHECK', 'inventory', COUNT(*) FROM inventory  
UNION ALL
SELECT 'FINAL CHECK', 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'FINAL CHECK', 'exchange_rates', COUNT(*) FROM exchange_rates
UNION ALL
SELECT 'FINAL CHECK', 'system_settings', COUNT(*) FROM system_settings
ORDER BY count DESC;

SELECT '🎉 Working Schema Reset Complete!' as message;