-- 013_create_cashbook_types_table.sql
-- 출납유형 테이블 생성 및 기본 데이터 입력

-- 1. 출납유형 테이블 생성
CREATE TABLE IF NOT EXISTS cashbook_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name_ko VARCHAR(100) NOT NULL,
  name_zh VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'adjustment')),
  color VARCHAR(7) DEFAULT '#6B7280',
  description TEXT,
  display_order INTEGER DEFAULT 999,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX idx_cashbook_types_code ON cashbook_types(code);
CREATE INDEX idx_cashbook_types_type ON cashbook_types(type);
CREATE INDEX idx_cashbook_types_active ON cashbook_types(is_active);

-- 3. PRD 기반 시스템 기본 출납유형 데이터 입력
INSERT INTO cashbook_types (code, name_ko, name_zh, type, color, description, display_order, is_system) VALUES
-- 수입 유형
('sale', '판매', '销售', 'income', '#10B981', '고객 주문에 따른 수입', 1, true),
('refund_cancel', '환불취소', '退款取消', 'income', '#34D399', '환불 취소로 인한 수입', 2, true),
('other_income', '기타수입', '其他收入', 'income', '#6EE7B7', '기타 수입', 3, true),

-- 지출 유형
('inbound', '입고', '入库', 'expense', '#EF4444', '상품 구매/입고 시 발생하는 지출', 4, true),
('refund', '환불', '退款', 'expense', '#F87171', '고객 환불로 인한 지출', 5, true),
('shipping_fee', '배송비', '运费', 'expense', '#FB923C', '배송 관련 비용', 6, true),
('operation_cost', '운영비', '运营费', 'expense', '#FBBF24', '사무실 임대료, 인건비 등', 7, true),
('other_expense', '기타지출', '其他支出', 'expense', '#FCA5A5', '기타 지출', 8, true),

-- 조정 유형
('adjustment', '조정', '调整', 'adjustment', '#6B7280', '재고 조정 등 기타 조정 항목', 9, true),
('loss', '손실', '损失', 'adjustment', '#9CA3AF', '재고 손실, 파손 등', 10, true),
('correction', '정정', '更正', 'adjustment', '#D1D5DB', '입력 오류 정정', 11, true);

-- 4. cashbook_transactions 테이블에 cashbook_type_id 필드 추가 (선택사항)
-- 현재는 category 텍스트 필드를 사용하므로 향후 개선시 고려
-- ALTER TABLE cashbook_transactions 
-- ADD COLUMN cashbook_type_id INTEGER REFERENCES cashbook_types(id);

-- 5. 업데이트 트리거 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cashbook_types_updated_at 
BEFORE UPDATE ON cashbook_types 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 6. 권한 설정
GRANT SELECT ON cashbook_types TO authenticated;
GRANT ALL ON cashbook_types TO service_role;

-- 7. RLS 정책 (필요시)
-- ALTER TABLE cashbook_types ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE cashbook_types IS '출납유형 관리 테이블';
COMMENT ON COLUMN cashbook_types.code IS '출납유형 코드 (unique)';
COMMENT ON COLUMN cashbook_types.type IS '유형: income(수입), expense(지출), adjustment(조정)';
COMMENT ON COLUMN cashbook_types.is_system IS '시스템 기본 유형 여부 (삭제 불가)';