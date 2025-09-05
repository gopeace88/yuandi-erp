-- YUANDI ERP 시스템 초기 스키마 마이그레이션
-- 버전: v1.0.0
-- 생성일: 2024-01-01

-- =================================
-- 확장 기능 활성화
-- =================================

-- UUID 생성을 위한 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 암호화 함수를 위한 확장
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 전체 텍스트 검색을 위한 확장
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =================================
-- 커스텀 타입 정의
-- =================================

-- 사용자 역할 열거형
CREATE TYPE user_role AS ENUM (
  'admin',
  'order_manager',
  'ship_manager',
  'customer'
);

-- 주문 상태 열거형
CREATE TYPE order_status AS ENUM (
  'paid',
  'shipped',
  'done',
  'refunded',
  'cancelled'
);

-- 배송업체 열거형
CREATE TYPE courier_type AS ENUM (
  'cj',
  'hanjin',
  'logen',
  'cway',
  'kdexp',
  'epost'
);

-- 거래 타입 열거형
CREATE TYPE transaction_type AS ENUM (
  'income',
  'expense',
  'order_payment',
  'refund',
  'shipping_fee',
  'exchange_adjustment',
  'inventory_purchase'
);

-- 이벤트 타입 열거형
CREATE TYPE event_type AS ENUM (
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'export'
);

-- 언어 코드 열거형
CREATE TYPE language_code AS ENUM (
  'ko',
  'zh-CN',
  'en'
);

-- =================================
-- 사용자 관리 테이블
-- =================================

-- 사용자 프로필 테이블
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  phone TEXT,
  language language_code NOT NULL DEFAULT 'ko',
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 사용자 세션 관리
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================================
-- 제품 및 재고 관리 테이블
-- =================================

-- 제품 카테고리 테이블
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 제품 테이블
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  category_id UUID NOT NULL REFERENCES product_categories(id),
  name TEXT NOT NULL,
  model TEXT,
  color TEXT,
  manufacturer TEXT,
  brand TEXT,
  cost_cny DECIMAL(10,2) NOT NULL CHECK (cost_cny >= 0),
  price_krw DECIMAL(10,2) NOT NULL CHECK (price_krw >= 0),
  weight_g INTEGER CHECK (weight_g > 0),
  dimensions_cm TEXT, -- "길이x너비x높이" 형식
  description TEXT,
  notes TEXT,
  image_urls TEXT[], -- 제품 이미지 URL 배열
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 재고 테이블
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  on_hand INTEGER NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  allocated INTEGER NOT NULL DEFAULT 0 CHECK (allocated >= 0),
  available INTEGER GENERATED ALWAYS AS (on_hand - allocated) STORED,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 재고 거래 기록 테이블
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('inbound', 'outbound', 'adjustment')),
  quantity INTEGER NOT NULL CHECK (quantity != 0),
  reference_id UUID, -- 관련 주문 ID 또는 기타 참조
  reference_type TEXT, -- 'order', 'purchase', 'adjustment' 등
  cost_per_unit_cny DECIMAL(10,2),
  total_cost_cny DECIMAL(10,2),
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================================
-- 주문 관리 테이블
-- =================================

-- 주문 테이블
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  
  -- 배송 주소 정보
  shipping_address_line1 TEXT NOT NULL,
  shipping_address_line2 TEXT,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_country TEXT NOT NULL DEFAULT '대한민국',
  
  -- 해외 통관 정보
  pccc TEXT NOT NULL CHECK (LENGTH(pccc) = 12 AND pccc ~ '^P[0-9]{11}$'),
  
  -- 주문 상태 및 금액
  status order_status NOT NULL DEFAULT 'paid',
  subtotal_krw DECIMAL(10,2) NOT NULL CHECK (subtotal_krw >= 0),
  shipping_fee_krw DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (shipping_fee_krw >= 0),
  total_krw DECIMAL(10,2) NOT NULL CHECK (total_krw >= 0),
  
  -- 결제 정보
  payment_method TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  
  -- 배송 정보
  courier courier_type,
  tracking_number TEXT,
  tracking_url TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- 기타 정보
  notes TEXT,
  internal_notes TEXT,
  
  -- 메타데이터
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 주문 상품 테이블
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_krw DECIMAL(10,2) NOT NULL CHECK (unit_price_krw >= 0),
  total_price_krw DECIMAL(10,2) NOT NULL CHECK (total_price_krw >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================================
-- 배송 관리 테이블
-- =================================

-- 배송 테이블
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tracking_number TEXT NOT NULL,
  courier courier_type NOT NULL,
  tracking_url TEXT,
  
  -- 배송 상태
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'shipped', 'in_transit', 'delivered', 'exception')),
  
  -- 배송 일정
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- 배송 정보
  weight_g INTEGER,
  dimensions_cm TEXT,
  package_count INTEGER NOT NULL DEFAULT 1,
  
  -- 배송 비용
  shipping_cost_krw DECIMAL(10,2),
  
  -- 이미지 및 메모
  package_images TEXT[], -- 포장 사진 URL 배열
  delivery_notes TEXT,
  
  -- 메타데이터
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 배송 추적 이벤트 테이블
CREATE TABLE shipment_tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================================
-- 현금출납부 테이블
-- =================================

