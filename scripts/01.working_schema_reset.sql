-- =====================================================
-- YUANDI ERP - WORKING SCHEMA RESET
-- 다국어 지원 스키마 (한글/중문)
-- =====================================================

-- 1. 테이블 삭제 (CASCADE로 안전하게)
DROP TABLE IF EXISTS event_logs CASCADE;
DROP TABLE IF EXISTS cashbook_transactions CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

SELECT 'Tables dropped successfully' as status;

-- 2. 타입 삭제
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_language CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS shipping_method CASCADE;
DROP TYPE IF EXISTS movement_type CASCADE;
DROP TYPE IF EXISTS reference_type CASCADE;
DROP TYPE IF EXISTS event_action CASCADE;

SELECT 'Types dropped successfully' as status;

-- 3. 타입 생성
CREATE TYPE user_role AS ENUM ('admin', 'order_manager', 'ship_manager');
CREATE TYPE user_language AS ENUM ('ko', 'zh', 'en');
CREATE TYPE order_status AS ENUM ('paid', 'shipped', 'done', 'refunded', 'cancelled');
CREATE TYPE payment_method AS ENUM ('card', 'cash', 'transfer', 'alipay', 'wechat', 'other');
CREATE TYPE shipping_method AS ENUM ('standard', 'express', 'pickup', 'international');
CREATE TYPE movement_type AS ENUM ('inbound', 'sale', 'adjustment', 'disposal');
CREATE TYPE reference_type AS ENUM ('order', 'return', 'damage', 'lost', 'found', 'adjustment');
CREATE TYPE event_action AS ENUM ('create', 'update', 'delete');

SELECT 'Types created successfully' as status;

-- =====================================================
-- 4. USER PROFILES TABLE
-- =====================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'order_manager',
  language user_language NOT NULL DEFAULT 'ko',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 5. MAIN TABLES
-- =====================================================

-- 카테고리 테이블 (브랜드 기반)
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_ko TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 상품 테이블 (다국어 지원)
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  category_id INTEGER REFERENCES categories(id),
  name_ko TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  model TEXT,
  color_ko TEXT,
  color_zh TEXT,
  brand_ko TEXT,
  brand_zh TEXT,
  size TEXT,
  unit_price_krw NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit_price_cny NUMERIC(10,2) NOT NULL DEFAULT 0,
  on_hand INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 주문 테이블
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'paid',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal_krw NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_krw NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'card',
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 주문 아이템 테이블
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_krw NUMERIC(10,2) NOT NULL,
  total_price_krw NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 배송 테이블
CREATE TABLE shipments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shipping_address TEXT NOT NULL,
  shipping_method shipping_method NOT NULL DEFAULT 'standard',
  korea_tracking_number TEXT,
  china_tracking_number TEXT,
  korea_shipping_company TEXT,
  china_shipping_company TEXT,
  shipped_date DATE,
  delivered_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 재고 이동 테이블
CREATE TABLE inventory_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  movement_type movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_type reference_type,
  reference_id INTEGER,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 가계부 거래 테이블
CREATE TABLE cashbook_transactions (
  id SERIAL PRIMARY KEY,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_krw NUMERIC(15,2) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'card',
  order_id INTEGER REFERENCES orders(id),
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 이벤트 로그 테이블
CREATE TABLE event_logs (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  action event_action NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 6. INDEXES
-- =====================================================
-- 카테고리 인덱스
CREATE INDEX idx_categories_code ON categories(code);
CREATE INDEX idx_categories_active ON categories(is_active);

-- 상품 인덱스
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);

-- 주문 인덱스
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_customer ON orders(customer_name, customer_phone);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_created_by ON orders(created_by);

-- 주문 아이템 인덱스
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- 배송 인덱스
CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_korea_tracking ON shipments(korea_tracking_number);
CREATE INDEX idx_shipments_china_tracking ON shipments(china_tracking_number);

-- 재고 이동 인덱스
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);
CREATE INDEX idx_inventory_movements_created_by ON inventory_movements(created_by);

-- 가계부 인덱스
CREATE INDEX idx_cashbook_date ON cashbook_transactions(transaction_date);
CREATE INDEX idx_cashbook_category ON cashbook_transactions(category);
CREATE INDEX idx_cashbook_order ON cashbook_transactions(order_id);
CREATE INDEX idx_cashbook_created_by ON cashbook_transactions(created_by);

