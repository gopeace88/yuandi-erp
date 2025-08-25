-- 데이터베이스 구조 수정
-- 1. products 테이블에 이미지 URL 추가
-- 2. shipments 테이블에 중국 택배 정보 추가

-- Products 테이블에 이미지 URL 컬럼 추가
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

COMMENT ON COLUMN products.image_url IS '상품 이미지 URL';

-- Shipments 테이블에 중국 택배 정보 추가 (이미 002에서 추가했지만 확실히)
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS courier_cn VARCHAR(50),
ADD COLUMN IF NOT EXISTS tracking_no_cn VARCHAR(100),
ADD COLUMN IF NOT EXISTS tracking_url_cn VARCHAR(500);

COMMENT ON COLUMN shipments.courier_cn IS '중국 택배사명';
COMMENT ON COLUMN shipments.tracking_no_cn IS '중국 택배 운송장 번호';
COMMENT ON COLUMN shipments.tracking_url_cn IS '중국 택배 추적 URL';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_products_image ON products(id) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_cn ON shipments(tracking_no_cn) WHERE tracking_no_cn IS NOT NULL;

-- Orders 테이블에 잘못 추가된 컬럼들은 일단 유지 (호환성)
-- 나중에 모든 코드 수정 후 제거 예정
-- ALTER TABLE orders DROP COLUMN IF EXISTS tracking_number;
-- ALTER TABLE orders DROP COLUMN IF EXISTS courier;
-- ALTER TABLE orders DROP COLUMN IF EXISTS tracking_url;
-- ALTER TABLE orders DROP COLUMN IF EXISTS tracking_number_cn;
-- ALTER TABLE orders DROP COLUMN IF EXISTS courier_cn;
-- ALTER TABLE orders DROP COLUMN IF EXISTS tracking_url_cn;
-- ALTER TABLE orders DROP COLUMN IF EXISTS shipment_photo_url;