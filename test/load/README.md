# YUANDI ERP 로드 테스트 가이드

이 디렉토리는 YUANDI ERP 시스템의 성능 테스트를 위한 다양한 로드 테스트 시나리오를 포함합니다.

## 📁 파일 구조

```
test/load/
├── k6-load-tests.js           # K6 로드 테스트 스크립트
├── artillery-load-test.yml    # Artillery.io 설정 파일
├── artillery-processor.js     # Artillery.io 커스텀 프로세서
├── test-data.csv             # 테스트 데이터
├── README.md                 # 이 파일
└── scripts/
    ├── run-k6-tests.sh       # K6 테스트 실행 스크립트
    ├── run-artillery-tests.sh # Artillery 테스트 실행 스크립트
    └── analyze-results.py    # 결과 분석 스크립트
```

## 🚀 테스트 도구

### 1. K6 (JavaScript 기반)
- **특징**: 개발자 친화적, 풍부한 메트릭, CI/CD 통합 우수
- **용도**: API 성능 테스트, 복잡한 시나리오 구현
- **설치**: `npm install -g k6`

### 2. Artillery.io (Node.js 기반)
- **특징**: 설정 파일 기반, 쉬운 시나리오 작성, 실시간 모니터링
- **용도**: HTTP/WebSocket 테스트, 시나리오 기반 테스트
- **설치**: `npm install -g artillery@latest`

## 📊 테스트 시나리오

### K6 테스트 시나리오

#### 1. 기본 부하 테스트 (Normal Load)
```bash
k6 run --vus 10 --duration 5m test/load/k6-load-tests.js
```
- 동시 사용자 10명, 5분간 실행
- 일반적인 사용자 패턴 시뮬레이션

#### 2. 스파이크 테스트 (Spike Test)  
```bash
k6 run --vus 100 --duration 1m test/load/k6-load-tests.js
```
- 갑작스런 트래픽 증가 시나리오
- 100명 동시 사용자, 1분간 급격한 부하

#### 3. 스트레스 테스트 (Stress Test)
```bash
k6 run --vus 50 --duration 10m test/load/k6-load-tests.js
```
- 시스템 한계점 테스트
- 점진적 부하 증가 패턴

#### 4. 지속성 테스트 (Endurance Test)
```bash
k6 run --vus 30 --duration 30m test/load/k6-load-tests.js
```
- 장시간 안정성 테스트
- 메모리 누수, 성능 저하 감지

### Artillery 테스트 시나리오

#### 1. 개발 환경 테스트
```bash
artillery run test/load/artillery-load-test.yml --environment development
```

#### 2. 스테이징 환경 테스트
```bash
artillery run test/load/artillery-load-test.yml --environment staging
```

#### 3. 프로덕션 환경 테스트
```bash
artillery run test/load/artillery-load-test.yml --environment production
```

## 🎯 성능 임계값

### 응답 시간 목표
- **95%ile**: < 1.5초
- **99%ile**: < 2.0초
- **평균**: < 800ms

### 처리량 목표
- **초당 요청 수**: > 100 RPS
- **동시 사용자**: 50명 이상 지원
- **에러율**: < 1%

### 리소스 사용량 목표
- **CPU 사용률**: < 80%
- **메모리 사용률**: < 70%
- **데이터베이스 연결**: < 80% pool 사용률

## 📋 테스트 체크리스트

### 사전 준비
- [ ] 테스트 환경 구축 완료
- [ ] 데이터베이스 초기 데이터 준비
- [ ] 모니터링 도구 설정 (Grafana, Prometheus)
- [ ] 로그 수집 시스템 활성화

### API 엔드포인트 테스트
- [ ] 인증 API (`/api/auth/login`)
- [ ] 대시보드 API (`/api/dashboard/*`)
- [ ] 제품 관리 API (`/api/products/*`)
- [ ] 주문 관리 API (`/api/orders/*`)
- [ ] 고객 포털 API (`/api/track`)
- [ ] 관리자 API (`/api/admin/*`)

### 사용자 시나리오 테스트
- [ ] 일반 사용자 워크플로우
- [ ] 관리자 업무 시나리오
- [ ] 고객 포털 사용 패턴
- [ ] 모바일 사용자 시나리오

### 성능 메트릭 확인
- [ ] 응답 시간 분포
- [ ] 처리량 (RPS)
- [ ] 에러율
- [ ] 리소스 사용률
- [ ] 데이터베이스 성능

## 🔧 테스트 실행 방법

### 1. 환경 설정
```bash
# 환경 변수 설정
export BASE_URL="http://localhost:3000"
export API_KEY="your-test-api-key"

# 필요한 패키지 설치
npm install -g k6 artillery@latest
```

### 2. K6 테스트 실행
```bash
# 기본 테스트
k6 run test/load/k6-load-tests.js

# 커스텀 설정으로 실행
k6 run --vus 20 --duration 10m --env BASE_URL=http://localhost:3000 test/load/k6-load-tests.js

# 결과를 JSON으로 저장
k6 run --out json=results.json test/load/k6-load-tests.js

# 실시간 웹 대시보드와 함께 실행
k6 run --out web-dashboard test/load/k6-load-tests.js
```

### 3. Artillery 테스트 실행
```bash
# 기본 테스트
artillery run test/load/artillery-load-test.yml

# 환경별 테스트
artillery run test/load/artillery-load-test.yml --environment staging

# 결과를 HTML 보고서로 저장
artillery run test/load/artillery-load-test.yml --output report.json
artillery report report.json

# 실시간 모니터링과 함께 실행
artillery run test/load/artillery-load-test.yml --quiet
```

## 📈 결과 분석

