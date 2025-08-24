#!/bin/bash

# Portainer용 Docker 이미지 빌드 스크립트

echo "🚀 YUANDI-ERP Docker 이미지 빌드 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 이미지 이름과 태그
IMAGE_NAME="yuandi-erp"
TAG="latest"

# 빌드 시작
echo -e "${YELLOW}📦 이미지 빌드 중...${NC}"
docker build -t ${IMAGE_NAME}:${TAG} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker 이미지 빌드 성공!${NC}"
    echo ""
    echo -e "${GREEN}이미지 정보:${NC}"
    docker images | grep ${IMAGE_NAME}
    echo ""
    echo -e "${YELLOW}📋 다음 단계:${NC}"
    echo "1. Portainer 웹 UI 접속 (http://your-nas:9000)"
    echo "2. Stacks → Add stack"
    echo "3. docker-compose.portainer.yml 내용 복사"
    echo "4. 환경 변수 설정"
    echo "5. Deploy the stack 클릭"
    echo ""
    echo -e "${GREEN}✨ 준비 완료!${NC}"
else
    echo -e "${RED}❌ Docker 이미지 빌드 실패${NC}"
    echo "로그를 확인하세요."
    exit 1
fi

# 옵션: 이미지를 tar로 저장 (다른 NAS로 이동시)
read -p "이미지를 tar 파일로 저장하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}💾 이미지를 tar 파일로 저장 중...${NC}"
    docker save ${IMAGE_NAME}:${TAG} -o ${IMAGE_NAME}-${TAG}.tar
    echo -e "${GREEN}✅ 저장 완료: ${IMAGE_NAME}-${TAG}.tar${NC}"
    echo "다른 서버에서 로드: docker load -i ${IMAGE_NAME}-${TAG}.tar"
fi