-- 현금출납부 거래 테이블
CREATE TABLE cashbook_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type transaction_type NOT NULL,
  
  -- 금액 정보
  amount_krw DECIMAL(10,2) NOT NULL CHECK (amount_krw != 0),
  balance_krw DECIMAL(10,2) NOT NULL,
  
  -- 외화 정보 (선택적)
  amount_cny DECIMAL(10,2),
  exchange_rate DECIMAL(8,4),
  
  -- 거래 상세
  description TEXT NOT NULL,
  reference_id UUID, -- 관련 주문/재고 거래 등 참조
  reference_type TEXT, -- 'order', 'inventory', 'manual' 등
  
  -- 카테고리 및 태그
  category TEXT,
  tags TEXT[],
  
  -- 첨부 파일
  receipt_urls TEXT[], -- 영수증 이미지 URL 배열
  
  -- 메타데이터
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================================
-- 시스템 설정 테이블
-- =================================

-- 시스템 설정 테이블
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false, -- 클라이언트에서 접근 가능 여부
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 환율 정보 테이블
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_currency TEXT NOT NULL DEFAULT 'CNY',
  target_currency TEXT NOT NULL DEFAULT 'KRW',
  rate DECIMAL(10,4) NOT NULL CHECK (rate > 0),
  source TEXT NOT NULL, -- API 소스 명
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(base_currency, target_currency, effective_date)
);

-- =================================
-- 감사 및 로그 테이블
-- =================================

-- 이벤트 로그 테이블
CREATE TABLE event_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type event_type NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  actor_id UUID REFERENCES user_profiles(id),
  
  -- 변경 내용
  old_values JSONB,
  new_values JSONB,
  changes JSONB, -- 변경된 필드만 저장
  
  -- 요청 정보
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  
  -- 메타데이터
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 시스템 건강 상태 로그
CREATE TABLE system_health_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  check_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
  response_time_ms INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================================
-- 인덱스 생성
-- =================================

-- 성능 최적화를 위한 인덱스들

-- 사용자 관련 인덱스
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 제품 관련 인덱스
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON product_categories(id);
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_available ON inventory(available);

-- 주문 관련 인덱스
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_customer_name_trgm ON orders USING gin (customer_name gin_trgm_ops);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- 배송 관련 인덱스
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipment_tracking_events_shipment_id ON shipment_tracking_events(shipment_id);

-- 현금출납부 인덱스
CREATE INDEX idx_cashbook_transactions_date ON cashbook_transactions(transaction_date DESC);
CREATE INDEX idx_cashbook_transactions_type ON cashbook_transactions(type);
CREATE INDEX idx_cashbook_transactions_reference ON cashbook_transactions(reference_type, reference_id);

-- 시스템 로그 인덱스
CREATE INDEX idx_event_logs_table_record ON event_logs(table_name, record_id);
CREATE INDEX idx_event_logs_actor_id ON event_logs(actor_id);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at DESC);
CREATE INDEX idx_system_health_logs_service_time ON system_health_logs(service_name, check_time DESC);

-- 복합 인덱스
CREATE INDEX idx_orders_status_created_at ON orders(status, created_at DESC);
CREATE INDEX idx_products_category_active ON products(category_id, is_active);
CREATE INDEX idx_inventory_transactions_product_created ON inventory_transactions(product_id, created_at DESC);

-- =================================
-- 함수 정의
-- =================================

