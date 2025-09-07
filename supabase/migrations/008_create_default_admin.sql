-- Create default admin user with Supabase Auth UUID
-- This migration creates a default admin user for initial system setup

-- First, create the auth user in Supabase Auth (if not exists)
-- Note: This requires using Supabase Dashboard or Admin API to create the auth user first
-- Default credentials: admin@yuandi.com / Admin123!@#

-- Insert user profile for the admin user
-- Replace 'YOUR-AUTH-UUID-HERE' with the actual UUID from Supabase Auth
DO $$
DECLARE
    admin_uuid UUID;
BEGIN
    -- You need to get this UUID from Supabase Auth Dashboard after creating the user
    -- Or use the Supabase Admin API to create the user programmatically
    
    -- Example UUID (replace with actual UUID from Supabase Auth)
    -- admin_uuid := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::UUID;
    
    -- For now, we'll create a placeholder that you need to update
    -- Step 1: Go to Supabase Dashboard > Authentication > Users
    -- Step 2: Create a new user with email: admin@yuandi.com
    -- Step 3: Copy the User UID and replace below
    
    -- Temporary: Generate a UUID for demonstration (replace with actual Auth UUID)
    admin_uuid := gen_random_uuid();
    
    -- Check if user already exists
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE email = 'admin@yuandi.com') THEN
        -- Insert the admin user profile
        INSERT INTO user_profiles (
            id,
            email,
            name,  -- Corrected column name
            role,
            phone,
            language,
            timezone,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            admin_uuid,
            'admin@yuandi.com',
            '시스템 관리자',
            'admin',
            '010-0000-0000',
            'ko',
            'Asia/Seoul',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Admin user created successfully with ID: %', admin_uuid;
    ELSE
        RAISE NOTICE 'Admin user already exists';
    END IF;
END $$;

-- Alternative: If you already have the Auth UUID, use this simpler version:
/*
INSERT INTO user_profiles (
    id,
    email,
    name,  -- Corrected column name
    role,
    phone,
    language,
    timezone,
    is_active,
    created_at,
    updated_at
) VALUES (
    'YOUR-AUTH-UUID-HERE'::UUID,  -- Replace with actual UUID from Supabase Auth
    'admin@yuandi.com',
    '시스템 관리자',
    'admin',
    '010-0000-0000',
    'ko',
    'Asia/Seoul',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;
*/