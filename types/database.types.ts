export type UserRole = 'admin' | 'order_manager' | 'ship_manager'
export type OrderStatus = 'paid' | 'shipped' | 'delivered' | 'refunded'
export type CashbookType = 'sale' | 'inbound' | 'shipping' | 'adjustment' | 'refund'
export type Currency = 'CNY' | 'KRW'
export type Locale = 'ko' | 'zh-CN'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  locale: Locale
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  sku: string
  category: string
  name: string
  model?: string
  color?: string
  brand?: string
  cost_cny: number       // 원가 (위안화)
  price_krw?: number     // 판매가 (원화)
  cost_krw?: number      // 원가 원화 환산 (자동 계산)
  price_cny?: number     // 판매가 위안화 환산 (자동 계산)
  onHand: number
  lowStockThreshold: number
  barcode?: string
  image_url?: string
  description?: string
  notes?: string
  active: boolean
  createdAt: string
  updatedAt: string
  created_by?: string
}

export interface Order {
  id: string
  orderNo: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  pcccCode: string
  shippingAddress: string
  shippingAddressDetail?: string
  zipCode: string
  status: OrderStatus
  totalAmount: number
  customerMemo?: string
  internalMemo?: string
  items?: OrderItem[]
  shipment?: Shipment
  createdAt: string
  updatedAt: string
  createdBy?: User
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  sku: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  product?: Product
}

export interface Shipment {
  id: string
  orderId: string
  courier: string
  courierCode?: string
  trackingNo: string
  trackingUrl?: string
  shippingFee?: number
  shipmentPhotoUrl?: string
  shippedAt: string
  deliveredAt?: string
  createdBy?: User
}

export interface InventoryMovement {
  id: string
  productId: string
  movementType: 'inbound' | 'sale' | 'adjustment' | 'disposal'
  quantity: number
  balanceBefore: number
  balanceAfter: number
  refType?: string
  refId?: string
  note?: string
  movementDate: string
  createdAt: string
  createdBy?: User
}

export interface Cashbook {
  id: string
  transactionDate: string
  type: CashbookType
  amount: number
  currency: Currency
  fxRate: number
  amountKrw: number
  refType?: string
  refId?: string
  description?: string
  note?: string
  createdAt: string
  createdBy?: User
}

export interface ExchangeRate {
  id: string
  date: string
  base_currency: string
  target_currency: string
  rate: number
  source: 'manual' | 'api_bank' | 'api_forex' | 'default'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EventLog {
  id: string
  actorId?: string
  actorName?: string
  actorRole?: UserRole
  eventType: string
  eventCategory?: string
  entityType?: string
  entityId?: string
  entityName?: string
  action?: string
  beforeData?: any
  afterData?: any
  changes?: any
  ipAddress?: string
  userAgent?: string
  createdAt: string
}