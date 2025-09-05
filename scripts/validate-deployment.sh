#!/bin/bash

#######################################################
# YUANDI ERP - Deployment Validation Script
# 
# 프로덕션 배포 후 시스템 검증 자동화
#######################################################

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 환경 변수
PRODUCTION_URL="${PRODUCTION_URL:-https://yuandi-erp.vercel.app}"
API_URL="${PRODUCTION_URL}/api"
HEALTH_CHECK_TIMEOUT=30
PERFORMANCE_THRESHOLD_LCP=2500
PERFORMANCE_THRESHOLD_FID=100
PERFORMANCE_THRESHOLD_CLS=0.1
ERROR_COUNT=0
WARNING_COUNT=0
SUCCESS_COUNT=0

# 로깅 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((SUCCESS_COUNT++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    ((WARNING_COUNT++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((ERROR_COUNT++))
}

# 프로그레스 바
show_progress() {
    local duration=$1
    local message=$2
    echo -n "$message"
    for i in $(seq 1 $duration); do
        echo -n "."
        sleep 1
    done
    echo " Done"
}

#######################################################
# 1. 기본 연결 확인
#######################################################

validate_basic_connectivity() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}     1. 기본 연결 확인${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    # HTTP 상태 확인
    log_info "프로덕션 URL 연결 확인: $PRODUCTION_URL"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL")
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        log_success "메인 페이지 접속 성공 (HTTP $HTTP_STATUS)"
    else
        log_error "메인 페이지 접속 실패 (HTTP $HTTP_STATUS)"
    fi

    # SSL 인증서 확인
    log_info "SSL 인증서 확인"
    SSL_CHECK=$(curl -s -I "$PRODUCTION_URL" 2>&1 | grep -c "SSL certificate" || true)
    
    if [ "$SSL_CHECK" -eq 0 ]; then
        log_success "SSL 인증서 정상"
    else
        log_error "SSL 인증서 문제 발견"
    fi

    # DNS 확인
    log_info "DNS 확인"
    DOMAIN=$(echo "$PRODUCTION_URL" | sed 's|https://||' | sed 's|/.*||')
    DNS_CHECK=$(nslookup "$DOMAIN" 2>&1 | grep -c "can't find" || true)
    
    if [ "$DNS_CHECK" -eq 0 ]; then
        log_success "DNS 정상 작동"
    else
        log_error "DNS 문제 발견"
    fi
}

#######################################################
# 2. API 엔드포인트 확인
#######################################################

validate_api_endpoints() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}     2. API 엔드포인트 확인${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    # 주요 API 엔드포인트 목록
    ENDPOINTS=(
        "/dashboard/summary"
        "/products"
        "/orders"
        "/inventory/report"
        "/cashbook/summary"
        "/settings"
    )

    for endpoint in "${ENDPOINTS[@]}"; do
        log_info "API 엔드포인트 확인: $endpoint"
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint" -H "Authorization: Bearer test")
        
        # 401은 인증 필요를 의미하므로 정상
        if [ "$HTTP_STATUS" -eq 401 ] || [ "$HTTP_STATUS" -eq 200 ]; then
            log_success "엔드포인트 응답 정상: $endpoint (HTTP $HTTP_STATUS)"
        else
            log_error "엔드포인트 응답 비정상: $endpoint (HTTP $HTTP_STATUS)"
        fi
    done
}

#######################################################
# 3. 데이터베이스 연결 확인
#######################################################

validate_database_connection() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}     3. 데이터베이스 연결 확인${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    # Health check endpoint
    log_info "데이터베이스 헬스체크"
    HEALTH_RESPONSE=$(curl -s "$API_URL/health" 2>/dev/null || echo "{}")
    
    if echo "$HEALTH_RESPONSE" | grep -q "database.*ok"; then
        log_success "데이터베이스 연결 정상"
    else
        log_warning "데이터베이스 헬스체크 엔드포인트 없음 또는 응답 없음"
    fi
}

#######################################################
# 4. 페이지 로딩 확인
#######################################################

