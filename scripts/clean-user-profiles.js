// Service Role Key를 사용한 user_profiles 정리 스크립트
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_API_KEY; // Service Role Key

// Service Role Key로 클라이언트 생성 (RLS 우회)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanUserProfiles() {
  console.log('===============================');
  console.log('User Profiles 정리 스크립트');
  console.log('===============================\n');

  try {
    // 1. 현재 user_profiles 상태 확인
    console.log('1. 현재 user_profiles 테이블 상태:');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }
    
    console.log(`   총 ${profiles.length}개의 프로필 발견`);
    profiles.forEach(p => {
      console.log(`   - ${p.email} (ID: ${p.id})`);
    });

    // 2. auth.users에 없는 프로필 찾기
    console.log('\n2. auth.users에 없는 프로필 확인 중...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    const authUserIds = users.map(u => u.id);
    const orphanProfiles = profiles.filter(p => !authUserIds.includes(p.id));
    
    if (orphanProfiles.length > 0) {
      console.log(`   ⚠️ ${orphanProfiles.length}개의 고아 프로필 발견:`);
      orphanProfiles.forEach(p => {
        console.log(`      - ${p.email} (ID: ${p.id})`);
      });

      // 3. 고아 프로필 삭제
      console.log('\n3. 고아 프로필 삭제 중...');
      for (const profile of orphanProfiles) {
        const { error: deleteError } = await supabase
          .from('user_profiles')
          .delete()
          .eq('id', profile.id);
        
        if (deleteError) {
          console.error(`   ❌ Failed to delete ${profile.email}:`, deleteError.message);
        } else {
          console.log(`   ✅ Deleted ${profile.email}`);
        }
      }
    } else {
      console.log('   ✅ 모든 프로필이 auth.users와 일치합니다.');
    }

    // 4. 최종 상태 확인
    console.log('\n4. 정리 후 상태:');
    const { data: finalProfiles } = await supabase
      .from('user_profiles')
      .select('*');
    
    console.log(`   총 ${finalProfiles?.length || 0}개의 프로필`);
    console.log(`   총 ${users.length}개의 auth.users`);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// 특정 사용자 삭제 함수
async function deleteSpecificUser(userId) {
  console.log(`\n특정 사용자 삭제: ${userId}`);
  
  // 1. 관련 데이터 먼저 삭제
  console.log('1. 관련 데이터 삭제 중...');
  
  // orders 삭제
  const { error: ordersError } = await supabase
    .from('orders')
    .delete()
    .eq('user_id', userId);
  
  if (ordersError) {
    console.log('   ⚠️ Orders 삭제 실패:', ordersError.message);
  }

  // shipments 삭제
  const { error: shipmentsError } = await supabase
    .from('shipments')
    .delete()
    .eq('created_by', userId);
  
  if (shipmentsError) {
    console.log('   ⚠️ Shipments 삭제 실패:', shipmentsError.message);
  }

  // 2. user_profiles 삭제
  console.log('2. user_profiles 삭제 중...');
  const { error: profileError } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', userId);
  
  if (profileError) {
    console.error('   ❌ Profile 삭제 실패:', profileError.message);
  } else {
    console.log('   ✅ Profile 삭제 완료');
  }

  // 3. auth.users는 Dashboard에서 삭제해야 함
  console.log('3. ⚠️ auth.users는 Supabase Dashboard에서 수동으로 삭제하세요.');
}

// 실행
cleanUserProfiles();

// 특정 사용자를 삭제하려면 주석 해제하고 ID 입력:
// deleteSpecificUser('8b451e06-d671-45df-8883-0555a2f4540f');