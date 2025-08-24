# SC-Prompt.md - SuperClaude ERP 개발 가이드

## 📋 프로젝트 개요
1인 해외구매대행업 초미니 ERP 시스템 개발  
기술 스택: Next.js 13+ App Router + Supabase + Tailwind CSS

## 🎯 개발 단계별 SuperClaude 프롬프트

### **1단계: 프로젝트 설계 시작**

**현재 진행 상황**: ⏳ 대기 중
**완료 조건**: 아키텍처 설계 문서 및 개발 로드맵 생성

```bash
# 전체 아키텍처 설계
/sc:design --architect "PRD.md 파일을 기반으로 초미니 ERP 시스템의 전체 아키텍처를 설계해줘. 1인 운영 해외구매대행업, 역할별 권한(Admin/OrderManager/ShipManager), 실시간 재고 확인, 작업 추적, 다국어 지원을 포함한 완전한 시스템 설계"
```

**✅ 완료 체크리스트**:
- [ ] 시스템 아키텍처 다이어그램
- [ ] 기술 스택 확정
- [ ] 폴더 구조 설계
- [ ] 개발 로드맵
- [ ] 다음 단계로 진행 승인

**완료 후 실행**: `이 단계가 완료되면 sc_prompt.md를 업데이트하고 2단계로 진행해줘`

### **2단계: 기술 스택 결정 및 프로젝트 구조 생성**

**현재 진행 상황**: ✅ 완료
**완료 조건**: Next.js 프로젝트 초기 구조 및 설정 파일 생성

```bash
# 기술 스택 분석
/sc:analyze --architect "Next.js 13+ App Router + Supabase + Tailwind CSS로 ERP 시스템을 구축할 때의 아키텍처 분석. 폴더 구조, 라우팅, 상태 관리, API 설계 포함"

# 프로젝트 초기 구조 생성
/sc:build --frontend "Next.js 13+ App Router를 사용한 ERP 프로젝트 구조 생성. 
- app 폴더 구조 (대시보드, 주문관리, 재고관리, 배송관리, 작업로그)
- 컴포넌트 구조 (공통 컴포넌트, 레이아웃)
- 타입스크립트 설정
- Tailwind CSS 설정
- ESLint/Prettier 설정"
```

**✅ 완료 체크리스트**:
- [x] package.json 생성
- [x] 폴더 구조 생성
- [x] TypeScript 설정
- [x] Tailwind CSS 설정
- [x] 기본 레이아웃 컴포넌트
- [x] 다음 단계로 진행 승인

**완료 후 실행**: `2단계가 완료되면 sc_prompt.md를 업데이트하고 3단계로 진행해줘`

### **3단계: 데이터베이스 스키마 구현**

**현재 진행 상황**: ✅ 완료  
**완료 조건**: Supabase 스키마 파일 및 TypeScript 타입 정의 완성

```bash
# Supabase 스키마 생성
/sc:design --backend "PRD.md의 데이터 모델을 기반으로 Supabase PostgreSQL 스키마 파일 생성.
테이블: User, Product, Order, OrderItem, Shipment, EventLog, Cashbook
- 각 테이블별 컬럼 정의
- 관계 설정 (Foreign Key)
- 인덱스 최적화
- RLS (Row Level Security) 정책
- 트리거 함수 (작업 로그 자동 기록)"

# 타입스크립트 타입 생성
/sc:build --backend "Supabase 스키마를 기반으로 TypeScript 타입 정의 파일 생성"
```

**✅ 완료 체크리스트**:
- [x] schema.sql 파일 생성
- [x] RLS 정책 설정
- [x] 트리거 함수 구현
- [x] TypeScript 타입 정의
- [x] Supabase 연결 설정
- [x] 다음 단계로 진행 승인

**완료 후 실행**: `3단계가 완료되면 sc_prompt.md를 업데이트하고 4단계로 진행해줘`

### **4단계: 순차적 개발**

#### **4-1. 인증 시스템** ✅ 완료
```bash
/sc:build --frontend --persona-security "Next.js + Supabase Auth를 사용한 역할 기반 인증 시스템
- 로그인/로그아웃 페이지
- 역할별 라우트 보호 (Admin/OrderManager/ShipManager)
- 권한 체크 미들웨어
- 사용자 세션 관리
- 보안 헤더 설정"
```
**구현 완료**:
- ✅ middleware.ts - 경로별 접근 권한 체크
- ✅ 로그인/로그아웃 페이지 구현
- ✅ AuthProvider & useAuth 훅
- ✅ 권한 시스템 (permissions.ts)
- ✅ ProtectedRoute 컴포넌트
- ✅ Header & Sidebar 레이아웃

