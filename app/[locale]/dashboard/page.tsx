/**
 * 대시보드 페이지
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileBottomNav } from '@/components/Navigation';
import './dashboard.css';

interface DashboardPageProps {
  params: { locale: string };
}

export default function DashboardPage({ params: { locale } }: DashboardPageProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // 클라이언트 사이드에서만 시간 설정
    setCurrentTime(new Date().toLocaleString());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getTitle = () => {
    switch(locale) {
      case 'ko': return 'YUANDI 대시보드';
      case 'zh-CN': return 'YUANDI 仪表板';
      default: return 'YUANDI Dashboard';
    }
  };

  const getStats = () => {
    const stats = {
      ko: {
        todayOrders: '오늘 주문',
        totalOrders: '전체 주문',
        inventory: '재고 현황',
        revenue: '매출 현황',
        todayOrdersCount: '12건',
        totalOrdersCount: '1,234건',
        inventoryCount: '567개',
        revenueAmount: '₩12,345,000'
      },
      'zh-CN': {
        todayOrders: '今日订单',
        totalOrders: '总订单',
        inventory: '库存状态',
        revenue: '销售现状',
        todayOrdersCount: '12单',
        totalOrdersCount: '1,234单',
        inventoryCount: '567个',
        revenueAmount: '¥72,323'
      }
    };

    return stats[locale] || stats.ko;
  };

  const stats = getStats();

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

        {/* Recent Orders - Updated */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            {locale === 'ko' ? '최근 주문' : locale === 'zh-CN' ? '最近订单' : 'Recent Orders'}
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                    {locale === 'ko' ? '날짜' : locale === 'zh-CN' ? '日期' : 'Date'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                    {locale === 'ko' ? '고객명' : locale === 'zh-CN' ? '客户' : 'Customer'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                    {locale === 'ko' ? '상태' : locale === 'zh-CN' ? '状态' : 'Status'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                    {locale === 'ko' ? '금액' : locale === 'zh-CN' ? '金额' : 'Amount'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 20 sample orders */}
                {[
                  { date: '2024-01-05', name: locale === 'ko' ? '김철수' : '张三', status: 'PAID', amount: locale === 'ko' ? '₩89,000' : '¥520' },
                  { date: '2024-01-05', name: locale === 'ko' ? '이영희' : '李四', status: 'SHIPPED', amount: locale === 'ko' ? '₩125,000' : '¥730' },
                  { date: '2024-01-05', name: locale === 'ko' ? '박지민' : '王五', status: 'DONE', amount: locale === 'ko' ? '₩67,000' : '¥390' },
                  { date: '2024-01-04', name: locale === 'ko' ? '최수현' : '赵六', status: 'PAID', amount: locale === 'ko' ? '₩156,000' : '¥910' },
                  { date: '2024-01-04', name: locale === 'ko' ? '정하나' : '钱七', status: 'SHIPPED', amount: locale === 'ko' ? '₩98,000' : '¥573' },
                  { date: '2024-01-04', name: locale === 'ko' ? '강민준' : '孙八', status: 'PAID', amount: locale === 'ko' ? '₩234,000' : '¥1,370' },
                  { date: '2024-01-03', name: locale === 'ko' ? '윤서연' : '周九', status: 'DONE', amount: locale === 'ko' ? '₩45,000' : '¥263' },
                  { date: '2024-01-03', name: locale === 'ko' ? '임도윤' : '吴十', status: 'PAID', amount: locale === 'ko' ? '₩187,000' : '¥1,095' },
                  { date: '2024-01-03', name: locale === 'ko' ? '황예진' : '郑一', status: 'SHIPPED', amount: locale === 'ko' ? '₩76,000' : '¥445' },
                  { date: '2024-01-02', name: locale === 'ko' ? '송지우' : '冯二', status: 'DONE', amount: locale === 'ko' ? '₩134,000' : '¥784' },
                  { date: '2024-01-02', name: locale === 'ko' ? '한승우' : '陈三', status: 'PAID', amount: locale === 'ko' ? '₩298,000' : '¥1,744' },
                  { date: '2024-01-02', name: locale === 'ko' ? '조예린' : '楚四', status: 'SHIPPED', amount: locale === 'ko' ? '₩167,000' : '¥977' },
                  { date: '2024-01-01', name: locale === 'ko' ? '서준혁' : '魏五', status: 'PAID', amount: locale === 'ko' ? '₩223,000' : '¥1,305' },
                  { date: '2024-01-01', name: locale === 'ko' ? '안소희' : '蒋六', status: 'DONE', amount: locale === 'ko' ? '₩89,000' : '¥520' },
                  { date: '2024-01-01', name: locale === 'ko' ? '류태양' : '沈七', status: 'PAID', amount: locale === 'ko' ? '₩145,000' : '¥848' },
                  { date: '2023-12-31', name: locale === 'ko' ? '문지원' : '韩八', status: 'SHIPPED', amount: locale === 'ko' ? '₩201,000' : '¥1,176' },
                  { date: '2023-12-31', name: locale === 'ko' ? '오현우' : '杨九', status: 'DONE', amount: locale === 'ko' ? '₩112,000' : '¥655' },
                  { date: '2023-12-30', name: locale === 'ko' ? '배수진' : '朱十', status: 'PAID', amount: locale === 'ko' ? '₩178,000' : '¥1,041' },
                  { date: '2023-12-30', name: locale === 'ko' ? '신유나' : '秦一', status: 'SHIPPED', amount: locale === 'ko' ? '₩256,000' : '¥1,498' },
                  { date: '2023-12-30', name: locale === 'ko' ? '권민석' : '许二', status: 'PAID', amount: locale === 'ko' ? '₩94,000' : '¥550' }
                ].map((order, index) => {
                  const statusColors = {
                    'PAID': { bg: '#dbeafe', color: '#1e40af', text: locale === 'ko' ? '결제완료' : locale === 'zh-CN' ? '已付款' : 'Paid' },
                    'SHIPPED': { bg: '#fef3c7', color: '#92400e', text: locale === 'ko' ? '배송중' : locale === 'zh-CN' ? '配送中' : 'Shipping' },
                    'DONE': { bg: '#d1fae5', color: '#065f46', text: locale === 'ko' ? '완료' : locale === 'zh-CN' ? '完成' : 'Completed' },
                    'REFUNDED': { bg: '#fee2e2', color: '#991b1b', text: locale === 'ko' ? '환불' : locale === 'zh-CN' ? '已退款' : 'Refunded' }
                  };
                  
                  const status = statusColors[order.status as keyof typeof statusColors];
                  
                  return (
                    <tr 
                      key={index} 
                      style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        cursor: order.status === 'PAID' ? 'pointer' : 'default'
                      }}
                      onClick={() => {
                        if (order.status === 'PAID') {
                          router.push(`/${locale}/shipments`);
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (order.status === 'PAID') {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{order.date}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{order.name}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: status.bg,
                          color: status.color,
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {status.text}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '500' }}>
                        {order.amount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 표준화된 모바일 하단 네비게이션 */}
      <MobileBottomNav locale={locale} />
    </div>
  );
}