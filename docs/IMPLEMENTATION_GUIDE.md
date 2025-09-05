# 📚 YUANDI-ERP 구현 가이드

> **작성일**: 2025-01-25  
> **버전**: 1.0.0  
> **상태**: P0 우선순위 기능 구현 완료

## 🎯 구현된 핵심 기능

### 1. SKU 자동 생성 ✅
- **위치**: `/lib/domain/services/sku.service.ts`
- **패턴**: `[카테고리]-[모델]-[색상]-[브랜드]-[HASH5]`
- **테스트**: `/lib/domain/services/__tests__/sku.service.test.ts`

### 2. 주문번호 자동 생성 ✅
- **위치**: `/lib/domain/services/order-number.service.ts`
- **패턴**: `ORD-YYMMDD-###`
- **테스트**: `/lib/domain/services/__tests__/order-number.service.test.ts`

### 3. 재고 관리 서비스 ✅
- **위치**: `/lib/domain/services/inventory.service.ts`
- **기능**: 실시간 재고 검증, 자동 차감/복구, 재고 조정
- **테스트**: `/lib/domain/services/__tests__/inventory.service.test.ts`

### 4. 주소 및 PCCC 서비스 ✅
- **Daum 우편번호**: `/components/address/DaumPostcode.tsx`
- **PCCC 검증**: `/lib/domain/services/pccc.service.ts`

## 📖 사용 가이드

### 통합 도메인 서비스 사용

```typescript
import { createServerClient } from '@/lib/supabase';
import { DomainService } from '@/lib/domain/services';

// 서버 컴포넌트에서
const supabase = createServerClient();
const domainService = new DomainService(supabase);

// SKU 생성
const sku = domainService.generateSKU({
  category: 'ELEC',
  model: 'iPhone15',
  color: 'Black',
  brand: 'Apple'
});
// 결과: "ELEC-iPhone15-Black-Apple-A1B2C"

// 주문번호 생성
const orderNo = await domainService.generateOrderNumber();
// 결과: "ORD-240823-001"

// PCCC 검증
const pcccValidation = domainService.validatePCCC('P123456789012');
if (pcccValidation.isValid) {
  console.log('Valid PCCC:', pcccValidation.normalized);
}
```

### 주문 생성 프로세스

```typescript
// 완전한 주문 생성 프로세스
try {
  const result = await domainService.createOrderWithValidation({
    productId: 'product-uuid',
    quantity: 2,
    customerInfo: {
      name: '홍길동',
      phone: '010-1234-5678',
      pccc: 'P123456789012',
      address: '서울시 강남구 테헤란로',
      addressDetail: '123번지',
      zipCode: '06234'
    },
    userId: 'user-uuid'
  });

  console.log('주문번호:', result.orderNo);
  console.log('재고 차감:', result.stockResult);
  console.log('PCCC 검증:', result.pcccValidation);
} catch (error) {
  if (error instanceof InsufficientStockError) {
    console.error('재고 부족!');
  }
}
```

### 재고 관리

```typescript
// 재고 확인
const hasStock = await domainService.inventory.checkStock('product-id', 5);

// 재고 차감 (주문 시)
const stockResult = await domainService.inventory.validateAndDeductStock(
  'product-id',
  3,
  'order-id',
  'user-id',
  true // 트랜잭션 사용
);

// 재고 복구 (환불 시)
const refundResult = await domainService.processRefund({
  orderId: 'order-id',
  productId: 'product-id',
  quantity: 3,
  userId: 'user-id'
});

// 재고 입고
const inboundResult = await domainService.processInbound({
  productInfo: {
    category: 'CLOTH',
    name: '나이키 티셔츠',
    model: 'DRI-FIT',
    color: 'Black',
    brand: 'Nike'
  },
  quantity: 100,
  unitCost: 50, // CNY
  note: 'Purchase Order #2024-001',
  userId: 'user-id'
});

// 재고 부족 상품 조회
const lowStockProducts = await domainService.monitorLowStock(5);
lowStockProducts.forEach(product => {
  console.log(`${product.name}: ${product.onHand}개 남음 (부족: ${product.stockShortage}개)`);
});
```

### Daum 우편번호 컴포넌트

```tsx
import { AddressField } from '@/components/address/DaumPostcode';

export default function OrderForm() {
  const [address, setAddress] = useState(null);

  return (
    <AddressField
      value={address}
      onChange={setAddress}
      label="배송지 주소"
      required
    />
  );
}
```

### PCCC 입력 및 검증

```typescript
import { 
  formatPCCCInput, 
  validatePCCC, 
  maskPCCC 
} from '@/lib/domain/services';

// 입력 포맷팅 (실시간)
const formatted = formatPCCCInput('P123456789012');
// 결과: "P-1234-5678-9012"

// 검증
const validation = validatePCCC('P123456789012');
if (!validation.isValid) {
  console.error('PCCC 오류:', validation.errors);
}

// 마스킹 (개인정보 보호)
const masked = maskPCCC('P123456789012', 4);
// 결과: "P-****-****-9012"
```

