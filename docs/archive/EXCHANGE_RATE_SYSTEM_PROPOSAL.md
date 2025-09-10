# 환율 자동 적용 시스템 제안서

## 1. 개요
- **목적**: 한화(KRW)와 위안화(CNY) 양방향 자동 환산 시스템 구축
- **핵심 기능**: 실시간 환율 조회, 자동 환산, 통화별 집계
- **영향 범위**: 전체 시스템 (DB, API, UI)

## 2. 시스템 아키텍처

### 2.1 데이터베이스 구조 변경

#### 새로운 테이블
```sql
-- 환율 정보 테이블
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    base_currency VARCHAR(3) DEFAULT 'CNY',
    target_currency VARCHAR(3) DEFAULT 'KRW',
    rate DECIMAL(10,4) NOT NULL,  -- 1 CNY = ? KRW
    source VARCHAR(50),  -- 'manual', 'api_bank', 'api_forex'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, base_currency, target_currency)
);

-- 일일 환율 캐시
CREATE TABLE daily_exchange_cache (
    date DATE PRIMARY KEY,
    cny_to_krw DECIMAL(10,4) NOT NULL,
    krw_to_cny DECIMAL(10,4) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 기존 테이블 변경
```sql
-- products 테이블: 양쪽 통화 추가
ALTER TABLE products
    ADD COLUMN cost_krw DECIMAL(12,2) GENERATED ALWAYS AS 
        (cost_cny * (SELECT rate FROM exchange_rates WHERE date = CURRENT_DATE)) STORED,
    ADD COLUMN price_cny DECIMAL(10,2) GENERATED ALWAYS AS 
        (price_krw / (SELECT rate FROM exchange_rates WHERE date = CURRENT_DATE)) STORED;

-- orders 테이블: CNY 필드 추가
ALTER TABLE orders
    ADD COLUMN subtotal_cny DECIMAL(10,2),
    ADD COLUMN shipping_fee_cny DECIMAL(10,2),
    ADD COLUMN total_cny DECIMAL(10,2),
    ADD COLUMN exchange_rate DECIMAL(10,4),  -- 주문 시점 환율 저장
    ADD COLUMN currency_preference VARCHAR(3) DEFAULT 'KRW';

-- order_items 테이블: CNY 필드 추가
ALTER TABLE order_items
    ADD COLUMN unit_price_cny DECIMAL(10,2),
    ADD COLUMN total_price_cny DECIMAL(10,2);

-- inventory_transactions 테이블: KRW 필드 추가
ALTER TABLE inventory_transactions
    ADD COLUMN cost_per_unit_krw DECIMAL(12,2),
    ADD COLUMN total_cost_krw DECIMAL(12,2);

-- shipments 테이블: CNY 필드 추가
ALTER TABLE shipments
    ADD COLUMN shipping_cost_cny DECIMAL(10,2);
```

### 2.2 환율 API 연동

#### 옵션 1: 한국은행 공개 API
```typescript
// lib/services/exchange-rate.service.ts
class ExchangeRateService {
  async fetchDailyRate(): Promise<number> {
    // 한국은행 API 호출
    const response = await fetch('https://www.koreaexim.go.kr/site/program/financial/exchangeJSON');
    // CNY to KRW 환율 반환
  }
  
  async updateDailyCache(): Promise<void> {
    const rate = await this.fetchDailyRate();
    // daily_exchange_cache 업데이트
  }
}
```

#### 옵션 2: 상용 환율 API (Fixer.io, ExchangeRate-API)
- 실시간 환율 제공
- 과거 환율 데이터 조회 가능
- 유료 플랜 필요 (월 $10~100)

### 2.3 UI 컴포넌트 설계

#### 통화 전환 토글
```tsx
// components/common/CurrencyToggle.tsx
interface CurrencyToggleProps {
  value: 'KRW' | 'CNY';
  onChange: (currency: 'KRW' | 'CNY') => void;
}

