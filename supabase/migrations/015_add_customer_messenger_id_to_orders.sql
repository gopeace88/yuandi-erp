-- Migration: Add customer_messenger_id column to orders table
-- Description: 주문 테이블에 고객 메신저 ID (카카오톡 등) 컬럼 추가

-- orders 테이블에 customer_messenger_id 컬럼 추가
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_messenger_id TEXT;

-- 컬럼 설명 추가
COMMENT ON COLUMN orders.customer_messenger_id IS '고객 메신저 ID (카카오톡 등)';