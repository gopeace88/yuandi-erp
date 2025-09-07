-- 샘플 사용자 프로필 (실제 배포시에는 제거)
INSERT INTO user_profiles (id, email, full_name, role, phone, default_language) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@yuandi.com', '관리자', 'admin', '010-0000-0001', 'ko'),
  ('00000000-0000-0000-0000-000000000002', 'order@yuandi.com', '주문관리자', 'order_manager', '010-0000-0002', 'ko'),
  ('00000000-0000-0000-0000-000000000003', 'ship@yuandi.com', '배송관리자', 'ship_manager', '010-0000-0003', 'ko')
ON CONFLICT (id) DO NOTHING;

-- 시퀀스 초기화
INSERT INTO sequence_counters (sequence_name, date_key, current_value) VALUES
  ('order_number', TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYMMDD'), 0)
ON CONFLICT (sequence_name) DO NOTHING;

-- 샘플 상품 데이터
INSERT INTO products (id, sku, name, category, model, color, brand, cost_cny, sale_price_krw, on_hand, low_stock_threshold, description) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'ELC-IPH-BLK-APP-A1B2C',
    'iPhone 15 Pro',
    'ELECTRONICS',
    'iPhone15Pro',
    'Black',
    'Apple',
    5800.00,
    1450000,
    15,
    5,
    'Apple iPhone 15 Pro 128GB 블랙 - 최신 A17 Pro 칩셋'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'FSH-TIM-BRN-NIK-D3E4F',
    'Nike Air Max 270',
    'FASHION',
    'AirMax270',
    'Brown',
    'Nike',
    380.00,
    165000,
    8,
    3,
    'Nike Air Max 270 운동화 - 편안한 에어 쿠셔닝'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'COS-CRE-PNK-SUL-G5H6I',
    '설화수 윤조에센스',
    'COSMETICS',
    'YunjoEssence',
    'Pink',
    '설화수',
    120.00,
    89000,
    25,
    10,
    '설화수 윤조에센스 60ml - 한방 스킨케어'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'SUP-VIT-YEL-NAT-J7K8L',
    'Vitamin D3 5000IU',
    'SUPPLEMENTS',
    'VitD3',
    'Yellow',
    'Nature Made',
    28.00,
    35000,
    50,
    15,
    'Nature Made Vitamin D3 5000IU 180정 - 면역력 증진'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'TOY-LEG-RED-LEG-M9N0P',
    'LEGO Creator 3-in-1',
    'TOYS',
    'Creator31',
    'Red',
    'LEGO',
    45.00,
    75000,
    12,
    5,
    'LEGO Creator 3-in-1 Deep Sea Creatures - 창의력 발달'
  )
ON CONFLICT (id) DO NOTHING;

-- 샘플 주문 데이터
INSERT INTO orders (
  id, order_number, customer_name, customer_phone, customer_email,
  zip_code, shipping_address, detailed_address, pccc,
  subtotal_amount, shipping_cost, discount_amount, final_amount,
  status, created_at
) VALUES
  (
    'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    'ORD-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYMMDD') || '-001',
    '김철수',
    '01012345678',
    'kimcs@email.com',
    '06292',
    '서울특별시 강남구 강남대로 123',
    '456호',
    'P123456789012',
    1450000,
    3000,
    0,
    1453000,
    'paid',
    NOW() - INTERVAL '2 days'
  ),
  (
    'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
    'ORD-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYMMDD') || '-002',
    '이영희',
    '01087654321',
    'leeyh@email.com',
    '03141',
    '서울특별시 종로구 종로 456',
    '123-1호',
    'P987654321098',
    254000,
    3000,
    5000,
    252000,
    'shipped',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- 샘플 주문 상품 데이터
INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111', 1, 1450000, 1450000),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '22222222-2222-2222-2222-222222222222', 1, 165000, 165000),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '33333333-3333-3333-3333-333333333333', 1, 89000, 89000)
ON CONFLICT (id) DO NOTHING;

-- 배송 정보 업데이트 (두 번째 주문)
UPDATE orders SET 
  tracking_number = '1234567890123',
  courier = 'cj',
  tracking_url = 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvNoText=1234567890123',
  shipped_at = NOW() - INTERVAL '6 hours'
WHERE id = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';

-- 재고 이동 기록 (주문으로 인한 차감)
INSERT INTO inventory_movements (
  product_id, movement_type, quantity, balance_before, balance_after, 
  ref_no, note
) VALUES
  (
    '11111111-1111-1111-1111-111111111111', 
    'sale', 
    -1, 
    16, 
    15,
    'ORD-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYMMDD') || '-001',
    '주문 판매: iPhone 15 Pro'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'sale',
    -1,
    9,
    8,
    'ORD-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYMMDD') || '-002',
    '주문 판매: Nike Air Max 270'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'sale',
    -1,
    26,
    25,
    'ORD-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYMMDD') || '-002',
    '주문 판매: 설화수 윤조에센스'
  )
ON CONFLICT (id) DO NOTHING;