-- 관리자 프로필 설정 스크립트
-- 
-- 중요: Supabase는 auth.users 테이블에 SQL로 직접 사용자를 생성할 수 없습니다.
-- 따라서 다음 순서로 진행해야 합니다:
--
-- 1단계: Supabase Dashboard에서 사용자 생성
--   - Dashboard > Authentication > Users > Add user > Create new user
--   - Email: admin@yuandi.com
--   - Password: yuandi123!
--   - Auto Confirm User: 체크
--
-- 2단계: 생성된 User ID 확인
--   - 생성된 사용자 클릭하여 User ID 복사
--
-- 3단계: 아래 SQL 실행 (User ID를 실제 값으로 교체)
--
-- 자세한 가이드는 /docs/ADMIN_SETUP.md 참조
INSERT INTO user_profiles (
  id,
  email,
  name,
  phone,
  role,
  locale,
  active,
  created_at,
  updated_at
) VALUES (
  '[REPLACE_WITH_AUTH_USER_ID]', -- Supabase Auth에서 생성된 사용자 ID로 교체
  'admin@yuandi.com',
  'System administrator',
  '010-0000-0000',
  'admin',
  'ko',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  locale = EXCLUDED.locale,
  active = EXCLUDED.active,
  updated_at = NOW();