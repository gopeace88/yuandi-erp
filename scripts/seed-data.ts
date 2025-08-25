import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// 랜덤 데이터 생성 헬퍼 함수들
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// 한국 이름 데이터
const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권']
const firstNames = ['민준', '서준', '도윤', '예준', '시우', '주원', '하준', '지호', '지후', '준우', '준서', '도현', '건우', '현우', '우진', '선우', '서진', '민재', '현준', '연우']
const femaleNames = ['서연', '서윤', '지우', '서현', '하은', '하윤', '민서', '수아', '지유', '윤서', '채원', '수빈', '다은', '예은', '은서', '수연', '지민', '소율', '예린', '지안']

// 상품 데이터
const categories = ['electronics', 'fashion', 'home', 'beauty', 'sports', 'food', 'other']
const brands = ['삼성', 'LG', '애플', '나이키', '아디다스', '샤넬', '디올', '구찌', '프라다', '자라', '유니클로', '이케아', '다이슨', '필립스', '소니']
const productAdjectives = ['프리미엄', '신상', '인기', '한정판', '베스트', '특가', '고급', '실속', '트렌디', '클래식']
const productTypes = {
  electronics: ['스마트폰', '노트북', '태블릿', '이어폰', '스마트워치', '카메라', '게임기', '모니터', '키보드', '마우스'],
  fashion: ['티셔츠', '청바지', '원피스', '자켓', '코트', '신발', '가방', '지갑', '벨트', '모자'],
  home: ['침구세트', '쿠션', '커튼', '러그', '조명', '화분', '액자', '시계', '가습기', '공기청정기'],
  beauty: ['스킨케어세트', '향수', '립스틱', '파운데이션', '마스크팩', '선크림', '클렌징', '토너', '로션', '크림'],
  sports: ['운동화', '요가매트', '덤벨', '런닝머신', '자전거', '골프클럽', '축구공', '농구공', '배드민턴', '텐트'],
  food: ['과자', '초콜릿', '커피', '차', '건강식품', '비타민', '과일', '견과류', '시리얼', '라면'],
  other: ['문구류', '완구', '애완용품', '자동차용품', '캠핑용품', '원예용품', '공구', '수납용품', '청소용품', '생활용품']
}

const colors = ['블랙', '화이트', '그레이', '네이비', '베이지', '브라운', '레드', '블루', '그린', '옐로우', '핑크', '퍼플', '오렌지', '민트', '카키']
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free']

// 주소 데이터
const cities = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '경기도', '강원도', '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주특별자치도']
const districts = ['강남구', '서초구', '송파구', '마포구', '영등포구', '성동구', '광진구', '동작구', '금천구', '구로구', '강서구', '양천구', '관악구', '서대문구', '은평구', '노원구', '도봉구', '강북구', '성북구', '중랑구', '동대문구', '종로구', '중구', '용산구', '강동구']
const roads = ['테헤란로', '강남대로', '올림픽로', '세종대로', '종로', '을지로', '퇴계로', '한강대로', '동작대로', '강변북로', '남부순환로', '북부간선도로', '서부간선도로', '동부간선도로', '내부순환로']

async function seedProducts() {
  console.log('🌱 Seeding products...')
  const products = []
  
  for (let i = 1; i <= 120; i++) {
    const category = randomElement(categories)
    const productType = randomElement(productTypes[category as keyof typeof productTypes])
    const brand = randomElement(brands)
    const adjective = randomElement(productAdjectives)
    const color = randomElement(colors)
    
    const product = {
      sku: `${category.toUpperCase().substring(0, 3)}-${String(i).padStart(4, '0')}`,
      name: `${adjective} ${brand} ${productType}`,
      category,
      brand,
      model: `${brand.substring(0, 2).toUpperCase()}${randomNumber(1000, 9999)}`,
      color,
      size: category === 'fashion' ? randomElement(sizes) : null,
      cost_cny: randomNumber(50, 5000),
      price_krw: randomNumber(10000, 1000000),
      on_hand: randomNumber(0, 100),
      low_stock_threshold: 10,
      barcode: `880${randomNumber(1000000000, 9999999999)}`,
      active: Math.random() > 0.1,
      created_at: randomDate(new Date(2024, 0, 1), new Date()).toISOString()
    }
    
    products.push(product)
  }
  
  const { error } = await supabase.from('products').insert(products)
  if (error) {
    console.error('❌ Error seeding products:', error)
  } else {
    console.log('✅ Products seeded successfully')
  }
  
  return products
}

