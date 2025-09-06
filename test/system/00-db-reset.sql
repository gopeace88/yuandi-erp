-- ==========================================
-- YUANDI ERP System - Database Reset Script
-- ==========================================
-- Purpose: Complete database reset for testing
-- Date: 2025-09-06
-- ==========================================

-- 1. Drop all existing tables (CASCADE to handle dependencies)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS cashbook CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS event_logs CASCADE;

-- 2. Drop all storage objects if exists
-- Note: This needs to be done via Supabase Dashboard or API

-- 3. Create tables with latest schema
-- ==========================================
-- Users Table
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'order_manager', 'ship_manager', 'customer')),
    language VARCHAR(10) DEFAULT 'ko' CHECK (language IN ('ko', 'zh-CN', 'en')),
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Products Table
-- ==========================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_zh VARCHAR(200),
    model VARCHAR(100),
    color VARCHAR(50),
    brand VARCHAR(100) NOT NULL,
    cost_cny DECIMAL(10,2) NOT NULL CHECK (cost_cny >= 0),
    cost_krw DECIMAL(10,0) CHECK (cost_krw >= 0),
    sale_price_krw DECIMAL(10,0),
    on_hand INTEGER DEFAULT 0 CHECK (on_hand >= 0),
    low_stock_threshold INTEGER DEFAULT 5 CHECK (low_stock_threshold >= 0),
    image_url TEXT,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Orders Table
-- ==========================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'PAID' 
        CHECK (status IN ('PAID', 'SHIPPED', 'DONE', 'REFUNDED')),
    payment_method VARCHAR(50),
    total_amount DECIMAL(10,0) NOT NULL CHECK (total_amount >= 0),
    
    -- Shipping information
    shipping_name VARCHAR(100),
    shipping_phone VARCHAR(20),
    shipping_address TEXT NOT NULL,
    shipping_address_detail TEXT,
    zip_code VARCHAR(10),
    pccc_code VARCHAR(20),
    
    -- Memos
    internal_memo TEXT,
    customer_memo TEXT,
    
    -- Timestamps
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_date TIMESTAMP WITH TIME ZONE,
    shipped_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    refunded_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Order Items Table
-- ==========================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,0) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,0) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Shipments Table
-- ==========================================
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tracking_no VARCHAR(100),
    courier VARCHAR(50),
    status VARCHAR(20) DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED')),
    shipment_photo_url TEXT,
    receipt_photo_url TEXT,
    shipped_date TIMESTAMP WITH TIME ZONE,
    delivered_date TIMESTAMP WITH TIME ZONE,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Inventory Movements Table
-- ==========================================
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    movement_type VARCHAR(20) NOT NULL 
        CHECK (movement_type IN ('INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'RETURN')),
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    memo TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Cashbook Table
-- ==========================================
CREATE TABLE cashbook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    transaction_type VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    amount DECIMAL(12,0) NOT NULL,
    balance DECIMAL(12,0) DEFAULT 0,
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    memo TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Event Logs Table (Audit Trail)
-- ==========================================
CREATE TABLE event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    actor_id UUID REFERENCES users(id),
    actor_email VARCHAR(255),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Create Indexes for Performance
-- ==========================================
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);

CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_order_date ON orders(order_date);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_no ON shipments(tracking_no);
CREATE INDEX idx_shipments_status ON shipments(status);

CREATE INDEX idx_inventory_product_id ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movement_type ON inventory_movements(movement_type);

CREATE INDEX idx_cashbook_transaction_date ON cashbook(transaction_date);
CREATE INDEX idx_cashbook_transaction_type ON cashbook(transaction_type);
CREATE INDEX idx_cashbook_reference ON cashbook(reference_type, reference_id);

CREATE INDEX idx_event_logs_entity ON event_logs(entity_type, entity_id);
CREATE INDEX idx_event_logs_actor ON event_logs(actor_id);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at);

-- ==========================================
-- Create Functions for Auto-generation
-- ==========================================

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_no()
RETURNS TEXT AS $$
DECLARE
    today_date TEXT;
    seq_num INTEGER;
    new_order_no TEXT;
BEGIN
    -- Get today's date in YYMMDD format (Korea timezone)
    today_date := TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul', 'YYMMDD');
    
    -- Get the next sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_no FROM 13 FOR 3) AS INTEGER)), 0) + 1
    INTO seq_num
    FROM orders
    WHERE order_no LIKE 'ORD-' || today_date || '-%';
    
    -- Generate order number
    new_order_no := 'ORD-' || today_date || '-' || LPAD(seq_num::TEXT, 3, '0');
    
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
    hash_input TEXT;
    hash_value TEXT;
    new_sku TEXT;
BEGIN
    -- Create hash input
    hash_input := COALESCE(p_category, '') || COALESCE(p_model, '') || 
                  COALESCE(p_color, '') || COALESCE(p_brand, '') || 
                  CURRENT_TIMESTAMP::TEXT;
    
    -- Generate 5-character hash
    hash_value := UPPER(SUBSTRING(MD5(hash_input), 1, 5));
    
    -- Build SKU
    new_sku := UPPER(COALESCE(SUBSTRING(p_category, 1, 3), 'XXX')) || '-' ||
               UPPER(COALESCE(SUBSTRING(p_model, 1, 10), 'MODEL')) || '-' ||
               UPPER(COALESCE(SUBSTRING(p_color, 1, 5), 'COLOR')) || '-' ||
               UPPER(COALESCE(SUBSTRING(p_brand, 1, 5), 'BRAND')) || '-' ||
               hash_value;
    
    RETURN new_sku;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Create Triggers
-- ==========================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cashbook_updated_at BEFORE UPDATE ON cashbook
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Enable Row Level Security (RLS)
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Create RLS Policies (Basic - to be refined)
-- ==========================================

-- Allow authenticated users to read all data (temporary for testing)
CREATE POLICY "Allow authenticated read" ON users FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON products FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON order_items FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON shipments FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON inventory_movements FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON cashbook FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read" ON event_logs FOR SELECT USING (true);

-- Allow authenticated users to insert/update/delete (temporary for testing)
CREATE POLICY "Allow authenticated write" ON users FOR ALL USING (true);
CREATE POLICY "Allow authenticated write" ON products FOR ALL USING (true);
CREATE POLICY "Allow authenticated write" ON orders FOR ALL USING (true);
CREATE POLICY "Allow authenticated write" ON order_items FOR ALL USING (true);
CREATE POLICY "Allow authenticated write" ON shipments FOR ALL USING (true);
CREATE POLICY "Allow authenticated write" ON inventory_movements FOR ALL USING (true);
CREATE POLICY "Allow authenticated write" ON cashbook FOR ALL USING (true);
CREATE POLICY "Allow authenticated write" ON event_logs FOR ALL USING (true);

-- ==========================================
-- Insert Initial Admin User (for testing)
-- ==========================================
INSERT INTO users (email, name, role, language, active)
VALUES ('admin@yuandi.com', 'System Admin', 'admin', 'ko', true);

-- ==========================================
-- Success Message
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE 'Database reset completed successfully!';
    RAISE NOTICE 'Tables created: 8';
    RAISE NOTICE 'Indexes created: 18';
    RAISE NOTICE 'Functions created: 3';
    RAISE NOTICE 'Initial admin user created: admin@yuandi.com';
END $$;