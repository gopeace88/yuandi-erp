# CHANGELOG
## 변경 이력

All notable changes to YUANDI Collection Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2025-01-25

### 🎉 Major Release: Enhanced Shipping & Product Management

#### Added
- **Dual Shipping System**: Support for both Korean and Chinese couriers
  - Korean couriers: CJ, Hanjin, Lotte, Post Office, Logen, Coupang
  - Chinese couriers: SF Express, YTO, ZTO, STO, JD
- **Product Image Management**
  - Image upload for products
  - Image preview in product selection
  - `products.image_url` column added
- **Enhanced Shipment Tracking**
  - Barcode number field (`tracking_barcode`)
  - Courier code field (`courier_code`)
  - Shipping fee tracking (`shipping_fee`)
  - Weight information (`actual_weight`, `volume_weight`)
  - Receipt photo upload (`receipt_photo_url`)
- **Comprehensive Documentation**
  - DATABASE_ERD.md created
  - PRD_v2.md with updated requirements
  - ITERATIVE_DEVELOPMENT.md process guide

#### Changed
- **Shipments Table Refactoring**
  - Moved all shipping information from `orders` to `shipments` table
  - API routes updated to use `shipments` table
  - UI components updated for comprehensive shipping data entry
- **Order Edit Modal Enhancement**
  - Added detailed shipping information sections
  - Dual courier input support
  - Photo upload capabilities

#### Fixed
- API async/await errors in ship route
- Missing database columns for shipping details
- Shipment data not being properly stored

#### Database Migrations
- `004_fix_database_structure.sql`: Added image_url to products
- `005_add_missing_shipment_columns.sql`: Added tracking_barcode, receipt_photo_url

---

## [1.1.0] - 2025-01-22

### Added
- Chinese shipping support
- Shipment photo upload functionality
- Basic order management UI

#### Database Migrations
- `002_add_china_shipping.sql`: Added Chinese courier fields

---

## [1.0.0] - 2025-01-20

### 🚀 Initial Release

#### Added
- **Core Tables**
  - profiles (user management)
  - products (inventory)
  - orders (order management)
  - order_items (order details)
  - shipments (shipping information)
  - inventory_movements (stock tracking)
  - cashbook (financial records)
  - event_logs (audit trail)
- **Basic Features**
  - User authentication with roles (Admin, OrderManager, ShipManager)
  - Order creation and status management
  - Inventory tracking with on_hand quantity
  - Basic shipping registration
  - Customer portal for order lookup

#### Tech Stack
- Next.js 14 with App Router
- TypeScript
- Supabase (PostgreSQL, Auth)
- Tailwind CSS
- Vercel deployment

---

## [Unreleased]

### Planned Features
- [ ] Supabase Storage integration for images
- [ ] Remove deprecated columns from orders table
- [ ] Complete RLS policies implementation
- [ ] Real-time notifications
- [ ] PWA support
- [ ] Dark mode
- [ ] CSV bulk upload
- [ ] SMS/Email notifications
- [ ] Exchange rate API integration
- [ ] Multi-warehouse support

---

## Version History Summary

| Version | Date | Focus |
|---------|------|-------|
| 2.0.0 | 2025-01-25 | Enhanced Shipping & Images |
| 1.1.0 | 2025-01-22 | Chinese Shipping |
| 1.0.0 | 2025-01-20 | Initial Release |

---

**Note**: For detailed requirements and specifications, refer to [PRD_v2.md](./PRD_v2.md)