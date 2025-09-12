-- Migration: Add paid_at column to orders table
-- Description: 주문 테이블에 결제 일시 컬럼 추가

-- orders 테이블에 paid_at 컬럼 추가
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 컬럼 설명 추가
COMMENT ON COLUMN orders.paid_at IS '결제 일시';