#!/bin/bash

# YUANDI-ERP Synology NAS 배포 스크립트

echo "🚀 YUANDI-ERP NAS 배포 시작..."

# 환경 변수 확인
if [ ! -f .env.production ]; then
    echo "⚠️  .env.production 파일이 없습니다."
    echo "📝 .env.local을 복사하여 .env.production을 생성합니다..."
    cp .env.local .env.production
    echo "✅ .env.production 파일을 확인하고 필요시 수정하세요."
fi

# Docker 이미지 빌드
echo "🔨 Docker 이미지 빌드 중..."
docker build -t yuandi-erp:latest .

if [ $? -eq 0 ]; then
    echo "✅ Docker 이미지 빌드 성공!"
else
    echo "❌ Docker 이미지 빌드 실패"
    exit 1
fi

# 기존 컨테이너 중지 및 제거
echo "🛑 기존 컨테이너 중지..."
docker-compose down

# 새 컨테이너 시작
echo "🚀 새 컨테이너 시작..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo "✅ 배포 완료!"
    echo "🌐 http://localhost:3000 에서 확인하세요"
    echo ""
    echo "📋 유용한 명령어:"
    echo "  - 로그 확인: docker-compose logs -f"
    echo "  - 컨테이너 중지: docker-compose down"
    echo "  - 컨테이너 재시작: docker-compose restart"
else
    echo "❌ 컨테이너 시작 실패"
    exit 1
fi