const CurrencyToggle: React.FC<CurrencyToggleProps> = ({ value, onChange }) => {
  return (
    <div className="flex gap-2">
      <button 
        className={value === 'KRW' ? 'active' : ''}
        onClick={() => onChange('KRW')}
      >
        ₩ 원화
      </button>
      <button 
        className={value === 'CNY' ? 'active' : ''}
        onClick={() => onChange('CNY')}
      >
        ¥ 위안화
      </button>
    </div>
  );
};
```

#### 자동 환산 입력 필드
```tsx
// components/common/DualCurrencyInput.tsx
interface DualCurrencyInputProps {
  krwValue: number;
  cnyValue: number;
  exchangeRate: number;
  onKrwChange: (value: number) => void;
  onCnyChange: (value: number) => void;
}

const DualCurrencyInput: React.FC<DualCurrencyInputProps> = ({
  krwValue, cnyValue, exchangeRate, onKrwChange, onCnyChange
}) => {
  const handleKrwChange = (value: number) => {
    onKrwChange(value);
    onCnyChange(value / exchangeRate);  // 자동 환산
  };
  
  const handleCnyChange = (value: number) => {
    onCnyChange(value);
    onKrwChange(value * exchangeRate);  // 자동 환산
  };
  
  return (
    <div className="flex gap-4">
      <Input 
        label="KRW"
        value={krwValue}
        onChange={handleKrwChange}
      />
      <span>⇄</span>
      <Input 
        label="CNY"
        value={cnyValue}
        onChange={handleCnyChange}
      />
      <span className="text-sm">1 CNY = {exchangeRate} KRW</span>
    </div>
  );
};
```

## 3. 구현 단계

### Phase 1: 기초 인프라 (1주)
1. exchange_rates 테이블 생성
2. 환율 API 서비스 개발
3. 일일 환율 업데이트 CRON 작업 설정

### Phase 2: 데이터베이스 마이그레이션 (2주)
1. 모든 테이블에 이중 통화 필드 추가
2. 기존 데이터 환산 마이그레이션
3. Generated Column으로 자동 계산 설정

### Phase 3: API 레이어 수정 (1주)
1. API 응답에 양쪽 통화 포함
2. 통화 preference 파라미터 추가
3. 환율 정보 엔드포인트 추가

### Phase 4: UI 업데이트 (2주)
1. 통화 토글 컴포넌트 개발
2. 자동 환산 입력 필드 적용
3. 출납장부 통화별 집계 뷰

### Phase 5: 테스트 및 검증 (1주)
1. 환산 정확도 테스트
2. 성능 테스트
3. 사용자 수용 테스트

## 4. 영향 분석

### 긍정적 영향
- ✅ 실시간 환율 반영으로 정확한 원가 계산
- ✅ 양국 거래처 대응 용이
- ✅ 통화별 재무 분석 가능
- ✅ 환율 변동 리스크 관리

### 주의사항
- ⚠️ 모든 화면 UI 재작업 필요
- ⚠️ 기존 데이터 마이그레이션 복잡도
- ⚠️ 환율 API 비용 발생 가능
- ⚠️ 성능 영향 (추가 계산 필요)

## 5. 대안 방안

### 간소화 방안 1: 일일 환율만 적용
- 실시간 환산 대신 일일 고정 환율 사용
- 매일 오전 9시 환율 업데이트
- 구현 복잡도 감소

### 간소화 방안 2: 주요 테이블만 적용
- products, orders, cashbook_transactions만 우선 적용
- 단계적 확대
- 리스크 최소화

## 6. 예상 일정
- 전체 구현: 약 7주
- 간소화 방안 1: 약 4주
- 간소화 방안 2: 약 3주

## 7. 필요 리소스
- 환율 API 구독료: 월 $10-100
- 개발 시간: 140-280 시간
- 테스트 시간: 40-80 시간

## 8. 의사결정 필요 사항
1. 환율 API 선택 (무료 vs 유료)
2. 구현 범위 (전체 vs 단계적)
3. 환율 업데이트 주기 (실시간 vs 일일)
4. 기존 데이터 처리 방법