-- SKU 생성 함수
CREATE OR REPLACE FUNCTION generate_sku(
  p_category_name TEXT,
  p_model TEXT,
  p_color TEXT,
  p_brand TEXT
)
RETURNS TEXT AS $$
DECLARE
  category_code TEXT;
  model_code TEXT;
  color_code TEXT;
  brand_code TEXT;
  hash_suffix TEXT;
  final_sku TEXT;
BEGIN
  -- 카테고리 코드 생성 (첫 3글자, 대문자)
  category_code := UPPER(LEFT(REGEXP_REPLACE(p_category_name, '[^a-zA-Z0-9가-힣]', '', 'g'), 3));
  
  -- 모델 코드 생성 (첫 4글자, 대문자)
  model_code := UPPER(LEFT(REGEXP_REPLACE(COALESCE(p_model, ''), '[^a-zA-Z0-9가-힣]', '', 'g'), 4));
  
  -- 색상 코드 생성 (첫 2글자, 대문자)
  color_code := UPPER(LEFT(REGEXP_REPLACE(COALESCE(p_color, ''), '[^a-zA-Z0-9가-힣]', '', 'g'), 2));
  
  -- 브랜드 코드 생성 (첫 3글자, 대문자)
  brand_code := UPPER(LEFT(REGEXP_REPLACE(COALESCE(p_brand, ''), '[^a-zA-Z0-9가-힣]', '', 'g'), 3));
  
  -- 해시 생성 (5자리)
  hash_suffix := UPPER(LEFT(MD5(p_category_name || p_model || p_color || p_brand || EXTRACT(EPOCH FROM NOW())::TEXT), 5));
  
  -- 최종 SKU 조합
  final_sku := category_code || '-' || model_code || '-' || color_code || '-' || brand_code || '-' || hash_suffix;
  
  RETURN final_sku;
END;
$$ LANGUAGE plpgsql;

