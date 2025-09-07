#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY; // Service role key

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteAllTestData() {
  console.log('🗑️ Starting to delete all test data...\n');

  try {
    // Delete in reverse order of dependencies
    console.log('Deleting shipment_tracking_events...');
    await supabase.from('shipment_tracking_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting shipments...');
    await supabase.from('shipments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting order_items...');
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting orders...');
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting inventory_transactions...');
    await supabase.from('inventory_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting inventory...');
    await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting products...');
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting product_categories...');
    await supabase.from('product_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting cashbook_transactions...');
    await supabase.from('cashbook_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('\n✅ All test data deleted successfully!');
    
  } catch (error) {
    console.error('❌ Error during deletion:', error);
    process.exit(1);
  }
}

// Run the script
deleteAllTestData();