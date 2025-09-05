/**
 * 시스템 테스트 - Phase 2: 상품 데이터 생성
 * UI 시뮬레이션을 통한 상품 100건 생성
 */

import { createClient } from '@supabase/supabase-js';
import { generateSKU } from '../../lib/domain/services/sku.service';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 상품 데이터 템플릿
const productTemplates = {
  의류: {
    brands: ['나이키', '아디다스', '유니클로', '자라', 'H&M'],
    models: ['티셔츠', '후드', '청바지', '셔츠', '자켓'],
    colors: ['검정', '흰색', '네이비', '그레이', '베이지'],
    basePriceRange: [20, 150]
  },
  가방: {
    brands: ['코치', '마이클코어스', 'MCM', '루이비통', '샤넬'],
    models: ['토트백', '크로스백', '백팩', '클러치', '숄더백'],
    colors: ['블랙', '브라운', '베이지', '네이비', '레드'],
    basePriceRange: [100, 800]
  },
  신발: {
    brands: ['나이키', '아디다스', '뉴발란스', '컨버스', '반스'],
    models: ['운동화', '스니커즈', '부츠', '샌들', '로퍼'],
    colors: ['검정', '흰색', '회색', '네이비', '베이지'],
    basePriceRange: [50, 200]
  },
  화장품: {
    brands: ['설화수', '후', '라네즈', 'SK-II', '에스티로더'],
    models: ['에센스', '크림', '세럼', '토너', '마스크팩'],
    colors: ['단품', '세트', '리미티드', '기획', '대용량'],
    basePriceRange: [30, 300]
  },
  전자제품: {
    brands: ['애플', '삼성', '소니', 'LG', '보스'],
    models: ['이어폰', '스마트워치', '보조배터리', '케이스', '충전기'],
    colors: ['블랙', '화이트', '실버', '골드', '블루'],
    basePriceRange: [20, 500]
  }
};

// 랜덤 선택 헬퍼
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// 랜덤 숫자 생성
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 상품 데이터 생성
function generateProductData(index: number) {
  const categories = Object.keys(productTemplates);
  const category = randomChoice(categories);
  const template = productTemplates[category as keyof typeof productTemplates];
  
  const brand = randomChoice(template.brands);
  const model = randomChoice(template.models);
  const color = randomChoice(template.colors);
  const [minPrice, maxPrice] = template.basePriceRange;
  
  // SKU 생성
  const sku = generateSKU({
    category,
    model,
    color,
    manufacturer: brand
  });

  // 가격 계산 (CNY)
  const costCNY = randomBetween(minPrice, maxPrice);
  const sellingPriceKRW = Math.floor(costCNY * 190 * 1.3); // 환율 190, 마진 30%
  
  return {
    sku,
    name: `${brand} ${model} (${color})`,
    category,
    model,
    color,
    size: randomChoice(['S', 'M', 'L', 'XL', 'FREE', null]),
    manufacturer: brand,
    costCNY,
    costKRW: Math.floor(costCNY * 190),
    sellingPriceKRW,
    onHand: randomBetween(0, 50), // 초기 재고
    allocated: 0,
    available: 0,
    reorderPoint: randomBetween(5, 10),
    reorderQuantity: randomBetween(10, 30),
    imageUrls: [
      `https://placeholder.com/product/${index}/main.jpg`,
      `https://placeholder.com/product/${index}/detail1.jpg`,
      `https://placeholder.com/product/${index}/detail2.jpg`
    ],
    description: `${category} - ${brand} ${model} 상품입니다. 색상: ${color}`,
    notes: `테스트 상품 #${index + 1}`,
    tags: [category, brand, model, color].filter(Boolean),
    barcode: `880000${String(index).padStart(6, '0')}`,
    isActive: Math.random() > 0.1, // 90% 활성 상품
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// 상품 생성 (UI 시뮬레이션)
async function createProduct(productData: any): Promise<boolean> {
  try {
    // UI를 통한 상품 생성 시뮬레이션
    // 실제로는 API 엔드포인트를 호출하거나 Supabase를 직접 사용
    
    const { data, error } = await supabase
      .from('products')
      .insert([{
        sku: productData.sku,
        name: productData.name,
        category: productData.category,
        model: productData.model,
        color: productData.color,
        size: productData.size,
        manufacturer: productData.manufacturer,
        cost_cny: productData.costCNY,
        cost_krw: productData.costKRW,
        selling_price_krw: productData.sellingPriceKRW,
        on_hand: productData.onHand,
        allocated: productData.allocated,
        available: productData.onHand, // available = onHand - allocated
        reorder_point: productData.reorderPoint,
        reorder_quantity: productData.reorderQuantity,
        image_urls: productData.imageUrls,
        description: productData.description,
        notes: productData.notes,
        tags: productData.tags,
        barcode: productData.barcode,
        is_active: productData.isActive,
        created_at: productData.createdAt,
        updated_at: productData.updatedAt
      }])
      .select()
      .single();

    if (error) {
      console.error(`  ❌ 상품 생성 실패:`, error.message);
      return false;
    }

    // 재고 이동 기록 생성
    if (productData.onHand > 0) {
      const { error: invError } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: data.id,
          type: 'IN',
          quantity: productData.onHand,
          from_location: 'SUPPLIER',
          to_location: 'WAREHOUSE',
          reason: '초기 재고',
          notes: '시스템 테스트 초기 데이터',
          created_at: productData.createdAt
        });

      if (invError) {
        console.error(`  ⚠️  재고 기록 실패:`, invError.message);
      }
    }

    return true;
  } catch (error) {
    console.error(`  ❌ 오류:`, error);
    return false;
  }
}