-- 이벤트 로그 인덱스
CREATE INDEX idx_event_logs_table_record ON event_logs(table_name, record_id);
CREATE INDEX idx_event_logs_user ON event_logs(user_id);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at);

SELECT 'Indexes created successfully' as status;

-- =====================================================
-- 7. FUNCTIONS & TRIGGERS
-- =====================================================
-- Updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated_at 트리거들
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cashbook_transactions_updated_at BEFORE UPDATE ON cashbook_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 재고 이동 자동 기록 함수
CREATE OR REPLACE FUNCTION record_inventory_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- 재고가 변경된 경우에만 기록
    IF OLD.on_hand IS DISTINCT FROM NEW.on_hand THEN
        INSERT INTO inventory_movements (
            product_id,
            movement_type,
            quantity,
            previous_quantity,
            new_quantity,
            reference_type,
            notes
        ) VALUES (
            NEW.id,
            CASE 
                WHEN NEW.on_hand > OLD.on_hand THEN 'inbound'::movement_type
                ELSE 'sale'::movement_type
            END,
            ABS(NEW.on_hand - OLD.on_hand),
            OLD.on_hand,
            NEW.on_hand,
            'adjustment'::reference_type,
            'Auto-recorded inventory change'
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 재고 이동 트리거
CREATE TRIGGER trigger_record_inventory_movement 
    AFTER UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION record_inventory_movement();

SELECT 'Functions and triggers created successfully' as status;

-- =====================================================
-- 8. SEED DATA
-- =====================================================

-- 기본 카테고리 (브랜드 기반)
INSERT INTO categories (code, name_ko, name_zh, display_order) VALUES
('louis_vuitton', 'Louis Vuitton', '路易威登', 1),
('gucci', 'Gucci', '古驰', 2),
('chanel', 'Chanel', '香奈儿', 3),
('hermes', 'Hermes', '爱马仕', 4),
('burberry', 'Burberry', '博柏利', 5),
('prada', 'Prada', '普拉达', 6),
('dior', 'Dior', '迪奥', 7),
('balenciaga', 'Balenciaga', '巴黎世家', 8),
('other', '기타', '其他', 999);

-- 샘플 상품 (다국어 지원)
INSERT INTO products (sku, category_id, name_ko, name_zh, model, color_ko, color_zh, brand_ko, brand_zh, size, unit_price_krw, unit_price_cny, on_hand) VALUES
('LV-SPEEDY30-BRN-LV-A1B2C', 1, '스피디 30', 'Speedy 30', 'SPEEDY30', '브라운', '棕色', 'Louis Vuitton', '路易威登', '30', 2850000.00, 15000.00, 3),
('GU-MARMONT-BLK-GU-D3E4F', 2, '마몬트 백', 'Marmont包', 'MARMONT', '블랙', '黑色', 'Gucci', '古驰', 'M', 1950000.00, 10200.00, 4),
('CH-CLASSIC-BLK-CH-G5H6I', 3, '클래식 플랩백', '经典翻盖包', 'CLASSIC', '블랙', '黑色', 'Chanel', '香奈儿', 'M', 8500000.00, 44700.00, 2),
('HM-BIRKIN30-BLK-HM-J7K8L', 4, '버킨 30', 'Birkin 30', 'BIRKIN30', '블랙', '黑色', 'Hermes', '爱马仕', '30', 15000000.00, 78900.00, 1),
('BB-TRENCH-BEI-BB-M9N0P', 5, '트렌치코트', '风衣', 'TRENCH', '베이지', '米色', 'Burberry', '博柏利', 'M', 2800000.00, 14700.00, 3);

SELECT 'Seed data inserted successfully' as status;

-- =====================================================
-- 9. 관리자 계정 설정 (옵션)
-- =====================================================
-- 주의: auth.users에 관리자 계정이 이미 생성되어 있어야 함
-- 관리자 계정이 있다면 user_profiles에 프로필 생성

/*
-- 예시: 관리자 프로필 수동 삽입 (auth.users에서 ID 확인 후)
INSERT INTO user_profiles (
    id,  -- auth.users의 ID와 동일해야 함
    email,
    name,
    role,
    language,
    is_active
) VALUES (
    'YOUR-AUTH-USER-ID-HERE',  -- Supabase Dashboard에서 확인
    'admin@yuandi.com',
    '시스템 관리자',
    'admin',
    'ko',
    true
) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_active = true;
*/

SELECT 'Schema reset completed successfully' as status;