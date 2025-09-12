-- Migration: Remove international shipping fields from orders table
-- Description: 국제 배송 미지원으로 불필요한 필드 제거

-- orders 테이블에서 국제 배송 관련 필드들 제거
ALTER TABLE orders 
DROP COLUMN IF EXISTS shipping_city,
DROP COLUMN IF EXISTS shipping_state;