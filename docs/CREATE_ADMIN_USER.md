# 관리자 계정 생성 가이드

## 방법 1: Supabase Dashboard 사용 (권장)

### Step 1: Supabase Auth에서 사용자 생성
1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택
3. **Authentication** → **Users** 메뉴 이동
4. **Add user** → **Create new user** 클릭
5. 다음 정보 입력:
   - Email: `admin@yuandi.com`
   - Password: `yuandi123!`
   - Auto Confirm Email: ✅ 체크
6. **Create user** 클릭
7. 생성된 사용자의 **User UID** 복사 (UUID 형식)

### Step 2: User Profile 생성
1. **SQL Editor** 메뉴 이동
2. 다음 SQL 실행 (UUID 교체 필요):

```sql
INSERT INTO user_profiles (
    id,
    email,
    name,  -- Note: column is 'name' not 'full_name'
    role,
    phone,
    language,
    timezone,
    is_active,
    created_at,
    updated_at
) VALUES (
    'YOUR-UUID-HERE'::UUID,  -- ← Step 1에서 복사한 UUID로 교체
    'admin@yuandi.com',
    '시스템 관리자',
    'admin',
    '010-0000-0000',
    'ko',
    'Asia/Seoul',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_active = true,
    updated_at = NOW();
```

## 방법 2: API Script 사용 (자동화)

### 사전 준비
1. `.env.local` 파일에 Service Role Key 추가:
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```
(Supabase Dashboard → Settings → API → service_role key)

### 실행
```bash
node scripts/create-admin-with-api.js
```

## 방법 3: SQL Migration 사용

1. `supabase/migrations/008_create_default_admin.sql` 파일 수정
2. UUID 부분을 실제 Auth UUID로 교체
3. Supabase Dashboard에서 실행

## 생성된 관리자 계정 정보

| 항목 | 값 |
|------|-----|
| Email | admin@yuandi.com |
| Password | yuandi123! |
| Role | admin |
| Name | 시스템 관리자 |

## 추가 사용자 생성

### 주문 관리자 (order_manager)
```sql
-- 1. Supabase Auth에서 사용자 생성
-- Email: order@yuandi.com
-- Password: yuandi123!

-- 2. Profile 생성
INSERT INTO user_profiles (
    id, email, name, role, phone, language, timezone, is_active
) VALUES (
    'AUTH-UUID-HERE'::UUID,
    'order@yuandi.com',
    '주문 관리자',
    'order_manager',
    '010-1111-1111',
    'ko',
    'Asia/Seoul',
    true
);
```

### 배송 관리자 (ship_manager)
```sql
-- 1. Supabase Auth에서 사용자 생성
-- Email: ship@yuandi.com
-- Password: yuandi123!

-- 2. Profile 생성
INSERT INTO user_profiles (
    id, email, name, role, phone, language, timezone, is_active
) VALUES (
    'AUTH-UUID-HERE'::UUID,
    'ship@yuandi.com',
    '배송 관리자',
    'ship_manager',
    '010-2222-2222',
    'ko',
    'Asia/Seoul',
    true
);
```

## 문제 해결

### "User already exists" 오류
- Supabase Auth에서 기존 사용자 삭제 후 재생성
- 또는 기존 사용자의 UUID를 사용하여 profile만 생성

### 로그인 실패
1. user_profiles 테이블에 레코드가 있는지 확인
2. Auth UUID와 profile ID가 일치하는지 확인
3. role이 올바른지 확인 ('admin', 'order_manager', 'ship_manager')

### 권한 문제
- RLS 정책 확인
- 사용자 role 확인
- is_active = true 확인