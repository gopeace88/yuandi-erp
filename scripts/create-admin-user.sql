-- Script to create admin user with proper Supabase Auth integration
-- Run this after creating the user in Supabase Auth Dashboard

-- ====================================
-- STEP 1: Create user in Supabase Auth
-- ====================================
-- 1. Go to Supabase Dashboard
-- 2. Navigate to Authentication > Users
-- 3. Click "Add user" → "Create new user"
-- 4. Enter:
--    Email: admin@yuandi.com
--    Password: Admin123!@#
-- 5. Copy the generated User UID

-- ====================================
-- STEP 2: Insert user profile
-- ====================================
-- Replace 'YOUR-AUTH-UUID-HERE' with the actual UUID from Step 1

INSERT INTO user_profiles (
    id,
    email,
    name,  -- Note: column is 'name' not 'full_name'
    role,
    phone,
    language,
    timezone,
    is_active,
    created_at,
    updated_at
) VALUES (
    'YOUR-AUTH-UUID-HERE'::UUID,  -- ← REPLACE THIS with actual UUID from Supabase Auth
    'admin@yuandi.com',
    '시스템 관리자',
    'admin',
    '010-0000-0000',
    'ko',
    'Asia/Seoul',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    language = EXCLUDED.language,
    timezone = EXCLUDED.timezone,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ====================================
-- STEP 3: Verify the user was created
-- ====================================
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM user_profiles 
WHERE email = 'admin@yuandi.com';

-- ====================================
-- Optional: Create additional test users
-- ====================================
-- Remember to create these in Supabase Auth first!

/*
-- Order Manager User
INSERT INTO user_profiles (
    id, email, name, role, phone, language, timezone, is_active
) VALUES (
    'ORDER-MANAGER-UUID'::UUID,
    'order@yuandi.com',
    '주문 관리자',
    'order_manager',
    '010-1111-1111',
    'ko',
    'Asia/Seoul',
    true
);

-- Ship Manager User
INSERT INTO user_profiles (
    id, email, name, role, phone, language, timezone, is_active
) VALUES (
    'SHIP-MANAGER-UUID'::UUID,
    'ship@yuandi.com',
    '배송 관리자',
    'ship_manager',
    '010-2222-2222',
    'ko',
    'Asia/Seoul',
    true
);
*/