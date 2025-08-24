-- YUANDI ERP Database Schema
-- PostgreSQL for Supabase
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM TYPES
-- =============================================

-- User roles
CREATE TYPE user_role AS ENUM ('Admin', 'OrderManager', 'ShipManager');

-- Locale types
CREATE TYPE locale_type AS ENUM ('ko', 'zh-CN');

-- Order status
CREATE TYPE order_status AS ENUM ('PAID', 'SHIPPED', 'DONE', 'REFUNDED');

-- Cashbook transaction types
CREATE TYPE cashbook_type AS ENUM ('sale', 'inbound', 'shipping', 'adjustment', 'refund');

-- Currency types
CREATE TYPE currency_type AS ENUM ('CNY', 'KRW');

-- Inventory movement types
CREATE TYPE movement_type AS ENUM ('inbound', 'sale', 'adjustment', 'disposal');

-- =============================================
-- TABLES
-- =============================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'OrderManager',
    locale locale_type NOT NULL DEFAULT 'ko',
    active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^[0-9+\-\s]+$')
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    model VARCHAR(100),
    color VARCHAR(50),
    brand VARCHAR(100),
    cost_cny DECIMAL(10,2) NOT NULL CHECK (cost_cny >= 0),
    sale_price_krw DECIMAL(12,2),
    on_hand INTEGER DEFAULT 0 CHECK (on_hand >= 0),
    low_stock_threshold INTEGER DEFAULT 5 CHECK (low_stock_threshold >= 0),
    barcode VARCHAR(50),
    description TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no VARCHAR(20) UNIQUE NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    pccc_code VARCHAR(20) NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_address_detail TEXT,
    zip_code VARCHAR(10) NOT NULL,
    status order_status NOT NULL DEFAULT 'PAID',
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    currency currency_type DEFAULT 'KRW',
    customer_memo TEXT,
    internal_memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    
    CONSTRAINT valid_pccc CHECK (pccc_code ~* '^P[0-9]{12}$'),
    CONSTRAINT valid_phone CHECK (customer_phone ~* '^01[0-9]{8,9}$')
);

-- Order items
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
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipments
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    courier VARCHAR(50) NOT NULL,
    courier_code VARCHAR(20),
    tracking_no VARCHAR(50) NOT NULL,
    tracking_url VARCHAR(500),
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    actual_weight DECIMAL(10,2),
    volume_weight DECIMAL(10,2),
    shipment_photo_url VARCHAR(500),
    receipt_photo_url VARCHAR(500),
    shipped_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Inventory movements
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

-- Cashbook
CREATE TABLE cashbook (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type cashbook_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency currency_type NOT NULL DEFAULT 'KRW',
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
    created_by UUID REFERENCES profiles(id),
    
    CONSTRAINT valid_fx_rate CHECK (fx_rate > 0)
);

-- Event logs
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

-- =============================================
-- INDEXES
-- =============================================

-- Profiles indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_active ON profiles(active);

-- Products indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_name_gin ON products USING gin(to_tsvector('simple', name));
CREATE INDEX idx_products_low_stock ON products(on_hand, low_stock_threshold) WHERE active = true;
CREATE INDEX idx_products_composite ON products(category, model, color, brand);

-- Orders indexes
CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer ON orders(customer_name, customer_phone);
CREATE INDEX idx_orders_date ON orders(order_date DESC);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Order items indexes
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Shipments indexes
CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_no);
CREATE INDEX idx_shipments_shipped_at ON shipments(shipped_at DESC);

-- Inventory movements indexes
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(movement_date DESC);
CREATE INDEX idx_inventory_movements_ref ON inventory_movements(ref_type, ref_id);

-- Cashbook indexes
CREATE INDEX idx_cashbook_date ON cashbook(transaction_date DESC);
CREATE INDEX idx_cashbook_type ON cashbook(type);
CREATE INDEX idx_cashbook_ref ON cashbook(ref_type, ref_id);
CREATE INDEX idx_cashbook_month ON cashbook(DATE_TRUNC('month', transaction_date));

-- Event logs indexes
CREATE INDEX idx_event_logs_actor ON event_logs(actor_id);
CREATE INDEX idx_event_logs_entity ON event_logs(entity_type, entity_id);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at DESC);
CREATE INDEX idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_severity ON event_logs(event_severity) WHERE event_severity IN ('warning', 'error', 'critical');

-- =============================================
-- FUNCTIONS
-- =============================================

-- Generate order number function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    today_date TEXT;
    seq_num INTEGER;
    new_order_no TEXT;
    max_retries INTEGER := 5;
    retry_count INTEGER := 0;
BEGIN
    -- Get today's date in YYMMDD format (KST)
    today_date := TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYMMDD');
    
    LOOP
        -- Get next sequence number for today
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(order_no FROM 12 FOR 3) AS INTEGER)
        ), 0) + 1 INTO seq_num
        FROM orders
        WHERE order_no LIKE 'ORD-' || today_date || '-%';
        
        -- Generate order number
        new_order_no := 'ORD-' || today_date || '-' || LPAD(seq_num::TEXT, 3, '0');
        
        -- Check for duplicates
        IF NOT EXISTS (SELECT 1 FROM orders WHERE order_no = new_order_no) THEN
            RETURN new_order_no;
        END IF;
        
        -- Retry limit
        retry_count := retry_count + 1;
        IF retry_count >= max_retries THEN
            RAISE EXCEPTION 'Failed to generate unique order number';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate SKU function
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
    clean_category TEXT;
    clean_model TEXT;
    clean_color TEXT;
    clean_brand TEXT;