### K6 결과 해석
```
checks.........................: 95.12% ✓ 19024 ✗ 976
data_received..................: 2.3 GB 7.6 MB/s
data_sent......................: 1.8 MB 6.0 kB/s
http_req_blocked...............: avg=1.2ms   min=0s      med=0s      max=89ms   p(95)=0s      p(99)=12ms   
http_req_connecting............: avg=0.4ms   min=0s      med=0s      max=45ms   p(95)=0s      p(99)=4ms    
http_req_duration..............: avg=1.1s    min=89ms    med=987ms   max=30s    p(95)=2.1s    p(99)=3.2s   
http_req_failed................: 4.87%  ✓ 976  ✗ 19024
http_req_receiving.............: avg=1.2ms   min=0s      med=1ms     max=234ms  p(95)=3ms     p(99)=7ms    
http_req_sending...............: avg=0.1ms   min=0s      med=0s      max=12ms   p(95)=0s      p(99)=1ms    
http_req_tls_handshaking.......: avg=0s      min=0s      med=0s      max=0s     p(95)=0s      p(99)=0s     
http_req_waiting...............: avg=1.1s    min=88ms    med=985ms   max=30s    p(95)=2.1s    p(99)=3.2s   
http_reqs......................: 20000  66.4/s
iteration_duration.............: avg=4.2s    min=1.1s    med=4.1s    max=35s    p(95)=6.3s    p(99)=8.1s   
iterations.....................: 5000   16.6/s
vus............................: 10     min=10 max=50
vus_max........................: 50     min=50 max=50
```

### Artillery 결과 해석
```
All virtual users finished
Summary report @ 14:35:12(+0900) 2024-01-01

Scenarios launched:  1000
Scenarios completed: 995
Requests completed:  4975
Mean response/sec:   82.92
Response time (msec):
  min: 45
  max: 3210
  median: 892
  p95: 1890
  p99: 2345

Scenario counts:
  Normal User Workflow: 700 (70.00%)
  Customer Portal Usage: 200 (20.00%)
  Admin Operations: 100 (10.00%)

Codes:
  200: 4738
  400: 98
  401: 23
  404: 12
  500: 4
```

## 🚨 트러블슈팅

### 일반적인 문제들

#### 1. 높은 응답 시간
- **원인**: 데이터베이스 쿼리 최적화 필요, 인덱스 부족
- **해결**: 쿼리 프로파일링, 인덱스 추가, 커넥션 풀 최적화

#### 2. 높은 에러율
- **원인**: 동시성 처리 문제, 리소스 부족
- **해결**: 트랜잭션 처리 개선, 서버 리소스 증설

#### 3. 메모리 누수
- **원인**: 객체 해제 미흡, 캐시 메모리 누적
- **해결**: 가비지 컬렉션 모니터링, 메모리 프로파일링

#### 4. 데이터베이스 연결 고갈
- **원인**: 연결 풀 크기 부족, 연결 누수
- **해결**: 연결 풀 설정 조정, 연결 해제 로직 점검

### 성능 최적화 팁

#### 1. 서버 측 최적화
- 응답 압축 (gzip) 활성화
- 정적 파일 CDN 사용
- 데이터베이스 쿼리 최적화
- 캐시 전략 구현

#### 2. 클라이언트 측 최적화
- 이미지 최적화 및 지연 로딩
- JavaScript 번들 크기 최소화
- CSS 최적화
- 브라우저 캐싱 활용

#### 3. 인프라 최적화
- 로드 밸런서 설정
- 오토 스케일링 구성
- 모니터링 및 알람 설정
- 백업 및 복구 전략

## 📊 모니터링 및 알람

### 메트릭 수집
- **Prometheus**: 메트릭 수집 및 저장
- **Grafana**: 시각화 대시보드
- **ELK Stack**: 로그 분석
- **New Relic/DataDog**: APM 도구

### 알람 설정
```yaml
alerts:
  - name: "High Response Time"
    condition: "avg(http_req_duration) > 2000"
    action: "notify_team"
  
  - name: "High Error Rate"
    condition: "rate(http_req_failed) > 0.05"
    action: "escalate"
  
  - name: "Low Throughput"
    condition: "rate(http_reqs) < 50"
    action: "investigate"
```

## 🔄 CI/CD 통합

### GitHub Actions 예시
```yaml
name: Performance Tests
on:
  schedule:
    - cron: '0 2 * * *'  # 매일 오전 2시 실행
  
jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install K6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
          
      - name: Run Load Tests
        run: |
          k6 run --out json=results.json test/load/k6-load-tests.js
          
      - name: Upload Results
        uses: actions/upload-artifact@v2
        with:
          name: load-test-results
          path: results.json
```

## 📝 보고서 작성

### 성능 테스트 보고서 템플릿
1. **테스트 개요**
   - 목적 및 범위
   - 테스트 환경
   - 실행 일시

2. **테스트 시나리오**
   - 사용자 시나리오 설명
   - 부하 패턴
   - 테스트 데이터

3. **결과 분석**
   - 응답 시간 분석
   - 처리량 분석
   - 에러율 분석
   - 리소스 사용률

4. **문제점 및 개선사항**
   - 발견된 성능 이슈
   - 권장사항
   - 액션 플랜

5. **결론**
   - 성능 목표 달성 여부
   - 시스템 안정성 평가
   - 다음 단계 계획

## 🤝 기여 가이드

로드 테스트 개선에 기여하고 싶으시다면:

1. 새로운 테스트 시나리오 추가
2. 성능 최적화 팁 공유
3. 모니터링 메트릭 개선
4. 문서 업데이트

---

**참고 문서**:
- [K6 공식 문서](https://k6.io/docs/)
- [Artillery.io 공식 문서](https://www.artillery.io/docs)
- [성능 테스트 모범 사례](https://docs.microsoft.com/en-us/azure/architecture/antipatterns/)