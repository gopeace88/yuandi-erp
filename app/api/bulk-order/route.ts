/**
 * 대량 주문 처리 API
 * ExcelJS를 사용하여 드롭다운 기능 포함
 */

import { NextRequest, NextResponse } from 'next/server';
import * as ExcelJS from 'exceljs';
import { createClient } from '@/lib/supabase/server';

// 주문번호 생성 함수
function generateOrderNumber(): string {
  const now = new Date();
  const timezone = 'Asia/Seoul';
  
  // 한국 시간으로 변환
  const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  const year = koreaTime.getFullYear().toString().slice(2);
  const month = (koreaTime.getMonth() + 1).toString().padStart(2, '0');
  const day = koreaTime.getDate().toString().padStart(2, '0');
  const datePart = year + month + day;
  
  // 순번은 실제로는 DB에서 당일 주문 수를 조회해야 함
  // 테스트를 위해 더 넓은 범위의 랜덤 사용
  const sequence = Math.floor(Math.random() * 9999) + 1;
  const sequencePart = sequence.toString().padStart(4, '0');
  
  return `${datePart}-${sequencePart}`;
}

// Note: GET method moved to /api/bulk-order/template/route.ts

// POST: 대량 주문 업로드 처리
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.getWorksheet('주문입력');
    if (!worksheet) {
      return NextResponse.json({ error: '주문입력 시트를 찾을 수 없습니다' }, { status: 400 });
    }

    const supabase = await createClient();
    const orders = [];
    const errors = [];
    
    // 카테고리 정보 가져오기
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name_ko, name_zh')
      .order('id');
    
    // 카테고리 맵 생성 (이름 -> ID, ID -> 이름)
    const categoryNameToId = new Map();
    const categoryIdToName = new Map();
    categories?.forEach(c => {
      const name = c.name_ko || c.name_zh || `Category ${c.id}`;
      categoryNameToId.set(name, c.id);
      categoryIdToName.set(c.id, name);
    });
    
    // 상품 정보 미리 로드
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);
    
    console.log('로드된 상품 수:', products?.length || 0);
    
    // SKU로 상품 맵 생성
    const productMapBySku = new Map(products?.map(p => [p.sku, p]) || []);
    
    // 상품 선택 형식으로 상품 맵 생성 (모델:상품명:카테고리:색상:브랜드:재고 형식)
    const productMapBySelection = new Map();
    products?.forEach(p => {
      const name = p.name_ko || p.name_zh || '';
      const brand = p.brand_ko || p.brand_zh || '';
      const model = p.model || '';
      const categoryName = categoryIdToName.get(p.category_id) || '';
      const color = p.color_ko || p.color_zh || '';
      const stock = p.on_hand || 0;
      
      // 카테고리 이름을 사용한 형식
      const displayNameWithCategoryName = `${model}:${name}:${categoryName}:${color}:${brand}:재고${stock}`;
      productMapBySelection.set(displayNameWithCategoryName, p);
      
      // 카테고리 ID를 사용한 형식 (호환성)
      const displayNameWithCategoryId = `${model}:${name}:${p.category_id || ''}:${color}:${brand}:재고${stock}`;
      productMapBySelection.set(displayNameWithCategoryId, p);
      
      // [품절] 표시가 있는 형식도 처리
      if (stock === 0) {
        const soldOutNameWithCategoryName = `[품절] ${displayNameWithCategoryName}`;
        productMapBySelection.set(soldOutNameWithCategoryName, p);
        
        const soldOutNameWithCategoryId = `[품절] ${displayNameWithCategoryId}`;
        productMapBySelection.set(soldOutNameWithCategoryId, p);
      }
      
      // 상품명만으로도 찾을 수 있도록 (호환성)
      productMapBySelection.set(name, p);
      
      // SKU로도 찾을 수 있도록
      productMapBySelection.set(p.sku, p);
      
      // 모델명 + 상품명 조합으로도 찾을 수 있도록
      if (model && name) {
        productMapBySelection.set(`${model} ${name}`, p);
      }
    });

    // 헤더 행 제외하고 데이터 읽기
    let processedRows = 0;
    let skippedOrders: Array<{row: number, reason: string}> = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 헤더 건너뛰기
      
      const customerName = row.getCell(1).value?.toString().trim();
      if (!customerName) return; // 빈 행 건너뛰기
      
      processedRows++;
      console.log(`처리 중 행 ${rowNumber}: 고객=${customerName}, 상품=${row.getCell(9).value}`);
      
      const order = {
        customerName,
        customerPhone: row.getCell(2).value?.toString().trim(),
        customerEmail: row.getCell(3).value?.toString().trim() || null,
        kakaoId: row.getCell(4).value?.toString().trim() || null,
        pccc: row.getCell(5).value?.toString().trim(),
        zipCode: row.getCell(6).value?.toString().trim(),
        address: row.getCell(7).value?.toString().trim(),
        addressDetail: row.getCell(8).value?.toString().trim() || null,
        productName: row.getCell(9).value?.toString().trim(),  // 상품선택
        quantity: parseInt(row.getCell(10).value?.toString() || '0'),
        price: parseFloat(row.getCell(11).value?.toString() || '0'),
        memo: row.getCell(12).value?.toString().trim() || null,
        rowNumber
      };

      // 상품 찾기
      const product = productMapBySelection.get(order.productName);
      
      // 품절 상품은 스킵 처리
      if (product && (order.productName.startsWith('[품절]') || (product.on_hand || 0) <= 0)) {
        console.log(`행 ${rowNumber} 품절 상품 스킵:`, order.productName);
        skippedOrders.push({
          row: rowNumber,
          reason: `품절 상품: ${order.productName}`
        });
        return;
      }

      // 유효성 검사 (품절 체크 제외)
      const validationErrors = [];
      
      if (!order.customerPhone) validationErrors.push('전화번호 누락');
      if (!order.pccc || !order.pccc.startsWith('P') || order.pccc.length !== 12) {
        validationErrors.push('PCCC 형식 오류');
      }
      if (!order.zipCode) validationErrors.push('우편번호 누락');
      if (!order.address) validationErrors.push('주소 누락');
      if (!order.productName) validationErrors.push('상품 미선택');
      
      if (!product) {
        validationErrors.push(`상품 "${order.productName}" 없음`);
      }
      
      if (order.quantity <= 0) validationErrors.push('수량 오류');
      if (order.price <= 0) validationErrors.push('가격 오류');

      if (validationErrors.length > 0) {
        console.log(`행 ${rowNumber} 유효성 검사 실패:`, validationErrors);
        errors.push({
          row: rowNumber,
          errors: validationErrors
        });
      } else {
        orders.push(order);
      }
    });
    
    console.log(`처리된 행 수: ${processedRows}, 유효한 주문: ${orders.length}, 스킵: ${skippedOrders.length}, 오류: ${errors.length}`);

    // 처리할 수 있는 데이터가 전혀 없는 경우만 에러
    if (orders.length === 0 && skippedOrders.length === 0 && errors.length === 0) {
      return NextResponse.json({
        error: '처리할 주문이 없습니다',
        message: '엑셀 파일에 데이터가 없거나 유효한 주문 데이터가 없습니다'
      }, { status: 400 });
    }
    
    // 유효성 검사 오류만 있는 경우
    if (orders.length === 0 && errors.length > 0 && skippedOrders.length === 0) {
      console.log('유효성 검사 오류 상세:', errors);
      return NextResponse.json({
        error: '유효성 검사 실패',
        details: errors,
        message: `모든 주문이 유효성 검사에 실패했습니다 (${errors.length}개)`
      }, { status: 400 });
    }

    // 주문 생성
    let successCount = 0;
    const failedOrders = [];

    for (const order of orders) {
      try {
        console.log(`주문 처리 중: 행 ${order.rowNumber}, 상품명: "${order.productName}"`);
        console.log(`productMapBySelection 크기: ${productMapBySelection.size}`);
        
        // 상품 선택으로 상품 찾기
        const product = productMapBySelection.get(order.productName);
        
        if (!product) {
          console.log(`상품을 찾을 수 없음: "${order.productName}"`);
          console.log(`사용 가능한 키들:`, Array.from(productMapBySelection.keys()).slice(0, 3));
          
          failedOrders.push({
            row: order.rowNumber,
            error: `상품 "${order.productName}"을(를) 찾을 수 없습니다`
          });
          continue;
        }
        
        console.log(`상품 찾음: ${product.sku}, ${product.name_ko || product.name}`);

        // 주문 생성
        const subtotal = order.price * order.quantity;
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: generateOrderNumber(),
            customer_name: order.customerName,
            customer_phone: order.customerPhone,
            customer_email: order.customerEmail,
            customer_messenger_id: order.kakaoId,
            pccc: order.pccc,
            shipping_postal_code: order.zipCode,
            shipping_address_line1: order.address,
            shipping_address_line2: order.addressDetail,
            status: 'paid',
            payment_method: 'card',
            subtotal_krw: subtotal,  // 필수 필드 추가
            total_krw: subtotal,
            customer_memo: order.memo
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // 주문 아이템 생성
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: newOrder.id,
            product_id: product.id,
            quantity: order.quantity,
            price_krw: order.price,
            total_price_krw: order.price * order.quantity
          });

        if (itemError) throw itemError;

        // 재고 할당
        await supabase.rpc('allocate_inventory', {
          p_product_id: product.id,
          p_quantity: order.quantity
        });

        // 출납장부 기록
        await supabase
          .from('cashbook_transactions')
          .insert({
            transaction_date: new Date().toISOString().split('T')[0],
            type: 'sale',
            amount: order.price * order.quantity,
            currency: 'KRW',
            fx_rate: 1,
            amount_krw: order.price * order.quantity,
            description: `주문 - ${order.customerName}`,
            reference_type: 'order',
            reference_id: newOrder.id,
            notes: `주문번호: ${newOrder.order_number}, SKU: ${product.sku}`
          });

        successCount++;
        console.log(`주문 생성 성공: 행 ${order.rowNumber}`);
      } catch (error) {
        console.error(`주문 생성 실패 (행 ${order.rowNumber}):`);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        let errorMessage = '알 수 없는 오류';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null) {
          errorMessage = JSON.stringify(error);
        }
        
        failedOrders.push({
          row: order.rowNumber,
          error: errorMessage
        });
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedOrders.length,
      failedDetails: failedOrders,
      skipped: skippedOrders.length,
      skippedDetails: skippedOrders
    });

  } catch (error) {
    console.error('대량 주문 처리 오류:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '처리 실패' 
    }, { status: 500 });
  }
}