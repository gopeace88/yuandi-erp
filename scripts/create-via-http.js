async function createSchemaViaHTTP() {
  console.log('🌐 Creating schema via Supabase HTTP API...')

  const SUPABASE_URL = 'https://eikwfesvmohfpokgeqtv.supabase.co'
  const SERVICE_KEY = 'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'

  // Test if we can execute any SQL at all
  console.log('🧪 Testing SQL execution capability...')
  
  try {
    // Try to get version
    const versionResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/version`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY
      }
    })

    if (versionResponse.ok) {
      const version = await versionResponse.text()
      console.log('✅ PostgreSQL version:', version)
    } else {
      console.log('⚠️  Version check failed')
    }
  } catch (err) {
    console.log('⚠️  Version check error:', err.message)
  }

  // Try alternative approach - manual table creation via simple inserts
  console.log('🔧 Attempting manual table creation...')
  
  const tables = [
    {
      name: 'profiles',
      create_sql: `
        CREATE TABLE IF NOT EXISTS profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'OrderManager',
          locale VARCHAR(10) NOT NULL DEFAULT 'ko',
          active BOOLEAN DEFAULT true,
          last_login_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
      test_insert: {
        name: 'YUANDI 관리자',
        email: 'yuandi1020@gmail.com', 
        password: 'yuandi123!',
        role: 'Admin',
        locale: 'ko',
        active: true
      }
    }
  ]

  // Since direct SQL execution is limited, let's try a different approach
  console.log('📝 Manual setup instructions:')
  console.log('')
  console.log('Go to: https://app.supabase.com/project/eikwfesvmohfpokgeqtv/sql')
  console.log('Execute this complete SQL:')
  console.log('')
  
  const completeSQL = `
-- Drop existing tables first
DROP TABLE IF EXISTS event_logs CASCADE;
DROP TABLE IF EXISTS cashbook CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS locale_type CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS cashbook_type CASCADE;
DROP TYPE IF EXISTS currency_type CASCADE;
DROP TYPE IF EXISTS movement_type CASCADE;

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('Admin', 'OrderManager', 'ShipManager');
CREATE TYPE locale_type AS ENUM ('ko', 'zh-CN');
CREATE TYPE order_status AS ENUM ('PAID', 'SHIPPED', 'DONE', 'REFUNDED');
CREATE TYPE cashbook_type AS ENUM ('sale', 'inbound', 'shipping', 'adjustment', 'refund');
CREATE TYPE currency_type AS ENUM ('CNY', 'KRW');
CREATE TYPE movement_type AS ENUM ('inbound', 'sale', 'adjustment', 'disposal');

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'OrderManager',
    locale locale_type NOT NULL DEFAULT 'ko',
    active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    updated_by UUID REFERENCES profiles(id)
);

-- Create order_items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create shipments table
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create inventory_movements table
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create cashbook table
CREATE TABLE cashbook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_by UUID REFERENCES profiles(id)
);

-- Create event_logs table
CREATE TABLE event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_active ON profiles(active);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_cashbook_date ON cashbook(transaction_date DESC);
CREATE INDEX idx_event_logs_actor ON event_logs(actor_id);

-- Insert admin user
INSERT INTO profiles (name, email, password, role, locale, active) 
VALUES ('YUANDI 관리자', 'yuandi1020@gmail.com', 'yuandi123!', 'Admin', 'ko', true);
  `
  
  console.log(completeSQL)
  console.log('')
  console.log('💡 After executing the SQL, test login at:')
  console.log('🌐 http://localhost:8081/auth/signin')
  console.log('📧 Email: yuandi1020@gmail.com')  
  console.log('🔑 Password: yuandi123!')
  console.log('')
  
  return completeSQL
}

createSchemaViaHTTP()