const { createClient } = require('@supabase/supabase-js')

async function seedRemainingTables() {
  const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co'
  const supabaseKey = 'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🔗 Creating remaining related data...')

  try {
    // Get existing data
    const { data: products } = await supabase.from('products').select('*')
    const { data: orders } = await supabase.from('orders').select('*')
    const { data: orderItems } = await supabase.from('order_items').select('*')
    const { data: profiles } = await supabase.from('profiles').select('*')
    
    console.log(`Working with: ${orders.length} orders, ${orderItems.length} order_items`)

    // 1. Create shipments with correct schema
    console.log('Creating shipments...')
    const shipments = []
    const couriers = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배']
    const courierCodes = ['04', '05', '08', '01', '06']
    
    const shippedOrders = orders.filter(o => o.status === 'SHIPPED' || o.status === 'DONE')
    
    for (const order of shippedOrders) {
      const courierIndex = Math.floor(Math.random() * couriers.length)
      const shippedDate = new Date(order.created_at)
      shippedDate.setDate(shippedDate.getDate() + 1)
      
      const deliveredDate = order.status === 'DONE' 
        ? new Date(shippedDate.getTime() + (2 * 24 * 60 * 60 * 1000))
        : null
      
      const trackingNo = `${Date.now()}${Math.floor(Math.random() * 1000)}`
      
      shipments.push({
        order_id: order.id,
        courier: couriers[courierIndex],
        courier_code: courierCodes[courierIndex],
        tracking_no: trackingNo,
        tracking_url: `https://tracker.delivery/#/${courierCodes[courierIndex]}/${trackingNo}`,
        shipping_fee: 2500,
        shipped_at: shippedDate.toISOString(),
        delivered_at: deliveredDate ? deliveredDate.toISOString() : null,
        created_by: profiles[0]?.id || null
      })
    }
    
    const { error: shipmentError, data: createdShipments } = await supabase
      .from('shipments')
      .insert(shipments)
      .select()
    
    if (shipmentError) {
      console.error('Error creating shipments:', shipmentError)
    } else {
      console.log(`✅ Created ${createdShipments.length} shipments`)
    }

    // 2. Create cashbook entries with correct schema
    console.log('Creating cashbook entries...')
    const cashbookEntries = []
    
    // Sort orders by date
    const sortedOrders = orders.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    for (const order of sortedOrders) {
      // Income from order (except refunded)
      if (order.status !== 'REFUNDED') {
        cashbookEntries.push({
          transaction_date: order.order_date || order.created_at.split('T')[0],
          type: 'sale',
          amount: order.total_amount,
          currency: 'KRW',
          fx_rate: 1,
          amount_krw: order.total_amount,
          ref_type: 'order',
          ref_id: order.id,
          ref_no: order.order_no,
          description: `판매 수입 - ${order.customer_name}`,
          created_by: profiles[0]?.id || null
        })
      }
      
      // Refund entry if refunded
      if (order.status === 'REFUNDED') {
        const refundDate = new Date(order.created_at)
        refundDate.setDate(refundDate.getDate() + 3)
        
        cashbookEntries.push({
          transaction_date: refundDate.toISOString().split('T')[0],
          type: 'refund',
          amount: -order.total_amount,
          currency: 'KRW',
          fx_rate: 1,
          amount_krw: -order.total_amount,
          ref_type: 'order',
          ref_id: order.id,
          ref_no: order.order_no,
          description: `환불 처리 - ${order.customer_name}`,
          created_by: profiles[0]?.id || null
        })
      }
      
      // Shipping cost for shipped orders
      if (order.status === 'SHIPPED' || order.status === 'DONE') {
        const shippingDate = new Date(order.created_at)
        shippingDate.setDate(shippingDate.getDate() + 1)
        
        cashbookEntries.push({
          transaction_date: shippingDate.toISOString().split('T')[0],
          type: 'shipping',
          amount: -2500,
          currency: 'KRW',
          fx_rate: 1,
          amount_krw: -2500,
          ref_type: 'order',
          ref_id: order.id,
          ref_no: order.order_no,
          description: `배송비 지출`,
          created_by: profiles[0]?.id || null
        })
      }
    }
    
    // Add some inbound transactions for products
    const inboundDate = new Date()
    inboundDate.setMonth(inboundDate.getMonth() - 2)
    
    for (let i = 0; i < 10; i++) {
      const product = products[Math.floor(Math.random() * products.length)]
      const quantity = Math.floor(Math.random() * 50) + 10
      const unitCost = product.cost_cny * 200 // Rough CNY to KRW conversion
      
      cashbookEntries.push({
        transaction_date: inboundDate.toISOString().split('T')[0],
        type: 'inbound',
        amount: -(unitCost * quantity),
        currency: 'KRW',
        fx_rate: 1,
        amount_krw: -(unitCost * quantity),
        ref_type: 'product',
        ref_id: product.id,
        ref_no: product.sku,
        description: `상품 매입 - ${product.name}`,
        created_by: profiles[0]?.id || null
      })
      
      inboundDate.setDate(inboundDate.getDate() + 3)
    }
    
    const { error: cashbookError, data: createdCashbook } = await supabase
      .from('cashbook')
      .insert(cashbookEntries)
      .select()
    
    if (cashbookError) {
      console.error('Error creating cashbook:', cashbookError)
    } else {
      console.log(`✅ Created ${createdCashbook.length} cashbook entries`)
    }

    // 3. Create inventory_movements with correct schema
    console.log('Creating inventory_movements...')
    const movements = []
    
    // Track current balances
    const productBalances = {}
    
    // Initial stock movements for all products
    for (const product of products) {
      if (product.on_hand > 0) {
        productBalances[product.id] = product.on_hand
        
        movements.push({
          product_id: product.id,
          movement_type: 'inbound',
          quantity: product.on_hand,
          balance_before: 0,
          balance_after: product.on_hand,
          ref_type: 'initial',
          ref_no: 'INIT-001',
          unit_cost: product.cost_cny,
          total_cost: product.cost_cny * product.on_hand,
          note: '초기 재고 등록',
          movement_date: product.created_at.split('T')[0],
          created_by: profiles[0]?.id || null
        })
      }
    }
    
    // Outbound movements for each order item
    for (const item of orderItems) {
      const order = orders.find(o => o.id === item.order_id)
      const product = products.find(p => p.id === item.product_id)
      
      if (order && product && order.status !== 'REFUNDED') {
        const balanceBefore = productBalances[product.id] || 0
        const balanceAfter = balanceBefore - item.quantity
        productBalances[product.id] = balanceAfter
        
        movements.push({
          product_id: item.product_id,
          movement_type: 'sale',
          quantity: -item.quantity,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          ref_type: 'order',
          ref_id: order.id,
          ref_no: order.order_no,
          unit_cost: product.cost_cny,
          total_cost: product.cost_cny * item.quantity,
          note: `판매 출고 - ${order.customer_name}`,
          movement_date: order.order_date || order.created_at.split('T')[0],
          created_by: profiles[0]?.id || null
        })
      }
    }
    
    const { error: movementError, data: createdMovements } = await supabase
      .from('inventory_movements')
      .insert(movements)
      .select()
    
    if (movementError) {
      console.error('Error creating inventory_movements:', movementError)
    } else {
      console.log(`✅ Created ${createdMovements.length} inventory_movements`)
    }

    // 4. Create event_logs with correct schema
    console.log('Creating event_logs...')
    const eventLogs = []
    
    // Log order creation
    for (const order of orders.slice(0, 30)) {
      eventLogs.push({
        actor_id: profiles[0]?.id || null,
        actor_name: profiles[0]?.name || 'System',
        actor_role: profiles[0]?.role || 'Admin',
        event_type: 'order_created',
        event_category: 'order',
        event_severity: 'info',
        entity_type: 'order',
        entity_id: order.id,
        entity_name: order.order_no,
        action: 'INSERT',
        after_data: { order_no: order.order_no, customer: order.customer_name, amount: order.total_amount },
        created_at: order.created_at
      })
    }
    
    // Log shipment creation
    for (const shipment of shipments.slice(0, 20)) {
      const order = orders.find(o => o.id === shipment.order_id)
      eventLogs.push({
        actor_id: profiles[0]?.id || null,
        actor_name: profiles[0]?.name || 'System',
        actor_role: profiles[0]?.role || 'Admin',
        event_type: 'shipment_created',
        event_category: 'shipping',
        event_severity: 'info',
        entity_type: 'shipment',
        entity_id: shipment.order_id,
        entity_name: shipment.tracking_no,
        action: 'INSERT',
        after_data: { tracking_no: shipment.tracking_no, courier: shipment.courier },
        created_at: shipment.shipped_at
      })
    }
    
    const { error: logError, data: createdLogs } = await supabase
      .from('event_logs')
      .insert(eventLogs)
      .select()
    
    if (logError) {
      console.error('Error creating event_logs:', logError)
    } else {
      console.log(`✅ Created ${createdLogs.length} event_logs`)
    }

    // 5. Summary
    console.log('\n📊 Complete Data Relationship Summary:')
    console.log('=====================================')
    console.log('✅ All tables are now connected:')
    console.log(`   - Orders: ${orders.length}`)
    console.log(`   - Order Items: ${orderItems.length}`)
    console.log(`   - Shipments: ${shipments.length}`)
    console.log(`   - Cashbook: ${cashbookEntries.length}`)
    console.log(`   - Inventory Movements: ${movements.length}`)
    console.log(`   - Event Logs: ${eventLogs.length}`)
    console.log('✅ Business flow is complete:')
    console.log('   Order → Order Items → Shipment → Cashbook → Inventory')
    console.log('=====================================')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

seedRemainingTables().catch(console.error)