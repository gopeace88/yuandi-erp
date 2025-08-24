# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
YUANDI Collection Management System - an Order/Inventory/Shipping management system for a single-person overseas purchasing agent business. Currently in planning phase with comprehensive PRD documentation.

## Business Context
- **Business Type**: Single-person overseas purchasing agent service
- **Core Functions**: Order management (after payment confirmation), logistics tracking, cashbook monitoring, customer order lookup
- **Design Principle**: Simple WMS/accounting excluded, single inventory quantity (onHand), intuitive PC/mobile UI

## Tech Stack (Planned)
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Deployment**: Vercel (Edge Functions, Cron Jobs)
- **Architecture**: Serverless with Supabase + Vercel

## Development Setup

### Environment Variables
```bash
# Required in .env.local
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_API_KEY=<public-api-key>  # For client-side
SUPABASE_API_KEY=<private-api-key>             # For server-side only
```

### Commands (when implemented)
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## System Architecture

### User Roles & Permissions
- **Admin**: Full access to all features, user management, Excel exports
- **OrderManager**: Order and inventory management, cashbook view
- **ShipManager**: Shipping management only, cashbook view
- **Customer**: Order lookup only (name + phone number authentication)

### Business Process Flow
```
Payment Confirmed → Order Entry (PAID) → Logistics Pickup (SHIPPED) → Complete (DONE) or Refund (REFUNDED)
```

### Core Data Models
- **Product**: SKU auto-generation pattern: `[Category]-[Model]-[Color]-[Brand]-[HASH5]`
- **Order**: Order number pattern: `ORD-YYMMDD-###` (e.g., `ORD-240823-001`)
- **Inventory**: Single quantity field (onHand), real-time stock validation
- **Cashbook**: Automatic transaction recording for all financial events

## Key Implementation Requirements

### Product & Inventory Management
- Required fields: category, name, model, color, manufacturer/brand, cost(CNY)
- Real-time stock display when creating orders
- Stock validation prevents over-ordering
- Low stock threshold alerts (default: 5 units)

### Order Processing
- Automatic PAID status on creation
- Real-time inventory deduction
- Daum Postcode API integration for addresses
- Overseas customs clearance code (PCCC) required

### Shipping Management
- Tracking number registration
- Optional shipment photo upload
- Automatic tracking URL generation by courier

### Customer Portal (/track)
- Public access with name + full phone number
- Display last 5 orders in card format
- Auto-detect browser language (ko/zh-CN/en)

### Dashboard Components
- Sales metrics (today/week/month with YoY comparison)
- Order status distribution
- Low stock alerts (Admin/OrderManager only)
- Popular products TOP 5
- Recent orders

### Internationalization
- Support for Korean (ko) and Chinese (zh-CN)
- User-specific default language saved
- Date/currency format localization

## API Endpoints Structure

### Dashboard
- `GET /api/dashboard/summary` - Sales/order/inventory summary
- `GET /api/dashboard/sales-trend` - 7-day sales trend
- `GET /api/dashboard/order-status` - Order status distribution
- `GET /api/dashboard/low-stock` - Low stock products
- `GET /api/dashboard/popular-products` - Top 5 products

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - List orders
- `PATCH /api/orders/:id` - Update order
- `PATCH /api/orders/:id/ship` - Register tracking
- `PATCH /api/orders/:id/complete` - Mark as done
- `PATCH /api/orders/:id/refund` - Process refund

### Inventory
- `GET /api/products` - List products
- `POST /api/products` - Add product
- `POST /api/inventory/inbound` - Register stock arrival
- `PATCH /api/inventory/adjust` - Adjust stock

### Customer Portal
- `GET /api/track` - Query orders (name + phone params)

### Export (Admin only)
- `GET /api/export/orders.xlsx` - Export orders
- `GET /api/export/inventory.xlsx` - Export inventory
- `GET /api/export/cashbook.xlsx` - Export cashbook

## Database Schema Highlights

### Sequential Numbering
- Order numbers: `ORD-YYMMDD-###`
- Daily reset counter
- Timezone: Asia/Seoul (UTC+9)

### Row Level Security (RLS)
- All tables have RLS enabled
- User role-based access control
- Customer portal uses separate authentication

### Audit Trail
- EventLog table tracks all changes
- Actor, timestamp, before/after states
- IP address and user agent recording

## Testing Strategy

### E2E Test Scenarios (Playwright)
- Customer order lookup flow
- Admin order creation with inventory validation
- Shipping workflow (tracking registration)
- Cashbook transaction recording
- Multi-language switching

### Test Data
- Use `.env.test` for test database
- Seed data for all user roles
- Mock Daum Postcode API responses

## Security Considerations

- Never expose `SUPABASE_API_KEY` (private key) to client
- Use `NEXT_PUBLIC_SUPABASE_API_KEY` for client-side
- Implement rate limiting on public endpoints
- Validate PCCC format for customs
- Sanitize all user inputs

## Performance Targets

- Response time: < 3 seconds
- Concurrent users: 5-10 (small business scale)
- Database capacity: 10,000 orders, 1,000 products
- Mobile-first responsive design

## Common Development Tasks

### Adding New API Route
1. Create route handler in `app/api/[resource]/route.ts`
2. Implement RLS policies in Supabase
3. Add types to shared types file
4. Update OpenAPI documentation

### Implementing Realtime Features
1. Enable Supabase Realtime for table
2. Create subscription hook
3. Handle connection lifecycle
4. Implement optimistic updates

### Adding New Language
1. Create message file in `/messages/[locale]/`
2. Update i18n configuration
3. Add locale switcher UI
4. Test number/date formatting

## Deployment Checklist

- [ ] Set all environment variables in Vercel
- [ ] Configure Supabase RLS policies
- [ ] Enable Supabase Realtime
- [ ] Set up CRON_SECRET for scheduled jobs
- [ ] Configure custom domain
- [ ] Enable Vercel Analytics
- [ ] Set up error tracking (Sentry)

## Phase 2 Considerations (Future)

- SMS/Email notifications
- Customer tier discounts
- PWA mobile app
- Supplier management
- Multi-warehouse support
- External API integrations (tracking, exchange rates)