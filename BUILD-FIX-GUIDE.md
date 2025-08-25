# 🔧 YUANDI-ERP 빌드 에러 해결 가이드

> git 커밋 분석을 통한 빌드 실패 원인과 해결 방법

## 📊 빌드 상태 분석

### 커밋 히스토리
- ✅ **71fcc6e**: 빌드 성공 (Portainer-specific deployment configuration)
- ❌ **6c49a43**: 빌드 실패 (Optimize for Vercel deployment)
- ❌ **87dd5ef**: 빌드 실패 (Add Vercel optimization guide)

## 🔍 빌드 실패 원인 분석

### 주요 변경사항 (71fcc6e → 6c49a43)

#### 1. 패키지 매니저 변경 ❌
```diff
# package.json
- "install:ci": "npm install --legacy-peer-deps"
+ "install:ci": "pnpm i --frozen-lockfile"
```
**문제**: pnpm으로 변경했지만 pnpm-lock.yaml 파일이 없음

#### 2. Node.js 버전 요구사항 변경 ⚠️
```diff
"engines": {
-  "node": ">=18.0.0",
-  "npm": ">=8.0.0"
+  "node": ">=20.0.0"
}
```
**문제**: Vercel이 Node 20을 지원하지만, 일부 의존성이 호환되지 않을 수 있음

#### 3. sharp 패키지 제거 ✅
```diff
- "sharp": "^0.33.0",
```
**좋음**: 네이티브 모듈 제거는 Vercel 빌드에 도움

#### 4. vercel.json 명령어 변경 ❌
```diff
- "buildCommand": "npm run build",
- "installCommand": "npm run install:ci",
+ "buildCommand": "pnpm build",
+ "installCommand": "pnpm i --frozen-lockfile",
+ "nodeVersion": "20.x",
```
**문제**: pnpm 사용하지만 lock 파일 없음

#### 5. next.config.js experimental 추가 ⚠️
```diff
+ experimental: {
+   serverActions: {
+     allowedOrigins: ['*'],
+     bodySizeLimit: '2mb'
+   }
+ },
```
**주의**: 일부 환경에서 문제 발생 가능

## ✅ 해결 방법

### Option 1: npm 사용 유지 (권장)
```bash
# 1. 설정 파일 복원
git checkout 71fcc6e -- package.json vercel.json

# 2. sharp 패키지만 제거
npm uninstall sharp

# 3. package-lock.json 재생성
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 4. 빌드 테스트
npm run build
```

### Option 2: pnpm으로 마이그레이션
```bash
# 1. pnpm 설치
npm install -g pnpm

# 2. pnpm lock 파일 생성
rm -rf node_modules package-lock.json
pnpm import  # package-lock.json을 pnpm-lock.yaml로 변환
pnpm install

# 3. vercel.json 업데이트
{
  "installCommand": "pnpm i --frozen-lockfile",
  "buildCommand": "pnpm build"
}

# 4. 빌드 테스트
pnpm build
```

### Option 3: 최소 변경 (가장 안전)
```bash
# 1. 성공한 커밋으로 복원
git checkout 71fcc6e -- .

# 2. sharp만 제거 (네이티브 모듈 문제 해결)
npm uninstall sharp

# 3. package.json에서 sharp 참조 제거 확인
# 4. 커밋 및 배포
git add -A
git commit -m "Fix: Remove sharp for Vercel compatibility"
git push
```

## 🛠️ Vercel 빌드 최적화 설정

### package.json (권장)
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "install:ci": "npm ci --legacy-peer-deps"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### vercel.json (권장)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm ci --legacy-peer-deps",
  "regions": ["icn1"]
}
```

### next.config.js (권장)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['recharts'],
  output: 'standalone',
  
  // Vercel에서 문제가 되면 제거
  // experimental: {
  //   serverActions: { ... }
  // }
}

module.exports = nextConfig
```

## 🚨 일반적인 Vercel 빌드 에러와 해결

### 1. "Module not found" 에러
```bash
# 해결: 캐시 삭제 후 재설치
rm -rf .next node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

### 2. "Cannot find module 'sharp'" 에러
```bash
# 해결: sharp 제거 및 Next.js 내장 이미지 최적화 사용
npm uninstall sharp
# next.config.js에서 이미지 설정 확인
```

### 3. "pnpm: command not found" 에러
```bash
# 해결: npm 사용으로 변경
# vercel.json에서 모든 pnpm 명령을 npm으로 변경
```

### 4. "ENOENT: no such file or directory" 에러
```bash
# 해결: Git에 모든 필요 파일 커밋 확인
git status
git add .
git commit -m "Add missing files"
```

## 📝 체크리스트

빌드 배포 전 확인사항:

- [ ] `package-lock.json` 파일 존재 (npm 사용 시)
- [ ] `pnpm-lock.yaml` 파일 존재 (pnpm 사용 시)  
- [ ] `vercel.json`의 명령어가 패키지 매니저와 일치
- [ ] 네이티브 모듈 제거 (sharp, bcrypt 등)
- [ ] Node.js 버전 호환성 확인
- [ ] 환경 변수 설정 완료
- [ ] 로컬 빌드 성공 확인

## 🎯 권장 조치

1. **즉시 조치**: Option 3 (최소 변경) 적용
2. **안정화 후**: 점진적으로 최적화 적용
3. **장기적**: Docker 기반 배포로 전환 고려

---

*이 가이드는 git 커밋 71fcc6e (성공) vs 6c49a43, 87dd5ef (실패) 분석 기반으로 작성되었습니다.*