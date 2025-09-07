#!/usr/bin/env node

/**
 * Complete Enum Standardization Script
 * Converts ALL enum references to lowercase format across entire codebase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Role mappings - 모든 가능한 변형 포함
const roleMappings = {
  // User Role 변환
  "'admin'": "'admin'",
  '"admin"': '"admin"',
  'admin': 'admin',
  "'order_manager'": "'order_manager'",
  '"order_manager"': '"order_manager"',
  'order_manager': 'order_manager',
  "'ship_manager'": "'ship_manager'",
  '"ship_manager"': '"ship_manager"',
  'ship_manager': 'ship_manager',
  "'customer'": "'customer'",
  '"customer"': '"customer"',
  'customer': 'customer'
};

// Status mappings - Order Status 변환
const statusMappings = {
  "'paid'": "'paid'",
  '"paid"': '"paid"',
  'paid': 'paid',
  "'shipped'": "'shipped'",
  '"shipped"': '"shipped"',
  'shipped': 'shipped',
  "'delivered'": "'delivered'",
  '"delivered"': '"delivered"',
  'delivered': 'delivered',
  "'delivered'": "'delivered'",
  '"delivered"': '"delivered"',
  'delivered': 'delivered',
  "'cancelled'": "'cancelled'",
  '"cancelled"': '"cancelled"',
  'cancelled': 'cancelled',
  "'refunded'": "'refunded'",
  '"refunded"': '"refunded"',
  'refunded': 'refunded'
};

// 모든 mappings 통합
const allMappings = { ...roleMappings, ...statusMappings };

function findAndReplaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    let changeLog = [];
    
    // Apply all mappings
    for (const [oldValue, newValue] of Object.entries(allMappings)) {
      // TypeScript 타입 정의에서의 변환도 포함
      const typePattern = new RegExp(`\\b${oldValue}\\b(?=\\s*[|)])`, 'g');
      const matches = content.match(typePattern);
      
      if (matches && matches.length > 0) {
        content = content.replace(typePattern, newValue);
        changeLog.push(`  Type: ${oldValue} → ${newValue} (${matches.length} occurrences)`);
        hasChanges = true;
      }
      
      // 일반적인 문자열 변환
      if (content.includes(oldValue)) {
        const count = (content.match(new RegExp(oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        content = content.replaceAll(oldValue, newValue);
        changeLog.push(`  ${oldValue} → ${newValue} (${count} occurrences)`);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      console.log(`\n📝 Processing: ${filePath}`);
      changeLog.forEach(log => console.log(log));
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
  
  return false;
}

function processDirectory(dirPath, patterns) {
  let totalProcessed = 0;
  
  patterns.forEach(pattern => {
    try {
      const command = `find "${dirPath}" -name "${pattern}" -type f 2>/dev/null || true`;
      const files = execSync(command, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
      
      console.log(`\n🔍 Found ${files.length} ${pattern} files in ${dirPath}`);
      
      files.forEach(filePath => {
        if (filePath && !filePath.includes('node_modules') && !filePath.includes('.next')) {
          if (findAndReplaceInFile(filePath)) {
            totalProcessed++;
          }
        }
      });
    } catch (error) {
      console.error(`Error processing directory ${dirPath}:`, error.message);
    }
  });
  
  return totalProcessed;
}

console.log('🚀 Starting Complete Enum Standardization...');
console.log('Converting ALL enums to lowercase format:');
console.log('  User Roles: admin → admin, order_manager → order_manager, ship_manager → ship_manager');
console.log('  Order Status: paid → paid, shipped → shipped, delivered → delivered, refunded → refunded\n');

let totalProcessed = 0;

// Process all TypeScript/JavaScript files
const directories = [
  './app',
  './lib',
  './components',
  './types',
  './e2e',
  './__tests__',
  './utils',
  './hooks',
  './contexts'
];

const filePatterns = ['*.ts', '*.tsx', '*.js', '*.jsx'];

directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    totalProcessed += processDirectory(dir, filePatterns);
  }
});

// Process SQL files
if (fs.existsSync('./supabase')) {
  totalProcessed += processDirectory('./supabase', ['*.sql']);
}

// Process scripts
if (fs.existsSync('./scripts')) {
  totalProcessed += processDirectory('./scripts', ['*.sql', '*.js', '*.ts']);
}

console.log(`\n✅ Completed! ${totalProcessed} files were updated.`);
console.log('\n🔍 Next steps:');
console.log('1. Run: npm run typecheck');
console.log('2. Run: npm run test');
console.log('3. Review changes with: git diff');
console.log('4. Commit changes when ready');