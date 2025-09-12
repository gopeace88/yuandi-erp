-- Migration: Add shipping address fields to orders table
-- Description: 주문 테이블에 배송 주소 상세 필드 추가

-- orders 테이블에 배송 주소 필드들 추가
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS shipping_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT;

-- 컬럼 설명 추가
COMMENT ON COLUMN orders.shipping_address_line1 IS '배송 주소 (기본 주소)';
COMMENT ON COLUMN orders.shipping_address_line2 IS '배송 주소 (상세 주소)';
COMMENT ON COLUMN orders.shipping_postal_code IS '우편번호';