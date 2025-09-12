/**
 * 네비게이션 컴포넌트
 * PRD v2.0 요구사항: 역할 기반 메뉴 표시
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NavigationProps {
  locale: string;
}

export default function Navigation({ locale }: NavigationProps) {
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // 다국어 텍스트
  const texts = {
    ko: {
      title: 'YUANDI Collection',
      subtitle: '통합 관리 시스템',
      // Menu items
      dashboard: '대시보드',
      orders: '주문 관리',
      inventory: '재고 관리',
      shipments: '배송 관리',
      cashbook: '출납장부',
      users: '설정',
      track: '주문 조회',
      // User menu
      profile: '프로필',
      settings: '설정',
      logout: '로그아웃',
      // Roles
      admin: '관리자',
      order_manager: '주문 관리자',
      ship_manager: '배송 관리자',
      // Others
      menu: '메뉴',
      close: '닫기'
    },
    'zh-CN': {
      title: 'YUANDI Collection',
      subtitle: '综合管理系统',
      // Menu items
      dashboard: '仪表板',
      orders: '订单管理',
      inventory: '库存管理',
      shipments: '配送管理',
      cashbook: '现金日记账',
      users: '设置',
      track: '订单查询',
      // User menu
      profile: '个人资料',
      settings: '设置',
      logout: '退出',
      // Roles
      admin: '管理员',
      order_manager: '订单经理',
      ship_manager: '配送经理',
      // Others
      menu: '菜单',
      close: '关闭'
    }
  };

  const t = texts[locale as keyof typeof texts] || texts.ko;

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    if (role) setUserRole(role);
    if (name) setUserName(name);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 메뉴 항목 정의 - 표준화된 순서: 대시보드, 주문관리, 배송관리, 재고관리, 출납장부, 사용자관리, 주문조회
  const menuItems = [
    {
      path: `/${locale}/dashboard`,
      label: t.dashboard,
      icon: '📊',
      roles: ['admin', 'order_manager', 'ship_manager']
    },
    {
      path: `/${locale}/orders`,
      label: t.orders,
      icon: '📦',
      roles: ['admin', 'order_manager']
    },
    {
      path: `/${locale}/shipments`,
      label: t.shipments,
      icon: '🚚',
      roles: ['admin', 'order_manager', 'ship_manager']
    },
    {
      path: `/${locale}/inventory`,
      label: t.inventory,
      icon: '📋',
      roles: ['admin', 'order_manager', 'ship_manager']
    },
    {
      path: `/${locale}/cashbook`,
      label: t.cashbook,
      icon: '💰',
      roles: ['admin', 'order_manager', 'ship_manager']
    },
    {
      path: `/${locale}/users`,
      label: t.users,
      icon: '👥',
      roles: ['admin']
    },
    {
      path: `/${locale}/track`,
      label: t.track,
      icon: '🔍',
      roles: ['admin', 'order_manager', 'ship_manager']
    }
  ];

  // 역할에 따른 메뉴 필터링
  const visibleMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  // 로그아웃 처리
  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    router.push(`/${locale}/`);
  };

  // 언어 변경
  const handleLanguageChange = (newLocale: string) => {
    const currentPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(currentPath);
  };

  // 현재 페이지 확인
  const isActive = (path: string) => pathname === path;

  if (!userRole) return null;

  return (
    <>
      {/* 네비게이션 바 */}
      <nav style={{
        backgroundColor: '#1f2937',
        color: 'white',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'relative'
      }}>
        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
              {t.title}
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
              {t.subtitle}
            </p>
          </div>

          {/* 데스크탑 메뉴 - 모바일에서는 숨김 */}
          {!isMobile && (
            <div style={{ 
              display: 'flex', 
              gap: '1rem'
            }}>
              {visibleMenuItems.map(item => (
                <a
                  key={item.path}
                  href={item.path}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    backgroundColor: isActive(item.path) ? '#374151' : 'transparent',
                    color: isActive(item.path) ? '#60a5fa' : '#d1d5db',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.backgroundColor = '#374151';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* 사용자 정보 및 메뉴 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* 언어 선택 - 데스크톱에서만 표시 */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleLanguageChange('ko')}
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: locale === 'ko' ? '#2563eb' : 'transparent',
                  color: locale === 'ko' ? 'white' : '#9ca3af',
                  border: '1px solid #374151',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                한국어
              </button>
              <button
                onClick={() => handleLanguageChange('zh-CN')}
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: locale === 'zh-CN' ? '#2563eb' : 'transparent',
                  color: locale === 'zh-CN' ? 'white' : '#9ca3af',
                  border: '1px solid #374151',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                中文
              </button>
            </div>
          )}

          {/* 사용자 정보 - 데스크톱에서만 표시 */}
          {!isMobile && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                {userName}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {t[userRole as keyof typeof t] || userRole}
              </div>
            </div>
          )}

          {/* 로그아웃 버튼 - 데스크톱에서만 표시 */}
          {!isMobile && (
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {t.logout}
            </button>
          )}

          {/* 모바일 메뉴 버튼 */}
          {isMobile && (
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                color: 'white',
                border: '1px solid #374151',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              )}
            </button>
          )}
        </div>
      </nav>

      {/* 모바일 메뉴 드롭다운 */}
      {isMobile && isMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '4.5rem',
          left: 0,
          right: 0,
          backgroundColor: '#1f2937',
          zIndex: 40,
          padding: '1rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          maxHeight: 'calc(100vh - 4.5rem)',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {visibleMenuItems.map(item => (
              <a
                key={item.path}
                href={item.path}
                onClick={() => setIsMenuOpen(false)}
                style={{
                  padding: '1rem',
                  borderRadius: '0.375rem',
                  backgroundColor: isActive(item.path) ? '#374151' : 'transparent',
                  color: isActive(item.path) ? '#60a5fa' : '#d1d5db',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
            
            {/* 모바일 메뉴 하단 정보 */}
            <div style={{ 
              borderTop: '1px solid #374151', 
              marginTop: '1rem', 
              paddingTop: '1rem' 
            }}>
              <div style={{ marginBottom: '1rem', color: '#d1d5db' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  {userName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {t[userRole as keyof typeof t] || userRole}
                </div>
              </div>
              
              {/* 언어 선택 */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  onClick={() => {
                    handleLanguageChange('ko');
                    setIsMenuOpen(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    backgroundColor: locale === 'ko' ? '#2563eb' : 'transparent',
                    color: locale === 'ko' ? 'white' : '#9ca3af',
                    border: '1px solid #374151',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  한국어
                </button>
                <button
                  onClick={() => {
                    handleLanguageChange('zh-CN');
                    setIsMenuOpen(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    backgroundColor: locale === 'zh-CN' ? '#2563eb' : 'transparent',
                    color: locale === 'zh-CN' ? 'white' : '#9ca3af',
                    border: '1px solid #374151',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  中文
                </button>
              </div>
              
              {/* 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 모바일 하단 네비게이션 컴포넌트 (표준화: 홈, 주문, 배송, 재고, 출납)
export function MobileBottomNav({ locale }: { locale: string }) {
  const { usePathname } = require('next/navigation');
  const pathname = usePathname();
  
  // 모바일 하단 네비게이션 - 짧은 레이블 사용
  const bottomNavItems = [
    { path: `/${locale}/dashboard`, label: locale === 'ko' ? '대시보드' : '仪表板', icon: '🏠' },
    { path: `/${locale}/orders`, label: locale === 'ko' ? '주문' : '订单', icon: '📦' },
    { path: `/${locale}/shipments`, label: locale === 'ko' ? '배송' : '配送', icon: '🚚' },
    { path: `/${locale}/inventory`, label: locale === 'ko' ? '재고' : '库存', icon: '📋' },
    { path: `/${locale}/cashbook`, label: locale === 'ko' ? '출납' : '现金', icon: '💰' }
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      borderTop: '1px solid #e5e7eb',
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '0',
      padding: '0.5rem 0',
      zIndex: 40,
      boxShadow: '0 -2px 4px rgba(0,0,0,0.1)'
    }}>
      {bottomNavItems.map((item) => (
        <a
          key={item.path}
          href={item.path}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.25rem',
            textDecoration: 'none',
            color: isActive(item.path) ? '#2563eb' : '#6b7280',
            fontSize: '0.625rem',
            minWidth: 0,
            overflow: 'hidden'
          }}
        >
          <span style={{ fontSize: '1.125rem', marginBottom: '0.125rem' }}>{item.icon}</span>
          <span style={{ 
            fontWeight: isActive(item.path) ? '600' : '400',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%'
          }}>{item.label}</span>
        </a>
      ))}
    </div>
  );
}