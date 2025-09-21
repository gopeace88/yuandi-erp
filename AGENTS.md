# Repository Guidelines

## 문서 및 참고 경로
- 상세 개발 지침은 항상 `CLAUDE.md`를 우선 참조하세요. 해당 문서는 Navigator 역할을 하며 PRD, 스키마 변경, 배포, 환경 설정 가이드를 최신 상태로 연결합니다.
- 요구사항은 `docs/(250907-v2.0)PRD.md`, 스키마 변경 절차는 `docs/SCHEMA_CHANGE_PROCESS.md`, 배포와 세팅은 각각 `docs/(250907-v1.0)DEPLOYMENT_GUIDE.md`, `docs/(250907-v1.0)SETUP_GUIDE.md`에서 확인합니다.

## 프로젝트 구조
- `app/`은 Next.js App Router 페이지·레이아웃·서버 액션을 담습니다.
- `components/`는 재사용 UI, `lib/`는 도메인 헬퍼, `types/`는 공유 타입 정의, `supabase/`는 마이그레이션 및 Edge Function을 보관합니다.
- 테스트는 `__tests__/`(Jest 단위·통합 등)와 `tests/e2e/`(Playwright 시나리오 및 산출물)로 분리됩니다.

## 작업 절차 요약
- 변경 시작 전 Supabase MCP 명령으로 실제 스키마를 검증하고, SQL 변경 시 PRD와 마이그레이션 문서를 동기화합니다.
- 주문→배송→완료/환불의 비즈니스 플로우를 준수하며, CLAUDE.md의 “Critical Rules” 항목을 체크리스트로 사용하세요.
- 코드 작업 시 “Test → 승인 → Push” 순서를 지키고, 미검증 코드는 배포하지 않습니다.

## 빌드·테스트·개발 명령
- `pnpm install`, `pnpm dev`(필요 시 `PORT=8081 pnpm dev`), `pnpm build`/`pnpm build:optimize`로 설치·개발·빌드를 수행합니다.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`와 스코프별 Jest 명령, `pnpm test:e2e` 및 시나리오별 Playwright 명령은 필수 검증 도구입니다.
- 워크플로우 전체 검증은 `pnpm test:system:*`, `pnpm test:workflow:all`을 참고하세요.

## 코딩 스타일 및 네이밍
- TypeScript 기반, PascalCase 컴포넌트·camelCase 훅·케밥케이스 파일 네이밍, Tailwind 인라인 사용 원칙을 유지합니다.
- Prettier+ESLint 설정은 2칸 들여쓰기와 세미콜론을 강제하며, 자동 수정은 `pnpm lint --fix`를 사용합니다.
- 데이터베이스 테이블 및 역할 네이밍 규칙은 CLAUDE.md의 예시를 따르세요.

## 테스트 지침
- 테스트 파일 구조를 소스와 미러링하고, Jest는 `<feature>.spec.ts` 네이밍과 Testing Library 쿼리를 우선합니다.
- Playwright 실행 후 `tests/e2e/screenshots/`, `tests/e2e/downloads/` 산출물을 PR에 첨부합니다.
- 대량 데이터나 스키마 검증 흐름은 CLAUDE.md의 Test Data 및 Schema Verification 섹션을 참고합니다.

## 커밋 및 PR 지침
- Git 이력의 관례적 prefix(`fix:`, `test:` 등)와 관련 이슈 ID를 유지합니다.
- PR에는 변경 범위, 스키마 영향, 수동 테스트 결과, UI 변경 스크린샷을 포함하고, 도메인 담당자 리뷰와 CI 그린 상태를 확인합니다.

## 환경·배포 체크
- 비밀 값은 Vercel 환경 변수로 관리하고 `pnpm env:pull`로 `.env.local`을 동기화합니다.
- 초기화는 `scripts/setup-vercel-env.sh`, 배포는 시스템 테스트 통과 후 `pnpm deploy:prod`를 사용하고, 번들 분석은 `pnpm build:analyze`로 수행합니다.
- WSL·Windows 병행 환경 설정과 최근 마이그레이션 정보는 CLAUDE.md의 해당 섹션을 참고하세요.
