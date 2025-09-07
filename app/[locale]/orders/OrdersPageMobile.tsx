/**
 * 모바일 최적화된 주문 관리 페이지
 * 카드 레이아웃으로 가독성 향상
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileBottomNav } from '@/components/Navigation';

interface OrdersPageProps {
  params: { locale: string };
}

interface Order {
  id: string;
  orderNo: string;
  orderDate: string;
  customerName: string;
  customerPhone: string;
  pcccCode: string;
  shippingAddress: string;
  zipCode: string;
  status: 'paid' | 'shipped' | 'delivered' | 'refunded';
  totalAmount: number;
  productName: string;
  productSku: string;
  quantity: number;
}

export default function OrdersPage({ params: { locale } }: OrdersPageProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const itemsPerPage = 20;

  // 다국어 텍스트
  const tMessages = {
    ko: {
      title: '주문 관리',
      search: '주문 검색...',
      filter: '상태 필터',
      all: '전체',
      newOrder: '새 주문',
      orderNo: '주문번호',
      orderDate: '주문일',
      customer: '고객',
      status: '상태',
      amount: '금액',
      product: '상품',
      quantity: '수량',
      address: '배송지',
      actions: '작업',
      ship: '배송 등록',
      complete: '완료',
      refund: '환불',
      noOrders: '주문이 없습니다',
      paid: '결제완료',
      shipped: '배송중',
      delivered: '완료',
      refunded: '환불',
    },
    'zh-CN': {
      title: '订单管理',
      search: '搜索订单...',
      filter: '状态筛选',
      all: '全部',
      newOrder: '新订单',
      orderNo: '订单号',
      orderDate: '订单日期',
      customer: '客户',
      status: '状态',
      amount: '金额',
      product: '产品',
      quantity: '数量',
      address: '配送地址',
      actions: '操作',
      ship: '配送登记',
      complete: '完成',
      refund: '退款',
      noOrders: '没有订单',
      paid: '已付款',
      shipped: '配送中',
      delivered: '完成',
      refunded: '已退款',
    }
  };
  const t = tMessages[locale as keyof typeof tMessages] || tMessages.ko;

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await fetch('/api/orders', {
        headers: { 'Accept-Language': locale }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const data = await response.json();
      console.log('📱 모바일: API 응답 데이터:', data);
      
      // API 응답 구조: { orders: [], total: 0, page: 1, limit: 20 }
      const ordersArray = data.orders || data;
      
      if (!Array.isArray(ordersArray)) {
        console.error('❌ 주문 데이터가 배열이 아닙니다:', typeof ordersArray, ordersArray);
        setOrders([]);
        return;
      }
      
      const transformedOrders = ordersArray.map((order: any) => ({
        id: order.id,
        orderNo: order.order_no || order.order_number,
        orderDate: order.order_date || order.created_at,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerEmail: order.customer_email,
        pcccCode: order.pccc_code || order.pccc,
        shippingAddress: order.shipping_address || order.shipping_address_line1,
        shippingAddressDetail: order.shipping_address_detail || order.shipping_address_line2,
        zipCode: order.zip_code || order.shipping_postal_code,
        status: order.status,
        totalAmount: order.total_amount || order.total_krw,
        productName: order.order_items?.[0]?.product_name || order.order_items?.[0]?.product?.name || '',
        productSku: order.order_items?.[0]?.sku || order.order_items?.[0]?.product?.sku || '',
        quantity: order.order_items?.[0]?.quantity || 0,
      }));
      
      setOrders(transformedOrders);
    } catch (error) {
      console.error('주문 로드 실패:', error);
      setOrders([]);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone.includes(searchTerm) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionButton = (order: Order) => {
    switch(order.status) {
      case 'paid':
        return (
          <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium">
            {t.ship}
          </button>
        );
      case 'shipped':
        return (
          <button className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium">
            {t.complete}
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{t.title}</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
            >
              + {t.newOrder}
            </button>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t.all}</option>
            <option value="paid">{t.paid}</option>
            <option value="shipped">{t.shipped}</option>
            <option value="delivered">{t.delivered}</option>
            <option value="refunded">{t.refunded}</option>
          </select>
        </div>
      </div>

      {/* 주문 목록 */}
      <div className="px-4 sm:px-6 lg:px-8 pb-6">
        {currentOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {t.noOrders}
          </div>
        ) : (
          <>
            {/* 모바일 카드 레이아웃 */}
            <div className="space-y-4">
              {currentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer"
                  onClick={() => handleOrderClick(order)}
                >
                  {/* 카드 헤더 */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">{order.orderDate}</p>
                        <p className="text-base font-semibold text-gray-900 mt-1">{order.customerName}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {t[order.status as keyof typeof t]}
                      </span>
                    </div>
                  </div>

                  {/* 카드 본문 */}
                  <div className="px-4 py-3 space-y-2">
                    {/* 전화번호 */}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">{t.customer}</span>
                      <span className="text-sm text-gray-900">{order.customerPhone}</span>
                    </div>

                    {/* 금액 */}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">{t.amount}</span>
                      <span className="text-base font-bold text-blue-600">
                        {locale === 'ko' ? '₩' : '¥'}{order.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {locale === 'ko' ? '이전' : '上一页'}
                  </button>
                  
                  {/* 페이지 번호 표시 */}
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 rounded-md text-sm font-medium ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {locale === 'ko' ? '다음' : '下一页'}
                  </button>
                </div>
              </div>
            )}

            {/* 데스크탑 테이블 레이아웃 제거 - 모바일 페이지는 항상 카드 뷰만 사용
            <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.orderNo}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.orderDate}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.customer}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.product}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.status}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.amount}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.orderNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.orderDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{order.customerName}</p>
                          <p className="text-sm text-gray-500">{order.customerPhone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{order.productName}</p>
                          <p className="text-sm text-gray-500">수량: {order.quantity}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {t[order.status as keyof typeof t]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        ₩{order.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                          {order.status === 'paid' ? t.ship : order.status === 'shipped' ? t.complete : '상세'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div> */}
          </>
        )}
      </div>

      {/* 주문 상세 모달 */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {locale === 'ko' ? '주문 상세' : '订单详情'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">{t.orderNo}</p>
                  <p className="text-base font-medium">{selectedOrder.orderNo}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">{t.orderDate}</p>
                  <p className="text-base">{selectedOrder.orderDate}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">{t.customer}</p>
                  <p className="text-base font-medium">{selectedOrder.customerName}</p>
                  <p className="text-sm">{selectedOrder.customerPhone}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">{t.product}</p>
                  <p className="text-base font-medium">{selectedOrder.productName}</p>
                  <p className="text-sm">{t.quantity}: {selectedOrder.quantity}개</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">{t.address}</p>
                  <p className="text-base">{selectedOrder.shippingAddress}</p>
                  <p className="text-sm">{locale === 'ko' ? '우편번호' : '邮编'}: {selectedOrder.zipCode}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">{t.amount}</p>
                  <p className="text-lg font-bold text-blue-600">
                    {locale === 'ko' ? '₩' : '¥'}{selectedOrder.totalAmount.toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">{t.status}</p>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                    {t[selectedOrder.status as keyof typeof t]}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex flex-col gap-2">
                {selectedOrder.status === 'paid' && (
                  <>
                    <button
                      onClick={() => {
                        // sessionStorage에 주문 정보 저장
                        sessionStorage.setItem('pendingShipment', JSON.stringify(selectedOrder));
                        // 배송관리 페이지로 이동
                        router.push(`/${locale}/shipments`);
                      }}
                      className="w-full px-4 py-2 bg-amber-500 text-white rounded-md font-medium"
                    >
                      {locale === 'ko' ? '배송등록' : '配送登记'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(locale === 'ko' ? '정말 주문을 취소하시겠습니까?\n취소 시 출납장부에 환불 기록이 추가됩니다.' : '确定要取消订单吗？\n取消后将在现金日记账中添加退款记录。')) {
                          // 주문 취소 처리
                          console.log('주문 취소:', selectedOrder.orderNo);
                          console.log('환불 금액:', selectedOrder.totalAmount);
                          alert(locale === 'ko' ? '주문이 취소되었습니다.' : '订单已取消');
                          setShowDetailModal(false);
                        }
                      }}
                      className="w-full px-4 py-2 bg-red-500 text-white rounded-md font-medium"
                    >
                      {locale === 'ko' ? '주문취소' : '取消订单'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium"
                >
                  {locale === 'ko' ? '닫기' : '关闭'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 표준화된 모바일 하단 네비게이션 */}
      <MobileBottomNav locale={locale} />
    </div>
  );
}