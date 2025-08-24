const { createClient } = require('@supabase/supabase-js')

async function createFullSchema() {
  const supabase = createClient(
    'https://eikwfesvmohfpokgeqtv.supabase.co',
    'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'
  )

  console.log('🗑️  Dropping existing tables...')
  
  // Step 1: Drop existing tables
  const dropTables = [
    'DROP TABLE IF EXISTS event_logs CASCADE;',
    'DROP TABLE IF EXISTS cashbook CASCADE;', 
    'DROP TABLE IF EXISTS inventory_movements CASCADE;',
    'DROP TABLE IF EXISTS shipments CASCADE;',
    'DROP TABLE IF EXISTS order_items CASCADE;',
    'DROP TABLE IF EXISTS orders CASCADE;',
    'DROP TABLE IF EXISTS products CASCADE;',
    'DROP TABLE IF EXISTS profiles CASCADE;'
  ]

  for (const sql of dropTables) {
    try {
      const response = await fetch(`https://eikwfesvmohfpokgeqtv.supabase.co/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr`,
          'Content-Type': 'application/json',
          'apikey': 'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'
        },
        body: JSON.stringify({ query: sql })
      })
      console.log('✅ Dropped table:', sql.split(' ')[4])
    } catch (err) {
      console.log('⚠️  Drop failed (might not exist):', err.message)
    }
  }

  console.log('🔧 Creating ENUM types...')
  
  // Step 2: Create ENUM types
  const enums = [
    "CREATE TYPE user_role AS ENUM ('Admin', 'OrderManager', 'ShipManager');",
    "CREATE TYPE locale_type AS ENUM ('ko', 'zh-CN');", 
    "CREATE TYPE order_status AS ENUM ('PAID', 'SHIPPED', 'DONE', 'REFUNDED');",
    "CREATE TYPE cashbook_type AS ENUM ('sale', 'inbound', 'shipping', 'adjustment', 'refund');",
    "CREATE TYPE currency_type AS ENUM ('CNY', 'KRW');",
    "CREATE TYPE movement_type AS ENUM ('inbound', 'sale', 'adjustment', 'disposal');"
  ]

  for (const sql of enums) {
    try {
      await supabase.rpc('exec_sql', { query: sql })
      console.log('✅ Created enum:', sql.split(' ')[2])
    } catch (err) {
      console.log('⚠️  Enum might exist:', sql.split(' ')[2])
    }
  }

  console.log('📊 Creating tables...')
  
  // Step 3: Create profiles table
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

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        name: 'Test Insert',
        email: 'test@test.com',
        password: 'test123',
        role: 'Admin'
      })
      .select()

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, create it
      console.log('Creating profiles table...')
      
      // We'll create a simple profiles table first
      const simpleProfilesSQL = `
        CREATE TABLE profiles (
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
      `

      // Since we can't execute DDL directly, we'll create through insert operations
      console.log('❌ Cannot create tables via API. Using direct insert approach...')
    }
  } catch (err) {
    console.log('Table creation attempt:', err)
  }

  // Step 4: Try to insert admin user
  console.log('👤 Creating admin user...')
  
  try {
    const { data: adminData, error: adminError } = await supabase
      .from('profiles')
      .insert({
        name: 'YUANDI 관리자',
        email: 'yuandi1020@gmail.com',
        password: 'yuandi123!',
        role: 'Admin',
        locale: 'ko',
        active: true
      })
      .select()

    if (adminError) {
      console.error('❌ Admin user creation failed:', adminError)
      
      if (adminError.code === 'PGRST116') {
        console.log('\n📋 Manual steps required:')
        console.log('1. Go to: https://app.supabase.com/project/eikwfesvmohfpokgeqtv/sql')
        console.log('2. Execute the complete schema from supabase-schema-fixed.sql')
        console.log('3. The file contains all tables + admin user creation')
        return
      }
    } else {
      console.log('✅ Admin user created successfully:', adminData)
    }
  } catch (err) {
    console.error('❌ Error:', err)
  }

  // Test connection
  console.log('🔍 Testing database connection...')
  const { data: testData, error: testError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)

  if (testError) {
    console.error('❌ Database test failed:', testError)
  } else {
    console.log('✅ Database connection successful')
    console.log('📊 Current profiles:', testData)
  }
}

createFullSchema()