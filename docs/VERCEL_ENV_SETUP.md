# Vercel 환경변수 설정 가이드

## 필수 환경변수

Vercel Dashboard → Settings → Environment Variables에서 다음 변수들을 설정하세요:

### 1. Supabase 설정 (필수)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_API_KEY=your-anon-key (eyJ로 시작하는 키)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (service_role secret)
```

### 2. 앱 설정
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
SESSION_SECRET=random-32-chars-minimum
CRON_SECRET=your-cron-secret
```

## Supabase에서 키 찾기

1. [Supabase Dashboard](https://supabase.com) 로그인
2. 프로젝트 선택
3. Settings → API
4. 복사할 값들:
   - `URL`: Project URL
   - `NEXT_PUBLIC_SUPABASE_API_KEY`: anon public 키
   - `SUPABASE_SERVICE_ROLE_KEY`: service_role secret 키

## 중요 사항

⚠️ **주의**: 
- `NEXT_PUBLIC_` 접두사가 붙은 변수는 클라이언트에서 접근 가능합니다
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트에 노출되면 안 됩니다
- 환경변수 이름을 정확히 입력해야 합니다 (대소문자 구분)

## 확인 방법

배포 후 Vercel Functions 로그에서 다음을 확인:
```
Supabase client config: {
  hasUrl: true,
  hasKey: true,
  ...
}
```

모든 값이 `true`여야 정상 작동합니다.