-- RLS 정책 수정 스크립트
-- 주의: 이 스크립트는 개발 환경에서만 실행하세요

-- 1. 모든 테이블에 대해 RLS 활성화
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_order_lookup ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "orders_select_policy" ON orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
DROP POLICY IF EXISTS "orders_update_policy" ON orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON orders;

DROP POLICY IF EXISTS "shipments_select_policy" ON shipments;
DROP POLICY IF EXISTS "shipments_insert_policy" ON shipments;
DROP POLICY IF EXISTS "shipments_update_policy" ON shipments;
DROP POLICY IF EXISTS "shipments_delete_policy" ON shipments;

DROP POLICY IF EXISTS "cashbook_select_policy" ON cashbook;
DROP POLICY IF EXISTS "cashbook_insert_policy" ON cashbook;
DROP POLICY IF EXISTS "cashbook_update_policy" ON cashbook;
DROP POLICY IF EXISTS "cashbook_delete_policy" ON cashbook;

DROP POLICY IF EXISTS "products_select_policy" ON products;
DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;

DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- 3. 새 정책 생성 - 모든 authenticated 사용자에게 전체 액세스 허용 (개발용)
CREATE POLICY "orders_select_policy" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "orders_insert_policy" ON orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "orders_update_policy" ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "orders_delete_policy" ON orders FOR DELETE TO authenticated USING (true);

CREATE POLICY "shipments_select_policy" ON shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "shipments_insert_policy" ON shipments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shipments_update_policy" ON shipments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shipments_delete_policy" ON shipments FOR DELETE TO authenticated USING (true);

CREATE POLICY "cashbook_select_policy" ON cashbook FOR SELECT TO authenticated USING (true);
CREATE POLICY "cashbook_insert_policy" ON cashbook FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cashbook_update_policy" ON cashbook FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cashbook_delete_policy" ON cashbook FOR DELETE TO authenticated USING (true);

CREATE POLICY "products_select_policy" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_insert_policy" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "products_update_policy" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "products_delete_policy" ON products FOR DELETE TO authenticated USING (true);

CREATE POLICY "users_select_policy" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert_policy" ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "users_update_policy" ON users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "users_delete_policy" ON users FOR DELETE TO authenticated USING (true);

-- 4. customer_order_lookup은 anon 사용자도 접근 가능하도록 설정
CREATE POLICY "customer_order_lookup_select_policy" ON customer_order_lookup 
FOR SELECT TO anon, authenticated USING (true);

-- 5. anon 사용자에게 필요한 권한 부여 (고객 주문 조회용)
GRANT SELECT ON public.customer_order_lookup TO anon;
GRANT SELECT ON public.orders TO anon;
GRANT SELECT ON public.products TO anon;

-- 6. authenticated 사용자에게 모든 권한 부여
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.shipments TO authenticated;
GRANT ALL ON public.cashbook TO authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.customer_order_lookup TO authenticated;

-- 7. service_role에게 모든 권한 부여 (API용)
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.shipments TO service_role;
GRANT ALL ON public.cashbook TO service_role;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.customer_order_lookup TO service_role;

-- 8. 시퀀스에 대한 권한 부여
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;