-- 주문 번호 생성 함수
CREATE OR REPLACE FUNCTION generate_order_number(order_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  sequence_num INTEGER;
  order_num TEXT;
BEGIN
  -- 날짜 부분 생성 (YYMMDD)
  date_part := TO_CHAR(order_date, 'YYMMDD');
  
  -- 해당 날짜의 주문 개수 조회 및 증가
  SELECT COUNT(*) + 1
  INTO sequence_num
  FROM orders
  WHERE DATE(created_at AT TIME ZONE 'Asia/Seoul') = order_date;
  
  -- 주문 번호 생성 (ORD-YYMMDD-###)
  order_num := 'ORD-' || date_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- 재고 확인 함수
CREATE OR REPLACE FUNCTION check_stock_availability(p_product_id UUID, p_quantity INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  available_stock INTEGER;
BEGIN
  SELECT available
  INTO available_stock
  FROM inventory
  WHERE product_id = p_product_id;
  
  RETURN COALESCE(available_stock, 0) >= p_quantity;
END;
$$ LANGUAGE plpgsql;

-- 재고 할당 함수
CREATE OR REPLACE FUNCTION allocate_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_available INTEGER;
BEGIN
  -- 현재 가용 재고 확인
  SELECT available
  INTO current_available
  FROM inventory
  WHERE product_id = p_product_id
  FOR UPDATE;
  
  -- 재고 부족 시 실패
  IF COALESCE(current_available, 0) < p_quantity THEN
    RETURN FALSE;
  END IF;
  
  -- 할당 수량 증가
  UPDATE inventory
  SET allocated = allocated + p_quantity,
      updated_at = NOW()
  WHERE product_id = p_product_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 재고 할당 해제 함수
CREATE OR REPLACE FUNCTION deallocate_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE inventory
  SET allocated = GREATEST(0, allocated - p_quantity),
      updated_at = NOW()
  WHERE product_id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- 재고 차감 함수 (출고 시)
CREATE OR REPLACE FUNCTION consume_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_allocated INTEGER;
BEGIN
  -- 현재 할당된 재고 확인
  SELECT allocated
  INTO current_allocated
  FROM inventory
  WHERE product_id = p_product_id
  FOR UPDATE;
  
  -- 할당된 재고 부족 시 실패
  IF COALESCE(current_allocated, 0) < p_quantity THEN
    RETURN FALSE;
  END IF;
  
  -- 재고 및 할당량 차감
  UPDATE inventory
  SET on_hand = on_hand - p_quantity,
      allocated = allocated - p_quantity,
      last_outbound_at = NOW(),
      updated_at = NOW()
  WHERE product_id = p_product_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 현금출납부 잔액 계산 함수
CREATE OR REPLACE FUNCTION calculate_cashbook_balance(p_transaction_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  current_balance DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(amount_krw), 0)
  INTO current_balance
  FROM cashbook_transactions
  WHERE transaction_date <= p_transaction_date;
  
  RETURN current_balance;
END;
$$ LANGUAGE plpgsql;

-- 대시보드 통계 함수
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  total_orders INTEGER;
  total_revenue DECIMAL(10,2);
  pending_orders INTEGER;
  low_stock_count INTEGER;
BEGIN
  -- 주문 통계
  SELECT COUNT(*), COALESCE(SUM(total_krw), 0)
  INTO total_orders, total_revenue
  FROM orders
  WHERE DATE(created_at AT TIME ZONE 'Asia/Seoul') BETWEEN p_start_date AND p_end_date;
  
  -- 대기 중인 주문
  SELECT COUNT(*)
  INTO pending_orders
  FROM orders
  WHERE status IN ('paid', 'shipped');
  
  -- 재고 부족 상품
  SELECT COUNT(*)
  INTO low_stock_count
  FROM inventory i
  JOIN products p ON i.product_id = p.id
  WHERE i.available <= p.low_stock_threshold AND p.is_active = true;
  
  -- 결과 JSON 생성
  result := jsonb_build_object(
    'total_orders', total_orders,
    'total_revenue', total_revenue,
    'pending_orders', pending_orders,
    'low_stock_count', low_stock_count,
    'period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =================================
-- 트리거 함수 정의
-- =================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 이벤트 로그 생성 함수
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
DECLARE
  actor_id UUID;
  old_data JSONB;
  new_data JSONB;
  changes_data JSONB;
BEGIN
  -- 현재 사용자 ID 가져오기 (세션 설정에서)
  actor_id := COALESCE(current_setting('app.current_user_id', TRUE)::UUID, NULL);
  
  -- 이벤트 타입에 따른 처리
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    new_data := NULL;
    changes_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    -- 변경된 필드만 추출
    changes_data := (
      SELECT jsonb_object_agg(key, value)
      FROM jsonb_each(new_data)
      WHERE new_data->>key IS DISTINCT FROM old_data->>key
    );
  ELSE -- INSERT
    old_data := NULL;
    new_data := to_jsonb(NEW);
    changes_data := NULL;
  END IF;
  
  -- 로그 삽입
  INSERT INTO event_logs (
    event_type,
    table_name,
    record_id,
    actor_id,
    old_values,
    new_values,
    changes,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    CASE TG_OP
      WHEN 'DELETE' THEN 'delete'::event_type
      WHEN 'UPDATE' THEN 'update'::event_type
      ELSE 'create'::event_type
    END,
    TG_TABLE_NAME,
    CASE TG_OP
      WHEN 'DELETE' THEN (OLD.id)::UUID
      ELSE (NEW.id)::UUID
    END,
    actor_id,
    old_data,
    new_data,
    changes_data,
    COALESCE(current_setting('app.client_ip', TRUE)::INET, NULL),
    current_setting('app.user_agent', TRUE),
    NOW()
  );
  
  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- 재고 거래 기록 생성 함수
CREATE OR REPLACE FUNCTION create_inventory_transaction()
RETURNS TRIGGER AS $$
DECLARE
  quantity_change INTEGER;
  transaction_type_val TEXT;
BEGIN
  -- 변경량 계산
  IF TG_OP = 'INSERT' THEN
    IF NEW.on_hand > 0 THEN
      quantity_change := NEW.on_hand;
      transaction_type_val := 'inbound';
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.on_hand != NEW.on_hand THEN
    quantity_change := NEW.on_hand - OLD.on_hand;
    transaction_type_val := CASE
      WHEN quantity_change > 0 THEN 'inbound'
      WHEN quantity_change < 0 THEN 'outbound'
      ELSE 'adjustment'
    END;
  END IF;
  
  -- 거래 기록 생성 (변경이 있을 때만)
  IF quantity_change IS NOT NULL AND quantity_change != 0 THEN
    INSERT INTO inventory_transactions (
      product_id,
      transaction_type,
      quantity,
      created_by,
      created_at
    ) VALUES (
      NEW.product_id,
      transaction_type_val,
      quantity_change,
      COALESCE(current_setting('app.current_user_id', TRUE)::UUID, NULL),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 현금출납부 잔액 업데이트 함수
CREATE OR REPLACE FUNCTION update_cashbook_balance()
RETURNS TRIGGER AS $$
DECLARE
  new_balance DECIMAL(10,2);
BEGIN
  -- 새로운 잔액 계산
  new_balance := calculate_cashbook_balance(NEW.transaction_date);
  
  -- 새 거래의 잔액 업데이트
  NEW.balance_krw := new_balance;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 주문 상태 변경 시 재고 처리 함수
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  order_item RECORD;
BEGIN
  -- 주문 상태가 변경되었을 때만 처리
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    
    -- PAID -> SHIPPED: 재고 실제 차감
    IF OLD.status = 'paid' AND NEW.status = 'shipped' THEN
      FOR order_item IN
        SELECT product_id, quantity
        FROM order_items
        WHERE order_id = NEW.id
      LOOP
        PERFORM consume_stock(order_item.product_id, order_item.quantity);
      END LOOP;
      
    -- SHIPPED -> CANCELLED/REFUNDED: 할당 해제
    ELSIF OLD.status = 'shipped' AND NEW.status IN ('cancelled', 'refunded') THEN
      FOR order_item IN
        SELECT product_id, quantity
        FROM order_items
        WHERE order_id = NEW.id
      LOOP
        PERFORM deallocate_stock(order_item.product_id, order_item.quantity);
      END LOOP;
      
    -- PAID -> CANCELLED/REFUNDED: 할당 해제
    ELSIF OLD.status = 'paid' AND NEW.status IN ('cancelled', 'refunded') THEN
      FOR order_item IN
        SELECT product_id, quantity
        FROM order_items
        WHERE order_id = NEW.id
      LOOP
        PERFORM deallocate_stock(order_item.product_id, order_item.quantity);
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =================================
-- 트리거 생성
-- =================================

-- updated_at 자동 업데이트 트리거들
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_cashbook_transactions_updated_at
  BEFORE UPDATE ON cashbook_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 이벤트 로깅 트리거들
CREATE TRIGGER trigger_user_profiles_log
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER trigger_products_log
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER trigger_orders_log
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER trigger_inventory_log
  AFTER INSERT OR UPDATE OR DELETE ON inventory
  FOR EACH ROW EXECUTE FUNCTION log_changes();

-- 재고 거래 생성 트리거
CREATE TRIGGER trigger_inventory_transaction_log
  AFTER INSERT OR UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION create_inventory_transaction();

-- 현금출납부 잔액 업데이트 트리거
CREATE TRIGGER trigger_cashbook_balance_update
  BEFORE INSERT ON cashbook_transactions
  FOR EACH ROW EXECUTE FUNCTION update_cashbook_balance();

-- 주문 상태 변경 트리거
CREATE TRIGGER trigger_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_order_status_change();

-- =================================
-- Row Level Security (RLS) 정책
-- =================================

-- RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 접근 정책
CREATE POLICY "Admin full access" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

CREATE POLICY "Admin full access" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'order_manager')
    )
  );

CREATE POLICY "Admin full access" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'order_manager')
    )
  );

