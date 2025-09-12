import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 출납유형 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 활성화된 출납유형 조회
    const { data: cashbookTypes, error } = await supabase
      .from('cashbook_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('❌ Cashbook types fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cashbook types' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(cashbookTypes || []);
  } catch (error) {
    console.error('❌ Cashbook types GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 새 출납유형 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // admin 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { code, name_ko, name_zh, type, color, description, display_order } = body;
    
    // 필수 필드 검증
    if (!code || !name_ko || !name_zh || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 출납유형 생성
    const { data: cashbookType, error } = await supabase
      .from('cashbook_types')
      .insert({
        code: code.toLowerCase().replace(/\s+/g, '_'),
        name_ko,
        name_zh,
        type,
        color: color || '#6B7280',
        description,
        display_order: display_order || 999,
        is_system: false,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Cashbook type creation error:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Cashbook type code already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create cashbook type' },
        { status: 500 }
      );
    }
    
    console.log('✅ Cashbook type created:', cashbookType);
    return NextResponse.json(cashbookType, { status: 201 });
  } catch (error) {
    console.error('❌ Cashbook types POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: 출납유형 수정
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // admin 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { id, name_ko, name_zh, type, color, description, display_order, is_active } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Cashbook type ID is required' },
        { status: 400 }
      );
    }
    
    // 시스템 유형은 수정 불가
    const { data: existingType } = await supabase
      .from('cashbook_types')
      .select('is_system')
      .eq('id', id)
      .single();
    
    if (existingType?.is_system) {
      return NextResponse.json(
        { error: 'System cashbook types cannot be modified' },
        { status: 403 }
      );
    }
    
    // 출납유형 업데이트
    const updateData: any = {};
    if (name_ko !== undefined) updateData.name_ko = name_ko;
    if (name_zh !== undefined) updateData.name_zh = name_zh;
    if (type !== undefined) updateData.type = type;
    if (color !== undefined) updateData.color = color;
    if (description !== undefined) updateData.description = description;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const { data: cashbookType, error } = await supabase
      .from('cashbook_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Cashbook type update error:', error);
      return NextResponse.json(
        { error: 'Failed to update cashbook type' },
        { status: 500 }
      );
    }
    
    console.log('✅ Cashbook type updated:', cashbookType);
    return NextResponse.json(cashbookType);
  } catch (error) {
    console.error('❌ Cashbook types PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: 출납유형 삭제 (비활성화)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // admin 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Cashbook type ID is required' },
        { status: 400 }
      );
    }
    
    // 시스템 유형은 삭제 불가
    const { data: existingType } = await supabase
      .from('cashbook_types')
      .select('is_system')
      .eq('id', id)
      .single();
    
    if (existingType?.is_system) {
      return NextResponse.json(
        { error: 'System cashbook types cannot be deleted' },
        { status: 403 }
      );
    }
    
    // 출납유형 비활성화 (실제 삭제 대신)
    const { error } = await supabase
      .from('cashbook_types')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) {
      console.error('❌ Cashbook type deletion error:', error);
      return NextResponse.json(
        { error: 'Failed to delete cashbook type' },
        { status: 500 }
      );
    }
    
    console.log('✅ Cashbook type deleted (deactivated):', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Cashbook types DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}