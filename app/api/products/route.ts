/**
 * 상품 관리 API
 * 원가(CNY)와 판매가(KRW)의 자동 환산 지원
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ExchangeRateService } from '@/lib/services/exchange-rate.service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
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
      .eq('active', true)
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
      query = query.lt('on_hand', 5);
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
    const supabase = createClient();
    const body = await request.json();
    
    // 환율 서비스 초기화
    const exchangeService = new ExchangeRateService();
    const currentRate = await exchangeService.getCurrentRate();
    
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
    
    // 상품 데이터 준비
    const productData = {
      sku: body.sku,
      category: body.category,
      name: body.name,
      model: body.model,
      color: body.color,
      brand: body.brand,
      cost_cny: cost_cny,
      price_krw: price_krw,
      cost_krw: cost_krw,      // 자동 계산된 원가 원화 환산
      price_cny: price_cny,    // 자동 계산된 판매가 위안화 환산
      on_hand: body.on_hand || 0,
      low_stock_threshold: body.low_stock_threshold || 5,
      barcode: body.barcode,
      image_url: body.image_url,
      description: body.description,
      notes: body.notes,
      active: true,
      created_by: body.created_by
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
    const supabase = createClient();
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
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Soft delete (active = false)
    const { error } = await supabase
      .from('products')
      .update({ active: false })
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