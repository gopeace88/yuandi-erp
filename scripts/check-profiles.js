const { createClient } = require('@supabase/supabase-js')
const { randomUUID } = require('crypto')

async function checkProfiles() {
  const supabase = createClient(
    'https://eikwfesvmohfpokgeqtv.supabase.co',
    'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'
  )

  console.log('Checking if profiles table exists...')
  
  // First check if table exists
  const { data: tables, error: tableError } = await supabase
    .rpc('pg_tables')
    .select('*')
    .eq('tablename', 'profiles')
  
  if (tableError) {
    console.log('Cannot check tables, trying direct query...')
  } else {
    console.log('Tables found:', tables)
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'yuandi1020@gmail.com')

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Profiles found:', data)
  }

  // If no profile exists, create one
  if (!data || data.length === 0) {
    console.log('Creating admin profile...')
    
    const { data: newProfile, error: insertError } = await supabase
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

    if (insertError) {
      console.error('Insert error:', insertError)
    } else {
      console.log('Created profile:', newProfile)
    }
  }
}

checkProfiles()