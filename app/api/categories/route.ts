import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 카테고리 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 활성화된 카테고리만 조회
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('❌ Categories fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('❌ Categories GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 새 카테고리 생성
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
    const { code, name_ko, name_zh, description, display_order } = body;
    
    // 필수 필드 검증
    if (!code || !name_ko || !name_zh) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 카테고리 생성
    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        code: code.toLowerCase().replace(/\s+/g, '_'),
        name_ko,
        name_zh,
        display_order: display_order || 999,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Category creation error:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Category code already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      );
    }
    
    console.log('✅ Category created:', category);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('❌ Categories POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: 카테고리 수정
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
    const { id, name_ko, name_zh, description, display_order, active } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    // 카테고리 업데이트
    const updateData: any = {};
    if (name_ko !== undefined) updateData.name_ko = name_ko;
    if (name_zh !== undefined) updateData.name_zh = name_zh;
    if (description !== undefined) updateData.description = description;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (active !== undefined) updateData.is_active = active;
    
    const { data: category, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Category update error:', error);
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      );
    }
    
    console.log('✅ Category updated:', category);
    return NextResponse.json(category);
  } catch (error) {
    console.error('❌ Categories PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: 카테고리 삭제 (비활성화)
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
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    
    // 카테고리 비활성화 (실제 삭제 대신)
    const { error } = await supabase
      .from('categories')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) {
      console.error('❌ Category deletion error:', error);
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      );
    }
    
    console.log('✅ Category deleted (deactivated):', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Categories DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}