-- 고객 주문 조회 정책 (고객 포털용)
CREATE POLICY "Customer order access" ON orders
  FOR SELECT USING (
    -- 인증된 사용자의 경우
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'customer'
    )) OR
    -- 공개 접근의 경우 (이름 + 전화번호로 인증)
    (auth.uid() IS NULL)
  );

-- 배송 관리자 정책
CREATE POLICY "Ship manager access" ON shipments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'order_manager', 'ship_manager')
    )
  );

-- 현금출납부 조회 정책
CREATE POLICY "Cashbook read access" ON cashbook_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'order_manager', 'ship_manager')
    )
  );

-- 현금출납부 수정 정책 (관리자와 주문 관리자만)
CREATE POLICY "Cashbook write access" ON cashbook_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'order_manager')
    )
  );

-- 시스템 설정 정책
CREATE POLICY "System settings admin only" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- 공개 시스템 설정 조회 정책
CREATE POLICY "Public system settings" ON system_settings
  FOR SELECT USING (is_public = true);

-- 이벤트 로그 조회 정책 (관리자만)
CREATE POLICY "Event logs admin only" ON event_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- =================================
-- 초기 데이터 삽입
-- =================================

-- 기본 제품 카테고리
INSERT INTO product_categories (name, description) VALUES
  ('전자제품', '스마트폰, 태블릿, 액세서리 등'),
  ('패션', '의류, 신발, 가방 등'),
  ('뷰티', '화장품, 스킨케어, 헤어케어 등'),
  ('생활용품', '주방용품, 욕실용품, 청소용품 등'),
  ('식품', '건강식품, 차, 과자 등');

