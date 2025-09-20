# CLAUDE.md - YUANDI ERP Development Navigator

> **Purpose**: Context-efficient development guide for Claude Code
> **Project**: YUANDI Collection Management System
> **Status**: Active Development with Iterative Refinement
> **Database**: Supabase MCP Server Connected - Always verify schema before SQL

## 🔐 중요!!  작업이 진행될때마다 @Docs/(250907-v2.0)PRD.md 를 업데이트해줘 (업버전되면 파일이름이 바뀌었을수도 있음)

## 🎯 Quick Navigation

| Document                                                             | Purpose                          | Priority |
| -------------------------------------------------------------------- | -------------------------------- | -------- |
| 📘 **[PRD.md](./docs/(250907-v2.0)PRD.md)**                           | Product Requirements (중심 문서) | ⭐⭐⭐      |
| 🔄 **[SCHEMA_CHANGE_PROCESS.md](./docs/SCHEMA_CHANGE_PROCESS.md)**    | DB 스키마 변경 프로세스          | ⭐⭐⭐      |
| 🚀 **[DEPLOYMENT_GUIDE.md](./docs/(250907-v1.0)DEPLOYMENT_GUIDE.md)** | Deployment Steps                 | ⭐⭐       |
| 🛠️ **[SETUP_GUIDE.md](./docs/(250907-v1.0)SETUP_GUIDE.md)**           | Local Setup                      | ⭐        |

## ⚠️ Critical Rules (MUST FOLLOW)

### 🔐 Database Schema Verification
**IMPORTANT**: Supabase MCP Server is connected. ALWAYS verify actual schema before writing SQL:
```bash
# Use Supabase MCP to check schema
mcp__yuandi-supabase__list_tables       # List all tables
mcp__yuandi-supabase__execute_sql       # Test SQL queries
mcp__yuandi-supabase__apply_migration   # Apply DDL changes
```

### 🔴 Common Mistakes to Avoid
```typescript
// ❌ WRONG - Inconsistent naming
from('profiles')           // Some code still uses this
from('cashbook')           // Mixed with cashbook_transactions
role: 'Admin'              // Some code uses capitalized

// ✅ CORRECT - Database schema standard
from('user_profiles')      // Correct table name
from('cashbook_transactions')  // Correct table name
role: 'admin'              // Database uses: admin, order_manager, ship_manager
```

### 📌 Development Process
1. **Check PRD.md first** → Requirements source of truth
2. **Keep PRD & SQL in sync** → When schema changes, update both PRD.md and SQL files
3. **Use shipments table** → NOT orders table shipping fields
4. **Test before complete** → Run pnpm test, pnpm typecheck
5. **E2E Testing** → Use **Playwright** (preferred) or Puppeteer
6. **⚠️ CRITICAL: Test ALL code changes locally** → NEVER push untested code
7. **Get user approval** → BEFORE git commit AND especially BEFORE git push
8. **Batch commits** → Multiple features in one commit

### 🚨 NEVER DO THIS (중대 실수 방지)
- **❌ NEVER push code without testing** - 테스트 없이 코드를 절대 push하지 마세요
- **❌ NEVER deploy without user approval** - 사용자 승인 없이 절대 배포하지 마세요
- **❌ NEVER skip local testing** - 로컬 테스트를 절대 건너뛰지 마세요
- **✅ ALWAYS test → get approval → then push** - 항상 테스트 → 승인 → push 순서를 지키세요

## 🏗️ Tech Stack & Commands

```bash
# Stack: Next.js 14 + TypeScript + Supabase + Vercel
pnpm install    # Install dependencies
pnpm dev        # Development server (default port 3000)
PORT=8081 pnpm dev  # WSL 환경에서 포트 8081로 실행
pnpm build      # Production build
pnpm test       # Run tests
pnpm typecheck  # Type checking
pnpm lint       # Linting

# E2E Testing Options
# Option 1: Playwright (권장)
pnpm test:e2e        # Run all E2E tests
npx playwright test  # Or run directly

# Option 2: Puppeteer (간단한 테스트용)
node simple-test.js  # Run standalone Puppeteer script
```

### WSL + Windows 개발 환경 설정
```bash
# WSL에서 서버 실행 시 Windows 브라우저로 접속하려면:
# 1. 포트를 8081로 실행 (3000은 다른 앱이 사용 중)
PORT=8081 pnpm dev

# 2. Windows 브라우저에서 접속:
# http://localhost:8081
#
# 3. .env.local 설정 확인:
# NEXT_PUBLIC_APP_URL=http://localhost:8081
```

### Latest Migration
```sql
# Migration 009: Increase numeric field limits
# Supports: cashbook 100억원, products 1천만원
# Path: /supabase/migrations/009_increase_numeric_limits.sql
```

### Environment Setup
```bash
# .env.local (Required)
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_API_KEY=xxx  # Client-side
SUPABASE_API_KEY=xxx              # Server-side only
```

## 📊 Database Quick Reference

### 🔍 Real-time Schema Verification
```sql
-- ALWAYS verify actual table structure before SQL operations
-- Use Supabase MCP to get current schema:
-- 1. mcp__yuandi-supabase__list_tables - Get all tables with columns
-- 2. Check foreign keys, constraints, and data types
-- 3. Verify enum values for user_role, order_status, etc.
```

