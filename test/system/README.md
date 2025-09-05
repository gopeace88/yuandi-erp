# 시스템 테스트 가이드

## 📋 개요
YUANDI 주문관리 시스템의 종합적인 시스템 테스트 스위트입니다.

## 🎯 테스트 목적
1. **데이터베이스 초기화 및 재구축**
2. **대량 테스트 데이터 생성** (상품 100+, 주문 1000+, 송장 500+)
3. **데이터 무결성 검증**
4. **전체 기능 테스트**

## 🚀 빠른 시작

### 1. 필수 패키지 설치
```bash
# TypeScript 실행 환경 설치
npm install --save-dev ts-node @types/node dotenv

# 또는 yarn 사용
yarn add -D ts-node @types/node dotenv
```

### 2. 환경 변수 설정
`.env.local` 파일에 다음 변수들이 설정되어 있어야 합니다:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_API_KEY=your-public-key
SUPABASE_API_KEY=your-service-key
```

### 3. 전체 테스트 실행
```bash
# 모든 테스트 단계 순차 실행
npm run test:system

# 또는 직접 실행
npx ts-node test/system/run-all-tests.ts
```

## 📂 테스트 파일 구조

### 테스트 실행 순서
1. **01-database-reset.ts** - DB 초기화
   - 기존 데이터 백업
   - 모든 테이블 클리어
   - 스토리지 정리
   - 시스템 사용자 생성

2. **02-seed-products.ts** - 상품 데이터 생성 (100건+)
   - 다양한 카테고리
   - 실제 비즈니스 상품명
   - 재고 초기화

3. **03-seed-orders.ts** - 주문 데이터 생성 (1000건+)
   - 고객 정보 생성
   - 주문 상태 분포
   - 재고 할당

4. **04-seed-shipments.ts** - 송장 데이터 생성 (500건+)
   - 택배사별 송장번호
   - 배송 상태 업데이트
   - 추적 URL 생성

5. **05-verify-integrity.ts** - 데이터 무결성 검증
   - 참조 무결성
   - 비즈니스 규칙
   - 데이터 일관성
   - 성능 메트릭

6. **06-functional-test.ts** - 기능 테스트
   - 배송 추적
   - Excel 내보내기
   - 사용자 조회
   - 이미지 업로드
   - 접근 권한

## 🔧 개별 테스트 실행

### DB 초기화만 실행
```bash
npm run test:system:reset
# 또는
npx ts-node test/system/01-database-reset.ts
```

### 테스트 데이터만 생성
```bash
npm run test:system:seed
# 또는
npx ts-node test/system/02-seed-products.ts
npx ts-node test/system/03-seed-orders.ts
npx ts-node test/system/04-seed-shipments.ts
```

### 무결성 검증만 실행
```bash
npm run test:system:verify
# 또는
npx ts-node test/system/05-verify-integrity.ts
```

### 기능 테스트만 실행
```bash
npm run test:system:functional
# 또는
npx ts-node test/system/06-functional-test.ts
```

## ⚠️ 주의사항

### 프로덕션 환경 보호
- 스크립트는 자동으로 프로덕션 URL 감지
- `prod` 또는 `production` 포함 시 실행 중단
- 실행 전 사용자 확인 프롬프트

### 데이터 백업
- DB 초기화 전 자동 백업
- `backups/` 디렉토리에 JSON 형식 저장
- 타임스탬프 포함 파일명

### 실행 시간
- 전체 테스트: 약 10-15분
- DB 초기화: 1분
- 상품 생성: 2분
- 주문 생성: 5분
- 송장 생성: 3분
- 검증 및 테스트: 3분

## 🎯 검증 항목

### 참조 무결성
- 고아 레코드 검사
- 외래 키 관계
- 종속 데이터 일관성

### 비즈니스 규칙
- 재고 수준 정확성
- SKU 유일성
- 주문 상태 전환
- 가격 계산 정확성

### 데이터 일관성
- 주문 합계 vs 아이템 합계
- 캐시북 잔액
- 재고 이동 추적
- 타임스탬프 유효성

### 성능 메트릭
- 쿼리 응답 시간
- 대량 작업 처리 시간
- 동시 접근 처리

## 📊 결과 분석

### 성공 기준
- ✅ 모든 치명적 단계 통과
- ✅ 무결성 검증 100% 통과
- ✅ 기능 테스트 80% 이상 통과
- ✅ 성능 목표 달성 (응답 시간 < 500ms)

### 실패 시 조치
1. 오류 로그 확인
2. 문제 수정
3. DB 초기화부터 재실행
4. 개별 테스트로 문제 격리

## 🛠️ 문제 해결

### ts-node를 찾을 수 없음
```bash
npm install --save-dev ts-node @types/node
# 또는 전역 설치
npm install -g ts-node
```

### 환경 변수 오류
```bash
# .env.local 파일 확인
cat .env.local

# 필수 변수 확인
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_API_KEY
SUPABASE_API_KEY
```

### Supabase 연결 오류
- Supabase 프로젝트 상태 확인
- API 키 유효성 확인
- 네트워크 연결 확인

### 메모리 부족
- Node.js 메모리 제한 증가
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run test:system
```

## 📝 테스트 결과 예시

```
╔════════════════════════════════════════════════════════════════╗
║                         테스트 결과 요약                        ║
╚════════════════════════════════════════════════════════════════╝

총 테스트: 6개
성공: 6개
실패: 0개
성공률: 100%
총 실행 시간: 12.45분

상세 결과:
  ✓ DB 초기화 (45.23초)
  ✓ 상품 데이터 생성 (112.34초)
  ✓ 주문 데이터 생성 (298.45초)
  ✓ 송장 데이터 생성 (187.23초)
  ✓ DB 무결성 검증 (89.12초)
  ✓ 기능 테스트 (115.34초)

🎉 모든 테스트 성공! 시스템 준비 완료
```

## 🔄 지속적 통합 (CI)

### GitHub Actions 예시
```yaml
name: System Test

on:
  push:
    branches: [ main, develop ]
  schedule:
    - cron: '0 2 * * *'  # 매일 새벽 2시

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:system
```

## 📚 추가 자료

- [Supabase 문서](https://supabase.com/docs)
- [TypeScript 문서](https://www.typescriptlang.org/docs/)
- [테스트 베스트 프랙티스](https://testingjavascript.com/)

## 🤝 기여하기

테스트 개선 사항이나 버그를 발견하면:
1. Issue 생성
2. Pull Request 제출
3. 테스트 결과 첨부

---

**마지막 업데이트**: 2024-01-09
**작성자**: YUANDI System Test Team