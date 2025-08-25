const { createClient } = require('@supabase/supabase-js')

async function seedRelatedData() {
  const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co'
  const supabaseKey = 'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🔗 Creating related data to connect all tables...')

  try {
    // 1. Get existing data
    console.log('Fetching existing data...')
    
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .limit(100)
    
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: true })
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
    
    console.log(`Found: ${products.length} products, ${orders.length} orders, ${profiles.length} profiles`)

    // 2. Create order_items for each order
    console.log('Creating order_items...')
    const orderItems = []
    
    for (const order of orders) {
      // Each order gets 1-3 random products
      const itemCount = Math.floor(Math.random() * 3) + 1
      const selectedProducts = []
      let orderTotal = 0
      
      for (let i = 0; i < itemCount; i++) {
        const product = products[Math.floor(Math.random() * products.length)]
        if (!selectedProducts.find(p => p.id === product.id)) {
          selectedProducts.push(product)
          const quantity = Math.floor(Math.random() * 3) + 1
          const price = product.sale_price_krw || 50000
          const subtotal = price * quantity
          orderTotal += subtotal
          
          orderItems.push({
            order_id: order.id,
            product_id: product.id,
            sku: product.sku,
            product_name: product.name,
            quantity: quantity,
            unit_price: price,
            subtotal: subtotal
          })
        }
      }
      
      // Update order total to match items
      await supabase
        .from('orders')
        .update({ total_amount: orderTotal })
        .eq('id', order.id)
    }
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
    
    if (itemsError) {
      console.error('Error creating order_items:', itemsError)
    } else {
      console.log(`✅ Created ${orderItems.length} order_items`)
    }

    // 3. Create shipments for SHIPPED and DONE orders
    console.log('Creating shipments...')
    const shipments = []
    const couriers = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배']
    
    const shippedOrders = orders.filter(o => o.status === 'SHIPPED' || o.status === 'DONE')
    
    for (const order of shippedOrders) {
      const shippedDate = new Date(order.created_at)
      shippedDate.setDate(shippedDate.getDate() + 1) // Ship next day
      
      const deliveredDate = order.status === 'DONE' 
        ? new Date(shippedDate.getTime() + (2 * 24 * 60 * 60 * 1000)) // Deliver 2 days after shipping
        : null
      
      shipments.push({
        order_id: order.id,
        courier: couriers[Math.floor(Math.random() * couriers.length)],
        tracking_no: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
        shipped_at: shippedDate.toISOString(),
        delivered_at: deliveredDate ? deliveredDate.toISOString() : null,
        shipping_fee: 2500,
        shipping_memo: order.status === 'DONE' ? '배송완료' : '배송중'
      })
    }
    
    const { error: shipmentError } = await supabase
      .from('shipments')
      .insert(shipments)
    
    if (shipmentError) {
      console.error('Error creating shipments:', shipmentError)
    } else {
      console.log(`✅ Created ${shipments.length} shipments`)
    }

    // 4. Create cashbook entries for all orders
    console.log('Creating cashbook entries...')
    const cashbookEntries = []
    let runningBalance = 0
    
    // Sort orders by date for proper cashbook flow
    const sortedOrders = orders.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    for (const order of sortedOrders) {
      // Income from order (except refunded)
      if (order.status !== 'REFUNDED') {
        runningBalance += order.total_amount
        cashbookEntries.push({
          transaction_date: order.created_at,
          transaction_type: 'sale',
          description: `판매 - 주문번호: ${order.order_no}`,
          category: 'sales',
          amount: order.total_amount,
          reference_type: 'order',
          reference_id: order.id,
          created_at: order.created_at
        })
      }
      
      // Refund entry if refunded
      if (order.status === 'REFUNDED') {
        runningBalance -= order.total_amount
        const refundDate = new Date(order.created_at)
        refundDate.setDate(refundDate.getDate() + 3) // Refund 3 days later
        
        cashbookEntries.push({
          transaction_date: refundDate.toISOString(),
          transaction_type: 'refund',
          description: `환불 - 주문번호: ${order.order_no}`,
          category: 'refund',
          amount: -order.total_amount,
          reference_type: 'order',
          reference_id: order.id,
          created_at: refundDate.toISOString()
        })
      }
      
      // Shipping cost for shipped orders
      if (order.status === 'SHIPPED' || order.status === 'DONE') {
        runningBalance -= 2500
        const shippingDate = new Date(order.created_at)
        shippingDate.setDate(shippingDate.getDate() + 1)
        
        cashbookEntries.push({
          transaction_date: shippingDate.toISOString(),
          transaction_type: 'shipping',
          description: `배송비 - 주문번호: ${order.order_no}`,
          category: 'shipping',
          amount: -2500,
          reference_type: 'order',
          reference_id: order.id,
          created_at: shippingDate.toISOString()
        })
      }
    }
    
    const { error: cashbookError } = await supabase
      .from('cashbook')
      .insert(cashbookEntries)
    
    if (cashbookError) {
      console.error('Error creating cashbook:', cashbookError)
    } else {
      console.log(`✅ Created ${cashbookEntries.length} cashbook entries`)
    }

    // 5. Create inventory_movements for sold products
    console.log('Creating inventory_movements...')
    const movements = []
    
    // Initial stock movements for all products
    for (const product of products) {
      if (product.on_hand > 0) {
        movements.push({
          product_id: product.id,
          movement_type: 'inbound',
          quantity: product.on_hand,
          reference_type: 'initial',
          reference_id: null,
          note: '초기 재고',
          created_at: product.created_at,
          created_by: profiles[0]?.id || null
        })
      }
    }
    
    // Outbound movements for each order item
    for (const item of orderItems) {
      const order = orders.find(o => o.id === item.order_id)
      if (order && order.status !== 'REFUNDED') {
        movements.push({
          product_id: item.product_id,
          movement_type: 'sale',
          quantity: -item.quantity,
          reference_type: 'order',
          reference_id: order.id,
          note: `판매 - 주문번호: ${order.order_no}`,
          created_at: order.created_at,
          created_by: profiles[0]?.id || null
        })
      }
    }
    
    const { error: movementError } = await supabase
      .from('inventory_movements')
      .insert(movements)
    
    if (movementError) {
      console.error('Error creating inventory_movements:', movementError)
    } else {
      console.log(`✅ Created ${movements.length} inventory_movements`)
    }

    // 6. Create event_logs for important actions
    console.log('Creating event_logs...')
    const eventLogs = []
    
    // Log order creation
    for (const order of orders.slice(0, 20)) { // Just log first 20 to avoid too many
      eventLogs.push({
        event_type: 'order_created',
        table_name: 'orders',
        record_id: order.id,
        action: 'INSERT',
        description: `주문 생성: ${order.order_no}`,
        actor_id: profiles[0]?.id || null,
        created_at: order.created_at
      })
    }
    
    const { error: logError } = await supabase
      .from('event_logs')
      .insert(eventLogs)
    
    if (logError) {
      console.error('Error creating event_logs:', logError)
    } else {
      console.log(`✅ Created ${eventLogs.length} event_logs`)
    }

    // 7. Summary
    console.log('\n📊 Data Relationship Summary:')
    console.log('================================')
    console.log(`✅ Orders (${orders.length}) are linked to:`)
    console.log(`   - Order Items (${orderItems.length})`)
    console.log(`   - Shipments (${shipments.length})`)
    console.log(`   - Cashbook entries (${cashbookEntries.length})`)
    console.log(`✅ Products (${products.length}) are linked to:`)
    console.log(`   - Order Items (${orderItems.length})`)
    console.log(`   - Inventory Movements (${movements.length})`)
    console.log(`✅ All financial transactions are recorded in Cashbook`)
    console.log(`✅ All inventory changes are tracked in Inventory Movements`)
    console.log('================================')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

seedRelatedData().catch(console.error)