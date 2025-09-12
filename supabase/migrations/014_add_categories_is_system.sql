-- 014_add_categories_is_system.sql
-- Categories 테이블에 is_system 필드 추가하여 시스템 카테고리 보호

-- 1. is_system 컬럼 추가
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- 2. 시스템 기본 카테고리 업데이트 (PRD 기반)
UPDATE categories 
SET is_system = true 
WHERE code IN (
  'louis_vuitton',
  'gucci', 
  'chanel',
  'hermes',
  'burberry',
  'prada',
  'dior',
  'balenciaga',
  'other'
);

-- 3. 컬럼 설명 추가
COMMENT ON COLUMN categories.is_system IS '시스템 기본 카테고리 여부 (삭제/수정 불가)';

-- 4. 시스템 카테고리 보호를 위한 트리거 생성
CREATE OR REPLACE FUNCTION protect_system_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- 시스템 카테고리 삭제 방지
  IF TG_OP = 'DELETE' AND OLD.is_system = true THEN
    RAISE EXCEPTION '시스템 카테고리는 삭제할 수 없습니다: %', OLD.code;
  END IF;
  
  -- 시스템 카테고리의 중요 필드 수정 방지
  IF TG_OP = 'UPDATE' AND OLD.is_system = true THEN
    -- code 변경 방지
    IF OLD.code != NEW.code THEN
      RAISE EXCEPTION '시스템 카테고리의 코드는 변경할 수 없습니다: %', OLD.code;
    END IF;
    
    -- is_system 플래그 변경 방지
    IF OLD.is_system != NEW.is_system THEN
      RAISE EXCEPTION '시스템 카테고리 상태는 변경할 수 없습니다: %', OLD.code;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 트리거 적용
DROP TRIGGER IF EXISTS protect_system_categories_trigger ON categories;
CREATE TRIGGER protect_system_categories_trigger
BEFORE UPDATE OR DELETE ON categories
FOR EACH ROW
EXECUTE FUNCTION protect_system_categories();

-- 6. 인덱스 추가 (시스템 카테고리 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_categories_is_system ON categories(is_system);

-- 7. 기존 데이터 검증
DO $$
DECLARE
  system_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO system_count 
  FROM categories 
  WHERE is_system = true;
  
  IF system_count < 9 THEN
    RAISE NOTICE '경고: 시스템 카테고리가 9개 미만입니다. 현재: %개', system_count;
  ELSE
    RAISE NOTICE '시스템 카테고리 설정 완료: %개', system_count;
  END IF;
END $$;