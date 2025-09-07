-- Correct SQL for creating admin user
-- Use the actual column names from user_profiles table

INSERT INTO user_profiles (
    id, 
    email, 
    name,  -- Note: 'name' not 'full_name'
    role, 
    phone, 
    language, 
    timezone, 
    is_active,
    created_at,
    updated_at
) VALUES (
    '0cfa2d20-b2e5-4ab5-98fd-f1911d27b096'::UUID,  -- Your Auth UUID
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