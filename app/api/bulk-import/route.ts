import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 권한 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 파일을 ArrayBuffer로 읽기
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 엑셀 파일 파싱
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // 각 시트 처리
    const results = {
      categories: { success: 0, failed: 0, errors: [] as string[] },
      cashbook_types: { success: 0, failed: 0, errors: [] as string[] },
      products: { success: 0, failed: 0, errors: [] as string[] },
      total: { success: 0, failed: 0, errors: [] as string[] }
    };

    // 1. 카테고리 시트 처리 (상품보다 먼저)
    if (workbook.SheetNames.includes('카테고리')) {
      const worksheet = workbook.Sheets['카테고리'];
      const data = XLSX.utils.sheet_to_json(worksheet);
      if (data.length > 0) {
        results.categories = await importCategories(supabase, data);
        results.total.success += results.categories.success;
        results.total.failed += results.categories.failed;
        results.total.errors.push(...results.categories.errors);
      }
    }

    // 2. 출납유형 시트 처리
    if (workbook.SheetNames.includes('출납유형')) {
      const worksheet = workbook.Sheets['출납유형'];
      const data = XLSX.utils.sheet_to_json(worksheet);
      if (data.length > 0) {
        results.cashbook_types = await importCashbookTypes(supabase, data);
        results.total.success += results.cashbook_types.success;
        results.total.failed += results.cashbook_types.failed;
        results.total.errors.push(...results.cashbook_types.errors);
      }
    }

    // 3. 상품 시트 처리 (카테고리가 있어야 함)
    if (workbook.SheetNames.includes('상품')) {
      const worksheet = workbook.Sheets['상품'];
      const data = XLSX.utils.sheet_to_json(worksheet);
      if (data.length > 0) {
        // 상품 이름이 있는 행만 처리
        const validProducts = data.filter((row: any) => 
          row['상품명(한글)'] || row['상품명(중문)']
        );
        if (validProducts.length > 0) {
          results.products = await importProducts(supabase, validProducts);
          results.total.success += results.products.success;
          results.total.failed += results.products.failed;
          results.total.errors.push(...results.products.errors);
        }
      }
    }

    return NextResponse.json({
      message: '통합 데이터 업로드 완료',
      details: {
        categories: `카테고리: 성공 ${results.categories.success}건, 실패 ${results.categories.failed}건`,
        cashbook_types: `출납유형: 성공 ${results.cashbook_types.success}건, 실패 ${results.cashbook_types.failed}건`,
        products: `상품: 성공 ${results.products.success}건, 실패 ${results.products.failed}건`
      },
      total: results.total,
      errors: results.total.errors.length > 0 ? results.total.errors : undefined
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    );
  }
}

async function importProducts(supabase: any, data: any[]) {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of data) {
    try {
      const name_ko = row['상품명(한글)'] || '';
      const name_zh = row['상품명(중문)'] || '';
      
      // SKU 처리 - 비어있거나 '자동생성'이면 자동 생성
      let sku = row['SKU'];
      if (!sku || sku === '' || sku.includes('자동')) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const categoryCode = row['카테고리'] ? row['카테고리'].substring(0, 3).toUpperCase() : 'XXX';
        sku = `${categoryCode}-${timestamp.substring(timestamp.length - 8)}`;
      }

      // 기존 상품 확인 (SKU로)
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('sku', sku)
        .single();

      const productData = {
        sku: sku,
        name: name_ko || name_zh,
        name_ko: name_ko,
        name_zh: name_zh,
        category: row['카테고리'] || '',
        model: row['모델'] || null,
        color: row['색상(한글)'] || null,
        color_ko: row['색상(한글)'] || null,
        color_zh: row['색상(중문)'] || null,
        brand: row['브랜드(한글)'] || null,
        brand_ko: row['브랜드(한글)'] || null,
        brand_zh: row['브랜드(중문)'] || null,
        cost_cny: parseFloat(row['원가(CNY)']) || 0,
        price_krw: parseInt(row['판매가(KRW)']) || 0,
        is_active: row['활성'] !== 'N' && row['활성'] !== false
      };

      let error;
      if (existing) {
        // 업데이트
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', existing.id);
        error = updateError;
      } else {
        // 새로 삽입
        const { error: insertError } = await supabase
          .from('products')
          .insert(productData);
        error = insertError;
      }

      if (error) {
        failed++;
        errors.push(`상품 ${name_ko || sku}: ${error.message}`);
      } else {
        success++;
      }
    } catch (err: any) {
      failed++;
      errors.push(`상품 ${row['상품명(한글)'] || row['SKU']}: ${err.message}`);
    }
  }

  return { success, failed, errors };
}

