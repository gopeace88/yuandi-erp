-- Migration 011: 기존 테이블에 이중 통화 필드 추가
-- 목적: 모든 금액 관련 테이블에 KRW/CNY 양방향 지원

-- 1. products 테이블: 원가와 판매가 양방향 지원
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS cost_krw DECIMAL(12,2),  -- CNY 원가의 KRW 환산값
    ADD COLUMN IF NOT EXISTS price_cny DECIMAL(10,2);  -- KRW 판매가의 CNY 환산값

-- 2. orders 테이블: CNY 필드 추가
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS subtotal_cny DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS shipping_fee_cny DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS total_cny DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4),  -- 주문 시점 환율 저장
    ADD COLUMN IF NOT EXISTS currency_preference VARCHAR(3) DEFAULT 'KRW';

-- 3. order_items 테이블: CNY 필드 추가
ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS unit_price_cny DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS total_price_cny DECIMAL(10,2);

-- 4. inventory_transactions 테이블: KRW 필드 추가
ALTER TABLE inventory_transactions
    ADD COLUMN IF NOT EXISTS cost_per_unit_krw DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS total_cost_krw DECIMAL(12,2);

-- 5. shipments 테이블: CNY 필드 추가
ALTER TABLE shipments
    ADD COLUMN IF NOT EXISTS shipping_cost_cny DECIMAL(10,2);

-- 6. cashbook_transactions 테이블: 이중 통화 지원
ALTER TABLE cashbook_transactions
    ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4) DEFAULT 180.0,
    ADD COLUMN IF NOT EXISTS original_currency VARCHAR(3) DEFAULT 'KRW';

-- 7. 자동 환산 트리거 함수: products
CREATE OR REPLACE FUNCTION update_product_currency()
RETURNS TRIGGER AS $$
DECLARE
    v_rate DECIMAL(10,4);
BEGIN
    -- 현재 환율 가져오기
    v_rate := get_today_exchange_rate();
    
    -- cost_cny가 변경되면 cost_krw 자동 계산
    IF NEW.cost_cny IS NOT NULL THEN
        NEW.cost_krw := NEW.cost_cny * v_rate;
    END IF;
    
    -- price_krw가 변경되면 price_cny 자동 계산
    IF NEW.price_krw IS NOT NULL THEN
        NEW.price_cny := NEW.price_krw / v_rate;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_product_currency ON products;
CREATE TRIGGER trigger_update_product_currency
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_currency();

-- 9. 기존 데이터 환산 (products)
UPDATE products
SET 
    cost_krw = cost_cny * get_today_exchange_rate(),
    price_cny = price_krw / get_today_exchange_rate()
WHERE cost_krw IS NULL OR price_cny IS NULL;

-- 10. 기존 데이터 환산 (orders)
UPDATE orders o
SET 
    exchange_rate = get_today_exchange_rate(),
    subtotal_cny = subtotal_krw / get_today_exchange_rate(),
    shipping_fee_cny = shipping_fee_krw / get_today_exchange_rate(),
    total_cny = total_krw / get_today_exchange_rate()
WHERE exchange_rate IS NULL;

-- 11. 기존 데이터 환산 (order_items)
UPDATE order_items oi
SET 
    unit_price_cny = unit_price_krw / get_today_exchange_rate(),
    total_price_cny = total_price_krw / get_today_exchange_rate()
WHERE unit_price_cny IS NULL;

-- 12. 기존 데이터 환산 (inventory_transactions)
UPDATE inventory_transactions
SET 
    cost_per_unit_krw = cost_per_unit_cny * get_today_exchange_rate(),
    total_cost_krw = total_cost_cny * get_today_exchange_rate()
WHERE cost_per_unit_krw IS NULL;

-- 13. 기존 데이터 환산 (shipments)
UPDATE shipments
SET 
    shipping_cost_cny = shipping_cost_krw / get_today_exchange_rate()
WHERE shipping_cost_cny IS NULL;

-- 확인 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ 이중 통화 필드 추가 완료';
    RAISE NOTICE '✅ 자동 환산 트리거 생성 완료';
    RAISE NOTICE '✅ 기존 데이터 환산 완료';
END $$;