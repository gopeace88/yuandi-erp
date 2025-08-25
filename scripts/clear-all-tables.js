const { createClient } = require('@supabase/supabase-js')

async function clearAllTables() {
  const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co'
  const supabaseKey = 'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🗑️ Clearing all tables except users...')

  try {
    // Order matters due to foreign key constraints
    // Clear from leaf tables to root tables
    
    // 1. Clear event_logs (no dependencies)
    const { error: eventLogsError } = await supabase
      .from('event_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    
    if (eventLogsError) {
      console.error('Error clearing event_logs:', eventLogsError)
    } else {
      console.log('✅ Cleared event_logs')
    }

    // 2. Clear inventory_movements (depends on products)
    const { error: movementsError } = await supabase
      .from('inventory_movements')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (movementsError) {
      console.error('Error clearing inventory_movements:', movementsError)
    } else {
      console.log('✅ Cleared inventory_movements')
    }

    // 3. Clear cashbook (depends on orders)
    const { error: cashbookError } = await supabase
      .from('cashbook')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (cashbookError) {
      console.error('Error clearing cashbook:', cashbookError)
    } else {
      console.log('✅ Cleared cashbook')
    }

    // 4. Clear shipments (depends on orders)
    const { error: shipmentsError } = await supabase
      .from('shipments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (shipmentsError) {
      console.error('Error clearing shipments:', shipmentsError)
    } else {
      console.log('✅ Cleared shipments')
    }

    // 5. Clear order_items (depends on orders and products)
    const { error: orderItemsError } = await supabase
      .from('order_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (orderItemsError) {
      console.error('Error clearing order_items:', orderItemsError)
    } else {
      console.log('✅ Cleared order_items')
    }

    // 6. Clear orders
    const { error: ordersError } = await supabase
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (ordersError) {
      console.error('Error clearing orders:', ordersError)
    } else {
      console.log('✅ Cleared orders')
    }

    // 7. Clear products
    const { error: productsError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (productsError) {
      console.error('Error clearing products:', productsError)
    } else {
      console.log('✅ Cleared products')
    }

    console.log('✅ All tables cleared except users (profiles)')
    
    // Verify the clearing
    const tables = ['products', 'orders', 'order_items', 'shipments', 'cashbook', 'inventory_movements', 'event_logs']
    
    console.log('\n📊 Verification:')
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      console.log(`   ${table}: ${count || 0} rows`)
    }
    
    // Check profiles (should still have data)
    const { count: profileCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    console.log(`   profiles (users): ${profileCount || 0} rows (preserved)`)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

clearAllTables().catch(console.error)