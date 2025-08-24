const { createClient } = require('@supabase/supabase-js')
const { randomUUID } = require('crypto')

async function createTables() {
  const supabase = createClient(
    'https://eikwfesvmohfpokgeqtv.supabase.co',
    'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'
  )

  console.log('Creating development profiles table...')
  
  // Create simple profiles table for development (without auth.users reference)
  const createProfilesSQL = `
    -- Drop table if exists
    DROP TABLE IF EXISTS profiles CASCADE;
    
    -- Create development profiles table
    CREATE TABLE profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        role VARCHAR(20) NOT NULL DEFAULT 'OrderManager',
        locale VARCHAR(10) NOT NULL DEFAULT 'ko',
        active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
        CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^[0-9+\\-\\s]+$'),
        CONSTRAINT valid_role CHECK (role IN ('Admin', 'OrderManager', 'ShipManager'))
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
    CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(active);
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
  `

  try {
    // Execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: createProfilesSQL 
    })

    if (error) {
      console.error('SQL execution error:', error)
      
      // Try alternative approach - raw SQL
      console.log('Trying alternative approach...')
      const { data: altData, error: altError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)

      if (altError && altError.code === 'PGRST205') {
        console.error('Table does not exist. Please create it manually in Supabase dashboard.')
        console.log('SQL to execute in Supabase SQL editor:')
        console.log(createProfilesSQL)
        return
      }
    } else {
      console.log('Tables created successfully')
    }

    // Now try to create admin user
    console.log('Creating admin user...')
    
    const { data: adminData, error: adminError } = await supabase
      .from('profiles')
      .insert({
        id: randomUUID(),
        name: 'YUANDI 관리자',
        email: 'yuandi1020@gmail.com',
        role: 'Admin',
        locale: 'ko',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()

    if (adminError) {
      console.error('Admin user creation error:', adminError)
    } else {
      console.log('Admin user created:', adminData)
    }

  } catch (err) {
    console.error('Execution error:', err)
  }
}

createTables()