### Table Names (Use These)
| Table                   | Purpose           | Status        |
| ----------------------- | ----------------- | ------------- |
| `user_profiles`         | User management   | ✅ Primary     |
| `products`              | Product catalog   | ✅ Active      |
| `orders`                | Order management  | ✅ Active      |
| `order_items`           | Order line items  | ✅ Active      |
| `shipments`             | Shipping info     | ✅ Use this    |
| `inventory_movements`   | Stock tracking    | ✅ Active      |
| `cashbook_transactions` | Financial records | ⚠️ Mixed usage |
| `event_logs`            | Audit trail       | ✅ Active      |

### User Roles (Database Schema)
```typescript
type UserRole = 'admin' | 'order_manager' | 'ship_manager'
// Database standard: lowercase with underscore
```

## 🚦 Business Flow

```mermaid
graph LR
    A[Order(PAID)] --> B[Ship(SHIPPED)] --> C[Complete(DONE)]
    B --> D[Refund(REFUNDED)]
```

### Key Patterns
- **Order Number**: `YYMMDD-###` (Daily reset, Asia/Seoul)
- **SKU Pattern**: `[Category]-[Model]-[Color]-[Brand]-[HASH5]`
- **Stock**: Single `onHand` field, real-time validation
- **Dual Shipping**: Korea + China tracking in shipments table

## 📊 Test Data Management

### Bulk Test Data Generation
For pagination testing and development, use the following SQL script:
```bash
# Generate 100+ records for each table
psql $DATABASE_URL -f scripts/generate-test-data.sql

# Or use Supabase Dashboard SQL Editor
# File: scripts/generate-test-data.sql
# Creates: 10 categories, 100 products, 100 orders, 200+ order items
```

**⚠️ WARNING**: This script will TRUNCATE all existing data. Use only in development/test environments.

## 🔗 API Structure Map

| Category      | Endpoints            | Auth                 |
| ------------- | -------------------- | -------------------- |
| **Dashboard** | `/api/dashboard/*`   | Role-based           |
| **Orders**    | `/api/orders/*`      | admin, order_manager |
| **Inventory** | `/api/inventory/*`   | admin, order_manager |
| **Shipping**  | `/api/shipments/*`   | admin, ship_manager  |
| **Customer**  | `/api/track`         | Public (name+phone)  |
| **Export**    | `/api/export/*.xlsx` | admin only           |

## 🎌 Internationalization
- **Languages**: Korean (ko), Chinese (zh-CN)
- **Default**: User preference saved in profile
- **Customer Portal**: Auto-detect browser language

## 🔒 Security Checklist
- ✅ Never expose `SUPABASE_API_KEY` to client
- ✅ Use `NEXT_PUBLIC_*` for client-side vars
- ✅ RLS enabled on all tables
- ✅ PCCC validation for customs
- ✅ Input sanitization

## 📈 Performance Targets
- Response: < 3 seconds
- Users: 5-10 concurrent
- Database: 10K orders, 1K products
- Design: Mobile-first responsive

## 🚨 Current Issues

### Known Inconsistencies
| Issue              | Current State                            | Target State                   |
| ------------------ | ---------------------------------------- | ------------------------------ |
| Table naming       | Mixed `profiles`/`user_profiles`         | → `user_profiles`              |
| Cashbook table     | Mixed `cashbook`/`cashbook_transactions` | → `cashbook_transactions`      |
| User roles in docs | Says lowercase                           | → Use capitalized (as in code) |

### Recently Fixed
- **Foreign Key Constraints**: Added CASCADE DELETE to all user_profiles references (Migration 007)
- **Numeric Field Limits**: Increased to support cashbook 100억원, products 1천만원 (Migration 009)

## 📝 Quick Tasks

### Add New Feature?
→ Check **[PRD.md](./docs/(250907-v2.0)PRD.md)** Section 4-9

### Database Schema?
→ Check **[PRD.md Section 12.5](./docs/(250907-v2.0)PRD.md#125-데이터베이스-스키마)**

### Generate Test Data?
→ Follow **[TEST_DATA_GUIDE.md](./docs/TEST_DATA_GUIDE.md)**
```bash
# PRD 비즈니스 워크플로우 기반 테스트 데이터 생성
node scripts/generate-business-flow-data.js
```

### Deploy to Production?
→ Follow **[DEPLOYMENT_GUIDE.md](./docs/(250907-v1.0)DEPLOYMENT_GUIDE.md)**

### Local Setup Issues?
→ See **[SETUP_GUIDE.md](./docs/(250907-v1.0)SETUP_GUIDE.md)**

---
**Remember**: PRD.md is the central document. This file is just a navigator.

## 📦 MCP (Model Context Protocol) 설정

MCP 서버를 설치하거나 설정해야 할 경우:
→ **[MCP_INSTALLATION_GUIDE.md](./docs/MCP_INSTALLATION_GUIDE.md)** 참조

**현재 프로젝트에서 사용 중인 MCP 서버들**:
- **yuandi-supabase**: Supabase 데이터베이스 연결 및 관리
- **context7**: 라이브러리 문서 검색
- **playwright-stealth**: E2E 테스트 자동화
- **magic**: UI 컴포넌트 생성 지원
- **ide**: VSCode/IDE 통합 기능

**Quick Info**:
- WSL 환경 사용 중 (sudo 패스워드는 MCP 가이드 참조)
- 모든 MCP는 user 스코프로 설치됨
- 문제 발생 시 위 가이드 문서 참조