#!/usr/bin/env node

/**
 * Fix database.types imports to use supabase.types
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import patterns to replace
const importMappings = {
  "from '@/lib/supabase/database.types'": "from '@/types/supabase.types'",
  'from "@/lib/supabase/database.types"': 'from "@/types/supabase.types"',
  "from './database.types'": "from '@/types/supabase.types'",
  'from "./database.types"': 'from "@/types/supabase.types"',
};

function findAndReplaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    for (const [oldImport, newImport] of Object.entries(importMappings)) {
      if (content.includes(oldImport)) {
        console.log(`  ${oldImport} → ${newImport}`);
        content = content.replaceAll(oldImport, newImport);
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

console.log('🔄 Fixing database.types imports...\n');

let totalProcessed = 0;

// Process all TypeScript files
totalProcessed += processDirectory('./app', '*.tsx');
totalProcessed += processDirectory('./app', '*.ts');
totalProcessed += processDirectory('./components', '*.tsx');
totalProcessed += processDirectory('./components', '*.ts');
totalProcessed += processDirectory('./lib', '*.ts');

console.log(`\n✅ Completed! ${totalProcessed} files were updated.`);