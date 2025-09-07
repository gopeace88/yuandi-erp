-- 완전한 user_profiles 정리 스크립트
-- Foreign Key 제약 때문에 순서대로 삭제해야 합니다

-- 삭제할 USER ID (실제 ID로 변경)
-- 예: '8b451e06-d671-45df-8883-0555a2f4540f' 또는 'b8bb0ab9-d9f3-4c7d-8807-a772d58e9b5c'

-- 방법 1: 특정 사용자의 모든 관련 데이터 삭제
DO $$
DECLARE
  target_user_id UUID := 'b8bb0ab9-d9f3-4c7d-8807-a772d58e9b5c'; -- 여기에 삭제할 ID 입력
BEGIN
  -- 1. cashbook_transactions 삭제
  DELETE FROM cashbook_transactions WHERE created_by = target_user_id;
  
  -- 2. shipments 삭제
  DELETE FROM shipments WHERE created_by = target_user_id;
  
  -- 3. order_items 삭제 (orders를 참조)
  DELETE FROM order_items WHERE order_id IN (
    SELECT id FROM orders WHERE created_by = target_user_id
  );
  
  -- 4. orders 삭제
  DELETE FROM orders WHERE created_by = target_user_id;
  
  -- 5. inventory_logs 삭제
  DELETE FROM inventory_logs WHERE created_by = target_user_id;
  
  -- 6. products 삭제 (created_by가 있다면)
  DELETE FROM products WHERE created_by = target_user_id;
  
  -- 7. 마지막으로 user_profiles 삭제
  DELETE FROM user_profiles WHERE id = target_user_id;
  
  RAISE NOTICE 'User % and all related data deleted successfully', target_user_id;
END $$;

-- 방법 2: auth.users에 없는 모든 고아 데이터 정리
BEGIN;

-- auth.users에 없는 user_profiles의 ID들을 찾아서 관련 데이터 모두 삭제
WITH orphan_users AS (
  SELECT up.id 
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id
  WHERE au.id IS NULL
)
-- cashbook_transactions 정리
DELETE FROM cashbook_transactions 
WHERE created_by IN (SELECT id FROM orphan_users);

WITH orphan_users AS (
  SELECT up.id 
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id
  WHERE au.id IS NULL
)
-- shipments 정리
DELETE FROM shipments 
WHERE created_by IN (SELECT id FROM orphan_users);

WITH orphan_users AS (
  SELECT up.id 
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id
  WHERE au.id IS NULL
)
-- order_items 정리
DELETE FROM order_items 
WHERE order_id IN (
  SELECT id FROM orders 
  WHERE created_by IN (SELECT id FROM orphan_users)
);

WITH orphan_users AS (
  SELECT up.id 
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id
  WHERE au.id IS NULL
)
-- orders 정리
DELETE FROM orders 
WHERE created_by IN (SELECT id FROM orphan_users);

WITH orphan_users AS (
  SELECT up.id 
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id
  WHERE au.id IS NULL
)
-- inventory_logs 정리
DELETE FROM inventory_logs 
WHERE created_by IN (SELECT id FROM orphan_users);

WITH orphan_users AS (
  SELECT up.id 
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id
  WHERE au.id IS NULL
)
-- products 정리 (created_by가 있다면)
DELETE FROM products 
WHERE created_by IN (SELECT id FROM orphan_users);

-- 마지막으로 user_profiles 정리
DELETE FROM user_profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

COMMIT;

-- 정리 후 상태 확인
SELECT 
  'user_profiles' as table_name, 
  COUNT(*) as count 
FROM user_profiles
UNION ALL
SELECT 
  'auth.users' as table_name, 
  COUNT(*) as count 
FROM auth.users
UNION ALL
SELECT 
  'orders' as table_name, 
  COUNT(*) as count 
FROM orders
UNION ALL
SELECT 
  'cashbook_transactions' as table_name, 
  COUNT(*) as count 
FROM cashbook_transactions;