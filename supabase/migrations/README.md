# Supabase Migrations

## 📌 현재 상태: 개발 모드

현재는 **개발 단계**이므로 migrations를 사용하지 않습니다.

### 개발 환경 데이터베이스 초기화:
```bash
# 전체 스키마 리셋 (모든 데이터 삭제)
psql $DATABASE_URL -f scripts/01.working_schema_reset.sql
```

## 🚀 프로덕션 배포 시

실제 운영 환경에 배포할 때는 이 폴더에 migration 파일들을 생성해야 합니다.

### Migration이 필요한 경우:
- ✅ 프로덕션 환경에 첫 배포
- ✅ 기존 데이터를 유지하면서 스키마 변경
- ✅ 프로덕션 환경에서 점진적 업데이트

### Migration 생성 방법:
```bash
# 새 migration 생성
supabase migration new [migration_name]

# Migration 적용
supabase db push
```

### 파일명 규칙:
- `001_initial_schema.sql`
- `002_add_user_profiles.sql`
- `003_add_system_settings.sql`
- 번호는 순차적으로, 중복 없이

## ⚠️ 주의사항

1. **개발 중**: `/scripts/01.working_schema_reset.sql` 사용
2. **프로덕션**: 이 폴더의 migration 파일 사용
3. Migration은 한 번만 실행되며 되돌릴 수 없음
4. 프로덕션 배포 전 반드시 백업 수행