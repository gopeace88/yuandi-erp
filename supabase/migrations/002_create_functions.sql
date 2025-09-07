-- 1. Updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language plpgsql;

-- Updated_at 트리거 생성
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. SKU 자동 생성 함수
CREATE OR REPLACE FUNCTION generate_sku(
  p_category product_category,
  p_model TEXT DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_brand TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  category_code TEXT;
  model_part TEXT := '';
  color_part TEXT := '';
  brand_part TEXT := '';
  hash_part TEXT;
  sku_base TEXT;
BEGIN
  -- 카테고리 코드 매핑
  category_code := CASE p_category
    WHEN 'ELECTRONICS' THEN 'ELC'
    WHEN 'FASHION' THEN 'FSH'
    WHEN 'COSMETICS' THEN 'COS'
    WHEN 'SUPPLEMENTS' THEN 'SUP'
    WHEN 'TOYS' THEN 'TOY'
    WHEN 'BOOKS' THEN 'BOK'
    WHEN 'SPORTS' THEN 'SPT'
    WHEN 'HOME' THEN 'HOM'
    WHEN 'FOOD' THEN 'FOD'
    ELSE 'OTH'
  END;

  -- 각 부분 처리 (최대 3자, 영숫자만, 대문자)
  IF p_model IS NOT NULL THEN
    model_part := '-' || UPPER(SUBSTRING(REGEXP_REPLACE(p_model, '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 3));
  END IF;

  IF p_color IS NOT NULL THEN
    color_part := '-' || UPPER(SUBSTRING(REGEXP_REPLACE(p_color, '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 3));
  END IF;

  IF p_brand IS NOT NULL THEN
    brand_part := '-' || UPPER(SUBSTRING(REGEXP_REPLACE(p_brand, '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 3));
  END IF;

  -- 기본 SKU 생성
  sku_base := category_code || model_part || color_part || brand_part;

  -- 5자리 해시 생성 (현재 시간 + 랜덤)
  hash_part := UPPER(SUBSTRING(MD5(EXTRACT(EPOCH FROM NOW())::TEXT || RANDOM()::TEXT) FROM 1 FOR 5));

  RETURN sku_base || '-' || hash_part;
END;
$$ LANGUAGE plpgsql;

-- 3. 주문번호 생성 함수
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  date_key TEXT;
  counter INTEGER;
  order_no TEXT;
BEGIN
  -- 오늘 날짜 키 생성 (YYMMDD 형식)
  date_key := TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYMMDD');
  
  -- 카운터 조회/업데이트
  INSERT INTO sequence_counters (sequence_name, date_key, current_value)
  VALUES ('order_number', date_key, 1)
  ON CONFLICT (sequence_name) DO UPDATE
  SET 
    current_value = CASE 
      WHEN sequence_counters.date_key = date_key 
      THEN sequence_counters.current_value + 1 
      ELSE 1 
    END,
    date_key = date_key,
    updated_at = NOW()
  RETURNING current_value INTO counter;

  -- 주문번호 생성 (ORD-YYMMDD-001 형식)
  order_no := 'ORD-' || date_key || '-' || LPAD(counter::TEXT, 3, '0');
  
  RETURN order_no;
END;
$$ LANGUAGE plpgsql;

-- 4. 재고 업데이트 함수
CREATE OR REPLACE FUNCTION update_product_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_movement_type inventory_movement_type,
  p_ref_no TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
BEGIN
  -- 현재 재고 조회
  SELECT on_hand INTO current_stock
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- 새로운 재고 계산
  new_stock := current_stock + p_quantity;

  -- 음수 재고 방지
  IF new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', current_stock, -p_quantity;
  END IF;

  -- 상품 재고 업데이트
  UPDATE products
  SET on_hand = new_stock
  WHERE id = p_product_id;

  -- 재고 이동 기록
  INSERT INTO inventory_movements (
    product_id, movement_type, quantity, 
    balance_before, balance_after, ref_no, note, created_by
  ) VALUES (
    p_product_id, p_movement_type, p_quantity,
    current_stock, new_stock, p_ref_no, p_note, p_user_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. 주문 환불 처리 함수
CREATE OR REPLACE FUNCTION process_order_refund(
  p_order_id UUID,
  p_refund_reason TEXT,
  p_refund_note TEXT DEFAULT NULL,
  p_refund_amount DECIMAL DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  order_record RECORD;
  item_record RECORD;
  refund_amt DECIMAL;
BEGIN
  -- 주문 정보 조회
  SELECT * INTO order_record
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- 환불 금액 설정
  refund_amt := COALESCE(p_refund_amount, order_record.final_amount);

  -- 주문 상태 업데이트
  UPDATE orders
  SET 
    status = 'refunded',
    refund_reason = p_refund_reason,
    refund_note = p_refund_note,
    refund_amount = refund_amt,
    refunded_at = NOW()
  WHERE id = p_order_id;

  -- 재고 복원 (주문 상품들)
  FOR item_record IN 
    SELECT oi.*, p.name as product_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = p_order_id
  LOOP
    PERFORM update_product_stock(
      item_record.product_id,
      item_record.quantity, -- 양수로 복원
      'refund'::inventory_movement_type,
      order_record.order_number,
      '환불에 따른 재고 복원: ' || item_record.product_name
    );
  END LOOP;

  -- 현금장부 환불 기록
  INSERT INTO cashbook_transactions (
    transaction_type, amount, description, ref_order_id, ref_no
  ) VALUES (
    'refund', -refund_amt, 
    '주문 환불: ' || p_refund_reason, 
    p_order_id, order_record.order_number
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. 주문 생성 트리거 함수 (현금장부 자동 기록)
CREATE OR REPLACE FUNCTION handle_order_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 주문 생성 시 현금장부에 수입 기록
  IF TG_OP = 'INSERT' THEN
    INSERT INTO cashbook_transactions (
      transaction_type, amount, description, ref_order_id, ref_no
    ) VALUES (
      'order_payment', NEW.final_amount,
      '주문 결제: ' || NEW.customer_name,
      NEW.id, NEW.order_number
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 주문 결제 트리거 생성
CREATE TRIGGER trigger_order_payment
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_order_payment();

-- 7. 이벤트 로그 기록 함수
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- OLD 데이터 처리
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    old_data := NULL;
    new_data := to_jsonb(NEW);
  END IF;

  -- 이벤트 로그 기록
  INSERT INTO event_logs (
    table_name, record_id, action, old_values, new_values, actor
  ) VALUES (
    TG_TABLE_NAME, 
    COALESCE(NEW.id, OLD.id),
    LOWER(TG_OP),
    old_data,
    new_data,
    COALESCE(current_setting('app.current_user', true), 'system')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 주요 테이블에 이벤트 로그 트리거 추가
CREATE TRIGGER trigger_orders_log
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

CREATE TRIGGER trigger_products_log
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

CREATE TRIGGER trigger_inventory_movements_log
  AFTER INSERT OR UPDATE OR DELETE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();