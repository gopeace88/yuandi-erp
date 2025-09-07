/**
 * 주문 관리 페이지
 * PRD v2.0: 주문 생성, 목록 조회, 상태 변경
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { exportToExcel } from '@/lib/utils/excel';
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
  status: 'paid' | 'shipped' | 'delivered' | 'done' | 'cancelled' | 'refunded';
  totalAmount: number;
  productName: string;
  productSku: string;
  quantity: number;
}

export default function OrdersPage({ params: { locale } }: OrdersPageProps) {
  const router = useRouter();
  
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


  // 사용자 권한 체크
  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    if (!userRole) {
      router.push(`/${locale}`);
      return;
    }
    if (userRole === 'ship_manager') {
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
      // Supabase 직접 호출
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      console.log('🔄 주문 데이터 로드 시작...');
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              id,
              name,
              sku
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ 주문 로드 에러:', error);
        setOrders([]);
        return;
      }
      
      // 데이터 유효성 체크
      if (!orders) {
        console.log('⚠️ 주문 데이터가 null입니다');
        setOrders([]);
        return;
      }
      
      console.log('📋 로드된 주문 데이터:', { 
        count: orders?.length, 
        isArray: Array.isArray(orders),
        firstOrder: orders?.[0],
        type: typeof orders,
        rawData: orders
      });
      
      // 데이터 변환 - 더 안전한 처리
      const transformedOrders = [];
      
      if (Array.isArray(orders)) {
        for (const order of orders) {
          try {
            transformedOrders.push({
              id: order.id || '',
              orderNo: order.order_number || '',
              orderDate: order.created_at || '',
              customerName: order.customer_name || '',
              customerPhone: order.customer_phone || '',
              customerEmail: order.customer_email || '',
              pcccCode: order.pccc || '',
              shippingAddress: order.shipping_address_line1 || '',
              shippingAddressDetail: order.shipping_address_line2 || '',
              zipCode: order.shipping_postal_code || '',
              status: (order.status?.toLowerCase() || 'paid') as Order['status'],
              totalAmount: order.total_krw || 0,
              productName: order.order_items?.[0]?.products?.name || '',
              productSku: order.order_items?.[0]?.products?.sku || '',
              quantity: order.order_items?.[0]?.quantity || 0,
            });
          } catch (itemError) {
            console.error('❌ 개별 주문 변환 오류:', itemError, order);
          }
        }
      } else {
        console.error('❌ orders가 배열이 아닙니다:', typeof orders, orders);
      }
      
      console.log('✅ 변환된 주문 데이터:', transformedOrders.length + '개');
      setOrders(transformedOrders);
    } catch (error) {
      console.error('❌ 주문 로드 실패 (catch):', error);
      // 에러 상세 정보 출력
      if (error instanceof Error) {
        console.error('에러 메시지:', error.message);
        console.error('에러 스택:', error.stack);
      }
      setOrders([]);
    }
  };

  const loadProducts = async () => {
    try {
      // Supabase 직접 호출
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          inventory (
            on_hand,
            allocated
          ),
          product_categories (
            name
          )
        `)
        .eq('is_active', true);
      
      if (productsError) {
        console.error('제품 로드 에러:', productsError);
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
      return;
    }
    
    // 데이터 유효성 체크
    if (!products) {
      console.log('⚠️ 제품 데이터가 null입니다');
      setProducts([]);
      return;
    }
    
    console.log('📦 로드된 제품 데이터:', {
      count: products?.length,
      isArray: Array.isArray(products),
      type: typeof products
    });
    
    // 데이터 변환 - 더 안전한 처리
    const transformedProducts = [];
    
    if (Array.isArray(products)) {
      for (const product of products) {
        try {
          transformedProducts.push({
            id: product.id || '',
            sku: product.sku || '',
            name: product.name || '',
            category: product.product_categories?.name || '',
            model: product.model || '',
            color: product.color || '',
            brand: product.brand || '',
            onHand: product.inventory?.[0]?.on_hand || 0,
            salePrice: product.price_krw || (product.cost_cny ? product.cost_cny * 180 : 0),
            image_url: product.image_urls?.[0] || ''
          });
        } catch (itemError) {
          console.error('❌ 개별 제품 변환 오류:', itemError, product);
        }
      }
    } else {
      console.error('❌ products가 배열이 아닙니다:', typeof products, products);
    }
    
    console.log('✅ 변환된 제품 데이터:', transformedProducts.length + '개');
    setProducts(transformedProducts);
    } catch (error) {
      console.error('❌ 제품 로드 실패 (catch):', error);
      if (error instanceof Error) {
        console.error('에러 메시지:', error.message);
        console.error('에러 스택:', error.stack);
      }
      setProducts([]);
    }
  };

  const handleCreateOrder = async () => {
    // 주문 생성 로직
    const selectedProduct = products.find(p => p.id === newOrder.productId);
    if (!selectedProduct) return;

    try {
      // Supabase 직접 호출
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      // 주문 번호 생성
      const today = new Date();
      const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
      
      // 오늘 날짜의 마지막 주문 번호 조회
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_number')
        .like('order_number', `ORD-${dateStr}-%`)
        .order('order_number', { ascending: false })
        .limit(1)
        .single();
      
      let orderNumber;
      if (lastOrder) {
        const lastNum = parseInt((lastOrder as any).order_number.split('-')[2]);
        orderNumber = `ORD-${dateStr}-${String(lastNum + 1).padStart(3, '0')}`;
      } else {
        orderNumber = `ORD-${dateStr}-001`;
      }
      
      // 주문 생성
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: newOrder.customerName,
          customer_phone: newOrder.customerPhone,
          customer_email: newOrder.customerEmail || null,
          customer_kakao_id: newOrder.kakaoId,
          pccc: newOrder.pcccCode,
          shipping_address_line1: newOrder.shippingAddress,
          shipping_address_line2: newOrder.shippingAddressDetail || null,
          shipping_postal_code: newOrder.zipCode,
          shipping_city: '',
          shipping_state: '',
          status: 'paid',
          subtotal_krw: selectedProduct.salePrice * newOrder.quantity,
          shipping_fee_krw: 0,
          total_krw: selectedProduct.salePrice * newOrder.quantity,
          payment_method: 'card',
          paid_at: new Date().toISOString(),
          notes: newOrder.customerMemo || null
        } as any)
        .select()
        .single();
      
      if (orderError) {
        console.error('주문 생성 에러:', orderError);
        alert(locale === 'ko' ? '주문 생성에 실패했습니다.' : '订单创建失败');
        return;
      }
      
      // 주문 아이템 생성
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: selectedProduct.id,
          quantity: newOrder.quantity,
          unit_price_krw: selectedProduct.salePrice,
          total_price_krw: selectedProduct.salePrice * newOrder.quantity
        });
      
      if (itemError) {
        console.error('주문 아이템 생성 에러:', itemError);
      }
      
      // 재고 업데이트
      const { error: inventoryError } = await supabase.rpc('allocate_inventory', {
        p_product_id: selectedProduct.id,
        p_quantity: newOrder.quantity
      });
      
      if (inventoryError) {
        console.error('재고 할당 에러:', inventoryError);
      }
      
      alert(locale === 'ko' ? '주문이 생성되었습니다.' : '订单已创建');
      
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
      if (newStatus === 'shipped') {
        // selectedOrder를 sessionStorage에 저장
        if (selectedOrder) {
          sessionStorage.setItem('pendingShipment', JSON.stringify(selectedOrder));
        }
        // 배송관리 페이지로 이동
        router.push(`/${locale}/shipments`);
        return;
      }
      
      // Supabase 직접 호출
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      // 상태를 소문자로 변환 (DB는 소문자 사용)
      const dbStatus = newStatus.toLowerCase();
      
      // 주문취소 처리
      if (newStatus === 'cancelled' && selectedOrder) {
        // 주문 상태 변경
        const { error: statusError } = await supabase
          .from('orders')
          .update({ 
            status: dbStatus,
            cancelled_at: new Date().toISOString()
          })
          .eq('id', orderId);
        
        if (statusError) {
          console.error('주문 상태 변경 실패:', statusError);
          alert(locale === 'ko' ? '주문 상태 변경에 실패했습니다.' : '订单状态更改失败');
          return;
        }
        
        // 출납장부에 환불 기록 추가
        const { error: cashbookError } = await supabase
          .from('cashbook_transactions')
          .insert({
            transaction_date: new Date().toISOString().split('T')[0],
            type: 'refund',
            amount: -selectedOrder.totalAmount,
            currency: 'KRW',
            fx_rate: 1,
            amount_krw: -selectedOrder.totalAmount,
            description: `주문 취소 - ${selectedOrder.customerName}`,
            reference_type: 'order',
            reference_id: orderId,
            notes: `주문번호: ${selectedOrder.orderNo}`
          });
        
        if (cashbookError) {
          console.error('출납장부 기록 실패:', cashbookError);
        }
        
        // 재고 복구
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', orderId);
        
        if (orderItems) {
          for (const item of orderItems) {
            await supabase.rpc('deallocate_inventory', {
              p_product_id: item.product_id,
              p_quantity: item.quantity
            });
          }
        }
        
        alert(locale === 'ko' ? '주문이 취소되었습니다.' : '订单已取消');
      } else {
        // 기타 상태 변경
        let updateData: any = { status: dbStatus };
        
        if (newStatus === 'delivered') {
          updateData.delivered_at = new Date().toISOString();
        } else if (newStatus === 'refunded') {
          updateData.cancelled_at = new Date().toISOString();
        }
        
        const { error } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId);
        
        if (error) {
          console.error('주문 상태 변경 실패:', error);
          alert(locale === 'ko' ? '주문 상태 변경에 실패했습니다.' : '订单状态更改失败');
          return;
        }
        
        alert(locale === 'ko' ? '주문 상태가 변경되었습니다.' : '订单状态已更改');
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
      paid: '#3b82f6',
      shipped: '#f59e0b',
      delivered: '#10b981',
      done: '#10b981',
      cancelled: '#6b7280',
      refunded: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status: Order['status']) => {
    const statusTexts = {
      paid: texts.paid,
      shipped: texts.shipped,
      delivered: texts.done,
      done: texts.done,
      cancelled: texts.cancelled,
      refunded: texts.refunded,
    };
    return statusTexts[status] || status;
  };

  const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
    if (!order) return false;
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesSearch = (order.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (order.orderNo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (order.customerPhone || '').includes(searchTerm);
    return matchesStatus && matchesSearch;
  }) : [];

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = Array.isArray(filteredOrders) ? filteredOrders.slice(startIndex, endIndex) : [];

  // 필터나 검색어 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // 테이블 행 클릭 핸들러
  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };


  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-lg md:text-2xl font-bold">{texts.title}</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-md text-sm md:text-base font-medium hover:bg-blue-700"
          >
            + {texts.createOrder}
          </button>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              placeholder={texts.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm md:text-base"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm md:text-base"
            >
              <option value="all">{texts.all}</option>
              <option value="paid">{texts.paid}</option>
              <option value="shipped">{texts.shipped}</option>
              <option value="delivered">{texts.done}</option>
              <option value="cancelled">{texts.cancelled}</option>
              <option value="refunded">{texts.refunded}</option>
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
            className="px-3 py-2 bg-green-500 text-white rounded-md text-sm md:text-base font-medium hover:bg-green-600 flex items-center gap-2 whitespace-nowrap"
          >
            📥 {locale === 'ko' ? '엑셀 저장' : locale === 'zh-CN' ? '导出Excel' : 'Export'}
          </button>
        </div>

        {/* 주문 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {texts.noOrders}
            </div>
          ) : (
            <>
              {/* 모바일 카드 뷰 */}
              <div className="md:hidden">
                {paginatedOrders.map((order) => (
                  <div 
                    key={order.id}
                    onClick={() => handleOrderClick(order)}
                    className="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-sm">{order.orderNo}</div>
                        <div className="text-xs text-gray-500">{order.orderDate}</div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full`}
                        style={{
                          backgroundColor: `${getStatusColor(order.status)}20`,
                          color: getStatusColor(order.status)
                        }}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{order.customerName}</span>
                        <span className="font-semibold">₩{order.totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-gray-500">{order.customerPhone}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 데스크톱 테이블 뷰 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.orderNo}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.orderDate}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.customerName}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.customerPhone}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.status}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.totalAmount}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedOrders.map((order) => (
                      <tr 
                        key={order.id} 
                        onClick={() => handleOrderClick(order)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{order.orderNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{order.orderDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{order.customerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{order.customerPhone}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                            style={{
                              backgroundColor: `${getStatusColor(order.status)}20`,
                              color: getStatusColor(order.status)
                            }}>
                            {getStatusText(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          ₩{order.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
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
                  {Array.isArray(products) && products.map((product) => (
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
                {selectedOrder.status === 'paid' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'shipped')}
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
                          handleStatusChange(selectedOrder.id, 'cancelled');
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
                {selectedOrder.status === 'shipped' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'delivered')}
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
                      onClick={() => handleStatusChange(selectedOrder.id, 'refunded')}
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
                {selectedOrder.status === 'delivered' && (
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'refunded')}
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