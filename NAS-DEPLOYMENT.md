# Synology NAS 배포 가이드

## 📋 사전 준비사항

### 1. Synology NAS 설정
- Container Manager (구 Docker) 패키지 설치
- Git Server 패키지 설치 (선택사항)
- Web Station 패키지 설치 (리버스 프록시용)

### 2. 포트 설정
- 3000번 포트 개방 (또는 원하는 포트)
- 공유기 포트포워딩 설정 (외부 접속 필요시)

## 🚀 배포 방법

### 방법 1: Container Manager GUI 사용

1. **프로젝트 업로드**
   - File Station에서 `/docker/yuandi-erp` 폴더 생성
   - 프로젝트 파일 전체 업로드

2. **Container Manager 실행**
   - 프로젝트 → 생성 → docker-compose.yml 업로드
   - 환경 변수 설정
   - 실행

### 방법 2: SSH 터미널 사용 (추천)

```bash
# SSH 접속
ssh admin@your-nas-ip

# Docker 폴더로 이동
cd /volume1/docker

# 프로젝트 클론
git clone https://github.com/gopeace88/yuandi-erp.git
cd yuandi-erp

# 환경 변수 설정
cp .env.local .env.production
nano .env.production  # 필요한 값 수정

# 배포 스크립트 실행
chmod +x deploy-nas.sh
./deploy-nas.sh
```

## ⚙️ 환경 변수 설정

`.env.production` 파일 생성:

```env
# Supabase 설정 (기존 값 유지)
NEXT_PUBLIC_SUPABASE_URL=https://eikwfesvmohfpokgeqtv.supabase.co
NEXT_PUBLIC_SUPABASE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 세션 설정
SESSION_SECRET=your-32-character-random-string-here

# 앱 URL (NAS IP 주소로 변경)
NEXT_PUBLIC_APP_URL=http://192.168.1.100:3000  # 내부 IP
# 또는
NEXT_PUBLIC_APP_URL=https://your-domain.com  # 외부 도메인
```

## 🔒 보안 설정

### 1. HTTPS 설정 (권장)

Synology DSM에서:
1. 제어판 → 로그인 포털 → 고급 → 리버스 프록시
2. 새로 만들기:
   - 소스: HTTPS, 포트 443, your-domain.com
   - 대상: HTTP, localhost, 포트 3000

### 2. 방화벽 설정
- 필요한 IP만 허용
- 관리자 페이지는 내부 네트워크만 접근

### 3. 2단계 인증
- Synology 계정에 2FA 활성화

## 🔧 유지보수

### 로그 확인
```bash
# 실시간 로그
docker logs -f yuandi-erp

# 또는 Container Manager GUI에서 확인
```

### 백업
```bash
# 데이터베이스 백업 (Supabase 대시보드에서)
# 또는 자동 백업 스크립트 설정

# 컨테이너 백업
docker commit yuandi-erp yuandi-erp-backup:$(date +%Y%m%d)
```

### 업데이트
```bash
cd /volume1/docker/yuandi-erp
git pull
./deploy-nas.sh
```

## 📊 성능 최적화

### 1. 리소스 할당
Container Manager에서:
- CPU 우선순위: 중간
- 메모리 제한: 1GB (충분)

### 2. 자동 시작
- Container Manager → 컨테이너 → 자동 재시작 활성화

### 3. 모니터링
- Resource Monitor에서 CPU/메모리 사용량 확인
- 필요시 리소스 조정

## 🎯 장점

1. **완전한 제어**: 모든 설정 직접 관리
2. **비용 절감**: 추가 호스팅 비용 없음
3. **빠른 속도**: 로컬 네트워크에서 초고속
4. **제한 없음**: Cron, 메모리, API 호출 제한 없음
5. **데이터 보안**: 민감한 데이터 직접 관리

## ⚠️ 주의사항

1. **정전 대비**: UPS 사용 권장
2. **백업**: 정기적인 백업 필수
3. **보안 업데이트**: DSM 및 Docker 이미지 정기 업데이트
4. **네트워크**: 안정적인 인터넷 연결 필요 (외부 접속시)

## 🆘 문제 해결

### 컨테이너가 시작되지 않을 때
```bash
# 로그 확인
docker logs yuandi-erp

# 컨테이너 재빌드
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 메모리 부족
- Container Manager에서 메모리 제한 증가
- 불필요한 패키지 제거

### 접속 불가
- 방화벽 설정 확인
- 포트 포워딩 확인
- docker ps로 컨테이너 실행 상태 확인

## 📞 지원

문제 발생시:
1. Container Manager 로그 확인
2. `/var/log/` 시스템 로그 확인
3. GitHub Issues에 문의