## 🔌 API Route 통합 예제

### 주문 생성 API

```typescript
// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { DomainService } from '@/lib/domain/services';

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const domainService = new DomainService(supabase);
  
  const body = await request.json();
  
  try {
    // 1. 도메인 서비스로 주문 검증 및 준비
    const validation = await domainService.createOrderWithValidation({
      productId: body.productId,
      quantity: body.quantity,
      customerInfo: body.customer,
      userId: body.userId
    });
    
    // 2. 주문 데이터 생성
    const orderData = {
      order_no: validation.orderNo,
      customer_name: body.customer.name,
      customer_phone: body.customer.phone,
      pccc_code: validation.pcccValidation.normalized,
      // ... 기타 필드
    };
    
    // 3. DB에 주문 저장
    const { data: order, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

### 재고 조정 API

```typescript
// app/api/inventory/adjust/route.ts
export async function PATCH(request: NextRequest) {
  const supabase = createServerClient();
  const domainService = new DomainService(supabase);
  
  const { productId, newQuantity, reason } = await request.json();
  
  try {
    const result = await domainService.inventory.adjustStock(
      productId,
      newQuantity,
      reason,
      'user-id' // 세션에서 가져온 사용자 ID
    );
    
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

## 🧪 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 특정 서비스 테스트
npm test -- sku.service
npm test -- order-number.service
npm test -- inventory.service

# 테스트 커버리지
npm run test:coverage
```

## 🗄️ 데이터베이스 마이그레이션

### 재고 트랜잭션 함수 (PostgreSQL)

```sql
-- 재고 차감 트랜잭션 함수
CREATE OR REPLACE FUNCTION deduct_stock_transaction(
  p_product_id UUID,
  p_quantity INTEGER,
  p_order_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
BEGIN
  -- 재고 조회 및 잠금
  SELECT on_hand INTO v_current_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;
  
  -- 재고 부족 체크
  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock: % available, % requested', 
      v_current_stock, p_quantity;
  END IF;
  
  -- 재고 차감
  v_new_stock := v_current_stock - p_quantity;
  
  UPDATE products
  SET on_hand = v_new_stock,
      updated_at = NOW()
  WHERE id = p_product_id;
  
  -- 재고 이동 기록
  INSERT INTO inventory_movements (
    product_id, movement_type, quantity,
    balance_before, balance_after,
    ref_type, ref_id, created_by
  ) VALUES (
    p_product_id, 'sale', -p_quantity,
    v_current_stock, v_new_stock,
    'order', p_order_id, p_user_id
  );
  
  -- 결과 반환
  RETURN json_build_object(
    'success', true,
    'previous_stock', v_current_stock,
    'new_stock', v_new_stock
  );
END;
$$ LANGUAGE plpgsql;

-- 일일 주문번호 시퀀스 리셋 (크론잡 또는 트리거)
CREATE OR REPLACE FUNCTION reset_daily_order_sequence()
RETURNS void AS $$
BEGIN
  -- 매일 자정에 실행되도록 설정
  -- 실제로는 pg_cron 또는 외부 스케줄러 사용
  NULL; -- Placeholder
END;
$$ LANGUAGE plpgsql;
```

## 🚀 다음 단계

### P1 우선순위 기능
1. **출납장부 자동 기록**: 주문/환불/입고 시 자동으로 cashbook에 기록
2. **환율 적용**: CNY ↔ KRW 실시간 환율 적용
3. **송장 사진 업로드**: Supabase Storage 연동
4. **엑셀 내보내기**: 라이브러리 문제 해결 후 구현

### 성능 최적화
1. **캐싱**: Redis 또는 메모리 캐싱으로 재고 조회 최적화
2. **벌크 작업**: 대량 주문/입고 처리
3. **비동기 처리**: 무거운 작업은 큐로 처리

### 모니터링
1. **재고 알림**: 재고 부족 시 실시간 알림
2. **에러 트래킹**: Sentry 연동
3. **메트릭 수집**: 주문/재고 통계

## 📝 주의사항

1. **트랜잭션 사용**: 재고 차감 시 반드시 트랜잭션 사용 (`useTransaction: true`)
2. **동시성 제어**: 동일 상품에 대한 동시 주문 처리 시 데이터베이스 락 활용
3. **에러 처리**: 도메인 특화 에러 클래스 활용 (InsufficientStockError 등)
4. **타임존**: 모든 날짜는 Asia/Seoul (UTC+9) 기준
5. **PCCC**: 실제 서비스에서는 관세청 API 연동 필요

## 🔗 관련 문서

- [PRD_v2.md](./PRD_v2.md) - 제품 요구사항
- [DATABASE_ERD.md](./DATABASE_ERD.md) - 데이터베이스 스키마
- [ITERATIVE_DEVELOPMENT.md](./ITERATIVE_DEVELOPMENT.md) - 개발 프로세스
- [IMPLEMENTATION-STATUS.md](../IMPLEMENTATION-STATUS.md) - 구현 현황