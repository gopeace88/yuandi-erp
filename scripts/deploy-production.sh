#!/bin/bash

#############################################
# YUANDI ERP - Production Deployment Script
# Version: 2.0.0
# Date: 2024
#############################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="yuandi-erp"
DEPLOY_BRANCH="main"
VERCEL_ORG_ID="${VERCEL_ORG_ID:-}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking deployment requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
        exit 1
    fi
    
    # Check Vercel CLI
    if ! command -v vercel &> /dev/null; then
        log_warning "Vercel CLI is not installed. Installing..."
        npm i -g vercel
    fi
    
    log_success "All requirements met"
}

check_environment() {
    log_info "Checking environment variables..."
    
    MISSING_VARS=()
    
    # Check required environment variables
    [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && MISSING_VARS+=("NEXT_PUBLIC_SUPABASE_URL")
    [ -z "${NEXT_PUBLIC_SUPABASE_API_KEY:-}" ] && MISSING_VARS+=("NEXT_PUBLIC_SUPABASE_API_KEY")
    [ -z "${SUPABASE_API_KEY:-}" ] && MISSING_VARS+=("SUPABASE_API_KEY")
    
    if [ ${#MISSING_VARS[@]} -ne 0 ]; then
        log_error "Missing required environment variables:"
        printf '%s\n' "${MISSING_VARS[@]}"
        log_info "Please set these in your .env.production file"
        exit 1
    fi
    
    log_success "Environment variables configured"
}

run_tests() {
    log_info "Running tests..."
    
    # Type checking
    log_info "Running type check..."
    npm run typecheck || {
        log_error "Type check failed"
        exit 1
    }
    
    # Linting
    log_info "Running linter..."
    npm run lint || {
        log_error "Linting failed"
        exit 1
    }
    
    # Unit tests (if available)
    if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
        log_info "Running unit tests..."
        npm test || {
            log_error "Unit tests failed"
            exit 1
        }
    fi
    
    log_success "All tests passed"
}

build_production() {
    log_info "Building production bundle..."
    
    # Clean previous build
    rm -rf .next
    rm -rf out
    
    # Build Next.js application
    NODE_ENV=production npm run build || {
        log_error "Build failed"
        exit 1
    }
    
    # Check build output
    if [ ! -d ".next" ]; then
        log_error "Build output not found"
        exit 1
    fi
    
    log_success "Production build completed"
}

run_database_migrations() {
    log_info "Running database migrations..."
    
    # Check if migrations exist
    if [ -d "supabase/migrations" ]; then
        # Apply migrations using Supabase CLI or API
        log_info "Applying database migrations..."
        # npx supabase db push --db-url "${DATABASE_URL}"
        log_warning "Database migrations should be run manually through Supabase dashboard"
    else
        log_warning "No migrations found"
    fi
    
    log_success "Database migrations check completed"
}

deploy_to_vercel() {
    log_info "Deploying to Vercel..."
    
    # Set Vercel project
    if [ -n "$VERCEL_ORG_ID" ] && [ -n "$VERCEL_PROJECT_ID" ]; then
        export VERCEL_ORG_ID
        export VERCEL_PROJECT_ID
    fi
    
    # Deploy to production
    vercel --prod --yes || {
        log_error "Vercel deployment failed"
        exit 1
    }
    
    # Get deployment URL
    DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[] | select(.state=="READY") | .url' | head -n 1)
    
    if [ -n "$DEPLOYMENT_URL" ]; then
        log_success "Deployed to: https://$DEPLOYMENT_URL"
    else
        log_warning "Could not retrieve deployment URL"
    fi
}

post_deployment_checks() {
    log_info "Running post-deployment checks..."
    
    # If we have deployment URL, run smoke tests
    if [ -n "${DEPLOYMENT_URL:-}" ]; then
        log_info "Running smoke tests on production..."
        
        # Check if site is accessible
        if curl -f -s "https://$DEPLOYMENT_URL" > /dev/null; then
            log_success "Site is accessible"
        else
            log_error "Site is not accessible"
            exit 1
        fi
        
        # Check API health
        if curl -f -s "https://$DEPLOYMENT_URL/api/health" > /dev/null; then
            log_success "API is responding"
        else
            log_warning "API health check endpoint not found"
        fi
    fi
    
    log_success "Post-deployment checks completed"
}

create_deployment_record() {
    log_info "Creating deployment record..."
    
    # Get current git commit
    GIT_COMMIT=$(git rev-parse HEAD)
    GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    DEPLOY_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Create deployment record
    cat > deployment-log.json << EOF
{
  "deployment": {
    "timestamp": "$DEPLOY_TIME",
    "commit": "$GIT_COMMIT",
    "branch": "$GIT_BRANCH",
    "url": "https://${DEPLOYMENT_URL:-}",
    "environment": "production",
    "deployed_by": "$(whoami)",
    "node_version": "$(node -v)",
    "npm_version": "$(npm -v)"
  }
}
EOF
    
    log_success "Deployment record created: deployment-log.json"
}

cleanup() {
    log_info "Cleaning up..."
    
    # Remove temporary files
    rm -f .env.production.local.backup
    
    log_success "Cleanup completed"
}

main() {
    echo "========================================="
    echo "   YUANDI ERP - Production Deployment   "
    echo "========================================="
    echo ""
    
    # Pre-deployment checks
    check_requirements
    check_environment
    
    # Ensure we're on the correct branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ "$CURRENT_BRANCH" != "$DEPLOY_BRANCH" ]; then
        log_warning "Not on $DEPLOY_BRANCH branch (current: $CURRENT_BRANCH)"
        read -p "Do you want to continue? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        log_error "You have uncommitted changes. Please commit or stash them first."
        exit 1
    fi
    
    # Pull latest changes
    log_info "Pulling latest changes..."
    git pull origin "$DEPLOY_BRANCH"
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --production=false
    
    # Run tests
    run_tests
    
    # Build production bundle
    build_production
    
    # Run database migrations
    run_database_migrations
    
    # Deploy to Vercel
    deploy_to_vercel
    
    # Post-deployment checks
    post_deployment_checks
    
    # Create deployment record
    create_deployment_record
    
    # Cleanup
    cleanup
    
    echo ""
    echo "========================================="
    echo "   Deployment Completed Successfully!   "
    echo "========================================="
    echo ""
    log_success "YUANDI ERP has been deployed to production"
    
    # Display deployment summary
    if [ -f "deployment-log.json" ]; then
        echo ""
        echo "Deployment Summary:"
        cat deployment-log.json | jq .
    fi
}

# Error handler
trap 'log_error "Deployment failed at line $LINENO"' ERR

# Run main function
main "$@"