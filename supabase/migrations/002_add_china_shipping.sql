-- 중국 택배사 관련 필드 및 송장 사진 필드 추가
-- orders 테이블에 중국 택배 정보 및 송장 사진 추가

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tracking_number_cn VARCHAR(100),
ADD COLUMN IF NOT EXISTS courier_cn VARCHAR(50),
ADD COLUMN IF NOT EXISTS tracking_url_cn VARCHAR(500),
ADD COLUMN IF NOT EXISTS shipment_photo_url VARCHAR(500);

-- shipments 테이블에도 중국 택배 정보 추가 (별도 배송 정보 관리시)
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS tracking_no_cn VARCHAR(100),
ADD COLUMN IF NOT EXISTS courier_cn VARCHAR(50),
ADD COLUMN IF NOT EXISTS tracking_url_cn VARCHAR(500);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_orders_tracking_cn ON orders(tracking_number_cn) WHERE tracking_number_cn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_cn ON shipments(tracking_no_cn) WHERE tracking_no_cn IS NOT NULL;

-- 코멘트 추가
COMMENT ON COLUMN orders.tracking_number_cn IS '중국 택배 운송장 번호';
COMMENT ON COLUMN orders.courier_cn IS '중국 택배사명';
COMMENT ON COLUMN orders.tracking_url_cn IS '중국 택배 추적 URL';

COMMENT ON COLUMN shipments.tracking_no_cn IS '중국 택배 운송장 번호';
COMMENT ON COLUMN shipments.courier_cn IS '중국 택배사명';
COMMENT ON COLUMN shipments.tracking_url_cn IS '중국 택배 추적 URL';