async function importCategories(supabase: any, data: any[]) {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of data) {
    try {
      // 시스템 카테고리는 건너뛰기
      if (row['시스템'] === 'Y') {
        continue;
      }

      const code = row['카테고리코드'] || '';
      
      // 기존 카테고리 확인
      const { data: existing } = await supabase
        .from('categories')
        .select('id, is_system')
        .eq('code', code)
        .single();

      // 시스템 카테고리는 수정 불가
      if (existing?.is_system) {
        errors.push(`카테고리 ${row['한글명']}: 시스템 카테고리는 수정할 수 없습니다.`);
        failed++;
        continue;
      }

      const categoryData = {
        code: code,
        name_ko: row['한글명'] || '',
        name_zh: row['중문명'] || '',
        display_order: parseInt(row['순서']) || 0,
        is_system: false,
        active: row['활성'] !== 'N' && row['활성'] !== false
      };

      let error;
      if (existing) {
        // 업데이트
        const { error: updateError } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', existing.id);
        error = updateError;
      } else {
        // 새로 삽입
        const { error: insertError } = await supabase
          .from('categories')
          .insert(categoryData);
        error = insertError;
      }

      if (error) {
        failed++;
        errors.push(`카테고리 ${row['한글명']}: ${error.message}`);
      } else {
        success++;
      }
    } catch (err: any) {
      failed++;
      errors.push(`카테고리 ${row['한글명']}: ${err.message}`);
    }
  }

  return { success, failed, errors };
}

async function importCashbookTypes(supabase: any, data: any[]) {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of data) {
    try {
      // 시스템 항목은 건너뛰기
      if (row['시스템'] === 'Y') {
        continue;
      }

      const code = row['코드'] || '';
      
      // 기존 항목 확인
      const { data: existing } = await supabase
        .from('cashbook_types')
        .select('id, is_system')
        .eq('code', code)
        .single();

      // 시스템 항목은 수정 불가
      if (existing?.is_system) {
        errors.push(`출납유형 ${row['한글명']}: 시스템 항목은 수정할 수 없습니다.`);
        failed++;
        continue;
      }

      const typeData = {
        code: code,
        name_ko: row['한글명'] || '',
        name_zh: row['중문명'] || '',
        type: row['유형'] || 'expense',
        color: row['색상'] || '#6b7280',
        display_order: parseInt(row['순서']) || 0,
        is_system: false,
        active: row['활성'] !== 'N' && row['활성'] !== false
      };

      let error;
      if (existing) {
        // 업데이트
        const { error: updateError } = await supabase
          .from('cashbook_types')
          .update(typeData)
          .eq('id', existing.id);
        error = updateError;
      } else {
        // 새로 삽입
        const { error: insertError } = await supabase
          .from('cashbook_types')
          .insert(typeData);
        error = insertError;
      }

      if (error) {
        failed++;
        errors.push(`출납유형 ${row['한글명']}: ${error.message}`);
      } else {
        success++;
      }
    } catch (err: any) {
      failed++;
      errors.push(`출납유형 ${row['한글명']}: ${err.message}`);
    }
  }

  return { success, failed, errors };
}

