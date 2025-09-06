-- RLS 정책 확인 스크립트
-- 1. 테이블별 RLS 활성화 상태 확인
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    relforcerowsecurity as rls_enforced
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE t.schemaname = 'public' 
  AND t.tablename IN ('orders', 'shipments', 'cashbook', 'products', 'users', 'customer_order_lookup');

-- 2. 현재 설정된 RLS 정책 목록 확인
SELECT 
    schemaname, 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'shipments', 'cashbook', 'products', 'users', 'customer_order_lookup')
ORDER BY tablename, policyname;

-- 3. anon 롤의 권한 확인
SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE grantee = 'anon' 
  AND table_schema = 'public'
  AND table_name IN ('orders', 'shipments', 'cashbook', 'products', 'users', 'customer_order_lookup')
ORDER BY table_name, privilege_type;

-- 4. authenticated 롤의 권한 확인  
SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE grantee = 'authenticated' 
  AND table_schema = 'public'
  AND table_name IN ('orders', 'shipments', 'cashbook', 'products', 'users', 'customer_order_lookup')
ORDER BY table_name, privilege_type;

-- 5. service_role 롤의 권한 확인
SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE grantee = 'service_role'
  AND table_schema = 'public'
  AND table_name IN ('orders', 'shipments', 'cashbook', 'products', 'users', 'customer_order_lookup')
ORDER BY table_name, privilege_type;