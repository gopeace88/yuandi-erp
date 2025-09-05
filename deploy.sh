#!/bin/bash

# YUANDI ERP Deployment Script
# This script helps you deploy the project to Vercel

echo "🚀 YUANDI ERP Deployment Script"
echo "================================"
echo ""

# Check if git is configured
if [ -z "$(git config --global user.email)" ]; then
    echo "📧 Setting up Git configuration..."
    git config --global user.email "gopeace88@gmail.com"
    git config --global user.name "gopeace88"
fi

# Create a deployment branch
echo "🔄 Creating deployment branch..."
git checkout -b deploy-$(date +%Y%m%d-%H%M%S)

# Add all files
echo "📦 Adding files to git..."
git add -A

# Commit if there are changes
if ! git diff --staged --quiet; then
    echo "💾 Committing changes..."
    git commit -m "Deploy: YUANDI ERP System $(date +%Y-%m-%d)"
fi

echo ""
echo "✅ Git preparation complete!"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Create a GitHub repository:"
echo "   Go to: https://github.com/new"
echo "   Repository name: yuandi-erp"
echo "   Make it Public or Private"
echo "   Don't initialize with README"
echo ""
echo "2. Get a GitHub Personal Access Token:"
echo "   Go to: https://github.com/settings/tokens/new"
echo "   Select 'repo' scope"
echo "   Generate token and copy it"
echo ""
echo "3. Push to GitHub:"
echo "   Run: git push https://YOUR_TOKEN@github.com/gopeace88/yuandi-erp.git deploy-$(date +%Y%m%d-%H%M%S)"
echo ""
echo "4. Deploy on Vercel:"
echo "   Go to: https://vercel.com/import"
echo "   Import your GitHub repository"
echo "   Add environment variables (see .env.example)"
echo ""
echo "🎯 Quick Deploy Link (after GitHub push):"
echo "https://vercel.com/import/git?repository-url=https://github.com/gopeace88/yuandi-erp"
echo ""
echo "📝 Required Environment Variables for Vercel:"
echo "============================================"
echo "NEXT_PUBLIC_SUPABASE_URL"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "SUPABASE_SERVICE_ROLE_KEY"
echo "CRON_SECRET"
echo "SESSION_SECRET"
echo "RESEND_API_KEY (optional)"
echo "TWILIO_ACCOUNT_SID (optional)"
echo ""