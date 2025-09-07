#!/usr/bin/env node

/**
 * User Role Standardization Script
 * Converts all User Role references from capitalized (admin, order_manager, ship_manager) 
 * to lowercase underscore format (admin, order_manager, ship_manager) to match database schema
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Role mappings from old to new format
const roleMappings = {
  "'admin'": "'admin'",
  '"admin"': '"admin"',
  'admin': 'admin',
  "'order_manager'": "'order_manager'",
  '"order_manager"': '"order_manager"',
  'order_manager': 'order_manager',
  "'ship_manager'": "'ship_manager'",
  '"ship_manager"': '"ship_manager"',
  'ship_manager': 'ship_manager'
};

function findAndReplaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Apply all role mappings
    for (const [oldRole, newRole] of Object.entries(roleMappings)) {
      if (content.includes(oldRole)) {
        console.log(`  ${oldRole} → ${newRole}`);
        content = content.replaceAll(oldRole, newRole);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
  
  return false;
}

function processDirectory(dirPath, pattern) {
  try {
    // Use find to get all matching files
    const command = `find "${dirPath}" -name "${pattern}" -type f`;
    const files = execSync(command, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
    
    console.log(`\nProcessing ${files.length} ${pattern} files in ${dirPath}:`);
    
    let processedCount = 0;
    files.forEach(filePath => {
      console.log(`\nProcessing: ${filePath}`);
      if (findAndReplaceInFile(filePath)) {
        processedCount++;
      } else {
        console.log('  No changes needed');
      }
    });
    
    return processedCount;
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
    return 0;
  }
}

console.log('🔄 Starting User Role Standardization...');
console.log('Converting: admin, order_manager, ship_manager');
console.log('To:         admin, order_manager, ship_manager\n');

let totalProcessed = 0;

// Process TypeScript/React files in app directory
totalProcessed += processDirectory('./app', '*.tsx');
totalProcessed += processDirectory('./app', '*.ts');

// Process components directory
totalProcessed += processDirectory('./components', '*.tsx');
totalProcessed += processDirectory('./components', '*.ts');

// Process test files
totalProcessed += processDirectory('./__tests__', '*.ts');
totalProcessed += processDirectory('./__tests__', '*.tsx');

console.log(`\n✅ Completed! ${totalProcessed} files were updated.`);
console.log('\n🔍 Next steps:');
console.log('1. Run: npm run typecheck');
console.log('2. Run: npm run test');
console.log('3. Fix any remaining type errors manually');