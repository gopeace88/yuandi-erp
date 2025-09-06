/**
 * 배송 관리 페이지
 * PRD v2.0 요구사항: 한국/중국 이중 배송 시스템
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

// Mock 데이터
const MOCK_ORDERS: Order[] = [
  {
    id: '1',
    orderNo: 'ORD-241225-001',
    orderDate: '2024-12-25',
    customerName: '김철수',
    customerPhone: '010-1234-5678',
    shippingAddress: '서울특별시 강남구 테헤란로 123',
    status: 'PAID',
    totalAmount: 158000,
    items: [
      { productName: '나이키 운동화 에어맥스', quantity: 1 },
      { productName: '아디다스 티셔츠', quantity: 2 }
    ]
  },
  {
    id: '2',
    orderNo: 'ORD-241225-002',
    orderDate: '2024-12-25',
    customerName: '이영희',
    customerPhone: '010-9876-5432',
    shippingAddress: '부산광역시 해운대구 해운대로 456',
    status: 'SHIPPED',
    totalAmount: 89000,
    items: [
      { productName: '샤넬 향수 No.5', quantity: 1 }
    ]
  },
];

const MOCK_SHIPMENTS: Shipment[] = [
  {
    id: '1',
    orderId: '2',
    orderNo: 'ORD-241225-002',
    customerName: '이영희',
    courier: 'CJ대한통운',
    courierCode: 'cj',
    trackingNo: '1234567890123',
    trackingBarcode: '1234567890123456789',
    trackingUrl: 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=1234567890123',
    courierCn: '顺丰速运 (SF Express)',
    trackingNoCn: 'SF1234567890',
    trackingUrlCn: 'https://www.sf-express.com/cn/sc/dynamic_function/waybill/#search/bill-number/SF1234567890',
    shippingFee: 3500,
    actualWeight: 0.5,
    volumeWeight: 0.8,
    shippedAt: '2024-12-25T14:30:00',
    createdAt: '2024-12-25T14:30:00',
  },
];

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
  const router = useRouter();

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

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!role) {
      router.push(`/${locale}/`);
      return;
    }
    setUserRole(role);
  }, [locale, router]);

  // 배송 대기 주문 필터링
  const pendingOrders = orders.filter(order => 
    order.status === 'PAID' && 
    !shipments.find(s => s.orderId === order.id) &&
    (searchTerm === '' || 
     order.orderNo.includes(searchTerm) ||
     order.customerName.includes(searchTerm) ||
     order.customerPhone.includes(searchTerm))
  );

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
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.orderDate}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.customer}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.items}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.address}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>{t.amount}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '500' }}>{order.orderNo}</td>
                      <td style={{ padding: '0.75rem', color: '#6b7280' }}>{order.orderDate}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div>{order.customerName}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{order.customerPhone}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {order.items.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '0.875rem' }}>
                            {item.productName} x {item.quantity}
                          </div>
                        ))}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{order.shippingAddress}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '500' }}>
                        ₩{order.totalAmount.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={() => {
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
        </div>
      )}

      {/* 배송 중/완료 목록 */}
      {selectedTab === 'shipped' && (
        <div>
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
                  {shippedOrders.map(shipment => (
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

            {/* 사진 URL */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.shipmentPhoto}
                  </label>
                  <input
                    type="text"
                    value={shipForm.shipmentPhotoUrl}
                    onChange={(e) => setShipForm({ ...shipForm, shipmentPhotoUrl: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.receiptPhoto}
                  </label>
                  <input
                    type="text"
                    value={shipForm.receiptPhotoUrl}
                    onChange={(e) => setShipForm({ ...shipForm, receiptPhotoUrl: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                    placeholder="https://..."
                  />
                </div>
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

      {/* Footer Navigation - 다른 페이지와 통일 */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '1rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <a href={`/${locale}`} style={{ 
            textDecoration: 'none',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            {locale === 'ko' ? '홈' : locale === 'zh-CN' ? '首页' : 'Home'}
          </a>
          <a href={`/${locale}/orders`} style={{ 
            textDecoration: 'none',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            {locale === 'ko' ? '주문' : locale === 'zh-CN' ? '订单' : 'Orders'}
          </a>
          <a href={`/${locale}/inventory`} style={{ 
            textDecoration: 'none',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            {locale === 'ko' ? '재고' : locale === 'zh-CN' ? '库存' : 'Inventory'}
          </a>
          <a href={`/${locale}/shipments`} style={{ 
            textDecoration: 'none',
            color: '#3b82f6',
            fontSize: '0.875rem'
          }}>
            {locale === 'ko' ? '배송' : locale === 'zh-CN' ? '配送' : 'Shipping'}
          </a>
          <a href={`/${locale}/track`} style={{ 
            textDecoration: 'none',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            {locale === 'ko' ? '조회' : locale === 'zh-CN' ? '查询' : 'Track'}
          </a>
        </div>
      </div>
    </div>
  );
}