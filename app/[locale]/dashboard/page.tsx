/**
 * 대시보드 페이지
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileBottomNav } from '@/components/Navigation';
import { createClient } from '@/lib/supabase/client';
import './dashboard.css';

interface DashboardPageProps {
  params: { locale: string };
}

export default function DashboardPage({ params: { locale } }: DashboardPageProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [currentTime, setCurrentTime] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [stats, setStats] = useState({
    todayOrders: locale === 'ko' ? '오늘 주문' : '今日订单',
    totalOrders: locale === 'ko' ? '전체 주문' : '总订单',
    inventory: locale === 'ko' ? '재고 현황' : '库存状态',
    revenue: locale === 'ko' ? '매출 현황' : '销售现状',
    todayOrdersCount: '0건',
    totalOrdersCount: '0건',
    inventoryCount: '0개',
    revenueAmount: '₩0',
    shippingReadyCount: '0건',
    shippingInProgressCount: '0건', 
    shippingCompletedCount: '0건',
    refundedCount: '0건',
    totalCustomersCount: '0명',
    repeatCustomersCount: '0명'
  });

  useEffect(() => {
    // 클라이언트 사이드에서만 시간 설정
    setCurrentTime(new Date().toLocaleString());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 모바일 체크
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 대시보드 통계 로드
  useEffect(() => {
    loadDashboardStats();
  }, [locale]);

  const loadDashboardStats = async () => {
    try {
      // Supabase 직접 호출 (컴포넌트 레벨 클라이언트 재사용)
      
      // 주문 데이터 가져오기 (order_items와 products 조인)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            products (
              name_ko,
              name_zh,
              model
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      // 재고 데이터 가져오기 (products 테이블에서)
      const { data: products, error: inventoryError } = await supabase
        .from('products')
        .select('on_hand')
        .eq('is_active', true);

      if (ordersError) console.error('주문 로드 에러:', ordersError);
      if (inventoryError) console.error('재고 로드 에러:', inventoryError);

      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders?.filter((order: any) => 
        order.created_at.split('T')[0] === today) || [];
      
      const totalInventory = products?.reduce((sum: number, item: any) => 
        sum + (item.on_hand || 0), 0) || 0;
      
      const totalRevenue = orders?.reduce((sum: number, order: any) => 
        sum + (order.total_krw || 0), 0) || 0;

      // 배송 현황 카운트
      const shippingReady = orders?.filter((order: any) => order.status === 'paid') || [];
      const shippingInProgress = orders?.filter((order: any) => order.status === 'shipped') || [];
      const shippingCompleted = orders?.filter((order: any) => 
        order.status === 'done' || order.status === 'delivered') || [];
      // cancelled와 refunded를 모두 환불/취소로 통합
      const refunded = orders?.filter((order: any) => 
        order.status === 'refunded' || order.status === 'cancelled') || [];
      
      // 고객 통계 계산 (PCCC 기반)
      const pcccMap = new Map<string, number>();
      orders?.forEach((order: any) => {
        if (order.pccc) {
          const count = pcccMap.get(order.pccc) || 0;
          pcccMap.set(order.pccc, count + 1);
        }
      });
      
      const totalCustomers = pcccMap.size;  // 전체 고객 수
      const repeatCustomers = Array.from(pcccMap.values()).filter(count => count >= 2).length;  // 2번 이상 주문한 고객
      
      console.log('고객 통계:', { 
        totalOrders: orders?.length,
        pcccMap: pcccMap.size,
        totalCustomers,
        repeatCustomers,
        samplePCCC: orders?.[0]?.pccc 
      });
      
      
      setStats({
        todayOrders: locale === 'ko' ? '오늘 주문' : '今日订单',
        totalOrders: locale === 'ko' ? '전체 주문' : '总订单',
        inventory: locale === 'ko' ? '재고 현황' : '库存状态',
        revenue: locale === 'ko' ? '매출 현황' : '销售现状',
        todayOrdersCount: locale === 'ko' ? `${todayOrders.length}건` : `${todayOrders.length}单`,
        totalOrdersCount: locale === 'ko' ? `${orders?.length || 0}건` : `${orders?.length || 0}单`,
        inventoryCount: locale === 'ko' ? `${totalInventory}개` : `${totalInventory}个`,
        revenueAmount: locale === 'ko' 
          ? `₩${totalRevenue.toLocaleString()}` 
          : `¥${Math.floor(totalRevenue / 180).toLocaleString()}`,
        shippingReadyCount: locale === 'ko' ? `${shippingReady.length}건` : `${shippingReady.length}单`,
        shippingInProgressCount: locale === 'ko' ? `${shippingInProgress.length}건` : `${shippingInProgress.length}单`,
        shippingCompletedCount: locale === 'ko' ? `${shippingCompleted.length}건` : `${shippingCompleted.length}单`,
        refundedCount: locale === 'ko' ? `${refunded.length}건` : `${refunded.length}单`,
        totalCustomersCount: locale === 'ko' ? `${totalCustomers}명` : `${totalCustomers}人`,
        repeatCustomersCount: locale === 'ko' ? `${repeatCustomers}명` : `${repeatCustomers}人`
      });
    } catch (error) {
      console.error('대시보드 통계 로드 실패:', error);
    }
  };

  const getTitle = () => {
    switch(locale) {
      case 'ko': return 'YUANDI 대시보드';
      case 'zh-CN': return 'YUANDI 仪表板';
      default: return 'YUANDI Dashboard';
    }
  };


  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem'
      }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            {getTitle()}
          </h1>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {currentTime || 'Loading...'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {/* Stats Grid - 모바일 최적화 */}
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          {/* Today Orders */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {stats.todayOrders}
            </div>
            <div className="stat-value-large" style={{ 
              fontWeight: 'bold', 
              color: '#2563eb' 
            }}>
              {stats.todayOrdersCount}
            </div>
          </div>

          {/* Total Orders */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {stats.totalOrders}
            </div>
            <div className="stat-value-large" style={{ 
              fontWeight: 'bold', 
              color: '#10b981' 
            }}>
              {stats.totalOrdersCount}
            </div>
          </div>

          {/* Inventory */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {stats.inventory}
            </div>
            <div className="stat-value-large" style={{ 
              fontWeight: 'bold', 
              color: '#f59e0b' 
            }}>
              {stats.inventoryCount}
            </div>
          </div>

          {/* Revenue */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {stats.revenue}
            </div>
            <div className="revenue-value" style={{ 
              fontWeight: 'bold', 
              color: '#8b5cf6' 
            }}>
              {stats.revenueAmount}
            </div>
          </div>
        </div>

        {/* 배송 현황 요약 - 2x2 그리드 */}
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          {/* 배송 준비 */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {locale === 'ko' ? '배송 준비' : '待发货'}
            </div>
            <div className="stat-value-large" style={{ 
              fontWeight: 'bold', 
              color: '#3b82f6' 
            }}>
              {stats.shippingReadyCount}
            </div>
          </div>

          {/* 배송 중 */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {locale === 'ko' ? '배송 중' : '配送中'}
            </div>
            <div className="stat-value-large" style={{ 
              fontWeight: 'bold', 
              color: '#f59e0b' 
            }}>
              {stats.shippingInProgressCount}
            </div>
          </div>

          {/* 배송 완료 */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {locale === 'ko' ? '배송 완료' : '已完成'}
            </div>
            <div className="stat-value-large" style={{ 
              fontWeight: 'bold', 
              color: '#10b981' 
            }}>
              {stats.shippingCompletedCount}
            </div>
          </div>

          {/* 환불/취소 통합 */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {locale === 'ko' ? '환불/취소' : '退款/取消'}
            </div>
            <div className="stat-value-large" style={{ 
              fontWeight: 'bold', 
              color: '#ef4444' 
            }}>
              {stats.refundedCount}
            </div>
          </div>
        </div>

        {/* 고객 현황 - 2x1 그리드 */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {/* 전체 고객 수 */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {locale === 'ko' ? '전체 고객' : '总客户'}
            </div>
            <div className="stat-value-large" style={{ 
              fontWeight: 'bold', 
              color: '#7c3aed' 
            }}>
              {stats.totalCustomersCount}
            </div>
          </div>

          {/* 단골 고객 수 */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {locale === 'ko' ? '단골 고객' : '常客'}
            </div>
            <div className="stat-value-large" style={{ 
              fontWeight: 'bold', 
              color: '#ec4899' 
            }}>
              {stats.repeatCustomersCount}
            </div>
          </div>
        </div>

        {/* Quick Actions - 제거됨 (사용자 요청)
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            {locale === 'ko' ? '빠른 메뉴' : locale === 'zh-CN' ? '快速菜单' : 'Quick Actions'}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem'
          }}>
            <a href={`/${locale}/orders`} style={{
              padding: '0.75rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center'
            }}>
              {locale === 'ko' ? '새 주문' : locale === 'zh-CN' ? '新订单' : 'New Order'}
            </a>
            <a href={`/${locale}/inventory`} style={{
              padding: '0.75rem',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center'
            }}>
              {locale === 'ko' ? '재고 등록' : locale === 'zh-CN' ? '库存登记' : 'Add Inventory'}
            </a>
            <a href={`/${locale}/shipments`} style={{
              padding: '0.75rem',
              backgroundColor: '#f59e0b',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center'
            }}>
              {locale === 'ko' ? '배송 관리' : locale === 'zh-CN' ? '配送管리' : 'Manage Shipping'}
            </a>
            <a href={`/${locale}/cashbook`} style={{
              padding: '0.75rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center'
            }}>
              {locale === 'ko' ? '보고서' : locale === 'zh-CN' ? '报告' : 'Reports'}
            </a>
          </div>
        </div> */}

      </div>

      {/* 모바일에서만 하단 네비게이션 표시 */}
      {isMobile && <MobileBottomNav locale={locale} />}
    </div>
  );
}