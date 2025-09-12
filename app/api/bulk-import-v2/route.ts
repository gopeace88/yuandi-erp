import { NextRequest, NextResponse } from 'next/server';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';

// 엑셀 템플릿 다운로드 API (ExcelJS로 드롭다운 지원)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 기존 데이터 로드
    const [categoriesRes, cashbookTypesRes, productsRes] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('cashbook_types').select('*').order('display_order'),
      supabase.from('products')
        .select(`
          *,
          categories (
            code,
            name_ko
          )
        `)
        .order('name_ko')
    ]);

    const categories = categoriesRes.data || [];
    const cashbookTypes = cashbookTypesRes.data || [];
    const products = productsRes.data || [];

    // ExcelJS 워크북 생성
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'YUANDI ERP';
    workbook.lastModifiedBy = 'YUANDI ERP';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 1. 카테고리 시트
    const wsCategories = workbook.addWorksheet('카테고리');
    wsCategories.columns = [
      { header: '카테고리코드', key: 'code', width: 15 },
      { header: '한글명', key: 'name_ko', width: 20 },
      { header: '중문명', key: 'name_zh', width: 20 },
      { header: '순서', key: 'display_order', width: 10 },
      { header: '시스템', key: 'is_system', width: 10 },
      { header: '활성', key: 'active', width: 10 }
    ];

    categories.forEach(cat => {
      wsCategories.addRow({
        code: cat.code,
        name_ko: cat.name_ko,
        name_zh: cat.name_zh,
        display_order: cat.display_order,
        is_system: cat.is_system ? 'Y' : 'N',
        active: cat.is_active ? 'Y' : 'N'
      });
    });

    // 헤더 스타일
    wsCategories.getRow(1).font = { bold: true };
    wsCategories.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 2. 출납유형 시트
    const wsCashbook = workbook.addWorksheet('출납유형');
    wsCashbook.columns = [
      { header: '코드', key: 'code', width: 15 },
      { header: '한글명', key: 'name_ko', width: 20 },
      { header: '중문명', key: 'name_zh', width: 20 },
      { header: '유형', key: 'type', width: 12 },
      { header: '색상', key: 'color', width: 10 },
      { header: '순서', key: 'display_order', width: 10 },
      { header: '시스템', key: 'is_system', width: 10 },
      { header: '활성', key: 'active', width: 10 }
    ];

    cashbookTypes.forEach(ct => {
      wsCashbook.addRow({
        code: ct.code,
        name_ko: ct.name_ko,
        name_zh: ct.name_zh,
        type: ct.type,
        color: ct.color,
        display_order: ct.display_order,
        is_system: ct.is_system ? 'Y' : 'N',
        active: ct.is_active ? 'Y' : 'N'
      });
    });

    wsCashbook.getRow(1).font = { bold: true };
    wsCashbook.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 3. 상품 시트 (드롭다운 포함)
    const wsProducts = workbook.addWorksheet('상품');
    wsProducts.columns = [
      { header: '상품명(한글)', key: 'name_ko', width: 25 },
      { header: '상품명(중문)', key: 'name_zh', width: 25 },
      { header: '카테고리', key: 'category', width: 15 },
      { header: '모델', key: 'model', width: 15 },
      { header: '색상(한글)', key: 'color_ko', width: 15 },
      { header: '색상(중문)', key: 'color_zh', width: 15 },
      { header: '브랜드(한글)', key: 'brand_ko', width: 15 },
      { header: '브랜드(중문)', key: 'brand_zh', width: 15 },
      { header: '원가(CNY)', key: 'cost_cny', width: 12 },
      { header: '판매가(KRW)', key: 'price_krw', width: 12 },
      { header: '활성', key: 'is_active', width: 10 }
    ];

    // 기존 상품 데이터 추가
    products.forEach(prod => {
      wsProducts.addRow({
        name_ko: prod.name_ko || '',
        name_zh: prod.name_zh || '',
        category: prod.categories?.code || '',  // 조인된 카테고리 코드 사용
        model: prod.model || '',
        color_ko: prod.color_ko || '',
        color_zh: prod.color_zh || '',
        brand_ko: prod.brand_ko || '',
        brand_zh: prod.brand_zh || '',
        cost_cny: prod.cost_cny || 0,
        price_krw: prod.price_krw || 0,
        is_active: prod.is_active ? 'Y' : 'N'
      });
    });

    // 빈 행 추가 (새 상품 입력용)
    for (let i = 0; i < 50; i++) {
      wsProducts.addRow({
        name_ko: '',
        name_zh: '',
        category: '',
        model: '',
        color_ko: '',
        color_zh: '',
        brand_ko: '',
        brand_zh: '',
        cost_cny: 0,
        price_krw: 0,
        is_active: 'Y'
      });
    }

    wsProducts.getRow(1).font = { bold: true };
    wsProducts.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 카테고리 드롭다운 추가 (C열이 카테고리)
    const categoryList = categories.map(c => c.code).filter(c => c);
    if (categoryList.length > 0) {
      // 데이터가 있는 행부터 100행까지 드롭다운 적용
      const lastRow = Math.max(products.length + 50, 100);
      for (let i = 2; i <= lastRow; i++) {
        wsProducts.getCell(`C${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${categoryList.join(',')}"`]
        };
      }
    }

    // 활성 Y/N 드롭다운
    const lastActiveRow = Math.max(products.length + 50, 100);
    for (let i = 2; i <= lastActiveRow; i++) {
      wsProducts.getCell(`L${i}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"Y,N"']
      };
    }

    // 출납유형의 유형 드롭다운
    for (let i = 2; i <= Math.max(cashbookTypes.length + 20, 50); i++) {
      const cell = wsCashbook.getCell(`D${i}`); // 유형 열 (D열)
      cell.dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"income,expense,adjustment"'],
        showErrorMessage: true,
        errorTitle: '잘못된 유형',
        error: 'income, expense, adjustment 중 선택해주세요.'
      };
    }

    // 4. 사용 안내 시트
    const wsGuide = workbook.addWorksheet('사용안내');
    wsGuide.columns = [
      { header: '항목', key: 'item', width: 20 },
      { header: '설명', key: 'description', width: 80 }
    ];

    wsGuide.addRow({ item: '사용 안내', description: '이 엑셀 파일로 카테고리, 출납유형, 상품을 일괄 등록/수정할 수 있습니다.' });
    wsGuide.addRow({ item: '주의사항 1', description: '카테고리와 출납유형을 먼저 입력한 후 상품을 입력하세요.' });
    wsGuide.addRow({ item: '주의사항 2', description: '상품의 카테고리는 카테고리 시트의 카테고리코드와 일치해야 합니다. (드롭다운 사용 권장)' });
    wsGuide.addRow({ item: '주의사항 3', description: '시스템 항목(시스템=Y)은 수정/삭제할 수 없습니다.' });
    wsGuide.addRow({ item: '주의사항 4', description: 'SKU는 자동으로 생성됩니다 (카테고리-모델-색상-브랜드-해시 형식).' });
    wsGuide.addRow({ item: '활성 값', description: 'Y = 활성, N = 비활성' });
    wsGuide.addRow({ item: '유형 값', description: 'income = 수입, expense = 지출, adjustment = 조정' });

    wsGuide.getRow(1).font = { bold: true };
    wsGuide.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 버퍼로 변환
    const buffer = await workbook.xlsx.writeBuffer();

    // 파일 응답
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="yuandi_settings_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}

// POST 엔드포인트는 기존과 동일하게 XLSX 사용
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
    
    // 엑셀 파일 파싱 (XLSX 사용)
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    console.log('엑셀 파일의 시트 이름들:', workbook.SheetNames);
    
    // 각 시트 처리
    const results = {
      categories: { success: 0, failed: 0, errors: [] as string[], skipped: 0 },
      cashbook_types: { success: 0, failed: 0, errors: [] as string[], skipped: 0 },
      products: { success: 0, failed: 0, errors: [] as string[], skipped: 0 },
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
      console.log('출납유형 시트 데이터 수:', data.length);
      if (data.length > 0) {
        results.cashbook_types = await importCashbookTypes(supabase, data);
        console.log('출납유형 처리 결과:', results.cashbook_types);
        results.total.success += results.cashbook_types.success;
        results.total.failed += results.cashbook_types.failed;
        results.total.errors.push(...results.cashbook_types.errors);
      }
    } else {
      console.log('출납유형 시트를 찾을 수 없습니다');
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
        categories: `카테고리: 성공 ${results.categories.success}건, 실패 ${results.categories.failed}건${results.categories.skipped ? `, 건너뜀 ${results.categories.skipped}건` : ''}`,
        cashbook_types: `출납유형: 성공 ${results.cashbook_types.success}건, 실패 ${results.cashbook_types.failed}건${results.cashbook_types.skipped ? `, 건너뜀 ${results.cashbook_types.skipped}건` : ''}`,
        products: `상품: 성공 ${results.products.success}건, 실패 ${results.products.failed}건${results.products.skipped ? `, 건너뜀 ${results.products.skipped}건` : ''}`
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

// Import functions (same as before)
async function importProducts(supabase: any, data: any[]) {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  let skipped = 0;

  // 먼저 모든 카테고리를 로드
  const { data: categories } = await supabase
    .from('categories')
    .select('id, code');
  
  const categoryMap = new Map(categories?.map((c: any) => [c.code, c.id]) || []);

  // 기존 상품들 로드 (중복 체크용)
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, name_ko, name_zh, model');

  for (const row of data) {
    try {
      const name_ko = row['상품명(한글)'] || '';
      const name_zh = row['상품명(중문)'] || '';
      const model = row['모델'] || '';
      
      // 상품명과 모델명이 같은 상품이 이미 존재하는지 체크
      const duplicate = existingProducts?.find((p: any) => 
        (p.name_ko === name_ko || p.name_zh === name_zh) && 
        p.model === model
      );
      
      if (duplicate) {
        console.log(`중복 상품 건너뛰기: ${name_ko || name_zh} - ${model}`);
        skipped++;
        continue;
      }
      
      // 카테고리 코드로 category_id 찾기
      const categoryCode = row['카테고리'] || '';
      const category_id = categoryMap.get(categoryCode) || null;
      
      if (!category_id && categoryCode) {
        errors.push(`카테고리 '${categoryCode}'를 찾을 수 없습니다: ${name_ko || name_zh}`);
        failed++;
        continue;
      }
      
      // SKU 자동 생성
      const color_ko = row['색상(한글)'] || '';
      const brand_ko = row['브랜드(한글)'] || '';
      
      // SKU 생성: CATEGORY-MODEL-COLOR-BRAND-HASH5
      const skuCategoryCode = categoryCode.substring(0, 3).toUpperCase() || 'XXX';
      const modelCode = model ? model.substring(0, 6).toUpperCase() : 'XXXX';
      const colorCode = color_ko ? color_ko.substring(0, 3).toUpperCase() : 'XXX';
      const brandCode = brand_ko ? brand_ko.substring(0, 2).toUpperCase() : 'XX';
      
      // 5자리 해시 생성 (고유성 보장)
      const dataString = `${name_ko}${model}${color_ko}${brand_ko}${Date.now()}`;
      const hash = Math.abs(dataString.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0)).toString(36).padStart(3, '0').substring(0, 3).toUpperCase();
      
      const sku = `${skuCategoryCode}-${modelCode}-${colorCode}-${brandCode}-${hash}`;

      // 기존 상품 확인 (SKU로)
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('sku', sku)
        .single();

      const productData = {
        sku: sku,
        name_ko: name_ko,
        name_zh: name_zh,
        category_id: category_id,
        model: row['모델'] || null,
        color_ko: row['색상(한글)'] || null,
        color_zh: row['색상(중문)'] || null,
        brand_ko: row['브랜드(한글)'] || null,
        brand_zh: row['브랜드(중문)'] || null,
        cost_cny: parseFloat(row['원가(CNY)']) || 0,
        price_krw: parseFloat(row['판매가(KRW)']) || 0,
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

  return { success, failed, errors, skipped };
}

async function importCategories(supabase: any, data: any[]) {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  let skipped = 0;

  console.log('importCategories - 전체 데이터 수:', data.length);
  console.log('importCategories - 첫 번째 행:', data[0]);

  // 기존 카테고리 목록 가져오기 (중복 체크용)
  const { data: existingCategories } = await supabase
    .from('categories')
    .select('id, code, name_ko, name_zh, is_system');

  for (const row of data) {
    try {
      // 빈 행 건너뛰기
      if (!row['카테고리코드'] && !row['한글명']) {
        continue;
      }
      
      // 시스템 카테고리는 건너뛰기
      if (row['시스템'] === 'Y') {
        skipped++;
        continue;
      }

      const code = row['카테고리코드'] || '';
      const name_ko = row['한글명'] || '';
      const name_zh = row['중문명'] || '';
      
      // 기존 카테고리 확인
      const existing = existingCategories?.find((c: any) => c.code === code);
      
      // 시스템 카테고리인 경우 건너뛰기
      if (existing?.is_system) {
        skipped++;
        continue;
      }
      
      // 이미 동일한 데이터가 있는 경우 건너뛰기 (중복 체크)
      if (existing && 
          existing.name_ko === name_ko && 
          existing.name_zh === name_zh) {
        skipped++;
        continue;
      }

      const categoryData = {
        code: code,
        name_ko: name_ko,
        name_zh: name_zh,
        display_order: parseInt(row['순서']) || 0,
        is_active: row['활성'] !== 'N' && row['활성'] !== false
      };

      let error;
      if (existing) {
        // 업데이트 (이름이 변경된 경우만)
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

  return { success, failed, errors, skipped };
}

async function importCashbookTypes(supabase: any, data: any[]) {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  let skipped = 0;

  console.log('importCashbookTypes - 전체 데이터 수:', data.length);
  console.log('importCashbookTypes - 첫 번째 행:', data[0]);

  // 기존 출납유형 목록 가져오기 (중복 체크용)
  const { data: existingTypes } = await supabase
    .from('cashbook_types')
    .select('id, code, name_ko, name_zh, is_system, type');
  
  for (const row of data) {
    try {
      // 빈 행 건너뛰기
      if (!row['코드'] && !row['한글명']) {
        console.log('빈 행 건너뛰기');
        continue;
      }
      
      // 시스템 항목은 건너뛰기
      if (row['시스템'] === 'Y') {
        console.log('시스템 항목 건너뛰기:', row['한글명']);
        skipped++;
        continue;
      }

      const code = row['코드'] || '';
      const name_ko = row['한글명'] || '';
      const name_zh = row['중문명'] || '';
      const type = row['유형'] || 'expense';
      
      if (!code) {
        console.log('코드가 없는 행 건너뛰기:', row);
        continue;
      }
      
      console.log('처리 중인 출납유형:', code, name_ko);
      
      // 기존 항목 확인
      const existing = existingTypes?.find((t: any) => t.code === code);

      // 시스템 항목은 건너뛰기
      if (existing?.is_system) {
        console.log('데이터베이스의 시스템 항목 건너뛰기:', code);
        skipped++;
        continue;
      }
      
      // 이미 동일한 데이터가 있는 경우 건너뛰기 (중복 체크)
      if (existing && 
          existing.name_ko === name_ko && 
          existing.name_zh === name_zh &&
          existing.type === type) {
        console.log('동일한 데이터 건너뛰기:', code);
        skipped++;
        continue;
      }

      const typeData = {
        code: code,
        name_ko: name_ko,
        name_zh: name_zh,
        type: type,
        color: row['색상'] || '#6b7280',
        display_order: parseInt(row['순서']) || 0,
        is_system: false,
        is_active: row['활성'] !== 'N' && row['활성'] !== false
      };

      let error;
      if (existing) {
        // 업데이트 (이름이나 유형이 변경된 경우만)
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
        errors.push(`출납유형 ${name_ko}: ${error.message}`);
      } else {
        success++;
      }
    } catch (err: any) {
      failed++;
      errors.push(`출납유형 ${row['한글명']}: ${err.message}`);
    }
  }

  return { success, failed, errors, skipped };
}