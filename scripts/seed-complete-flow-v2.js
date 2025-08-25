const { createClient } = require('@supabase/supabase-js')

async function seedCompleteFlow() {
  const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co'
  const supabaseKey = 'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🌱 Starting complete business flow data seeding...')

  try {
    // Get existing profiles for created_by field
    const { data: profiles } = await supabase.from('profiles').select('*')
    const adminUser = profiles?.[0] || null
    
    // ========================================
    // STEP 1: Create 100 products with stock
    // ========================================
    console.log('\n📦 Step 1: Creating products with initial stock...')
    
    const categories = ['전자제품', '의류', '화장품', '식품', '생활용품', '도서', '장난감', '가방', '신발', '액세서리']
    const brands = ['삼성', '애플', '나이키', '아디다스', '샤넬', '루이비통', '구찌', '프라다', '롯데', 'LG']
    const colors = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Gray', 'Brown', 'Purple']
    
    const products = []
    const inventoryMovements = []
    const cashbookEntries = []
    const eventLogs = []
    
    for (let i = 1; i <= 100; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)]
      const brand = brands[Math.floor(Math.random() * brands.length)]
      const color = colors[Math.floor(Math.random() * colors.length)]
      const modelNum = `MODEL-${String(i).padStart(3, '0')}`
      
      // Generate SKU
      const hash = Math.random().toString(36).substring(2, 7).toUpperCase()
      const sku = `${category.substring(0, 4).toUpperCase()}-${modelNum}-${color}-${brand.substring(0, 4).toUpperCase()}-${hash}`
      
      // Initial stock: 10-50 units
      const initialStock = Math.floor(Math.random() * 41) + 10
      const costCny = Math.floor(Math.random() * 900) + 100 // 100-1000 CNY
      
      const product = {
        sku,
        category,
        name: `${brand} ${modelNum}`,
        model: modelNum,
        color,
        brand,
        cost_cny: costCny,
        sale_price_krw: Math.floor(costCny * 200 * 1.5), // 판매가 = 원가 * 환율 * 마진
        on_hand: initialStock,
        low_stock_threshold: 5,
        active: true
      }
      
      products.push(product)
    }
    
    // Insert products
    const { data: createdProducts, error: productError } = await supabase
      .from('products')
      .insert(products)
      .select()
    
    if (productError) {
      console.error('Error creating products:', productError)
      return
    }
    
    console.log(`✅ Created ${createdProducts.length} products`)
    
    // Create inventory movements for initial stock
    for (const product of createdProducts) {
      inventoryMovements.push({
        product_id: product.id,
        movement_type: 'inbound',
        quantity: product.on_hand,
        unit_cost: product.cost_cny,
        balance_before: 0,
        balance_after: product.on_hand,
        ref_type: 'initial',
        ref_no: 'INIT-001',
        note: '초기 재고 등록',
        movement_date: new Date().toISOString().split('T')[0],
        created_by: adminUser?.id || null
      })
      
      // Cashbook entry for inbound
      cashbookEntries.push({
        transaction_date: new Date().toISOString().split('T')[0],
        type: 'inbound',
        amount: -(product.on_hand * product.cost_cny), // 매입은 지출
        currency: 'CNY',
        fx_rate: 200,
        amount_krw: -(product.on_hand * product.cost_cny * 200),
        ref_type: 'product',
        ref_id: product.id,
        ref_no: product.sku,
        description: `상품 매입 - ${product.name}`,
        created_by: adminUser?.id || null
      })
      
      // Event log
      eventLogs.push({
        actor_id: adminUser?.id || null,
        actor_name: adminUser?.name || 'System',
        actor_role: adminUser?.role || 'Admin',
        event_type: 'inventory_inbound',
        event_category: 'inventory',
        event_severity: 'info',
        entity_type: 'product',
        entity_id: product.id,
        entity_name: product.sku,
        action: 'INSERT',
        after_data: { 
          product: product.name, 
          quantity: product.on_hand, 
          cost: product.cost_cny 
        }
      })
    }
    
    // Insert inventory movements
    const { error: movementError } = await supabase
      .from('inventory_movements')
      .insert(inventoryMovements)
    
    if (movementError) {
      console.error('Error creating inventory movements:', movementError)
    } else {
      console.log(`✅ Created ${inventoryMovements.length} inventory movements`)
    }
    
    // ========================================
    // STEP 2: Create 200+ orders from 100+ customers
    // ========================================
    console.log('\n📋 Step 2: Creating orders...')
    
    const orders = []
    const orderItems = []
    const orderMovements = []
    const orderCashbook = []
    const orderEvents = []
    
    // Create customer names
    const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임']
    const firstNames = ['민준', '서연', '지우', '서준', '하윤', '지호', '수아', '도윤', '예준', '시우']
    const customers = []
    
    for (let i = 0; i < 100; i++) {
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
      customers.push({
        name: `${lastName}${firstName}`,
        phone: `010${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
      })
    }
    
    // Track product stock
    const productStock = {}
    createdProducts.forEach(p => {
      productStock[p.id] = p.on_hand
    })
    
    // Create 200 orders
    for (let i = 1; i <= 200; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)]
      const orderDate = new Date()
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30)) // Last 30 days
      
      // Find a product with available stock
      const availableProducts = createdProducts.filter(p => productStock[p.id] > 0)
      if (availableProducts.length === 0) {
        console.log('No more products with stock available')
        break
      }
      
      const product = availableProducts[Math.floor(Math.random() * availableProducts.length)]
      
      // Generate order number
      const dateStr = orderDate.toISOString().split('T')[0].replace(/-/g, '').substring(2)
      const orderNo = `ORD-${dateStr}-${String(i).padStart(3, '0')}`
      
      // Determine status (30% PAID, 30% SHIPPED, 20% DONE, 20% REFUNDED)
      let status
      const rand = Math.random()
      if (rand < 0.3) status = 'PAID'
      else if (rand < 0.6) status = 'SHIPPED'
      else if (rand < 0.8) status = 'DONE'
      else status = 'REFUNDED'
      
      const order = {
        order_no: orderNo,
        order_date: orderDate.toISOString().split('T')[0],
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: `${customer.name.toLowerCase()}@example.com`,
        pccc_code: `P${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`,
        shipping_address: `서울시 강남구 테헤란로 ${Math.floor(Math.random() * 500) + 1}`,
        shipping_address_detail: `${Math.floor(Math.random() * 20) + 1}층 ${Math.floor(Math.random() * 10) + 1}호`,
        zip_code: `${Math.floor(Math.random() * 90000) + 10000}`,
        total_amount: product.sale_price_krw,
        status,
        created_by: adminUser?.id || null
      }
      
      orders.push(order)
      
      // Update stock for all orders (no cancellation in this version)
      productStock[product.id]--
    }
    
    // Insert orders
    const { data: createdOrders, error: orderError } = await supabase
      .from('orders')
      .insert(orders)
      .select()
    
    if (orderError) {
      console.error('Error creating orders:', orderError)
      return
    }
    
    console.log(`✅ Created ${createdOrders.length} orders`)
    
    // ========================================
    // STEP 3: Create order items and process statuses
    // ========================================
    console.log('\n📦 Step 3: Creating order items and processing statuses...')
    
    const shipments = []
    
    // Create order items and related records
    for (const order of createdOrders) {
      // Find a product for this order (simple matching based on price)
      const product = createdProducts.find(p => p.sale_price_krw === order.total_amount) || createdProducts[0]
      
      // Create order item (single product per order)
      orderItems.push({
        order_id: order.id,
        product_id: product.id,
        sku: product.sku,
        product_name: product.name,
        quantity: 1,
        unit_price: product.sale_price_krw,
        subtotal: product.sale_price_krw
      })
      
      // Inventory movement for sale
      orderMovements.push({
        product_id: product.id,
        movement_type: 'sale',
        quantity: -1,
        unit_cost: product.cost_cny,
        balance_before: productStock[product.id] + 1,
        balance_after: productStock[product.id],
        ref_type: 'order',
        ref_id: order.id,
        ref_no: order.order_no,
        note: `판매 출고 - ${order.customer_name}`,
        movement_date: order.order_date,
        created_by: adminUser?.id || null
      })
      
      // Cashbook entries based on status
      if (order.status === 'PAID' || order.status === 'SHIPPED' || order.status === 'DONE') {
        // Sale income
        orderCashbook.push({
          transaction_date: order.order_date,
          type: 'sale',
          amount: order.total_amount,
          currency: 'KRW',
          fx_rate: 1,
          amount_krw: order.total_amount,
          ref_type: 'order',
          ref_id: order.id,
          ref_no: order.order_no,
          description: `판매 수입 - ${order.customer_name}`,
          created_by: adminUser?.id || null
        })
      }
      
      // Shipment for SHIPPED and DONE orders
      if (order.status === 'SHIPPED' || order.status === 'DONE') {
        const couriers = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배']
        const courierCodes = ['04', '05', '08', '01', '06']
        const courierIndex = Math.floor(Math.random() * couriers.length)
        
        const shippedDate = new Date(order.order_date)
        shippedDate.setDate(shippedDate.getDate() + 1)
        
        const trackingNo = `${Date.now()}${Math.floor(Math.random() * 1000)}`
        
        shipments.push({
          order_id: order.id,
          courier: couriers[courierIndex],
          courier_code: courierCodes[courierIndex],
          tracking_no: trackingNo,
          tracking_url: `https://tracker.delivery/#/${courierCodes[courierIndex]}/${trackingNo}`,
          shipped_at: shippedDate.toISOString(),
          delivered_at: order.status === 'DONE' ? new Date(shippedDate.getTime() + (2 * 24 * 60 * 60 * 1000)).toISOString() : null,
          created_by: adminUser?.id || null
        })
      }
      
      // Refund for REFUNDED orders
      if (order.status === 'REFUNDED') {
        const refundDate = new Date(order.order_date)
        refundDate.setDate(refundDate.getDate() + 5)
        
        orderCashbook.push({
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
          created_by: adminUser?.id || null
        })
      }
      
      // Event log
      orderEvents.push({
        actor_id: adminUser?.id || null,
        actor_name: adminUser?.name || 'System',
        actor_role: adminUser?.role || 'Admin',
        event_type: 'order_created',
        event_category: 'order',
        event_severity: 'info',
        entity_type: 'order',
        entity_id: order.id,
        entity_name: order.order_no,
        action: 'INSERT',
        after_data: { 
          order_no: order.order_no, 
          customer: order.customer_name, 
          amount: order.total_amount,
          status: order.status
        },
        created_at: order.created_at
      })
    }
    
    // Insert order items
    const { error: itemError } = await supabase
      .from('order_items')
      .insert(orderItems)
    
    if (itemError) {
      console.error('Error creating order items:', itemError)
    } else {
      console.log(`✅ Created ${orderItems.length} order items`)
    }
    
    // Insert inventory movements for orders
    const { error: orderMovementError } = await supabase
      .from('inventory_movements')
      .insert(orderMovements)
    
    if (orderMovementError) {
      console.error('Error creating order movements:', orderMovementError)
    } else {
      console.log(`✅ Created ${orderMovements.length} order inventory movements`)
    }
    
    // Insert shipments
    const { error: shipmentError } = await supabase
      .from('shipments')
      .insert(shipments)
    
    if (shipmentError) {
      console.error('Error creating shipments:', shipmentError)
    } else {
      console.log(`✅ Created ${shipments.length} shipments`)
    }
    
    // Update product stock
    console.log('\n📦 Updating product stock...')
    for (const productId in productStock) {
      await supabase
        .from('products')
        .update({ on_hand: productStock[productId] })
        .eq('id', productId)
    }
    
    // ========================================
    // STEP 4: Insert all cashbook entries
    // ========================================
    console.log('\n💰 Step 4: Creating cashbook entries...')
    
    const allCashbook = [...cashbookEntries, ...orderCashbook]
    
    const { error: cashbookError } = await supabase
      .from('cashbook')
      .insert(allCashbook)
    
    if (cashbookError) {
      console.error('Error creating cashbook:', cashbookError)
    } else {
      console.log(`✅ Created ${allCashbook.length} cashbook entries`)
    }
    
    // ========================================
    // STEP 5: Insert all event logs
    // ========================================
    console.log('\n📝 Step 5: Creating event logs...')
    
    const allEvents = [...eventLogs, ...orderEvents]
    
    const { error: eventError } = await supabase
      .from('event_logs')
      .insert(allEvents)
    
    if (eventError) {
      console.error('Error creating events:', eventError)
    } else {
      console.log(`✅ Created ${allEvents.length} event logs`)
    }
    
    // ========================================
    // STEP 6: Verify data integrity
    // ========================================
    console.log('\n🔍 Step 6: Verifying data integrity...')
    
    // Count by status
    const statusCounts = {}
    createdOrders.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
    })
    
    console.log('\n📊 Order Status Distribution:')
    console.log('   PAID:', statusCounts['PAID'] || 0)
    console.log('   SHIPPED:', statusCounts['SHIPPED'] || 0)
    console.log('   DONE:', statusCounts['DONE'] || 0)
    console.log('   REFUNDED:', statusCounts['REFUNDED'] || 0)
    
    // Verify cashbook balance
    const { data: cashbookData } = await supabase
      .from('cashbook')
      .select('type, amount_krw')
    
    let totalIncome = 0
    let totalExpense = 0
    
    cashbookData?.forEach(c => {
      if (c.amount_krw > 0) {
        totalIncome += c.amount_krw
      } else {
        totalExpense += Math.abs(c.amount_krw)
      }
    })
    
    console.log('\n💰 Cashbook Summary:')
    console.log('   Total Income:', totalIncome.toLocaleString(), 'KRW')
    console.log('   Total Expense:', totalExpense.toLocaleString(), 'KRW')
    console.log('   Net Profit:', (totalIncome - totalExpense).toLocaleString(), 'KRW')
    
    // Verify inventory
    const { data: finalProducts } = await supabase
      .from('products')
      .select('on_hand')
    
    const totalStock = finalProducts?.reduce((sum, p) => sum + p.on_hand, 0) || 0
    
    console.log('\n📦 Inventory Summary:')
    console.log('   Total Products:', createdProducts.length)
    console.log('   Total Stock Remaining:', totalStock)
    console.log('   Low Stock Products:', finalProducts?.filter(p => p.on_hand < 5).length || 0)
    
    console.log('\n✅ Complete business flow data seeding finished!')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

seedCompleteFlow().catch(console.error)