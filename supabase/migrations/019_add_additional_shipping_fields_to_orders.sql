-- Migration: Add additional shipping fields to orders table
-- Description: 주문 테이블에 추가 배송 필드 추가

-- orders 테이블에 추가 배송 필드들 추가
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_city TEXT,
ADD COLUMN IF NOT EXISTS shipping_state TEXT,
ADD COLUMN IF NOT EXISTS shipping_fee_krw NUMERIC(12,2) DEFAULT 0;

-- 컬럼 설명 추가
COMMENT ON COLUMN orders.shipping_city IS '배송 도시';
COMMENT ON COLUMN orders.shipping_state IS '배송 주/도';
COMMENT ON COLUMN orders.shipping_fee_krw IS '배송비 (KRW)';