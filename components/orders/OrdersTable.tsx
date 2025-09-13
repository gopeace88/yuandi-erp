/**
 * 주문 테이블 공통 컴포넌트
 * 대시보드와 배송관리에서 공통으로 사용
 */

import React from 'react';
import { useRouter } from 'next/navigation';

interface OrderItem {
  productName: string;
  productModel?: string;
  quantity: number;
}

interface Order {
  id: string;
  orderNo?: string;
  order_number?: string;
  customerName?: string;
  name?: string;
  customerPhone?: string;
  phone?: string;
  shippingAddress?: string;
  amount?: string;
  items?: OrderItem[];
  product?: string;
  model?: string;
  status: string;
  total_krw?: number;
}

interface OrdersTableProps {
  orders: Order[];
  locale: string;
  isMobile: boolean;
  currentPage?: number;
  itemsPerPage?: number;
  onOrderClick?: (order: Order) => void;
}

export function OrdersTable({ 
  orders, 
  locale, 
  isMobile,
  currentPage = 1,
  itemsPerPage = 10,
  onOrderClick
}: OrdersTableProps) {
  const router = useRouter();

  // 상태별 색상 정의
  const getStatusColors = (status: string) => {
    const statusColors = {
      'paid': { bg: '#dbeafe', color: '#1e40af', text: locale === 'ko' ? '결제완료' : locale === 'zh-CN' ? '已付款' : 'Paid' },
      'shipped': { bg: '#fef3c7', color: '#92400e', text: locale === 'ko' ? '배송중' : locale === 'zh-CN' ? '配送中' : 'Shipping' },
      'done': { bg: '#d1fae5', color: '#065f46', text: locale === 'ko' ? '배송완료' : locale === 'zh-CN' ? '配送完成' : 'Completed' },
      'delivered': { bg: '#d1fae5', color: '#065f46', text: locale === 'ko' ? '배송완료' : locale === 'zh-CN' ? '配送完成' : 'Completed' },
      'refunded': { bg: '#fee2e2', color: '#991b1b', text: locale === 'ko' ? '환불' : locale === 'zh-CN' ? '已退款' : 'Refunded' }
    };
    
    return statusColors[status as keyof typeof statusColors] || 
      { bg: '#f3f4f6', color: '#374151', text: status || 'Unknown' };
  };

  // 클릭 핸들러
  const handleOrderClick = (order: Order) => {
    if (onOrderClick) {
      onOrderClick(order);
    } else {
      // 기본 동작: 배송관리 페이지로 이동
      let tab = '';
      let action = '';
      
      switch(order.status) {
        case 'paid':
          tab = 'ready';
          action = 'register';
          break;
        case 'shipped':
          tab = 'shipping';
          action = 'update';
          break;
        case 'done':
        case 'delivered':
          tab = 'completed';
          action = 'view';
          break;
        case 'refunded':
          tab = 'refunded';
          action = 'view';
          break;
        default:
          tab = 'ready';
          action = 'view';
      }
      
      router.push(`/${locale}/shipments?orderId=${order.id}&tab=${tab}&action=${action}`);
    }
  };

  // 페이지네이션 적용
  const paginatedOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 모바일 카드 뷰
  if (isMobile) {
    return (
      <div className="md:hidden">
        {paginatedOrders.map((order, index) => {
          const status = getStatusColors(order.status);
          const orderNo = order.orderNo || order.order_number || '';
          const customerName = order.customerName || order.name || '';
          const customerPhone = order.customerPhone || order.phone || '';
          const address = order.shippingAddress || '-';
          
          return (
            <div
              key={order.id || index}
              style={{
                padding: '1rem',
                borderBottom: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onClick={() => handleOrderClick(order)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* 상단 헤더: 주문번호와 상태 */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span style={{ color: '#2563eb', fontWeight: '600', fontSize: '0.875rem' }}>
                    {orderNo}
                  </span>
                  <span style={{
                    marginLeft: '0.5rem',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    backgroundColor: status.bg,
                    color: status.color
                  }}>
                    {status.text}
                  </span>
                </div>
              </div>
              
              {/* 고객 정보 및 상품 */}
              <div className="space-y-1">
                <div className="text-sm text-gray-800">
                  {customerName} / {customerPhone}
                </div>
                <div className="text-xs text-gray-600">
                  {address}
                </div>
                <div className="mt-2 space-y-1">
                  {order.items ? (
                    order.items.map((item, idx) => (
                      <div key={idx} className="text-xs border-t pt-1">
                        <div className="font-medium text-gray-900">
                          {item.productName} {item.productModel ? `/ ${item.productModel}` : ''} ×{item.quantity}
                        </div>
                      </div>
                    ))
                  ) : order.product ? (
                    <div className="text-xs border-t pt-1">
                      <div className="font-medium text-gray-900">
                        {order.product.split(',')[0]} {order.model && order.model.split(',')[0] ? `/ ${order.model.split(',')[0]}` : ''} 
                        {order.product.split(',').length > 1 && (
                          <span className="text-gray-600">
                            {' '}{locale === 'ko' ? `외 ${order.product.split(',').length - 1}건` : `等 ${order.product.split(',').length - 1}件`}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 데스크탑 테이블 뷰
  return (
    <div className="hidden md:block" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
              {locale === 'ko' ? '주문번호' : locale === 'zh-CN' ? '订单号' : 'Order No'}
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
              {locale === 'ko' ? '고객' : locale === 'zh-CN' ? '客户' : 'Customer'}
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
              {locale === 'ko' ? '전화번호' : locale === 'zh-CN' ? '电话号码' : 'Phone'}
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
              {locale === 'ko' ? '주소' : locale === 'zh-CN' ? '地址' : 'Address'}
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
              {locale === 'ko' ? '상품' : locale === 'zh-CN' ? '商品' : 'Items'}
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
              {locale === 'ko' ? '모델명' : locale === 'zh-CN' ? '型号' : 'Model'}
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>
              {locale === 'ko' ? '상태' : locale === 'zh-CN' ? '状态' : 'Status'}
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedOrders.map((order, index) => {
            const status = getStatusColors(order.status);
            const orderNo = order.orderNo || order.order_number || '';
            const customerName = order.customerName || order.name || '';
            const customerPhone = order.customerPhone || order.phone || '';
            const address = order.shippingAddress || '-';
            
            return (
              <tr 
                key={order.id || index}
                style={{ 
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer'
                }}
                onClick={() => handleOrderClick(order)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td style={{ padding: '0.75rem', color: '#2563eb', fontWeight: '500' }}>
                  {orderNo}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ fontWeight: '500' }}>{customerName}</div>
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  {customerPhone}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                  {address}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  {order.items ? (
                    order.items.map((item, idx) => (
                      <div key={idx} style={{ fontSize: '0.875rem' }}>
                        {item.productName} x {item.quantity}
                      </div>
                    ))
                  ) : order.product ? (
                    order.product.split(',').map((product: string, idx: number) => (
                      <div key={idx} style={{ fontSize: '0.875rem' }}>
                        {product.trim()} 
                      </div>
                    ))
                  ) : null}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  {order.items ? (
                    order.items.map((item, idx) => (
                      <div key={idx} style={{ fontSize: '0.875rem' }}>
                        {item.productModel || '-'}
                      </div>
                    ))
                  ) : order.model ? (
                    order.model.split(',').map((model: string, idx: number) => (
                      <div key={idx} style={{ fontSize: '0.875rem' }}>
                        {model.trim() || '-'}
                      </div>
                    ))
                  ) : null}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    backgroundColor: status.bg,
                    color: status.color
                  }}>
                    {status.text}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}