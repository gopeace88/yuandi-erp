/**
 * 시스템 테스트 - Phase 1: 데이터베이스 초기화
 * 
 * 주의: 이 스크립트는 모든 데이터를 삭제합니다!
 * 프로덕션 환경에서 실행하지 마세요!
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY; // Service role key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 사용자 확인 프롬프트
async function confirmReset(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n⚠️  경고: 이 작업은 모든 데이터를 삭제합니다!');
    console.log('데이터베이스: ' + supabaseUrl);
    
    rl.question('\n정말 계속하시겠습니까? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// 백업 생성
async function createBackup(): Promise<void> {
  console.log('\n📦 데이터 백업 중...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', timestamp);
  
  await fs.mkdir(backupDir, { recursive: true });

  const tables = [
    'products',
    'orders',
    'order_items',
    'shipments',
    'inventory_movements',
    'cashbook',
    'customers',
    'event_logs'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) {
        console.log(`  ⚠️  ${table} 백업 실패:`, error.message);
        continue;
      }

      if (data && data.length > 0) {
        const filePath = path.join(backupDir, `${table}.json`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log(`  ✅ ${table}: ${data.length}건 백업됨`);
      } else {
        console.log(`  ⏭️  ${table}: 데이터 없음`);
      }
    } catch (error) {
      console.error(`  ❌ ${table} 백업 오류:`, error);
    }
  }

  console.log(`\n백업 위치: ${backupDir}`);
}

// 데이터베이스 초기화
async function resetDatabase(): Promise<void> {
  console.log('\n🗑️  데이터베이스 초기화 중...');

  // 삭제 순서 중요: 외래 키 제약 조건 고려
  const deleteOrder = [
    'event_logs',        // 로그 먼저 삭제
    'inventory_movements', // 재고 이동 기록
    'cashbook',          // 현금 장부
    'shipments',         // 배송 정보
    'order_items',       // 주문 아이템
    'orders',            // 주문
    'customers',         // 고객
    'products'           // 상품
  ];

  for (const table of deleteOrder) {
    try {
      const { error, count } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 레코드 삭제

      if (error) {
        console.error(`  ❌ ${table} 삭제 실패:`, error.message);
      } else {
        console.log(`  ✅ ${table} 초기화 완료`);
      }
    } catch (error) {
      console.error(`  ❌ ${table} 오류:`, error);
    }
  }

  // Storage 버킷 정리
  console.log('\n🗑️  Storage 초기화 중...');
  
  const buckets = ['product-images', 'shipment-photos', 'documents'];
  
  for (const bucket of buckets) {
    try {
      const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list();

      if (listError) {
        console.log(`  ⚠️  ${bucket} 목록 조회 실패:`, listError.message);
        continue;
      }

      if (files && files.length > 0) {
        const filePaths = files.map(f => f.name);
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove(filePaths);

        if (deleteError) {
          console.log(`  ⚠️  ${bucket} 파일 삭제 실패:`, deleteError.message);
        } else {
          console.log(`  ✅ ${bucket}: ${files.length}개 파일 삭제됨`);
        }
      } else {
        console.log(`  ⏭️  ${bucket}: 파일 없음`);
      }
    } catch (error) {
      console.error(`  ❌ ${bucket} 오류:`, error);
    }
  }
}

// 시스템 사용자 생성
async function createSystemUsers(): Promise<void> {
  console.log('\n👥 시스템 사용자 생성 중...');

  const systemUsers = [
    {
      email: 'admin@yuandi.com',
      password: 'admin123!@#',
      role: 'admin',
      name: '시스템 관리자'
    },
    {
      email: 'order@yuandi.com',
      password: 'order123!@#',
      role: 'order_manager',
      name: '주문 관리자'
    },
    {
      email: 'ship@yuandi.com',
      password: 'ship123!@#',
      role: 'ship_manager',
      name: '배송 관리자'
    }
  ];

  for (const user of systemUsers) {
    try {
      // Supabase Auth를 통한 사용자 생성은 Admin API가 필요
      // 여기서는 사용자 정보만 출력
      console.log(`  ℹ️  ${user.role}: ${user.email} / ${user.password}`);
    } catch (error) {
      console.error(`  ❌ ${user.email} 생성 실패:`, error);
    }
  }

  console.log('\n  💡 Supabase Dashboard에서 직접 사용자를 생성하거나');
  console.log('     Auth Admin API를 사용하여 생성해주세요.');
}

// 초기 설정 데이터 생성
async function createInitialSettings(): Promise<void> {
  console.log('\n⚙️  초기 설정 생성 중...');

  // 기본 카테고리 (향후 settings 테이블이 있다면)
  const categories = [
    '의류', '가방', '신발', '액세서리', '화장품', 
    '전자제품', '식품', '생활용품', '유아용품', '기타'
  ];

  // 택배사 목록
  const couriers = [
    'CJ대한통운', '한진택배', '우체국택배', '롯데택배', 
    '로젠택배', 'EMS', 'DHL', 'FedEx'
  ];

  console.log('  ✅ 카테고리:', categories.join(', '));
  console.log('  ✅ 택배사:', couriers.join(', '));
}

// 메인 실행 함수
async function main() {
  console.log('========================================');
  console.log('   YUANDI 시스템 테스트 - DB 초기화');
  console.log('========================================');

  // 환경 확인
  const isProduction = supabaseUrl?.includes('prod') || supabaseUrl?.includes('production');
  
  if (isProduction) {
    console.error('\n❌ 프로덕션 환경에서는 실행할 수 없습니다!');
    process.exit(1);
  }

  // 사용자 확인
  const confirmed = await confirmReset();
  
  if (!confirmed) {
    console.log('\n❌ 작업이 취소되었습니다.');
    process.exit(0);
  }

  try {
    // 1. 백업 생성
    await createBackup();

    // 2. 데이터베이스 초기화
    await resetDatabase();

    // 3. 시스템 사용자 생성
    await createSystemUsers();

    // 4. 초기 설정 생성
    await createInitialSettings();

    console.log('\n========================================');
    console.log('✅ 데이터베이스 초기화 완료!');
    console.log('========================================');
    console.log('\n다음 단계: npm run test:system:seed');
    
  } catch (error) {
    console.error('\n❌ 초기화 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}

export { resetDatabase, createBackup };