import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 시스템 설정 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 카테고리 파라미터 확인
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    
    let query = supabase
      .from('system_settings')
      .select('*')
      .order('display_order', { ascending: true });
    
    // 카테고리 필터
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    const { data: settings, error } = await query;
    
    if (error) {
      console.error('System settings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    const updatePromises = updates.map(async (setting: any) => {
      const { key, value, value_type } = setting;
      
      // 값 타입 검증
      if (value_type === 'number') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          throw new Error(`Invalid number value for ${key}`);
        }
        
        // min/max 검증
        const { data: settingInfo } = await supabase
          .from('system_settings')
          .select('min_value, max_value')
          .eq('key', key)
          .single();
        
        if (settingInfo) {
          if (settingInfo.min_value !== null && numValue < settingInfo.min_value) {
            throw new Error(`Value for ${key} is below minimum (${settingInfo.min_value})`);
          }
          if (settingInfo.max_value !== null && numValue > settingInfo.max_value) {
            throw new Error(`Value for ${key} is above maximum (${settingInfo.max_value})`);
          }
        }
      } else if (value_type === 'boolean') {
        if (value !== 'true' && value !== 'false') {
          throw new Error(`Invalid boolean value for ${key}`);
        }
      }
      
      return supabase
        .from('system_settings')
        .update({ 
          value,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('key', key)
        .eq('is_editable', true); // 편집 가능한 설정만 업데이트
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

// POST: 새 시스템 설정 추가 (admin only)
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
    
    const newSetting = await request.json();
    
    const { data, error } = await supabase
      .from('system_settings')
      .insert({
        ...newSetting,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('System setting creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('System setting creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}