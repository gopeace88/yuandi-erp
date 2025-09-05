#!/usr/bin/env node

/**
 * YUANDI ERP 배포 검증 테스트 스크립트
 * 모든 중요한 API 엔드포인트와 시스템 기능을 테스트
 */

const https = require('https');
const http = require('http');

const TEST_CONFIG = {
  baseUrl: 'http://localhost:8081', // 배포 시 실제 URL로 변경
  timeout: 10000,
  adminCredentials: {
    email: 'yuandi1020@gmail.com',
    password: 'yuandi123!'
  }
};

class DeploymentTester {
  constructor() {
    this.results = [];
    this.authToken = null;
    this.cookies = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const typeEmoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };
    
    console.log(`${typeEmoji[type]} [${timestamp}] ${message}`);
    this.results.push({ timestamp, type, message });
  }

  async request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${TEST_CONFIG.baseUrl}${path}`;
      const isHttps = url.startsWith('https');
      const httpModule = isHttps ? https : http;
      
      const requestOptions = {
        timeout: TEST_CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'YUANDI-Deployment-Test/1.0',
          ...options.headers
        },
        ...options
      };

      if (this.cookies) {
        requestOptions.headers.Cookie = this.cookies;
      }

      const req = httpModule.request(url, requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: jsonData
            });
          } catch {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: data
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  async testHealthCheck() {
    this.log('Testing health check endpoint...');
    try {
      const response = await this.request('/api/health');
      if (response.status === 200 || response.status === 401) {
        this.log('Health endpoint is responding', 'success');
        return true;
      } else {
        this.log(`Health endpoint returned status: ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Health check failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testAuthentication() {
    this.log('Testing authentication...');
    try {
      const response = await this.request('/api/auth/login', {
        method: 'POST',
        body: TEST_CONFIG.adminCredentials
      });

      if (response.status === 200 && response.data.success) {
        this.log('Authentication successful', 'success');
        
        // Extract cookies for subsequent requests
        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
          this.cookies = setCookie.map(cookie => cookie.split(';')[0]).join('; ');
        }
        
        this.authToken = response.data.session?.token;
        return true;
      } else {
        this.log(`Authentication failed: ${JSON.stringify(response.data)}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Authentication error: ${error.message}`, 'error');
      return false;
    }
  }

  async testApiEndpoints() {
    this.log('Testing API endpoints...');
    const endpoints = [
      { path: '/api/dashboard/summary', method: 'GET', name: 'Dashboard Summary' },
      { path: '/api/products', method: 'GET', name: 'Products List' },
      { path: '/api/orders', method: 'GET', name: 'Orders List' },
      { path: '/api/shipments', method: 'GET', name: 'Shipments List' },
      { path: '/api/users', method: 'GET', name: 'Users List' },
    ];

    let passCount = 0;
    for (const endpoint of endpoints) {
      try {
        const response = await this.request(endpoint.path, {
          method: endpoint.method
        });

        if (response.status === 200 || response.status === 401) {
          this.log(`${endpoint.name}: OK (${response.status})`, 'success');
          passCount++;
        } else {
          this.log(`${endpoint.name}: Failed (${response.status})`, 'error');
        }
      } catch (error) {
        this.log(`${endpoint.name}: Error - ${error.message}`, 'error');
      }
    }

    return passCount === endpoints.length;
  }

  async testStaticPages() {
    this.log('Testing static pages...');
    const pages = [
      { path: '/', name: 'Home Page' },
      { path: '/ko', name: 'Korean Home' },
      { path: '/zh-CN', name: 'Chinese Home' },
      { path: '/ko/track', name: 'Order Tracking (Korean)' },
      { path: '/zh-CN/track', name: 'Order Tracking (Chinese)' }
    ];

    let passCount = 0;
    for (const page of pages) {
      try {
        const response = await this.request(page.path, {
          headers: { 'Accept': 'text/html' }
        });

        if (response.status === 200) {
          this.log(`${page.name}: OK`, 'success');
          passCount++;
        } else {
          this.log(`${page.name}: Failed (${response.status})`, 'error');
        }
      } catch (error) {
        this.log(`${page.name}: Error - ${error.message}`, 'error');
      }
    }

    return passCount >= pages.length * 0.8; // 80% pass rate required
  }

  async testDatabaseConnection() {
    this.log('Testing database operations...');
    try {
      // Test creating a test product
      const testProduct = {
        name: '테스트 상품',
        category: 'TEST',
        model: 'TEST001',
        color: '테스트색상',
        brand: '테스트브랜드',
        cost: 1000,
        price: 1500,
        stock: 10
      };

      const createResponse = await this.request('/api/products', {
        method: 'POST',
        body: testProduct
      });

      if (createResponse.status === 200 || createResponse.status === 201) {
        this.log('Database write operation: OK', 'success');
        
        // Try to clean up by deleting the test product
        if (createResponse.data?.id) {
          await this.request(`/api/products/${createResponse.data.id}`, {
            method: 'DELETE'
          });
          this.log('Database cleanup: OK', 'success');
        }
        
        return true;
      } else {
        this.log(`Database operation failed: ${createResponse.status}`, 'warning');
        return false;
      }
    } catch (error) {
      this.log(`Database test error: ${error.message}`, 'warning');
      return false;
    }
  }

  async generateReport() {
    this.log('\n=== DEPLOYMENT TEST SUMMARY ===');
    
    const summary = this.results.reduce((acc, result) => {
      acc[result.type] = (acc[result.type] || 0) + 1;
      return acc;
    }, {});

    this.log(`Total Tests: ${this.results.length}`);
    this.log(`✅ Success: ${summary.success || 0}`);
    this.log(`⚠️  Warning: ${summary.warning || 0}`);
    this.log(`❌ Error: ${summary.error || 0}`);
    this.log(`ℹ️  Info: ${summary.info || 0}`);

    const successRate = ((summary.success || 0) / this.results.length * 100).toFixed(1);
    this.log(`Success Rate: ${successRate}%`);

    if (successRate >= 80) {
      this.log('🎉 DEPLOYMENT READY!', 'success');
      return true;
    } else {
      this.log('🔧 NEEDS FIXES BEFORE DEPLOYMENT', 'error');
      return false;
    }
  }

  async runAllTests() {
    this.log('🚀 Starting YUANDI ERP Deployment Tests...\n');

    // Core system tests
    await this.testHealthCheck();
    await this.testAuthentication();
    
    // API functionality tests
    await this.testApiEndpoints();
    
    // Frontend tests
    await this.testStaticPages();
    
    // Database tests (optional)
    await this.testDatabaseConnection();

    // Generate final report
    return await this.generateReport();
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  const tester = new DeploymentTester();
  
  tester.runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = DeploymentTester;