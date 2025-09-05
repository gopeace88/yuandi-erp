#!/usr/bin/env node

/**
 * 직접 DB 초기화 테스트 - HTTP API 사용
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 환경 변수 로드
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

// Supabase REST API 호출 함수
async function supabaseRequest(method, path, body = null) {
  const url = new URL(supabaseUrl);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: 443,
      path: `/rest/v1${path}`,
      method: method,
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    
    if (method === 'HEAD') {
      options.headers['Prefer'] = 'count=exact';
    }
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = data ? JSON.parse(data) : null;
            resolve({ 
              success: true, 
              data: result, 
              headers: res.headers,
              status: res.statusCode 
            });
          } catch (e) {
            resolve({ 
              success: true, 
              data: data,
              headers: res.headers,
              status: res.statusCode 
            });
          }
        } else {
          resolve({ 
            success: false, 
            error: data,
            status: res.statusCode 
          });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// 테이블 데이터 카운트
async function getTableCount(tableName) {
  try {
    const result = await supabaseRequest('HEAD', `/${tableName}?select=*`);
    if (result.success && result.headers['content-range']) {
      const count = result.headers['content-range'].split('/')[1];
      return parseInt(count) || 0;
    }
    return 0;
  } catch (error) {
    console.error(`Error counting ${tableName}:`, error.message);
    return 0;
  }
}

// 테이블 데이터 백업
async function backupTable(tableName) {
  try {
    const result = await supabaseRequest('GET', `/${tableName}?select=*`);
    if (result.success) {
      return result.data || [];
    }
    return [];
  } catch (error) {
    console.error(`Error backing up ${tableName}:`, error.message);
    return [];
  }
}

// 테이블 데이터 삭제
async function clearTable(tableName) {
  try {
    // DELETE with no filter to delete all records
    const deleteResult = await supabaseRequest(
      'DELETE',
      `/${tableName}?id=neq.00000000-0000-0000-0000-000000000000`
    );
    
    if (!deleteResult.success) {
      // Retry with different approach
      const result = await supabaseRequest('GET', `/${tableName}?select=id&limit=1000`);
      
      if (result.success && result.data && result.data.length > 0) {
        // Batch delete by IDs
        for (let i = 0; i < result.data.length; i += 100) {
          const batch = result.data.slice(i, i + 100);
          const ids = batch.map(item => `'${item.id}'`).join(',');
          
          await supabaseRequest(
            'DELETE',
            `/${tableName}?id=in.(${ids})`
          );
        }
      }
    }
    
    // Verify deletion
    const count = await getTableCount(tableName);
    return count === 0;
    
  } catch (error) {
    console.error(`Error clearing ${tableName}:`, error.message);
    return false;
  }
}

// 백업 디렉토리 생성
function createBackupDirectory() {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

// 모든 테이블 백업
async function backupAllTables() {
  console.log('\n📦 데이터 백업 중...');
  
  const backupDir = createBackupDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupData = {};
  
  const tables = [
    'event_logs',
    'inventory_movements', 
    'cashbook',
    'shipments',
    'order_items',
    'orders',
    'customers',
    'products'
  ];
  
  for (const table of tables) {
    process.stdout.write(`  백업 중: ${table}...`);
    const count = await getTableCount(table);
    
    if (count > 0) {
      const data = await backupTable(table);
      backupData[table] = data;
      console.log(` ✓ (${data.length}건)`);
    } else {
      backupData[table] = [];
      console.log(` ✓ (0건)`);
    }
  }
  
  // 백업 파일 저장
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`\n✅ 백업 완료: ${backupFile}`);
  
  // 백업 통계
  const totalRecords = Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`   총 ${Object.keys(backupData).length}개 테이블, ${totalRecords}개 레코드 백업됨`);
  
  return backupFile;
}

// 데이터베이스 초기화
async function resetDatabase() {
  console.log('\n🗑️ 데이터베이스 초기화 중...');
  
  // 외래 키 제약을 고려한 삭제 순서
  const deleteOrder = [
    'event_logs',
    'inventory_movements',
    'cashbook',
    'shipments',
    'order_items',
    'orders',
    'customers',
    'products'
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const table of deleteOrder) {
    process.stdout.write(`  초기화 중: ${table}...`);
    const success = await clearTable(table);
    
    if (success) {
      console.log(' ✓');
      successCount++;
    } else {
      console.log(' ✗');
      failCount++;
    }
  }
  
  console.log(`\n✅ 데이터베이스 초기화 완료`);
  console.log(`   성공: ${successCount}개 테이블`);
  
  if (failCount > 0) {
    console.log(`   ⚠️  실패: ${failCount}개 테이블`);
  }
}

// 초기화 후 상태 확인
async function verifyReset() {
  console.log('\n🔍 초기화 검증 중...');
  
  const tables = [
    'products',
    'orders',
    'customers',
    'shipments'
  ];
  
  let allClear = true;
  
  for (const table of tables) {
    const count = await getTableCount(table);
    
    if (count === 0) {
      console.log(`  ✓ ${table}: 비어있음`);
    } else {
      console.log(`  ⚠️  ${table}: ${count}건 남아있음`);
      allClear = false;
    }
  }
  
  return allClear;
}

// 메인 실행 함수
async function main() {
  console.log('========================================');
  console.log('   Phase 1: 데이터베이스 초기화');
  console.log('========================================');
  
  console.log('\n📊 현재 상태:');
  console.log(`  Supabase URL: ${supabaseUrl.slice(0, 40)}...`);
  
  // 프로덕션 환경 체크
  if (supabaseUrl.includes('prod') || supabaseUrl.includes('production')) {
    console.error('\n🚨 프로덕션 환경이 감지되었습니다!');
    console.error('   프로덕션 데이터베이스는 초기화할 수 없습니다.');
    process.exit(1);
  }
  
  try {
    // 1. 현재 데이터 개수 확인
    console.log('\n📈 현재 데이터 상태:');
    const currentCounts = {};
    for (const table of ['products', 'orders', 'customers', 'shipments']) {
      const count = await getTableCount(table);
      currentCounts[table] = count;
      console.log(`  • ${table}: ${count}건`);
    }
    
    // 2. 백업
    const backupFile = await backupAllTables();
    
    // 3. 데이터베이스 초기화
    await resetDatabase();
    
    // 4. 초기화 검증
    const resetSuccess = await verifyReset();
    
    if (resetSuccess) {
      console.log('\n✅ 모든 초기화 작업 완료!');
      console.log('\n📝 다음 단계:');
      console.log('   node test/system/direct-test-seed.js');
    } else {
      console.log('\n⚠️  일부 테이블이 완전히 초기화되지 않았습니다.');
      console.log('   수동으로 확인이 필요할 수 있습니다.');
    }
    
  } catch (error) {
    console.error('\n❌ 초기화 중 오류 발생:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { resetDatabase, backupAllTables };