async function seedCustomers() {
  console.log('🌱 Seeding customers...')
  const customers = []
  
  for (let i = 1; i <= 150; i++) {
    const isFemale = Math.random() > 0.5
    const lastName = randomElement(lastNames)
    const firstName = randomElement(isFemale ? femaleNames : firstNames)
    
    const customer = {
      name: `${lastName}${firstName}`,
      phone: `010-${randomNumber(1000, 9999)}-${randomNumber(1000, 9999)}`,
      email: `customer${i}@example.com`,
      address: `${randomElement(cities)} ${randomElement(districts)} ${randomElement(roads)} ${randomNumber(1, 999)}-${randomNumber(1, 99)}`,
      postal_code: String(randomNumber(10000, 99999)),
      pccc: `P${randomNumber(100000000000, 999999999999)}`,
      memo: Math.random() > 0.7 ? '단골 고객' : null,
      created_at: randomDate(new Date(2023, 0, 1), new Date()).toISOString()
    }
    
    customers.push(customer)
  }
  
  const { error } = await supabase.from('customers').insert(customers)
  if (error) {
    console.error('❌ Error seeding customers:', error)
  } else {
    console.log('✅ Customers seeded successfully')
  }
  
  return customers
}

async function seedOrders(products: any[], customers: any[]) {
  console.log('🌱 Seeding orders...')
  const orders = []
  const orderItems = []
  
  const statuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded']
  const couriers = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배', 'EMS', 'DHL', 'FedEx']
  
  for (let i = 1; i <= 120; i++) {
    const customer = randomElement(customers)
    const orderDate = randomDate(new Date(2024, 0, 1), new Date())
    const status = randomElement(statuses)
    
    const order = {
      order_number: `ORD-${orderDate.toISOString().slice(2, 10).replace(/-/g, '')}-${String(i).padStart(3, '0')}`,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      shipping_address: customer.address,
      shipping_postal_code: customer.postal_code,
      pccc: customer.pccc,
      status,
      order_date: orderDate.toISOString(),
      payment_date: status !== 'pending' ? randomDate(orderDate, new Date(orderDate.getTime() + 86400000)).toISOString() : null,
      shipping_date: ['shipped', 'delivered'].includes(status) ? randomDate(orderDate, new Date()).toISOString() : null,
      delivery_date: status === 'delivered' ? randomDate(orderDate, new Date()).toISOString() : null,
      tracking_number: ['shipped', 'delivered'].includes(status) ? `${randomNumber(100000000000, 999999999999)}` : null,
      courier: ['shipped', 'delivered'].includes(status) ? randomElement(couriers) : null,
      shipping_fee: randomNumber(2500, 5000),
      discount_amount: Math.random() > 0.7 ? randomNumber(1000, 10000) : 0,
      refund_amount: status === 'refunded' ? randomNumber(10000, 100000) : 0,
      notes: Math.random() > 0.8 ? '빠른 배송 부탁드립니다' : null,
      created_at: orderDate.toISOString()
    }
    
    orders.push(order)
    
    // 주문 아이템 생성 (1-5개)
    const itemCount = randomNumber(1, 5)
    const selectedProducts = []
    for (let j = 0; j < itemCount; j++) {
      const product = randomElement(products.filter(p => !selectedProducts.includes(p)))
      selectedProducts.push(product)
      
      orderItems.push({
        order_id: order.id,
        product_id: product.id,
        sku: product.sku,
        product_name: product.name,
        quantity: randomNumber(1, 3),
        unit_price: product.price_krw,
        discount_rate: Math.random() > 0.8 ? randomNumber(5, 30) : 0,
        notes: null
      })
    }
  }
  
  const { error: orderError } = await supabase.from('orders').insert(orders)
  if (orderError) {
    console.error('❌ Error seeding orders:', orderError)
  } else {
    console.log('✅ Orders seeded successfully')
  }
  
  const { error: itemError } = await supabase.from('order_items').insert(orderItems)
  if (itemError) {
    console.error('❌ Error seeding order items:', itemError)
  } else {
    console.log('✅ Order items seeded successfully')
  }
  
  return orders
}

