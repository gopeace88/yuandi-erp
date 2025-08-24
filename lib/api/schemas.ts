/**
 * Centralized validation schemas for API requests
 * 
 * Using Zod for runtime type checking and validation
 */

import { z } from 'zod'

// ============================================================================
// Common Schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  orderBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc')
})

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate)
    }
    return true
  },
  {
    message: "End date must be after start date"
  }
)

export const idSchema = z.string().uuid()

export const phoneSchema = z.string().regex(
  /^(\+82|0)1[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
  'Invalid phone number format'
)

export const pcccSchema = z.string().regex(
  /^P[0-9]{12}$/,
  'PCCC must be in format P + 12 digits'
)

// ============================================================================
// Product Schemas
// ============================================================================

export const productCategorySchema = z.enum([
  'ELECTRONICS',
  'CLOTHING',
  'ACCESSORIES',
  'COSMETICS',
  'FOOD',
  'TOYS',
  'BOOKS',
  'HOME',
  'SPORTS',
  'OTHER'
])

export const createProductSchema = z.object({
  category: productCategorySchema,
  name: z.string().min(1).max(200),
  name_cn: z.string().min(1).max(200).optional(),
  model: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  size: z.string().max(50).optional(),
  brand: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  cost_cny: z.number().min(0),
  price_krw: z.number().min(0),
  image_url: z.string().url().optional(),
  description: z.string().optional(),
  low_stock_threshold: z.number().min(0).default(5),
  active: z.boolean().default(true)
})

export const updateProductSchema = createProductSchema.partial()

export const productSearchSchema = z.object({
  search: z.string().optional(),
  category: productCategorySchema.optional(),
  active: z.coerce.boolean().optional(),
  lowStock: z.coerce.boolean().optional()
}).merge(paginationSchema)

// ============================================================================
// Order Schemas
// ============================================================================

export const orderStatusSchema = z.enum([
  'PENDING',
  'PAID',
  'SHIPPED',
  'DONE',
  'CANCELLED',
  'REFUNDED'
])

export const shippingAddressSchema = z.object({
  postalCode: z.string().min(5).max(6),
  roadAddress: z.string().min(1),
  jibunAddress: z.string().optional(),
  detailAddress: z.string().optional(),
  extraAddress: z.string().optional()
})

export const orderItemSchema = z.object({
  product_id: idSchema,
  quantity: z.number().int().min(1),
  unit_price: z.number().min(0),
  sku: z.string().optional(),
  product_name: z.string().optional()
})

export const createOrderSchema = z.object({
  customer_name: z.string().min(1).max(100),
  customer_phone: phoneSchema,
  customer_pccc: pcccSchema.optional(),
  shipping_address: shippingAddressSchema,
  items: z.array(orderItemSchema).min(1),
  notes: z.string().optional(),
  payment_method: z.enum(['CARD', 'BANK', 'CASH']).optional()
})

export const updateOrderSchema = z.object({
  customer_name: z.string().min(1).max(100).optional(),
  customer_phone: phoneSchema.optional(),
  customer_pccc: pcccSchema.optional(),
  shipping_address: shippingAddressSchema.optional(),
  status: orderStatusSchema.optional(),
  notes: z.string().optional()
})

export const orderSearchSchema = z.object({
  search: z.string().optional(),
  status: orderStatusSchema.optional(),
  customerId: idSchema.optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional()
})
  .merge(dateRangeSchema)
  .merge(paginationSchema)

// ============================================================================
// Shipping Schemas
// ============================================================================

export const courierSchema = z.enum([
  'KOREA_POST',
  'CJ_LOGISTICS',
  'HANJIN',
  'LOTTE',
  'LOGEN',
  'EMS',
  'DHL',
  'FEDEX',
  'UPS',
  'OTHER'
])

export const shipOrderSchema = z.object({
  courier: courierSchema,
  tracking_no: z.string().min(1).max(50),
  shipped_at: z.string().datetime().optional(),
  shipment_photo_url: z.string().url().optional(),
  notes: z.string().optional()
})

export const completeOrderSchema = z.object({
  delivered_at: z.string().datetime().optional(),
  notes: z.string().optional()
})

export const refundOrderSchema = z.object({
  reason: z.enum([
    'DAMAGED',
    'WRONG_ITEM',
    'NOT_RECEIVED',
    'CUSTOMER_REQUEST',
    'OTHER'
  ]),
  amount: z.number().min(0),
  refunded_at: z.string().datetime().optional(),
  notes: z.string().optional()
})

// ============================================================================
// Inventory Schemas
// ============================================================================

export const inventoryInboundSchema = z.object({
  product_id: idSchema,
  quantity: z.number().int().min(1),
  cost_cny: z.number().min(0).optional(),
  notes: z.string().optional(),
  reference_no: z.string().optional()
})

export const inventoryAdjustSchema = z.object({
  product_id: idSchema,
  quantity: z.number().int(),
  type: z.enum(['ADD', 'SUBTRACT', 'SET']),
  reason: z.enum([
    'DAMAGED',
    'LOST',
    'FOUND',
    'CORRECTION',
    'OTHER'
  ]),
  notes: z.string().optional()
})

export const inventoryMovementSearchSchema = z.object({
  product_id: idSchema.optional(),
  type: z.enum(['INBOUND', 'OUTBOUND', 'ADJUSTMENT']).optional(),
  reference_type: z.enum(['ORDER', 'ADJUSTMENT', 'INBOUND']).optional()
})
  .merge(dateRangeSchema)
  .merge(paginationSchema)

// ============================================================================
// Customer Portal Schemas
// ============================================================================

export const trackOrderSchema = z.object({
  name: z.string().min(1).max(100),
  phone: phoneSchema
})

// ============================================================================
// User & Auth Schemas
// ============================================================================

export const userRoleSchema = z.enum([
  'Admin',
  'OrderManager',
  'ShipManager',
  'Customer'
])

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  role: userRoleSchema,
  active: z.boolean().default(true)
})

