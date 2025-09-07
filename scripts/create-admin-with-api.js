// Script to create admin user using Supabase Admin API
// This creates both Auth user and user_profiles record

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// You need the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Add this to your .env.local

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!');
  console.error('Required:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY (get from Supabase Dashboard > Settings > API)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('Creating admin user...');

    // Step 1: Create Auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@yuandi.com',
      password: 'Admin123!@#',
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: '시스템 관리자',  // Note: column is 'name' not 'full_name'
        role: 'admin'
      }
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log('Auth user already exists, fetching existing user...');
        
        // Get existing user
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingUser = users.find(u => u.email === 'admin@yuandi.com');
        if (!existingUser) throw new Error('Could not find existing user');
        
        console.log('Found existing auth user:', existingUser.id);
        
        // Update user profile
        await createOrUpdateProfile(existingUser.id);
      } else {
        throw authError;
      }
    } else {
      console.log('Auth user created successfully:', authUser.user.id);
      
      // Step 2: Create user profile
      await createOrUpdateProfile(authUser.user.id);
    }

    console.log('\n✅ Admin user setup complete!');
    console.log('Login credentials:');
    console.log('  Email: admin@yuandi.com');
    console.log('  Password: Admin123!@#');

  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

async function createOrUpdateProfile(userId) {
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      email: 'admin@yuandi.com',
      name: '시스템 관리자',  // Note: column is 'name' not 'full_name'
      role: 'admin',
      phone: '010-0000-0000',
      language: 'ko',
      timezone: 'Asia/Seoul',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    })
    .select()
    .single();

  if (profileError) {
    throw profileError;
  }

  console.log('User profile created/updated successfully');
  return profile;
}

// Run the script
createAdminUser();