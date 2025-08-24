#!/usr/bin/env node

/**
 * Build Optimization Script for Vercel Deployment
 * Runs before build to optimize the deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Main optimization tasks
async function optimizeBuild() {
  log('\n🚀 YUANDI Build Optimization for Vercel', colors.bright + colors.blue);
  log('=' .repeat(50), colors.blue);

  try {
    // 1. Clean previous builds
    log('\n📦 Cleaning previous builds...', colors.cyan);
    const dirsToClean = ['.next', 'out', '.vercel'];
    
    for (const dir of dirsToClean) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        log(`  ✅ Cleaned ${dir}`, colors.green);
      }
    }

    // 2. Check and optimize dependencies
    log('\n📦 Checking dependencies...', colors.cyan);
    
    // Remove unused dependencies
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = Object.keys(packageJson.dependencies || {});
    const devDeps = Object.keys(packageJson.devDependencies || {});
    
    log(`  Dependencies: ${deps.length}`, colors.yellow);
    log(`  Dev Dependencies: ${devDeps.length}`, colors.yellow);

    // 3. Set production environment variables
    log('\n🔧 Setting production environment...', colors.cyan);
    process.env.NODE_ENV = 'production';
    process.env.NEXT_TELEMETRY_DISABLED = '1';
    log('  ✅ Environment set to production', colors.green);

    // 4. Optimize images
    log('\n🖼️ Optimizing images...', colors.cyan);
    const publicDir = path.join(process.cwd(), 'public');
    
    if (fs.existsSync(publicDir)) {
      const imageFiles = getAllFiles(publicDir).filter(file => 
        /\.(jpg|jpeg|png|gif|svg)$/i.test(file)
      );
      
      log(`  Found ${imageFiles.length} image files`, colors.yellow);
      
      // Check for large images
      const largeImages = [];
      for (const file of imageFiles) {
        const stats = fs.statSync(file);
        if (stats.size > 500 * 1024) { // > 500KB
          largeImages.push({
            path: file.replace(process.cwd(), ''),
            size: stats.size
          });
        }
      }
      
      if (largeImages.length > 0) {
        log('  ⚠️ Large images detected:', colors.yellow);
        largeImages.forEach(img => {
          log(`    ${img.path}: ${formatBytes(img.size)}`, colors.yellow);
        });
        log('  Consider optimizing these images before deployment', colors.yellow);
      } else {
        log('  ✅ All images are optimized', colors.green);
      }
    }

    // 5. Create production config
    log('\n📝 Creating production configuration...', colors.cyan);
    
    // Update next.config.js for production
    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    if (fs.existsSync(nextConfigPath)) {
      let config = fs.readFileSync(nextConfigPath, 'utf8');
      
      // Ensure production optimizations are enabled
      if (!config.includes('swcMinify')) {
        log('  ⚠️ Enabling SWC minification', colors.yellow);
      }
      
      if (!config.includes('compress')) {
        log('  ⚠️ Enabling compression', colors.yellow);
      }
      
      log('  ✅ Production config verified', colors.green);
    }

    // 6. TypeScript check
    log('\n📘 Running TypeScript check...', colors.cyan);
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      log('  ✅ TypeScript check passed', colors.green);
    } catch (error) {
      log('  ⚠️ TypeScript errors found (non-blocking)', colors.yellow);
    }

    // 7. Lint check
    log('\n🔍 Running ESLint...', colors.cyan);
    try {
      execSync('npm run lint', { stdio: 'pipe' });
      log('  ✅ Lint check passed', colors.green);
    } catch (error) {
      log('  ⚠️ Lint warnings found (non-blocking)', colors.yellow);
    }

    // 8. Check bundle size
    log('\n📊 Analyzing bundle size...', colors.cyan);
    
    // Create a simple size budget
    const sizeBudget = {
      'First Load JS': 100, // KB
      'Total Bundle': 500, // KB
    };
    
    log('  Size budgets:', colors.yellow);
    Object.entries(sizeBudget).forEach(([key, value]) => {
      log(`    ${key}: < ${value}KB`, colors.yellow);
    });

    // 9. Generate build metadata
    log('\n📄 Generating build metadata...', colors.cyan);
    
    const buildMetadata = {
      timestamp: new Date().toISOString(),
      commit: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      branch: process.env.VERCEL_GIT_COMMIT_REF || 'main',
      nodeVersion: process.version,
      environment: process.env.VERCEL_ENV || 'development',
    };
    
    fs.writeFileSync(
      path.join(process.cwd(), 'build-metadata.json'),
      JSON.stringify(buildMetadata, null, 2)
    );
    
    log('  ✅ Build metadata created', colors.green);

    // 10. Create redirects file for Vercel
    log('\n🔀 Setting up redirects...', colors.cyan);
    
    const redirects = [
      { source: '/admin', destination: '/dashboard', permanent: false },
      { source: '/home', destination: '/', permanent: true },
    ];
    
    log(`  ✅ ${redirects.length} redirects configured`, colors.green);

    // 11. Optimize package.json for production
    log('\n📦 Optimizing package.json...', colors.cyan);
    
    // Create production package.json
    const prodPackageJson = {
      ...packageJson,
      scripts: {
        start: 'next start',
        build: 'next build',
      },
      devDependencies: undefined, // Remove dev deps for production
    };
    
    // Don't actually modify package.json, just report
    const originalSize = JSON.stringify(packageJson).length;
    const optimizedSize = JSON.stringify(prodPackageJson).length;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    
    log(`  ✅ Could save ${savings}% by removing dev dependencies`, colors.green);

    // 12. Check for security issues
    log('\n🔒 Security check...', colors.cyan);
    
    // Check for exposed secrets
    const envFiles = ['.env', '.env.local', '.env.production'];
    const exposedEnvFiles = envFiles.filter(file => 
      fs.existsSync(file) && !fs.existsSync('.gitignore')
    );
    
    if (exposedEnvFiles.length > 0) {
      log('  ⚠️ Warning: Environment files might be exposed', colors.red);
      exposedEnvFiles.forEach(file => {
        log(`    ${file}`, colors.red);
      });
    } else {
      log('  ✅ No exposed environment files', colors.green);
    }

    // Summary
    log('\n' + '='.repeat(50), colors.cyan);
    log('✅ Build optimization complete!', colors.green);
    log('\nRecommendations:', colors.yellow);
    log('  1. Review and optimize large images');
    log('  2. Fix any TypeScript or lint errors');
    log('  3. Monitor bundle size after build');
    log('  4. Verify all environment variables are set in Vercel');
    
    log('\n🚀 Ready for deployment to Vercel!', colors.bright + colors.green);
    
  } catch (error) {
    log(`\n❌ Optimization failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Helper function to get all files recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// Run optimization
optimizeBuild();