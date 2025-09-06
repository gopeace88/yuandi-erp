/**
 * 주문 관리 페이지
 * PRD v2.0: 주문 생성, 목록 조회, 상태 변경
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { exportToExcel } from '@/lib/utils/excel';
import OrdersPageMobile from './OrdersPageMobile';
import Pagination from '@/components/common/Pagination';

interface OrdersPageProps {
  params: { locale: string };
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  model: string;
  color: string;
  brand: string;
  onHand: number;
  salePrice: number;
  image_url?: string;
}

interface Order {
  id: string;
  orderNo: string;
  orderDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pcccCode: string;
  shippingAddress: string;
  shippingAddressDetail?: string;
  zipCode: string;
  status: 'PAID' | 'SHIPPED' | 'DONE' | 'CANCELLED' | 'REFUNDED';
  totalAmount: number;
  productName: string;
  productSku: string;
  quantity: number;
}

export default function OrdersPage({ params: { locale } }: OrdersPageProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // 페이지당 20개 항목 표시
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 새 주문 폼 상태
  const [newOrder, setNewOrder] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    kakaoId: '',  // 아이디 (카카오톡 등)
    pcccCode: '',
    shippingAddress: '',
    shippingAddressDetail: '',
    zipCode: '',
    productId: '',
    quantity: 1,
    customerMemo: '',
  });

  // 다국어 텍스트
  const t = {
    ko: {
      title: '주문 관리',
      createOrder: '새 주문',
      orderNo: '주문번호',
      orderDate: '주문일',
      customerName: '고객명',
      customerPhone: '전화번호',
      status: '상태',
      totalAmount: '금액',
      actions: '작업',
      search: '검색',
      filter: '필터',
      all: '전체',
      paid: '결제완료',
      shipped: '배송중',
      done: '완료',
      cancelled: '취소',
      refunded: '환불',
      noOrders: '주문이 없습니다',
      createNewOrder: '새 주문 생성',
      customerInfo: '고객 정보',
      shippingInfo: '배송 정보',
      productInfo: '상품 정보',
      email: '이메일',
      kakaoId: '아이디',
      pccc: '해외통관부호',
      address: '주소',
      searchAddress: '주소 검색',
      addressDetail: '상세주소',
      zipCode: '우편번호',
      selectProduct: '상품 선택',
      quantity: '수량',
      stock: '재고',
      price: '가격',
      memo: '메모',
      cancel: '취소',
      save: '저장',
      processing: '처리중...',
      orderDetail: '주문 상세',
      changeStatus: '상태 변경',
      shipOrder: '송장 등록',
      completeOrder: '완료 처리',
      cancelOrder: '주문 취소',
      refundOrder: '환불 처리',
      trackingNo: '송장번호',
      courier: '택배사',
      close: '닫기',
    },
    'zh-CN': {
      title: '订单管理',
      createOrder: '新订单',
      orderNo: '订单号',
      orderDate: '订单日期',
      customerName: '客户姓名',
      customerPhone: '电话',
      status: '状态',
      totalAmount: '金额',
      actions: '操作',
      search: '搜索',
      filter: '筛选',
      all: '全部',
      paid: '已付款',
      shipped: '配送中',
      done: '完成',
      cancelled: '已取消',
      refunded: '已退款',
      noOrders: '没有订单',
      createNewOrder: '创建新订单',
      customerInfo: '客户信息',
      shippingInfo: '配送信息',
      productInfo: '产品信息',
      email: '电子邮件',
      kakaoId: 'ID',
      pccc: '海外通关号',
      address: '地址',
      searchAddress: '搜索地址',
      addressDetail: '详细地址',
      zipCode: '邮政编码',
      selectProduct: '选择产品',
      quantity: '数量',
      stock: '库存',
      price: '价格',
      memo: '备注',
      cancel: '取消',
      save: '保存',
      processing: '处理中...',
      orderDetail: '订单详情',
      changeStatus: '更改状态',
      shipOrder: '登记运单',
      completeOrder: '完成处理',
      cancelOrder: '取消订单',
      refundOrder: '退款处理',
      trackingNo: '运单号',
      courier: '快递公司',
      close: '关闭',
    }
  };

  const texts = t[locale as keyof typeof t] || t.ko;

  // 모바일 체크
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 사용자 권한 체크
  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    if (!userRole) {
      router.push(`/${locale}`);
      return;
    }
    if (userRole === 'ShipManager') {
      router.push(`/${locale}/shipments`);
      return;
    }
  }, [locale, router]);

  // 데이터 로드
  useEffect(() => {
    loadOrders();
    loadProducts();
  }, []);

  // Daum 우편번호 API 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const loadOrders = async () => {
    try {
      const response = await api.orders.list();
      
      // API 응답을 페이지 인터페이스에 맞게 변환
      const transformedOrders = response.orders?.map((order: any) => ({
        id: order.id,
        orderNo: order.order_no,
        orderDate: order.order_date || order.created_at,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerEmail: order.customer_email,
        pcccCode: order.pccc_code,
        shippingAddress: order.shipping_address,
        shippingAddressDetail: order.shipping_address_detail,
        zipCode: order.zip_code,
        status: order.status,
        totalAmount: order.total_amount,
        productName: order.order_items?.[0]?.product_name || '',
        productSku: order.order_items?.[0]?.sku || '',
        quantity: order.order_items?.[0]?.quantity || 0,
      })) || [];
      
      setOrders(transformedOrders);
    } catch (error) {
      console.error('주문 로드 실패:', error);
      // 폴백으로 목 데이터 사용
      const mockOrders: Order[] = [
        {
          id: '1',
          orderNo: 'ORD-240105-001',
          orderDate: '2024-01-05',
          customerName: locale === 'ko' ? '김철수' : '张三',
          customerPhone: '010-1234-5678',
          customerEmail: 'kim@example.com',
          pcccCode: 'P123456789012',
          shippingAddress: locale === 'ko' ? '서울시 강남구 테헤란로 123' : '首尔市江南区德黑兰路123',
          shippingAddressDetail: locale === 'ko' ? '5층 501호' : '5楼501室',
          zipCode: '06234',
          status: 'PAID',
          totalAmount: 125000,
          productName: locale === 'ko' ? '프리미엄 가방' : '高级包',
          productSku: 'BAG-001',
          quantity: 1,
        },
        {
          id: '2',
          orderNo: 'ORD-240105-002',
          orderDate: '2024-01-05',
          customerName: locale === 'ko' ? '이영희' : '李四',
          customerPhone: '010-2345-6789',
          pcccCode: 'P234567890123',
          shippingAddress: locale === 'ko' ? '서울시 서초구 서초대로 456' : '首尔市瑞草区瑞草大路456',
          zipCode: '06578',
          status: 'SHIPPED',
          totalAmount: 89000,
          productName: locale === 'ko' ? '스마트 워치' : '智能手表',
          productSku: 'WATCH-001',
          quantity: 1,
        },
        {
          id: '3',
          orderNo: 'ORD-240105-003',
          orderDate: '2024-01-05',
          customerName: locale === 'ko' ? '박지민' : '王五',
          customerPhone: '010-3456-7890',
          pcccCode: 'P345678901234',
        shippingAddress: locale === 'ko' ? '서울시 송파구 올림픽로 789' : '首尔市松坡区奥林匹克路789',
        zipCode: '05502',
        status: 'DONE',
        totalAmount: 67000,
        productName: locale === 'ko' ? '화장품 세트' : '化妆品套装',
        productSku: 'COSM-001',
        quantity: 2,
      },
    ];
    setOrders(mockOrders);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.products.list({ active: true });
      
      // API 응답을 페이지 인터페이스에 맞게 변환
      const transformedProducts = response.products?.map((product: any) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        model: product.model || '',
        color: product.color || '',
        brand: product.brand || '',
        onHand: product.on_hand,
        salePrice: product.sale_price_krw || product.cost_cny * 165, // 환율 적용
        image_url: product.image_url
      })) || [];
      
      setProducts(transformedProducts);
    } catch (error) {
      console.error('제품 로드 실패:', error);
      // 폴백으로 목 데이터 사용
      const mockProducts: Product[] = [
        {
          id: '1',
          sku: 'BAG-001',
          name: locale === 'ko' ? '프리미엄 가방' : '高级包',
          category: locale === 'ko' ? '패션' : '时尚',
          model: 'LX2024',
          color: locale === 'ko' ? '검정' : '黑色',
          brand: 'YUANDI',
          onHand: 15,
          salePrice: 125000,
        },
        {
          id: '2',
          sku: 'WATCH-001',
          name: locale === 'ko' ? '스마트 워치' : '智能手表',
          category: locale === 'ko' ? '전자제품' : '电子产品',
          model: 'SW-100',
          color: locale === 'ko' ? '실버' : '银色',
          brand: 'TechBrand',
          onHand: 8,
          salePrice: 89000,
        },
        {
          id: '3',
          sku: 'COSM-001',
          name: locale === 'ko' ? '화장품 세트' : '化妆品套装',
          category: locale === 'ko' ? '뷰티' : '美容',
          model: 'Beauty-A',
          color: '-',
          brand: 'BeautyPlus',
          onHand: 25,
          salePrice: 67000,
        },
      ];
      setProducts(mockProducts);
    }
  };

  const handleCreateOrder = async () => {
    // 주문 생성 로직
    const selectedProduct = products.find(p => p.id === newOrder.productId);
    if (!selectedProduct) return;

    try {
      const orderData = {
        customer_name: newOrder.customerName,
        customer_phone: newOrder.customerPhone,
        customer_email: newOrder.customerEmail || null,
        customer_kakao_id: newOrder.kakaoId,  // 아이디 추가
        pccc_code: newOrder.pcccCode,
        shipping_address: newOrder.shippingAddress,
        shipping_address_detail: newOrder.shippingAddressDetail || null,
        zip_code: newOrder.zipCode,
        customer_memo: newOrder.customerMemo || null,
        items: [{
          product_id: selectedProduct.id,
          sku: selectedProduct.sku,
          product_name: selectedProduct.name,
          quantity: newOrder.quantity,
          unit_price: selectedProduct.salePrice
        }]
      };

      const response = await api.orders.create(orderData);
      
      // 주문 목록 새로고침
      await loadOrders();
      setShowCreateModal(false);
      resetNewOrderForm();
    } catch (error) {
      console.error('주문 생성 실패:', error);
      alert(locale === 'ko' ? '주문 생성에 실패했습니다.' : '订单创建失败');
    }
  };

  const resetNewOrderForm = () => {
    setNewOrder({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      kakaoId: '',
      pcccCode: '',
      shippingAddress: '',
      shippingAddressDetail: '',
      zipCode: '',
      productId: '',
      quantity: 1,
      customerMemo: '',
    });
  };

  // 우편번호 검색 함수
  const handleAddressSearch = () => {
    // @ts-ignore
    if (window.daum && window.daum.Postcode) {
      // @ts-ignore
      new window.daum.Postcode({
        oncomplete: function(data: any) {
          // 도로명 주소 우선, 없으면 지번 주소
          const fullAddress = data.roadAddress || data.jibunAddress;
          
          setNewOrder({
            ...newOrder,
            zipCode: data.zonecode,
            shippingAddress: fullAddress,
          });
        }
      }).open();
    } else {
      alert(locale === 'ko' ? '우편번호 검색 서비스를 로드하는 중입니다. 잠시 후 다시 시도해주세요.' : '正在加载邮政编码搜索服务。请稍后再试。');
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      // 배송등록 처리 - 배송관리 페이지로 이동
      if (newStatus === 'SHIPPED') {
        // selectedOrder를 sessionStorage에 저장
        if (selectedOrder) {
          sessionStorage.setItem('pendingShipment', JSON.stringify(selectedOrder));
        }
        // 배송관리 페이지로 이동
        router.push(`/${locale}/shipments`);
        return;
      }
      
      // 주문취소 처리
      if (newStatus === 'CANCELLED' && selectedOrder) {
        // 주문 상태 변경
        await api.orders.updateStatus(orderId, newStatus);
        
        // 출납장부에 환불 기록 추가 (실제 구현 시 API 호출)
        console.log('환불 기록 추가:', {
          type: 'refund',
          amount: -selectedOrder.totalAmount,
          refType: 'order',
          refNo: selectedOrder.orderNo,
          description: `주문 취소 - ${selectedOrder.customerName}`,
        });
        
        alert(locale === 'ko' ? '주문이 취소되었습니다.' : '订单已取消');
      } else {
        // 기타 상태 변경
        await api.orders.updateStatus(orderId, newStatus);
      }
      
      // 주문 목록 새로고침
      await loadOrders();
      setShowDetailModal(false);
    } catch (error) {
      console.error('상태 변경 실패:', error);
      alert(locale === 'ko' ? '상태 변경에 실패했습니다.' : '状态更改失败');
    }
  };

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      PAID: '#3b82f6',
      SHIPPED: '#f59e0b',
      DONE: '#10b981',
      CANCELLED: '#6b7280',
      REFUNDED: '#ef4444',
    };
    return colors[status];
  };

  const getStatusText = (status: Order['status']) => {
    const statusTexts = {
      PAID: texts.paid,
      SHIPPED: texts.shipped,
      DONE: texts.done,
      CANCELLED: texts.cancelled,
      REFUNDED: texts.refunded,
    };
    return statusTexts[status];
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.customerPhone.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // 필터나 검색어 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // 테이블 행 클릭 핸들러
  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  // 모바일 화면일 경우 모바일 컴포넌트 렌더링
  if (isMobile) {
    return <OrdersPageMobile params={{ locale }} />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* 헤더 */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{texts.title}</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            + {texts.createOrder}
          </button>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          <input
            type="text"
            placeholder={texts.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem'
            }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem'
            }}
          >
            <option value="all">{texts.all}</option>
            <option value="PAID">{texts.paid}</option>
            <option value="SHIPPED">{texts.shipped}</option>
            <option value="DONE">{texts.done}</option>
            <option value="CANCELLED">{texts.cancelled}</option>
            <option value="REFUNDED">{texts.refunded}</option>
          </select>
          </div>
          <button
            onClick={() => {
              const columns = [
                { header: texts.orderNo, key: 'orderNo', width: 20 },
                { header: texts.orderDate, key: 'orderDate', width: 15 },
                { header: texts.customerName, key: 'customerName', width: 20 },
                { header: texts.customerPhone, key: 'customerPhone', width: 20 },
                { header: texts.status, key: 'status', width: 15 },
                { header: texts.totalAmount, key: 'totalAmount', width: 20 }
              ];
              
              exportToExcel({
                data: filteredOrders,
                columns,
                fileName: locale === 'ko' ? '주문내역' : 'orders',
                sheetName: locale === 'ko' ? '주문' : 'Orders'
              });
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap'
            }}
          >
            📥 {locale === 'ko' ? '엑셀 저장' : locale === 'zh-CN' ? '导出Excel' : 'Export'}
          </button>
        </div>

        {/* 주문 목록 */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden' }}>
          {filteredOrders.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              {texts.noOrders}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{texts.orderNo}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{texts.orderDate}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{texts.customerName}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{texts.customerPhone}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{texts.status}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>{texts.totalAmount}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    onClick={() => handleOrderClick(order)}
                    style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{order.orderNo}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{order.orderDate}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{order.customerName}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{order.customerPhone}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: `${getStatusColor(order.status)}20`,
                        color: getStatusColor(order.status),
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>
                      ₩{order.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {filteredOrders.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredOrders.length}
            itemsPerPage={itemsPerPage}
            className="mt-4"
          />
        )}
      </div>

      {/* 주문 생성 모달 */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {texts.createNewOrder}
            </h2>

            {/* 고객 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>{texts.customerInfo}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.customerName} *</label>
                  <input
                    type="text"
                    value={newOrder.customerName}
                    onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.customerPhone} *</label>
                  <input
                    type="text"
                    value={newOrder.customerPhone}
                    onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.kakaoId} *</label>
                  <input
                    type="text"
                    value={newOrder.kakaoId}
                    onChange={(e) => setNewOrder({ ...newOrder, kakaoId: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    placeholder={locale === 'ko' ? '카카오톡 등' : 'KakaoTalk etc'}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.email}</label>
                  <input
                    type="email"
                    value={newOrder.customerEmail}
                    onChange={(e) => setNewOrder({ ...newOrder, customerEmail: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.pccc} *</label>
                  <input
                    type="text"
                    value={newOrder.pcccCode}
                    onChange={(e) => setNewOrder({ ...newOrder, pcccCode: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    placeholder="P123456789012"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 배송 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>{texts.shippingInfo}</h3>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.zipCode} *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={newOrder.zipCode}
                    onChange={(e) => setNewOrder({ ...newOrder, zipCode: e.target.value })}
                    style={{ 
                      flex: '0 0 auto',
                      width: '120px',
                      maxWidth: '50%',
                      padding: '0.5rem', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                    placeholder={locale === 'ko' ? '우편번호' : '邮政编码'}
                    readOnly
                    required
                  />
                  <button
                    type="button"
                    onClick={handleAddressSearch}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      borderRadius: '0.375rem',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontSize: '0.875rem'
                    }}
                  >
                    {texts.searchAddress}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.address} *</label>
                <input
                  type="text"
                  value={newOrder.shippingAddress}
                  onChange={(e) => setNewOrder({ ...newOrder, shippingAddress: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  placeholder={locale === 'ko' ? '기본 주소' : '基本地址'}
                  readOnly
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.addressDetail}</label>
                <input
                  type="text"
                  value={newOrder.shippingAddressDetail}
                  onChange={(e) => setNewOrder({ ...newOrder, shippingAddressDetail: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  placeholder={locale === 'ko' ? '상세 주소를 입력하세요' : '请输入详细地址'}
                />
              </div>
            </div>

            {/* 상품 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>{texts.productInfo}</h3>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.selectProduct} *</label>
                <select
                  value={newOrder.productId}
                  onChange={(e) => setNewOrder({ ...newOrder, productId: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  required
                >
                  <option value="">-- {texts.selectProduct} --</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - {texts.stock}: {product.onHand} - ₩{product.salePrice.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.quantity} *</label>
                <input
                  type="number"
                  min="1"
                  value={newOrder.quantity}
                  onChange={(e) => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) || 1 })}
                  style={{ width: '100px', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  required
                />
              </div>
            </div>

            {/* 메모 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.memo}</label>
              <textarea
                value={newOrder.customerMemo}
                onChange={(e) => setNewOrder({ ...newOrder, customerMemo: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', minHeight: '80px' }}
              />
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetNewOrderForm();
                }}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {texts.cancel}
              </button>
              <button
                onClick={handleCreateOrder}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {texts.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 주문 상세 모달 */}
      {showDetailModal && selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {texts.orderDetail} - {selectedOrder.orderNo}
            </h2>

            {/* 주문 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.orderDate}</p>
                  <p style={{ fontWeight: '600' }}>{selectedOrder.orderDate}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.status}</p>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: `${getStatusColor(selectedOrder.status)}20`,
                    color: getStatusColor(selectedOrder.status),
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    {getStatusText(selectedOrder.status)}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.customerName}</p>
                  <p style={{ fontWeight: '600' }}>{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.customerPhone}</p>
                  <p style={{ fontWeight: '600' }}>{selectedOrder.customerPhone}</p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.address}</p>
                  <p style={{ fontWeight: '600' }}>{selectedOrder.shippingAddress} {selectedOrder.shippingAddressDetail}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.totalAmount}</p>
                  <p style={{ fontWeight: '600', fontSize: '1.25rem', color: '#2563eb' }}>
                    ₩{selectedOrder.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* 상태 변경 버튼 */}
            <div style={{ marginBottom: '1.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>{texts.changeStatus}</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedOrder.status === 'PAID' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'SHIPPED')}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      {locale === 'ko' ? '배송등록' : '配送登记'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(locale === 'ko' ? '정말 주문을 취소하시겠습니까?\n취소 시 출납장부에 환불 기록이 추가됩니다.' : '确定要取消订单吗？\n取消后将在现金日记账中添加退款记录。')) {
                          handleStatusChange(selectedOrder.id, 'CANCELLED');
                        }
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      {locale === 'ko' ? '주문취소' : '取消订单'}
                    </button>
                  </>
                )}
                {selectedOrder.status === 'SHIPPED' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'DONE')}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      {texts.completeOrder}
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'REFUNDED')}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      {texts.refundOrder}
                    </button>
                  </>
                )}
                {selectedOrder.status === 'DONE' && (
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'REFUNDED')}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      borderRadius: '0.375rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    {texts.refundOrder}
                  </button>
                )}
              </div>
            </div>

            {/* 닫기 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {texts.close}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}