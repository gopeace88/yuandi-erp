-- =====================================================
-- YUANDI ERP - 관리자 계정 생성 도우미
-- =====================================================
-- 이 스크립트는 01.working_schema_reset.sql 실행 후 사용합니다.
-- Supabase Dashboard에서 관리자 계정을 생성한 후 이 스크립트를 실행하세요.

-- 1. Auth 사용자 목록 확인
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE email = 'admin@yuandi.com';

-- 2. 관리자 프로필이 있는지 확인
SELECT 
    p.id,
    p.email,
    p.name,
    p.role,
    p.is_active,
    p.created_at
FROM user_profiles p
WHERE p.email = 'admin@yuandi.com';

-- 3. auth.users에 admin@yuandi.com이 있지만 user_profiles에 없는 경우
-- 아래 쿼리를 실행하여 프로필 생성
-- (주석을 제거하고 실행)

INSERT INTO user_profiles (
    id,
    email,
    name,
    role,
    language,
    is_active
)
SELECT 
    u.id,
    u.email,
    '시스템 관리자' as name,
    'admin'::user_role as role,
    'ko'::user_language as language,
    true as is_active
FROM auth.users u
WHERE u.email = 'admin@yuandi.com'
AND NOT EXISTS (
    SELECT 1 FROM user_profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_active = true,
    updated_at = NOW();


-- 4. 모든 사용자 프로필 확인
SELECT 
    p.email,
    p.name,
    p.role,
    CASE p.role
        WHEN 'admin' THEN '시스템 관리자'
        WHEN 'order_manager' THEN '주문 관리자'
        WHEN 'ship_manager' THEN '배송 관리자'
    END as role_ko,
    p.is_active,
    p.created_at
FROM user_profiles p
ORDER BY p.created_at;

-- 5. 시스템 준비 상태 확인
SELECT 
    'System Ready Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE role = 'admin' AND is_active = true)
        THEN '✅ 관리자 계정 준비됨'
        ELSE '❌ 관리자 계정 필요'
    END as status
UNION ALL
SELECT 
    'Tables Created',
    '테이블 ' || COUNT(*)::text || '개 생성됨'
FROM information_schema.tables
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'Cashbook Types',
    CASE 
        WHEN EXISTS (SELECT 1 FROM cashbook_types WHERE is_system = true)
        THEN '✅ 출납유형 기본값 준비됨'
        ELSE '❌ 출납유형 기본값 필요'
    END;

-- =====================================================
-- 사용 방법:
-- 1. Supabase Dashboard에서 admin@yuandi.com 계정 생성
-- 2. 이 스크립트 실행하여 상태 확인
-- 3. 필요시 주석 제거하여 프로필 생성
-- =====================================================