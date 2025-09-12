/**
 * 대량 주문 템플릿 다운로드 API
 */

import { NextResponse } from 'next/server';
import * as ExcelJS from 'exceljs';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 카테고리 정보 가져오기
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name_ko, name_zh')
      .order('id');
    
    // 카테고리 맵 생성
    const categoryMap = new Map(categories?.map(c => [c.id, c.name_ko || c.name_zh || `Category ${c.id}`]) || []);
    
    // 현재 상품 목록 가져오기
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('sku');
    
    if (productsError) {
      console.error('상품 로드 오류:', productsError);
      return NextResponse.json({ error: '상품 로드 실패' }, { status: 500 });
    }

    // ExcelJS 워크북 생성
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'YUANDI ERP';
    workbook.lastModifiedBy = 'YUANDI ERP';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 1. 상품 정보 시트 (참조용)
    const wsProducts = workbook.addWorksheet('상품정보');
    wsProducts.columns = [
      { header: 'SKU', key: 'sku', width: 20 },
      { header: '상품명', key: 'name', width: 30 },
      { header: '카테고리', key: 'category', width: 15 },
      { header: '모델', key: 'model', width: 15 },
      { header: '색상', key: 'color', width: 15 },
      { header: '브랜드', key: 'brand', width: 15 },
      { header: '판매가(KRW)', key: 'price', width: 15 },
      { header: '재고', key: 'stock', width: 10 }
    ];

    // 상품 데이터 추가
    if (products && products.length > 0) {
      products.forEach(product => {
        wsProducts.addRow({
          sku: product.sku,
          name: product.name_ko || product.name_zh || '',
          category: categoryMap.get(product.category_id) || '',
          model: product.model || '',
          color: product.color_ko || product.color_zh || '',
          brand: product.brand_ko || product.brand_zh || '',
          price: product.price_krw || 0,
          stock: product.on_hand || 0
        });
      });
    }

    // 헤더 스타일
    wsProducts.getRow(1).font = { bold: true };
    wsProducts.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 2. 주문 입력 시트
    const wsOrders = workbook.addWorksheet('주문입력');
    wsOrders.columns = [
      { header: '고객명*', key: 'customerName', width: 15 },
      { header: '전화번호*', key: 'customerPhone', width: 20 },
      { header: '이메일', key: 'customerEmail', width: 25 },
      { header: '카카오ID', key: 'kakaoId', width: 15 },
      { header: 'PCCC*', key: 'pccc', width: 15 },
      { header: '우편번호*', key: 'zipCode', width: 10 },
      { header: '주소*', key: 'address', width: 40 },
      { header: '상세주소', key: 'addressDetail', width: 30 },
      { header: '상품선택*', key: 'productName', width: 35 },
      { header: '수량*', key: 'quantity', width: 10 },
      { header: '판매가*', key: 'price', width: 15 },
      { header: '메모', key: 'memo', width: 30 }
    ];

    // 샘플 데이터 추가
    wsOrders.addRow({
      customerName: '홍길동',
      customerPhone: '010-1234-5678',
      customerEmail: 'hong@example.com',
      kakaoId: 'hong123',
      pccc: 'P12345678901',
      zipCode: '12345',
      address: '서울시 강남구 테헤란로',
      addressDetail: '123호',
      productName: products && products[0] ? 
        `${products[0].model || ''}:${products[0].name_ko || products[0].name_zh || ''}:${categoryMap.get(products[0].category_id) || ''}:${products[0].color_ko || products[0].color_zh || ''}:${products[0].brand_ko || products[0].brand_zh || ''}:재고${products[0].on_hand || 0}` 
        : '모델:상품명:카테고리:색상:브랜드:재고',
      quantity: 1,
      price: products && products[0] ? products[0].price_krw : 100000,
      memo: '빠른 배송 부탁드립니다'
    });

    // 빈 행 추가 (입력용)
    for (let i = 0; i < 50; i++) {
      wsOrders.addRow({});
    }

    // 헤더 스타일
    wsOrders.getRow(1).font = { bold: true };
    wsOrders.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 상품명 드롭다운 설정 - 참조 범위 사용
    if (products && products.length > 0) {
      // 4. 상품명 리스트 시트 (드롭다운용)
      const wsProductList = workbook.addWorksheet('상품리스트');
      wsProductList.columns = [
        { header: '상품선택용', key: 'productSelect', width: 70 }
      ];
      
      // 모델명으로 정렬
      const sortedProducts = [...products].sort((a, b) => {
        const modelA = a.model || '';
        const modelB = b.model || '';
        return modelA.localeCompare(modelB);
      });
      
      // 상품 리스트 추가 (모델:상품명:카테고리:색상:브랜드:재고 형식)
      sortedProducts.forEach(p => {
        const name = p.name_ko || p.name_zh || '';
        const brand = p.brand_ko || p.brand_zh || '';
        const model = p.model || '';
        const category = categoryMap.get(p.category_id) || '';
        const color = p.color_ko || p.color_zh || '';
        const stock = p.on_hand || 0;
        
        // 재고가 0인 경우 [품절] 표시 추가
        const stockStatus = stock === 0 ? '[품절] ' : '';
        
        wsProductList.addRow({
          productSelect: `${stockStatus}${model}:${name}:${category}:${color}:${brand}:재고${stock}`
        });
      });
      
      // 주문입력 시트의 드롭다운을 참조 범위로 설정
      const lastRow = products.length + 1;
      for (let i = 2; i <= 52; i++) {
        wsOrders.getCell(`I${i}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`상품리스트!$A$2:$A$${lastRow}`],
          showErrorMessage: true,
          errorTitle: '잘못된 선택',
          error: '상품리스트 시트의 목록에서 상품을 선택하세요'
        };
      }
      
      // 상품리스트 시트 숨기기 (선택사항)
      wsProductList.state = 'hidden';
    }

    // 수량 유효성 검사 (1 이상의 정수)
    for (let i = 2; i <= 52; i++) {
      wsOrders.getCell(`J${i}`).dataValidation = {
        type: 'whole',
        operator: 'greaterThan',
        formulae: [0],
        showErrorMessage: true,
        errorTitle: '잘못된 입력',
        error: '수량은 1 이상의 정수여야 합니다'
      };
    }

    // 3. 사용 안내 시트
    const wsGuide = workbook.addWorksheet('사용안내');
    wsGuide.columns = [
      { header: '항목', key: 'item', width: 25 },
      { header: '설명', key: 'description', width: 80 }
    ];

    const guideData = [
      { item: '사용 방법', description: '주문입력 시트에 주문 정보를 입력하고 업로드하세요.' },
      { item: '필수 입력 항목', description: '* 표시된 항목은 필수 입력입니다.' },
      { item: '상품 선택', description: '상품선택 컬럼의 드롭다운에서 원하는 상품을 선택하세요. 형식: 모델:상품명:카테고리:색상:브랜드:재고' },
      { item: '품절 상품', description: '[품절] 표시가 있는 상품은 재고가 0이므로 주문할 수 없습니다.' },
      { item: '상품 정보 확인', description: '상품정보 시트에서 SKU별 상품 정보를 확인할 수 있습니다.' },
      { item: 'PCCC 형식', description: 'P로 시작하는 12자리 (예: P12345678901)' },
      { item: '전화번호 형식', description: '010-1234-5678 또는 01012345678 형식' },
      { item: '가격 자동 설정', description: '판매가는 상품의 기본 가격이 자동으로 입력됩니다. 필요시 수정 가능합니다.' },
      { item: '재고 확인', description: '주문 전 상품정보 시트에서 재고를 확인하세요. 상품 선택 시 재고 수량이 표시됩니다.' }
    ];

    guideData.forEach(guide => wsGuide.addRow(guide));

    wsGuide.getRow(1).font = { bold: true };
    wsGuide.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 엑셀 파일 생성 (버퍼로 변환)
    const buffer = await workbook.xlsx.writeBuffer();

    // 파일 응답 (bulk-import-v2와 동일한 방식)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="bulk_order_template_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

  } catch (error) {
    console.error('템플릿 생성 오류:', error);
    return NextResponse.json({ error: '템플릿 생성 실패' }, { status: 500 });
  }
}