/**
 * Inventory Service
 * 
 * Centralized business logic for inventory management
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { ProductQueryBuilder } from '@/lib/api/query-builders'

export interface InventoryCheckItem {
  productId: string
  quantity: number
}

export interface InventoryCheckResult {
  available: boolean
  details: Array<{
    productId: string
    requested: number
    available: number
    sufficient: boolean
    productName?: string
  }>
}

export interface InventoryDeductItem {
  productId: string
  quantity: number
  referenceId: string
  referenceType: 'ORDER' | 'ADJUSTMENT' | 'SAMPLE'
}

/**
 * Check inventory availability for multiple items
 */
export async function checkInventoryAvailability(
  supabase: SupabaseClient,
  items: InventoryCheckItem[]
): Promise<InventoryCheckResult> {
  const productIds = items.map(item => item.productId)
  
  // Fetch current inventory levels
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, on_hand, active')
    .in('id', productIds)
  
  if (error) throw error
  
  // Create a map for quick lookup
  const productMap = new Map(
    products?.map(p => [p.id, p]) || []
  )
  
  // Check availability for each item
  const details = items.map(item => {
    const product = productMap.get(item.productId)
    
    if (!product) {
      return {
        productId: item.productId,
        requested: item.quantity,
        available: 0,
        sufficient: false,
        productName: 'Product not found'
      }
    }
    
    if (!product.active) {
      return {
        productId: item.productId,
        requested: item.quantity,
        available: 0,
        sufficient: false,
        productName: `${product.name} (Inactive)`
      }
    }
    
    return {
      productId: item.productId,
      requested: item.quantity,
      available: product.on_hand,
      sufficient: product.on_hand >= item.quantity,
      productName: product.name
    }
  })
  
  const available = details.every(d => d.sufficient)
  
  return { available, details }
}

/**
 * Deduct inventory for multiple items
 */
export async function deductInventory(
  supabase: SupabaseClient,
  items: InventoryDeductItem[]
): Promise<any[]> {
  const updates = []
  
  for (const item of items) {
    // Update product inventory
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, on_hand')
      .eq('id', item.productId)
      .single()
    
    if (fetchError) throw fetchError
    
    const newQuantity = product.on_hand - item.quantity
    
    if (newQuantity < 0) {
      throw new Error(`Insufficient inventory for product ${item.productId}`)
    }
    
    const { error: updateError } = await supabase
      .from('products')
      .update({ on_hand: newQuantity })
      .eq('id', item.productId)
    
    if (updateError) throw updateError
    
    // Record inventory movement
    const { data: movement, error: movementError } = await supabase
      .from('inventory_movements')
      .insert({
        product_id: item.productId,
        type: 'OUTBOUND',
        quantity: -item.quantity,
        before_quantity: product.on_hand,
        after_quantity: newQuantity,
        reference_type: item.referenceType,
        reference_id: item.referenceId
      })
      .select()
      .single()
    
    if (movementError) throw movementError
    
    updates.push(movement)
  }
  
  return updates
}

/**
 * Add inventory (inbound)
 */
export async function addInventory(
  supabase: SupabaseClient,
  productId: string,
  quantity: number,
  costCny?: number,
  notes?: string,
  referenceNo?: string
): Promise<any> {
  // Get current inventory
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id, on_hand, cost_cny')
    .eq('id', productId)
    .single()
  
  if (fetchError) throw fetchError
  
  const newQuantity = product.on_hand + quantity
  
  // Update product inventory and optionally cost
  const updateData: any = { on_hand: newQuantity }
  
  if (costCny !== undefined) {
    // Calculate weighted average cost
    const totalValue = (product.on_hand * product.cost_cny) + (quantity * costCny)
    const newAvgCost = totalValue / newQuantity
    updateData.cost_cny = newAvgCost
  }
  
  const { error: updateError } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', productId)
  
  if (updateError) throw updateError
  
  // Record inventory movement
  const { data: movement, error: movementError } = await supabase
    .from('inventory_movements')
    .insert({
      product_id: productId,
      type: 'INBOUND',
      quantity: quantity,
      before_quantity: product.on_hand,
      after_quantity: newQuantity,
      cost_cny: costCny || product.cost_cny,
      notes,
      reference_no: referenceNo
    })
    .select()
    .single()
  
  if (movementError) throw movementError
  
  return movement
}

/**
 * Adjust inventory (correction)
 */
