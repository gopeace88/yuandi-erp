/**
 * 배송 관리 페이지
 * PRD v2.0 요구사항: 한국/중국 이중 배송 시스템
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  status: 'PAID' | 'SHIPPED' | 'DONE' | 'CANCELLED' | 'REFUNDED';
  totalAmount: number;
  items: Array<{
    productName: string;
    quantity: number;
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

export default function ShipmentsPage({ params: { locale } }: ShipmentsPageProps) {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [shipments, setShipments] = useState<Shipment[]>(MOCK_SHIPMENTS);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'shipped'>('pending');
  const [showShipModal, setShowShipModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // 페이지당 20개 항목 표시
  const router = useRouter();

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
    // Korean Shipping
    courier: '',
    trackingNo: '',
    trackingBarcode: '',
    // Chinese Shipping  
    courierCn: '',
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
      shippedTab: '배송 중/완료',
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
      shippingFee: '배송비',
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
      shippedTab: '配送中/已完成',
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
      shippingFee: '运费',
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
              sku
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
        console.log('🔍 주문 상태 확인:', ordersData.map(o => ({
          order_number: o.order_number,
          status: o.status,
          status_type: typeof o.status
        })));
      }
      
      if (ordersError) {
        console.error('❌ 주문 데이터 로드 실패:', ordersError);
        alert(`주문 데이터 로드 실패: ${ordersError.message}`);
        return;
      }
      
      if (ordersData) {
        const formattedOrders: Order[] = ordersData.map(order => ({
          id: order.id,
          orderNo: order.order_number,
          orderDate: order.created_at?.split('T')[0] || '',
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          shippingAddress: `${order.shipping_address_line1} ${order.shipping_address_line2 || ''}`.trim(),
          status: (order.status?.toUpperCase() || 'PAID') as 'PAID' | 'SHIPPED' | 'DONE' | 'CANCELLED' | 'REFUNDED',
          totalAmount: order.total_krw,
          items: order.order_items.map((item: any) => ({
            productName: item.products?.name || '',
            quantity: item.quantity
          }))
        }));
        
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
        alert(`배송 데이터 로드 실패: ${shipmentsError.message}`);
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
          shippingFee: shipment.shipping_cost_krw || 0,
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

  // 배송 대기 주문 필터링
  const pendingOrders = orders.filter(order => {
    // PAID 상태이면서 아직 배송 정보가 없는 주문
    const isPaid = order.status === 'PAID';
    const hasNoShipment = !shipments.find(s => s.orderId === order.id);
    const matchesSearch = searchTerm === '' || 
      order.orderNo.includes(searchTerm) ||
      order.customerName.includes(searchTerm) ||
      order.customerPhone.includes(searchTerm);
    
    // 디버깅을 위한 로그
    if (orders.indexOf(order) === 0) {
      console.log('🔍 필터링 체크 (첫 번째 주문):', {
        orderNo: order.orderNo,
        status: order.status,
        isPaid,
        hasNoShipment,
        matchesSearch,
        willBeIncluded: isPaid && hasNoShipment && matchesSearch
      });
    }
    
    return isPaid && hasNoShipment && matchesSearch;
  });

  // 배송 중/완료 주문 필터링
  const shippedOrders = shipments.filter(shipment =>
    searchTerm === '' ||
    shipment.orderNo.includes(searchTerm) ||
    shipment.customerName.includes(searchTerm) ||
    (shipment.trackingNo && shipment.trackingNo.includes(searchTerm)) ||
    (shipment.trackingNoCn && shipment.trackingNoCn.includes(searchTerm))
  );

  // 배송 등록
  const handleShipRegister = () => {
    if (!selectedOrder || !shipForm.courier || !shipForm.trackingNo) return;

    const newShipment: Shipment = {
      id: Date.now().toString(),
      orderId: selectedOrder.id,
      orderNo: selectedOrder.orderNo,
      customerName: selectedOrder.customerName,
      courier: KOREAN_COURIERS.find(c => c.code === shipForm.courier)?.name,
      courierCode: shipForm.courier,
      trackingNo: shipForm.trackingNo,
      trackingBarcode: shipForm.trackingBarcode,
      trackingUrl: generateTrackingUrl(shipForm.courier, shipForm.trackingNo),
      courierCn: shipForm.courierCn ? CHINESE_COURIERS.find(c => c.code === shipForm.courierCn)?.name : undefined,
      trackingNoCn: shipForm.trackingNoCn || undefined,
      trackingUrlCn: shipForm.courierCn && shipForm.trackingNoCn ? 
        generateChineseTrackingUrl(shipForm.courierCn, shipForm.trackingNoCn) : undefined,
      shippingFee: shipForm.shippingFee ? parseFloat(shipForm.shippingFee) : undefined,
      actualWeight: shipForm.actualWeight ? parseFloat(shipForm.actualWeight) : undefined,
      volumeWeight: shipForm.volumeWeight ? parseFloat(shipForm.volumeWeight) : undefined,
      shipmentPhotoUrl: shipForm.shipmentPhotoUrl || undefined,
      receiptPhotoUrl: shipForm.receiptPhotoUrl || undefined,
      shippedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setShipments([...shipments, newShipment]);
    
    // 주문 상태 업데이트
    setOrders(orders.map(o => 
      o.id === selectedOrder.id ? { ...o, status: 'SHIPPED' } : o
    ));

    // 모달 닫기 및 폼 초기화
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
  };

  // 페이지네이션 계산
  const totalPendingPages = Math.ceil(pendingOrders.length / itemsPerPage);
  const totalShippedPages = Math.ceil(shippedOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPendingOrders = pendingOrders.slice(startIndex, endIndex);
  const paginatedShippedOrders = shippedOrders.slice(startIndex, endIndex);

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
      shippedOrdersCount: shippedOrders.length,
      totalOrdersLoaded: orders.length,
      totalShipmentsLoaded: shipments.length,
      statusBreakdown: statusCounts,
      ordersWithShipment: orders.filter(o => shipments.find(s => s.orderId === o.id)).length,
      ordersWithoutShipment: orders.filter(o => !shipments.find(s => s.orderId === o.id)).length
    });
  }, [selectedTab, pendingOrders.length, shippedOrders.length, orders.length, shipments.length]);

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
  const handleMarkDelivered = (shipmentId: string) => {
    setShipments(shipments.map(s =>
      s.id === shipmentId ? { ...s, deliveredAt: new Date().toISOString() } : s
    ));
    
    const shipment = shipments.find(s => s.id === shipmentId);
    if (shipment) {
      setOrders(orders.map(o =>
        o.id === shipment.orderId ? { ...o, status: 'DONE' } : o
      ));
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
              borderBottom: selectedTab === 'pending' ? '2px solid #2563eb' : 'none',
              color: selectedTab === 'pending' ? '#2563eb' : '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: selectedTab === 'pending' ? '600' : '400'
            }}
          >
            {t.pendingTab} ({pendingOrders.length})
          </button>
          <button
            onClick={() => setSelectedTab('shipped')}
            style={{
              padding: '0.75rem 0',
              borderBottom: selectedTab === 'shipped' ? '2px solid #2563eb' : 'none',
              color: selectedTab === 'shipped' ? '#2563eb' : '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: selectedTab === 'shipped' ? '600' : '400'
            }}
          >
            {t.shippedTab} ({shippedOrders.length})
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
                  { header: t.orderDate, key: 'orderDate', width: 15 },
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
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.orderDate}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.customer}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{
                      locale === 'ko' ? '전화번호' : locale === 'zh-CN' ? '电话号码' : 'Phone'
                    }</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.address}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.items}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.status}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.action}</th>
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
                      <td style={{ padding: '0.75rem', color: '#6b7280' }}>{order.orderDate}</td>
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
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setShowShipModal(true);
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            cursor: 'pointer'
                          }}
                        >
                          {t.registerShipping}
                        </button>
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

      {/* 배송 중/완료 목록 */}
      {selectedTab === 'shipped' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              onClick={() => {
                const columns = [
                  { header: t.orderNo, key: 'orderNo', width: 20 },
                  { header: t.customer, key: 'customerName', width: 20 },
                  { header: t.trackingNo, key: 'trackingNo', width: 20 },
                  { header: t.courier, key: 'courier', width: 20 },
                  { header: t.shippingFee, key: 'shippingFee', width: 15 }
                ];
                
                exportToExcel({
                  data: shippedOrders,
                  columns,
                  fileName: locale === 'ko' ? '배송중' : 'shipped_orders',
                  sheetName: locale === 'ko' ? '배송중' : 'Shipped'
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
          {shippedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              {t.noShipments}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.orderNo}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.customer}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.trackingNo}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.courier}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>{t.shippingFee}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.status}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedShippedOrders.map(shipment => (
                    <tr key={shipment.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '500' }}>{shipment.orderNo}</td>
                      <td style={{ padding: '0.75rem' }}>{shipment.customerName}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div>{shipment.trackingNo}</div>
                        {shipment.trackingNoCn && (
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            CN: {shipment.trackingNoCn}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div>{shipment.courier}</div>
                        {shipment.courierCn && (
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {shipment.courierCn}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {shipment.shippingFee ? `₩${shipment.shippingFee.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: shipment.deliveredAt ? '#dcfce7' : '#fef3c7',
                          color: shipment.deliveredAt ? '#166534' : '#92400e'
                        }}>
                          {shipment.deliveredAt ? t.delivered : t.shipped}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setShowDetailModal(true);
                            }}
                            style={{
                              padding: '0.25rem 0.75rem',
                              backgroundColor: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              cursor: 'pointer'
                            }}
                          >
                            {t.viewDetail}
                          </button>
                          {!shipment.deliveredAt && (
                            <button
                              onClick={() => handleMarkDelivered(shipment.id)}
                              style={{
                                padding: '0.25rem 0.75rem',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                cursor: 'pointer'
                              }}
                            >
                              {t.markDelivered}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* 페이지네이션 */}
          {shippedOrders.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalShippedPages}
              onPageChange={setCurrentPage}
              totalItems={shippedOrders.length}
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
              {t.shipModalTitle}
            </h2>

            {/* 주문 정보 */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.375rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>{t.orderNo}:</strong> {selectedOrder.orderNo}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>{t.customer}:</strong> {selectedOrder.customerName} ({selectedOrder.customerPhone})
              </div>
              <div>
                <strong>{t.address}:</strong> {selectedOrder.shippingAddress}
              </div>
            </div>

            {/* 한국 배송 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                {t.koreanShipping}
              </h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.selectCourier} *
                  </label>
                  <select
                    value={shipForm.courier}
                    onChange={(e) => setShipForm({ ...shipForm, courier: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">{t.selectCourier}</option>
                    {KOREAN_COURIERS.map(courier => (
                      <option key={courier.code} value={courier.code}>
                        {courier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.trackingNo} *
                  </label>
                  <input
                    type="text"
                    value={shipForm.trackingNo}
                    onChange={(e) => setShipForm({ ...shipForm, trackingNo: e.target.value })}
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
                    {t.trackingBarcode}
                  </label>
                  <input
                    type="text"
                    value={shipForm.trackingBarcode}
                    onChange={(e) => setShipForm({ ...shipForm, trackingBarcode: e.target.value })}
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

            {/* 중국 배송 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                {t.chineseShipping}
              </h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.selectCourier}
                  </label>
                  <select
                    value={shipForm.courierCn}
                    onChange={(e) => setShipForm({ ...shipForm, courierCn: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">{t.selectCourier}</option>
                    {CHINESE_COURIERS.map(courier => (
                      <option key={courier.code} value={courier.code}>
                        {courier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.trackingNo}
                  </label>
                  <input
                    type="text"
                    value={shipForm.trackingNoCn}
                    onChange={(e) => setShipForm({ ...shipForm, trackingNoCn: e.target.value })}
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

            {/* 배송 상세 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                {t.shippingDetails}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.shippingFee} (₩)
                  </label>
                  <input
                    type="number"
                    value={shipForm.shippingFee}
                    onChange={(e) => setShipForm({ ...shipForm, shippingFee: e.target.value })}
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
                    {t.actualWeight}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={shipForm.actualWeight}
                    onChange={(e) => setShipForm({ ...shipForm, actualWeight: e.target.value })}
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
                    {t.volumeWeight}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={shipForm.volumeWeight}
                    onChange={(e) => setShipForm({ ...shipForm, volumeWeight: e.target.value })}
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
                {t.cancel}
              </button>
              <button
                onClick={handleShipRegister}
                disabled={!shipForm.courier || !shipForm.trackingNo}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: shipForm.courier && shipForm.trackingNo ? '#2563eb' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: shipForm.courier && shipForm.trackingNo ? 'pointer' : 'not-allowed'
                }}
              >
                {t.register}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 배송 상세 모달 */}
      {showDetailModal && selectedShipment && (
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
              {t.detailModalTitle}
            </h2>

            {/* 주문 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {t.orderInfo}
              </h3>
              <div style={{
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.375rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>{t.orderNo}:</strong> {selectedShipment.orderNo}
                </div>
                <div>
                  <strong>{t.customer}:</strong> {selectedShipment.customerName}
                </div>
              </div>
            </div>

            {/* 한국 배송 추적 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {t.koreanTracking}
              </h3>
              <div style={{
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.375rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>{t.courier}:</strong> {selectedShipment.courier}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>{t.trackingNo}:</strong> {selectedShipment.trackingNo}
                </div>
                {selectedShipment.trackingBarcode && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>{t.trackingBarcode}:</strong> {selectedShipment.trackingBarcode}
                  </div>
                )}
                {selectedShipment.trackingUrl && (
                  <div>
                    <a
                      href={selectedShipment.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#2563eb',
                        textDecoration: 'underline',
                        fontSize: '0.875rem'
                      }}
                    >
                      {t.openTracking} →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 중국 배송 추적 */}
            {selectedShipment.courierCn && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {t.chineseTracking}
                </h3>
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.375rem'
                }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>{t.courier}:</strong> {selectedShipment.courierCn}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>{t.trackingNo}:</strong> {selectedShipment.trackingNoCn}
                  </div>
                  {selectedShipment.trackingUrlCn && (
                    <div>
                      <a
                        href={selectedShipment.trackingUrlCn}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#2563eb',
                          textDecoration: 'underline',
                          fontSize: '0.875rem'
                        }}
                      >
                        {t.openTracking} →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 배송 상세 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {t.shippingDetails}
              </h3>
              <div style={{
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.375rem'
              }}>
                {selectedShipment.shippingFee && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>{t.shippingFee}:</strong> ₩{selectedShipment.shippingFee.toLocaleString()}
                  </div>
                )}
                {selectedShipment.actualWeight && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>{t.actualWeight}:</strong> {selectedShipment.actualWeight}kg
                  </div>
                )}
                {selectedShipment.volumeWeight && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>{t.volumeWeight}:</strong> {selectedShipment.volumeWeight}kg
                  </div>
                )}
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>{t.shippedAt}:</strong> {new Date(selectedShipment.shippedAt!).toLocaleString()}
                </div>
                {selectedShipment.deliveredAt && (
                  <div>
                    <strong>{t.delivered}:</strong> {new Date(selectedShipment.deliveredAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* 사진 */}
            {(selectedShipment.shipmentPhotoUrl || selectedShipment.receiptPhotoUrl) && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {t.photos}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {selectedShipment.shipmentPhotoUrl && (
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                        {t.shipmentPhotoLabel}
                      </p>
                      <img
                        src={selectedShipment.shipmentPhotoUrl}
                        alt={t.shipmentPhotoLabel}
                        style={{
                          width: '100%',
                          borderRadius: '0.375rem',
                          border: '1px solid #e5e7eb'
                        }}
                      />
                    </div>
                  )}
                  {selectedShipment.receiptPhotoUrl && (
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                        {t.receiptPhotoLabel}
                      </p>
                      <img
                        src={selectedShipment.receiptPhotoUrl}
                        alt={t.receiptPhotoLabel}
                        style={{
                          width: '100%',
                          borderRadius: '0.375rem',
                          border: '1px solid #e5e7eb'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 닫기 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedShipment(null);
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

      {/* 모바일에서만 하단 네비게이션 표시 */}
      {isMobile && <MobileBottomNav locale={locale} />}
    </div>
  );
}