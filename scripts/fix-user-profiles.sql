-- user_profiles 테이블 문제 해결 스크립트

-- 1. 먼저 현재 상태 확인
SELECT * FROM user_profiles;

-- 2. 문제가 되는 레코드 확인 (auth.users에 없는 ID)
SELECT up.* 
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.id IS NULL;

-- 3. Foreign Key 제약 일시 비활성화 (옵션 1)
-- Supabase에서는 직접 제약을 비활성화할 수 없으므로, 
-- 잘못된 데이터를 삭제하는 방법을 사용해야 합니다.

-- 4. auth.users에 없는 user_profiles 레코드 삭제
DELETE FROM user_profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- 5. 또는 특정 ID만 삭제 (실제 ID로 교체)
-- DELETE FROM user_profiles WHERE id = '8b451e06-d671-45df-8883-0555a2f4540f';

-- 6. 관련 테이블도 정리 (cascade가 안 되는 경우)
-- orders, shipments 등 user_profiles.id를 참조하는 테이블도 확인
DELETE FROM orders WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM shipments WHERE created_by NOT IN (SELECT id FROM auth.users);

-- 7. 정리 후 상태 확인
SELECT 
  'user_profiles' as table_name, 
  COUNT(*) as count 
FROM user_profiles
UNION ALL
SELECT 
  'auth.users' as table_name, 
  COUNT(*) as count 
FROM auth.users;

-- 8. 올바른 사용자 생성 순서 안내
/*
올바른 순서:
1. Supabase Dashboard > Authentication > Users에서 사용자 생성
2. 생성된 User ID 복사
3. user_profiles 테이블에 같은 ID로 프로필 추가

삭제 순서 (필요시):
1. user_profiles에서 먼저 삭제
2. auth.users에서 삭제 (Dashboard에서)
*/