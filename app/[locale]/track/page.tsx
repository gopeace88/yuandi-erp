/**
 * 주문 조회 페이지 - 단순화 버전
 */

'use client';

import { useState } from 'react';

interface TrackPageProps {
  params: { locale: string };
}

export default function TrackPage({ params: { locale } }: TrackPageProps) {
  const [customerName, setcustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!customerName.trim() || !phoneNumber.trim()) {
      setError(locale === 'ko' ? '이름과 전화번호를 입력하세요' : '请输入姓名和电话号码');
      return;
    }

    setIsLoading(true);
    setError('');
    
    // 시뮬레이션
    setTimeout(() => {
      const mockOrders = [
        {
          id: '1',
          orderNumber: 'ORD-240101-001',
          status: 'done',
          orderDate: '2024-01-01',
          totalAmount: 125000,
          productName: locale === 'ko' ? '상품 A' : '产品 A'
        },
        {
          id: '2',
          orderNumber: 'ORD-240115-002',
          status: 'shipped',
          orderDate: '2024-01-15',
          totalAmount: 89000,
          productName: locale === 'ko' ? '상품 B' : '产品 B'
        }
      ];

      setOrders(mockOrders);
      setSearchPerformed(true);
      setIsLoading(false);
    }, 1000);
  };

  const getStatusText = (status: string) => {
    const statusTexts: Record<string, Record<string, string>> = {
      paid: { ko: '결제완료', 'zh-CN': '已付款' },
      shipped: { ko: '배송중', 'zh-CN': '配送中' },
      done: { ko: '배송완료', 'zh-CN': '已送达' },
      refunded: { ko: '환불완료', 'zh-CN': '已退款' },
      cancelled: { ko: '취소됨', 'zh-CN': '已取消' }
    };
    return statusTexts[status]?.[locale] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'blue',
      shipped: 'yellow',
      done: 'green',
      refunded: 'gray',
      cancelled: 'red'
    };
    return colors[status] || 'gray';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      {/* Header */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            {locale === 'ko' ? '주문 조회' : locale === 'zh-CN' ? '订单查询' : 'Order Tracking'}
          </h1>
          <p style={{ color: '#6b7280' }}>
            {locale === 'ko' ? '이름과 전화번호로 주문을 조회하세요' : 
             locale === 'zh-CN' ? '请输入姓名和电话号码查询订单' : 
             'Enter your name and phone number to track orders'}
          </p>
        </div>

        {/* Search Form */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {locale === 'ko' ? '이름' : locale === 'zh-CN' ? '姓名' : 'Name'}
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setcustomerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem'
                }}
                disabled={isLoading}
                autoComplete="name"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {locale === 'ko' ? '전화번호' : locale === 'zh-CN' ? '电话号码' : 'Phone Number'}
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="010-1234-5678"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem'
                }}
                disabled={isLoading}
                autoComplete="tel"
                inputMode="tel"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>
          
          {error && (
            <div style={{
              color: '#dc2626',
              backgroundColor: '#fee2e2',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}
          
          <button
            onClick={handleSearch}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
              color: 'white',
              borderRadius: '0.375rem',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 
              (locale === 'ko' ? '검색 중...' : locale === 'zh-CN' ? '搜索中...' : 'Searching...') :
              (locale === 'ko' ? '주문 조회' : locale === 'zh-CN' ? '查询订单' : 'Search Orders')
            }
          </button>
        </div>

        {/* Search Results */}
        {searchPerformed && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              {locale === 'ko' ? '최근 주문' : locale === 'zh-CN' ? '最近订单' : 'Recent Orders'}
            </h2>
            
            {orders.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: '3rem',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <p style={{ color: '#6b7280' }}>
                  {locale === 'ko' ? '주문을 찾을 수 없습니다' : 
                   locale === 'zh-CN' ? '未找到订单' : 
                   'No orders found'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      backgroundColor: 'white',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ fontWeight: '600' }}>{order.orderNumber}</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{order.orderDate}</p>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: `var(--color-${getStatusColor(order.status)}-100, #e5e7eb)`,
                        color: `var(--color-${getStatusColor(order.status)}-800, #374151)`,
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                      <p>{order.productName}</p>
                      <p style={{ fontWeight: '600', marginTop: '0.5rem' }}>
                        {locale === 'ko' ? `₩${order.totalAmount.toLocaleString()}` : 
                         locale === 'zh-CN' ? `¥${(order.totalAmount / 170).toFixed(2)}` : 
                         `$${(order.totalAmount / 1200).toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Back to Home */}
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <a
            href={`/${locale}`}
            style={{
              color: '#2563eb',
              textDecoration: 'none'
            }}
          >
            ← {locale === 'ko' ? '홈으로 돌아가기' : locale === 'zh-CN' ? '返回首页' : 'Back to Home'}
          </a>
        </div>
      </div>
    </div>
  );
}