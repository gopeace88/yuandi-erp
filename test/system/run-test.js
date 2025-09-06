#!/usr/bin/env node

/**
 * YUANDI ERP System - Business Flow Test Runner
 * 
 * 실제 배포된 애플리케이션을 통한 비즈니스 플로우 테스트
 * 
 * Usage: node run-test.js
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://gmdbpurjbgopeaceyypm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZGJwdXJqYmdvcGVhY2V5eXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4MjcwMjYsImV4cCI6MjA1MTQwMzAyNn0.sHq2cbQwVMnQJWIpxq9B8_PzQM_FY7NZdjuvBV-zrLU';
const BASE_URL = 'https://yuandi-erp.vercel.app';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test results storage
const testResults = {
  products: [],
  orders: [],
  shipments: [],
  cashbook: [],
  errors: [],
  validationResults: {}
};

// Utility function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}`)
};

// Test data generators
const generateTestData = {
  product: (index) => ({
    category: ['BAG', 'SHOES', 'CLOTH', 'ACC', 'WATCH'][index % 5],
    name: `테스트 상품 ${index}`,
    name_zh: `测试产品 ${index}`,
    model: `MODEL-${String(index).padStart(4, '0')}`,
    color: ['BLACK', 'WHITE', 'RED', 'BLUE', 'GREEN'][index % 5],
    brand: ['GUCCI', 'PRADA', 'CHANEL', 'LV', 'HERMES'][index % 5],
    cost_cny: 100 + (index * 10),
    on_hand: 50 + (index % 50),
    low_stock_threshold: index % 10 === 0 ? 10 : 5,
    description: `비즈니스 플로우 테스트를 위한 상품 ${index}`,
    active: true
  }),
  
  order: (index, productId) => ({
    customer_name: `테스트고객${index}`,
    customer_phone: `010${String((index * 1234) % 10000).padStart(4, '0')}${String((index * 5678) % 10000).padStart(4, '0')}`,
    customer_email: `customer${index}@test.com`,
    payment_method: ['신용카드', '계좌이체', '무통장입금'][index % 3],
    shipping_name: `수령인${index}`,
    shipping_phone: `010${String((index * 4321) % 10000).padStart(4, '0')}${String((index * 8765) % 10000).padStart(4, '0')}`,
    shipping_address: `서울특별시 강남구 테헤란로 ${index}길 ${index % 50}`,
    shipping_address_detail: `${index % 10 + 1}층`,
    zip_code: String((index * 123) % 100000).padStart(5, '0'),
    pccc_code: index % 3 === 0 ? `P${String((index * 987) % 1000000000000).padStart(12, '0')}` : '',
    internal_memo: `내부 메모 #${index}`,
    customer_memo: index % 5 === 0 ? `고객 요청사항 #${index}` : ''
  })
};

// Phase 1: Database Reset
async function resetDatabase() {
  log.header('Phase 1: Database Reset');
  
  try {
    // Delete all data in order (respecting foreign keys)
    const tables = [
      'order_items',
      'shipments', 
      'inventory_movements',
      'cashbook',
      'orders',
      'products',
      'event_logs'
    ];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error && error.code !== 'PGRST116') {
        log.warning(`Failed to clear ${table}: ${error.message}`);
      } else {
        log.info(`Cleared table: ${table}`);
      }
    }
    
    log.success('Database reset completed');
    return true;
  } catch (error) {
    log.error(`Database reset failed: ${error.message}`);
    return false;
  }
}

// Phase 2: Product Registration
async function testProductRegistration(count = 10) {
  log.header(`Phase 2: Product Registration (${count} products)`);
  
  let successCount = 0;
  
  for (let i = 1; i <= count; i++) {
    try {
      const productData = generateTestData.product(i);
      
      // Generate SKU
      const sku = `${productData.category}-${productData.model}-${productData.color}-${productData.brand}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
      
      // Calculate KRW prices
      const cost_krw = productData.cost_cny * 185;
      const sale_price_krw = Math.round(cost_krw * 1.3);
      
      // Insert product
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          sku,
          cost_krw,
          sale_price_krw
        })
        .select()
        .single();
      
      if (error) throw error;
      
      testResults.products.push(data);
      successCount++;
      
      // Create initial inventory movement
      await supabase
        .from('inventory_movements')
        .insert({
          product_id: data.id,
          movement_type: 'INBOUND',
          quantity: productData.on_hand,
          reference_type: 'INITIAL',
          memo: '초기 재고 등록'
        });
      
      if (i % 5 === 0) {
        log.info(`Progress: ${i}/${count} products created`);
      }
      
      await delay(100); // Small delay to avoid rate limiting
    } catch (error) {
      log.error(`Failed to create product ${i}: ${error.message}`);
      testResults.errors.push({ phase: 'product_registration', index: i, error: error.message });
    }
  }
  
  log.success(`Product registration completed: ${successCount}/${count}`);
  testResults.validationResults.productRegistration = successCount === count;
  return successCount === count;
}

// Phase 3: Order Creation
async function testOrderCreation(count = 10) {
  log.header(`Phase 3: Order Creation (${count} orders)`);
  
  if (testResults.products.length === 0) {
    log.error('No products available for order creation');
    return false;
  }
  
  let successCount = 0;
  
  for (let i = 1; i <= count; i++) {
    try {
      const product = testResults.products[i % testResults.products.length];
      const orderData = generateTestData.order(i, product.id);
      
      // Generate order number
      const date = new Date();
      const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
      const orderNo = `ORD-${dateStr}-${String(i).padStart(3, '0')}`;
      
      // Calculate total amount
      const quantity = 1 + (i % 3);
      const totalAmount = product.sale_price_krw * quantity;
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          ...orderData,
          order_no: orderNo,
          total_amount: totalAmount,
          status: 'PAID',
          order_date: new Date().toISOString(),
          payment_date: new Date().toISOString()
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create order items
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: product.id,
          quantity: quantity,
          unit_price: product.sale_price_krw,
          subtotal: totalAmount
        });
      
      if (itemError) throw itemError;
      
      // Create inventory movement
      await supabase
        .from('inventory_movements')
        .insert({
          product_id: product.id,
          movement_type: 'OUTBOUND',
          quantity: -quantity,
          reference_type: 'ORDER',
          reference_id: order.id,
          memo: `주문 ${orderNo} 출고`
        });
      
      // Update product stock
      await supabase
        .from('products')
        .update({ on_hand: product.on_hand - quantity })
        .eq('id', product.id);
      
      // Create cashbook entry
      await supabase
        .from('cashbook')
        .insert({
          transaction_type: '판매',
          category: '상품판매',
          amount: totalAmount,
          reference_type: 'ORDER',
          reference_id: order.id,
          description: `주문 ${orderNo} 판매 수익`
        });
      
      testResults.orders.push(order);
      successCount++;
      
      if (i % 5 === 0) {
        log.info(`Progress: ${i}/${count} orders created`);
      }
      
      await delay(200);
    } catch (error) {
      log.error(`Failed to create order ${i}: ${error.message}`);
      testResults.errors.push({ phase: 'order_creation', index: i, error: error.message });
    }
  }
  
  log.success(`Order creation completed: ${successCount}/${count}`);
  testResults.validationResults.orderCreation = successCount === count;
  return successCount === count;
}

// Phase 4: Shipment Processing
async function testShipmentProcessing(count = 5) {
  log.header(`Phase 4: Shipment Processing (${count} shipments)`);
  
  if (testResults.orders.length === 0) {
    log.error('No orders available for shipment processing');
    return false;
  }
  
  const ordersToShip = testResults.orders.slice(0, Math.min(count, testResults.orders.length));
  let successCount = 0;
  
  for (let i = 0; i < ordersToShip.length; i++) {
    try {
      const order = ordersToShip[i];
      const trackingNo = `1234${String(Date.now()).slice(-8)}${i}`;
      const courier = ['CJ대한통운', '한진택배', '롯데택배'][i % 3];
      
      // Create shipment
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          order_id: order.id,
          tracking_no: trackingNo,
          courier: courier,
          status: 'IN_TRANSIT',
          shipped_date: new Date().toISOString(),
          memo: `테스트 배송 #${i + 1}`
        })
        .select()
        .single();
      
      if (shipmentError) throw shipmentError;
      
      // Update order status
      await supabase
        .from('orders')
        .update({ 
          status: 'SHIPPED',
          shipped_date: new Date().toISOString()
        })
        .eq('id', order.id);
      
      // Add shipping cost to cashbook
      await supabase
        .from('cashbook')
        .insert({
          transaction_type: '배송',
          category: '배송비',
          amount: -3000,
          reference_type: 'SHIPMENT',
          reference_id: order.id,
          description: `주문 ${order.order_no} 배송비`
        });
      
      testResults.shipments.push(shipment);
      successCount++;
      
      log.info(`Shipment created for order ${order.order_no}`);
      await delay(200);
    } catch (error) {
      log.error(`Failed to process shipment ${i + 1}: ${error.message}`);
      testResults.errors.push({ phase: 'shipment_processing', index: i + 1, error: error.message });
    }
  }
  
  log.success(`Shipment processing completed: ${successCount}/${count}`);
  testResults.validationResults.shipmentProcessing = successCount === count;
  return successCount === count;
}

// Phase 5: Refund Process
async function testRefundProcess(count = 2) {
  log.header(`Phase 5: Refund Process (${count} refunds)`);
  
  if (testResults.orders.length === 0) {
    log.error('No orders available for refund testing');
    return false;
  }
  
  const ordersToRefund = testResults.orders.slice(-count);
  let successCount = 0;
  
  for (const order of ordersToRefund) {
    try {
      // Update order status to REFUNDED
      await supabase
        .from('orders')
        .update({ 
          status: 'REFUNDED',
          refunded_date: new Date().toISOString()
        })
        .eq('id', order.id);
      
      // Get order items for inventory return
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      
      // Return items to inventory
      for (const item of orderItems || []) {
        // Create return movement
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
      
      // Create refund cashbook entry
      await supabase
        .from('cashbook')
        .insert({
          transaction_type: '환불',
          category: '판매환불',
          amount: -order.total_amount,
          reference_type: 'REFUND',
          reference_id: order.id,
          description: `주문 ${order.order_no} 환불`
        });
      
      successCount++;
      log.info(`Refunded order ${order.order_no}`);
      await delay(200);
    } catch (error) {
      log.error(`Failed to refund order ${order.order_no}: ${error.message}`);
      testResults.errors.push({ phase: 'refund_process', order: order.order_no, error: error.message });
    }
  }
  
  log.success(`Refund process completed: ${successCount}/${count}`);
  testResults.validationResults.refundProcess = successCount === count;
  return successCount === count;
}

// Phase 6: Data Validation
async function validateData() {
  log.header('Phase 6: Data Validation');
  
  const validations = {
    cashbookBalance: false,
    inventoryIntegrity: false,
    orderStatusConsistency: false,
    dataRelationships: false
  };
  
  try {
    // Validate cashbook balance
    const { data: cashbook } = await supabase
      .from('cashbook')
      .select('*')
      .order('created_at', { ascending: true });
    
    let balance = 0;
    let balanceValid = true;
    
    for (const entry of cashbook || []) {
      balance += entry.amount;
      if (entry.balance && Math.abs(entry.balance - balance) > 1) {
        log.warning(`Cashbook balance mismatch at entry ${entry.id}`);
        balanceValid = false;
      }
    }
    
    validations.cashbookBalance = balanceValid;
    log.info(`Cashbook final balance: ${balance.toLocaleString()} KRW`);
    
    // Validate inventory
    const { data: products } = await supabase
      .from('products')
      .select('id, sku, on_hand');
    
    let negativeStock = 0;
    for (const product of products || []) {
      if (product.on_hand < 0) {
        log.warning(`Product ${product.sku} has negative stock: ${product.on_hand}`);
        negativeStock++;
      }
    }
    
    validations.inventoryIntegrity = negativeStock === 0;
    
    // Validate order status consistency
    const { data: orders } = await supabase
      .from('orders')
      .select('order_no, status, payment_date, shipped_date, refunded_date');
    
    let statusErrors = 0;
    for (const order of orders || []) {
      if (order.status === 'SHIPPED' && !order.shipped_date) {
        log.warning(`Order ${order.order_no} is SHIPPED but has no shipped_date`);
        statusErrors++;
      }
      if (order.status === 'REFUNDED' && !order.refunded_date) {
        log.warning(`Order ${order.order_no} is REFUNDED but has no refunded_date`);
        statusErrors++;
      }
    }
    
    validations.orderStatusConsistency = statusErrors === 0;
    
    // Validate data relationships
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id, order_id, product_id');
    
    let orphanedItems = 0;
    for (const item of orderItems || []) {
      if (!item.order_id || !item.product_id) {
        orphanedItems++;
      }
    }
    
    validations.dataRelationships = orphanedItems === 0;
    
    // Summary
    log.info('Validation Results:');
    for (const [key, value] of Object.entries(validations)) {
      log.info(`  ${value ? '✅' : '❌'} ${key}`);
    }
    
    const allValid = Object.values(validations).every(v => v);
    testResults.validationResults.dataValidation = allValid;
    
    return allValid;
  } catch (error) {
    log.error(`Data validation failed: ${error.message}`);
    return false;
  }
}

// Phase 7: Pagination Test
async function testPagination() {
  log.header('Phase 7: Pagination Test');
  
  try {
    const pageSize = 10;
    const tables = ['products', 'orders', 'shipments', 'cashbook'];
    let allPassed = true;
    
    for (const table of tables) {
      // Get total count
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        log.error(`Failed to count ${table}: ${countError.message}`);
        allPassed = false;
        continue;
      }
      
      const totalPages = Math.ceil((count || 0) / pageSize);
      log.info(`${table}: ${count} records, ${totalPages} pages`);
      
      // Test pagination
      if (count > 0) {
        // Test first page
        const { data: firstPage, error: firstError } = await supabase
          .from(table)
          .select('*')
          .range(0, pageSize - 1);
        
        if (firstError || !firstPage || firstPage.length === 0) {
          log.error(`Failed to fetch first page of ${table}`);
          allPassed = false;
        }
        
        // Test last page if multiple pages exist
        if (totalPages > 1) {
          const lastPageStart = (totalPages - 1) * pageSize;
          const { data: lastPage, error: lastError } = await supabase
            .from(table)
            .select('*')
            .range(lastPageStart, lastPageStart + pageSize - 1);
          
          if (lastError || !lastPage) {
            log.error(`Failed to fetch last page of ${table}`);
            allPassed = false;
          }
        }
      }
    }
    
    testResults.validationResults.pagination = allPassed;
    log.success(`Pagination test ${allPassed ? 'passed' : 'failed'}`);
    return allPassed;
  } catch (error) {
    log.error(`Pagination test failed: ${error.message}`);
    return false;
  }
}

// Generate final report
function generateReport() {
  log.header('Test Report');
  
  console.log('\n========================================');
  console.log('📊 TEST SUMMARY');
  console.log('========================================');
  console.log(`Products created: ${testResults.products.length}`);
  console.log(`Orders created: ${testResults.orders.length}`);
  console.log(`Shipments processed: ${testResults.shipments.length}`);
  console.log(`Cashbook entries: ${testResults.cashbook.length || 'N/A'}`);
  console.log(`Errors encountered: ${testResults.errors.length}`);
  
  console.log('\n🔍 VALIDATION RESULTS:');
  for (const [test, result] of Object.entries(testResults.validationResults)) {
    console.log(`  ${result ? '✅' : '❌'} ${test}`);
  }
  
  if (testResults.errors.length > 0) {
    console.log('\n⚠️ ERRORS:');
    testResults.errors.slice(0, 5).forEach(err => {
      console.log(`  - ${err.phase}: ${err.error || err.order || 'Unknown error'}`);
    });
    if (testResults.errors.length > 5) {
      console.log(`  ... and ${testResults.errors.length - 5} more errors`);
    }
  }
  
  const allPassed = Object.values(testResults.validationResults).every(v => v);
  console.log('\n========================================');
  console.log(`OVERALL RESULT: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('========================================\n');
  
  // Save report to file
  const fs = require('fs');
  const reportPath = `./test-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results: testResults.validationResults,
    summary: {
      products: testResults.products.length,
      orders: testResults.orders.length,
      shipments: testResults.shipments.length,
      errors: testResults.errors.length
    },
    errors: testResults.errors,
    passed: allPassed
  }, null, 2));
  
  log.info(`Report saved to: ${reportPath}`);
}

// Main test execution
async function runTest() {
  console.log(`
${colors.bright}${colors.cyan}
╔════════════════════════════════════════╗
║   YUANDI ERP Business Flow Test       ║
║   실제 비즈니스 플로우 테스트         ║
╚════════════════════════════════════════╝
${colors.reset}`);
  
  try {
    // Phase 1: Reset
    await resetDatabase();
    await delay(1000);
    
    // Phase 2: Products (Create fewer for manual testing)
    await testProductRegistration(20);
    await delay(1000);
    
    // Phase 3: Orders
    await testOrderCreation(15);
    await delay(1000);
    
    // Phase 4: Shipments
    await testShipmentProcessing(5);
    await delay(1000);
    
    // Phase 5: Refunds
    await testRefundProcess(2);
    await delay(1000);
    
    // Phase 6: Validation
    await validateData();
    await delay(1000);
    
    // Phase 7: Pagination
    await testPagination();
    
    // Generate report
    generateReport();
    
    log.success('Test execution completed!');
    log.info(`Visit ${BASE_URL} to verify the results in the UI`);
    
  } catch (error) {
    log.error(`Test execution failed: ${error.message}`);
    console.error(error);
  }
}

// Run the test
runTest().catch(console.error);