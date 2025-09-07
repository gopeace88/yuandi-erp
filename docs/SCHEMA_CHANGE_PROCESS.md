# 데이터베이스 스키마 변경 프로세스

> **중요**: 데이터베이스 스키마를 변경할 때는 반드시 이 프로세스를 따라야 합니다.
> 
> **Last Updated**: 2025-01-27
> **Version**: 1.0

## 📋 스키마 변경 체크리스트

데이터베이스 스키마 변경 시 다음 단계를 순서대로 진행하세요:

### 1️⃣ 마이그레이션 파일 생성
```bash
# /supabase/migrations/ 폴더에 새 SQL 파일 생성
# 파일명: [번호]_[변경내용].sql
# 예: 010_create_exchange_rate_tables.sql
```

**마이그레이션 파일 내용:**
- CREATE TABLE / ALTER TABLE 문
- 인덱스 생성
- 트리거 및 함수
- 초기 데이터 입력
- 확인 메시지

### 2️⃣ 타입 정의 업데이트

#### a. TypeScript 타입 (/types/database.types.ts)
```typescript
export interface NewTable {
  id: string
  field_name: type
  // ...
}
```

#### b. Supabase 타입 (/types/supabase.types.ts)
```bash
# Supabase CLI로 타입 자동 생성 (선택사항)
npx supabase gen types typescript --project-id [project-id] > types/supabase.types.ts
```

### 3️⃣ API 업데이트

#### a. 새 테이블용 API 생성
```typescript
// /app/api/[table-name]/route.ts
import { createClient } from '@/lib/supabase/server';

export async function GET() { /* ... */ }
export async function POST() { /* ... */ }
export async function PUT() { /* ... */ }
export async function DELETE() { /* ... */ }
```

#### b. 기존 API 수정
- 필드 추가/제거
- 쿼리 로직 변경
- 유효성 검사 업데이트

### 4️⃣ 테스트 데이터 스크립트 업데이트

#### a. 데이터 생성 스크립트 수정
```javascript
// /scripts/generate-business-flow-data.js
// 새 필드 추가
const newData = {
  existing_field: value,
  new_field: calculated_value,  // 추가된 필드
  // ...
};
```

#### b. 마이그레이션 실행 스크립트
```javascript
// /scripts/apply-[feature]-migrations.js
const migration = fs.readFileSync('../supabase/migrations/xxx.sql', 'utf8');
// SQL 실행 로직
```

### 5️⃣ 문서 업데이트

#### a. DATABASE_ERD.md
- 테이블 스펙 업데이트
- 관계도 수정
- 버전 히스토리 추가

#### b. CLAUDE.md
- Quick Reference 섹션 업데이트
- Known Issues 섹션 업데이트

#### c. 기타 영향받는 문서
- PRD.md (기능 변경 시)
- API_DOCUMENTATION.md
- SETUP_GUIDE.md

### 6️⃣ 환경 변수 (필요 시)
```bash
# .env.example 업데이트
NEW_FEATURE_API_KEY=
NEW_FEATURE_SECRET=
```

### 7️⃣ UI 컴포넌트 업데이트 (필요 시)
- 새 필드용 입력 컴포넌트
- 목록 표시 수정
- 필터/검색 로직 업데이트

## 🚀 실행 순서

### 개발 환경
1. 마이그레이션 파일 작성
2. 로컬 Supabase에서 SQL 실행 및 테스트
3. 타입 정의 업데이트
4. API 수정
5. 테스트 데이터 스크립트 실행
6. 기능 테스트

### 프로덕션 배포
1. 모든 변경사항 커밋
   ```bash
   git add -A
   git commit -m "feat: [기능명] 스키마 변경"
   git push origin main
   ```

2. Supabase Dashboard에서 마이그레이션 실행
   - SQL Editor에서 마이그레이션 파일 내용 실행
   - 또는 Supabase CLI 사용

3. Vercel 배포
   ```bash
   vercel --prod
   ```

4. 배포 후 검증
   - API 엔드포인트 테스트
   - UI 기능 테스트
   - 데이터 정합성 확인

## ⚠️ 주의사항

### 1. 하위 호환성
- 기존 데이터 백업 필수
- ALTER TABLE 사용 시 DEFAULT 값 지정
- NOT NULL 제약 추가 시 기존 데이터 처리

### 2. 성능 고려
- 인덱스 생성 시 쿼리 패턴 분석
- 대용량 데이터 마이그레이션 시 배치 처리
- 트리거/함수 성능 테스트

### 3. 보안
- RLS 정책 확인 및 업데이트
- 민감한 데이터 암호화
- API 권한 검증

## 📝 예시: 환율 시스템 추가

### 1. 마이그레이션
```sql
-- 010_create_exchange_rate_tables.sql
CREATE TABLE exchange_rates (...);
-- 011_add_dual_currency_fields.sql
ALTER TABLE products ADD COLUMN cost_krw DECIMAL(12,2);
```

### 2. 타입 정의
```typescript
// types/database.types.ts
export interface Product {
  cost_cny: number;
  cost_krw?: number;  // 추가
  price_krw: number;
  price_cny?: number;  // 추가
}
```

### 3. API 수정
```typescript
// app/api/products/route.ts
const cost_krw = cost_cny * exchangeRate;
const price_cny = price_krw / exchangeRate;
```

### 4. 테스트 데이터
```javascript
// scripts/generate-business-flow-data.js
products.push({
  cost_cny: costCny,
  cost_krw: costCny * 178.50,  // 추가
  price_krw: priceKrw,
  price_cny: priceKrw / 178.50  // 추가
});
```

## 🔄 롤백 계획

문제 발생 시 롤백 절차:

1. **즉시 조치**
   - 이전 버전으로 Vercel 롤백
   - API 라우트 비활성화

2. **데이터베이스 롤백**
   ```sql
   -- 롤백 SQL 준비
   DROP TABLE IF EXISTS new_table;
   ALTER TABLE existing_table DROP COLUMN new_column;
   ```

3. **코드 롤백**
   ```bash
   git revert [commit-hash]
   git push origin main
   ```

## 📚 참고 문서
- [Supabase Migrations](https://supabase.com/docs/guides/cli/migrations)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/api-routes)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Remember**: 스키마 변경은 신중하게! 항상 백업 먼저, 테스트 충분히! 🚀