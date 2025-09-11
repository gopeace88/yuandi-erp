import { NextRequest, NextResponse } from 'next/server';

// 하드코드된 출납유형 (cashbook_types 테이블이 없으므로 임시 해결책)
const DEFAULT_CASHBOOK_TYPES = [
  {
    id: 'income_sales',
    code: 'income_sales',
    name_ko: '매출수입',
    name_zh: '销售收入',
    type: 'income',
    color: '#10B981',
    description: '제품 판매 수입',
    display_order: 1,
    active: true,
    is_system: true
  },
  {
    id: 'income_other',
    code: 'income_other',
    name_ko: '기타수입',
    name_zh: '其他收入',
    type: 'income',
    color: '#34D399',
    description: '기타 수입',
    display_order: 2,
    active: true,
    is_system: true
  },
  {
    id: 'expense_purchase',
    code: 'expense_purchase',
    name_ko: '매입비용',
    name_zh: '采购费用',
    type: 'expense',
    color: '#EF4444',
    description: '제품 매입 비용',
    display_order: 3,
    active: true,
    is_system: true
  },
  {
    id: 'expense_shipping',
    code: 'expense_shipping',
    name_ko: '배송비',
    name_zh: '运费',
    type: 'expense',
    color: '#F87171',
    description: '배송 관련 비용',
    display_order: 4,
    active: true,
    is_system: true
  },
  {
    id: 'expense_operation',
    code: 'expense_operation',
    name_ko: '운영비',
    name_zh: '运营费',
    type: 'expense',
    color: '#FB923C',
    description: '일반 운영 비용',
    display_order: 5,
    active: true,
    is_system: true
  },
  {
    id: 'expense_tax',
    code: 'expense_tax',
    name_ko: '세금',
    name_zh: '税金',
    type: 'expense',
    color: '#FBBF24',
    description: '세금 관련 비용',
    display_order: 6,
    active: true,
    is_system: true
  },
  {
    id: 'adjustment',
    code: 'adjustment',
    name_ko: '조정',
    name_zh: '调整',
    type: 'adjustment',
    color: '#6B7280',
    description: '잔액 조정',
    display_order: 7,
    active: true,
    is_system: true
  },
  {
    id: 'refund',
    code: 'refund',
    name_ko: '환불',
    name_zh: '退款',
    type: 'expense',
    color: '#F59E0B',
    description: '주문 환불',
    display_order: 8,
    active: true,
    is_system: true
  }
];

// GET: 출납유형 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 하드코드된 출납유형 반환
    // TODO: 향후 cashbook_types 테이블 생성 시 데이터베이스에서 조회하도록 수정
    return NextResponse.json(DEFAULT_CASHBOOK_TYPES);
  } catch (error) {
    console.error('❌ Cashbook types GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 새 출납유형 생성 (cashbook_types 테이블 없으므로 비활성화)
export async function POST(request: NextRequest) {
  // TODO: cashbook_types 테이블 생성 후 구현
  return NextResponse.json(
    { error: 'Cashbook types management is not available. Using default types.' },
    { status: 501 }
  );
}

// PATCH: 출납유형 수정 (cashbook_types 테이블 없으므로 비활성화)
export async function PATCH(request: NextRequest) {
  // TODO: cashbook_types 테이블 생성 후 구현
  return NextResponse.json(
    { error: 'Cashbook types management is not available. Using default types.' },
    { status: 501 }
  );
}

// DELETE: 출납유형 삭제 (cashbook_types 테이블 없으므로 비활성화)
export async function DELETE(request: NextRequest) {
  // TODO: cashbook_types 테이블 생성 후 구현
  return NextResponse.json(
    { error: 'Cashbook types management is not available. Using default types.' },
    { status: 501 }
  );
}