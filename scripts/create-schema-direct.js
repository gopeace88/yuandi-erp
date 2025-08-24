const { Client } = require('pg')

async function createSchemaDirectly() {
  // Supabase PostgreSQL 연결 정보 
  const client = new Client({
    host: 'db.eikwfesvmohfpokgeqtv.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr',
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🔌 Connecting to Supabase PostgreSQL...')
    await client.connect()
    console.log('✅ Connected successfully!')

    // Step 1: Drop existing tables
    console.log('🗑️  Dropping existing tables...')
    const dropQueries = [
      'DROP TABLE IF EXISTS event_logs CASCADE;',
      'DROP TABLE IF EXISTS cashbook CASCADE;',
      'DROP TABLE IF EXISTS inventory_movements CASCADE;', 
      'DROP TABLE IF EXISTS shipments CASCADE;',
      'DROP TABLE IF EXISTS order_items CASCADE;',
      'DROP TABLE IF EXISTS orders CASCADE;',
      'DROP TABLE IF EXISTS products CASCADE;',
      'DROP TABLE IF EXISTS profiles CASCADE;',
      'DROP TYPE IF EXISTS user_role CASCADE;',
      'DROP TYPE IF EXISTS locale_type CASCADE;',
      'DROP TYPE IF EXISTS order_status CASCADE;',
      'DROP TYPE IF EXISTS cashbook_type CASCADE;',
      'DROP TYPE IF EXISTS currency_type CASCADE;',
      'DROP TYPE IF EXISTS movement_type CASCADE;'
    ]

    for (const query of dropQueries) {
      try {
        await client.query(query)
        console.log('✅ Dropped:', query.split(' ')[4] || query.split(' ')[3])
      } catch (err) {
        console.log('⚠️  Already dropped or doesn\'t exist:', query.split(' ')[4] || query.split(' ')[3])
      }
    }

    // Step 2: Create ENUM types
    console.log('🔧 Creating ENUM types...')
    const enumQueries = [
      "CREATE TYPE user_role AS ENUM ('Admin', 'OrderManager', 'ShipManager');",
      "CREATE TYPE locale_type AS ENUM ('ko', 'zh-CN');",
      "CREATE TYPE order_status AS ENUM ('PAID', 'SHIPPED', 'DONE', 'REFUNDED');", 
      "CREATE TYPE cashbook_type AS ENUM ('sale', 'inbound', 'shipping', 'adjustment', 'refund');",
      "CREATE TYPE currency_type AS ENUM ('CNY', 'KRW');",
      "CREATE TYPE movement_type AS ENUM ('inbound', 'sale', 'adjustment', 'disposal');"
    ]

    for (const query of enumQueries) {
      await client.query(query)
      console.log('✅ Created enum:', query.split(' ')[2])
    }

    // Step 3: Create profiles table
    console.log('👤 Creating profiles table...')
    const profilesSQL = `
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
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
          CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^[0-9+\\-\\s]+$')
      );
    `
    await client.query(profilesSQL)
    console.log('✅ Profiles table created')

    // Step 4: Create products table
    console.log('📦 Creating products table...')
    const productsSQL = `
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
    `
    await client.query(productsSQL)
    console.log('✅ Products table created')

    // Step 5: Create orders table
    console.log('📋 Creating orders table...')
    const ordersSQL = `
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
          updated_by UUID REFERENCES profiles(id),
          
          CONSTRAINT valid_pccc CHECK (pccc_code ~* '^P[0-9]{12}$'),
          CONSTRAINT valid_phone CHECK (customer_phone ~* '^01[0-9]{8,9}$')
      );
    `
    await client.query(ordersSQL)
    console.log('✅ Orders table created')

    // Step 6: Create remaining tables
    console.log('📊 Creating remaining tables...')
    
    const remainingTables = [
      // Order items
      `CREATE TABLE order_items (
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
      );`,
      
      // Shipments
      `CREATE TABLE shipments (
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
      );`,
      
      // Inventory movements
      `CREATE TABLE inventory_movements (
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
      );`,
      
      // Cashbook
      `CREATE TABLE cashbook (
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
          created_by UUID REFERENCES profiles(id),
          
          CONSTRAINT valid_fx_rate CHECK (fx_rate > 0)
      );`,
      
      // Event logs
      `CREATE TABLE event_logs (
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
      );`
    ]

    for (let i = 0; i < remainingTables.length; i++) {
      await client.query(remainingTables[i])
      const tableNames = ['order_items', 'shipments', 'inventory_movements', 'cashbook', 'event_logs']
      console.log(`✅ ${tableNames[i]} table created`)
    }

    // Step 7: Create indexes
    console.log('🔍 Creating indexes...')
    const indexQueries = [
      'CREATE INDEX idx_profiles_role ON profiles(role);',
      'CREATE INDEX idx_profiles_active ON profiles(active);',
      'CREATE INDEX idx_profiles_email ON profiles(email);',
      'CREATE INDEX idx_products_sku ON products(sku);',
      'CREATE INDEX idx_products_category ON products(category);',
      'CREATE INDEX idx_orders_order_no ON orders(order_no);',
      'CREATE INDEX idx_orders_status ON orders(status);',
      'CREATE INDEX idx_orders_date ON orders(order_date DESC);'
    ]

    for (const query of indexQueries) {
      await client.query(query)
    }
    console.log('✅ Indexes created')

    // Step 8: Insert admin user
    console.log('👑 Creating admin user...')
    const adminSQL = `
      INSERT INTO profiles (name, email, password, role, locale, active) 
      VALUES ('YUANDI 관리자', 'yuandi1020@gmail.com', 'yuandi123!', 'Admin', 'ko', true)
      ON CONFLICT (email) DO NOTHING
      RETURNING *;
    `
    
    const result = await client.query(adminSQL)
    if (result.rows.length > 0) {
      console.log('✅ Admin user created:', result.rows[0])
    } else {
      console.log('⚠️  Admin user already exists')
    }

    // Test the setup
    console.log('🧪 Testing setup...')
    const testResult = await client.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\'')
    console.log(`✅ Total tables created: ${testResult.rows[0].table_count}`)

    const userResult = await client.query('SELECT name, email, role FROM profiles WHERE email = \'yuandi1020@gmail.com\'')
    console.log('✅ Admin user verified:', userResult.rows[0])

    console.log('\n🎉 COMPLETE DATABASE SETUP SUCCESSFUL!')
    console.log('📊 Created 8 tables with full ERP schema')
    console.log('👤 Admin user: yuandi1020@gmail.com / yuandi123!')
    console.log('🔗 Ready for authentication testing!')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

createSchemaDirectly()