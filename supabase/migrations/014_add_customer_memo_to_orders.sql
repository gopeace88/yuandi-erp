-- Migration: Add customer_memo column to orders table
-- Description: 주문 테이블에 고객 메모 컬럼 추가

-- orders 테이블에 customer_memo 컬럼 추가
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_memo TEXT;

-- 컬럼 설명 추가
COMMENT ON COLUMN orders.customer_memo IS '고객 메모/요청사항';