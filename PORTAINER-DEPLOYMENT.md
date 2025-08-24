# Portainer 배포 가이드

## 📋 사전 준비

1. **Docker 이미지 빌드** (NAS SSH 또는 로컬에서)
2. **Portainer 접속**: `http://your-nas:9000`

## 🚀 배포 방법

### 방법 1: Portainer Stack 사용 (가장 쉬움) ⭐

1. **Portainer 웹 UI 접속**
   ```
   http://your-nas:9000
   ```

2. **Stack 생성**
   - 왼쪽 메뉴 → `Stacks` → `Add stack`
   - Name: `yuandi-erp`

3. **Web editor에 docker-compose 복사**
   ```yaml
   version: '3.8'

   services:
     yuandi-erp:
       image: yuandi-erp:latest
       container_name: yuandi-erp
       restart: unless-stopped
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - NEXT_PUBLIC_SUPABASE_URL=https://eikwfesvmohfpokgeqtv.supabase.co
         - NEXT_PUBLIC_SUPABASE_API_KEY=${NEXT_PUBLIC_SUPABASE_API_KEY}
         - SUPABASE_API_KEY=${SUPABASE_API_KEY}
         - SESSION_SECRET=${SESSION_SECRET}
         - NEXT_PUBLIC_APP_URL=http://${NAS_IP}:3000
       volumes:
         - yuandi-uploads:/app/uploads
         - yuandi-logs:/app/logs
       networks:
         - yuandi-network

   networks:
     yuandi-network:
       driver: bridge

   volumes:
     yuandi-uploads:
       driver: local
     yuandi-logs:
       driver: local
   ```

4. **Environment variables 설정** (하단 섹션)
   ```
   NEXT_PUBLIC_SUPABASE_API_KEY=eyJhbGc...
   SUPABASE_API_KEY=eyJhbGc...
   SESSION_SECRET=your-32-character-random-string
   NAS_IP=192.168.1.100
   ```

5. **Deploy the stack** 클릭

### 방법 2: Git Repository 연동

1. **Stacks** → **Add stack**
2. **Repository** 선택
3. Repository URL: `https://github.com/gopeace88/yuandi-erp`
4. Compose path: `docker-compose.portainer.yml`
5. **환경 변수 설정**
6. **Deploy**

### 방법 3: Dockerfile 직접 빌드

1. **Images** → **Build a new image**
2. **Upload** 방식 선택
3. Dockerfile 업로드 또는 URL 입력
4. Image name: `yuandi-erp:latest`
5. **Build the image**
6. 빌드 완료 후 Container 생성

## ⚙️ 환경 변수 설정

Portainer Stack의 Environment variables 섹션:

```bash
# 필수 설정
NEXT_PUBLIC_SUPABASE_API_KEY=your_public_key_here
SUPABASE_API_KEY=your_service_key_here
SESSION_SECRET=generate_32_char_random_string
NAS_IP=192.168.1.100

# 선택 설정
NODE_ENV=production
PORT=3000
```

## 🔧 Portainer 고급 설정

### 1. Resource Limits
Container 설정에서:
- Memory: `1024 MB`
- CPU: `1.0`

### 2. Restart Policy
- `Unless stopped` 선택 (기본값)

### 3. Networks
- Bridge 네트워크 사용
- 또는 기존 네트워크 선택

### 4. Volumes
- `/app/uploads` → NAS 경로 매핑
- `/app/logs` → 로그 저장 경로

## 📊 모니터링

### Portainer Dashboard에서:
1. **Containers** → `yuandi-erp` 선택
2. **Stats**: CPU, Memory, Network 실시간 모니터링
3. **Logs**: 실시간 로그 확인
4. **Console**: 컨테이너 내부 접속

### 로그 확인
```bash
# Portainer UI에서
Containers → yuandi-erp → Logs

# 또는 SSH에서
docker logs -f yuandi-erp --tail 100
```

## 🔄 업데이트 절차

### 1. 새 이미지 빌드
```bash
# SSH 접속 후
cd /volume1/docker/yuandi-erp
git pull
docker build -t yuandi-erp:latest .
```

### 2. Portainer에서 재배포
1. **Stacks** → `yuandi-erp`
2. **Stop** 클릭
3. **Start** 클릭 (자동으로 새 이미지 사용)

### 또는 Watchtower 자동 업데이트
```yaml
# docker-compose에 추가
labels:
  - "com.centurylinklabs.watchtower.enable=true"
```

## 🛡️ 보안 설정

### 1. Portainer 접근 제한
- Admin → Settings → Authentication
- OAuth2/LDAP 설정

### 2. HTTPS 설정 (Traefik 사용)
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.yuandi.rule=Host(`erp.yourdomain.com`)"
  - "traefik.http.routers.yuandi.tls=true"
```

### 3. 네트워크 격리
- 별도 Docker 네트워크 생성
- 필요한 컨테이너만 연결

## 🎯 Portainer 장점

1. **GUI 관리**: 명령어 없이 모든 작업 가능
2. **실시간 모니터링**: CPU, 메모리, 네트워크 시각화
3. **쉬운 업데이트**: 클릭 몇 번으로 재배포
4. **로그 관리**: 웹에서 실시간 로그 확인
5. **백업/복원**: Stack 설정 export/import
6. **멀티 호스트**: 여러 Docker 호스트 관리

## ⚡ 빠른 시작

```bash
# 1. SSH로 이미지 빌드
ssh admin@nas
cd /volume1/docker
git clone https://github.com/gopeace88/yuandi-erp
cd yuandi-erp
docker build -t yuandi-erp:latest .

# 2. Portainer 웹 UI에서
# - Stack 생성
# - docker-compose.portainer.yml 내용 붙여넣기
# - 환경 변수 설정
# - Deploy!
```

## 🆘 문제 해결

### 컨테이너가 시작되지 않을 때
1. Portainer → Containers → yuandi-erp → Logs 확인
2. 환경 변수 확인
3. 포트 충돌 확인

### 이미지를 찾을 수 없을 때
1. Images 메뉴에서 이미지 확인
2. 이미지 태그 확인 (`:latest`)
3. 필요시 재빌드

### 성능 이슈
1. Container → Stats에서 리소스 사용량 확인
2. Resource limits 조정
3. 불필요한 로그 정리

## 📝 팁

- **템플릿 저장**: Stack 설정을 Template으로 저장
- **환경별 설정**: dev/prod Stack 분리
- **자동 백업**: Portainer 설정 정기 백업
- **알림 설정**: Container 다운시 알림