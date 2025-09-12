import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 시스템 설정 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 데이터베이스에서 시스템 설정 조회
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('System settings fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
    
    return NextResponse.json(settings || []);
  } catch (error) {
    console.error('System settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: 시스템 설정 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 권한 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // admin 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const updates = await request.json();
    
    // 배치 업데이트 처리
    const updatePromises = Object.entries(updates).map(async ([key, value]) => {
      // 먼저 설정 정보 가져오기
      const { data: settingInfo } = await supabase
        .from('system_settings')
        .select('value_type, min_value, max_value, is_editable')
        .eq('key', key)
        .single();
      
      if (!settingInfo) {
        throw new Error(`Setting ${key} not found`);
      }
      
      if (!settingInfo.is_editable) {
        throw new Error(`Setting ${key} is not editable`);
      }
      
      // 값 타입 검증
      if (settingInfo.value_type === 'number') {
        const numValue = parseFloat(String(value));
        if (isNaN(numValue)) {
          throw new Error(`Invalid number value for ${key}`);
        }
        
        if (settingInfo.min_value !== null && numValue < settingInfo.min_value) {
          throw new Error(`Value for ${key} is below minimum (${settingInfo.min_value})`);
        }
        if (settingInfo.max_value !== null && numValue > settingInfo.max_value) {
          throw new Error(`Value for ${key} is above maximum (${settingInfo.max_value})`);
        }
      } else if (settingInfo.value_type === 'boolean') {
        if (value !== 'true' && value !== 'false') {
          throw new Error(`Invalid boolean value for ${key}`);
        }
      }
      
      return supabase
        .from('system_settings')
        .update({ 
          value: String(value),
          updated_at: new Date().toISOString()
        })
        .eq('key', key);
    });
    
    const results = await Promise.all(updatePromises);
    
    // 에러 확인
    const errors = results.filter(r => r.error).map(r => r.error);
    if (errors.length > 0) {
      console.error('Update errors:', errors);
      return NextResponse.json({ error: 'Some updates failed', details: errors }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error: any) {
    console.error('System settings update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: 시스템 설정 기본값으로 리셋
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 권한 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // admin 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // 모든 설정을 기본값으로 리셋
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, default_value')
      .eq('is_editable', true);
    
    if (settings && settings.length > 0) {
      const resetPromises = settings.map(setting => 
        supabase
          .from('system_settings')
          .update({ 
            value: setting.default_value,
            updated_at: new Date().toISOString()
          })
          .eq('key', setting.key)
      );
      
      await Promise.all(resetPromises);
    }
    
    return NextResponse.json({ message: 'Settings reset to defaults successfully' });
  } catch (error) {
    console.error('System settings reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}