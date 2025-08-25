# 개발 워크플로우 (Development Workflow)

## 🔴 중요 원칙: 로컬 테스트 우선

**모든 코드 변경사항은 반드시 로컬에서 테스트 후 배포**

### 워크플로우 순서

1. **로컬 개발 및 테스트**
   ```bash
   # 1. 코드 수정
   # 2. 로컬 서버 실행
   npm run dev
   
   # 3. 브라우저에서 테스트
   http://localhost:8081
   
   # 4. 콘솔 로그 확인
   # 5. 네트워크 탭에서 API 응답 확인
   ```

2. **빌드 테스트**
   ```bash
   # 프로덕션 빌드 테스트
   npm run build
   
   # 빌드 성공 확인 후 진행
   ```

3. **Git 커밋 및 푸시**
   ```bash
   git add -A
   git commit -m "feat: 기능 설명"
   git push origin main
   ```

4. **Vercel 배포 확인**
   - Vercel 대시보드에서 빌드 상태 확인
   - Functions 탭에서 로그 확인
   - 프로덕션 환경에서 최종 테스트

## 🛠️ 로컬 개발 환경 설정

### 환경 변수 (.env.local)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:8081
```

### 개발 서버 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 특정 포트 사용
PORT=3001 npm run dev
```

## 🐛 디버깅 체크리스트

### API 에러 발생 시
1. **로컬에서 재현**
   - 개발 서버 콘솔 로그 확인
   - 브라우저 개발자 도구 네트워크 탭 확인
   - API 응답 상세 내용 확인

2. **환경 변수 확인**
   ```javascript
   console.log('ENV Check:', {
     hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
     hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
     hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY
   })
   ```

3. **Supabase 연결 테스트**
   ```javascript
   // API route에서 테스트
   const { data, error } = await supabase.from('profiles').select('*').limit(1)
   console.log('Supabase test:', { data, error })
   ```

### Vercel 로그 확인
1. **Vercel Dashboard** → **Functions** → **Logs**
2. **실시간 로그**: Function 실행 시 console.log 출력 확인
3. **에러 로그**: 500 에러 시 상세 스택 트레이스 확인

## ⚠️ 주의사항

### 절대 하지 말아야 할 것
- ❌ 로컬 테스트 없이 바로 배포
- ❌ console.log 없이 에러 디버깅
- ❌ 환경 변수 확인 없이 API 수정

### 반드시 해야 할 것
- ✅ 로컬에서 기능 완전 테스트
- ✅ 빌드 성공 확인
- ✅ 에러 처리 및 로깅 추가
- ✅ Vercel 환경 변수와 로컬 환경 변수 동기화

## 📝 테스트 시나리오

### 사용자 관리 테스트
1. 로그인 (관리자 계정)
2. 사용자 목록 조회
3. 새 사용자 추가
4. 추가된 사용자로 로그인 테스트
5. 사용자 정보 수정
6. 사용자 삭제

### API 테스트
```bash
# 로컬 API 테스트
curl -X POST http://localhost:8081/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"테스트","email":"test@test.com","password":"test123"}'
```

## 🚀 배포 체크리스트

- [ ] 로컬에서 모든 기능 테스트 완료
- [ ] npm run build 성공
- [ ] 콘솔 에러 없음
- [ ] API 응답 정상
- [ ] 환경 변수 설정 확인
- [ ] Git 커밋 메시지 명확
- [ ] Vercel 빌드 성공
- [ ] 프로덕션 테스트 완료

---

**이 문서는 모든 개발 작업 시 참고해야 할 필수 가이드입니다.**