// 엑셀 템플릿 다운로드 API (통합 템플릿)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 기존 데이터 로드
    const [categoriesRes, cashbookTypesRes, productsRes] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('cashbook_types').select('*').order('display_order'),
      supabase.from('products').select('*').order('name_ko')
    ]);

    // 카테고리 시트 데이터
    const categoriesData = categoriesRes.data?.map(cat => ({
      '카테고리코드': cat.code,
      '한글명': cat.name_ko,
      '중문명': cat.name_zh,
      '순서': cat.display_order,
      '시스템': cat.is_system ? 'Y' : 'N',
      '활성': cat.active ? 'Y' : 'N'
    })) || [];

    // 출납유형 시트 데이터
    const cashbookData = cashbookTypesRes.data?.map(ct => ({
      '코드': ct.code,
      '한글명': ct.name_ko,
      '중문명': ct.name_zh,
      '유형': ct.type,
      '색상': ct.color,
      '순서': ct.display_order,
      '시스템': ct.is_system ? 'Y' : 'N',
      '활성': ct.active ? 'Y' : 'N'
    })) || [];

    // 상품 시트 데이터
    const productsData = productsRes.data?.map(prod => ({
      'SKU': prod.sku,
      '상품명(한글)': prod.name_ko || prod.name,
      '상품명(중문)': prod.name_zh || prod.name,
      '카테고리': prod.category,
      '모델': prod.model || '',
      '색상(한글)': prod.color_ko || prod.color || '',
      '색상(중문)': prod.color_zh || prod.color || '',
      '브랜드(한글)': prod.brand_ko || prod.brand || '',
      '브랜드(중문)': prod.brand_zh || prod.brand || '',
      '원가(CNY)': prod.cost_cny || 0,
      '판매가(KRW)': prod.price_krw || 0,
      '활성': prod.is_active ? 'Y' : 'N'
    })) || [];

    // 워크북 생성
    const wb = XLSX.utils.book_new();

    // 1. 카테고리 시트
    const wsCategories = XLSX.utils.json_to_sheet(categoriesData.length > 0 ? categoriesData : [
      { '카테고리코드': 'CLOTHING', '한글명': '의류', '중문명': '服装', '순서': 1, '시스템': 'N', '활성': 'Y' }
    ]);
    XLSX.utils.book_append_sheet(wb, wsCategories, '카테고리');

    // 2. 출납유형 시트
    const wsCashbook = XLSX.utils.json_to_sheet(cashbookData.length > 0 ? cashbookData : [
      { '코드': 'PURCHASE', '한글명': '상품구매', '중문명': '商品采购', '유형': 'expense', '색상': '#ef4444', '순서': 1, '시스템': 'N', '활성': 'Y' }
    ]);
    XLSX.utils.book_append_sheet(wb, wsCashbook, '출납유형');

    // 3. 상품 시트 (데이터 유효성 검사 추가)
    const wsProducts = XLSX.utils.json_to_sheet(productsData.length > 0 ? productsData : [
      { 'SKU': '', '상품명(한글)': '', '상품명(중문)': '', '카테고리': '', '모델': '', '색상(한글)': '', '색상(중문)': '', '브랜드(한글)': '', '브랜드(중문)': '', '원가(CNY)': 0, '판매가(KRW)': 0, '활성': 'Y' }
    ]);
    
    // 셀 너비 설정
    wsProducts['!cols'] = [
      { wch: 20 }, // SKU
      { wch: 20 }, // 상품명(한글)
      { wch: 20 }, // 상품명(중문)
      { wch: 15 }, // 카테고리
      { wch: 15 }, // 모델
      { wch: 15 }, // 색상(한글)
      { wch: 15 }, // 색상(중문)
      { wch: 15 }, // 브랜드(한글)
      { wch: 15 }, // 브랜드(중문)
      { wch: 12 }, // 원가
      { wch: 12 }, // 판매가
      { wch: 8 }   // 활성
    ];
    
    // 카테고리 드롭다운을 위한 데이터 유효성 검사 추가
    if (categoriesData.length > 0) {
      const categoryList = categoriesData.map(c => c['카테고리코드']);
      
      // 데이터 유효성 검사 배열 초기화
      if (!wsProducts['!dataValidation']) {
        wsProducts['!dataValidation'] = [];
      }
      
      // 카테고리 열(D열)에 대한 데이터 유효성 검사 추가
      // D2부터 D1000까지 적용 (헤더 제외)
      const lastRow = Math.max(productsData.length + 1, 100); // 최소 100행
      for (let i = 2; i <= lastRow; i++) {
        const cellRef = `D${i}`;
        wsProducts['!dataValidation'].push({
          type: 'list',
          allowBlank: true,
          sqref: cellRef,
          formula1: `"${categoryList.join(',')}"`
        });
      }
      
      // 활성 열(L열)에 대한 Y/N 드롭다운
      for (let i = 2; i <= lastRow; i++) {
        const cellRef = `L${i}`;
        wsProducts['!dataValidation'].push({
          type: 'list',
          allowBlank: false,
          sqref: cellRef,
          formula1: '"Y,N"'
        });
      }
    }
    
    XLSX.utils.book_append_sheet(wb, wsProducts, '상품');

    // 4. 사용 안내 시트
    const wsGuide = XLSX.utils.json_to_sheet([
      { '항목': '사용 안내', '설명': '이 엑셀 파일로 카테고리, 출납유형, 상품을 일괄 등록/수정할 수 있습니다.' },
      { '항목': '주의사항 1', '설명': '카테고리와 출납유형을 먼저 입력한 후 상품을 입력하세요.' },
      { '항목': '주의사항 2', '설명': '상품의 카테고리는 카테고리 시트의 카테고리코드와 일치해야 합니다.' },
      { '항목': '주의사항 3', '설명': '시스템 항목(시스템=Y)은 수정/삭제할 수 없습니다.' },
      { '항목': '주의사항 4', '설명': 'SKU를 비워두면 자동으로 생성됩니다.' },
      { '항목': '활성 값', '설명': 'Y = 활성, N = 비활성' },
      { '항목': '유형 값', '설명': 'income = 수입, expense = 지출, adjustment = 조정' }
    ]);
    XLSX.utils.book_append_sheet(wb, wsGuide, '사용안내');

    // 버퍼로 변환
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 파일 응답
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="yuandi_settings_template_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}