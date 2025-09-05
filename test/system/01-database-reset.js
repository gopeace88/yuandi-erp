/**
 * 시스템 테스트 - Phase 1: 데이터베이스 초기화
 * 기존 데이터 백업 후 모든 테이블 클린업
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 환경 변수 로드
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_API_KEY를 확인하세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 백업 디렉토리 생성
async function createBackupDirectory() {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

// 테이블 데이터 백업
async function backupTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`  ⚠️ ${tableName} 백업 실패:`, error.message);
      return null;
    }
    
    return data || [];
  } catch (error) {
    console.error(`  ⚠️ ${tableName} 백업 중 오류:`, error.message);
    return [];
  }
}

// 모든 테이블 백업
async function backupAllTables() {
  console.log('📦 데이터 백업 중...');
  
  const backupDir = await createBackupDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupData = {};
  
  const tables = [
    'customers', 'products', 'orders', 'order_items',
    'shipments', 'inventory_movements', 'cashbook', 'event_logs'
  ];
  
  for (const table of tables) {
    process.stdout.write(`  백업 중: ${table}...`);
    const data = await backupTable(table);
    backupData[table] = data;
    console.log(` ✓ (${data ? data.length : 0}건)`);
  }
  
  // 백업 파일 저장
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`✅ 백업 완료: ${backupFile}`);
  
  return backupFile;
}

// 테이블 데이터 삭제
async function clearTable(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 레코드 삭제
    
    if (error) {
      console.error(`  ❌ ${tableName} 삭제 실패:`, error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`  ❌ ${tableName} 삭제 중 오류:`, error.message);
    return false;
  }
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
  
  for (const table of deleteOrder) {
    process.stdout.write(`  초기화 중: ${table}...`);
    const success = await clearTable(table);
    console.log(success ? ' ✓' : ' ✗');
  }
  
  console.log('✅ 데이터베이스 초기화 완료');
}

// 스토리지 정리
async function clearStorage() {
  console.log('\n🗂️ 스토리지 정리 중...');
  
  try {
    // 상품 이미지 버킷 정리
    const { data: productFiles } = await supabase.storage
      .from('products')
      .list();
    
    if (productFiles && productFiles.length > 0) {
      const filesToDelete = productFiles.map(f => f.name);
      await supabase.storage
        .from('products')
        .remove(filesToDelete);
      console.log(`  ✓ 상품 이미지 ${filesToDelete.length}개 삭제`);
    }
    
    // 배송 사진 버킷 정리
    const { data: shipmentFiles } = await supabase.storage
      .from('shipments')
      .list();
    
    if (shipmentFiles && shipmentFiles.length > 0) {
      const filesToDelete = shipmentFiles.map(f => f.name);
      await supabase.storage
        .from('shipments')
        .remove(filesToDelete);
      console.log(`  ✓ 배송 사진 ${filesToDelete.length}개 삭제`);
    }
    
    console.log('✅ 스토리지 정리 완료');
  } catch (error) {
    console.error('⚠️ 스토리지 정리 중 오류:', error.message);
  }
}

// 시스템 사용자 생성
async function createSystemUsers() {
  console.log('\n👤 시스템 사용자 생성 중...');
  
  // 이 부분은 Supabase Auth Admin API가 필요하므로
  // 실제 구현시 별도 처리 필요
  console.log('  ⚠️ 시스템 사용자는 Supabase 대시보드에서 수동 생성 필요');
  console.log('     - admin@yuandi.com (Admin)');
  console.log('     - order@yuandi.com (OrderManager)');
  console.log('     - ship@yuandi.com (ShipManager)');
  
  return true;
}

// 메인 실행 함수
async function main() {
  console.log('========================================');
  console.log('   데이터베이스 초기화 시작');
  console.log('========================================\n');
  
  // 프로덕션 환경 체크
  if (supabaseUrl.includes('prod') || supabaseUrl.includes('production')) {
    console.error('🚨 프로덕션 환경이 감지되었습니다!');
    console.error('   프로덕션 데이터베이스는 초기화할 수 없습니다.');
    process.exit(1);
  }
  
  try {
    // 1. 백업
    await backupAllTables();
    
    // 2. 데이터베이스 초기화
    await resetDatabase();
    
    // 3. 스토리지 정리
    await clearStorage();
    
    // 4. 시스템 사용자
    await createSystemUsers();
    
    console.log('\n✅ 모든 초기화 작업 완료!');
    console.log('다음 단계: npm run test:system:seed');
    
  } catch (error) {
    console.error('\n❌ 초기화 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { resetDatabase, backupAllTables };