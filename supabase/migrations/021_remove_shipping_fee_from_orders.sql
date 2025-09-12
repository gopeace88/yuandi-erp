-- Migration: Remove shipping_fee_krw from orders table
-- Description: 주문 테이블에서 사용하지 않는 배송비 필드 제거

-- orders 테이블에서 shipping_fee_krw 필드 제거
ALTER TABLE orders 
DROP COLUMN IF EXISTS shipping_fee_krw;