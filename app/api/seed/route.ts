import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // 개발 환경에서만 실행 허용
    if (process.env.NODE_ENV === 'production' && !request.headers.get('x-seed-key')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                       process.env.SUPABASE_API_KEY || 
                       process.env.NEXT_PUBLIC_SUPABASE_API_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 랜덤 데이터 생성 헬퍼 함수들
    const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
    const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
    const randomDate = (start: Date, end: Date) => {
      return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
    }

    // 한국 이름 데이터
    const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임']
    const firstNames = ['민준', '서준', '도윤', '예준', '시우', '주원', '하준', '지호', '준우', '현우']
    const femaleNames = ['서연', '서윤', '지우', '서현', '하은', '하윤', '민서', '수아', '예은', '지민']

    // 상품 데이터
    const categories = ['electronics', 'fashion', 'home', 'beauty', 'sports', 'food', 'other']
    const brands = ['삼성', 'LG', '애플', '나이키', '아디다스', '샤넬', '디올', '구찌', '프라다', '자라']
    const productAdjectives = ['프리미엄', '신상', '인기', '한정판', '베스트']
    const productTypes = {
      electronics: ['스마트폰', '노트북', '태블릿', '이어폰', '스마트워치'],
      fashion: ['티셔츠', '청바지', '원피스', '자켓', '신발'],
      home: ['침구세트', '쿠션', '커튼', '조명', '화분'],
      beauty: ['스킨케어세트', '향수', '립스틱', '파운데이션', '마스크팩'],
      sports: ['운동화', '요가매트', '덤벨', '자전거', '텐트'],
      food: ['과자', '초콜릿', '커피', '차', '건강식품'],
      other: ['문구류', '완구', '애완용품', '캠핑용품', '원예용품']
    }
    const colors = ['블랙', '화이트', '그레이', '네이비', '베이지', '브라운', '레드', '블루']

    // 주소 데이터
    const cities = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '경기도']
    const districts = ['강남구', '서초구', '송파구', '마포구', '영등포구', '성동구', '광진구']
    const roads = ['테헤란로', '강남대로', '올림픽로', '세종대로', '종로', '을지로']

    console.log('🌱 Starting seed process...')

    // 1. 상품 생성
    console.log('Creating products...')
    const products = []
    for (let i = 1; i <= 120; i++) {
      const category = randomElement(categories)
      const productType = randomElement(productTypes[category as keyof typeof productTypes])
      const brand = randomElement(brands)
      const adjective = randomElement(productAdjectives)
      const color = randomElement(colors)
      
      products.push({
        sku: `${category.toUpperCase().substring(0, 3)}-${String(i).padStart(4, '0')}`,
        name: `${adjective} ${brand} ${productType}`,
        category,
        brand,
        model: `${brand.substring(0, 2).toUpperCase()}${randomNumber(1000, 9999)}`,
        color,
        cost_cny: randomNumber(50, 5000),
        price_krw: randomNumber(10000, 1000000),
        on_hand: randomNumber(0, 100),
        low_stock_threshold: 10,
        barcode: `880${randomNumber(1000000000, 9999999999)}`,
        active: Math.random() > 0.1,
        created_at: randomDate(new Date(2024, 0, 1), new Date()).toISOString()
      })
    }
    
    const { data: insertedProducts, error: productError } = await supabase
      .from('products')
      .insert(products)
      .select()
    
    if (productError) {
      console.error('Error seeding products:', productError)
      return NextResponse.json({ error: 'Failed to seed products', details: productError }, { status: 500 })
    }

    // 2. 고객 생성
    console.log('Creating customers...')
    const customers = []
    for (let i = 1; i <= 150; i++) {
      const isFemale = Math.random() > 0.5
      const lastName = randomElement(lastNames)
      const firstName = randomElement(isFemale ? femaleNames : firstNames)
      
      customers.push({
        name: `${lastName}${firstName}`,
        phone: `010-${randomNumber(1000, 9999)}-${randomNumber(1000, 9999)}`,
        email: `customer${i}@example.com`,
        address: `${randomElement(cities)} ${randomElement(districts)} ${randomElement(roads)} ${randomNumber(1, 999)}-${randomNumber(1, 99)}`,
        postal_code: String(randomNumber(10000, 99999)),
        pccc: `P${randomNumber(100000000000, 999999999999)}`,
        memo: Math.random() > 0.7 ? '단골 고객' : null,
        created_at: randomDate(new Date(2023, 0, 1), new Date()).toISOString()
      })
    }
    
    const { data: insertedcustomers, error: customerError } = await supabase
      .from('customers')
      .insert(customers)
      .select()
    
    if (customerError) {
      console.error('Error seeding customers:', customerError)
      return NextResponse.json({ error: 'Failed to seed customers', details: customerError }, { status: 500 })
    }

    // 3. 주문 생성
    console.log('Creating orders...')
    const orders = []
    const statuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded']
    const couriers = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배']
    
    for (let i = 1; i <= 120; i++) {
      const customer = randomElement(insertedcustomers)
      const orderDate = randomDate(new Date(2024, 0, 1), new Date())
      const status = randomElement(statuses)
      const itemCount = randomNumber(1, 5)
      const totalAmount = randomNumber(10000, 500000)
      
      orders.push({
        order_number: `ORD-${orderDate.toISOString().slice(2, 10).replace(/-/g, '')}-${String(i).padStart(3, '0')}`,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        shipping_address: customer.address,
        shipping_postal_code: customer.postal_code,
        pccc: customer.pccc,
        status,
        total_amount: totalAmount,
        order_date: orderDate.toISOString(),
        payment_date: status !== 'pending' ? randomDate(orderDate, new Date(orderDate.getTime() + 86400000)).toISOString() : null,
        shipping_date: ['shipped', 'delivered'].includes(status) ? randomDate(orderDate, new Date()).toISOString() : null,
        delivery_date: status === 'delivered' ? randomDate(orderDate, new Date()).toISOString() : null,
        tracking_number: ['shipped', 'delivered'].includes(status) ? `${randomNumber(100000000000, 999999999999)}` : null,
        courier: ['shipped', 'delivered'].includes(status) ? randomElement(couriers) : null,
        shipping_fee: randomNumber(2500, 5000),
        discount_amount: Math.random() > 0.7 ? randomNumber(1000, 10000) : 0,
        refund_amount: status === 'refunded' ? totalAmount : 0,
        notes: Math.random() > 0.8 ? '빠른 배송 부탁드립니다' : null,
        created_at: orderDate.toISOString()
      })
    }
    
    const { error: orderError } = await supabase
      .from('orders')
      .insert(orders)
    
    if (orderError) {
      console.error('Error seeding orders:', orderError)
      return NextResponse.json({ error: 'Failed to seed orders', details: orderError }, { status: 500 })
    }

    console.log('✨ Seed process completed successfully!')
    
    return NextResponse.json({
      success: true,
      message: 'Data seeded successfully',
      stats: {
        products: products.length,
        customers: customers.length,
        orders: orders.length
      }
    })
    
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ 
      error: 'Seed process failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}