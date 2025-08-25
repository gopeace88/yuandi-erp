const { createClient } = require('@supabase/supabase-js')

async function simpleSeed() {
  const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co'
  const supabaseKey = 'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('Testing Supabase connection...')
  
  // First, let's check what tables exist
  const { data: tables, error: tablesError } = await supabase
    .from('products')
    .select('*')
    .limit(1)
  
  if (tablesError) {
    console.log('Products table structure error:', tablesError)
  } else {
    console.log('Products table exists')
  }
  
  // Check orders table
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .limit(1)
  
  if (ordersError) {
    console.log('Orders table error:', ordersError)
  } else {
    console.log('Orders table exists, sample data:', orders)
  }
  
  // Try to insert a simple order
  console.log('Attempting to create a simple order...')
  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_no: `TEST-${Date.now()}`,
      customer_name: '테스트 고객',
      customer_phone: '01012345678',  // No hyphens
      pccc_code: 'P123456789012',  // Required format
      shipping_address: '서울시 강남구 테헤란로 123',
      zip_code: '06234',
      status: 'PAID',
      total_amount: 50000,
      order_date: new Date().toISOString()
    })
    .select()
  
  if (orderError) {
    console.log('Error creating order:', orderError)
  } else {
    console.log('Successfully created order:', newOrder)
  }
}

simpleSeed().catch(console.error)