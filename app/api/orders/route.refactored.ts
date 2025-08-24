/**
 * Refactored Orders API Route Handler
 * 
 * Using the new base handler pattern for consistency and maintainability
 */

import { NextRequest } from 'next/server'
import { 
  createApiHandler, 
  successResponse,
  getPaginationParams,
  validateBody
} from '@/lib/api/base-handler'
import { OrderQueryBuilder } from '@/lib/api/query-builders'
import { 
  createOrderSchema, 
  orderSearchSchema,
  type CreateOrderInput 
} from '@/lib/api/schemas'
import { generateOrderNumber } from '@/lib/utils/order-utils'
import { checkInventoryAvailability, deductInventory } from '@/lib/services/inventory-service'

/**
 * GET /api/orders - List orders with filtering and pagination
 */
export const GET = createApiHandler(
  async ({ request, supabase }) => {
    const searchParams = request.nextUrl.searchParams
    const params = orderSearchSchema.parse(Object.fromEntries(searchParams))
    
    // Build query using the OrderQueryBuilder
    const queryBuilder = new OrderQueryBuilder(supabase)
      .select('*', { count: 'exact' })
      .withRelations(true, true)
    
    // Apply filters
    if (params.status) {
      queryBuilder.status(params.status)
    }
    
    if (params.search) {
      queryBuilder.search(params.search, ['order_number', 'customer_name', 'customer_phone'])
    }
    
    if (params.startDate || params.endDate) {
      queryBuilder.dateRange(params.startDate, params.endDate)
    }
    
    // Apply pagination
    queryBuilder
      .paginate(params.page, params.limit)
      .orderBy(params.orderBy || 'created_at', params.order === 'asc')
    
    // Execute query
    const { data, count } = await queryBuilder.execute()
    
    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / params.limit)
    
    return successResponse(data, {
      pagination: {
        page: params.page,
        limit: params.limit,
        total: count,
        totalPages,
        hasMore: params.page < totalPages
      }
    })
  },
  {
    requiredRoles: ['Admin', 'OrderManager'],
    cache: {
      maxAge: 60,
      staleWhileRevalidate: 300
    }
  }
)

/**
 * POST /api/orders - Create a new order
 */
export const POST = createApiHandler(
  async ({ request, supabase, session, logger }) => {
    // Validate request body
    const input = await validateBody<CreateOrderInput>(request, createOrderSchema)
    
    // Start a pseudo-transaction
    const results = {
      order: null as any,
      orderItems: [] as any[],
      inventoryUpdates: [] as any[],
      cashbookEntry: null as any
    }
    
    try {
      // 1. Check inventory availability
      const availabilityCheck = await checkInventoryAvailability(
        supabase,
        input.items.map(item => ({
          productId: item.product_id,
          quantity: item.quantity
        }))
      )
      
      if (!availabilityCheck.available) {
        return errorResponse(
          'Insufficient inventory',
          400,
          'INSUFFICIENT_INVENTORY',
          availabilityCheck.details
        )
      }
      
      // 2. Generate order number
      const orderNumber = await generateOrderNumber(supabase)
      
      // 3. Calculate totals
      const subtotal = input.items.reduce(
        (sum, item) => sum + (item.quantity * item.unit_price),
        0
      )
      const shippingFee = calculateShippingFee(input.shipping_address.postalCode)
      const totalAmount = subtotal + shippingFee
      
      // 4. Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: input.customer_name,
          customer_phone: input.customer_phone,
          customer_pccc: input.customer_pccc,
          shipping_address: input.shipping_address,
          subtotal,
          shipping_fee: shippingFee,
          total_amount: totalAmount,
          status: 'PAID',
          payment_method: input.payment_method || 'BANK',
          notes: input.notes,
          created_by: session.user.id
        })
        .select()
        .single()
      
      if (orderError) throw orderError
      results.order = order
      
      // 5. Create order items
      const orderItemsData = await Promise.all(
        input.items.map(async (item) => {
          // Get product details
          const { data: product } = await supabase
            .from('products')
            .select('sku, name')
            .eq('id', item.product_id)
            .single()
          
          return {
            order_id: order.id,
            product_id: item.product_id,
            sku: product?.sku || item.sku,
            product_name: product?.name || item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.quantity * item.unit_price
          }
        })
      )
      
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)
        .select()
      
      if (itemsError) throw itemsError
      results.orderItems = orderItems
      
      // 6. Deduct inventory
      const inventoryUpdates = await deductInventory(
        supabase,
        input.items.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
          referenceId: order.id,
          referenceType: 'ORDER'
        }))
      )
      results.inventoryUpdates = inventoryUpdates
      
      // 7. Create cashbook entry
      const { data: cashbookEntry, error: cashbookError } = await supabase
        .from('cashbook')
        .insert({
          type: 'INCOME',
          category: 'SALES',
          amount: totalAmount,
          currency: 'KRW',
          description: `Order ${orderNumber}`,
          reference_type: 'ORDER',
          reference_id: order.id,
          created_by: session.user.id
        })
        .select()
        .single()
      
      if (cashbookError) throw cashbookError
      results.cashbookEntry = cashbookEntry
      
      // 8. Log the event
      await logger.log({
        action: 'ORDER_CREATED',
        entity_type: 'orders',
        entity_id: order.id,
        changes: {
          order_number: orderNumber,
          customer: input.customer_name,
          total: totalAmount,
          items: input.items.length
        }
      })
      
      // Return the complete order with relations
      const { data: completeOrder } = await new OrderQueryBuilder(supabase)
        .select('*')
        .withRelations(true, false)
        .filter([{ field: 'id', operator: 'eq', value: order.id }])
        .execute()
      
      return successResponse(completeOrder[0], {
        message: 'Order created successfully'
      })
      
    } catch (error) {
      // Rollback logic would go here if we had true transactions
      // For now, we'll log the error and return appropriate response
      
      logger.error({
        action: 'ORDER_CREATE_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        input
      })
      
      throw error
    }
  },
  {
    requiredRoles: ['Admin', 'OrderManager']
  }
)

/**
 * Helper function to calculate shipping fee
 */
function calculateShippingFee(postalCode: string): number {
  // Simplified logic - in reality would use a shipping rate table
  const remoteAreaCodes = ['63', '64', '65'] // Jeju and remote areas
  const isRemoteArea = remoteAreaCodes.some(code => postalCode.startsWith(code))
  
  return isRemoteArea ? 5000 : 3000
}