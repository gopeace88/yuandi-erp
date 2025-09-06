/**
 * YUANDI ERP System - Business Flow E2E Test
 * 
 * Purpose: Test complete business workflow through actual application
 * - Product registration
 * - Order creation
 * - Shipment processing
 * - Refund/Cancellation
 * - Cashbook verification
 * - Data integrity checks
 * - Pagination testing
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_API_KEY!;
const BASE_URL = 'https://yuandi-erp.vercel.app';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data storage
interface TestResults {
  products: any[];
  orders: any[];
  shipments: any[];
  cashbook: any[];
  errors: any[];
  validationResults: {
    [key: string]: boolean;
  };
}

const testResults: TestResults = {
  products: [],
  orders: [],
  shipments: [],
  cashbook: [],
  errors: [],
  validationResults: {}
};

// Utility functions
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateTestData = {
  product: (index: number) => ({
    category: ['BAG', 'SHOES', 'CLOTH', 'ACC', 'WATCH'][index % 5],
    name: `테스트 상품 ${index}`,
    name_zh: `测试产品 ${index}`,
    model: `MODEL-${String(index).padStart(4, '0')}`,
    color: ['BLACK', 'WHITE', 'RED', 'BLUE', 'GREEN'][index % 5],
    brand: ['GUCCI', 'PRADA', 'CHANEL', 'LV', 'HERMES'][index % 5],
    cost_cny: 100 + (index * 10),
    cost_krw: (100 + (index * 10)) * 185,
    sale_price_krw: (100 + (index * 10)) * 185 * 1.3,
    on_hand: 50 + (index % 50),
    low_stock_threshold: index % 10 === 0 ? 10 : 5,
    description: `페이지네이션 테스트를 위한 상품 ${index}`
  }),
  
  order: (index: number, productId: string) => ({
    customer_name: `테스트고객${index}`,
    customer_phone: `010${String((index * 1234) % 10000).padStart(4, '0')}${String((index * 5678) % 10000).padStart(4, '0')}`,
    customer_email: `customer${index}@test.com`,
    payment_method: ['신용카드', '계좌이체', '무통장입금'][index % 3],
    shipping_name: `수령인${index}`,
    shipping_phone: `010${String((index * 4321) % 10000).padStart(4, '0')}${String((index * 8765) % 10000).padStart(4, '0')}`,
    shipping_address: `서울특별시 강남구 테헤란로 ${index}길 ${index % 50}`,
    shipping_address_detail: `${index % 10 + 1}층`,
    zip_code: String((index * 123) % 100000).padStart(5, '0'),
    pccc_code: index % 3 === 0 ? `P${String((index * 987) % 1000000000000).padStart(12, '0')}` : null,
    internal_memo: `내부 메모 #${index}`,
    customer_memo: index % 5 === 0 ? `고객 요청사항 #${index}` : null,
    items: [{
      product_id: productId,
      quantity: 1 + (index % 3),
      unit_price: 50000 + (index * 1000)
    }]
  }),
  
  shipment: (index: number, orderId: string) => ({
    order_id: orderId,
    tracking_no: `1234${String(index).padStart(8, '0')}`,
    courier: ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배'][index % 5],
    memo: `배송 메모 #${index}`
  })
};

// Test functions
async function resetDatabase() {
  console.log('🔄 Resetting database...');
  
  try {
    // Clear all tables in correct order (respecting foreign keys)
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('shipments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('inventory_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('cashbook').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('event_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('✅ Database reset completed');
    return true;
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    testResults.errors.push({ phase: 'reset', error });
    return false;
  }
}

async function testProductRegistration(count: number = 100) {
  console.log(`\n📦 Testing product registration (${count} products)...`);
  
  for (let i = 1; i <= count; i++) {
    try {
      const productData = generateTestData.product(i);
      
      // Insert product via Supabase
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();
      
      if (error) throw error;
      
      testResults.products.push(data);
      
      // Verify inventory movement was created
      const { data: movement } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('product_id', data.id)
        .eq('movement_type', 'INBOUND')
        .single();
      
      if (!movement) {
        throw new Error(`Inventory movement not created for product ${data.id}`);
      }
      
      if (i % 10 === 0) {
        console.log(`  ✅ Created ${i} products`);
      }
      
      // Small delay to avoid rate limiting
      if (i % 50 === 0) {
        await delay(1000);
      }
    } catch (error) {
      console.error(`  ❌ Failed to create product ${i}:`, error);
      testResults.errors.push({ phase: 'product_registration', index: i, error });
    }
  }
  
  console.log(`✅ Product registration completed: ${testResults.products.length}/${count}`);
  testResults.validationResults.productRegistration = testResults.products.length === count;
}

async function testOrderCreation(count: number = 100) {
  console.log(`\n🛒 Testing order creation (${count} orders)...`);
  
  if (testResults.products.length === 0) {
    console.error('❌ No products available for order creation');
    return;
  }
  
  for (let i = 1; i <= count; i++) {
    try {
      // Select a random product
      const product = testResults.products[i % testResults.products.length];
      const orderData = generateTestData.order(i, product.id);
      
      // Calculate total amount
      const totalAmount = orderData.items.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price), 0
      );
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          ...orderData,
          total_amount: totalAmount,
          status: 'PAID',
          order_date: new Date().toISOString(),
          payment_date: new Date().toISOString()
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create order items
      for (const item of orderData.items) {
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.quantity * item.unit_price
          });
        
        if (itemError) throw itemError;
        
        // Verify inventory was updated
        const { data: updatedProduct } = await supabase
          .from('products')
          .select('on_hand')
          .eq('id', item.product_id)
          .single();
        
        if (updatedProduct && updatedProduct.on_hand < 0) {
          console.warn(`  ⚠️ Product ${item.product_id} has negative stock: ${updatedProduct.on_hand}`);
        }
      }
      
      // Verify cashbook entry was created
      const { data: cashbookEntry } = await supabase
        .from('cashbook')
        .select('*')
        .eq('reference_id', order.id)
        .eq('transaction_type', '판매')
        .single();
      
      if (!cashbookEntry) {
        throw new Error(`Cashbook entry not created for order ${order.id}`);
      }
      
      testResults.orders.push(order);
      testResults.cashbook.push(cashbookEntry);
      
      if (i % 10 === 0) {
        console.log(`  ✅ Created ${i} orders`);
      }
      
      // Small delay to avoid rate limiting
      if (i % 50 === 0) {
        await delay(1000);
      }
    } catch (error) {
      console.error(`  ❌ Failed to create order ${i}:`, error);
      testResults.errors.push({ phase: 'order_creation', index: i, error });
    }
  }
  
  console.log(`✅ Order creation completed: ${testResults.orders.length}/${count}`);
  testResults.validationResults.orderCreation = testResults.orders.length === count;
}

async function testShipmentProcessing(count: number = 50) {
  console.log(`\n📦 Testing shipment processing (${count} shipments)...`);
  
  if (testResults.orders.length === 0) {
    console.error('❌ No orders available for shipment processing');
    return;
  }
  
  const ordersToShip = testResults.orders.slice(0, Math.min(count, testResults.orders.length));
  
  for (let i = 0; i < ordersToShip.length; i++) {
    try {
      const order = ordersToShip[i];
      const shipmentData = generateTestData.shipment(i + 1, order.id);
      
      // Create shipment
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          ...shipmentData,
          status: 'IN_TRANSIT',
          shipped_date: new Date().toISOString()
        })
        .select()
        .single();
      
      if (shipmentError) throw shipmentError;
      
      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'SHIPPED',
          shipped_date: new Date().toISOString()
        })
        .eq('id', order.id);
      
      if (updateError) throw updateError;
      
      // Verify cashbook entry for shipping cost
      const { data: shippingCost } = await supabase
        .from('cashbook')
        .select('*')
        .eq('reference_id', order.id)
        .eq('transaction_type', '배송')
        .single();
      
      if (!shippingCost) {
        console.warn(`  ⚠️ Shipping cost not recorded for order ${order.id}`);
      }
      
      testResults.shipments.push(shipment);
      
      if ((i + 1) % 10 === 0) {
        console.log(`  ✅ Processed ${i + 1} shipments`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to process shipment ${i + 1}:`, error);
      testResults.errors.push({ phase: 'shipment_processing', index: i + 1, error });
    }
  }
  
  console.log(`✅ Shipment processing completed: ${testResults.shipments.length}/${count}`);
  testResults.validationResults.shipmentProcessing = testResults.shipments.length === count;
}

async function testRefundProcess(count: number = 10) {
  console.log(`\n💸 Testing refund process (${count} refunds)...`);
  
  if (testResults.orders.length === 0) {
    console.error('❌ No orders available for refund testing');
    return;
  }
  
  const ordersToRefund = testResults.orders.slice(-count);
  let refundCount = 0;
  
  for (const order of ordersToRefund) {
    try {
      // Update order status to REFUNDED
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'REFUNDED',
          refunded_date: new Date().toISOString()
        })
        .eq('id', order.id);
      
      if (updateError) throw updateError;
      
      // Create refund cashbook entry
      const { error: cashbookError } = await supabase
        .from('cashbook')
        .insert({
          transaction_type: '환불',
          category: '판매환불',
          amount: -order.total_amount,
          reference_type: 'REFUND',
          reference_id: order.id,
          description: `주문 ${order.order_no} 환불`
        });
      
      if (cashbookError) throw cashbookError;
      
      // Return items to inventory
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      
      if (orderItems) {
        for (const item of orderItems) {
          await supabase
            .from('inventory_movements')
            .insert({
              product_id: item.product_id,
              movement_type: 'RETURN',
              quantity: item.quantity,
              reference_type: 'REFUND',
              reference_id: order.id,
              memo: `주문 ${order.order_no} 환불`
            });
          
          // Update product stock
          const { data: product } = await supabase
            .from('products')
            .select('on_hand')
            .eq('id', item.product_id)
            .single();
          
          if (product) {
            await supabase
              .from('products')
              .update({ on_hand: product.on_hand + item.quantity })
              .eq('id', item.product_id);
          }
        }
      }
      
      refundCount++;
      console.log(`  ✅ Refunded order ${order.order_no}`);
    } catch (error) {
      console.error(`  ❌ Failed to refund order ${order.order_no}:`, error);
      testResults.errors.push({ phase: 'refund_process', order: order.order_no, error });
    }
  }
  
  console.log(`✅ Refund process completed: ${refundCount}/${count}`);
  testResults.validationResults.refundProcess = refundCount === count;
}

async function testCashbookIntegrity() {
  console.log('\n💰 Testing cashbook integrity...');
  
  try {
    // Get all cashbook entries
    const { data: entries, error } = await supabase
      .from('cashbook')
      .select('*')
      .order('transaction_date', { ascending: true });
    
    if (error) throw error;
    
    console.log(`  📊 Total cashbook entries: ${entries?.length || 0}`);
    
    // Verify balance calculation
    let calculatedBalance = 0;
    let balanceErrors = 0;
    
    for (const entry of entries || []) {
      calculatedBalance += entry.amount;
      
      // Check if stored balance matches calculated balance
      if (Math.abs(entry.balance - calculatedBalance) > 1) {
        console.warn(`  ⚠️ Balance mismatch at entry ${entry.id}: stored=${entry.balance}, calculated=${calculatedBalance}`);
        balanceErrors++;
      }
    }
    
    console.log(`  💵 Final balance: ${calculatedBalance.toLocaleString()} KRW`);
    console.log(`  ${balanceErrors === 0 ? '✅' : '❌'} Balance errors: ${balanceErrors}`);
    
    // Verify transaction types
    const transactionTypes = [...new Set(entries?.map(e => e.transaction_type))];
    console.log(`  📝 Transaction types found: ${transactionTypes.join(', ')}`);
    
    testResults.validationResults.cashbookIntegrity = balanceErrors === 0;
  } catch (error) {
    console.error('❌ Cashbook integrity check failed:', error);
    testResults.errors.push({ phase: 'cashbook_integrity', error });
    testResults.validationResults.cashbookIntegrity = false;
  }
}

async function testDataIntegrity() {
  console.log('\n🔍 Testing data integrity...');
  
  const checks = {
    orphanedOrderItems: false,
    negativeStock: false,
    missingCashbookEntries: false,
    invalidOrderStatus: false
  };
  
  try {
    // Check for orphaned order items
    const { data: orphanedItems } = await supabase
      .from('order_items')
      .select('id, order_id')
      .is('order_id', null);
    
    if (orphanedItems && orphanedItems.length > 0) {
      console.warn(`  ⚠️ Found ${orphanedItems.length} orphaned order items`);
      checks.orphanedOrderItems = true;
    }
    
    // Check for negative stock
    const { data: negativeProducts } = await supabase
      .from('products')
      .select('id, sku, on_hand')
      .lt('on_hand', 0);
    
    if (negativeProducts && negativeProducts.length > 0) {
      console.warn(`  ⚠️ Found ${negativeProducts.length} products with negative stock`);
      negativeProducts.forEach(p => 
        console.warn(`    - ${p.sku}: ${p.on_hand}`)
      );
      checks.negativeStock = true;
    }
    
    // Check for orders without cashbook entries
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_no')
      .eq('status', 'PAID');
    
    for (const order of orders || []) {
      const { data: cashbookEntry } = await supabase
        .from('cashbook')
        .select('id')
        .eq('reference_id', order.id)
        .single();
      
      if (!cashbookEntry) {
        console.warn(`  ⚠️ Order ${order.order_no} has no cashbook entry`);
        checks.missingCashbookEntries = true;
      }
    }
    
    // Check for invalid order status transitions
    const { data: invalidOrders } = await supabase
      .from('orders')
      .select('order_no, status, payment_date, shipped_date, completed_date')
      .or('status.eq.SHIPPED,status.eq.DONE')
      .is('payment_date', null);
    
    if (invalidOrders && invalidOrders.length > 0) {
      console.warn(`  ⚠️ Found ${invalidOrders.length} orders with invalid status transitions`);
      checks.invalidOrderStatus = true;
    }
    
    const allChecksPass = !Object.values(checks).some(v => v);
    console.log(`  ${allChecksPass ? '✅' : '❌'} Data integrity: ${allChecksPass ? 'PASSED' : 'FAILED'}`);
    
    testResults.validationResults.dataIntegrity = allChecksPass;
  } catch (error) {
    console.error('❌ Data integrity check failed:', error);
    testResults.errors.push({ phase: 'data_integrity', error });
    testResults.validationResults.dataIntegrity = false;
  }
}

async function testPagination() {
  console.log('\n📄 Testing pagination...');
  
  try {
    const pageSize = 10;
    const tables = ['products', 'orders', 'shipments', 'cashbook'];
    
    for (const table of tables) {
      // Get total count
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      const totalPages = Math.ceil((count || 0) / pageSize);
      console.log(`  📊 ${table}: ${count} records, ${totalPages} pages`);
      
      // Test first page
      const { data: firstPage, error: firstError } = await supabase
        .from(table)
        .select('*')
        .range(0, pageSize - 1);
      
      if (firstError) throw firstError;
      
      // Test last page
      const lastPageStart = (totalPages - 1) * pageSize;
      const { data: lastPage, error: lastError } = await supabase
        .from(table)
        .select('*')
        .range(lastPageStart, lastPageStart + pageSize - 1);
      
      if (lastError) throw lastError;
      
      // Test middle page if exists
      if (totalPages > 2) {
        const middlePage = Math.floor(totalPages / 2);
        const middlePageStart = middlePage * pageSize;
        const { data: middlePageData, error: middleError } = await supabase
          .from(table)
          .select('*')
          .range(middlePageStart, middlePageStart + pageSize - 1);
        
        if (middleError) throw middleError;
      }
      
      console.log(`    ✅ Pagination works for ${table}`);
    }
    
    testResults.validationResults.pagination = true;
  } catch (error) {
    console.error('❌ Pagination test failed:', error);
    testResults.errors.push({ phase: 'pagination', error });
    testResults.validationResults.pagination = false;
  }
}

async function generateTestReport() {
  console.log('\n📋 Generating test report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalProducts: testResults.products.length,
      totalOrders: testResults.orders.length,
      totalShipments: testResults.shipments.length,
      totalCashbookEntries: testResults.cashbook.length,
      totalErrors: testResults.errors.length
    },
    validationResults: testResults.validationResults,
    errors: testResults.errors,
    passed: Object.values(testResults.validationResults).every(v => v)
  };
  
  console.log('\n========================================');
  console.log('📊 TEST SUMMARY');
  console.log('========================================');
  console.log(`Products created: ${report.summary.totalProducts}`);
  console.log(`Orders created: ${report.summary.totalOrders}`);
  console.log(`Shipments processed: ${report.summary.totalShipments}`);
  console.log(`Cashbook entries: ${report.summary.totalCashbookEntries}`);
  console.log(`Errors encountered: ${report.summary.totalErrors}`);
  console.log('\n🔍 VALIDATION RESULTS:');
  
  for (const [test, result] of Object.entries(report.validationResults)) {
    console.log(`  ${result ? '✅' : '❌'} ${test}`);
  }
  
  console.log('\n========================================');
  console.log(`OVERALL RESULT: ${report.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('========================================\n');
  
  return report;
}

// Main test execution
async function runBusinessFlowTest() {
  console.log('🚀 Starting YUANDI ERP Business Flow Test');
  console.log('==========================================\n');
  
  // Reset database
  const resetSuccess = await resetDatabase();
  if (!resetSuccess) {
    console.error('❌ Cannot proceed without database reset');
    return;
  }
  
  // Run tests in sequence
  await testProductRegistration(100);
  await delay(2000);
  
  await testOrderCreation(100);
  await delay(2000);
  
  await testShipmentProcessing(50);
  await delay(2000);
  
  await testRefundProcess(10);
  await delay(2000);
  
  await testCashbookIntegrity();
  await delay(1000);
  
  await testDataIntegrity();
  await delay(1000);
  
  await testPagination();
  
  // Generate report
  const report = await generateTestReport();
  
  // Save report to file
  const fs = require('fs').promises;
  await fs.writeFile(
    `/mnt/d/00.Projects/00.YUANDI-ERP/test/system/test-report-${Date.now()}.json`,
    JSON.stringify(report, null, 2)
  );
  
  console.log('📁 Test report saved to file');
  console.log('✅ Test execution completed!');
}

// Export for use in other scripts
export { runBusinessFlowTest, testResults };

// Run if executed directly
if (require.main === module) {
  runBusinessFlowTest().catch(console.error);
}