#### **4-2. 대시보드**
```bash
/sc:build --frontend --persona-frontend "역할별 대시보드 화면 구현
- 매출 현황 카드 (오늘/이번주/이번달)
- 재고 부족 상품 알림
- 주문 현황 (상태별 분포)
- 처리 대기 작업 (역할별)
- 최근 작업 로그
- 반응형 차트 (recharts 사용)
- 역할별 위젯 노출 제어"
```

#### **4-3. 주문 관리 시스템**
```bash
/sc:build --frontend "주문 관리 화면 구현
- 주문 생성 폼 (고객정보, 상품선택, 주소입력)
- 실시간 재고 검증 및 표시
- Daum 우편번호 API 연동
- 주문 목록 (검색, 필터, 페이지네이션)
- 주문 상세 모달
- 상태별 빠른 액션 버튼
- 주문 수정/삭제 (권한별 제어)"
```

#### **4-4. 재고 관리 시스템**
```bash
/sc:build --frontend "재고 관리 화면 구현
- 상품 등록/수정 폼 (6개 필수 항목)
- SKU 자동 생성 로직
- 재고 목록 (검색, 필터링)
- 입고 등록 기능
- 재고 조정 (±1 버튼, 직접입력)
- 재고 부족 알림
- 재고 가치 계산 (CNY/KRW)"
```

#### **4-5. 배송 관리 시스템**
```bash
/sc:build --frontend "배송 관리 화면 구현
- 배송 대기 주문 목록 (PAID 상태)
- 송장 등록 폼 (택배사, 송장번호)
- 송장 사진 업로드 기능
- 추적 URL 자동 생성
- 배송 중 주문 관리 (SHIPPED 상태)
- 출고 완료/환불 처리
- 배송 현황 대시보드"
```

#### **4-6. API 개발**
```bash
/sc:build --backend "RESTful API 엔드포인트 구현
- 인증/권한 API (/api/auth/*)
- 주문 관리 API (/api/orders/*)
- 재고 관리 API (/api/products/*, /api/inventory/*)
- 배송 관리 API (/api/shipments/*)
- 대시보드 API (/api/dashboard/*)
- 작업 로그 API (/api/activity-logs/*)
- 출납장부 API (/api/cashbook/*)
- 파일 업로드 API (/api/upload/*)
- 권한별 API 접근 제어"
```

### **5단계: 고급 기능 구현**

#### **5-1. 작업 추적 시스템**
```bash
/sc:build --backend --persona-architect "EventLog 시스템 - 모든 사용자 작업 추적 및 감사 로그
- 자동 로깅 미들웨어
- 작업 유형별 이벤트 정의
- Before/After 데이터 저장
- IP 주소 및 User-Agent 기록
- 작업 로그 조회 API
- 특정 주문/상품 이력 추적
- 실시간 작업 모니터링"
```

#### **5-2. 작업 로그 화면**
```bash
/sc:build --frontend "작업 로그 화면 구현
- 실시간 작업 로그 목록
- 다중 필터링 (작업자, 기간, 작업유형, 대상)
- 빠른 필터 탭 (전체/내작업/주문관련/재고관련/배송관련)
- 상세 모달 (Before/After 비교)
- 페이지네이션 및 무한 스크롤
- CSV 내보내기 기능"
```

#### **5-3. 국제화 (i18n)**
```bash
/sc:build --frontend "Next.js i18n을 사용한 한국어/중국어 다국어 지원
- 언어 파일 구조 (ko.json, zh.json)
- 언어 토글 컴포넌트
- 동적 언어 전환
- 사용자별 기본 언어 저장
- 날짜/통화 포맷 현지화
- /track 페이지 브라우저 언어 감지"
```

#### **5-4. 엑셀 내보내기**
```bash
/sc:build --backend "SheetJS를 사용한 엑셀 다운로드 기능
- 주문 목록 엑셀 내보내기
- 재고 현황 엑셀 내보내기
- 출납장부 엑셀 내보내기
- 현재 필터 조건 반영
- UTF-8 인코딩 보장
- 통화/날짜 포맷 유지
- 관리자 권한 체크"
```

#### **5-5. 고객 조회 페이지**
```bash
/sc:build --frontend "고객 비로그인 주문 조회 페이지 (/track)
- 이름 + 전화번호 인증
- 최근 5건 주문 카드 표시
- 주문 상태 표시
- 송장 추적 링크
- 다국어 지원 (브라우저 언어 감지)
- 반응형 디자인
- 개인정보 보호"
```

### **6단계: 테스트 및 최적화**

