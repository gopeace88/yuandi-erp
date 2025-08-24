#!/usr/bin/env node

/**
 * YUANDI Comprehensive Test Runner
 * 포괄적인 테스트 실행 스크립트
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  unit: {
    command: 'jest',
    args: ['--testPathPattern=__tests__', '--coverage'],
    description: '단위 테스트 (Unit Tests)',
  },
  integration: {
    command: 'jest',
    args: ['--testPathPattern=__tests__/api', '--coverage'],
    description: '통합 테스트 (Integration Tests)',
  },
  e2e: {
    command: 'playwright',
    args: ['test'],
    description: 'E2E 테스트 (End-to-End Tests)',
  },
  all: {
    command: 'npm',
    args: ['run', 'test:all'],
    description: '모든 테스트 (All Tests)',
  },
};

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';
const watch = args.includes('--watch');
const coverage = args.includes('--coverage');
const debug = args.includes('--debug');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log();
  log('═'.repeat(60), colors.cyan);
  log(`  ${title}`, colors.bright + colors.cyan);
  log('═'.repeat(60), colors.cyan);
  console.log();
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Check test dependencies
function checkDependencies() {
  const requiredPackages = [
    'jest',
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@playwright/test',
  ];

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  );

  const missing = requiredPackages.filter(
    (pkg) => 
      !packageJson.dependencies?.[pkg] && 
      !packageJson.devDependencies?.[pkg]
  );

  if (missing.length > 0) {
    log('⚠️  Missing test dependencies:', colors.yellow);
    missing.forEach((pkg) => log(`   - ${pkg}`, colors.yellow));
    log('\nInstall with: npm install --save-dev ' + missing.join(' '), colors.cyan);
    process.exit(1);
  }
}

// Run specific test type
async function runTests(type) {
  const config = TEST_CONFIG[type];
  
  if (!config) {
    log(`❌ Invalid test type: ${type}`, colors.red);
    log('Available types: unit, integration, e2e, all', colors.yellow);
    process.exit(1);
  }

  logSection(config.description);

  const testArgs = [...config.args];
  
  // Add optional flags
  if (watch && type !== 'e2e') {
    testArgs.push('--watch');
  }
  
  if (coverage && !testArgs.includes('--coverage')) {
    testArgs.push('--coverage');
  }
  
  if (debug) {
    testArgs.push('--verbose');
    if (type === 'e2e') {
      testArgs.push('--debug');
    }
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const child = spawn(config.command, testArgs, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      console.log();
      
      if (code === 0) {
        log(`✅ ${config.description} completed successfully`, colors.green);
        log(`   Time: ${formatTime(duration)}`, colors.green);
        resolve(code);
      } else {
        log(`❌ ${config.description} failed with code ${code}`, colors.red);
        log(`   Time: ${formatTime(duration)}`, colors.red);
        reject(code);
      }
    });

    child.on('error', (error) => {
      log(`❌ Failed to run tests: ${error.message}`, colors.red);
      reject(error);
    });
  });
}

// Run all test types sequentially
async function runAllTests() {
  const results = {
    unit: null,
    integration: null,
    e2e: null,
  };

  const startTime = Date.now();

  try {
    // Run unit tests
    try {
      await runTests('unit');
      results.unit = 'passed';
    } catch (e) {
      results.unit = 'failed';
    }

    // Run integration tests
    try {
      await runTests('integration');
      results.integration = 'passed';
    } catch (e) {
      results.integration = 'failed';
    }

    // Run E2E tests
    try {
      await runTests('e2e');
      results.e2e = 'passed';
    } catch (e) {
      results.e2e = 'failed';
    }

  } finally {
    const totalDuration = Date.now() - startTime;
    
    // Print summary
    logSection('테스트 결과 요약 (Test Summary)');
    
    Object.entries(results).forEach(([type, status]) => {
      const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
      const color = status === 'passed' ? colors.green : status === 'failed' ? colors.red : colors.yellow;
      log(`${icon} ${type.toUpperCase()}: ${status || 'skipped'}`, color);
    });
    
    console.log();
    log(`Total time: ${formatTime(totalDuration)}`, colors.cyan);
    
    // Generate test report
    generateTestReport(results, totalDuration);
    
    // Exit with failure if any test failed
    const hasFailures = Object.values(results).includes('failed');
    process.exit(hasFailures ? 1 : 0);
  }
}

// Generate HTML test report
function generateTestReport(results, duration) {
  const reportDir = path.join(process.cwd(), 'test-results');
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const reportPath = path.join(reportDir, 'summary.json');

  const report = {
    timestamp,
    duration: formatTime(duration),
    results,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📊 Test report saved to: ${reportPath}`, colors.blue);
}

// Main execution
async function main() {
  log('🧪 YUANDI Test Runner', colors.bright + colors.blue);
  log('━'.repeat(60), colors.blue);

  // Check dependencies
  checkDependencies();

  // Run tests
  try {
    if (testType === 'all') {
      await runAllTests();
    } else {
      await runTests(testType);
    }
  } catch (error) {
    log(`\n❌ Test execution failed: ${error}`, colors.red);
    process.exit(1);
  }
}

// Handle interrupts
process.on('SIGINT', () => {
  log('\n\n⚠️  Test run interrupted by user', colors.yellow);
  process.exit(130);
});

// Run main function
main().catch((error) => {
  log(`❌ Unexpected error: ${error}`, colors.red);
  process.exit(1);
});