BEGIN
    -- Clean input values
    clean_category := UPPER(REGEXP_REPLACE(COALESCE(p_category, 'NONE'), '[^A-Za-z0-9]', '', 'g'));
    clean_model := UPPER(REGEXP_REPLACE(COALESCE(p_model, 'STD'), '[^A-Za-z0-9]', '', 'g'));
    clean_color := UPPER(REGEXP_REPLACE(COALESCE(p_color, 'NA'), '[^A-Za-z0-9]', '', 'g'));
    clean_brand := UPPER(REGEXP_REPLACE(COALESCE(p_brand, 'GEN'), '[^A-Za-z0-9]', '', 'g'));
    
    -- Limit length
    clean_category := SUBSTRING(clean_category FROM 1 FOR 10);
    clean_model := SUBSTRING(clean_model FROM 1 FOR 15);
    clean_color := SUBSTRING(clean_color FROM 1 FOR 10);
    clean_brand := SUBSTRING(clean_brand FROM 1 FOR 10);
    
    -- Generate hash
    hash_value := UPPER(SUBSTRING(
        MD5(CONCAT(clean_category, clean_model, clean_color, clean_brand, NOW()::TEXT)), 
        1, 5
    ));
    
    -- Build SKU
    new_sku := clean_category || '-' || clean_model || '-' || 
               clean_color || '-' || clean_brand || '-' || hash_value;
    
    RETURN new_sku;
END;
$$ LANGUAGE plpgsql;

-- Update timestamps function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-generate order number
CREATE OR REPLACE FUNCTION before_order_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_no IS NULL THEN
        NEW.order_no := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION before_order_insert();

-- Auto-generate SKU
CREATE OR REPLACE FUNCTION before_product_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sku IS NULL THEN
        NEW.sku := generate_sku(NEW.category, NEW.model, NEW.color, NEW.brand);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_product_sku
BEFORE INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION before_product_insert();

-- Update timestamps triggers
CREATE TRIGGER update_profiles_updated_at 
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at 
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at 
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Event log trigger
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_entity_name TEXT;
    v_changes JSONB;
    v_user_id UUID;
    v_user_role user_role;
BEGIN
    -- Get current user info from app context
    v_user_id := current_setting('app.current_user_id', true)::UUID;
    
    -- Get user role
    SELECT role INTO v_user_role FROM profiles WHERE id = v_user_id;
    
    -- Determine entity name
    CASE TG_TABLE_NAME
        WHEN 'orders' THEN 
            v_entity_name := NEW.order_no;
        WHEN 'products' THEN 
            v_entity_name := NEW.name;
        ELSE 
            v_entity_name := NULL;
    END CASE;
    
    -- Calculate changes for UPDATE
    IF TG_OP = 'UPDATE' THEN
        v_changes := jsonb_strip_nulls(
            jsonb_build_object(
                'fields', (
                    SELECT jsonb_object_agg(key, jsonb_build_object('old', old_val, 'new', new_val))
                    FROM (
                        SELECT key, 
                               to_jsonb(OLD) -> key as old_val,
                               to_jsonb(NEW) -> key as new_val
                        FROM jsonb_object_keys(to_jsonb(NEW)) AS key
                        WHERE (to_jsonb(OLD) -> key) IS DISTINCT FROM (to_jsonb(NEW) -> key)
                    ) changes
                )
            )
        );
    END IF;
    
    -- Log the event
    INSERT INTO event_logs (
        actor_id,
        actor_role,
        event_type,
        entity_type,
        entity_id,
        entity_name,
        action,
        before_data,
        after_data,
        changes
    ) VALUES (
        v_user_id,
        v_user_role,
        TG_TABLE_NAME || '.' || LOWER(TG_OP),
        TG_TABLE_NAME,
        NEW.id,
        v_entity_name,
        LOWER(TG_OP),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        v_changes
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply log triggers to important tables
CREATE TRIGGER log_orders_changes
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER log_products_changes
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER log_shipments_changes
AFTER INSERT OR UPDATE OR DELETE ON shipments
FOR EACH ROW EXECUTE FUNCTION log_changes();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY profiles_select_own ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY profiles_select_admin ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

CREATE POLICY profiles_update_admin ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Products policies
CREATE POLICY products_select ON products
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY products_insert ON products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('Admin', 'OrderManager')
        )
    );

CREATE POLICY products_update ON products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('Admin', 'OrderManager')
        )
    );

-- Orders policies
CREATE POLICY orders_select ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY orders_insert ON orders
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('Admin', 'OrderManager')
        )
    );

