#!/bin/bash

# Vercel Environment Variables Setup Script
# This script helps set up environment variables in Vercel

echo "🚀 YUANDI Vercel Environment Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI is not installed${NC}"
    echo "Please install it with: npm i -g vercel"
    exit 1
fi

echo -e "${GREEN}✅ Vercel CLI found${NC}"
echo ""

# Login to Vercel
echo "📝 Logging in to Vercel..."
vercel login

# Link project
echo ""
echo "🔗 Linking project to Vercel..."
vercel link

# Function to add environment variable
add_env_var() {
    local key=$1
    local value=$2
    local env=$3
    
    echo "Adding $key to $env environment..."
    echo "$value" | vercel env add $key $env
}

# Read .env.production file
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production file not found${NC}"
    exit 1
fi

echo ""
echo "📋 Setting up environment variables..."
echo ""

# Critical variables that must be set
CRITICAL_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_API_KEY"
    "SUPABASE_API_KEY"
    "NEXT_PUBLIC_APP_URL"
    "CSRF_SECRET"
    "ENCRYPTION_KEY"
)

# Prompt for critical variables
for var in "${CRITICAL_VARS[@]}"; do
    echo -e "${YELLOW}Enter value for $var:${NC}"
    read -s value
    echo ""
    
    if [ -z "$value" ]; then
        echo -e "${RED}❌ $var cannot be empty${NC}"
        exit 1
    fi
    
    # Add to all environments
    add_env_var "$var" "$value" "production"
    add_env_var "$var" "$value" "preview"
    
    # For public variables, also add to development
    if [[ $var == NEXT_PUBLIC_* ]]; then
        add_env_var "$var" "$value" "development"
    fi
done

echo ""
echo -e "${GREEN}✅ Critical environment variables set${NC}"
echo ""

# Optional: Set up Sentry
echo -e "${YELLOW}Do you want to set up Sentry error tracking? (y/n)${NC}"
read setup_sentry

if [ "$setup_sentry" = "y" ]; then
    echo "Enter Sentry DSN:"
    read sentry_dsn
    add_env_var "NEXT_PUBLIC_SENTRY_DSN" "$sentry_dsn" "production"
    add_env_var "NEXT_PUBLIC_SENTRY_DSN" "$sentry_dsn" "preview"
    
    echo "Enter Sentry Auth Token:"
    read -s sentry_token
    add_env_var "SENTRY_AUTH_TOKEN" "$sentry_token" "production"
    echo ""
fi

# Generate secure random values
echo ""
echo "🔐 Generating secure random values..."

# Generate CRON_SECRET
CRON_SECRET=$(openssl rand -hex 32)
add_env_var "CRON_SECRET" "$CRON_SECRET" "production"
echo -e "${GREEN}✅ CRON_SECRET generated and set${NC}"

# Generate REVALIDATE_SECRET
REVALIDATE_SECRET=$(openssl rand -hex 32)
add_env_var "REVALIDATE_SECRET" "$REVALIDATE_SECRET" "production"
echo -e "${GREEN}✅ REVALIDATE_SECRET generated and set${NC}"

echo ""
echo "📊 Environment Variable Summary:"
echo "================================"
vercel env ls

echo ""
echo -e "${GREEN}✅ Vercel environment setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify all variables in Vercel Dashboard"
echo "2. Set up custom domain in Vercel Dashboard"
echo "3. Deploy with: vercel --prod"
echo ""
echo "Important reminders:"
echo "- Never commit .env files to Git"
echo "- Rotate secrets regularly"
echo "- Use different values for production and staging"