/**
 * 상품 관리 API
 * 원가(CNY)와 판매가(KRW)의 자동 환산 지원
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ExchangeRateService } from '@/lib/services/exchange-rate.service';
import { getLowStockThresholdServer } from '@/lib/utils/system-settings';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 검색 파라미터
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const lowStock = searchParams.get('lowStock') === 'true';
    
    // 쿼리 구성
    let query = supabase
      .from('products')
      .select(`
        *,
        cost_krw,
        price_cny
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    // 필터 적용
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    if (search) {
      query = query.or(`
        name.ilike.%${search}%,
        sku.ilike.%${search}%,
        model.ilike.%${search}%,
        brand.ilike.%${search}%
      `);
    }
    
    if (lowStock) {
      // 데이터베이스에서 재고 부족 임계값 가져오기
      const threshold = await getLowStockThresholdServer();
      query = query.lt('on_hand', threshold);
    }
    
    const { data: products, error } = await query;
    
    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }
    
    // 현재 환율 정보 추가
    const exchangeService = new ExchangeRateService();
    const currentRate = await exchangeService.getCurrentRate();
    
    return NextResponse.json({
      products: products || [],
      exchangeRate: currentRate,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    console.log('📝 받은 데이터:', JSON.stringify(body, null, 2));
    
    // 환율 서비스 초기화
    const exchangeService = new ExchangeRateService();
    const currentRate = await exchangeService.getCurrentRate();
    
    // category_id 처리 (카테고리 이름으로 받았을 경우 ID로 변환)
    let category_id = body.category_id;
    console.log('🔍 초기 category_id:', category_id, ', body.category:', body.category);
    
    if (!category_id && body.category) {
      // 카테고리 이름으로 ID 조회
      console.log('🔎 카테고리 이름으로 ID 조회:', body.category);
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', body.category)
        .single();
      
      console.log('📊 카테고리 조회 결과:', categoryData, 'error:', categoryError);
      
      if (categoryData) {
        category_id = categoryData.id;
        console.log('✅ 카테고리 ID 찾음:', category_id);
      } else {
        console.log('❌ 카테고리 ID를 찾을 수 없음');
      }
    }
    
    // SKU 생성 (아직 없는 경우)
    if (!body.sku) {
      const skuParts = [
        body.category || 'MISC',
        body.model || 'NOMODEL',
        body.color || 'NOCOLOR',
        body.brand || 'NOBRAND',
        Math.random().toString(36).substring(2, 7).toUpperCase()
      ];
      body.sku = skuParts.join('-');
    }
    
    // 원가(CNY)와 판매가(KRW) 확인
    const cost_cny = parseFloat(body.cost_cny) || 0;
    const price_krw = parseFloat(body.price_krw) || 0;
    
    // 자동 환산 계산
    const cost_krw = cost_cny * currentRate;  // CNY -> KRW
    const price_cny = price_krw / currentRate; // KRW -> CNY
    
    // 초기 재고 값 가져오기
    const initialStock = parseInt(body.on_hand) || 0;
    
    // 상품 데이터 준비 (on_hand 포함 - 초기 재고 설정)
    const productData = {
      sku: body.sku,
      category_id: category_id,
      name: body.name,
      model: body.model,
      color: body.color,
      brand: body.brand,
      manufacturer: body.manufacturer,
      cost_cny: cost_cny,
      price_krw: price_krw,
      cost_krw: cost_krw,      // 자동 계산된 원가 원화 환산
      price_cny: price_cny,    // 자동 계산된 판매가 위안화 환산
      exchange_rate: currentRate,
      on_hand: initialStock,   // 초기 재고 설정
      low_stock_threshold: body.low_stock_threshold || await getLowStockThresholdServer(),
      image_url: body.image_url || body.imageUrl || null,
      description: body.description,
      notes: body.notes,
      is_active: true
    };
    
    const { data: product, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json(
        { error: 'Failed to create product', details: error.message },
        { status: 500 }
      );
    }
    
    // 초기 재고가 있으면 inventory 테이블에 저장
    if (initialStock > 0 && product) {
      console.log('📦 초기 재고 생성 시도:', {
        product_id: product.id,
        initialStock: initialStock
      });
      
      // 1. inventory 테이블에 재고 저장 (upsert 사용)
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .upsert({
          product_id: product.id,
          on_hand: initialStock,
          allocated: 0
          // available은 generated column이므로 자동 계산됨
        })
        .select()
        .single();
      
      if (inventoryError) {
        console.error('❌ Error creating inventory:', inventoryError);
        // 재고 생성 실패해도 상품은 이미 생성됨
      } else {
        console.log('✅ 재고 생성 성공:', inventoryData);
      }
      
      // 2. 출납장부에 초기 재고 비용 기록
      // 금액이 너무 크면 오버플로우 발생 - 최대값 체크
      const MAX_AMOUNT = 99999999.99; // numeric(10,2) 최대값
      const totalCost = Math.min(cost_krw * initialStock, MAX_AMOUNT);
      const totalCostCny = Math.min(cost_cny * initialStock, MAX_AMOUNT);
      
      console.log('💰 출납장부 기록 시도:', {
        amount: totalCost,
        quantity: initialStock,
        unit_cost: cost_krw
      });
      
      // cashbook_transactions 테이블 구조에 맞게 수정
      // created_by와 balance_krw 필드 추가 필요
      const { data: { user } } = await supabase.auth.getUser();
      
      // 사용자 이름 가져오기
      let userName = 'System';
      if (user?.id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        userName = profile?.name || user.email?.split('@')[0] || 'User';
      }
      
      // 현재 잔액 조회 (가장 최근 기록)
      const { data: lastTransaction } = await supabase
        .from('cashbook_transactions')
        .select('balance_krw')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const currentBalance = lastTransaction?.balance_krw || 0;
      const newBalance = currentBalance - totalCost; // 지출이므로 차감
      
      const cashbookData = {
        transaction_date: new Date().toISOString().split('T')[0],
        type: 'inbound' as const,
        amount: -totalCostCny,  // 기본 amount는 CNY (지출이므로 음수)
        amount_krw: -totalCost,  // 원화 환산 금액 (지출이므로 음수)
        amount_cny: totalCostCny,  // 위안화 금액 (양수로 기록)
        currency: 'CNY' as const,
        exchange_rate: currentRate,
        balance_krw: newBalance,  // 계산된 잔액 (필수 필드)
        reference_type: 'product_initial_stock',
        reference_id: product.id,
        description: `${product.name} 초기 재고 입고 (${initialStock}개 × ¥${cost_cny.toFixed(2)})`,
        category: 'purchase',
        tags: ['initial_stock', 'product_registration', product.sku],
        created_by: userName  // 사용자 이름 사용
      };
      
      const { data: cashbookEntry, error: cashbookError } = await supabase
        .from('cashbook_transactions')
        .insert(cashbookData)
        .select()
        .single();
      
      if (cashbookError) {
        console.error('❌ Error creating cashbook entry:', cashbookError);
        // 출납장부 기록 실패는 경고만 하고 진행
      } else {
        console.log('✅ 출납장부 기록 성공:', cashbookEntry);
      }
      
      // 3. inventory_movements 테이블에도 기록
      const movementData = {
        product_id: product.id,
        movement_type: 'inbound',
        quantity: initialStock,
        balance_before: 0,
        balance_after: initialStock,
        note: '상품 등록 시 초기 재고',
        unit_cost: cost_cny,
        total_cost: totalCostCny,
        created_by: userName  // 사용자 이름 사용
      };
      
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert(movementData);
      
      if (movementError) {
        console.error('⚠️ Error creating inventory transaction:', movementError);
        // 재고 이동 내역 실패는 무시
      } else {
        console.log('✅ 재고 이동 내역 기록 성공');
      }
    } else {
      console.log('⚠️ 초기 재고 없음 또는 상품 생성 실패:', {
        initialStock,
        productId: product?.id
      });
    }
    
    // 응답에 환율 정보 포함
    return NextResponse.json({
      product,
      exchangeRate: currentRate,
      calculations: {
        cost_krw: cost_krw.toFixed(0),
        price_cny: price_cny.toFixed(2)
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // 환율 서비스 초기화
    const exchangeService = new ExchangeRateService();
    const currentRate = await exchangeService.getCurrentRate();
    
    // 원가나 판매가가 변경된 경우 재계산
    if (updateData.cost_cny !== undefined || updateData.price_krw !== undefined) {
      if (updateData.cost_cny !== undefined) {
        updateData.cost_krw = updateData.cost_cny * currentRate;
      }
      if (updateData.price_krw !== undefined) {
        updateData.price_cny = updateData.price_krw / currentRate;
      }
      // 환율 정보도 업데이트
      updateData.exchange_rate = currentRate;
    }
    
    const { data: product, error } = await supabase
      .from('products')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json(
        { error: 'Failed to update product', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      product,
      exchangeRate: currentRate
    });
    
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Soft delete (is_active = false)
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json(
        { error: 'Failed to delete product', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}