#### **6-1. 테스트 코드 작성**
```bash
/sc:test --persona-qa "포괄적인 테스트 코드 작성
- 단위 테스트 (유틸 함수, 컴포넌트)
- 통합 테스트 (API 엔드포인트)
- E2E 테스트 (주요 사용자 플로우)
- 권한 시스템 테스트
- 재고 검증 로직 테스트
- 작업 로그 기능 테스트
- Jest + React Testing Library + Playwright"
```

#### **6-2. 성능 최적화**
```bash
/sc:optimize --performance "Next.js 앱 성능 최적화
- 이미지 최적화 (next/image)
- 동적 임포트 및 코드 스플리팅
- 캐싱 전략 (ISR, API 캐싱)
- Supabase 쿼리 최적화
- 번들 크기 분석 및 최적화
- 메모리 누수 방지
- SEO 최적화"
```

#### **6-3. 보안 검토**
```bash
/sc:review --security "보안 취약점 검토 및 강화
- 인증/인가 시스템 검토
- API 보안 (CSRF, XSS, SQL Injection)
- RLS 정책 검증
- 환경 변수 보안
- HTTPS 강제
- 보안 헤더 설정
- 입력 데이터 검증
- 파일 업로드 보안"
```

#### **6-4. 배포 준비**
```bash
/sc:deploy --vercel "Vercel 배포를 위한 설정 및 환경 구성
- vercel.json 설정
- 환경 변수 설정
- 빌드 최적화
- 도메인 설정
- SSL 인증서
- 모니터링 설정
- 에러 로깅 (Sentry)
- 성능 모니터링"
```

## 🔄 **진행 상황 추적 시스템**

각 단계 완료 후 수동으로 체크리스트를 업데이트하고 다음 단계로 진행:

### **진행 상황 시각화**

```
🎯 전체 진행도: [██████████████░░░░░░] 60% (3.5/6 주요 단계 완료)

✅ 1단계: 프로젝트 설계 (완료)
✅ 2단계: 프로젝트 구조 (완료) 
✅ 3단계: 데이터베이스 스키마 (완료)
🔄 4단계: 순차적 개발 (진행 중 - 4-2 대시보드)
  ✅ 4-1: 인증 시스템 (완료)
  🔄 4-2: 대시보드 (진행 중)
  ⏳ 4-3: 주문 관리
  ⏳ 4-4: 재고 관리
  ⏳ 4-5: 배송 관리
  ⏳ 4-6: API 개발
⏳ 5단계: 고급 기능 (대기)
⏳ 6단계: 테스트 및 최적화 (대기)
```

### **단계별 진행 방법**
1. 각 단계의 `/sc:` 명령어 실행
2. 체크리스트 항목 수동으로 ✅ 표시
3. 모든 항목 완료 시 다음 단계로 이동

## 📋 **수동 진행 관리 시스템**

### **실제 사용 방법**

```bash
# 1단계 실행
/sc:design --architect "PRD.md 기반 ERP 아키텍처 설계"

# 완료 후 체크리스트 수동 업데이트 (이 문서에서)
# ✅ 시스템 아키텍처 다이어그램
# ✅ 기술 스택 확정
# ✅ 폴더 구조 설계

# 모든 체크리스트 완료 시 2단계 진행
/sc:analyze --architect "Next.js + Supabase + Tailwind CSS 아키텍처 분석"
```

### **진행 상황 체크**
```bash
/sc:analyze --progress "현재까지 구현된 기능과 남은 작업 분석. PRD.md의 수용 기준과 비교하여 완성도 체크"
```

### **문서 업데이트**
```bash
/sc:document "구현된 기능들에 대한 README.md 업데이트. 설치 방법, 사용법, API 문서 포함"
```

### **버그 수정**
```bash
/sc:debug --persona-qa "발견된 버그 분석 및 수정. 근본 원인 파악 후 해결책 제시"
```

### **리팩토링**
```bash
/sc:refactor --architect "코드 구조 개선 및 리팩토링. 유지보수성 향상 및 성능 최적화"
```

## 📝 **사용 순서**

1. **1단계부터 순차적으로 진행**
2. **각 단계 완료 후 테스트**
3. **Git 커밋으로 변경사항 추적**
4. **문제 발생 시 `/debug` 사용**
5. **6단계 완료 후 배포**

## ⚠️ **주의사항**

- 한 번에 모든 기능을 구현하지 말고 단계별로 진행
- Claude가 제안한 코드는 항상 검토 후 승인
- 중요한 변경사항은 Git 커밋으로 백업
- 권한 시스템은 철저히 테스트
- 개인정보 처리 시 보안 주의

---

**시작 명령어**: `/sc:design --architect PRD.md`
