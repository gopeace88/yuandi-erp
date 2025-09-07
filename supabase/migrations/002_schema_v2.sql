-- YUANDI Collection Management System
-- Database Schema v2.0.0 (PRD v2.0 기준)
-- Last Updated: 2025-01-25

-- 기존 테이블과 타입 삭제 (충돌 방지)
DROP TABLE IF EXISTS shipment_tracking_events CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS cashbook_transactions CASCADE;
DROP TABLE IF EXISTS event_logs CASCADE;
DROP TABLE IF EXISTS system_health_logs CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS courier_type CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS language_code CASCADE;

-- PRD v2.0 기준 새로운 타입 정의
CREATE TYPE user_role AS ENUM ('admin', 'order_manager', 'ship_manager');
CREATE TYPE locale_type AS ENUM ('ko', 'zh-CN');
CREATE TYPE order_status AS ENUM ('paid', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE movement_type AS ENUM ('inbound', 'sale', 'adjustment', 'disposal');
CREATE TYPE cashbook_type AS ENUM ('sale', 'inbound', 'shipping', 'adjustment', 'refund');
CREATE TYPE currency_type AS ENUM ('CNY', 'KRW');

-- 1. profiles table (사용자 프로필)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    role user_role DEFAULT 'order_manager',
    locale locale_type DEFAULT 'ko',
    active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. products table (상품)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    model VARCHAR(100),
    color VARCHAR(50),
    brand VARCHAR(100),
    cost_cny DECIMAL(10,2) NOT NULL,
    sale_price_krw DECIMAL(12,2),
    on_hand INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    barcode VARCHAR(50),
    image_url VARCHAR(500), -- v2.0: 상품 이미지
    description TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- 3. orders table (주문)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    pccc VARCHAR(20) NOT NULL,
    shipping_address_line1 TEXT NOT NULL,
    shipping_address_line2 TEXT,
    shipping_postal_code VARCHAR(10) NOT NULL,
    status order_status DEFAULT 'paid',
    total_krw DECIMAL(12,2) NOT NULL,
    currency currency_type DEFAULT 'KRW',
    customer_memo TEXT,
    internal_memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- 4. order_items table (주문 상품)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    product_category VARCHAR(50),
    product_model VARCHAR(100),
    product_color VARCHAR(50),
    product_brand VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. shipments table (배송 정보) - v2.0 Enhanced
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    -- Korean Shipping
    courier VARCHAR(50), -- 한국 택배사
    courier_code VARCHAR(20), -- 택배사 코드
    tracking_no VARCHAR(50), -- 한국 운송장 번호
    tracking_barcode VARCHAR(100), -- v2.0: 바코드 번호
    tracking_url VARCHAR(500), -- 한국 추적 URL
    -- Chinese Shipping
    courier_cn VARCHAR(50), -- 중국 택배사
    tracking_no_cn VARCHAR(100), -- 중국 운송장 번호
    tracking_url_cn VARCHAR(500), -- 중국 추적 URL
    -- Shipping Details
    shipping_fee DECIMAL(10,2) DEFAULT 0, -- 배송비
    actual_weight DECIMAL(10,2), -- 실제 무게
    volume_weight DECIMAL(10,2), -- 부피 무게
    -- Photos
    shipment_photo_url VARCHAR(500), -- 송장 사진
    receipt_photo_url VARCHAR(500), -- v2.0: 영수증 사진
    -- Timestamps
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- 6. inventory_movements table (재고 이동)
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
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
    created_by UUID REFERENCES profiles(id)
);

-- 7. cashbook table (출납장부)
CREATE TABLE cashbook (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type cashbook_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency currency_type DEFAULT 'KRW',
    fx_rate DECIMAL(10,4) DEFAULT 1,
    amount_krw DECIMAL(12,2) NOT NULL,
    ref_type VARCHAR(50),
    ref_id UUID,
    ref_no VARCHAR(50),
    description TEXT,
    note TEXT,
    bank_name VARCHAR(50),
    account_no VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- 8. event_logs table (이벤트 로그)
CREATE TABLE event_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id),
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

-- Create indexes for better performance
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_no ON shipments(tracking_no);
CREATE INDEX idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_cashbook_transaction_date ON cashbook(transaction_date DESC);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at DESC);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "admin can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for products
CREATE POLICY "All authenticated users can view products" ON products
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin and order_manager can insert products" ON products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'order_manager')
        )
    );

CREATE POLICY "admin and order_manager can update products" ON products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'order_manager')
        )
    );

-- RLS Policies for orders
CREATE POLICY "All authenticated users can view orders" ON orders
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin and order_manager can insert orders" ON orders
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'order_manager')
        )
    );

CREATE POLICY "All authenticated users can update orders" ON orders
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    today_date TEXT;
    order_count INTEGER;
    new_order_no TEXT;
BEGIN
    today_date := TO_CHAR(CURRENT_DATE, 'YYMMDD');
    
    SELECT COUNT(*) + 1 INTO order_count
    FROM orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    new_order_no := 'ORD-' || today_date || '-' || LPAD(order_count::TEXT, 3, '0');
    
    RETURN new_order_no;
END;
$$ LANGUAGE plpgsql;

-- Function to generate SKU
CREATE OR REPLACE FUNCTION generate_sku(
    p_category VARCHAR,
    p_model VARCHAR,
    p_color VARCHAR,
    p_brand VARCHAR
)
RETURNS TEXT AS $$
DECLARE
    hash_value TEXT;
    new_sku TEXT;
BEGIN
    hash_value := SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 5);
    new_sku := UPPER(
        COALESCE(SUBSTRING(p_category, 1, 3), 'XXX') || '-' ||
        COALESCE(SUBSTRING(p_model, 1, 10), 'MODEL') || '-' ||
        COALESCE(SUBSTRING(p_color, 1, 5), 'COLOR') || '-' ||
        COALESCE(SUBSTRING(p_brand, 1, 5), 'BRAND') || '-' ||
        hash_value
    );
    RETURN new_sku;
END;
$$ LANGUAGE plpgsql;