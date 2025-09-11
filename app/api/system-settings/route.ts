import { NextRequest, NextResponse } from 'next/server';

// 하드코드된 시스템 설정 (system_settings 테이블이 없으므로 임시 해결책)
const DEFAULT_SYSTEM_SETTINGS = [
  {
    id: 'low_stock_threshold',
    key: 'low_stock_threshold',
    value: '10',
    category: 'inventory',
    data_type: 'number',
    label_ko: '재고 부족 임계값',
    label_zh: '库存不足阈值',
    description: '재고 부족 경고를 표시할 수량',
    display_order: 1
  },
  {
    id: 'default_currency',
    key: 'default_currency',
    value: 'KRW',
    category: 'general',
    data_type: 'string',
    label_ko: '기본 통화',
    label_zh: '默认货币',
    description: '시스템 기본 통화',
    display_order: 2
  },
  {
    id: 'fx_rate_cny_krw',
    key: 'fx_rate_cny_krw',
    value: '180',
    category: 'finance',
    data_type: 'number',
    label_ko: 'CNY-KRW 환율',
    label_zh: 'CNY-KRW 汇率',
    description: '1 CNY = ? KRW',
    display_order: 3
  },
  {
    id: 'items_per_page',
    key: 'items_per_page',
    value: '30',
    category: 'ui',
    data_type: 'number',
    label_ko: '페이지당 항목 수',
    label_zh: '每页项目数',
    description: '목록 페이지에서 표시할 항목 수',
    display_order: 4
  }
];

// GET: 시스템 설정 조회
export async function GET(request: NextRequest) {
  try {
    // 카테고리 파라미터 확인
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    
    let settings = DEFAULT_SYSTEM_SETTINGS;
    
    // 카테고리 필터
    if (category && category !== 'all') {
      settings = settings.filter(s => s.category === category);
    }
    
    // TODO: 향후 system_settings 테이블 생성 시 데이터베이스에서 조회하도록 수정
    return NextResponse.json(settings);
  } catch (error) {
    console.error('System settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: 시스템 설정 업데이트 (system_settings 테이블 없으므로 비활성화)
export async function PATCH(request: NextRequest) {
  // TODO: system_settings 테이블 생성 후 구현
  return NextResponse.json(
    { error: 'System settings management is not available. Using default settings.' },
    { status: 501 }
  );
}

// 원래 PATCH 구현 (나중에 참고용)
async function PATCH_DISABLED(request: NextRequest) {
  try {
    const supabase = null; // await createClient();
    
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