CREATE POLICY orders_update ON orders
    FOR UPDATE USING (
        CASE 
            -- Admin can update any order
            WHEN EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'Admin'
            ) THEN true
            
            -- OrderManager can update PAID orders only
            WHEN EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'OrderManager'
            ) AND status = 'PAID' THEN true
            
            -- ShipManager can update for shipping
            WHEN EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'ShipManager'
            ) AND status IN ('PAID', 'SHIPPED') THEN true
            
            ELSE false
        END
    );

-- Order items policies (inherit from orders)
CREATE POLICY order_items_select ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
            AND EXISTS (
                SELECT 1 FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Shipments policies
CREATE POLICY shipments_select ON shipments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY shipments_insert ON shipments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('Admin', 'ShipManager')
        )
    );

CREATE POLICY shipments_update ON shipments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('Admin', 'ShipManager')
        )
    );

-- Event logs policies (read-only for all authenticated users)
CREATE POLICY event_logs_select ON event_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid()
        )
    );

-- Cashbook policies
CREATE POLICY cashbook_select ON cashbook
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY cashbook_insert ON cashbook
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('Admin', 'OrderManager')
        )
    );

-- Inventory movements policies
CREATE POLICY inventory_movements_select ON inventory_movements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY inventory_movements_insert ON inventory_movements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('Admin', 'OrderManager')
        )
    );

-- =============================================
-- STORED PROCEDURES
-- =============================================

-- Create order with items (transaction)
CREATE OR REPLACE FUNCTION create_order_with_items(
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR,
    p_customer_email VARCHAR,
    p_pccc_code VARCHAR,
    p_shipping_address TEXT,
    p_shipping_address_detail TEXT,
    p_zip_code VARCHAR,
    p_customer_memo TEXT,
    p_internal_memo TEXT,
    p_items JSONB,
    p_created_by UUID
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_order_no VARCHAR;
    v_total_amount DECIMAL(12,2) := 0;
    v_item JSONB;
    v_product RECORD;
    v_quantity INTEGER;
BEGIN
    -- Set user context for triggers
    PERFORM set_config('app.current_user_id', p_created_by::TEXT, true);
    
    -- Generate order number
    v_order_no := generate_order_number();
    
    -- Create order
    INSERT INTO orders (
        order_no, customer_name, customer_phone, customer_email,
        pccc_code, shipping_address, shipping_address_detail, zip_code,
        customer_memo, internal_memo, status, total_amount, created_by
    ) VALUES (
        v_order_no, p_customer_name, p_customer_phone, p_customer_email,
        p_pccc_code, p_shipping_address, p_shipping_address_detail, p_zip_code,
        p_customer_memo, p_internal_memo, 'PAID', 0, p_created_by
    ) RETURNING id INTO v_order_id;
    
    -- Process order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Get product info and lock for update
        SELECT * INTO v_product
        FROM products
        WHERE id = (v_item->>'product_id')::UUID
        FOR UPDATE;
        
        v_quantity := (v_item->>'quantity')::INTEGER;
        
        -- Validate stock
        IF v_product.on_hand < v_quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product %', v_product.name;
        END IF;
        
        -- Insert order item
        INSERT INTO order_items (
            order_id, product_id, sku, product_name,
            product_category, product_model, product_color, product_brand,
            quantity, unit_price, subtotal
        ) VALUES (
            v_order_id, v_product.id, v_product.sku, v_product.name,
            v_product.category, v_product.model, v_product.color, v_product.brand,
            v_quantity, v_product.sale_price_krw, 
            v_product.sale_price_krw * v_quantity
        );
        
        -- Update stock
        UPDATE products
        SET on_hand = on_hand - v_quantity
        WHERE id = v_product.id;
        
        -- Record inventory movement
        INSERT INTO inventory_movements (
            product_id, movement_type, quantity,
            balance_before, balance_after,
            ref_type, ref_id, created_by
        ) VALUES (
            v_product.id, 'sale', -v_quantity,
            v_product.on_hand, v_product.on_hand - v_quantity,
            'order', v_order_id, p_created_by
        );
        
        -- Calculate total
        v_total_amount := v_total_amount + (v_product.sale_price_krw * v_quantity);
    END LOOP;
    
    -- Update order total
    UPDATE orders
    SET total_amount = v_total_amount
    WHERE id = v_order_id;
    
    -- Record in cashbook
    INSERT INTO cashbook (
        type, amount, currency, amount_krw,
        ref_type, ref_id, ref_no, created_by
    ) VALUES (
        'sale', v_total_amount, 'KRW', v_total_amount,
        'order', v_order_id, v_order_no, p_created_by
    );
    
    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'order_no', v_order_no,
        'total_amount', v_total_amount
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INITIAL DATA (OPTIONAL)
-- =============================================

-- Insert default admin user (password should be set via Supabase Auth)
-- This is just a placeholder - actual user creation should be done through Supabase Auth
-- INSERT INTO auth.users (id, email) VALUES 
-- ('00000000-0000-0000-0000-000000000000', 'admin@yuandi.com');

-- INSERT INTO profiles (id, name, email, role, locale) VALUES 
-- ('00000000-0000-0000-0000-000000000000', 'System Admin', 'admin@yuandi.com', 'Admin', 'ko');