export async function adjustInventory(
  supabase: SupabaseClient,
  productId: string,
  quantity: number,
  type: 'ADD' | 'SUBTRACT' | 'SET',
  reason: string,
  notes?: string
): Promise<any> {
  // Get current inventory
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id, on_hand')
    .eq('id', productId)
    .single()
  
  if (fetchError) throw fetchError
  
  let newQuantity: number
  let adjustmentQuantity: number
  
  switch (type) {
    case 'ADD':
      newQuantity = product.on_hand + quantity
      adjustmentQuantity = quantity
      break
    case 'SUBTRACT':
      newQuantity = Math.max(0, product.on_hand - quantity)
      adjustmentQuantity = -quantity
      break
    case 'SET':
      newQuantity = quantity
      adjustmentQuantity = quantity - product.on_hand
      break
  }
  
  // Update product inventory
  const { error: updateError } = await supabase
    .from('products')
    .update({ on_hand: newQuantity })
    .eq('id', productId)
  
  if (updateError) throw updateError
  
  // Record inventory movement
  const { data: movement, error: movementError } = await supabase
    .from('inventory_movements')
    .insert({
      product_id: productId,
      type: 'ADJUSTMENT',
      quantity: adjustmentQuantity,
      before_quantity: product.on_hand,
      after_quantity: newQuantity,
      reason,
      notes
    })
    .select()
    .single()
  
  if (movementError) throw movementError
  
  return movement
}

/**
 * Get low stock products
 */
export async function getLowStockProducts(
  supabase: SupabaseClient,
  limit: number = 10
): Promise<any[]> {
  const queryBuilder = new ProductQueryBuilder(supabase)
    .select('id, sku, name, on_hand, low_stock_threshold')
    .lowStock()
    .active(true)
    .orderBy('on_hand', true)
    .paginate(1, limit)
  
  const { data } = await queryBuilder.execute()
  return data || []
}

/**
 * Calculate inventory value
 */
export async function calculateInventoryValue(
  supabase: SupabaseClient,
  category?: string
): Promise<{
  totalValue: number
  totalItems: number
  totalQuantity: number
  byCategory?: Record<string, number>
}> {
  let query = supabase
    .from('products')
    .select('category, on_hand, cost_cny')
    .eq('active', true)
  
  if (category) {
    query = query.eq('category', category)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  
  const result = {
    totalValue: 0,
    totalItems: 0,
    totalQuantity: 0,
    byCategory: {} as Record<string, number>
  }
  
  data?.forEach(product => {
    const value = product.on_hand * product.cost_cny
    result.totalValue += value
    result.totalItems += 1
    result.totalQuantity += product.on_hand
    
    if (!result.byCategory[product.category]) {
      result.byCategory[product.category] = 0
    }
    result.byCategory[product.category] += value
  })
  
  return result
}

/**
 * Get inventory movement history
 */
export async function getInventoryMovements(
  supabase: SupabaseClient,
  productId?: string,
  type?: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT',
  startDate?: string,
  endDate?: string,
  limit: number = 50
): Promise<any[]> {
  let query = supabase
    .from('inventory_movements')
    .select(`
      *,
      product:products (
        id,
        sku,
        name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (productId) {
    query = query.eq('product_id', productId)
  }
  
  if (type) {
    query = query.eq('type', type)
  }
  
  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  
  if (endDate) {
    query = query.lte('created_at', endDate)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

/**
 * Forecast stock depletion
 */
export async function forecastStockDepletion(
  supabase: SupabaseClient,
  productId: string,
  days: number = 30
): Promise<{
  currentStock: number
  averageDailyUsage: number
  daysUntilDepletion: number
  depletionDate: Date | null
  needsReorder: boolean
}> {
  // Get current stock
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('on_hand, low_stock_threshold')
    .eq('id', productId)
    .single()
  
  if (productError) throw productError
  
  // Get usage history
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const { data: movements, error: movementsError } = await supabase
    .from('inventory_movements')
    .select('quantity, created_at')
    .eq('product_id', productId)
    .eq('type', 'OUTBOUND')
    .gte('created_at', startDate.toISOString())
  
  if (movementsError) throw movementsError
  
  // Calculate average daily usage
  const totalUsage = movements?.reduce((sum, m) => sum + Math.abs(m.quantity), 0) || 0
  const averageDailyUsage = totalUsage / days
  
  // Calculate depletion
  const daysUntilDepletion = averageDailyUsage > 0 
    ? Math.floor(product.on_hand / averageDailyUsage)
    : Infinity
  
  const depletionDate = isFinite(daysUntilDepletion)
    ? new Date(Date.now() + daysUntilDepletion * 24 * 60 * 60 * 1000)
    : null
  
  const needsReorder = product.on_hand <= product.low_stock_threshold ||
    (isFinite(daysUntilDepletion) && daysUntilDepletion <= 7)
  
  return {
    currentStock: product.on_hand,
    averageDailyUsage,
    daysUntilDepletion: isFinite(daysUntilDepletion) ? daysUntilDepletion : -1,
    depletionDate,
    needsReorder
  }
}