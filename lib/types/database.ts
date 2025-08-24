// 데이터베이스 타입 정의
export type UserRole = 'admin' | 'order_manager' | 'ship_manager' | 'customer'
export type OrderStatus = 'PAID' | 'SHIPPED' | 'DONE' | 'REFUNDED'
export type ProductCategory = 
  | 'ELECTRONICS' | 'FASHION' | 'COSMETICS' | 'SUPPLEMENTS' 
  | 'TOYS' | 'BOOKS' | 'SPORTS' | 'HOME' | 'FOOD' | 'OTHER'
export type InventoryMovementType = 'inbound' | 'sale' | 'adjustment' | 'disposal' | 'refund'
export type CashbookTransactionType = 
  | 'order_payment' | 'purchase_payment' | 'shipping_cost' 
  | 'refund' | 'adjustment' | 'other'

// 사용자 프로필
export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  default_language: string
  created_at: string
  updated_at: string
}

// 상품
export interface Product {
  id: string
  sku: string
  name: string
  category: ProductCategory
  model?: string
  color?: string
  brand?: string
  cost_cny: number
  sale_price_krw?: number
  on_hand: number
  low_stock_threshold: number
  barcode?: string
  description?: string
  notes?: string
  active: boolean
  created_at: string
  updated_at: string
}

// 주문
export interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  zip_code?: string
  shipping_address: string
  detailed_address?: string
  pccc?: string
  
  subtotal_amount: number
  shipping_cost: number
  discount_amount: number
  final_amount: number
  
  status: OrderStatus
  
  // 배송 관련
  tracking_number?: string
  courier?: string
  tracking_url?: string
  shipment_note?: string
  shipment_photo_url?: string
  
  // 완료/환불 관련
  completion_note?: string
  refund_reason?: string
  refund_note?: string
  refund_amount?: number
  
  // 타임스탬프
  created_at: string
  shipped_at?: string
  completed_at?: string
  refunded_at?: string
  updated_at: string
}

// 주문 상품
export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
  products?: Product
}

// 재고 이동
export interface InventoryMovement {
  id: string
  product_id: string
  movement_type: InventoryMovementType
  quantity: number
  balance_before: number
  balance_after: number
  ref_no?: string
  note?: string
  movement_date: string
  created_by?: string
}

// 현금장부
export interface CashbookTransaction {
  id: string
  transaction_type: CashbookTransactionType
  amount: number
  description: string
  ref_order_id?: string
  ref_no?: string
  transaction_date: string
  created_by?: string
  created_at: string
}

// 이벤트 로그
export interface EventLog {
  id: string
  table_name: string
  record_id: string
  action: string
  old_values?: any
  new_values?: any
  actor?: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

// API 응답 타입
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

// 페이지네이션
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// 대시보드 통계
export interface DashboardStats {
  totalProducts: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
}

// 매출 트렌드
export interface SalesTrend {
  date: string
  amount: number
}

// 주문 상태 분포
export interface OrderStatusDistribution {
  status: OrderStatus
  label: string
  count: number
}

// 인기 상품
export interface PopularProduct {
  id: string
  sku: string
  name: string
  category: ProductCategory
  brand?: string
  totalQuantity: number
  orderCount: number
}

// 재고 부족 상품
export interface LowStockProduct {
  id: string
  sku: string
  name: string
  category: ProductCategory
  on_hand: number
  low_stock_threshold: number
}