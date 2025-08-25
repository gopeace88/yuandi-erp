#!/bin/bash

# YUANDI ERP 배포 스크립트
echo "🚀 YUANDI ERP 배포를 시작합니다..."

# Git 설정
git config --global user.email "yuandi1020@gmail.com"
git config --global user.name "YUANDI"

# 변경사항 커밋
git add -A
git commit -m "Deploy YUANDI ERP to production" || echo "No changes to commit"

# GitHub에 푸시 (저장소 URL을 실제 URL로 변경하세요)
echo "📦 GitHub에 푸시 중..."
echo "다음 명령어를 실행하세요:"
echo ""
echo "git remote add origin https://github.com/[your-username]/yuandi-erp.git"
echo "git push -u origin main"
echo ""
echo "또는 GitHub Personal Access Token을 사용하여:"
echo "git remote add origin https://[your-token]@github.com/[your-username]/yuandi-erp.git"
echo "git push -u origin main"
echo ""
echo "✅ GitHub 푸시 후 Vercel에서 자동 배포됩니다!"