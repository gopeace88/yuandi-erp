-- shipments 테이블에 누락된 컬럼 추가
-- tracking_barcode와 receipt_photo_url 컬럼 추가

-- tracking_barcode 컬럼 추가 (바코드 번호)
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS tracking_barcode VARCHAR(100);

-- receipt_photo_url 컬럼 추가 (영수증 사진)
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS receipt_photo_url VARCHAR(500);

-- 컬럼 설명 추가
COMMENT ON COLUMN shipments.tracking_barcode IS '운송장 바코드 번호';
COMMENT ON COLUMN shipments.receipt_photo_url IS '영수증 사진 URL';

-- 인덱스 추가 (바코드로 검색할 수 있도록)
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_barcode 
ON shipments(tracking_barcode) 
WHERE tracking_barcode IS NOT NULL;