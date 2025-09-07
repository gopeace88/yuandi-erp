#!/usr/bin/env node

/**
 * Table Name Standardization Script
 * Fixes table name inconsistencies between code and database schema
 * Based on 002_schema_v2.sql as the source of truth
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Table name mappings from incorrect to correct
const tableMappings = {
  // user_profiles → profiles
  "from('user_profiles')": "from('profiles')",
  'from("user_profiles")': 'from("profiles")',
  "from(`user_profiles`)": "from(`profiles`)",
  
  // cashbook_transactions → cashbook  
  "from('cashbook_transactions')": "from('cashbook')",
  'from("cashbook_transactions")': 'from("cashbook")',
  "from(`cashbook_transactions`)": "from(`cashbook`)",
};

function findAndReplaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Apply all table name mappings
    for (const [oldName, newName] of Object.entries(tableMappings)) {
      if (content.includes(oldName)) {
        console.log(`  ${oldName} → ${newName}`);
        content = content.replaceAll(oldName, newName);
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

console.log('🔄 Starting Table Name Standardization...');
console.log('Fixing: user_profiles → profiles, cashbook_transactions → cashbook\n');

let totalProcessed = 0;

// Process TypeScript/React files
totalProcessed += processDirectory('./app', '*.tsx');
totalProcessed += processDirectory('./app', '*.ts');

// Process components
totalProcessed += processDirectory('./components', '*.tsx');
totalProcessed += processDirectory('./components', '*.ts');

// Process lib directory
totalProcessed += processDirectory('./lib', '*.ts');

// Process test files
totalProcessed += processDirectory('./__tests__', '*.ts');
totalProcessed += processDirectory('./__tests__', '*.tsx');

console.log(`\n✅ Completed! ${totalProcessed} files were updated.`);
console.log('\n🔍 Next steps:');
console.log('1. Run: npm run typecheck');
console.log('2. Fix any remaining type errors');
console.log('3. Test the application');