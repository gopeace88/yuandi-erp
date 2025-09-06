/**
 * 출납장부 페이지
 * PRD v2.0 요구사항: 재무 거래 추적 및 현금 흐름 관리
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileBottomNav } from '@/components/Navigation';

interface CashbookPageProps {
  params: { locale: string };
}

interface Transaction {
  id: string;
  transactionDate: string;
  type: 'sale' | 'inbound' | 'shipping' | 'adjustment' | 'refund';
  amount: number;
  currency: 'KRW' | 'CNY';
  fxRate: number;
  amountKrw: number;
  refType?: string;
  refNo?: string;
  description: string;
  note?: string;
  bankName?: string;
  accountNo?: string;
  createdAt: string;
  createdBy: string;
}

// Mock 데이터
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    transactionDate: '2024-12-25',
    type: 'sale',
    amount: 158000,
    currency: 'KRW',
    fxRate: 1,
    amountKrw: 158000,
    refType: 'order',
    refNo: 'ORD-241225-001',
    description: '주문 판매 - 김철수',
    bankName: '국민은행',
    accountNo: '****-****-1234',
    createdAt: '2024-12-25T10:30:00',
    createdBy: 'Admin User'
  },
  {
    id: '2',
    transactionDate: '2024-12-25',
    type: 'inbound',
    amount: 500,
    currency: 'CNY',
    fxRate: 190.5,
    amountKrw: 95250,
    refType: 'inventory',
    refNo: 'INB-241225-001',
    description: '재고 입고 - 나이키 운동화 10개',
    note: 'Taobao 구매',
    createdAt: '2024-12-25T09:15:00',
    createdBy: 'Order Manager'
  },
  {
    id: '3',
    transactionDate: '2024-12-25',
    type: 'shipping',
    amount: -3500,
    currency: 'KRW',
    fxRate: 1,
    amountKrw: -3500,
    refType: 'shipment',
    refNo: 'SHIP-241225-001',
    description: 'CJ대한통운 배송비',
    createdAt: '2024-12-25T14:30:00',
    createdBy: 'Ship Manager'
  },
  {
    id: '4',
    transactionDate: '2024-12-24',
    type: 'sale',
    amount: 89000,
    currency: 'KRW',
    fxRate: 1,
    amountKrw: 89000,
    refType: 'order',
    refNo: 'ORD-241224-003',
    description: '주문 판매 - 이영희',
    bankName: '신한은행',
    accountNo: '****-****-5678',
    createdAt: '2024-12-24T16:45:00',
    createdBy: 'Admin User'
  },
  {
    id: '5',
    transactionDate: '2024-12-24',
    type: 'adjustment',
    amount: -5000,
    currency: 'KRW',
    fxRate: 1,
    amountKrw: -5000,
    description: '사무용품 구매',
    note: '프린터 토너, A4용지',
    createdAt: '2024-12-24T11:00:00',
    createdBy: 'Admin User'
  },
  {
    id: '6',
    transactionDate: '2024-12-23',
    type: 'refund',
    amount: -45000,
    currency: 'KRW',
    fxRate: 1,
    amountKrw: -45000,
    refType: 'order',
    refNo: 'ORD-241223-002',
    description: '주문 환불 - 박민수',
    note: '상품 하자',
    bankName: '우리은행',
    accountNo: '****-****-9012',
    createdAt: '2024-12-23T10:20:00',
    createdBy: 'Admin User'
  }
];

export default function CashbookPage({ params: { locale } }: CashbookPageProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '2024-12-01',
    endDate: '2024-12-31'
  });
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const router = useRouter();

  // 거래 추가 폼 상태
  const [addForm, setAddForm] = useState({
    transactionDate: new Date().toISOString().split('T')[0],
    type: 'adjustment' as 'adjustment' | 'shipping',
    amount: '',
    currency: 'KRW' as 'KRW' | 'CNY',
    fxRate: '1',
    description: '',
    note: '',
    bankName: '',
    accountNo: ''
  });

  // 다국어 텍스트
  const texts = {
    ko: {
      title: '출납장부',
      dateRange: '기간',
      to: '~',
      filter: '필터',
      search: '검색',
      searchPlaceholder: '설명, 참조번호, 메모 검색...',
      addTransaction: '거래 추가',
      // Table Headers
      date: '날짜',
      type: '유형',
      description: '설명',
      reference: '참조',
      amountIn: '입금',
      amountOut: '출금',
      balance: '잔액',
      note: '메모',
      createdBy: '등록자',
      action: '작업',
      // Transaction Types
      all: '전체',
      sale: '판매',
      inbound: '입고',
      shipping: '배송',
      adjustment: '조정',
      refund: '환불',
      // Modal
      addModalTitle: '거래 추가',
      detailModalTitle: '거래 상세',
      transactionDate: '거래일',
      transactionType: '거래 유형',
      amount: '금액',
      currency: '통화',
      exchangeRate: '환율',
      amountKrw: '원화 금액',
      bank: '은행',
      account: '계좌번호',
      cancel: '취소',
      save: '저장',
      close: '닫기',
      viewDetail: '상세',
      // Summary
      totalIn: '총 입금',
      totalOut: '총 출금',
      netAmount: '순액',
      transactionCount: '거래 건수',
      noTransactions: '거래 내역이 없습니다.',
      // Others
      createdAt: '등록일시',
      refNo: '참조번호',
      refType: '참조유형',
      selectType: '유형 선택'
    },
    'zh-CN': {
      title: '现金日记账',
      dateRange: '期间',
      to: '~',
      filter: '筛选',
      search: '搜索',
      searchPlaceholder: '搜索描述、参考号、备注...',
      addTransaction: '添加交易',
      // Table Headers
      date: '日期',
      type: '类型',
      description: '描述',
      reference: '参考',
      amountIn: '收入',
      amountOut: '支出',
      balance: '余额',
      note: '备注',
      createdBy: '创建人',
      action: '操作',
      // Transaction Types
      all: '全部',
      sale: '销售',
      inbound: '入库',
      shipping: '配送',
      adjustment: '调整',
      refund: '退款',
      // Modal
      addModalTitle: '添加交易',
      detailModalTitle: '交易详情',
      transactionDate: '交易日期',
      transactionType: '交易类型',
      amount: '金额',
      currency: '货币',
      exchangeRate: '汇率',
      amountKrw: '韩元金额',
      bank: '银行',
      account: '账号',
      cancel: '取消',
      save: '保存',
      close: '关闭',
      viewDetail: '详情',
      // Summary
      totalIn: '总收入',
      totalOut: '总支出',
      netAmount: '净额',
      transactionCount: '交易数量',
      noTransactions: '没有交易记录。',
      // Others
      createdAt: '创建时间',
      refNo: '参考号',
      refType: '参考类型',
      selectType: '选择类型'
    }
  };

  const t = texts[locale as keyof typeof texts] || texts.ko;

  // 거래 유형별 색상
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return { bg: '#dcfce7', text: '#166534' };
      case 'inbound': return { bg: '#dbeafe', text: '#1e40af' };
      case 'shipping': return { bg: '#fee2e2', text: '#dc2626' };
      case 'adjustment': return { bg: '#fef3c7', text: '#92400e' };
      case 'refund': return { bg: '#fce7f3', text: '#9f1239' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  // 거래 유형 라벨
  const getTypeLabel = (type: string) => {
    return t[type as keyof typeof t] || type;
  };

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!role) {
      router.push(`/${locale}/`);
      return;
    }
    setUserRole(role);
  }, [locale, router]);

  useEffect(() => {
    // 필터링 로직
    let filtered = transactions.filter(transaction => {
      // 날짜 필터
      if (transaction.transactionDate < dateRange.startDate || 
          transaction.transactionDate > dateRange.endDate) {
        return false;
      }

      // 유형 필터
      if (filterType !== 'all' && transaction.type !== filterType) {
        return false;
      }

      // 검색 필터
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          transaction.description.toLowerCase().includes(search) ||
          (transaction.refNo && transaction.refNo.toLowerCase().includes(search)) ||
          (transaction.note && transaction.note.toLowerCase().includes(search))
        );
      }

      return true;
    });

    // 날짜 역순 정렬
    filtered.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || 
                           b.createdAt.localeCompare(a.createdAt));

    setFilteredTransactions(filtered);
  }, [transactions, dateRange, filterType, searchTerm]);

  // 잔액 계산
  const calculateBalance = (index: number): number => {
    let balance = 0;
    for (let i = filteredTransactions.length - 1; i >= index; i--) {
      balance += filteredTransactions[i].amountKrw;
    }
    return balance;
  };

  // 요약 통계
  const summary = {
    totalIn: filteredTransactions.filter(t => t.amountKrw > 0)
      .reduce((sum, t) => sum + t.amountKrw, 0),
    totalOut: Math.abs(filteredTransactions.filter(t => t.amountKrw < 0)
      .reduce((sum, t) => sum + t.amountKrw, 0)),
    count: filteredTransactions.length
  };
  summary.netAmount = summary.totalIn - summary.totalOut;

  // 거래 추가
  const handleAddTransaction = () => {
    const amount = parseFloat(addForm.amount);
    const fxRate = parseFloat(addForm.fxRate);
    const amountKrw = addForm.currency === 'KRW' ? amount : amount * fxRate;
    
    // adjustment와 shipping은 일반적으로 지출
    const finalAmount = addForm.type === 'adjustment' || addForm.type === 'shipping' 
      ? -Math.abs(amount) 
      : amount;
    const finalAmountKrw = addForm.type === 'adjustment' || addForm.type === 'shipping'
      ? -Math.abs(amountKrw)
      : amountKrw;

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      transactionDate: addForm.transactionDate,
      type: addForm.type,
      amount: finalAmount,
      currency: addForm.currency,
      fxRate: fxRate,
      amountKrw: finalAmountKrw,
      description: addForm.description,
      note: addForm.note || undefined,
      bankName: addForm.bankName || undefined,
      accountNo: addForm.accountNo || undefined,
      createdAt: new Date().toISOString(),
      createdBy: localStorage.getItem('userName') || 'Unknown'
    };

    setTransactions([...transactions, newTransaction]);
    setShowAddModal(false);
    
    // 폼 초기화
    setAddForm({
      transactionDate: new Date().toISOString().split('T')[0],
      type: 'adjustment',
      amount: '',
      currency: 'KRW',
      fxRate: '1',
      description: '',
      note: '',
      bankName: '',
      accountNo: ''
    });
  };

  return (
    <div style={{ padding: '2rem', paddingBottom: '5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          {t.title}
        </h1>

        {/* 필터 섹션 */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* 날짜 범위 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>{t.dateRange}:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
            <span>{t.to}</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* 유형 필터 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>{t.filter}:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="all">{t.all}</option>
              <option value="sale">{t.sale}</option>
              <option value="inbound">{t.inbound}</option>
              <option value="shipping">{t.shipping}</option>
              <option value="adjustment">{t.adjustment}</option>
              <option value="refund">{t.refund}</option>
            </select>
          </div>

          {/* 검색 */}
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              minWidth: '250px'
            }}
          />

          {/* 거래 추가 버튼 (Admin/OrderManager만) */}
          {(userRole === 'Admin' || userRole === 'OrderManager') && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
            >
              + {t.addTransaction}
            </button>
          )}
        </div>
      </div>

      {/* 요약 카드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          padding: '1rem',
          backgroundColor: '#dcfce7',
          borderRadius: '0.5rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#166534', marginBottom: '0.5rem' }}>
            {t.totalIn}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534' }}>
            ₩{summary.totalIn.toLocaleString()}
          </div>
        </div>
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee2e2',
          borderRadius: '0.5rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#dc2626', marginBottom: '0.5rem' }}>
            {t.totalOut}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
            ₩{summary.totalOut.toLocaleString()}
          </div>
        </div>
        <div style={{
          padding: '1rem',
          backgroundColor: summary.netAmount >= 0 ? '#dbeafe' : '#fef3c7',
          borderRadius: '0.5rem'
        }}>
          <div style={{ 
            fontSize: '0.875rem', 
            color: summary.netAmount >= 0 ? '#1e40af' : '#92400e', 
            marginBottom: '0.5rem' 
          }}>
            {t.netAmount}
          </div>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: summary.netAmount >= 0 ? '#1e40af' : '#92400e'
          }}>
            ₩{summary.netAmount.toLocaleString()}
          </div>
        </div>
        <div style={{
          padding: '1rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '0.5rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            {t.transactionCount}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#374151' }}>
            {summary.count}
          </div>
        </div>
      </div>

      {/* 거래 목록 */}
      {filteredTransactions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          {t.noTransactions}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.date}</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.type}</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.description}</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.reference}</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>{t.amountIn}</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>{t.amountOut}</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>{t.balance}</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction, index) => {
                const typeColor = getTypeColor(transaction.type);
                const balance = calculateBalance(index);
                
                return (
                  <tr key={transaction.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem' }}>{transaction.transactionDate}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: typeColor.bg,
                        color: typeColor.text
                      }}>
                        {getTypeLabel(transaction.type)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div>{transaction.description}</div>
                      {transaction.note && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {transaction.note}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {transaction.refNo || '-'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#166534' }}>
                      {transaction.amountKrw > 0 ? `₩${transaction.amountKrw.toLocaleString()}` : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#dc2626' }}>
                      {transaction.amountKrw < 0 ? `₩${Math.abs(transaction.amountKrw).toLocaleString()}` : '-'}
                    </td>
                    <td style={{ 
                      padding: '0.75rem', 
                      textAlign: 'right', 
                      fontWeight: '600',
                      color: balance >= 0 ? '#166534' : '#dc2626'
                    }}>
                      ₩{balance.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setShowDetailModal(true);
                        }}
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        {t.viewDetail}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 거래 추가 모달 */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {t.addModalTitle}
            </h2>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* 거래일 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.transactionDate} *
                </label>
                <input
                  type="date"
                  value={addForm.transactionDate}
                  onChange={(e) => setAddForm({ ...addForm, transactionDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* 거래 유형 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.transactionType} *
                </label>
                <select
                  value={addForm.type}
                  onChange={(e) => setAddForm({ ...addForm, type: e.target.value as 'adjustment' | 'shipping' })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="adjustment">{t.adjustment}</option>
                  <option value="shipping">{t.shipping}</option>
                </select>
              </div>

              {/* 금액 및 통화 */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.amount} *
                  </label>
                  <input
                    type="number"
                    value={addForm.amount}
                    onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.currency}
                  </label>
                  <select
                    value={addForm.currency}
                    onChange={(e) => setAddForm({ ...addForm, currency: e.target.value as 'KRW' | 'CNY' })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="KRW">KRW</option>
                    <option value="CNY">CNY</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.exchangeRate}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={addForm.fxRate}
                    onChange={(e) => setAddForm({ ...addForm, fxRate: e.target.value })}
                    disabled={addForm.currency === 'KRW'}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      backgroundColor: addForm.currency === 'KRW' ? '#f9fafb' : 'white'
                    }}
                  />
                </div>
              </div>

              {/* 원화 금액 (자동 계산) */}
              {addForm.currency === 'CNY' && addForm.amount && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.amountKrw}
                  </label>
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}>
                    ₩{(parseFloat(addForm.amount) * parseFloat(addForm.fxRate)).toLocaleString()}
                  </div>
                </div>
              )}

              {/* 설명 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.description} *
                </label>
                <input
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* 메모 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.note}
                </label>
                <textarea
                  value={addForm.note}
                  onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* 은행 정보 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.bank}
                  </label>
                  <input
                    type="text"
                    value={addForm.bankName}
                    onChange={(e) => setAddForm({ ...addForm, bankName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.account}
                  </label>
                  <input
                    type="text"
                    value={addForm.accountNo}
                    onChange={(e) => setAddForm({ ...addForm, accountNo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddForm({
                    transactionDate: new Date().toISOString().split('T')[0],
                    type: 'adjustment',
                    amount: '',
                    currency: 'KRW',
                    fxRate: '1',
                    description: '',
                    note: '',
                    bankName: '',
                    accountNo: ''
                  });
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleAddTransaction}
                disabled={!addForm.amount || !addForm.description}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: addForm.amount && addForm.description ? '#2563eb' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: addForm.amount && addForm.description ? 'pointer' : 'not-allowed'
                }}
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 거래 상세 모달 */}
      {showDetailModal && selectedTransaction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {t.detailModalTitle}
            </h2>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* 기본 정보 */}
              <div style={{
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.375rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>{t.transactionDate}:</strong> {selectedTransaction.transactionDate}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>{t.type}:</strong>{' '}
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    backgroundColor: getTypeColor(selectedTransaction.type).bg,
                    color: getTypeColor(selectedTransaction.type).text
                  }}>
                    {getTypeLabel(selectedTransaction.type)}
                  </span>
                </div>
                <div>
                  <strong>{t.description}:</strong> {selectedTransaction.description}
                </div>
              </div>

              {/* 금액 정보 */}
              <div style={{
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.375rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>{t.amount}:</strong>{' '}
                  {selectedTransaction.currency === 'KRW' ? '₩' : '¥'}
                  {Math.abs(selectedTransaction.amount).toLocaleString()} {selectedTransaction.currency}
                </div>
                {selectedTransaction.currency === 'CNY' && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>{t.exchangeRate}:</strong> {selectedTransaction.fxRate}
                  </div>
                )}
                <div>
                  <strong>{t.amountKrw}:</strong>{' '}
                  <span style={{
                    color: selectedTransaction.amountKrw >= 0 ? '#166534' : '#dc2626',
                    fontWeight: '600'
                  }}>
                    {selectedTransaction.amountKrw >= 0 ? '+' : ''}₩{selectedTransaction.amountKrw.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 참조 정보 */}
              {(selectedTransaction.refType || selectedTransaction.refNo) && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.375rem'
                }}>
                  {selectedTransaction.refType && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>{t.refType}:</strong> {selectedTransaction.refType}
                    </div>
                  )}
                  {selectedTransaction.refNo && (
                    <div>
                      <strong>{t.refNo}:</strong> {selectedTransaction.refNo}
                    </div>
                  )}
                </div>
              )}

              {/* 은행 정보 */}
              {(selectedTransaction.bankName || selectedTransaction.accountNo) && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.375rem'
                }}>
                  {selectedTransaction.bankName && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>{t.bank}:</strong> {selectedTransaction.bankName}
                    </div>
                  )}
                  {selectedTransaction.accountNo && (
                    <div>
                      <strong>{t.account}:</strong> {selectedTransaction.accountNo}
                    </div>
                  )}
                </div>
              )}

              {/* 메모 */}
              {selectedTransaction.note && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fef3c7',
                  borderRadius: '0.375rem'
                }}>
                  <strong>{t.note}:</strong> {selectedTransaction.note}
                </div>
              )}

              {/* 등록 정보 */}
              <div style={{
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>{t.createdBy}:</strong> {selectedTransaction.createdBy}
                </div>
                <div>
                  <strong>{t.createdAt}:</strong> {new Date(selectedTransaction.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* 닫기 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTransaction(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 표준화된 모바일 하단 네비게이션 */}
      <MobileBottomNav locale={locale} />
    </div>
  );
}