-- YUANDI ERP 테이블 생성 스크립트
-- Supabase에서 실행할 테이블 생성 SQL

-- 1. 카테고리 테이블
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_ko VARCHAR(50) NOT NULL,
    name_zh VARCHAR(50),
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 상품 테이블
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    model VARCHAR(100),
    color VARCHAR(50),
    size VARCHAR(20),
    manufacturer VARCHAR(100),
    brand VARCHAR(100),
    cost_cny DECIMAL(10, 2),
    price_krw DECIMAL(12, 0),
    on_hand INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 주문 테이블
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_no VARCHAR(20) UNIQUE NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(100),
    pccc_code VARCHAR(20),
    shipping_address TEXT NOT NULL,
    shipping_address_detail TEXT,
    zip_code VARCHAR(10),
    status VARCHAR(20) DEFAULT 'PAID' CHECK (status IN ('PAID', 'SHIPPED', 'DONE', 'REFUNDED', 'CANCELLED')),
    total_amount DECIMAL(12, 0) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 주문 아이템 테이블
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 0) NOT NULL,
    subtotal DECIMAL(12, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 배송 테이블
CREATE TABLE IF NOT EXISTS shipments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tracking_no VARCHAR(50),
    courier VARCHAR(50),
    shipped_date DATE,
    estimated_arrival DATE,
    actual_arrival DATE,
    status VARCHAR(20) DEFAULT 'preparing' CHECK (status IN ('preparing', 'in_transit', 'delivered', 'returned')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. 출납장부 테이블
CREATE TABLE IF NOT EXISTS cashbook (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    ref_type VARCHAR(20),
    ref_no VARCHAR(50),
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KRW',
    fx_rate DECIMAL(10, 4) DEFAULT 1,
    amount_krw DECIMAL(12, 0) NOT NULL,
    description TEXT NOT NULL,
    note TEXT,
    bank_name VARCHAR(50),
    account_no VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. 재고 이동 테이블
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('inbound', 'outbound', 'adjustment', 'transfer', 'return')),
    quantity INTEGER NOT NULL,
    ref_type VARCHAR(20),
    ref_no VARCHAR(50),
    before_qty INTEGER,
    after_qty INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- 8. 사용자 프로필 테이블 (Supabase Auth와 연동)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'Customer' CHECK (role IN ('Admin', 'OrderManager', 'ShipManager', 'Customer')),
    phone VARCHAR(20),
    language VARCHAR(5) DEFAULT 'ko',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. 설정 테이블
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. 이벤트 로그 테이블
CREATE TABLE IF NOT EXISTS event_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    entity_name VARCHAR(200),
    action VARCHAR(50),
    before_data JSONB,
    after_data JSONB,
    ip_address INET,
    user_agent TEXT,
    actor_id UUID,
    actor_name VARCHAR(100),
    event_category VARCHAR(50),
    event_severity VARCHAR(20) DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_no);
CREATE INDEX idx_cashbook_date ON cashbook(transaction_date);
CREATE INDEX idx_cashbook_type ON cashbook(type);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(type);
CREATE INDEX idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_entity ON event_logs(entity_type, entity_id);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- 기본 RLS 정책 생성 (개발 단계에서는 모든 접근 허용)
-- 프로덕션에서는 더 세밀한 정책으로 변경 필요
CREATE POLICY "Enable all for authenticated users" ON categories FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON products FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON orders FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON order_items FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON shipments FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON cashbook FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON inventory_movements FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON profiles FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON settings FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON event_logs FOR ALL USING (true);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cashbook_updated_at BEFORE UPDATE ON cashbook
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 초기 설정 데이터 추가
INSERT INTO settings (key, value, description) VALUES
('auto_backup_enabled', 'false', '자동 백업 활성화 여부'),
('default_language', '"ko"', '기본 언어 설정'),
('exchange_rate_cny_krw', '180', '위안화 환율'),
('low_stock_threshold', '5', '재고 부족 기준'),
('order_number_format', '"ORD-{YYMMDD}-{###}"', '주문번호 형식');

COMMENT ON TABLE categories IS '상품 카테고리';
COMMENT ON TABLE products IS '상품 정보';
COMMENT ON TABLE orders IS '주문 정보';
COMMENT ON TABLE order_items IS '주문 상품 항목';
COMMENT ON TABLE shipments IS '배송 정보';
COMMENT ON TABLE cashbook IS '출납장부';
COMMENT ON TABLE inventory_movements IS '재고 이동 내역';
COMMENT ON TABLE profiles IS '사용자 프로필';
COMMENT ON TABLE settings IS '시스템 설정';
COMMENT ON TABLE event_logs IS '이벤트 로그';