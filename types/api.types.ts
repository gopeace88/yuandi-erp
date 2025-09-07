export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ApiMeta
}

export interface ApiError {
  code: string
  message: string
  details?: any
}

export interface ApiMeta {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
  cursor?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface SearchParams extends PaginationParams {
  search?: string
  startDate?: string
  endDate?: string
}

export interface OrderQueryParams extends SearchParams {
  status?: string
  customerId?: string
}

export interface ProductQueryParams extends SearchParams {
  category?: string
  active?: boolean
  lowStock?: boolean
}

export interface DashboardData {
  todaySales: number
  salesGrowth: number
  newOrders: number
  orderGrowth: number
  totalProducts: number
  activecustomers: number
  salesTrend: Array<{
    date: string
    sales: number
    orders: number
  }>
  orderStatus: {
    paid: number
    shipped: number
    done: number
    refunded: number
  }
  recentOrders: any[]
  lowStockProducts: any[]
}

export interface CreateOrderDto {
  customerName: string
  customerPhone: string
  customerEmail?: string
  pcccCode: string
  shippingAddress: string
  shippingAddressDetail?: string
  zipCode: string
  customerMemo?: string
  internalMemo?: string
  items: Array<{
    productId: string
    quantity: number
  }>
}

export interface CreateProductDto {
  category: string
  name: string
  model?: string
  color?: string
  brand?: string
  costCny: number
  salePriceKrw?: number
  lowStockThreshold?: number
  barcode?: string
  description?: string
}

export interface RegisterShipmentDto {
  courier: string
  courierCode?: string
  trackingNo: string
  shippingFee?: number
  shipmentPhoto?: string
}

export interface StockAdjustmentDto {
  productId: string
  adjustment: number
  reason: string
  note?: string
}