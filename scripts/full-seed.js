const { createClient } = require('@supabase/supabase-js')

async function fullSeed() {
  const supabaseUrl = 'https://eikwfesvmohfpokgeqtv.supabase.co'
  const supabaseKey = 'sb_secret_Iw0xUDRxQ9mKL8Rm7D4i9w_Yv57DBOr'
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Helper functions
  const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)]
  const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
  const randomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  }

  // Data templates
  const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임']
  const firstNames = ['민준', '서준', '도윤', '예준', '시우', '주원', '하준', '지호', '준우', '현우']
  const femaleNames = ['서연', '서윤', '지우', '서현', '하은', '하윤', '민서', '수아', '예은', '지민']
  
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
  
  const cities = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '경기도']
  const districts = ['강남구', '서초구', '송파구', '마포구', '영등포구', '성동구', '광진구']
  const roads = ['테헤란로', '강남대로', '올림픽로', '세종대로', '종로', '을지로']

  console.log('🌱 Starting full seed process...')

  try {
    // 1. Create Products
    console.log('Creating products...')
    const products = []
    for (let i = 1; i <= 120; i++) {
      const category = randomElement(categories)
      const productType = randomElement(productTypes[category])
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
        sale_price_krw: randomNumber(10000, 1000000),
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
      return
    }
    console.log(`✅ Created ${insertedProducts.length} products`)

    // 2. Create Orders
    console.log('Creating orders...')
    const orders = []
    const statuses = ['PAID', 'SHIPPED', 'DONE', 'REFUNDED']
    const couriers = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배']
    
    for (let i = 1; i <= 120; i++) {
      const isFemale = Math.random() > 0.5
      const lastName = randomElement(lastNames)
      const firstName = randomElement(isFemale ? femaleNames : firstNames)
      const orderDate = randomDate(new Date(2024, 0, 1), new Date())
      const status = randomElement(statuses)
      const totalAmount = randomNumber(10000, 500000)
      const phoneNumber = `010${randomNumber(10000000, 99999999)}`
      
      orders.push({
        order_no: `ORD-${orderDate.toISOString().slice(2, 10).replace(/-/g, '')}-${String(i).padStart(3, '0')}`,
        customer_name: `${lastName}${firstName}`,
        customer_phone: phoneNumber,
        customer_email: `customer${i}@example.com`,
        pccc_code: `P${randomNumber(100000000000, 999999999999)}`,
        shipping_address: `${randomElement(cities)} ${randomElement(districts)} ${randomElement(roads)} ${randomNumber(1, 999)}-${randomNumber(1, 99)}`,
        zip_code: String(randomNumber(10000, 99999)).padStart(5, '0'),
        status,
        total_amount: totalAmount,
        order_date: orderDate.toISOString(),
        customer_memo: Math.random() > 0.8 ? '빠른 배송 부탁드립니다' : null,
        internal_memo: Math.random() > 0.9 ? '단골 고객' : null,
        created_at: orderDate.toISOString()
      })
    }
    
    const { error: orderError } = await supabase
      .from('orders')
      .insert(orders)
    
    if (orderError) {
      console.error('Error seeding orders:', orderError)
      return
    }
    console.log(`✅ Created ${orders.length} orders`)

    // 3. Create Inventory transactions
    console.log('Creating inventory transactions...')
    const inventory = []
    
    // Initial stock for each product
    for (const product of insertedProducts) {
      inventory.push({
        product_id: product.id,
        transaction_type: 'inbound',
        quantity: product.on_hand,
        note: '초기 재고',
        created_at: product.created_at
      })
    }
    
    const { error: inventoryError } = await supabase
      .from('inventory_transactions')
      .insert(inventory)
    
    if (inventoryError) {
      console.error('Error seeding inventory:', inventoryError)
      // Continue anyway
    } else {
      console.log(`✅ Created ${inventory.length} inventory transactions`)
    }

    // 4. Create Cashbook entries
    console.log('Creating cashbook entries...')
    const cashbook = []
    let balance = 0
    
    for (let i = 0; i < 50; i++) {
      const amount = randomNumber(10000, 500000)
      const isIncome = Math.random() > 0.3
      balance += isIncome ? amount : -amount
      
      cashbook.push({
        transaction_date: randomDate(new Date(2024, 0, 1), new Date()).toISOString(),
        transaction_type: isIncome ? 'sale' : 'shipping',
        description: isIncome ? '상품 판매' : '배송비',
        amount: amount,
        balance: balance,
        created_at: randomDate(new Date(2024, 0, 1), new Date()).toISOString()
      })
    }
    
    const { error: cashbookError } = await supabase
      .from('cashbook')
      .insert(cashbook)
    
    if (cashbookError) {
      console.error('Error seeding cashbook:', cashbookError)
      // Continue anyway
    } else {
      console.log(`✅ Created ${cashbook.length} cashbook entries`)
    }

    console.log('✨ Seed process completed successfully!')
    console.log({
      products: products.length,
      orders: orders.length,
      inventory: inventory.length,
      cashbook: cashbook.length
    })
    
  } catch (error) {
    console.error('Seed error:', error)
  }
}

fullSeed().catch(console.error)