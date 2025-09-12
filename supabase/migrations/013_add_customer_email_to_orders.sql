-- Migration: Add customer_email column to orders table
-- Description: 주문 테이블에 고객 이메일 컬럼 추가

-- orders 테이블에 customer_email 컬럼 추가
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- 컬럼 설명 추가
COMMENT ON COLUMN orders.customer_email IS '고객 이메일 주소';