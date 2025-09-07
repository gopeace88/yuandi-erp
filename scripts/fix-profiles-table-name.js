#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to update
const filesToUpdate = [
  'app/[locale]/users/page.tsx',
  'app/api/users/[id]/password/route.ts',
  'app/api/export/route.ts',
  'app/api/cron/backup/route.ts',
  'app/api/users/simple/route.ts',
  'app/api/auth/login/route.ts',
  'app/dashboard/users/page.tsx',
  'app/api/notifications/settings/route.ts',
  'app/components/providers/auth-provider.tsx'
];

const projectRoot = path.join(__dirname, '..');

console.log('Fixing profiles table references to user_profiles...\n');

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(projectRoot, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Replace all variations of profiles table reference
  content = content.replace(/from\('profiles'\)/g, "from('user_profiles')");
  content = content.replace(/from\("profiles"\)/g, 'from("user_profiles")');
  content = content.replace(/from\(`profiles`\)/g, "from(`user_profiles`)");
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
  }
});

console.log('\n✅ All files have been updated!');
console.log('Please restart your dev server for the changes to take effect.');