validate_page_loading() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}     4. 페이지 로딩 확인${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    PAGES=(
        "/"
        "/login"
        "/dashboard"
        "/orders"
        "/products"
        "/inventory"
        "/shipments"
        "/cashbook"
        "/users"
        "/settings"
        "/track"
    )

    for page in "${PAGES[@]}"; do
        log_info "페이지 로딩 확인: $page"
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL$page")
        
        # 200 또는 307(리다이렉트)는 정상
        if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 307 ] || [ "$HTTP_STATUS" -eq 302 ]; then
            log_success "페이지 로딩 성공: $page (HTTP $HTTP_STATUS)"
        else
            log_error "페이지 로딩 실패: $page (HTTP $HTTP_STATUS)"
        fi
    done
}

#######################################################
# 5. 성능 메트릭 확인
#######################################################

validate_performance_metrics() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}     5. 성능 메트릭 확인${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    log_info "페이지 로드 시간 측정"
    
    # 메인 페이지 로드 시간
    LOAD_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$PRODUCTION_URL")
    LOAD_TIME_MS=$(echo "$LOAD_TIME * 1000" | bc | cut -d'.' -f1)
    
    if [ "$LOAD_TIME_MS" -lt 3000 ]; then
        log_success "메인 페이지 로드 시간: ${LOAD_TIME_MS}ms (< 3000ms)"
    else
        log_warning "메인 페이지 로드 시간: ${LOAD_TIME_MS}ms (> 3000ms)"
    fi

    # API 응답 시간
    log_info "API 응답 시간 측정"
    API_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL/health" 2>/dev/null || echo "1")
    API_TIME_MS=$(echo "$API_TIME * 1000" | bc | cut -d'.' -f1)
    
    if [ "$API_TIME_MS" -lt 500 ]; then
        log_success "API 응답 시간: ${API_TIME_MS}ms (< 500ms)"
    else
        log_warning "API 응답 시간: ${API_TIME_MS}ms (> 500ms)"
    fi
}

#######################################################
# 6. 보안 헤더 확인
#######################################################

validate_security_headers() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}     6. 보안 헤더 확인${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    HEADERS=$(curl -s -I "$PRODUCTION_URL")
    
    # 필수 보안 헤더 확인
    SECURITY_HEADERS=(
        "Strict-Transport-Security"
        "X-Content-Type-Options"
        "X-Frame-Options"
        "Content-Security-Policy"
    )

    for header in "${SECURITY_HEADERS[@]}"; do
        log_info "보안 헤더 확인: $header"
        if echo "$HEADERS" | grep -qi "$header"; then
            log_success "$header 헤더 존재"
        else
            log_warning "$header 헤더 누락"
        fi
    done
}

#######################################################
# 7. 환경 변수 확인
#######################################################

validate_environment_variables() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}     7. 환경 변수 확인${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    log_info "필수 환경 변수 설정 확인 (API 응답으로 간접 확인)"
    
    # API 호출로 환경 변수 설정 여부 간접 확인
    CONFIG_CHECK=$(curl -s "$API_URL/config/check" 2>/dev/null || echo "{}")
    
    if echo "$CONFIG_CHECK" | grep -q "supabase.*configured"; then
        log_success "Supabase 설정 확인"
    else
        log_warning "환경 변수 확인 엔드포인트 없음"
    fi
}

#######################################################
# 8. 정적 자산 확인
#######################################################

validate_static_assets() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}     8. 정적 자산 확인${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    # 정적 자산 경로 확인
    ASSETS=(
        "/_next/static"
        "/favicon.ico"
    )

    for asset in "${ASSETS[@]}"; do
        log_info "정적 자산 확인: $asset"
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL$asset" | head -1)
        
        if [ "$HTTP_STATUS" != "404" ]; then
            log_success "정적 자산 접근 가능: $asset"
        else
            log_error "정적 자산 접근 불가: $asset"
        fi
    done
}

#######################################################
# 9. 국제화(i18n) 확인
#######################################################

