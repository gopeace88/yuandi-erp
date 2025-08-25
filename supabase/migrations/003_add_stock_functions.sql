-- 재고 증가 함수 (환불/취소시 사용)
CREATE OR REPLACE FUNCTION increment_product_stock(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE products
    SET on_hand = on_hand + p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- 재고 감소 함수 (주문시 사용)
CREATE OR REPLACE FUNCTION decrement_product_stock(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    -- 현재 재고 확인
    SELECT on_hand INTO v_current_stock
    FROM products
    WHERE id = p_product_id
    FOR UPDATE;
    
    -- 재고 부족 체크
    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current_stock, p_quantity;
    END IF;
    
    -- 재고 차감
    UPDATE products
    SET on_hand = on_hand - p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- 권한 부여
GRANT EXECUTE ON FUNCTION increment_product_stock TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_product_stock TO authenticated;