// 진행 상황 표시
function showProgress(current: number, total: number, category: string) {
  const percentage = Math.floor((current / total) * 100);
  const bar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
  process.stdout.write(`\r  ${bar} ${percentage}% (${current}/${total}) - ${category}`);
}

// 메인 실행 함수
async function seedProducts() {
  console.log('\n========================================');
  console.log('   상품 데이터 생성 (100건)');
  console.log('========================================\n');

  const TOTAL_PRODUCTS = 100;
  let successCount = 0;
  let failCount = 0;
  const createdProducts = [];

  console.log('🏭 상품 생성 중...\n');

  for (let i = 0; i < TOTAL_PRODUCTS; i++) {
    const productData = generateProductData(i);
    const success = await createProduct(productData);
    
    if (success) {
      successCount++;
      createdProducts.push(productData);
    } else {
      failCount++;
    }

    showProgress(i + 1, TOTAL_PRODUCTS, productData.category);
    
    // API rate limiting 방지
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('\n');

  // 통계 출력
  console.log('\n📊 생성 통계:');
  console.log(`  ✅ 성공: ${successCount}건`);
  console.log(`  ❌ 실패: ${failCount}건`);

  // 카테고리별 통계
  const categoryStats: { [key: string]: number } = {};
  createdProducts.forEach(p => {
    categoryStats[p.category] = (categoryStats[p.category] || 0) + 1;
  });

  console.log('\n📦 카테고리별 분포:');
  Object.entries(categoryStats).forEach(([category, count]) => {
    console.log(`  • ${category}: ${count}건`);
  });

  // 재고 통계
  const totalStock = createdProducts.reduce((sum, p) => sum + p.onHand, 0);
  const avgStock = Math.floor(totalStock / createdProducts.length);
  
  console.log('\n📈 재고 통계:');
  console.log(`  • 총 재고: ${totalStock.toLocaleString()}개`);
  console.log(`  • 평균 재고: ${avgStock}개`);
  console.log(`  • 활성 상품: ${createdProducts.filter(p => p.isActive).length}건`);

  // 가격 통계
  const totalValue = createdProducts.reduce((sum, p) => sum + (p.sellingPriceKRW * p.onHand), 0);
  console.log('\n💰 가치 통계:');
  console.log(`  • 총 재고 가치: ₩${totalValue.toLocaleString()}`);

  if (failCount > 10) {
    console.error('\n⚠️  실패율이 높습니다. 데이터베이스 연결을 확인하세요.');
    process.exit(1);
  }

  console.log('\n✅ 상품 데이터 생성 완료!');
  console.log('다음 단계: npm run test:system:orders');
  
  return createdProducts;
}

// 스크립트 실행
if (require.main === module) {
  seedProducts().catch(console.error);
}

export { seedProducts, generateProductData };