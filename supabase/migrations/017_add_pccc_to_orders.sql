-- Migration: Add pccc column to orders table
-- Description: 주문 테이블에 해외통관부호(PCCC) 컬럼 추가

-- orders 테이블에 pccc 컬럼 추가
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS pccc TEXT;

-- 컬럼 설명 추가
COMMENT ON COLUMN orders.pccc IS '해외통관부호 (Personal Customs Clearance Code)';