/**
 * 주문 조회 페이지 - 고객용 주문 추적
 */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface TrackPageProps {
  params: { locale: string };
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price_krw: number;
  total_price_krw: number;
  products: {
    name_ko: string;
    name_zh: string;
    model: string;
    sku: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  pccc?: string;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  status: string;
  total_krw: number;
  created_at: string;
  order_items: OrderItem[];
  shipments?: {
    korea_tracking_number?: string;
    china_tracking_number?: string;
    korea_shipping_company?: string;
    china_shipping_company?: string;
    courier?: string;
    tracking_number?: string;
    status?: string;
  }[];
}

export default function TrackPage({ params: { locale } }: TrackPageProps) {
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
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
    
    try {
      const supabase = createClient();
      
      // 전화번호 형식 정규화 (하이픈 제거)
      const normalizedPhone = phoneNumber.replace(/-/g, '');
      
      // 주문 조회
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          pccc,
          shipping_address_line1,
          shipping_address_line2,
          status,
          total_krw,
          created_at,
          order_items (
            id,
            product_id,
            quantity,
            price_krw,
            total_price_krw,
            products (
              name_ko,
              name_zh,
              model,
              sku
            )
          ),
          shipments (
            korea_tracking_number,
            china_tracking_number,
            korea_shipping_company,
            china_shipping_company,
            courier,
            tracking_number,
            status
          )
        `)
        .ilike('customer_name', `%${customerName.trim()}%`)
        .or(`customer_phone.ilike.%${normalizedPhone}%,customer_phone.ilike.%${phoneNumber}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ordersError) {
        console.error('Order search error:', ordersError);
        setError(locale === 'ko' ? '주문 조회 중 오류가 발생했습니다' : '查询订单时出错');
        return;
      }

      setOrders(ordersData || []);
      setSearchPerformed(true);
    } catch (err) {
      console.error('Search error:', err);
      setError(locale === 'ko' ? '주문 조회 중 오류가 발생했습니다' : '查询订单时出错');
    } finally {
      setIsLoading(false);
    }
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
      paid: '#3b82f6',
      shipped: '#eab308',
      done: '#22c55e',
      refunded: '#6b7280',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (locale === 'ko') {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
  };

  const formatCurrency = (amount: number) => {
    if (locale === 'ko') {
      return `₩${amount.toLocaleString('ko-KR')}`;
    } else {
      return `¥${(amount / 170).toFixed(2)}`;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      {/* Header */}
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {locale === 'ko' ? '주문 조회' : '订单查询'}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {locale === 'ko' ? '이름과 전화번호로 주문을 조회하세요' : '请输入姓名和电话号码查询订单'}
          </p>
        </div>

        {/* Search Form */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          margin: '0 auto 2rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                {locale === 'ko' ? '이름' : '姓名'}
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
                disabled={isLoading}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                {locale === 'ko' ? '전화번호' : '电话号码'}
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
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
                disabled={isLoading}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
          
          {error && (
            <div style={{
              color: '#dc2626',
              backgroundColor: '#fee2e2',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}
          
          <button
            onClick={handleSearch}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.625rem',
              backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
              color: 'white',
              borderRadius: '0.375rem',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {isLoading ? 
              (locale === 'ko' ? '검색 중...' : '搜索中...') :
              (locale === 'ko' ? '주문 조회' : '查询订单')
            }
          </button>
        </div>

        {/* Search Results */}
        {searchPerformed && (
          <div>
            {orders.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: '3rem',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <p style={{ color: '#6b7280' }}>
                  {locale === 'ko' ? '주문을 찾을 수 없습니다' : '未找到订单'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '0.5rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Compact Order Header */}
                    <div style={{
                      padding: '1rem 1.25rem',
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: '#f9fafb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {locale === 'ko' ? '주문번호' : '订单号'}
                          </span>
                          <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                            {order.order_number}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {locale === 'ko' ? '주문일' : '订单日期'}
                          </span>
                          <p style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <div style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: getStatusColor(order.status) + '20',
                        color: getStatusColor(order.status),
                        borderRadius: '0.375rem',
                        fontWeight: '600',
                        fontSize: '0.75rem'
                      }}>
                        {getStatusText(order.status)}
                      </div>
                    </div>

                    {/* Compact Customer & Product Info */}
                    <div style={{ padding: '1rem 1.25rem' }}>
                      {/* Customer Info - 한 줄로 표시 */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: order.pccc ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', 
                        gap: '1rem',
                        marginBottom: '1rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid #f3f4f6'
                      }}>
                        <div>
                          <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            {locale === 'ko' ? '주문자' : '订购人'}
                          </span>
                          <p style={{ fontWeight: '500', fontSize: '0.875rem', marginTop: '0.125rem' }}>
                            {order.customer_name}
                          </p>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            {locale === 'ko' ? '전화번호' : '电话号码'}
                          </span>
                          <p style={{ fontWeight: '500', fontSize: '0.875rem', marginTop: '0.125rem' }}>
                            {order.customer_phone}
                          </p>
                        </div>
                        {order.pccc && (
                          <div>
                            <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                              {locale === 'ko' ? '개인통관번호' : '个人通关号'}
                            </span>
                            <p style={{ fontWeight: '500', fontSize: '0.875rem', marginTop: '0.125rem' }}>
                              {order.pccc}
                            </p>
                          </div>
                        )}
                        <div>
                          <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            {locale === 'ko' ? '배송지' : '收货地址'}
                          </span>
                          <p style={{ fontWeight: '500', fontSize: '0.875rem', marginTop: '0.125rem' }}>
                            {order.shipping_address_line1}
                            {order.shipping_address_line2 && ` ${order.shipping_address_line2}`}
                          </p>
                        </div>
                      </div>

                      {/* Order Items - 간결하게 */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <h4 style={{ fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                            {locale === 'ko' ? '주문 상품' : '订购商品'}
                          </h4>
                          <span style={{ fontWeight: '700', fontSize: '1rem', color: '#2563eb' }}>
                            {formatCurrency(order.total_krw)}
                          </span>
                        </div>
                        {order.order_items?.map((item) => (
                          <div key={item.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.5rem',
                            backgroundColor: '#f9fafb',
                            borderRadius: '0.25rem',
                            marginBottom: '0.25rem'
                          }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                              <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                                {locale === 'ko' ? item.products?.name_ko : item.products?.name_zh}
                              </span>
                              <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                {item.products?.model} × {item.quantity}
                              </span>
                            </div>
                            <span style={{ fontWeight: '500', fontSize: '0.75rem', color: '#6b7280' }}>
                              {formatCurrency(item.total_price_krw)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Shipping Info - 한국 택배 정보만 간단히 */}
                      {order.shipments && order.shipments.length > 0 && order.shipments[0].korea_tracking_number && (
                        <div style={{ 
                          padding: '0.75rem',
                          backgroundColor: '#f0f9ff',
                          borderRadius: '0.375rem',
                          marginBottom: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ fontWeight: '600', fontSize: '0.75rem', color: '#0369a1' }}>
                            {locale === 'ko' ? '배송 정보' : '配送信息'}:
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#0c4a6e' }}>
                            {order.shipments[0].korea_shipping_company} {order.shipments[0].korea_tracking_number}
                          </span>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Back to Home */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a
            href={`/${locale}`}
            style={{
              color: '#2563eb',
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            ← {locale === 'ko' ? '홈으로 돌아가기' : '返回首页'}
          </a>
        </div>
      </div>
    </div>
  );
}