validate_internationalization() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}     9. 국제화(i18n) 확인${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    LOCALES=("ko" "zh-CN")
    
    for locale in "${LOCALES[@]}"; do
        log_info "로케일 확인: $locale"
        RESPONSE=$(curl -s "$PRODUCTION_URL" -H "Accept-Language: $locale")
        
        if echo "$RESPONSE" | grep -q "lang=\"$locale\""; then
            log_success "로케일 지원 확인: $locale"
        else
            log_warning "로케일 확인 불가: $locale"
        fi
    done
}

#######################################################
# 10. 모니터링 통합 확인
#######################################################

validate_monitoring_integration() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}     10. 모니터링 통합 확인${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    log_info "Vercel Analytics 통합 확인"
    RESPONSE=$(curl -s "$PRODUCTION_URL")
    
    if echo "$RESPONSE" | grep -q "vercel-analytics"; then
        log_success "Vercel Analytics 통합 확인"
    else
        log_warning "Vercel Analytics 스크립트 없음"
    fi

    log_info "에러 트래킹 확인"
    if echo "$RESPONSE" | grep -q "sentry\|bugsnag\|datadog"; then
        log_success "에러 트래킹 도구 통합 확인"
    else
        log_warning "에러 트래킹 도구 미확인"
    fi
}

#######################################################
# 11. 백업 시스템 확인
#######################################################

validate_backup_system() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}     11. 백업 시스템 확인${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    log_info "백업 엔드포인트 확인"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/admin/backup/status" -H "Authorization: Bearer test")
    
    if [ "$HTTP_STATUS" -eq 401 ] || [ "$HTTP_STATUS" -eq 200 ]; then
        log_success "백업 시스템 엔드포인트 응답"
    else
        log_warning "백업 시스템 엔드포인트 확인 불가"
    fi
}

#######################################################
# 12. 고객 포털 확인
#######################################################

validate_customer_portal() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}     12. 고객 포털 확인${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    log_info "고객 포털 접근성 확인"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL/track")
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        log_success "고객 포털 접근 가능"
    else
        log_error "고객 포털 접근 불가 (HTTP $HTTP_STATUS)"
    fi

    log_info "고객 주문 조회 API 확인"
    RESPONSE=$(curl -s "$API_URL/track?name=test&phone=010-0000-0000")
    
    if echo "$RESPONSE" | grep -q "success\|error"; then
        log_success "고객 주문 조회 API 응답"
    else
        log_warning "고객 주문 조회 API 응답 확인 불가"
    fi
}

#######################################################
# 메인 실행 함수
#######################################################

main() {
    echo -e "\n${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}     YUANDI ERP 배포 검증 시작${NC}"
    echo -e "${GREEN}     URL: $PRODUCTION_URL${NC}"
    echo -e "${GREEN}     시간: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}\n"

    # 검증 수행
    validate_basic_connectivity
    validate_api_endpoints
    validate_database_connection
    validate_page_loading
    validate_performance_metrics
    validate_security_headers
    validate_environment_variables
    validate_static_assets
    validate_internationalization
    validate_monitoring_integration
    validate_backup_system
    validate_customer_portal

    # 결과 요약
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}     검증 결과 요약${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

    echo -e "${GREEN}성공: $SUCCESS_COUNT${NC}"
    echo -e "${YELLOW}경고: $WARNING_COUNT${NC}"
    echo -e "${RED}오류: $ERROR_COUNT${NC}"

    # 최종 판단
    if [ "$ERROR_COUNT" -eq 0 ]; then
        echo -e "\n${GREEN}✅ 배포 검증 성공!${NC}"
        echo -e "${GREEN}프로덕션 배포가 정상적으로 완료되었습니다.${NC}"
        
        if [ "$WARNING_COUNT" -gt 0 ]; then
            echo -e "${YELLOW}⚠️  $WARNING_COUNT 개의 경고가 발견되었습니다. 검토가 필요합니다.${NC}"
        fi
        
        exit 0
    else
        echo -e "\n${RED}❌ 배포 검증 실패!${NC}"
        echo -e "${RED}$ERROR_COUNT 개의 오류가 발견되었습니다. 즉시 조치가 필요합니다.${NC}"
        exit 1
    fi
}

# 스크립트 실행
main "$@"