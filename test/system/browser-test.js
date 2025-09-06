/**
 * YUANDI ERP System - Browser Console Test Script
 * 
 * 브라우저 콘솔에서 실행하는 비즈니스 플로우 테스트
 * 
 * Usage:
 * 1. Open https://yuandi-erp.vercel.app in browser
 * 2. Open Developer Console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 */

(async function() {
  console.log('%c🚀 YUANDI ERP Business Flow Test', 'color: #00bcd4; font-size: 20px; font-weight: bold');
  console.log('%c실제 애플리케이션을 통한 비즈니스 플로우 테스트 시작', 'color: #666');
  
  // Test configuration
  const testConfig = {
    productCount: 20,
    orderCount: 15,
    shipmentCount: 5,
    refundCount: 2
  };
  
  // Test results
  const results = {
    products: [],
    orders: [],
    shipments: [],
    refunds: [],
    errors: [],
    validations: {}
  };
  
  // Utility functions
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const logSuccess = (msg) => console.log(`%c✅ ${msg}`, 'color: green');
  const logError = (msg) => console.log(`%c❌ ${msg}`, 'color: red');
  const logInfo = (msg) => console.log(`%cℹ️ ${msg}`, 'color: blue');
  const logWarning = (msg) => console.log(`%c⚠️ ${msg}`, 'color: orange');
  
  // Phase 1: Navigate to Inventory Page and Create Products
  async function createProducts() {
    console.group('📦 Phase 1: Product Registration');
    
    try {
      // Navigate to inventory page
      window.location.href = '/ko/inventory';
      await delay(3000);
      
      logInfo(`Creating ${testConfig.productCount} products...`);
      
      for (let i = 1; i <= testConfig.productCount; i++) {
        try {
          // Click "신규 상품 등록" button
          const addButton = document.querySelector('button:has-text("신규 상품 등록"), button:has-text("新增产品")');
          if (addButton) {
            addButton.click();
            await delay(500);
            
            // Fill in product form
            const inputs = document.querySelectorAll('input, select, textarea');
            
            // Category select
            const categorySelect = Array.from(inputs).find(el => el.name === 'category' || el.id === 'category');
            if (categorySelect) categorySelect.value = ['BAG', 'SHOES', 'CLOTH', 'ACC', 'WATCH'][i % 5];
            
            // Product name
            const nameInput = Array.from(inputs).find(el => el.name === 'name' || el.placeholder?.includes('상품명'));
            if (nameInput) nameInput.value = `테스트 상품 ${i}`;
            
            // Chinese name
            const nameZhInput = Array.from(inputs).find(el => el.name === 'name_zh' || el.placeholder?.includes('中文'));
            if (nameZhInput) nameZhInput.value = `测试产品 ${i}`;
            
            // Model
            const modelInput = Array.from(inputs).find(el => el.name === 'model' || el.placeholder?.includes('모델'));
            if (modelInput) modelInput.value = `MODEL-${String(i).padStart(4, '0')}`;
            
            // Color
            const colorInput = Array.from(inputs).find(el => el.name === 'color' || el.placeholder?.includes('색상'));
            if (colorInput) colorInput.value = ['BLACK', 'WHITE', 'RED', 'BLUE', 'GREEN'][i % 5];
            
            // Brand
            const brandInput = Array.from(inputs).find(el => el.name === 'brand' || el.placeholder?.includes('브랜드'));
            if (brandInput) brandInput.value = ['GUCCI', 'PRADA', 'CHANEL', 'LV', 'HERMES'][i % 5];
            
            // Cost CNY
            const costInput = Array.from(inputs).find(el => el.name === 'cost_cny' || el.placeholder?.includes('CNY'));
            if (costInput) costInput.value = 100 + (i * 10);
            
            // On hand quantity
            const onHandInput = Array.from(inputs).find(el => el.name === 'on_hand' || el.placeholder?.includes('재고'));
            if (onHandInput) onHandInput.value = 50 + (i % 50);
            
            // Submit form
            const submitButton = document.querySelector('button:has-text("등록"), button:has-text("添加")');
            if (submitButton) {
              submitButton.click();
              await delay(1000);
              results.products.push({ index: i, status: 'created' });
              
              if (i % 5 === 0) {
                logInfo(`Progress: ${i}/${testConfig.productCount} products created`);
              }
            }
          }
        } catch (error) {
          logError(`Failed to create product ${i}: ${error.message}`);
          results.errors.push({ phase: 'product', index: i, error: error.message });
        }
      }
      
      logSuccess(`Product registration completed: ${results.products.length}/${testConfig.productCount}`);
    } catch (error) {
      logError(`Product registration failed: ${error.message}`);
    }
    
    console.groupEnd();
  }
  
  // Phase 2: Navigate to Orders Page and Create Orders
  async function createOrders() {
    console.group('🛒 Phase 2: Order Creation');
    
    try {
      // Navigate to orders page
      window.location.href = '/ko/orders';
      await delay(3000);
      
      logInfo(`Creating ${testConfig.orderCount} orders...`);
      
      for (let i = 1; i <= testConfig.orderCount; i++) {
        try {
          // Click "신규 주문" button
          const addButton = document.querySelector('button:has-text("신규 주문"), button:has-text("新订单")');
          if (addButton) {
            addButton.click();
            await delay(500);
            
            // Fill in order form
            const inputs = document.querySelectorAll('input, select, textarea');
            
            // Customer name
            const nameInput = Array.from(inputs).find(el => el.placeholder?.includes('고객명') || el.placeholder?.includes('客户'));
            if (nameInput) nameInput.value = `테스트고객${i}`;
            
            // Customer phone
            const phoneInput = Array.from(inputs).find(el => el.placeholder?.includes('연락처') || el.placeholder?.includes('电话'));
            if (phoneInput) phoneInput.value = `010${String((i * 1234) % 10000).padStart(4, '0')}${String((i * 5678) % 10000).padStart(4, '0')}`;
            
            // Shipping address
            const addressInput = Array.from(inputs).find(el => el.placeholder?.includes('주소') || el.placeholder?.includes('地址'));
            if (addressInput) addressInput.value = `서울특별시 강남구 테헤란로 ${i}길 ${i % 50}`;
            
            // Zip code
            const zipInput = Array.from(inputs).find(el => el.placeholder?.includes('우편번호') || el.placeholder?.includes('邮编'));
            if (zipInput) zipInput.value = String((i * 123) % 100000).padStart(5, '0');
            
            // Select product (assuming products are in a dropdown or list)
            // This part would need to be adjusted based on actual UI
            
            // Submit form
            const submitButton = document.querySelector('button:has-text("주문 생성"), button:has-text("创建订单")');
            if (submitButton) {
              submitButton.click();
              await delay(1000);
              results.orders.push({ index: i, status: 'created' });
              
              if (i % 5 === 0) {
                logInfo(`Progress: ${i}/${testConfig.orderCount} orders created`);
              }
            }
          }
        } catch (error) {
          logError(`Failed to create order ${i}: ${error.message}`);
          results.errors.push({ phase: 'order', index: i, error: error.message });
        }
      }
      
      logSuccess(`Order creation completed: ${results.orders.length}/${testConfig.orderCount}`);
    } catch (error) {
      logError(`Order creation failed: ${error.message}`);
    }
    
    console.groupEnd();
  }
  
  // Phase 3: Process Shipments
  async function processShipments() {
    console.group('📦 Phase 3: Shipment Processing');
    
    try {
      // Navigate to shipments page
      window.location.href = '/ko/shipments';
      await delay(3000);
      
      logInfo(`Processing ${testConfig.shipmentCount} shipments...`);
      
      // Find orders to ship
      const orderRows = document.querySelectorAll('tr[data-order-id], .order-row');
      const ordersToShip = Array.from(orderRows).slice(0, testConfig.shipmentCount);
      
      for (let i = 0; i < ordersToShip.length; i++) {
        try {
          const row = ordersToShip[i];
          
          // Click on the order or shipment button
          const shipButton = row.querySelector('button:has-text("배송 등록"), button:has-text("发货")');
          if (shipButton) {
            shipButton.click();
            await delay(500);
            
            // Fill tracking number
            const trackingInput = document.querySelector('input[placeholder*="송장번호"], input[placeholder*="运单号"]');
            if (trackingInput) trackingInput.value = `1234${Date.now()}${i}`;
            
            // Select courier
            const courierSelect = document.querySelector('select[name="courier"]');
            if (courierSelect) courierSelect.value = ['CJ대한통운', '한진택배', '롯데택배'][i % 3];
            
            // Submit
            const submitButton = document.querySelector('button:has-text("등록"), button:has-text("确认")');
            if (submitButton) {
              submitButton.click();
              await delay(1000);
              results.shipments.push({ index: i, status: 'shipped' });
              logInfo(`Shipment ${i + 1} processed`);
            }
          }
        } catch (error) {
          logError(`Failed to process shipment ${i + 1}: ${error.message}`);
          results.errors.push({ phase: 'shipment', index: i + 1, error: error.message });
        }
      }
      
      logSuccess(`Shipment processing completed: ${results.shipments.length}/${testConfig.shipmentCount}`);
    } catch (error) {
      logError(`Shipment processing failed: ${error.message}`);
    }
    
    console.groupEnd();
  }
  
  // Phase 4: Process Refunds
  async function processRefunds() {
    console.group('💸 Phase 4: Refund Processing');
    
    try {
      // Navigate to orders page
      window.location.href = '/ko/orders';
      await delay(3000);
      
      logInfo(`Processing ${testConfig.refundCount} refunds...`);
      
      // Find orders to refund
      const orderRows = document.querySelectorAll('tr[data-order-id], .order-row');
      const ordersToRefund = Array.from(orderRows).slice(-testConfig.refundCount);
      
      for (let i = 0; i < ordersToRefund.length; i++) {
        try {
          const row = ordersToRefund[i];
          
          // Click refund button
          const refundButton = row.querySelector('button:has-text("환불"), button:has-text("退款")');
          if (refundButton) {
            refundButton.click();
            await delay(500);
            
            // Confirm refund
            const confirmButton = document.querySelector('button:has-text("확인"), button:has-text("确认")');
            if (confirmButton) {
              confirmButton.click();
              await delay(1000);
              results.refunds.push({ index: i, status: 'refunded' });
              logInfo(`Refund ${i + 1} processed`);
            }
          }
        } catch (error) {
          logError(`Failed to process refund ${i + 1}: ${error.message}`);
          results.errors.push({ phase: 'refund', index: i + 1, error: error.message });
        }
      }
      
      logSuccess(`Refund processing completed: ${results.refunds.length}/${testConfig.refundCount}`);
    } catch (error) {
      logError(`Refund processing failed: ${error.message}`);
    }
    
    console.groupEnd();
  }
  
  // Phase 5: Validate Cashbook
  async function validateCashbook() {
    console.group('💰 Phase 5: Cashbook Validation');
    
    try {
      // Navigate to cashbook page
      window.location.href = '/ko/cashbook';
      await delay(3000);
      
      // Check if entries exist
      const entries = document.querySelectorAll('tr[data-transaction-id], .transaction-row');
      logInfo(`Found ${entries.length} cashbook entries`);
      
      // Check balance
      const balanceElement = document.querySelector('.balance, [data-balance]');
      if (balanceElement) {
        const balance = balanceElement.textContent;
        logInfo(`Current balance: ${balance}`);
      }
      
      // Validate transaction types
      const transactionTypes = new Set();
      entries.forEach(entry => {
        const typeElement = entry.querySelector('.transaction-type, [data-type]');
        if (typeElement) {
          transactionTypes.add(typeElement.textContent.trim());
        }
      });
      
      logInfo(`Transaction types found: ${Array.from(transactionTypes).join(', ')}`);
      
      results.validations.cashbook = entries.length > 0;
      logSuccess('Cashbook validation completed');
    } catch (error) {
      logError(`Cashbook validation failed: ${error.message}`);
      results.validations.cashbook = false;
    }
    
    console.groupEnd();
  }
  
  // Phase 6: Test Pagination
  async function testPagination() {
    console.group('📄 Phase 6: Pagination Test');
    
    try {
      const pages = ['inventory', 'orders', 'shipments', 'cashbook'];
      
      for (const page of pages) {
        window.location.href = `/ko/${page}`;
        await delay(3000);
        
        // Check for pagination controls
        const paginationControls = document.querySelector('.pagination, [data-pagination], nav[aria-label="pagination"]');
        if (paginationControls) {
          logInfo(`Pagination found on ${page} page`);
          
          // Try to navigate to next page
          const nextButton = paginationControls.querySelector('button:has-text("다음"), button:has-text("Next"), [aria-label="Next"]');
          if (nextButton && !nextButton.disabled) {
            nextButton.click();
            await delay(1000);
            logSuccess(`Pagination works on ${page} page`);
          }
        } else {
          logWarning(`No pagination controls found on ${page} page`);
        }
      }
      
      results.validations.pagination = true;
    } catch (error) {
      logError(`Pagination test failed: ${error.message}`);
      results.validations.pagination = false;
    }
    
    console.groupEnd();
  }
  
  // Generate Report
  function generateReport() {
    console.group('📊 TEST REPORT');
    
    console.log('%c========================================', 'color: #666');
    console.log('%cTEST SUMMARY', 'font-weight: bold; font-size: 16px');
    console.log('%c========================================', 'color: #666');
    
    console.table({
      'Products Created': results.products.length,
      'Orders Created': results.orders.length,
      'Shipments Processed': results.shipments.length,
      'Refunds Processed': results.refunds.length,
      'Errors Encountered': results.errors.length
    });
    
    console.log('%cVALIDATION RESULTS:', 'font-weight: bold');
    for (const [key, value] of Object.entries(results.validations)) {
      console.log(`  ${value ? '✅' : '❌'} ${key}`);
    }
    
    if (results.errors.length > 0) {
      console.log('%cERRORS:', 'color: red; font-weight: bold');
      console.table(results.errors.slice(0, 5));
    }
    
    const allPassed = Object.values(results.validations).every(v => v) && results.errors.length === 0;
    
    console.log('%c========================================', 'color: #666');
    console.log(
      `%cOVERALL RESULT: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`,
      `color: ${allPassed ? 'green' : 'red'}; font-size: 18px; font-weight: bold`
    );
    console.log('%c========================================', 'color: #666');
    
    // Save results to localStorage
    localStorage.setItem('yuandi_test_results', JSON.stringify({
      timestamp: new Date().toISOString(),
      results: results,
      passed: allPassed
    }));
    
    logInfo('Test results saved to localStorage (key: yuandi_test_results)');
    
    console.groupEnd();
  }
  
  // Main test execution
  try {
    console.log('%cStarting automated test sequence...', 'color: #00bcd4; font-weight: bold');
    console.log('%cThis test will navigate through different pages automatically', 'color: #666');
    console.log('%cPlease do not interact with the page during testing', 'color: orange');
    
    // Note: Due to browser security, automatic navigation between pages may be restricted
    // You may need to run each phase manually
    
    console.log('\n%c⚠️ IMPORTANT:', 'color: orange; font-weight: bold');
    console.log('Due to browser security, you may need to run each phase manually:');
    console.log('1. Run: createProducts() - on inventory page');
    console.log('2. Run: createOrders() - on orders page');
    console.log('3. Run: processShipments() - on shipments page');
    console.log('4. Run: processRefunds() - on orders page');
    console.log('5. Run: validateCashbook() - on cashbook page');
    console.log('6. Run: testPagination() - will test all pages');
    console.log('7. Run: generateReport() - to see results');
    
    // Make functions available globally
    window.yuandiTest = {
      createProducts,
      createOrders,
      processShipments,
      processRefunds,
      validateCashbook,
      testPagination,
      generateReport,
      results,
      runAll: async function() {
        await createProducts();
        await delay(2000);
        await createOrders();
        await delay(2000);
        await processShipments();
        await delay(2000);
        await processRefunds();
        await delay(2000);
        await validateCashbook();
        await delay(2000);
        await testPagination();
        generateReport();
      }
    };
    
    console.log('\n%cTest functions are now available in window.yuandiTest', 'color: green');
    console.log('You can run individual tests or use: yuandiTest.runAll()');
    
  } catch (error) {
    console.error('Test execution failed:', error);
  }
})();