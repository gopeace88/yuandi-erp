-- Migration 009: 금액 필드 크기 확대
-- balance_krw: 100억원까지 (10,000,000,000)
-- 상품 가격: 1000만원까지 (10,000,000)

-- 1. cashbook_transactions 테이블의 금액 필드 확대
-- NUMERIC(12,2): 최대 9,999,999,999.99 (약 100억원)
ALTER TABLE cashbook_transactions 
  ALTER COLUMN amount_krw TYPE NUMERIC(12,2),
  ALTER COLUMN balance_krw TYPE NUMERIC(12,2),
  ALTER COLUMN amount_cny TYPE NUMERIC(12,2);

-- 2. products 테이블의 가격 필드 확대
-- NUMERIC(10,2): 최대 99,999,999.99 (약 1억원, 충분함)
ALTER TABLE products
  ALTER COLUMN cost_cny TYPE NUMERIC(10,2),
  ALTER COLUMN price_krw TYPE NUMERIC(10,2);

-- 3. orders 테이블의 금액 필드 확대
ALTER TABLE orders
  ALTER COLUMN subtotal_krw TYPE NUMERIC(12,2),
  ALTER COLUMN shipping_fee_krw TYPE NUMERIC(10,2),
  ALTER COLUMN total_krw TYPE NUMERIC(12,2);

-- 4. order_items 테이블의 금액 필드 확대
ALTER TABLE order_items
  ALTER COLUMN unit_price_krw TYPE NUMERIC(10,2),
  ALTER COLUMN total_price_krw TYPE NUMERIC(12,2);

-- 5. inventory_transactions 테이블의 비용 필드 확대
ALTER TABLE inventory_transactions
  ALTER COLUMN cost_per_unit_cny TYPE NUMERIC(10,2),
  ALTER COLUMN total_cost_cny TYPE NUMERIC(12,2);

-- 6. shipments 테이블의 배송비 필드 확대
ALTER TABLE shipments
  ALTER COLUMN shipping_cost_krw TYPE NUMERIC(10,2);

-- 확인 쿼리
DO $$
BEGIN
  RAISE NOTICE '✅ cashbook_transactions 금액 필드 확대 완료: 최대 100억원';
  RAISE NOTICE '✅ products 가격 필드 확대 완료: 최대 1천만원/1억원';
  RAISE NOTICE '✅ orders 금액 필드 확대 완료';
  RAISE NOTICE '✅ order_items 금액 필드 확대 완료';
  RAISE NOTICE '✅ inventory_transactions 비용 필드 확대 완료';
  RAISE NOTICE '✅ shipments 배송비 필드 확대 완료';
END $$;