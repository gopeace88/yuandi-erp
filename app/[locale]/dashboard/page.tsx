/**
 * 대시보드 페이지
 */

'use client';

import { useState, useEffect } from 'react';

interface DashboardPageProps {
  params: { locale: string };
}

export default function DashboardPage({ params: { locale } }: DashboardPageProps) {
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
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
        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {/* Today Orders */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              {stats.todayOrders}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>
              {stats.todayOrdersCount}
            </div>
          </div>

          {/* Total Orders */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              {stats.totalOrders}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
              {stats.totalOrdersCount}
            </div>
          </div>

          {/* Inventory */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              {stats.inventory}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
              {stats.inventoryCount}
            </div>
          </div>

          {/* Revenue */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              {stats.revenue}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>
              {stats.revenueAmount}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
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
        </div>

        {/* Recent Orders */}
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
                    {locale === 'ko' ? '주문번호' : locale === 'zh-CN' ? '订单号' : 'Order ID'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                    {locale === 'ko' ? '고객명' : locale === 'zh-CN' ? '客户' : 'Customer'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                    {locale === 'ko' ? '상태' : locale === 'zh-CN' ? '状态' : 'Status'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                    {locale === 'ko' ? '금액' : locale === 'zh-CN' ? '金额' : 'Amount'}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>ORD-240105-001</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                    {locale === 'ko' ? '김철수' : locale === 'zh-CN' ? '张三' : 'John Doe'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}>
                      {locale === 'ko' ? '처리중' : locale === 'zh-CN' ? '处理中' : 'Processing'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>
                    {locale === 'ko' ? '₩89,000' : locale === 'zh-CN' ? '¥520' : '$75'}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>ORD-240105-002</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                    {locale === 'ko' ? '이영희' : locale === 'zh-CN' ? '李四' : 'Jane Smith'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}>
                      {locale === 'ko' ? '배송중' : locale === 'zh-CN' ? '配送中' : 'Shipping'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>
                    {locale === 'ko' ? '₩125,000' : locale === 'zh-CN' ? '¥730' : '$105'}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>ORD-240105-003</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                    {locale === 'ko' ? '박지민' : locale === 'zh-CN' ? '王五' : 'Bob Wilson'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#d1fae5',
                      color: '#065f46',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}>
                      {locale === 'ko' ? '완료' : locale === 'zh-CN' ? '完成' : 'Completed'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>
                    {locale === 'ko' ? '₩67,000' : locale === 'zh-CN' ? '¥390' : '$56'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
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