-- 기본 시스템 설정
INSERT INTO system_settings (key, value, description, is_public) VALUES
  ('company_name', '"YUANDI Collection"', '회사명', true),
  ('business_hours', '{"monday": "09:00-18:00", "tuesday": "09:00-18:00", "wednesday": "09:00-18:00", "thursday": "09:00-18:00", "friday": "09:00-18:00", "saturday": "10:00-15:00", "sunday": "closed"}', '영업시간', true),
  ('default_language', '"ko"', '기본 언어', true),
  ('default_timezone', '"Asia/Seoul"', '기본 타임존', false),
  ('default_currency', '"KRW"', '기본 통화', true),
  ('default_exchange_rate_cny_krw', '185.0', '기본 환율 (CNY->KRW)', false),
  ('free_shipping_threshold', '50000', '무료배송 기준금액 (KRW)', true),
  ('default_shipping_fee', '3000', '기본 배송비 (KRW)', true),
  ('low_stock_threshold', '5', '재고 부족 기준', false),
  ('order_cancel_window_hours', '24', '주문 취소 가능 시간', true),
  ('supported_languages', '["ko", "zh-CN", "en"]', '지원 언어 목록', true),
  ('contact_info', '{"phone": "+82-10-0000-0000", "email": "info@yuandi.com", "address": "서울시 강남구"}', '연락처 정보', true),
  ('terms_of_service_url', '"/terms"', '이용약관 URL', true),
  ('privacy_policy_url', '"/privacy"', '개인정보처리방침 URL', true);

-- 기본 환율 정보
INSERT INTO exchange_rates (base_currency, target_currency, rate, source) VALUES
  ('CNY', 'KRW', 185.0, 'manual');

-- 기본 관리자 계정 설정 (실제 사용 시 변경 필요)
-- 이 부분은 Supabase Auth를 통해 생성된 사용자 ID로 변경해야 함
/*
INSERT INTO user_profiles (id, email, name, role, language) VALUES
  ('00000000-0000-0000-0000-000000000000'::UUID, 'admin@yuandi.com', '관리자', 'admin', 'ko');
*/

-- =================================
-- 함수 권한 설정
-- =================================

-- 인증된 사용자에게 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION generate_sku TO authenticated;
GRANT EXECUTE ON FUNCTION generate_order_number TO authenticated;
GRANT EXECUTE ON FUNCTION check_stock_availability TO authenticated;
GRANT EXECUTE ON FUNCTION allocate_stock TO authenticated;
GRANT EXECUTE ON FUNCTION deallocate_stock TO authenticated;
GRANT EXECUTE ON FUNCTION consume_stock TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_cashbook_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;

-- 익명 사용자에게 필요한 함수만 권한 부여 (고객 포털용)
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO anon;

-- =================================
-- 마이그레이션 완료
-- =================================

-- 마이그레이션 기록
INSERT INTO system_settings (key, value, description, is_public) VALUES
  ('db_schema_version', '"1.0.0"', '데이터베이스 스키마 버전', false),
  ('last_migration_date', TO_JSON(NOW()::TEXT), '마지막 마이그레이션 날짜', false),
  ('migration_status', '"completed"', '마이그레이션 상태', false);

COMMIT;

-- 마이그레이션 성공 메시지
DO $$ BEGIN
  RAISE NOTICE '=== YUANDI ERP 데이터베이스 스키마 마이그레이션 완료 ===';
  RAISE NOTICE '버전: 1.0.0';
  RAISE NOTICE '완료 시간: %', NOW();
  RAISE NOTICE '테이블 수: %', (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  );
  RAISE NOTICE '함수 수: %', (
    SELECT COUNT(*) 
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
  );
  RAISE NOTICE '트리거 수: %', (
    SELECT COUNT(*) 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
  );
END $$;