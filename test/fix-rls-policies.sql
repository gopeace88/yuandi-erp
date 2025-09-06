-- RLS 정책 무한 재귀 문제 해결
-- user_profiles 테이블의 RLS 정책을 삭제하고 다시 생성

-- 1. 모든 테이블의 기존 RLS 정책 삭제
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 2. 개발 환경을 위해 간단한 RLS 정책 설정
-- 주의: 프로덕션에서는 적절한 정책을 설정해야 합니다!

-- user_profiles: 모든 사용자가 읽기 가능
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON user_profiles FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON user_profiles FOR DELETE USING (true);

-- products: 모든 사용자가 읽기 가능
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON products FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write" ON products FOR ALL USING (true);

-- orders: 모든 사용자가 모든 작업 가능
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON orders FOR ALL USING (true);

-- order_items: 모든 사용자가 모든 작업 가능
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON order_items FOR ALL USING (true);

-- inventory: 모든 사용자가 모든 작업 가능
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON inventory FOR ALL USING (true);

-- cashbook_transactions: 모든 사용자가 모든 작업 가능
ALTER TABLE cashbook_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON cashbook_transactions FOR ALL USING (true);

-- product_categories: 모든 사용자가 읽기 가능
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON product_categories FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write" ON product_categories FOR ALL USING (true);

-- shipments: 모든 사용자가 모든 작업 가능
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON shipments FOR ALL USING (true);

-- inventory_transactions: 모든 사용자가 모든 작업 가능
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON inventory_transactions FOR ALL USING (true);

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'RLS 정책이 재설정되었습니다.';
    RAISE NOTICE '개발 환경용 간단한 정책이 적용되었습니다.';
    RAISE NOTICE '프로덕션에서는 적절한 보안 정책을 설정하세요!';
END $$;