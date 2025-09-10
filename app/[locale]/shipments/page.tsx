/**
 * 배송 관리 페이지
 * PRD v2.0 요구사항: 한국/중국 이중 배송 시스템
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MobileBottomNav } from '@/components/Navigation';
import { exportToExcel } from '@/lib/utils/excel';
import ImageUpload from '@/components/common/ImageUpload';
import Pagination from '@/components/common/Pagination';

interface ShipmentsPageProps {
  params: { locale: string };
}

interface Order {
  id: string;
  orderNo: string;
  orderDate: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  status: 'paid' | 'shipped' | 'delivered' | 'done' | 'cancelled' | 'refunded';
  totalAmount: number;
  items: Array<{
    productName: string;
    productModel?: string;
    quantity: number;
    unitPrice?: number;
  }>;
}

interface Shipment {
  id: string;
  orderId: string;
  orderNo: string;
  customerName: string;
  // Korean Shipping
  courier?: string;
  courierCode?: string;
  trackingNo?: string;
  trackingBarcode?: string;
  trackingUrl?: string;
  // Chinese Shipping
  courierCn?: string;
  trackingNoCn?: string;
  trackingUrlCn?: string;
  // Details
  shippingFee?: number;
  actualWeight?: number;
  volumeWeight?: number;
  shipmentPhotoUrl?: string;
  receiptPhotoUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

// 한국 택배사 목록
const KOREAN_COURIERS = [
  { code: 'cj', name: 'CJ대한통운' },
  { code: 'hanjin', name: '한진택배' },
  { code: 'lotte', name: '롯데택배' },
  { code: 'logen', name: '로젠택배' },
  { code: 'post', name: '우체국택배' },
  { code: 'gs', name: 'GS택배' },
  { code: 'cu', name: 'CU편의점택배' },
  { code: 'gs25', name: 'GS25편의점택배' },
];

// 중국 택배사 목록
const CHINESE_COURIERS = [
  { code: 'sf', name: '顺丰速运 (SF Express)' },
  { code: 'ems', name: '中国邮政 (China Post)' },
  { code: 'zto', name: '中通快递 (ZTO Express)' },
  { code: 'yto', name: '圆通速递 (YTO Express)' },
  { code: 'sto', name: '申通快递 (STO Express)' },
  { code: 'yunda', name: '韵达快递 (Yunda Express)' },
  { code: 'jd', name: '京东物流 (JD Logistics)' },
];

// 초기화 - Mock 데이터 제거
const MOCK_ORDERS: Order[] = [];

const MOCK_SHIPMENTS: Shipment[] = [];

function ShipmentsPageContent({ locale }: { locale: string }) {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [shipments, setShipments] = useState<Shipment[]>(MOCK_SHIPMENTS);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'shipping' | 'delivered' | 'refunded'>('pending');
  const [showShipModal, setShowShipModal] = useState(false);
  // const [showDetailModal, setShowShipModal] = useState(false); // 더 이상 사용하지 않음 - 모든 상세보기는 배송입력 모달 사용
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // 페이지당 20개 항목 표시
  const router = useRouter();
  const searchParams = useSearchParams();

  // 모바일 체크
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 배송 등록 폼 상태
  const [shipForm, setShipForm] = useState({
    // Korean Shipping - CJ대한통운 기본값
    courier: 'cj_logistics',
    trackingNo: '',
    trackingBarcode: '',
    // Chinese Shipping - YUANSUN 고정
    courierCn: 'yuansun',
    trackingNoCn: '',
    // Details
    shippingFee: '',
    actualWeight: '',
    volumeWeight: '',
    shipmentPhotoUrl: '',
    receiptPhotoUrl: '',
  });

  // 다국어 텍스트
  const texts = {
    ko: {
      title: '배송 관리',
      pendingTab: '배송 대기',
      shippingTab: '배송 중',
      deliveredTab: '배송 완료',
      refundedTab: '환불',
      searchPlaceholder: '주문번호, 고객명, 전화번호 검색...',
      // Pending Orders
      orderNo: '주문번호',
      orderDate: '주문일',
      customer: '고객',
      phone: '전화번호',
      product: '상품',
      items: '상품',
      address: '배송지',
      amount: '금액',
      action: '작업',
      registerShipping: '배송 등록',
      // Shipped Orders
      trackingNo: '운송장번호',
      courier: '택배사',
      shippingFee: '배송비 (¥)',
      weight: '무게',
      shippedAt: '발송일시',
      status: '상태',
      viewDetail: '상세보기',
      markDelivered: '배송완료',
      // Ship Modal
      shipModalTitle: '배송 정보 등록',
      koreanShipping: '한국 배송',
      chineseShipping: '중국 배송',
      selectCourier: '택배사 선택',
      trackingBarcode: '바코드번호',
      actualWeight: '실중량(kg)',
      volumeWeight: '부피중량(kg)',
      shipmentPhoto: '송장 사진 URL',
      receiptPhoto: '영수증 사진 URL',
      cancel: '취소',
      register: '등록',
      // Detail Modal
      detailModalTitle: '배송 상세 정보',
      orderInfo: '주문 정보',
      koreanTracking: '한국 배송 추적',
      chineseTracking: '중국 배송 추적',
      shippingDetails: '배송 상세',
      photos: '사진',
      shipmentPhotoLabel: '송장 사진',
      receiptPhotoLabel: '영수증 사진',
      openTracking: '추적 페이지 열기',
      close: '닫기',
      // Status
      pending: '대기',
      shipped: '배송중',
      delivered: '배송완료',
      noOrders: '배송 대기 중인 주문이 없습니다.',
      noShipments: '배송 중인 주문이 없습니다.',
    },
    'zh-CN': {
      title: '配送管理',
      pendingTab: '待发货',
      shippingTab: '配送中',
      deliveredTab: '已完成',
      refundedTab: '退款',
      searchPlaceholder: '搜索订单号、客户名、电话号码...',
      // Pending Orders
      orderNo: '订单号',
      orderDate: '订单日期',
      customer: '客户',
      items: '商品',
      address: '收货地址',
      amount: '金额',
      action: '操作',
      registerShipping: '登记配送',
      // Shipped Orders
      trackingNo: '运单号',
      courier: '快递公司',
      shippingFee: '运费 (¥)',
      weight: '重量',
      shippedAt: '发货时间',
      status: '状态',
      viewDetail: '查看详情',
      markDelivered: '确认收货',
      // Ship Modal
      shipModalTitle: '登记配送信息',
      koreanShipping: '韩国配送',
      chineseShipping: '中国配送',
      selectCourier: '选择快递公司',
      trackingBarcode: '条形码号',
      actualWeight: '实际重量(kg)',
      volumeWeight: '体积重量(kg)',
      shipmentPhoto: '运单照片 URL',
      receiptPhoto: '收据照片 URL',
      cancel: '取消',
      register: '登记',
      // Detail Modal
      detailModalTitle: '配送详情',
      orderInfo: '订单信息',
      koreanTracking: '韩国配送追踪',
      chineseTracking: '中国配送追踪',
      shippingDetails: '配送详情',
      photos: '照片',
      shipmentPhotoLabel: '运单照片',
      receiptPhotoLabel: '收据照片',
      openTracking: '打开追踪页面',
      close: '关闭',
      // Status
      pending: '待发货',
      shipped: '配送中',
      delivered: '已送达',
      noOrders: '没有待发货的订单。',
      noShipments: '没有配送中的订单。',
    }
  };

  const t = texts[locale as keyof typeof texts] || texts.ko;

  // 주문 데이터 로드 함수
  const loadOrders = async () => {
    console.log('🔄 주문 데이터 로드 시작...');
    try {
      // Supabase 직접 호출
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      console.log('📊 Supabase 클라이언트 생성 완료');
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              id,
              name,
              sku,
              model,
              price_krw
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      console.log('📋 주문 조회 결과:', {
        error: ordersError,
        dataCount: ordersData?.length || 0,
        firstOrder: ordersData?.[0]
      });
      
      // 상태값 확인을 위한 디버깅
      if (ordersData && ordersData.length > 0) {
        const statusCount = ordersData.reduce((acc: any, o: any) => {
          acc[o.status] = (acc[o.status] || 0) + 1;
          return acc;
        }, {});
        console.log('🔍 주문 상태 분포:', statusCount);
        console.log('🔍 주문 상태 샘플:', ordersData.slice(0, 5).map(o => ({
          order_number: o.order_number,
          status: o.status,
          status_type: typeof o.status
        })));
      }
      
      if (ordersError) {
        console.error('❌ 주문 데이터 로드 실패:', ordersError);
        alert(
          locale === 'ko'
            ? `주문 데이터 로드 실패: ${ordersError.message}`
            : `订单数据加载失败: ${ordersError.message}`
        );
        return;
      }
      
      if (ordersData) {
        console.log('🔍 첫 번째 주문 구조:', ordersData[0]);
        console.log('🔍 order_items 확인:', {
          exists: ordersData[0]?.order_items !== undefined,
          isArray: Array.isArray(ordersData[0]?.order_items),
          value: ordersData[0]?.order_items
        });
        
        const formattedOrders: Order[] = ordersData.map(order => {
          // order_items가 배열인지 확인
          const items = Array.isArray(order.order_items) 
            ? order.order_items.map((item: any) => {
                console.log('🔍 Order Item 상세:', {
                  product_name: item.product_name,
                  product_model: item.product_model,
                  unit_price_krw: item.unit_price_krw,
                  products: item.products
                });
                return {
                  productName: item.product_name || item.products?.name || '',
                  productModel: item.product_model || item.products?.model || '',
                  quantity: item.quantity || 0,
                  unitPrice: item.unit_price_krw || item.products?.price_krw || 0
                };
              })
            : [];
          
          return {
            id: order.id,
            orderNo: order.order_number,
            orderDate: order.created_at?.split('T')[0] || '',
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            shippingAddress: `${order.shipping_address_line1 || ''} ${order.shipping_address_line2 || ''}`.trim(),
            status: (order.status?.toLowerCase() || 'paid') as 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded',
            totalAmount: order.total_krw || 0,
            items: items
          };
        });
        
        console.log('✅ 포맷된 주문 데이터:', formattedOrders.length + '개');
        console.log('첫 번째 주문 상세:', formattedOrders[0]);
        setOrders(formattedOrders);
        console.log('📝 상태 업데이트 완료');
      }
    } catch (error) {
      console.error('주문 데이터 로드 중 오류:', error);
    }
  };

  // 배송 데이터 로드 함수
  const loadShipments = async () => {
    console.log('🚚 배송 데이터 로드 시작...');
    try {
      // Supabase 직접 호출
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      console.log('📦 Supabase 클라이언트 생성 완료');
      
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select(`
          *,
          orders (
            order_number,
            customer_name
          )
        `)
        .order('created_at', { ascending: false });
      
      console.log('🚛 배송 조회 결과:', {
        error: shipmentsError,
        dataCount: shipmentsData?.length || 0,
        firstShipment: shipmentsData?.[0]
      });
      
      if (shipmentsError) {
        console.error('❌ 배송 데이터 로드 실패:', shipmentsError);
        const errorMsg = locale === 'ko'
          ? `배송 데이터 로드 실패: ${shipmentsError.message}`
          : `配送数据加载失败: ${shipmentsError.message}`;
        alert(errorMsg);
        return;
      }
      
      if (shipmentsData) {
        // Courier enum을 display용으로 변환하는 함수
        const getCourierDisplayName = (courier: string) => {
          switch (courier) {
            case 'cj': return 'CJ대한통운';
            case 'hanjin': return '한진택배';
            case 'lotte': return '롯데택배';
            case 'epost': return '우체국택배';
            case 'logen': return '로젠택배';
            default: return courier;
          }
        };

        const formattedShipments: Shipment[] = shipmentsData.map(shipment => ({
          id: shipment.id,
          orderId: shipment.order_id,
          orderNo: shipment.orders?.order_number || '',
          customerName: shipment.orders?.customer_name || '',
          courier: getCourierDisplayName(shipment.courier), // Display용 이름으로 변환
          courierCode: shipment.courier, // 원본 enum 값
          trackingNo: shipment.tracking_number || '',
          trackingBarcode: shipment.tracking_number || '',
          trackingUrl: shipment.tracking_url || '',
          courierCn: '', // 중국 택배사 (향후 확장용)
          trackingNoCn: '', // 중국 운송장 (향후 확장용) 
          trackingUrlCn: '', // 중국 추적 URL (향후 확장용)
          shippingFee: shipment.shipping_cost_cny || (shipment.shipping_cost_krw ? shipment.shipping_cost_krw / 180 : 0),
          actualWeight: shipment.weight_g ? shipment.weight_g / 1000 : undefined, // g를 kg로 변환
          volumeWeight: undefined, // 부피중량 (향후 추가)
          shipmentPhotoUrl: Array.isArray(shipment.package_images) && shipment.package_images.length > 0 
            ? shipment.package_images[0] 
            : undefined,
          receiptPhotoUrl: undefined, // 영수증 사진 (향후 추가)
          shippedAt: shipment.created_at, // 배송 시작일
          deliveredAt: shipment.actual_delivery_date 
            ? (typeof shipment.actual_delivery_date === 'string' 
                ? shipment.actual_delivery_date.includes('T') 
                  ? shipment.actual_delivery_date 
                  : `${shipment.actual_delivery_date}T00:00:00.000Z`
                : undefined)
            : undefined,
          createdAt: shipment.created_at
        }));
        
        setShipments(formattedShipments);
        console.log(`✅ ${formattedShipments.length}개 배송 데이터 로드 완료`);
      }
    } catch (error) {
      console.error('배송 데이터 로드 중 오류:', error);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!role) {
      router.push(`/${locale}/`);
      return;
    }
    setUserRole(role);
    
    // 실제 데이터 로드
    loadOrders();
    loadShipments();
    
    // 주문관리에서 전달받은 주문 데이터 확인
    const pendingShipmentData = sessionStorage.getItem('pendingShipment');
    if (pendingShipmentData) {
      const orderData = JSON.parse(pendingShipmentData);
      
      // 실제 주문 찾기
      setTimeout(() => {
        setOrders(currentOrders => {
          const foundOrder = currentOrders.find(o => o.id === orderData.id);
          if (foundOrder) {
            setSelectedOrder(foundOrder);
            setShowShipModal(true);
          }
          return currentOrders;
        });
      }, 1000); // 데이터 로드 완료를 기다림
      
      // sessionStorage 클리어
      sessionStorage.removeItem('pendingShipment');
    }
  }, [locale, router]);

  // URL 파라미터로 전달받은 주문 확인 (대시보드에서 왔을 때)
  useEffect(() => {
    const tab = searchParams.get('tab');
    const orderId = searchParams.get('orderId');
    const action = searchParams.get('action');
    
    if (tab && orderId && orders.length > 0) {
      console.log('🔍 대시보드에서 전달받은 파라미터:', { tab, orderId, action });
      
      // 탭 설정
      if (tab === 'pending') setSelectedTab('pending');
      else if (tab === 'shipping') setSelectedTab('shipping');
      else if (tab === 'delivered') setSelectedTab('delivered');
      else if (tab === 'refunded') setSelectedTab('refunded');
      
      // 해당 주문 찾기
      const order = orders.find(o => o.id === orderId);
      if (order) {
        console.log('✅ 주문 찾음:', order);
        setSelectedOrder(order);
        
        // action에 따라 모달 표시
        if (action === 'register' && order.status === 'paid') {
          // 배송 등록 모달 표시 (paid 상태일 때만)
          setShowShipModal(true);
        } else if (action === 'detail') {
          // 배송중/배송완료 상태일 때는 shipment 정보도 찾기
          if (order.status === 'shipped' || order.status === 'delivered') {
            const shipment = shipments.find(s => s.orderId === orderId);
            if (shipment) {
              setSelectedShipment(shipment);
            }
          }
          // 상세보기 모달 표시 - 배송입력 모달 사용
          setShowShipModal(true);
        }
        
        // URL 파라미터 제거 (모달 닫을 때 다시 열리지 않도록)
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [searchParams, orders]);

  // 배송 대기 주문 필터링 (paid 상태인 주문만)
  const pendingOrders = orders.filter(order => {
    const isPaid = order.status === 'paid';
    const matchesSearch = searchTerm === '' || 
      order.orderNo.includes(searchTerm) ||
      order.customerName.includes(searchTerm) ||
      order.customerPhone.includes(searchTerm);
    
    return isPaid && matchesSearch;
  });

  // 배송 중 주문 필터링 (shipped 상태의 주문)
  const shippingOrders = orders.filter(order => {
    const isShipping = order.status === 'shipped';
    const matchesSearch = searchTerm === '' || 
      order.orderNo.includes(searchTerm) ||
      order.customerName.includes(searchTerm) ||
      order.customerPhone.includes(searchTerm);
    
    return isShipping && matchesSearch;
  });

  // 배송 완료 주문 필터링 (done 상태의 주문)
  const deliveredOrders = orders.filter(order => {
    const isDelivered = order.status === 'done' || order.status === 'delivered';
    const matchesSearch = searchTerm === '' || 
      order.orderNo.includes(searchTerm) ||
      order.customerName.includes(searchTerm) ||
      order.customerPhone.includes(searchTerm);
    
    return isDelivered && matchesSearch;
  });

  // 환불 주문 필터링 (refunded 상태의 주문)
  const refundedOrders = orders.filter(order => {
    const isRefunded = order.status === 'refunded';
    const matchesSearch = searchTerm === '' || 
      order.orderNo.includes(searchTerm) ||
      order.customerName.includes(searchTerm) ||
      order.customerPhone.includes(searchTerm);
    
    return isRefunded && matchesSearch;
  });

  // 배송 등록
  const handleShipRegister = async () => {
    // 중국 운송장 번호와 배송비는 필수, 한국 배송 정보는 옵션
    if (!selectedOrder || !shipForm.trackingNoCn || !shipForm.shippingFee) {
      const requiredMsg = locale === 'ko'
        ? '중국 운송장 번호, 배송비는 필수 입력 항목입니다.'
        : '中国运单号、运费是必填项。';
      alert(requiredMsg);
      return;
    }

    try {
      // API를 통해 배송 정보 등록 (출납장부 기록 포함)
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          // 한국 배송 (옵션)
          courier: shipForm.courier || null,
          trackingNumber: shipForm.trackingNo || null,
          trackingUrl: shipForm.courier && shipForm.trackingNo ? generateTrackingUrl(shipForm.courier, shipForm.trackingNo) : null,
          // 중국 배송 (필수) - YUANSUN 고정
          courierCn: 'yuansun',
          trackingNumberCn: shipForm.trackingNoCn,
          trackingUrlCn: generateTrackingUrl('yuansun', shipForm.trackingNoCn),
          // 배송 상세
          shippingCost: shipForm.shippingFee ? parseFloat(shipForm.shippingFee) : null,
          weight: shipForm.actualWeight ? parseFloat(shipForm.actualWeight) * 1000 : null, // kg를 g로 변환
          packageImages: shipForm.shipmentPhotoUrl ? [shipForm.shipmentPhotoUrl] : [],
          notes: `${selectedOrder.orderNo} 배송`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('배송 정보 저장 실패:', errorData);
        const saveErrorMsg = locale === 'ko'
          ? `배송 정보 저장 중 오류가 발생했습니다.\n\n오류 내용: ${errorData.error || errorData.message || '알 수 없는 오류'}`
          : `保存配送信息时发生错误。\n\n错误内容: ${errorData.error || errorData.message || '未知错误'}`;
        alert(saveErrorMsg);
        return;
      }

      const result = await response.json();
      
      // 3. UI 상태 업데이트
      const newShipment: Shipment = {
        id: result.shipment.id,
        orderId: selectedOrder.id,
        orderNo: selectedOrder.orderNo,
        customerName: selectedOrder.customerName,
        courier: KOREAN_COURIERS.find(c => c.code === shipForm.courier)?.name,
        courierCode: shipForm.courier,
        trackingNo: shipForm.trackingNo,
        trackingBarcode: shipForm.trackingNo,
        trackingUrl: generateTrackingUrl(shipForm.courier, shipForm.trackingNo),
        shippingFee: shipForm.shippingFee ? parseFloat(shipForm.shippingFee) : undefined,
        actualWeight: shipForm.actualWeight ? parseFloat(shipForm.actualWeight) : undefined,
        shipmentPhotoUrl: shipForm.shipmentPhotoUrl || undefined,
        shippedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      setShipments([...shipments, newShipment]);
      
      // 주문 상태 업데이트
      setOrders(orders.map(o => 
        o.id === selectedOrder.id ? { ...o, status: 'shipped' } : o
      ));

      // 모달 닫기 및 폼 초기화
      setShowShipModal(false);
      setSelectedOrder(null);
      setShipForm({
        courier: '',
        trackingNo: '',
        trackingBarcode: '',
        courierCn: 'yuansun',
        trackingNoCn: '',
        shippingFee: '',
        actualWeight: '',
        volumeWeight: '',
        shipmentPhotoUrl: '',
        receiptPhotoUrl: '',
      });
      
      alert(locale === 'ko' ? '배송 정보가 등록되었습니다.' : '已登记运输信息');
    } catch (error: any) {
      console.error('배송 등록 중 오류:', error);
      alert(
        locale === 'ko' 
          ? `배송 등록 중 오류가 발생했습니다.\n\n오류 내용: ${error.message || error}`
          : `运输登记时发生错误\n\n错误内容: ${error.message || error}`
      );
    }
  };

  // 페이지네이션 계산
  const totalPendingPages = Math.ceil(pendingOrders.length / itemsPerPage);
  const totalShippingPages = Math.ceil(shippingOrders.length / itemsPerPage);
  const totalDeliveredPages = Math.ceil(deliveredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPendingOrders = pendingOrders.slice(startIndex, endIndex);
  const paginatedShippingOrders = shippingOrders.slice(startIndex, endIndex);
  const paginatedDeliveredOrders = deliveredOrders.slice(startIndex, endIndex);

  // 탭 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTab]);
  
  // 디버깅: 필터링된 데이터 확인
  useEffect(() => {
    // 상태별 주문 수 계산
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 현재 표시할 데이터:', {
      tab: selectedTab,
      pendingOrdersCount: pendingOrders.length,
      shippingOrdersCount: shippingOrders.length,
      deliveredOrdersCount: deliveredOrders.length,
      totalOrdersLoaded: orders.length,
      totalShipmentsLoaded: shipments.length,
      statusBreakdown: statusCounts
    });
  }, [selectedTab, pendingOrders.length, shippingOrders.length, deliveredOrders.length, orders.length, shipments.length]);

  // 한국 택배 추적 URL 생성
  const generateTrackingUrl = (courierCode: string, trackingNo: string): string => {
    const urls: { [key: string]: string } = {
      cj: `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${trackingNo}`,
      hanjin: `https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${trackingNo}`,
      lotte: `https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=${trackingNo}`,
      logen: `https://www.ilogen.com/web/personal/trace/${trackingNo}`,
      post: `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${trackingNo}`,
      gs: `https://www.gscvs.com/main/tracking?trackingNumber=${trackingNo}`,
      cu: `https://www.cupost.co.kr/postbox/delivery/localResult.cupost?invoice_no=${trackingNo}`,
      gs25: `https://www.gs25.gsretail.com/gscvs/ko/customer-engagement/parcel/tracking?trackingNumber=${trackingNo}`,
    };
    return urls[courierCode] || '#';
  };

  // 중국 택배 추적 URL 생성
  const generateChineseTrackingUrl = (courierCode: string, trackingNo: string): string => {
    const urls: { [key: string]: string } = {
      sf: `https://www.sf-express.com/cn/sc/dynamic_function/waybill/#search/bill-number/${trackingNo}`,
      ems: `https://www.ems.com.cn/queryList?mailNo=${trackingNo}`,
      zto: `https://www.zto.com/express/expressCheck.html?txtbill=${trackingNo}`,
      yto: `https://www.yto.net.cn/gw/service/api/tracking/guestpush?mailNo=${trackingNo}`,
      sto: `https://www.sto.cn/web/waybill.jsp?billcode=${trackingNo}`,
      yunda: `https://www.yundaex.com/cn/track/index?number=${trackingNo}`,
      jd: `https://www.jdl.com/#/express/toSearch?waybillNo=${trackingNo}`,
    };
    return urls[courierCode] || '#';
  };

  // 배송 완료 처리
  const handleMarkDelivered = async (orderId: string) => {
    try {
      // Supabase 클라이언트 가져오기
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      // 데이터베이스에서 주문 상태를 delivered으로 업데이트
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'done' })
        .eq('id', orderId);
      
      if (orderError) {
        console.error('주문 상태 업데이트 실패:', orderError);
        alert(
          locale === 'ko'
            ? `배송완료 처리 중 오류가 발생했습니다.\n\n오류 내용: ${orderError.message}`
            : `处理配送完成时发生错误\n\n错误内容: ${orderError.message}`
        );
        return;
      }
      
      // 해당 주문의 배송 정보가 있으면 배송 완료 시간 업데이트
      const shipment = shipments.find(s => s.orderId === orderId);
      if (shipment) {
        const { error: shipmentError } = await supabase
          .from('shipments')
          .update({ 
            actual_delivery_date: new Date().toISOString(),
            status: 'delivered'
          })
          .eq('id', shipment.id);
        
        if (shipmentError) {
          console.error('배송 정보 업데이트 실패:', shipmentError);
        }
      }
      
      // UI 상태 업데이트
      setOrders(orders.map(o =>
        o.id === orderId ? { ...o, status: 'done' } : o
      ));
      
      if (shipment) {
        setShipments(shipments.map(s =>
          s.id === shipment.id ? { ...s, deliveredAt: new Date().toISOString() } : s
        ));
      }
      
      // 모달 닫기
      setShowShipModal(false);
      setSelectedShipment(null);
      setSelectedOrder(null);
      
      alert(locale === 'ko' ? '배송완료 처리되었습니다.' : '配送已完成');
    } catch (error: any) {
      console.error('배송완료 처리 중 오류:', error);
      alert(
        locale === 'ko'
          ? `배송완료 처리 중 오류가 발생했습니다.\n\n오류 내용: ${error.message || error}`
          : `处理配送完成时发生错误\n\n错误内容: ${error.message || error}`
      );
    }
  };

  // 환불 처리
  const handleRefund = async (orderId: string) => {
    const confirmMessage = locale === 'ko' 
      ? '정말로 이 주문을 환불 처리하시겠습니까?' 
      : '确定要退款处理此订单吗？';
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // API를 통해 환불 처리
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: orderId,
          status: 'refunded'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('환불 처리 실패:', errorData);
        const errorMessage = locale === 'ko'
          ? `환불 처리 중 오류가 발생했습니다.\n\n오류 내용: ${errorData.error || errorData.message || '알 수 없는 오류'}`
          : `退款处理时发生错误。\n\n错误内容: ${errorData.error || errorData.message || '未知错误'}`;
        alert(errorMessage);
        return;
      }

      // UI 상태 업데이트
      setOrders(orders.map(o =>
        o.id === orderId ? { ...o, status: 'refunded' } : o
      ));

      // 모달 닫기
      setShowShipModal(false);
      setSelectedShipment(null);
      setSelectedOrder(null);

      const successMessage = locale === 'ko' 
        ? '환불 처리가 완료되었습니다.' 
        : '退款处理已完成。';
      alert(successMessage);
    } catch (error: any) {
      console.error('환불 처리 중 오류:', error);
      const errorMessage = locale === 'ko'
        ? `환불 처리 중 오류가 발생했습니다.\n\n오류 내용: ${error.message || error}`
        : `退款处理时发生错误。\n\n错误内容: ${error.message || error}`;
      alert(errorMessage);
    }
  };

  return (
    <div style={{ padding: '2rem', paddingBottom: '5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          {t.title}
        </h1>
        
        {/* 검색 */}
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>

      {/* 탭 */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <button
            onClick={() => setSelectedTab('pending')}
            style={{
              padding: '0.75rem 0',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: selectedTab === 'pending' ? '2px solid #2563eb' : 'none',
              color: selectedTab === 'pending' ? '#2563eb' : '#6b7280',
              background: 'none',
              cursor: 'pointer',
              fontWeight: selectedTab === 'pending' ? '600' : '400'
            }}
          >
            {t.pendingTab} ({pendingOrders.length})
          </button>
          <button
            onClick={() => setSelectedTab('shipping')}
            style={{
              padding: '0.75rem 0',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: selectedTab === 'shipping' ? '2px solid #2563eb' : 'none',
              color: selectedTab === 'shipping' ? '#2563eb' : '#6b7280',
              background: 'none',
              cursor: 'pointer',
              fontWeight: selectedTab === 'shipping' ? '600' : '400'
            }}
          >
            {t.shippingTab} ({shippingOrders.length})
          </button>
          <button
            onClick={() => setSelectedTab('delivered')}
            style={{
              padding: '0.75rem 0',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: selectedTab === 'delivered' ? '2px solid #2563eb' : 'none',
              color: selectedTab === 'delivered' ? '#2563eb' : '#6b7280',
              background: 'none',
              cursor: 'pointer',
              fontWeight: selectedTab === 'delivered' ? '600' : '400'
            }}
          >
            {t.deliveredTab} ({deliveredOrders.length})
          </button>
          <button
            onClick={() => setSelectedTab('refunded')}
            style={{
              padding: '0.75rem 0',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: selectedTab === 'refunded' ? '2px solid #2563eb' : 'none',
              color: selectedTab === 'refunded' ? '#2563eb' : '#6b7280',
              background: 'none',
              cursor: 'pointer',
              fontWeight: selectedTab === 'refunded' ? '600' : '400'
            }}
          >
            {t.refundedTab} ({refundedOrders.length})
          </button>
        </div>
      </div>

      {/* 배송 대기 목록 */}
      {selectedTab === 'pending' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              onClick={() => {
                const columns = [
                  { header: t.orderNo, key: 'orderNo', width: 15 },
                  { header: t.customer, key: 'customerName', width: 20 },
                  { header: locale === 'ko' ? '전화번호' : '电话号码', key: 'customerPhone', width: 20 },
                  { header: t.address, key: 'shippingAddress', width: 35 },
                  { header: t.items, key: 'productName', width: 25 },
                  { header: t.status, key: 'status', width: 15 }
                ];
                
                const dataToExport = pendingOrders.map(order => ({
                  ...order,
                  productName: order.items.map(item => `${item.productName} x ${item.quantity}`).join(', ')
                }));
                
                exportToExcel({
                  data: dataToExport,
                  columns,
                  fileName: locale === 'ko' ? '배송대기' : 'pending_shipments',
                  sheetName: locale === 'ko' ? '배송대기' : 'Pending'
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
                gap: '0.5rem'
              }}
            >
              📥 {locale === 'ko' ? '엑셀 저장' : locale === 'zh-CN' ? '导出Excel' : 'Export'}
            </button>
          </div>
          {pendingOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              {t.noOrders}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.orderNo}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.customer}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{
                      locale === 'ko' ? '전화번호' : locale === 'zh-CN' ? '电话号码' : 'Phone'
                    }</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.address}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.items}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPendingOrders.map(order => (
                    <tr 
                      key={order.id} 
                      style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        console.log('📋 선택된 주문:', order);
                        console.log('📦 주문 아이템:', order.items);
                        setSelectedOrder(order);
                        setShowShipModal(true);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '0.75rem', color: '#2563eb', fontWeight: '500' }}>{order.orderNo}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: '500' }}>{order.customerName}</div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        {order.customerPhone}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{order.shippingAddress}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {order.items.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '0.875rem' }}>
                            {item.productName} x {item.quantity}
                          </div>
                        ))}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af'
                        }}>
                          {t.pending}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* 페이지네이션 */}
          {pendingOrders.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPendingPages}
              onPageChange={setCurrentPage}
              totalItems={pendingOrders.length}
              itemsPerPage={itemsPerPage}
              className="mt-4"
            />
          )}
        </div>
      )}

      {/* 배송 중 목록 */}
      {selectedTab === 'shipping' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              onClick={() => {
                const columns = [
                  { header: t.orderNo, key: 'orderNo', width: 15 },
                  { header: t.customer, key: 'customerName', width: 20 },
                  { header: locale === 'ko' ? '전화번호' : '电话号码', key: 'customerPhone', width: 20 },
                  { header: t.address, key: 'shippingAddress', width: 35 },
                  { header: t.items, key: 'productName', width: 25 },
                  { header: t.status, key: 'status', width: 15 }
                ];
                
                const dataToExport = shippingOrders.map(order => ({
                  ...order,
                  productName: order.items.map(item => `${item.productName} x ${item.quantity}`).join(', ')
                }));
                
                exportToExcel({
                  data: dataToExport,
                  columns,
                  fileName: locale === 'ko' ? '배송중' : 'shipping_orders',
                  sheetName: locale === 'ko' ? '배송중' : 'Shipping'
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
                gap: '0.5rem'
              }}
            >
              📥 {locale === 'ko' ? '엑셀 저장' : locale === 'zh-CN' ? '导出Excel' : 'Export'}
            </button>
          </div>
          {shippingOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              배송 중인 주문이 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.orderNo}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.customer}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{
                      locale === 'ko' ? '전화번호' : locale === 'zh-CN' ? '电话号码' : 'Phone'
                    }</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.address}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.items}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedShippingOrders.map(order => {
                    return (
                      <tr 
                        key={order.id} 
                        style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          cursor: 'pointer'
                        }}
                        onClick={async () => {
                          setSelectedOrder(order);
                          // 배송 정보를 폼에 로드
                          const { createClient } = await import('@/lib/supabase/client');
                          const supabase = createClient();
                          const { data: shipmentData } = await supabase
                            .from('shipments')
                            .select('*')
                            .eq('order_id', order.id)
                            .single();
                          
                          if (shipmentData) {
                            setShipForm({
                              trackingNoCn: shipmentData.tracking_number_cn || '',
                              trackingNo: shipmentData.tracking_number_kr || '',
                              courier: shipmentData.courier_kr || 'EMS',
                              trackingBarcode: shipmentData.tracking_barcode || '',
                              shipmentPhotoUrl: shipmentData.shipment_photo_url || '',
                              receiptPhotoUrl: shipmentData.receipt_photo_url || '',
                              shippingFee: shipmentData.shipping_fee_cny || 0,
                              actualWeight: shipmentData.actual_weight || 0,
                              volumeWeight: shipmentData.volume_weight || 0
                            });
                          }
                          setShowShipModal(true);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{ padding: '0.75rem', color: '#2563eb', fontWeight: '500' }}>{order.orderNo}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: '500' }}>{order.customerName}</div>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          {order.customerPhone}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{order.shippingAddress}</td>
                        <td style={{ padding: '0.75rem' }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ fontSize: '0.875rem' }}>
                              {item.productName} x {item.quantity}
                            </div>
                          ))}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: '#fef3c7',
                            color: '#92400e'
                          }}>
                            {order.status === 'delivered' ? t.delivered : t.shipped}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* 페이지네이션 */}
          {shippingOrders.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalShippingPages}
              onPageChange={setCurrentPage}
              totalItems={shippingOrders.length}
              itemsPerPage={itemsPerPage}
              className="mt-4"
            />
          )}
        </div>
      )}

      {/* 배송 완료 목록 */}
      {selectedTab === 'delivered' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              onClick={() => {
                const columns = [
                  { header: t.orderNo, key: 'orderNo', width: 15 },
                  { header: t.customer, key: 'customerName', width: 20 },
                  { header: locale === 'ko' ? '전화번호' : '电话号码', key: 'customerPhone', width: 20 },
                  { header: t.address, key: 'shippingAddress', width: 35 },
                  { header: t.items, key: 'productName', width: 25 },
                  { header: t.status, key: 'status', width: 15 }
                ];
                
                const dataToExport = deliveredOrders.map(order => ({
                  ...order,
                  productName: order.items.map(item => `${item.productName} x ${item.quantity}`).join(', ')
                }));
                
                exportToExcel({
                  data: dataToExport,
                  columns,
                  fileName: locale === 'ko' ? '배송완료' : 'delivered_orders',
                  sheetName: locale === 'ko' ? '배송완료' : 'Delivered'
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
                gap: '0.5rem'
              }}
            >
              📥 {locale === 'ko' ? '엑셀 저장' : locale === 'zh-CN' ? '导出Excel' : 'Export'}
            </button>
          </div>
          {deliveredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              배송 완료된 주문이 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.orderNo}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.customer}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{
                      locale === 'ko' ? '전화번호' : locale === 'zh-CN' ? '电话号码' : 'Phone'
                    }</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.address}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.items}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDeliveredOrders.map(order => {
                    return (
                      <tr 
                        key={order.id} 
                        style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          cursor: 'pointer'
                        }}
                        onClick={async () => {
                          setSelectedOrder(order);
                          // 배송 정보를 폼에 로드
                          const { createClient } = await import('@/lib/supabase/client');
                          const supabase = createClient();
                          const { data: shipmentData } = await supabase
                            .from('shipments')
                            .select('*')
                            .eq('order_id', order.id)
                            .single();
                          
                          if (shipmentData) {
                            setShipForm({
                              trackingNoCn: shipmentData.tracking_number_cn || '',
                              trackingNo: shipmentData.tracking_number_kr || '',
                              courier: shipmentData.courier_kr || 'EMS',
                              trackingBarcode: shipmentData.tracking_barcode || '',
                              shipmentPhotoUrl: shipmentData.shipment_photo_url || '',
                              receiptPhotoUrl: shipmentData.receipt_photo_url || '',
                              shippingFee: shipmentData.shipping_fee_cny || 0,
                              actualWeight: shipmentData.actual_weight || 0,
                              volumeWeight: shipmentData.volume_weight || 0
                            });
                          }
                          setShowShipModal(true);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{ padding: '0.75rem', color: '#2563eb', fontWeight: '500' }}>{order.orderNo}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: '500' }}>{order.customerName}</div>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          {order.customerPhone}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{order.shippingAddress}</td>
                        <td style={{ padding: '0.75rem' }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ fontSize: '0.875rem' }}>
                              {item.productName} x {item.quantity}
                            </div>
                          ))}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: '#dcfce7',
                            color: '#166534'
                          }}>
                            {t.delivered}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* 페이지네이션 */}
          {deliveredOrders.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalDeliveredPages}
              onPageChange={setCurrentPage}
              totalItems={deliveredOrders.length}
              itemsPerPage={itemsPerPage}
              className="mt-4"
            />
          )}
        </div>
      )}

      {/* 환불 목록 */}
      {selectedTab === 'refunded' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              onClick={() => {
                const columns = [
                  { header: t.orderNo, key: 'orderNo', width: 15 },
                  { header: t.customer, key: 'customerName', width: 20 },
                  { header: locale === 'ko' ? '전화번호' : '电话号码', key: 'customerPhone', width: 20 },
                  { header: t.address, key: 'shippingAddress', width: 35 },
                  { header: t.items, key: 'productName', width: 25 },
                  { header: t.status, key: 'status', width: 15 }
                ];
                
                const data = refundedOrders.map(order => ({
                  orderNo: order.orderNo,
                  customerName: order.customerName,
                  customerPhone: order.customerPhone,
                  shippingAddress: order.shippingAddress,
                  productName: order.items.map(item => `${item.productName}(${item.quantity})`).join(', '),
                  status: locale === 'ko' ? '환불' : '退款'
                }));
                
                exportToExcel(data, columns, `refunded_orders_${new Date().toISOString().split('T')[0]}`);
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {locale === 'ko' ? '엑셀 다운로드' : '导出Excel'}
            </button>
          </div>
          {refundedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              {locale === 'ko' ? '환불된 주문이 없습니다.' : '没有退款订单。'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.orderNo}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.customer}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{
                      locale === 'ko' ? '전화번호' : locale === 'zh-CN' ? '电话号码' : 'Phone'
                    }</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.address}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.items}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {refundedOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(order => (
                    <tr 
                      key={order.id} 
                      style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={async () => {
                        setSelectedOrder(order);
                        // 환불된 주문의 배송 정보 조회
                        if (order.id) {
                          const { createClient } = await import('@/lib/supabase/client');
                          const supabase = createClient();
                          const { data: shipmentData } = await supabase
                            .from('shipments')
                            .select('*')
                            .eq('order_id', order.id)
                            .single();
                          
                          if (shipmentData) {
                            setShipForm({
                              trackingNoCn: shipmentData.tracking_number_cn || '',
                              trackingNo: shipmentData.tracking_number_kr || '',
                              courier: shipmentData.courier_kr || 'EMS',
                              trackingBarcode: shipmentData.tracking_barcode || '',
                              shipmentPhotoUrl: shipmentData.shipment_photo_url || '',
                              receiptPhotoUrl: shipmentData.receipt_photo_url || '',
                              shippingFee: shipmentData.shipping_fee_cny || 0,
                              actualWeight: shipmentData.actual_weight || 0,
                              volumeWeight: shipmentData.volume_weight || 0
                            });
                          }
                        }
                        setShowShipModal(true);
                      }}
                    >
                      <td style={{ padding: '0.75rem', color: '#2563eb', fontWeight: '500' }}>{order.orderNo}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: '500' }}>{order.customerName}</div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        {order.customerPhone}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{order.shippingAddress}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {order.items.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '0.875rem' }}>
                            {item.productName} x {item.quantity}
                          </div>
                        ))}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '0.25rem 0.75rem', 
                          backgroundColor: '#fee2e2', 
                          color: '#dc2626',
                          borderRadius: '9999px',
                          fontSize: '0.875rem'
                        }}>
                          {locale === 'ko' ? '환불' : '退款'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* 페이지네이션 */}
          {refundedOrders.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(refundedOrders.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              totalItems={refundedOrders.length}
              itemsPerPage={itemsPerPage}
              className="mt-4"
            />
          )}
        </div>
      )}

      {/* 배송 등록 모달 */}
      {showShipModal && selectedOrder && (
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
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {selectedOrder?.status === 'refunded' ? t.shipmentDetail : t.shipModalTitle}
            </h2>

            {/* 주문 정보 */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.375rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <strong>{t.orderNo}:</strong> {selectedOrder.orderNo}
                </div>
                <div>
                  <strong>{t.customer}:</strong> {selectedOrder.customerName} ({selectedOrder.customerPhone})
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <strong>{t.address}:</strong> {selectedOrder.shippingAddress}
                </div>
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <>
                    <div>
                      <strong>{locale === 'ko' ? '상품명' : '产品名'}:</strong> {selectedOrder.items[0].productName}
                    </div>
                    <div>
                      <strong>{locale === 'ko' ? '모델명' : '型号'}:</strong> {selectedOrder.items[0].productModel || '-'}
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <strong>{locale === 'ko' ? '판매가' : '售价'}:</strong> ₩{(selectedOrder.items[0].unitPrice || 0).toLocaleString()}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 택배사 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                {locale === 'ko' ? '택배사 정보' : '快递公司信息'}
              </h3>
              
              {/* 중국 택배사 */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                  {locale === 'ko' ? '중국 택배사' : '中国快递'}
                </label>
                <input
                  type="text"
                  value="YUANSUN"
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#f3f4f6',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              {/* 한국 택배사 */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                  {locale === 'ko' ? '한국 택배사' : '韩国快递'}
                </label>
                <select
                  value={shipForm.courier || 'cj_logistics'}
                  onChange={(e) => selectedOrder?.status === 'paid' && setShipForm({ ...shipForm, courier: e.target.value })}
                  disabled={selectedOrder?.status !== 'paid'}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: selectedOrder?.status !== 'paid' ? '#f3f4f6' : 'white',
                    cursor: selectedOrder?.status !== 'paid' ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="cj_logistics">CJ대한통운</option>
                  {KOREAN_COURIERS.filter(c => c.code !== 'cj_logistics').map(courier => (
                    <option key={courier.code} value={courier.code}>
                      {courier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 송장번호 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.trackingNo} *
                </label>
                <input
                  type="text"
                  value={shipForm.trackingNoCn}
                  onChange={(e) => selectedOrder?.status !== 'refunded' && setShipForm({ ...shipForm, trackingNoCn: e.target.value, trackingNo: e.target.value })}
                  readOnly={selectedOrder?.status === 'refunded'}
                  placeholder={locale === 'ko' ? '송장번호를 입력하세요' : '请输入运单号'}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: selectedOrder?.status === 'refunded' ? '#f3f4f6' : 'white',
                    cursor: selectedOrder?.status === 'refunded' ? 'not-allowed' : 'text'
                  }}
                />
              </div>
            </div>

            {/* 배송 상세 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                {t.shippingDetails}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.shippingFee} *
                  </label>
                  <input
                    type="number"
                    value={shipForm.shippingFee}
                    onChange={(e) => selectedOrder?.status === 'paid' && setShipForm({ ...shipForm, shippingFee: e.target.value })}
                    readOnly={selectedOrder?.status !== 'paid'}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      backgroundColor: selectedOrder?.status !== 'paid' ? '#f3f4f6' : 'white',
                      cursor: selectedOrder?.status !== 'paid' ? 'not-allowed' : 'text'
                    }}
                    placeholder={selectedOrder?.status === 'paid' ? "필수 입력 (CNY)" : ""}
                    required={selectedOrder?.status === 'paid'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.actualWeight}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={shipForm.actualWeight}
                    onChange={(e) => selectedOrder?.status === 'paid' && setShipForm({ ...shipForm, actualWeight: e.target.value })}
                    readOnly={selectedOrder?.status !== 'paid'}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      backgroundColor: selectedOrder?.status !== 'paid' ? '#f3f4f6' : 'white',
                      cursor: selectedOrder?.status !== 'paid' ? 'not-allowed' : 'text'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.volumeWeight}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={shipForm.volumeWeight}
                    onChange={(e) => selectedOrder?.status === 'paid' && setShipForm({ ...shipForm, volumeWeight: e.target.value })}
                    readOnly={selectedOrder?.status !== 'paid'}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      backgroundColor: selectedOrder?.status !== 'paid' ? '#f3f4f6' : 'white',
                      cursor: selectedOrder?.status !== 'paid' ? 'not-allowed' : 'text'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 사진 업로드 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <ImageUpload
                  label={t.shipmentPhoto}
                  value={shipForm.shipmentPhotoUrl}
                  onChange={(url) => setShipForm({ ...shipForm, shipmentPhotoUrl: url })}
                  locale={locale}
                />
                <ImageUpload
                  label={t.receiptPhoto}
                  value={shipForm.receiptPhotoUrl}
                  onChange={(url) => setShipForm({ ...shipForm, receiptPhotoUrl: url })}
                  locale={locale}
                />
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {/* 환불 처리 버튼 - 배송대기/배송중/배송완료 상태일 때 (환불 상태가 아닐 때) */}
              {selectedOrder?.status !== 'refunded' && selectedOrder?.status !== 'cancelled' && (
                <button
                  onClick={() => handleRefund(selectedOrder.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  {locale === 'ko' ? '환불 처리' : '退款处理'}
                </button>
              )}
              
              {/* 배송완료 버튼 - 배송중 상태일 때만 */}
              {selectedOrder?.status === 'shipped' && (
                <button
                  onClick={() => handleMarkDelivered(selectedOrder.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  {locale === 'ko' ? '배송 완료' : '配送完成'}
                </button>
              )}
              
              {/* 닫기 버튼 */}
              <button
                onClick={() => {
                  setShowShipModal(false);
                  setSelectedOrder(null);
                  setShipForm({
                    courier: '',
                    trackingNo: '',
                    trackingBarcode: '',
                    courierCn: '',
                    trackingNoCn: '',
                    shippingFee: '',
                    actualWeight: '',
                    volumeWeight: '',
                    shipmentPhotoUrl: '',
                    receiptPhotoUrl: '',
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
                {selectedOrder?.status === 'paid' ? t.cancel : t.close}
              </button>
              
              {/* 배송 등록 버튼 - paid 상태일 때만 */}
              {selectedOrder?.status === 'paid' && (
                <button
                  onClick={handleShipRegister}
                  disabled={!shipForm.courierCn || !shipForm.trackingNoCn}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: shipForm.courierCn && shipForm.trackingNoCn ? '#2563eb' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: shipForm.courierCn && shipForm.trackingNoCn ? 'pointer' : 'not-allowed'
                  }}
                >
                  {t.register}
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* 모바일에서만 하단 네비게이션 표시 */}
      {isMobile && <MobileBottomNav locale={locale} />}
    </div>
  );
}

export default function ShipmentsPage({ params: { locale } }: ShipmentsPageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ShipmentsPageContent locale={locale} />
    </Suspense>
  );
}