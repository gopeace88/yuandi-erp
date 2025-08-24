const { createClient } = require('@supabase/supabase-js')
const { randomUUID } = require('crypto')

async function createSupabaseTables() {
  const supabase = createClient(
    'https://eikwfesvmohfpokgeqtv.supabase.co',
    'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'
  )

  console.log('Testing Supabase connection...')
  
  try {
    // First test connection by listing existing tables
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    if (tableError) {
      console.log('Cannot query information_schema, trying alternative...')
    } else {
      console.log('Existing tables:', tables.map(t => t.table_name))
    }

    // Create profiles table using SQL
    console.log('Creating profiles table...')
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        role VARCHAR(20) NOT NULL DEFAULT 'OrderManager' 
          CHECK (role IN ('Admin', 'OrderManager', 'ShipManager')),
        locale VARCHAR(10) NOT NULL DEFAULT 'ko',
        active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
      );
      
      CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
      CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
    `

    // Try using the SQL editor endpoint
    const response = await fetch(`https://eikwfesvmohfpokgeqtv.supabase.co/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr`,
        'Content-Type': 'application/json',
        'apikey': 'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'
      },
      body: JSON.stringify({ sql: createTableSQL })
    })

    if (!response.ok) {
      console.log('SQL execution failed, trying direct table creation...')
      
      // Try creating with a simple insert to test if table exists
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)

      if (testError && testError.code === 'PGRST116') {
        console.log('Table does not exist. Please create it manually in Supabase dashboard.')
        console.log('Go to: https://app.supabase.com/project/eikwfesvmohfpokgeqtv/sql')
        console.log('Execute this SQL:')
        console.log(createTableSQL)
        return
      }
      
      console.log('Table might already exist:', testData)
      
    } else {
      console.log('SQL executed successfully')
    }

    // Create admin user
    console.log('Creating admin user...')
    
    const { data: adminData, error: adminError } = await supabase
      .from('profiles')
      .insert({
        name: 'YUANDI 관리자',
        email: 'yuandi1020@gmail.com',
        role: 'Admin',
        locale: 'ko',
        active: true
      })
      .select()
      .single()

    if (adminError) {
      if (adminError.code === '23505') {
        console.log('Admin user already exists')
        
        // Try to select existing user
        const { data: existingUser, error: selectError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', 'yuandi1020@gmail.com')
          .single()
          
        if (selectError) {
          console.error('Error fetching existing user:', selectError)
        } else {
          console.log('Existing admin user:', existingUser)
        }
      } else {
        console.error('Admin user creation error:', adminError)
      }
    } else {
      console.log('Admin user created successfully:', adminData)
    }

  } catch (error) {
    console.error('Execution error:', error)
  }
}

createSupabaseTables()