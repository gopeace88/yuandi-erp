const { createClient } = require('@supabase/supabase-js')

async function verifyDataIntegrity() {
  const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co'
  const supabaseKey = 'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🔍 Starting Data Integrity Verification...\n')
  console.log('='.repeat(60))

  try {
    // ========================================
    // 1. Table Row Counts
    // ========================================
    console.log('\n📊 Table Row Counts:')
    console.log('-'.repeat(40))
    
    const tables = ['products', 'orders', 'order_items', 'shipments', 'cashbook', 'inventory_movements', 'event_logs', 'profiles']
    
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      console.log(`   ${table.padEnd(20)}: ${count || 0} rows`)
    }
    
    // ========================================
    // 2. Order Status Distribution
    // ========================================
    console.log('\n📋 Order Status Distribution:')
    console.log('-'.repeat(40))
    
    const { data: orders } = await supabase
      .from('orders')
      .select('status')
    
    const statusCounts = {}
    orders?.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
    })
    
    for (const status in statusCounts) {
      const percentage = ((statusCounts[status] / orders.length) * 100).toFixed(1)
      console.log(`   ${status.padEnd(10)}: ${statusCounts[status]} (${percentage}%)`)
    }
    
    // ========================================
    // 3. Inventory Analysis
    // ========================================
    console.log('\n📦 Inventory Analysis:')
    console.log('-'.repeat(40))
    
    const { data: products } = await supabase
      .from('products')
      .select('on_hand, cost_cny')
    
    const totalStock = products?.reduce((sum, p) => sum + p.on_hand, 0) || 0
    const lowStock = products?.filter(p => p.on_hand < 5).length || 0
    const outOfStock = products?.filter(p => p.on_hand === 0).length || 0
    const totalValue = products?.reduce((sum, p) => sum + (p.on_hand * p.cost_cny), 0) || 0
    
    console.log(`   Total Products      : ${products?.length || 0}`)
    console.log(`   Total Stock         : ${totalStock.toLocaleString()} units`)
    console.log(`   Low Stock (<5)      : ${lowStock} products`)
    console.log(`   Out of Stock        : ${outOfStock} products`)
    console.log(`   Inventory Value     : ${totalValue.toLocaleString()} CNY`)
    
    // ========================================
    // 4. Cashbook Analysis
    // ========================================
    console.log('\n💰 Cashbook Analysis:')
    console.log('-'.repeat(40))
    
    const { data: cashbook } = await supabase
      .from('cashbook')
      .select('type, amount_krw')
    
    const cashbookByType = {}
    cashbook?.forEach(c => {
      if (!cashbookByType[c.type]) {
        cashbookByType[c.type] = { count: 0, total: 0 }
      }
      cashbookByType[c.type].count++
      cashbookByType[c.type].total += c.amount_krw
    })
    
    for (const type in cashbookByType) {
      const data = cashbookByType[type]
      console.log(`   ${type.padEnd(10)}: ${data.count} transactions, ${data.total.toLocaleString()} KRW`)
    }
    
    const totalIncome = cashbook?.filter(c => c.amount_krw > 0).reduce((sum, c) => sum + c.amount_krw, 0) || 0
    const totalExpense = cashbook?.filter(c => c.amount_krw < 0).reduce((sum, c) => sum + Math.abs(c.amount_krw), 0) || 0
    
    console.log('\n   Summary:')
    console.log(`   Total Income        : ${totalIncome.toLocaleString()} KRW`)
    console.log(`   Total Expense       : ${totalExpense.toLocaleString()} KRW`)
    console.log(`   Net Profit/Loss     : ${(totalIncome - totalExpense).toLocaleString()} KRW`)
    
    // ========================================
    // 5. Order-Item-Product Consistency
    // ========================================
    console.log('\n🔗 Order-Item-Product Consistency:')
    console.log('-'.repeat(40))
    
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('order_id, product_id, quantity, unit_price')
    
    const { data: allOrders } = await supabase
      .from('orders')
      .select('id, total_amount')
    
    // Check if every order has items
    const orderIds = new Set(allOrders?.map(o => o.id))
    const orderIdsWithItems = new Set(orderItems?.map(i => i.order_id))
    const ordersWithoutItems = [...orderIds].filter(id => !orderIdsWithItems.has(id))
    
    console.log(`   Orders without items: ${ordersWithoutItems.length}`)
    
    // Check if order totals match item totals
    const orderTotals = {}
    allOrders?.forEach(o => {
      orderTotals[o.id] = o.total_amount
    })
    
    const itemTotals = {}
    orderItems?.forEach(item => {
      if (!itemTotals[item.order_id]) {
        itemTotals[item.order_id] = 0
      }
      itemTotals[item.order_id] += item.unit_price * item.quantity
    })
    
    let mismatchCount = 0
    for (const orderId in orderTotals) {
      if (Math.abs(orderTotals[orderId] - (itemTotals[orderId] || 0)) > 1) {
        mismatchCount++
      }
    }
    
    console.log(`   Order-Item total mismatches: ${mismatchCount}`)
    
    // ========================================
    // 6. Inventory Movement Validation
    // ========================================
    console.log('\n📊 Inventory Movement Validation:')
    console.log('-'.repeat(40))
    
    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('movement_type, quantity')
    
    const movementsByType = {}
    movements?.forEach(m => {
      if (!movementsByType[m.movement_type]) {
        movementsByType[m.movement_type] = { count: 0, quantity: 0 }
      }
      movementsByType[m.movement_type].count++
      movementsByType[m.movement_type].quantity += m.quantity
    })
    
    for (const type in movementsByType) {
      const data = movementsByType[type]
      console.log(`   ${type.padEnd(12)}: ${data.count} movements, ${data.quantity > 0 ? '+' : ''}${data.quantity} units`)
    }
    
    const totalIn = movements?.filter(m => m.quantity > 0).reduce((sum, m) => sum + m.quantity, 0) || 0
    const totalOut = movements?.filter(m => m.quantity < 0).reduce((sum, m) => sum + Math.abs(m.quantity), 0) || 0
    
    console.log('\n   Movement Summary:')
    console.log(`   Total Inbound       : +${totalIn} units`)
    console.log(`   Total Outbound      : -${totalOut} units`)
    console.log(`   Net Movement        : ${totalIn - totalOut} units`)
    console.log(`   Current Stock       : ${totalStock} units`)
    
    // ========================================
    // 7. Shipment Coverage
    // ========================================
    console.log('\n🚚 Shipment Coverage:')
    console.log('-'.repeat(40))
    
    const { data: shipments } = await supabase
      .from('shipments')
      .select('order_id')
    
    const shippedAndDoneOrders = orders?.filter(o => o.status === 'SHIPPED' || o.status === 'DONE') || []
    const ordersWithShipments = new Set(shipments?.map(s => s.order_id))
    const missingShipments = shippedAndDoneOrders.filter(o => !ordersWithShipments.has(o.id))
    
    console.log(`   SHIPPED/DONE orders : ${shippedAndDoneOrders.length}`)
    console.log(`   Shipment records    : ${shipments?.length || 0}`)
    console.log(`   Missing shipments   : ${missingShipments.length}`)
    
    // ========================================
    // 8. Business Flow Validation
    // ========================================
    console.log('\n✅ Business Flow Validation:')
    console.log('-'.repeat(40))
    
    const checks = []
    
    // Check 1: All products have inventory movements
    const { data: productsWithMovements } = await supabase
      .from('inventory_movements')
      .select('product_id')
    const productIdsWithMovements = new Set(productsWithMovements?.map(m => m.product_id))
    const productsWithoutMovements = products?.filter(p => !productIdsWithMovements.has(p.id)).length || 0
    checks.push({
      name: 'Products have movements',
      pass: productsWithoutMovements === 0,
      detail: productsWithoutMovements === 0 ? 'All products have movements' : `${productsWithoutMovements} products without movements`
    })
    
    // Check 2: All orders have cashbook entries
    const { data: cashbookRefs } = await supabase
      .from('cashbook')
      .select('ref_id')
      .eq('ref_type', 'order')
    const orderIdsInCashbook = new Set(cashbookRefs?.map(c => c.ref_id))
    const ordersWithoutCashbook = [...orderIds].filter(id => !orderIdsInCashbook.has(id)).length
    checks.push({
      name: 'Orders have cashbook',
      pass: ordersWithoutCashbook === 0,
      detail: ordersWithoutCashbook === 0 ? 'All orders have cashbook entries' : `${ordersWithoutCashbook} orders without cashbook`
    })
    
    // Check 3: Stock levels are non-negative
    const negativeStock = products?.filter(p => p.on_hand < 0).length || 0
    checks.push({
      name: 'Non-negative stock',
      pass: negativeStock === 0,
      detail: negativeStock === 0 ? 'All stock levels are valid' : `${negativeStock} products with negative stock`
    })
    
    // Check 4: Movement balance matches current stock
    const movementBalance = totalIn - totalOut
    const stockMatch = Math.abs(movementBalance - totalStock) < 10
    checks.push({
      name: 'Movement-Stock match',
      pass: stockMatch,
      detail: stockMatch ? 'Movement balance matches stock' : `Movement: ${movementBalance}, Stock: ${totalStock}`
    })
    
    console.log('\n   Validation Results:')
    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌'
      console.log(`   ${icon} ${check.name.padEnd(25)}: ${check.detail}`)
    })
    
    const allPassed = checks.every(c => c.pass)
    
    console.log('\n' + '='.repeat(60))
    if (allPassed) {
      console.log('🎉 All data integrity checks PASSED!')
    } else {
      console.log('⚠️ Some integrity checks failed. Please review the issues above.')
    }
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('Error:', error)
  }
}

verifyDataIntegrity().catch(console.error)