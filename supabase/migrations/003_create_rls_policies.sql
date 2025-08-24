-- Row Level Security (RLS) 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_counters ENABLE ROW LEVEL SECURITY;

-- 사용자 역할 확인 함수
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM user_profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 현재 사용자 역할 확인 함수
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT get_user_role(auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. user_profiles 정책
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR ALL USING (current_user_role() = 'admin');

-- 2. products 정책
CREATE POLICY "All authenticated users can view products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and OrderManager can manage products" ON products
  FOR ALL USING (current_user_role() IN ('admin', 'order_manager'));

-- 3. orders 정책
-- 관리자와 주문관리자는 모든 주문 조회 가능
CREATE POLICY "Admin and OrderManager can view all orders" ON orders
  FOR SELECT USING (current_user_role() IN ('admin', 'order_manager', 'ship_manager'));

-- 관리자와 주문관리자는 주문 생성/수정 가능
CREATE POLICY "Admin and OrderManager can manage orders" ON orders
  FOR ALL USING (current_user_role() IN ('admin', 'order_manager'));

-- 배송관리자는 배송 관련 필드만 업데이트 가능
CREATE POLICY "ShipManager can update shipping info" ON orders
  FOR UPDATE USING (
    current_user_role() = 'ship_manager' AND
    status IN ('PAID', 'SHIPPED')
  );

-- 고객 포털용 정책 (퍼블릭 액세스, 이름+전화번호 매칭)
CREATE POLICY "Public order tracking" ON orders
  FOR SELECT USING (true); -- API에서 필터링 처리

-- 4. order_items 정책
CREATE POLICY "Users can view order items based on order access" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND (
        current_user_role() IN ('admin', 'order_manager', 'ship_manager')
        OR true -- 퍼블릭 액세스 (API에서 필터링)
      )
    )
  );

CREATE POLICY "Admin and OrderManager can manage order items" ON order_items
  FOR ALL USING (current_user_role() IN ('admin', 'order_manager'));

-- 5. inventory_movements 정책
CREATE POLICY "Users can view inventory movements" ON inventory_movements
  FOR SELECT USING (current_user_role() IN ('admin', 'order_manager'));

CREATE POLICY "Admin and OrderManager can create inventory movements" ON inventory_movements
  FOR INSERT WITH CHECK (current_user_role() IN ('admin', 'order_manager'));

-- 6. cashbook_transactions 정책
CREATE POLICY "Admin and managers can view cashbook" ON cashbook_transactions
  FOR SELECT USING (current_user_role() IN ('admin', 'order_manager', 'ship_manager'));

CREATE POLICY "Admin and OrderManager can manage cashbook" ON cashbook_transactions
  FOR ALL USING (current_user_role() IN ('admin', 'order_manager'));

-- 7. event_logs 정책
CREATE POLICY "Admin can view all event logs" ON event_logs
  FOR SELECT USING (current_user_role() = 'admin');

-- 8. sequence_counters 정책
CREATE POLICY "Authenticated users can access sequences" ON sequence_counters
  FOR ALL USING (auth.role() = 'authenticated');

-- 9. 함수 실행 권한 설정
GRANT EXECUTE ON FUNCTION generate_sku TO authenticated;
GRANT EXECUTE ON FUNCTION generate_order_number TO authenticated;
GRANT EXECUTE ON FUNCTION update_product_stock TO authenticated;
GRANT EXECUTE ON FUNCTION process_order_refund TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_role TO authenticated;

-- 10. 테이블 접근 권한 설정
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;  -- 고객 포털용

-- 시퀀스 권한
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;