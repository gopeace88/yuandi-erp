/**
 * 주문 관리 페이지
 * PRD v2.0: 주문 생성, 목록 조회, 상태 변경
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { exportToExcel } from '@/lib/utils/excel';
import { Pagination } from '@/app/components/ui/pagination';
import { MobileBottomNav } from '@/components/Navigation';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { createClient } from '@/lib/supabase/client';

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

interface OrderItem {
  id: string;
  productName: string;
  productSku: string;
  model?: string;
  quantity: number;
  price: number;
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
  items?: OrderItem[];
}

export default function OrdersPage({ params: { locale } }: OrdersPageProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // 페이지당 20개 항목 표시
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkOrderFile, setBulkOrderFile] = useState<File | null>(null);
  const [bulkOrderLoading, setBulkOrderLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  // 새 주문 폼 상태
  const [newOrder, setNewOrder] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    kakaoId: '',  // 아이디 (카카오톡 등)
    pcccCode: 'P',
    shippingAddress: '',
    shippingAddressDetail: '',
    zipCode: '',
    productId: '',
    quantity: 1,
    customPrice: 0,  // 커스텀 가격 (수동 입력용)
    customerMemo: '',
  });

  // 다국어 텍스트
  const t = {
    ko: {
      title: '주문 관리',
      createOrder: '새 주문',
      bulkOrder: '대량주문',
      orderNo: '주문번호',
      orderDate: '주문일',
      customer: '고객',
      phone: '전화번호',
      address: '배송지',
      items: '상품',
      model: '모델명',
      status: '상태',
      actions: '작업',
      search: '검색',
      filter: '필터',
      all: '전체',
      paid: '결제완료',
      shipped: '배송중',
      done: '배송완료',
      cancelled: '취소',
      refunded: '환불',
      noOrders: '주문이 없습니다',
      createNewOrder: '새 주문 생성',
      customerInfo: '고객 정보',
      customerName: '이름',
      customerPhone: '전화번호',
      shippingInfo: '배송 정보',
      productInfo: '상품 정보',
      email: '이메일',
      kakaoId: '아이디',
      pcccLabel: '해외통관부호',
      addressLabel: '주소',
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
      bulkOrder: '批量订单',
      orderNo: '订单号',
      orderDate: '订单日期',
      customer: '客户',
      phone: '电话',
      address: '配送地址',
      items: '商品',
      model: '型号',
      status: '状态',
      actions: '操作',
      search: '搜索',
      filter: '筛选',
      all: '全部',
      paid: '已付款',
      shipped: '配送中',
      done: '配送完成',
      cancelled: '已取消',
      refunded: '已退款',
      noOrders: '没有订单',
      createNewOrder: '创建新订单',
      customerInfo: '客户信息',
      customerName: '姓名',
      customerPhone: '电话号码',
      shippingInfo: '配送信息',
      productInfo: '产品信息',
      email: '电子邮件',
      kakaoId: 'ID',
      pcccLabel: '海外通关号',
      addressLabel: '地址',
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
  
  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
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
      
      console.log('🔄 주문 데이터 로드 시작...');
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              id,
              name_ko,
              name_zh,
              sku,
              model
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
            const items: OrderItem[] = order.order_items?.map((item: any) => {
              // 제품 정보 우선순위: products 테이블 정보 우선 사용
              const productName = (locale === 'ko' ? item.products?.name_ko : item.products?.name_zh) || item.product_name || '';
              const model = item.products?.model || item.model || '';
              
              console.log('📦 상품 정보:', {
                item_id: item.id,
                product_name: item.product_name,
                products: item.products,
                model_from_products: item.products?.model,
                model_from_item: item.model,
                final_model: model,
                productName: productName,
                sku: item.sku,
                products_sku: item.products?.sku
              });
              
              return {
                id: item.id,
                productName: productName,
                productSku: item.sku || item.products?.sku || '',
                model: model,
                quantity: item.quantity || 0,
                price: item.price || 0
              };
            }) || [];
            
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
              productName: items[0]?.productName || '',
              productSku: items[0]?.productSku || '',
              quantity: items[0]?.quantity || 0,
              items: items
            });
          } catch (itemError) {
            console.error('❌ 개별 주문 변환 오류:', itemError, order);
          }
        }
      } else {
        console.error('❌ orders가 배열이 아닙니다:', typeof orders, orders);
      }
      
      console.log('✅ 변환된 주문 데이터:', transformedOrders.length + '개');
      if (transformedOrders.length > 0) {
        console.log('📋 첫 번째 주문 items:', transformedOrders[0].items);
      }
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
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            name_ko,
            name_zh
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
      type: typeof products,
      firstFew: products?.slice(0, 3)
    });
    
    // 데이터 변환 - 더 안전한 처리
    const transformedProducts = [];
    
    if (Array.isArray(products)) {
      for (const product of products) {
        try {
          const transformedProduct = {
            id: product.id || '',
            sku: product.sku || '',
            name: locale === 'ko' ? product.name_ko || '' : product.name_zh || '',
            category: product.categories ? (locale === 'ko' ? product.categories.name_ko : product.categories.name_zh) || '' : '',  // categories 테이블 조인 결과 사용
            model: product.model || '',
            color: locale === 'ko' ? product.color_ko || '' : product.color_zh || '',
            brand: locale === 'ko' ? product.brand_ko || '' : product.brand_zh || '',
            onHand: product.on_hand || 0,
            salePrice: product.price_krw || (product.cost_cny ? product.cost_cny * 180 : 0),
            image_url: product.image_url || ''
          };
          
          // 처음 3개 상품만 로그 출력
          if (transformedProducts.length < 3) {
            console.log(`📦 변환된 상품 ${transformedProducts.length + 1}:`, {
              original: {
                id: product.id,
                name_ko: product.name_ko,
                name_zh: product.name_zh,
                model: product.model,
                categories: product.categories,
                color_ko: product.color_ko,
                brand_ko: product.brand_ko,
                on_hand: product.on_hand,
                price_krw: product.price_krw
              },
              transformed: transformedProduct
            });
          }
          
          transformedProducts.push(transformedProduct);
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
    // 필수 필드 검증
    if (!newOrder.customerName || !newOrder.customerPhone || !newOrder.productId || !newOrder.quantity) {
      alert(locale === 'ko' ? '필수 입력 항목을 모두 입력해주세요.' : '请填写所有必填项');
      return;
    }

    // productId를 숫자로 변환하여 비교
    const selectedProduct = products.find(p => p.id === parseInt(newOrder.productId));
    if (!selectedProduct || !newOrder.productId) {
      alert(locale === 'ko' ? '상품을 선택해주세요.' : '请选择商品');
      return;
    }

    try {
      // API를 통해 주문 생성 (출납장부 기록 포함)
      const orderData = {
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone,
        customerEmail: newOrder.customerEmail || null,
        customerMessengerId: newOrder.kakaoId || null,
        pcccCode: newOrder.pcccCode || '',  // PCCC 필수값으로 처리
        shippingAddress: newOrder.shippingAddress || '',  // 주소 필수값으로 처리
        shippingAddressDetail: newOrder.shippingAddressDetail || null,
        zipCode: newOrder.zipCode || '',  // 우편번호 필수값으로 처리
        productId: selectedProduct.id,
        quantity: newOrder.quantity,
        customPrice: newOrder.customPrice,  // 커스텀 가격 전달
        totalAmount: newOrder.customPrice * newOrder.quantity,  // 커스텀 가격 사용
        customerMemo: newOrder.customerMemo || null,
        paymentMethod: 'card'
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '주문 생성 실패');
      }

      alert(locale === 'ko' 
        ? `주문이 생성되었습니다. (주문번호: ${result.order.orderNo})` 
        : `订单已创建 (订单号: ${result.order.orderNo})`);
      
      // 주문 목록 새로고침
      await loadOrders();
      setShowCreateModal(false);
      resetNewOrderForm();
    } catch (error) {
      console.error('주문 생성 실패:', error);
      
      let errorMessage = locale === 'ko' ? '주문 생성에 실패했습니다.' : '订单创建失败';
      
      if (error instanceof Error) {
        errorMessage += `\n\n상세: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  const resetNewOrderForm = () => {
    setNewOrder({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      kakaoId: '',
      pcccCode: 'P',
      shippingAddress: '',
      shippingAddressDetail: '',
      zipCode: '',
      productId: '',
      quantity: 1,
      customPrice: 0,
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


  // 상태별 색상 헬퍼 함수
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

  // 상태 텍스트 헬퍼 함수
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
    // PAID 상태의 주문은 배송 관리로 이동하여 송장 입력 모달 열기
    if (order.status === 'paid') {
      router.push(`/${locale}/shipments?tab=pending&orderId=${order.id}&action=register`);
    } else if (order.status === 'shipped') {
      router.push(`/${locale}/shipments?tab=shipping&orderId=${order.id}&action=update`);
    } else if (order.status === 'done' || order.status === 'delivered') {
      router.push(`/${locale}/shipments?tab=delivered&orderId=${order.id}&action=view`);
    } else if (order.status === 'refunded' || order.status === 'cancelled') {
      router.push(`/${locale}/shipments?tab=refunded&orderId=${order.id}&action=view`);
    } else {
      // 기타 상태의 주문은 상세 모달 표시
      setSelectedOrder(order);
      setShowDetailModal(true);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100" style={{ paddingBottom: isMobile ? '80px' : '0' }}>
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-lg md:text-2xl font-bold">{texts.title}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-md text-sm md:text-base font-medium hover:bg-blue-700"
            >
              + {texts.createOrder}
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-green-600 text-white rounded-md text-sm md:text-base font-medium hover:bg-green-700"
            >
              📥 {texts.bulkOrder}
            </button>
          </div>
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
                { header: texts.orderNo, key: 'orderNo', width: 15 },
                { header: texts.customer, key: 'customerName', width: 20 },
                { header: texts.phone, key: 'customerPhone', width: 20 },
                { header: texts.address, key: 'shippingAddress', width: 30 },
                { header: texts.items, key: 'productName', width: 25 },
                { header: texts.status, key: 'status', width: 15 }
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
            <OrdersTable
              orders={paginatedOrders.map(order => ({
                ...order,
                order_number: order.orderNo,
                name: order.customerName,
                phone: order.customerPhone,
                shippingAddress: order.shippingAddress,
                model: order.items && order.items.length > 0 
                  ? order.items[0].model 
                  : undefined,
                product: order.items && order.items.length > 0 
                  ? order.items.map(item => item.productName).join(', ')
                  : order.productName,
                items: order.items ? order.items.map(item => ({
                  ...item,
                  productModel: item.model,
                  quantity: item.quantity
                })) : undefined
              }))}
              locale={locale}
              isMobile={isMobile}
              currentPage={1}
              itemsPerPage={paginatedOrders.length}
              onOrderClick={handleOrderClick}
            />
          )}
        </div>

        {/* 페이지네이션 */}
        {filteredOrders.length > itemsPerPage && (
          <div style={{ marginBottom: isMobile ? '20px' : '0' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredOrders.length}
              itemsPerPage={itemsPerPage}
              showSummary={true}
              className="mt-4"
            />
          </div>
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
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.kakaoId}</label>
                  <input
                    type="text"
                    value={newOrder.kakaoId}
                    onChange={(e) => setNewOrder({ ...newOrder, kakaoId: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    placeholder={locale === 'ko' ? '카카오톡 등' : 'KakaoTalk etc'}
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
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.pcccLabel} *</label>
                  <input
                    type="text"
                    value={newOrder.pcccCode}
                    onChange={async (e) => {
                      const value = e.target.value.toUpperCase();
                      console.log('PCCC 입력:', value, 'Length:', value.length);
                      
                      // P로 시작하지 않으면 P를 앞에 추가
                      if (!value.startsWith('P')) {
                        return;
                      }
                      // P 뒤에 숫자만 허용 (최대 11자리)
                      const numbers = value.slice(1);
                      if (numbers === '' || (/^\d{0,11}$/.test(numbers))) {
                        setNewOrder({ ...newOrder, pcccCode: value });
                        
                        // PCCC가 12자리(P + 11자리)가 되면 자동으로 고객 정보 조회
                        if (value.length === 12) {
                          console.log('PCCC 12자리 입력됨, API 호출 시작');
                          try {
                            // 수정된 API 엔드포인트 사용 (orders API에 pccc 파라미터 추가)
                            const apiUrl = `/api/orders?pccc=${encodeURIComponent(value)}`;
                            console.log('API URL:', apiUrl);
                            const response = await fetch(apiUrl);
                            console.log('API Response status:', response.status);
                            
                            if (response.ok) {
                              const data = await response.json();
                              console.log('API Response data:', data);
                              
                              if (data.found && data.customer) {
                                // 기존 고객 정보로 폼 자동 채우기
                                setNewOrder(prev => ({
                                  ...prev,
                                  customerName: data.customer.customer_name || prev.customerName,
                                  customerPhone: data.customer.customer_phone || prev.customerPhone,
                                  customerEmail: data.customer.customer_email || prev.customerEmail,
                                  kakaoId: data.customer.customer_messenger_id || prev.kakaoId,
                                  shippingAddress: data.customer.shipping_address_line1 || prev.shippingAddress,
                                  shippingAddressDetail: data.customer.shipping_address_line2 || prev.shippingAddressDetail,
                                  zipCode: data.customer.shipping_postal_code || prev.zipCode
                                }));
                                
                                // 고객 정보 알림
                                if (data.customer.order_count > 0) {
                                  const message = locale === 'ko' 
                                    ? `기존 고객입니다. (총 ${data.customer.order_count}회 주문)`
                                    : `现有客户 (共 ${data.customer.order_count} 次订单)`;
                                  alert(message);
                                }
                              } else {
                                console.log('고객 정보 없음');
                              }
                            } else {
                              console.error('API 응답 오류:', response.status);
                            }
                          } catch (error) {
                            console.error('Error fetching customer by PCCC:', error);
                          }
                        }
                      }
                    }}
                    maxLength={12}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    placeholder="P + 11자리 숫자"
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
                  onChange={(e) => {
                    const selectedProduct = products.find(p => p.id.toString() === e.target.value);
                    setNewOrder({ 
                      ...newOrder, 
                      productId: e.target.value,
                      customPrice: selectedProduct ? selectedProduct.salePrice : 0
                    });
                  }}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  required
                >
                  <option value="">-- {texts.selectProduct} --</option>
                  {Array.isArray(products) && products
                    .sort((a, b) => (a.model || '').localeCompare(b.model || ''))
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.model}, {product.name}, {product.category}, {texts.stock}: {product.onHand}, ₩{product.salePrice?.toLocaleString() || 0}
                      </option>
                    ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.quantity} *</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.price} *</label>
                  <input
                    type="number"
                    min="0"
                    value={newOrder.customPrice}
                    onChange={(e) => setNewOrder({ ...newOrder, customPrice: parseInt(e.target.value) || 0 })}
                    onFocus={(e) => e.target.value === '0' && e.target.select()}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    placeholder="₩"
                    required
                  />
                </div>
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

      {/* 대량주문 모달 */}
      {showBulkModal && (
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
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {locale === 'ko' ? '대량 주문 입력' : '批量订单输入'}
            </h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                {locale === 'ko' 
                  ? '엑셀 파일을 업로드하여 여러 주문을 한번에 등록할 수 있습니다.'
                  : '上传Excel文件可以一次性注册多个订单。'}
              </p>
              
              {/* 템플릿 다운로드 버튼 */}
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/bulk-order/template');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = locale === 'ko' ? '주문_템플릿.xlsx' : '订单模板.xlsx';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('템플릿 다운로드 실패:', error);
                    alert(locale === 'ko' 
                      ? '템플릿 다운로드에 실패했습니다.' 
                      : '模板下载失败');
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: '1rem'
                }}
              >
                📋 {locale === 'ko' ? '템플릿 다운로드' : '下载模板'}
              </button>
            </div>

            {/* 파일 선택 영역 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem',
                color: '#374151',
                fontWeight: '500'
              }}>
                {locale === 'ko' ? '파일 선택' : '选择文件'}
              </label>
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#6b7280',
                marginBottom: '0.75rem'
              }}>
                {locale === 'ko' 
                  ? '엑셀 파일을 선택하여 주문을 일괄 등록하세요.'
                  : '选择Excel文件批量注册订单。'}
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setBulkOrderFile(e.target.files?.[0] || null)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem'
                }}
              />
              {bulkOrderFile && (
                <div style={{ 
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#059669'
                }}>
                  📄 {bulkOrderFile.name} ({locale === 'ko' ? '파일이 로드됨' : '文件已加载'})
                </div>
              )}
            </div>

            {/* 주의사항 */}
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '0.375rem',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                ⚠️ {locale === 'ko' ? '주의사항' : '注意事项'}
              </h4>
              <ul style={{ fontSize: '0.875rem', color: '#92400e', paddingLeft: '1.25rem' }}>
                <li>{locale === 'ko' 
                  ? '• SKU는 실제 상품 테이블에 존재해야 합니다' 
                  : '• SKU必须存在于产品表中'}</li>
                <li>{locale === 'ko' 
                  ? '• 재고가 충분한지 확인하세요' 
                  : '• 请确认库存充足'}</li>
                <li>{locale === 'ko' 
                  ? '• PCCC 코드는 P로 시작하는 12자리여야 합니다' 
                  : '• PCCC代码必须是以P开头的12位'}</li>
              </ul>
            </div>

            {/* 버튼 */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end',
              gap: '0.5rem'
            }}>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkOrderFile(null);
                  setBulkOrderLoading(false);
                }}
                disabled={bulkOrderLoading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: bulkOrderLoading ? 'not-allowed' : 'pointer',
                  opacity: bulkOrderLoading ? 0.5 : 1
                }}
              >
                {locale === 'ko' ? '취소' : '取消'}
              </button>
              <button
                onClick={async () => {
                  if (!bulkOrderFile) return;
                  
                  setBulkOrderLoading(true);
                  const formData = new FormData();
                  formData.append('file', bulkOrderFile);

                  try {
                    const response = await fetch('/api/bulk-order', {
                      method: 'POST',
                      body: formData
                    });

                    const result = await response.json();

                    if (!response.ok) {
                      // 상세한 오류 메시지 표시
                      let errorMessage = result.error || '업로드 실패';
                      
                      if (result.details && result.details.length > 0) {
                        const errorDetails = result.details.map((d: any) => 
                          `행 ${d.row}: ${d.errors.join(', ')}`
                        ).join('\n');
                        errorMessage += '\n\n' + errorDetails;
                      }
                      
                      if (result.skipped && result.skipped.length > 0) {
                        const skippedDetails = locale === 'ko' 
                          ? '\n\n스킵된 항목:\n' 
                          : '\n\n跳过的项目:\n';
                        const skippedList = result.skipped.map((s: any) => 
                          `행 ${s.row}: ${s.reason}`
                        ).join('\n');
                        errorMessage += skippedDetails + skippedList;
                      }
                      
                      throw new Error(errorMessage);
                    }

                    // 성공, 실패, 스킵 정보를 모두 표시 (0개여도 표시)
                    let message = locale === 'ko' 
                      ? '=== 대량 주문 처리 결과 ===\n\n'
                      : '=== 批量订单处理结果 ===\n\n';
                    
                    // 항상 성공 개수 표시
                    message += locale === 'ko' 
                      ? `✅ 성공: ${result.success || 0}개\n` 
                      : `✅ 成功: ${result.success || 0}个\n`;
                    
                    // 항상 실패 개수 표시
                    message += locale === 'ko' 
                      ? `❌ 실패: ${result.failed || 0}개\n` 
                      : `❌ 失败: ${result.failed || 0}个\n`;
                    
                    if (result.failedDetails && result.failedDetails.length > 0) {
                      const failedList = result.failedDetails.slice(0, 5).map((f: any) => 
                        `  행 ${f.row}: ${f.error}`
                      ).join('\n');
                      message += failedList;
                      
                      if (result.failedDetails.length > 5) {
                        message += locale === 'ko' 
                          ? `\n  ...외 ${result.failedDetails.length - 5}개` 
                          : `\n  ...还有${result.failedDetails.length - 5}个`;
                      }
                      message += '\n';
                    }
                    
                    // 항상 스킵 개수 표시
                    message += locale === 'ko' 
                      ? `⚠️ 스킵: ${result.skipped || 0}개 (품절 상품)\n` 
                      : `⚠️ 跳过: ${result.skipped || 0}个 (缺货产品)\n`;
                    
                    if (result.skippedDetails && result.skippedDetails.length > 0) {
                      const skippedList = result.skippedDetails.slice(0, 3).map((s: any) => 
                        `  행 ${s.row}: ${s.reason}`
                      ).join('\n');
                      message += skippedList;
                      
                      if (result.skippedDetails.length > 3) {
                        message += locale === 'ko' 
                          ? `\n  ...외 ${result.skippedDetails.length - 3}개` 
                          : `\n  ...还有${result.skippedDetails.length - 3}个`;
                      }
                    }
                    
                    // 전체 처리 개수 표시
                    const totalProcessed = (result.success || 0) + (result.failed || 0) + (result.skipped || 0);
                    message += locale === 'ko' 
                      ? `\n────────────────\n총 처리: ${totalProcessed}개`
                      : `\n────────────────\n总处理: ${totalProcessed}个`;
                    
                    alert(message.trim());
                    
                    setShowBulkModal(false);
                    setBulkOrderFile(null);
                    loadOrders();
                  } catch (error) {
                    console.error('대량 주문 업로드 실패:', error);
                    alert(locale === 'ko' 
                      ? `❌ 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
                      : `❌ 上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
                  } finally {
                    setBulkOrderLoading(false);
                  }
                }}
                disabled={bulkOrderLoading || !bulkOrderFile}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: (bulkOrderLoading || !bulkOrderFile) ? 'not-allowed' : 'pointer',
                  opacity: (bulkOrderLoading || !bulkOrderFile) ? 0.5 : 1
                }}
              >
                {bulkOrderLoading 
                  ? (locale === 'ko' ? '업로드 중...' : '上传中...') 
                  : (locale === 'ko' ? '업로드' : '上传')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 모바일 하단 네비게이션 */}
      {isMobile && <MobileBottomNav locale={locale} />}
    </div>
  );
}