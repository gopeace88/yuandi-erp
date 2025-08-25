export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { SKUGenerator } from '@/lib/core/utils/SKUGenerator'

// GET: 상품 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin과 OrderManager만 접근 가능
    if (session.user.role !== 'Admin' && session.user.role !== 'OrderManager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const active = searchParams.get('active')
    const lowStock = searchParams.get('lowStock') === 'true'

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })

    // 필터 적용
    if (category) {
      query = query.eq('category', category)
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,model.ilike.%${search}%,brand.ilike.%${search}%`)
    }
    
    if (active !== null) {
      query = query.eq('active', active === 'true')
    }

    if (lowStock) {
      query = query.lte('on_hand', supabase.raw('low_stock_threshold'))
    }

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    return NextResponse.json({
      products: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST: 새 상품 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin과 OrderManager만 접근 가능
    if (session.user.role !== 'Admin' && session.user.role !== 'OrderManager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    // SKU 자동 생성
    let sku = body.sku
    if (!sku) {
      // SKU가 제공되지 않으면 자동 생성
      let attempts = 0
      let isUnique = false
      
      while (!isUnique && attempts < 10) {
        sku = SKUGenerator.generate({
          category: body.category,
          model: body.model || '',
          color: body.color || '',
          brand: body.brand || ''
        })
        
        // 중복 체크
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('sku', sku)
          .single()
        
        if (!existing) {
          isUnique = true
        }
        attempts++
      }
      
      if (!isUnique) {
        return NextResponse.json(
          { error: 'Failed to generate unique SKU' },
          { status: 500 }
        )
      }
    }

    const productData = {
      ...body,
      sku: sku,  // 수정: skuData가 아니라 sku 변수 사용
      created_by: session.user.id,
      updated_by: session.user.id
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Product creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}