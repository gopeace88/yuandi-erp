-- Migration 010: 환율 시스템 기초 테이블 생성
-- 목적: KRW/CNY 양방향 환율 관리 시스템 구축

-- 1. 환율 정보 테이블
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    base_currency VARCHAR(3) DEFAULT 'CNY',
    target_currency VARCHAR(3) DEFAULT 'KRW',
    rate DECIMAL(10,4) NOT NULL,  -- 1 CNY = ? KRW
    source VARCHAR(50) DEFAULT 'manual',  -- 'manual', 'api_bank', 'api_forex'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, base_currency, target_currency)
);

-- 2. 일일 환율 캐시 테이블
CREATE TABLE IF NOT EXISTS daily_exchange_cache (
    date DATE PRIMARY KEY,
    cny_to_krw DECIMAL(10,4) NOT NULL,
    krw_to_cny DECIMAL(10,4) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 인덱스 생성
CREATE INDEX idx_exchange_rates_date ON exchange_rates(date DESC);
CREATE INDEX idx_exchange_rates_active ON exchange_rates(is_active) WHERE is_active = true;

-- 4. 오늘 환율 조회 함수
CREATE OR REPLACE FUNCTION get_today_exchange_rate()
RETURNS DECIMAL(10,4) AS $$
DECLARE
    v_rate DECIMAL(10,4);
BEGIN
    -- 오늘 환율 조회
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE date = CURRENT_DATE
      AND base_currency = 'CNY'
      AND target_currency = 'KRW'
      AND is_active = true
    LIMIT 1;
    
    -- 오늘 환율이 없으면 가장 최근 환율 사용
    IF v_rate IS NULL THEN
        SELECT rate INTO v_rate
        FROM exchange_rates
        WHERE base_currency = 'CNY'
          AND target_currency = 'KRW'
          AND is_active = true
        ORDER BY date DESC
        LIMIT 1;
    END IF;
    
    -- 그래도 없으면 기본값 180
    RETURN COALESCE(v_rate, 180.0);
END;
$$ LANGUAGE plpgsql;

-- 5. 초기 환율 데이터 입력 (2025년 1월 기준)
INSERT INTO exchange_rates (date, base_currency, target_currency, rate, source)
VALUES 
    (CURRENT_DATE, 'CNY', 'KRW', 178.50, 'manual'),
    (CURRENT_DATE - INTERVAL '1 day', 'CNY', 'KRW', 179.20, 'manual'),
    (CURRENT_DATE - INTERVAL '2 days', 'CNY', 'KRW', 178.80, 'manual')
ON CONFLICT (date, base_currency, target_currency) DO NOTHING;

-- 6. 캐시 테이블 초기화
INSERT INTO daily_exchange_cache (date, cny_to_krw, krw_to_cny)
VALUES (CURRENT_DATE, 178.50, 0.0056)
ON CONFLICT (date) DO UPDATE SET
    cny_to_krw = EXCLUDED.cny_to_krw,
    krw_to_cny = EXCLUDED.krw_to_cny,
    updated_at = NOW();

-- 확인 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ 환율 테이블 생성 완료';
    RAISE NOTICE '✅ 환율 조회 함수 생성 완료';
    RAISE NOTICE '✅ 초기 환율 데이터 입력 완료';
END $$;