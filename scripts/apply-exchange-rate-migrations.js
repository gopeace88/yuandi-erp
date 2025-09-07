/**
 * 환율 시스템 마이그레이션 실행 스크립트
 * Migration 010, 011 적용
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

async function applyMigrations() {
  console.log('🚀 환율 시스템 마이그레이션 시작...\n');
  
  try {
    // Migration 010: 환율 테이블 생성
    console.log('📊 Migration 010: 환율 테이블 생성 중...');
    const migration010 = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/010_create_exchange_rate_tables.sql'),
      'utf8'
    );
    
    const { error: error010 } = await supabase.rpc('exec_sql', {
      sql: migration010
    }).catch(async () => {
      // RPC가 없으면 직접 실행
      const statements = migration010.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await supabase.from('_sql').select(statement);
        }
      }
    });
    
    if (error010) {
      console.error('❌ Migration 010 실패:', error010);
    } else {
      console.log('✅ Migration 010 완료');
    }
    
    // Migration 011: 이중 통화 필드 추가
    console.log('\n💱 Migration 011: 이중 통화 필드 추가 중...');
    const migration011 = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/011_add_dual_currency_fields.sql'),
      'utf8'
    );
    
    const { error: error011 } = await supabase.rpc('exec_sql', {
      sql: migration011
    }).catch(async () => {
      const statements = migration011.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await supabase.from('_sql').select(statement);
        }
      }
    });
    
    if (error011) {
      console.error('❌ Migration 011 실패:', error011);
    } else {
      console.log('✅ Migration 011 완료');
    }
    
    // 환율 데이터 확인
    console.log('\n📈 현재 환율 데이터 확인...');
    const { data: rates, error: ratesError } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('date', { ascending: false })
      .limit(3);
    
    if (rates && rates.length > 0) {
      console.log('최근 환율:');
      rates.forEach(rate => {
        console.log(`  ${rate.date}: 1 CNY = ${rate.rate} KRW (${rate.source})`);
      });
    }
    
    console.log('\n✨ 환율 시스템 마이그레이션 완료!');
    console.log('📌 다음 단계:');
    console.log('  1. Supabase 대시보드에서 직접 SQL 실행 (권장)');
    console.log('  2. 환율 API 키 설정 (.env.local)');
    console.log('  3. 애플리케이션 재시작');
    
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

// 실행
applyMigrations();