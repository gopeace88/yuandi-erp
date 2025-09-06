-- YUANDI ERP 테스트 사용자 생성 스크립트
-- Supabase Auth를 통해 사용자를 먼저 생성한 후 실행하세요

-- ======================================
-- 옵션 1: Supabase Dashboard에서 사용자 생성 후
-- ======================================
-- 1. Supabase Dashboard > Authentication > Users
-- 2. "Invite user" 또는 "Create user" 클릭
-- 3. 이메일: admin@test.com, 비밀번호 설정
-- 4. 생성된 사용자의 UUID를 복사
-- 5. 아래 스크립트의 UUID를 교체하여 실행

/*
-- 실제 사용자 UUID로 교체하세요
INSERT INTO user_profiles (id, email, name, role, language, timezone, is_active)
VALUES (
    'YOUR-USER-UUID-HERE'::UUID,  -- Supabase Auth에서 생성된 실제 UUID로 교체
    'admin@test.com',
    '테스트 관리자',
    'admin'::user_role,
    'ko'::language_code,
    'Asia/Seoul',
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    language = EXCLUDED.language,
    is_active = true;
*/

-- ======================================
-- 옵션 2: SQL로 직접 auth.users 생성 (개발 환경용)
-- ======================================
-- 주의: 이 방법은 개발 환경에서만 사용하세요
-- 실제 운영에서는 Supabase Auth API를 사용해야 합니다

DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    existing_user_id UUID;
BEGIN
    -- 이미 존재하는 사용자 확인
    SELECT id INTO existing_user_id FROM auth.users WHERE email = 'admin@test.com';
    
    IF existing_user_id IS NULL THEN
        -- auth.users 테이블에 직접 삽입 (개발용)
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role
        ) VALUES (
            test_user_id,
            'admin@test.com',
            crypt('Test1234!', gen_salt('bf')),  -- 비밀번호: Test1234!
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"name": "테스트 관리자"}'::jsonb,
            'authenticated',
            'authenticated'
        );
    ELSE
        test_user_id := existing_user_id;
    END IF;

    -- user_profiles에 추가
    INSERT INTO user_profiles (id, email, name, role, language, timezone, is_active)
    SELECT 
        id,
        email,
        '테스트 관리자',
        'admin'::user_role,
        'ko'::language_code,
        'Asia/Seoul',
        true
    FROM auth.users
    WHERE email = 'admin@test.com'
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_active = true;

    RAISE NOTICE '테스트 사용자 생성 완료: admin@test.com (비밀번호: Test1234!)';
END $$;

-- ======================================
-- 추가 테스트 사용자들 (선택사항)
-- ======================================

-- 주문 관리자
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    existing_user_id UUID;
BEGIN
    -- 이미 존재하는 사용자 확인
    SELECT id INTO existing_user_id FROM auth.users WHERE email = 'order@test.com';
    
    IF existing_user_id IS NULL THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role
        ) VALUES (
            test_user_id,
            'order@test.com',
            crypt('Test1234!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"name": "주문 관리자"}'::jsonb,
            'authenticated',
            'authenticated'
        );
    ELSE
        test_user_id := existing_user_id;
    END IF;

    INSERT INTO user_profiles (id, email, name, role, language, timezone, is_active)
    SELECT 
        id,
        email,
        '주문 관리자',
        'order_manager'::user_role,
        'ko'::language_code,
        'Asia/Seoul',
        true
    FROM auth.users
    WHERE email = 'order@test.com'
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_active = true;
END $$;

-- 배송 관리자
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    existing_user_id UUID;
BEGIN
    -- 이미 존재하는 사용자 확인
    SELECT id INTO existing_user_id FROM auth.users WHERE email = 'ship@test.com';
    
    IF existing_user_id IS NULL THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role
        ) VALUES (
            test_user_id,
            'ship@test.com',
            crypt('Test1234!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"name": "배송 관리자"}'::jsonb,
            'authenticated',
            'authenticated'
        );
    ELSE
        test_user_id := existing_user_id;
    END IF;

    INSERT INTO user_profiles (id, email, name, role, language, timezone, is_active)
    SELECT 
        id,
        email,
        '배송 관리자',
        'ship_manager'::user_role,
        'ko'::language_code,
        'Asia/Seoul',
        true
    FROM auth.users
    WHERE email = 'ship@test.com'
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_active = true;
END $$;

-- 생성된 사용자 확인
SELECT 
    up.id,
    up.email,
    up.name,
    up.role,
    up.is_active,
    CASE 
        WHEN au.id IS NOT NULL THEN '✅ auth.users 존재'
        ELSE '❌ auth.users 없음'
    END as auth_status
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at DESC;