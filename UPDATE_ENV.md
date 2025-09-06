# Supabase API 키 업데이트 가이드

## 1. Supabase 대시보드에서 API 키 가져오기

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 
3. Settings → API 메뉴로 이동
4. 다음 두 개의 키를 복사:
   - `anon` (public) key - NEXT_PUBLIC_SUPABASE_API_KEY에 사용
   - `service_role` key - SUPABASE_API_KEY에 사용

## 2. .env.local 파일 업데이트

```bash
# .env.local 파일에서 다음 값들을 업데이트하세요:

NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_API_KEY=[YOUR-ANON-KEY]
SUPABASE_API_KEY=[YOUR-SERVICE-ROLE-KEY]
```

## 3. Vercel 환경변수 업데이트

```bash
# 기존 환경변수 삭제
vercel env rm NEXT_PUBLIC_SUPABASE_URL production
vercel env rm NEXT_PUBLIC_SUPABASE_API_KEY production  
vercel env rm SUPABASE_API_KEY production

# 새로운 환경변수 추가
echo "[YOUR-SUPABASE-URL]" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "[YOUR-ANON-KEY]" | vercel env add NEXT_PUBLIC_SUPABASE_API_KEY production
echo "[YOUR-SERVICE-ROLE-KEY]" | vercel env add SUPABASE_API_KEY production
```

## 4. 재배포

```bash
vercel --prod --force
```

## 5. 테스트

```bash
# 로컬 테스트
node test/test-supabase.js

# API 테스트  
curl http://localhost:8081/api/orders
```