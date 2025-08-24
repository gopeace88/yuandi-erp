#!/usr/bin/env node

/**
 * Bundle Size Analyzer for YUANDI
 * Analyzes and reports on bundle sizes for optimization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const gzipSize = require('gzip-size');

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

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBuildOutput() {
  const buildDir = path.join(process.cwd(), '.next');
  
  if (!fs.existsSync(buildDir)) {
    log('❌ Build directory not found. Run "npm run build" first.', colors.red);
    process.exit(1);
  }

  log('\n📊 YUANDI Bundle Size Analysis', colors.bright + colors.blue);
  log('━'.repeat(60), colors.blue);

  // Analyze client bundles
  const staticDir = path.join(buildDir, 'static', 'chunks');
  
  if (fs.existsSync(staticDir)) {
    const bundles = [];
    
    // Read all JS files in chunks directory
    const files = fs.readdirSync(staticDir, { recursive: true })
      .filter(file => file.endsWith('.js'));
    
    for (const file of files) {
      const filePath = path.join(staticDir, file);
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath);
      const gzipped = gzipSize.sync(content);
      
      bundles.push({
        name: file,
        size: stats.size,
        gzipped,
      });
    }

    // Sort by size
    bundles.sort((a, b) => b.size - a.size);

    // Display results
    log('\n📦 JavaScript Bundles:', colors.cyan);
    log('─'.repeat(60));
    
    let totalSize = 0;
    let totalGzipped = 0;
    
    // Categorize bundles
    const categories = {
      framework: [],
      vendor: [],
      app: [],
      pages: [],
    };
    
    bundles.forEach(bundle => {
      if (bundle.name.includes('framework')) {
        categories.framework.push(bundle);
      } else if (bundle.name.includes('vendor') || bundle.name.match(/^\d+\./)) {
        categories.vendor.push(bundle);
      } else if (bundle.name.includes('pages')) {
        categories.pages.push(bundle);
      } else {
        categories.app.push(bundle);
      }
      
      totalSize += bundle.size;
      totalGzipped += bundle.gzipped;
    });

    // Display by category
    Object.entries(categories).forEach(([category, items]) => {
      if (items.length === 0) return;
      
      log(`\n${category.toUpperCase()}:`, colors.bright);
      items.forEach(bundle => {
        const sizeColor = bundle.size > 500000 ? colors.red : 
                         bundle.size > 200000 ? colors.yellow : 
                         colors.green;
        
        log(
          `  ${bundle.name.padEnd(40)} ${
            formatBytes(bundle.size).padStart(10)
          } (gzip: ${formatBytes(bundle.gzipped).padStart(10)})`,
          sizeColor
        );
      });
      
      const categorySize = items.reduce((sum, b) => sum + b.size, 0);
      const categoryGzipped = items.reduce((sum, b) => sum + b.gzipped, 0);
      
      log(`  ${'Total'.padEnd(40)} ${
        formatBytes(categorySize).padStart(10)
      } (gzip: ${formatBytes(categoryGzipped).padStart(10)})`, colors.bright);
    });

    // Display totals
    log('\n' + '═'.repeat(60), colors.cyan);
    log('TOTAL BUNDLE SIZE:', colors.bright);
    log(`  Raw: ${formatBytes(totalSize)}`, totalSize > 2000000 ? colors.red : colors.green);
    log(`  Gzipped: ${formatBytes(totalGzipped)}`, totalGzipped > 500000 ? colors.red : colors.green);
    
    // Recommendations
    log('\n💡 Optimization Recommendations:', colors.yellow);
    
    if (totalSize > 2000000) {
      log('  ⚠️  Total bundle size exceeds 2MB. Consider:', colors.yellow);
      log('     - Implementing more aggressive code splitting');
      log('     - Using dynamic imports for heavy components');
      log('     - Reviewing and removing unused dependencies');
    }
    
    const largeVendorBundles = categories.vendor.filter(b => b.size > 200000);
    if (largeVendorBundles.length > 0) {
      log('  ⚠️  Large vendor bundles detected:', colors.yellow);
      largeVendorBundles.forEach(bundle => {
        log(`     - ${bundle.name}: ${formatBytes(bundle.size)}`);
      });
      log('     Consider using dynamic imports or finding lighter alternatives');
    }
    
    // Check for duplicate modules
    checkDuplicates();
  }
}

function checkDuplicates() {
  log('\n🔍 Checking for duplicate modules...', colors.cyan);
  
  try {
    // Run webpack-bundle-analyzer if available
    const analyzerPath = path.join(process.cwd(), '.next', 'analyze.html');
    
    if (fs.existsSync(analyzerPath)) {
      log('  ✅ Bundle analyzer report available at: .next/analyze.html', colors.green);
      log('     Run "npx serve .next" and open analyze.html to view', colors.cyan);
    } else {
      log('  ℹ️  Run "ANALYZE=true npm run build" to generate detailed analysis', colors.yellow);
    }
  } catch (error) {
    log('  ⚠️  Could not check for duplicates', colors.yellow);
  }
}

function analyzePackageJson() {
  log('\n📦 Dependency Analysis:', colors.cyan);
  log('─'.repeat(60));
  
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const depList = Object.entries(deps);
  
  log(`  Total dependencies: ${depList.length}`);
  
  // Check for large dependencies
  const largeDeps = [
    'moment', 'lodash', 'jquery', 'bootstrap', 'antd', 'material-ui',
  ];
  
  const foundLargeDeps = depList.filter(([name]) => 
    largeDeps.some(large => name.includes(large))
  );
  
  if (foundLargeDeps.length > 0) {
    log('\n  ⚠️  Large dependencies detected:', colors.yellow);
    foundLargeDeps.forEach(([name, version]) => {
      log(`     - ${name}@${version}`);
    });
    log('     Consider using lighter alternatives or tree-shaking', colors.cyan);
  }
  
  // Check for optimization opportunities
  const optimizations = {
    'xlsx': 'Consider using a lighter Excel library or dynamic import',
    '@supabase/supabase-js': 'Ensure proper tree-shaking is configured',
    'lucide-react': 'Import only the icons you need',
  };
  
  const foundOptimizations = depList.filter(([name]) => name in optimizations);
  
  if (foundOptimizations.length > 0) {
    log('\n  💡 Optimization opportunities:', colors.yellow);
    foundOptimizations.forEach(([name]) => {
      log(`     - ${name}: ${optimizations[name]}`);
    });
  }
}

function generateReport() {
  const reportPath = path.join(process.cwd(), 'bundle-analysis.json');
  const timestamp = new Date().toISOString();
  
  const report = {
    timestamp,
    analysis: 'Run ANALYZE=true npm run build for detailed analysis',
    recommendations: [
      'Use dynamic imports for heavy components',
      'Implement route-based code splitting',
      'Review and remove unused dependencies',
      'Consider lighter alternatives for large libraries',
    ],
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📊 Analysis report saved to: ${reportPath}`, colors.green);
}

// Main execution
function main() {
  try {
    analyzeBuildOutput();
    analyzePackageJson();
    generateReport();
    
    log('\n✅ Bundle analysis complete!', colors.green);
    log('   Run "ANALYZE=true npm run build" for interactive bundle visualization', colors.cyan);
    
  } catch (error) {
    log(`\n❌ Analysis failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Check if gzip-size is installed
try {
  require.resolve('gzip-size');
} catch {
  log('Installing required dependency: gzip-size', colors.cyan);
  execSync('npm install --no-save gzip-size', { stdio: 'inherit' });
}

main();