export const updateUserSchema = createUserSchema.partial().omit({ email: true })

export const userPreferencesSchema = z.object({
  language: z.enum(['ko', 'zh-CN', 'en']).default('ko'),
  timezone: z.string().default('Asia/Seoul'),
  notifications: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    lowStock: z.boolean().default(true),
    newOrder: z.boolean().default(true)
  }).optional()
})

// ============================================================================
// Export Schemas
// ============================================================================

export const exportOptionsSchema = z.object({
  format: z.enum(['xlsx', 'csv', 'json']).default('xlsx'),
  fields: z.array(z.string()).optional(),
  includeHeaders: z.boolean().default(true)
})
  .merge(dateRangeSchema)

// ============================================================================
// Type Exports
// ============================================================================

export type PaginationParams = z.infer<typeof paginationSchema>
export type DateRangeParams = z.infer<typeof dateRangeSchema>
export type ProductCategory = z.infer<typeof productCategorySchema>
export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductSearchParams = z.infer<typeof productSearchSchema>
export type OrderStatus = z.infer<typeof orderStatusSchema>
export type ShippingAddress = z.infer<typeof shippingAddressSchema>
export type OrderItem = z.infer<typeof orderItemSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>
export type OrderSearchParams = z.infer<typeof orderSearchSchema>
export type Courier = z.infer<typeof courierSchema>
export type ShipOrderInput = z.infer<typeof shipOrderSchema>
export type CompleteOrderInput = z.infer<typeof completeOrderSchema>
export type RefundOrderInput = z.infer<typeof refundOrderSchema>
export type InventoryInboundInput = z.infer<typeof inventoryInboundSchema>
export type InventoryAdjustInput = z.infer<typeof inventoryAdjustSchema>
export type TrackOrderInput = z.infer<typeof trackOrderSchema>
export type UserRole = z.infer<typeof userRoleSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UserPreferences = z.infer<typeof userPreferencesSchema>
export type ExportOptions = z.infer<typeof exportOptionsSchema>