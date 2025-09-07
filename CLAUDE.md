# CLAUDE.md - YUANDI ERP Development Navigator

> **Purpose**: Context-efficient development guide for Claude Code
> **Project**: YUANDI Collection Management System
> **Status**: Active Development with Iterative Refinement
> **Database**: Supabase MCP Server Connected - Always verify schema before SQL

## 🎯 Quick Navigation

| Document | Purpose | Priority |
|----------|---------|----------|
| 📘 **[PRD.md](./docs/(250907-v2.0)PRD.md)** | Product Requirements (중심 문서) | ⭐⭐⭐ |
| 🗄️ **[DATABASE_ERD.md](./docs/(250907-v1.1)DATABASE_ERD.md)** | Database Schema | ⭐⭐⭐ |
| 🔄 **[ITERATIVE_DEVELOPMENT.md](./docs/(250907-v1.0)ITERATIVE_DEVELOPMENT.md)** | Development Process | ⭐⭐ |
| 🚀 **[DEPLOYMENT_GUIDE.md](./docs/(250907-v1.0)DEPLOYMENT_GUIDE.md)** | Deployment Steps | ⭐ |
| 🛠️ **[SETUP_GUIDE.md](./docs/(250907-v1.0)SETUP_GUIDE.md)** | Local Setup | ⭐ |

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
2. **Use shipments table** → NOT orders table shipping fields
3. **Test before complete** → Run pnpm test, pnpm typecheck
4. **Get user approval** → BEFORE git commit
5. **Batch commits** → Multiple features in one commit

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
```

### WSL + Windows 개발 환경 설정
```bash
# WSL에서 서버 실행 시 Windows 브라우저로 접속하려면:
# 1. 포트를 8081로 실행 (3000은 다른 앱이 사용 중)
PORT=8081 pnpm dev

# 2. Windows 브라우저에서 접속:
# http://172.25.186.113:8081 (WSL IP 주소는 변경될 수 있음)
# 
# 3. .env.local 설정 확인:
# NEXT_PUBLIC_APP_URL=http://172.25.186.113:8081
```

### Latest Migration
```sql
# Migration 007: Fix foreign key CASCADE constraints
# Run this in Supabase dashboard if user deletion fails
# Path: /supabase/migrations/007_fix_foreign_key_cascade.sql
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
| Table | Purpose | Status |
|-------|---------|--------|
| `user_profiles` | User management | ✅ Primary |
| `products` | Product catalog | ✅ Active |
| `orders` | Order management | ✅ Active |
| `order_items` | Order line items | ✅ Active |
| `shipments` | Shipping info | ✅ Use this |
| `inventory_movements` | Stock tracking | ✅ Active |
| `cashbook_transactions` | Financial records | ⚠️ Mixed usage |
| `event_logs` | Audit trail | ✅ Active |

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
- **Order Number**: `ORD-YYMMDD-###` (Daily reset, Asia/Seoul)
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

| Category | Endpoints | Auth |
|----------|-----------|------|
| **Dashboard** | `/api/dashboard/*` | Role-based |
| **Orders** | `/api/orders/*` | admin, order_manager |
| **Products** | `/api/products/*` | admin, order_manager |
| **Shipping** | `/api/shipments/*` | admin, ship_manager |
| **Customer** | `/api/track` | Public (name+phone) |
| **Export** | `/api/export/*.xlsx` | admin only |

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
| Issue | Current State | Target State |
|-------|--------------|--------------|
| Table naming | Mixed `profiles`/`user_profiles` | → `user_profiles` |
| Cashbook table | Mixed `cashbook`/`cashbook_transactions` | → `cashbook_transactions` |
| User roles in docs | Says lowercase | → Use capitalized (as in code) |

### Recently Fixed
- **Foreign Key Constraints**: Added CASCADE DELETE to all user_profiles references (Migration 007)

## 📝 Quick Tasks

### Add New Feature?
→ Check **[PRD.md](./docs/(250907-v2.0)PRD.md)** Section 4-9

### Database Schema?
→ Check **[DATABASE_ERD.md](./docs/(250907-v1.1)DATABASE_ERD.md)**

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