async function seedInventoryTransactions(products: any[]) {
  console.log('🌱 Seeding inventory transactions...')
  const transactions = []
  
  const types = ['inbound', 'outbound', 'adjustment', 'return']
  const reasons = {
    inbound: ['구매입고', '반품입고', '생산입고', '이관입고'],
    outbound: ['판매출고', '반품출고', '폐기출고', '이관출고'],
    adjustment: ['재고조정', '실사조정', '오류수정'],
    return: ['고객반품', '불량반품', '오배송반품']
  }
  
  for (let i = 1; i <= 200; i++) {
    const product = randomElement(products)
    const type = randomElement(types)
    const transactionDate = randomDate(new Date(2024, 0, 1), new Date())
    
    const transaction = {
      product_id: product.id,
      sku: product.sku,
      type,
      quantity: type === 'outbound' ? -randomNumber(1, 10) : randomNumber(1, 50),
      unit_cost: product.cost_cny,
      reference_type: type === 'outbound' ? 'order' : type === 'inbound' ? 'purchase' : null,
      reference_id: type === 'outbound' ? `ORD-${randomNumber(1000, 9999)}` : null,
      reason: randomElement(reasons[type as keyof typeof reasons]),
      notes: Math.random() > 0.7 ? '특이사항 없음' : null,
      created_by: 'Admin',
      created_at: transactionDate.toISOString()
    }
    
    transactions.push(transaction)
  }
  
  const { error } = await supabase.from('inventory_transactions').insert(transactions)
  if (error) {
    console.error('❌ Error seeding inventory transactions:', error)
  } else {
    console.log('✅ Inventory transactions seeded successfully')
  }
}

async function seedCashbook(orders: any[]) {
  console.log('🌱 Seeding cashbook entries...')
  const entries = []
  
  const categories = ['sales', 'purchase', 'shipping', 'refund', 'expense', 'other']
  const paymentMethods = ['bank_transfer', 'card', 'cash', 'paypal', 'alipay', 'wechat']
  
  for (let i = 1; i <= 150; i++) {
    const entryDate = randomDate(new Date(2024, 0, 1), new Date())
    const category = randomElement(categories)
    const isIncome = ['sales', 'shipping'].includes(category)
    
    const entry = {
      date: entryDate.toISOString().split('T')[0],
      type: isIncome ? 'income' : 'expense',
      category,
      description: category === 'sales' ? `주문 판매 수익` : 
                   category === 'purchase' ? `상품 구매` : 
                   category === 'shipping' ? `배송비 수익` :
                   category === 'refund' ? `환불 처리` :
                   category === 'expense' ? `운영비용` : `기타`,
      amount: isIncome ? randomNumber(10000, 500000) : -randomNumber(5000, 300000),
      payment_method: randomElement(paymentMethods),
      reference_type: category === 'sales' ? 'order' : null,
      reference_id: category === 'sales' && orders.length > 0 ? randomElement(orders).id : null,
      notes: Math.random() > 0.8 ? '정상 처리' : null,
      created_by: 'Admin',
      created_at: entryDate.toISOString()
    }
    
    entries.push(entry)
  }
  
  const { error } = await supabase.from('cashbook').insert(entries)
  if (error) {
    console.error('❌ Error seeding cashbook:', error)
  } else {
    console.log('✅ Cashbook entries seeded successfully')
  }
}

async function main() {
  console.log('🚀 Starting seed process...')
  
  try {
    // 기존 데이터 삭제 (선택사항 - 주의!)
    // await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    // await supabase.from('inventory_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    // await supabase.from('cashbook').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    // await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    // await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    // await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    const products = await seedProducts()
    const customers = await seedCustomers()
    const orders = await seedOrders(products, customers)
    await seedInventoryTransactions(products)
    await seedCashbook(orders)
    
    console.log('✨ Seed process completed successfully!')
  } catch (error) {
    console.error('💥 Seed process failed:', error)
  }
}

// 스크립트 실행
main()