-- 사용자 역할 enum
CREATE TYPE user_role AS ENUM ('admin', 'order_manager', 'ship_manager', 'customer');

-- 주문 상태 enum
CREATE TYPE order_status AS ENUM ('paid', 'shipped', 'delivered', 'refunded');

-- 상품 카테고리 enum
CREATE TYPE product_category AS ENUM (
  'ELECTRONICS', 'FASHION', 'COSMETICS', 'SUPPLEMENTS', 
  'TOYS', 'BOOKS', 'SPORTS', 'HOME', 'FOOD', 'OTHER'
);

-- 재고 이동 타입 enum
CREATE TYPE inventory_movement_type AS ENUM ('inbound', 'sale', 'adjustment', 'disposal', 'refund');

-- 현금장부 거래 타입 enum
CREATE TYPE cashbook_transaction_type AS ENUM (
  'order_payment', 'purchase_payment', 'shipping_cost', 
  'refund', 'adjustment', 'other'
);

-- 1. 사용자 프로필 테이블
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  phone TEXT,
  default_language TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 상품 테이블
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category product_category NOT NULL,
  model TEXT,
  color TEXT,
  brand TEXT,
  cost_cny DECIMAL(10,2) NOT NULL,
  sale_price_krw DECIMAL(10,2),
  on_hand INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  barcode TEXT,
  description TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 주문 테이블
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  zip_code TEXT,
  shipping_address TEXT NOT NULL,
  detailed_address TEXT,
  pccc TEXT, -- 통관고유번호
  
  subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  status order_status NOT NULL DEFAULT 'paid',
  
  -- 배송 관련
  tracking_number TEXT,
  courier TEXT,
  tracking_url TEXT,
  shipment_note TEXT,
  shipment_photo_url TEXT,
  
  -- 완료/환불 관련
  completion_note TEXT,
  refund_reason TEXT,
  refund_note TEXT,
  refund_amount DECIMAL(10,2),
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 주문 상품 테이블
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 재고 이동 테이블
CREATE TABLE inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type inventory_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  ref_no TEXT, -- 참조번호 (주문번호, 입고번호 등)
  note TEXT,
  movement_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 6. 현금장부 테이블
CREATE TABLE cashbook_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_type cashbook_transaction_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  ref_order_id UUID REFERENCES orders(id),
  ref_no TEXT,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 이벤트 로그 테이블
CREATE TABLE event_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  actor TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 시퀀스 카운터 테이블 (주문번호 생성용)
CREATE TABLE sequence_counters (
  sequence_name TEXT PRIMARY KEY,
  date_key TEXT NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_low_stock ON products(on_hand, low_stock_threshold);

CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_customer ON orders(customer_name, customer_phone);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

CREATE INDEX idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(movement_date);

CREATE INDEX idx_cashbook_date ON cashbook_transactions(transaction_date);
CREATE INDEX idx_cashbook_order ON cashbook_transactions(ref_order_id);

CREATE INDEX idx_event_logs_table_record ON event_logs(table_name, record_id);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at);

-- 트리거 함수들은 다음 마이그레이션에서 생성