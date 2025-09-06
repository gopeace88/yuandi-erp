/**
 * 모바일 최적화된 주문 관리 페이지
 * 카드 레이아웃으로 가독성 향상
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  status: 'PAID' | 'SHIPPED' | 'DONE' | 'REFUNDED';
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

  // 다국어 텍스트
  const t = {
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
      PAID: '결제완료',
      SHIPPED: '배송중',
      DONE: '완료',
      REFUNDED: '환불',
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
      PAID: '已付款',
      SHIPPED: '配送中',
      DONE: '完成',
      REFUNDED: '已退款',
    }
  }[locale] || t.ko;

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    // 목 데이터
    const mockOrders: Order[] = [
      {
        id: '1',
        orderNo: 'ORD-240105-001',
        orderDate: '2024-01-05',
        customerName: '김철수',
        customerPhone: '010-1234-5678',
        pcccCode: 'P123456789012',
        shippingAddress: '서울시 강남구 테헤란로 123',
        zipCode: '06234',
        status: 'PAID',
        totalAmount: 125000,
        productName: '프리미엄 가방',
        productSku: 'BAG-001',
        quantity: 1,
      },
      {
        id: '2',
        orderNo: 'ORD-240105-002',
        orderDate: '2024-01-05',
        customerName: '이영희',
        customerPhone: '010-2345-6789',
        pcccCode: 'P234567890123',
        shippingAddress: '서울시 서초구 서초대로 456',
        zipCode: '06578',
        status: 'SHIPPED',
        totalAmount: 89000,
        productName: '스마트 워치',
        productSku: 'WATCH-001',
        quantity: 1,
      },
      {
        id: '3',
        orderNo: 'ORD-240105-003',
        orderDate: '2024-01-05',
        customerName: '박지민',
        customerPhone: '010-3456-7890',
        pcccCode: 'P345678901234',
        shippingAddress: '서울시 송파구 올림픽로 789',
        zipCode: '05502',
        status: 'DONE',
        totalAmount: 67000,
        productName: '화장품 세트',
        productSku: 'COSM-001',
        quantity: 2,
      },
    ];
    setOrders(mockOrders);
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PAID': return 'bg-blue-100 text-blue-800';
      case 'SHIPPED': return 'bg-yellow-100 text-yellow-800';
      case 'DONE': return 'bg-green-100 text-green-800';
      case 'REFUNDED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionButton = (order: Order) => {
    switch(order.status) {
      case 'PAID':
        return (
          <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium">
            {t.ship}
          </button>
        );
      case 'SHIPPED':
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
    <div className="min-h-screen bg-gray-100">
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
            <option value="PAID">{t.PAID}</option>
            <option value="SHIPPED">{t.SHIPPED}</option>
            <option value="DONE">{t.DONE}</option>
            <option value="REFUNDED">{t.REFUNDED}</option>
          </select>
        </div>
      </div>

      {/* 주문 목록 */}
      <div className="px-4 sm:px-6 lg:px-8 pb-6">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {t.noOrders}
          </div>
        ) : (
          <>
            {/* 모바일 카드 레이아웃 (작은 화면) */}
            <div className="block lg:hidden space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* 카드 헤더 */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-base font-semibold text-gray-900">{order.orderNo}</p>
                        <p className="text-sm text-gray-500 mt-1">{order.orderDate}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {t[order.status as keyof typeof t]}
                      </span>
                    </div>
                  </div>

                  {/* 카드 본문 */}
                  <div className="px-4 py-4 space-y-3">
                    {/* 고객 정보 */}
                    <div>
                      <p className="text-sm text-gray-500">{t.customer}</p>
                      <p className="text-base font-medium text-gray-900">{order.customerName}</p>
                      <p className="text-sm text-gray-600">{order.customerPhone}</p>
                    </div>

                    {/* 상품 정보 */}
                    <div>
                      <p className="text-sm text-gray-500">{t.product}</p>
                      <p className="text-base font-medium text-gray-900">{order.productName}</p>
                      <p className="text-sm text-gray-600">{t.quantity}: {order.quantity}개</p>
                    </div>

                    {/* 금액 */}
                    <div>
                      <p className="text-sm text-gray-500">{t.amount}</p>
                      <p className="text-lg font-bold text-blue-600">₩{order.totalAmount.toLocaleString()}</p>
                    </div>

                    {/* 배송지 */}
                    <div>
                      <p className="text-sm text-gray-500">{t.address}</p>
                      <p className="text-sm text-gray-700">{order.shippingAddress}</p>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="pt-3">
                      {getActionButton(order)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 데스크탑 테이블 레이아웃 (큰 화면) */}
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
                          {order.status === 'PAID' ? t.ship : order.status === 'SHIPPED' ? t.complete : '상세'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}