#!/bin/bash

#############################################
# YUANDI ERP - System Verification Script
# Version: 2.0.0
# Purpose: Verify system readiness for deployment
#############################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

check_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNING_CHECKS++))
    ((TOTAL_CHECKS++))
}

section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Main verification
echo "╔════════════════════════════════════════╗"
echo "║   YUANDI ERP System Verification      ║"
echo "╚════════════════════════════════════════╝"

section "1. Environment Check"

# Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    if [[ $NODE_VERSION == v18* ]] || [[ $NODE_VERSION == v20* ]]; then
        check_pass "Node.js $NODE_VERSION"
    else
        check_warning "Node.js $NODE_VERSION (v18+ recommended)"
    fi
else
    check_fail "Node.js not installed"
fi

# NPM version
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    check_pass "NPM $NPM_VERSION"
else
    check_fail "NPM not installed"
fi

# Git
if command -v git &> /dev/null; then
    check_pass "Git installed"
else
    check_fail "Git not installed"
fi

section "2. Project Structure"

# Critical directories
DIRS=(
    "app"
    "components"
    "lib"
    "public"
    "supabase"
    "test"
)

for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        check_pass "Directory: $dir"
    else
        check_fail "Missing directory: $dir"
    fi
done

# Critical files
FILES=(
    "package.json"
    "tsconfig.json"
    "next.config.js"
    "tailwind.config.ts"
    "middleware.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "File: $file"
    else
        check_fail "Missing file: $file"
    fi
done

section "3. Dependencies"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    check_pass "Dependencies installed"
    
    # Check for critical packages
    PACKAGES=(
        "next"
        "react"
        "@supabase/supabase-js"
        "typescript"
        "tailwindcss"
    )
    
    for pkg in "${PACKAGES[@]}"; do
        if [ -d "node_modules/$pkg" ]; then
            check_pass "Package: $pkg"
        else
            check_fail "Missing package: $pkg"
        fi
    done
else
    check_fail "Dependencies not installed (run: npm install)"
fi

section "4. Environment Configuration"

# Check for .env files
if [ -f ".env.local" ] || [ -f ".env" ]; then
    check_pass "Environment file exists"
    
    # Check for critical env vars (without exposing values)
    if [ -f ".env.local" ]; then
        ENV_FILE=".env.local"
    else
        ENV_FILE=".env"
    fi
    
    REQUIRED_VARS=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_API_KEY"
        "SUPABASE_API_KEY"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" "$ENV_FILE"; then
            check_pass "Environment variable: $var"
        else
            check_fail "Missing environment variable: $var"
        fi
    done
else
    check_fail "No environment file (.env.local or .env)"
fi

section "5. Database & Supabase"

# Check for migrations
if [ -d "supabase/migrations" ]; then
    MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
    if [ "$MIGRATION_COUNT" -gt 0 ]; then
        check_pass "Database migrations: $MIGRATION_COUNT files"
    else
        check_warning "No migration files found"
    fi
else
    check_warning "Migrations directory not found"
fi

# Check for seed data
if [ -f "supabase/seed.sql" ]; then
    check_pass "Seed data file exists"
else
    check_warning "No seed data file (optional)"
fi

section "6. API Routes"

# Check for API routes
API_ROUTES=(
    "app/api/orders"
    "app/api/products"
    "app/api/users"
    "app/api/track"
    "app/api/cashbook"
    "app/api/shipments"
)

for route in "${API_ROUTES[@]}"; do
    if [ -d "$route" ] || [ -f "$route/route.ts" ] || [ -f "$route.ts" ]; then
        check_pass "API route: ${route#app/api/}"
    else
        check_fail "Missing API route: ${route#app/api/}"
    fi
done

section "7. UI Pages"

# Check for pages
PAGES=(
    "app/page.tsx"
    "app/dashboard/page.tsx"
    "app/orders/page.tsx"
    "app/products/page.tsx"
    "app/inventory/page.tsx"
    "app/shipments/page.tsx"
    "app/cashbook/page.tsx"
    "app/users/page.tsx"
    "app/track/page.tsx"
    "app/login/page.tsx"
    "app/settings/page.tsx"
)

for page in "${PAGES[@]}"; do
    if [ -f "$page" ]; then
        check_pass "Page: ${page#app/}"
    else
        check_fail "Missing page: ${page#app/}"
    fi
done

section "8. Build Test"

# Try to build
echo "Running build test..."
if npm run build > /dev/null 2>&1; then
    check_pass "Build successful"
else
    check_fail "Build failed (run: npm run build for details)"
fi

# Type check
if npm run typecheck > /dev/null 2>&1; then
    check_pass "TypeScript check passed"
else
    check_warning "TypeScript errors found"
fi

section "9. Security Check"

# Check for exposed secrets
if grep -r "sk-" --include="*.ts" --include="*.tsx" --include="*.js" . 2>/dev/null | grep -v ".env" > /dev/null; then
    check_fail "Possible API keys exposed in code"
else
    check_pass "No exposed API keys found"
fi

# Check for console.logs in production code
LOG_COUNT=$(grep -r "console.log" --include="*.ts" --include="*.tsx" app/ components/ lib/ 2>/dev/null | wc -l)
if [ "$LOG_COUNT" -gt 10 ]; then
    check_warning "Many console.log statements found ($LOG_COUNT)"
else
    check_pass "Console.log usage acceptable ($LOG_COUNT)"
fi

section "10. Documentation"

# Check for documentation
DOCS=(
    "README.md"
    "CLAUDE.md"
    "docs/PRD_v2.md"
    "docs/DATABASE_ERD.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "Documentation: $doc"
    else
        check_warning "Missing documentation: $doc"
    fi
done

# Summary
echo ""
echo "════════════════════════════════════════"
echo "           VERIFICATION SUMMARY          "
echo "════════════════════════════════════════"
echo -e "${GREEN}Passed:${NC}  $PASSED_CHECKS"
echo -e "${RED}Failed:${NC}  $FAILED_CHECKS"
echo -e "${YELLOW}Warnings:${NC} $WARNING_CHECKS"
echo -e "Total:    $TOTAL_CHECKS"
echo ""

# Calculate readiness percentage
if [ $TOTAL_CHECKS -gt 0 ]; then
    READINESS=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
else
    READINESS=0
fi

echo -e "System Readiness: ${READINESS}%"
echo ""

# Final verdict
if [ $FAILED_CHECKS -eq 0 ] && [ $READINESS -ge 90 ]; then
    echo -e "${GREEN}✅ System is READY for deployment${NC}"
    exit 0
elif [ $READINESS -ge 70 ]; then
    echo -e "${YELLOW}⚠️  System is PARTIALLY ready${NC}"
    echo "Please fix the failed checks before deployment"
    exit 1
else
    echo -e "${RED}❌ System is NOT ready for deployment${NC}"
    echo "Multiple critical issues need to be resolved"
    exit 1
fi