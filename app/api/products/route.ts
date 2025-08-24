export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'

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

    // SKU 자동 생성 (중복 체크 포함)
    const { data: skuData } = await supabase.rpc('generate_sku', {
      p_category: body.category,
      p_model: body.model || null,
      p_color: body.color || null,
      p_brand: body.brand || null
    })

    const productData = {
      ...body,
      sku: skuData,
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