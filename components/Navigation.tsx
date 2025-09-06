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
      users: '사용자 관리',
      track: '주문 조회',
      // User menu
      profile: '프로필',
      settings: '설정',
      logout: '로그아웃',
      // Roles
      Admin: '관리자',
      OrderManager: '주문 관리자',
      ShipManager: '배송 관리자',
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
      users: '用户管理',
      track: '订单查询',
      // User menu
      profile: '个人资料',
      settings: '设置',
      logout: '退出',
      // Roles
      Admin: '管理员',
      OrderManager: '订单经理',
      ShipManager: '配送经理',
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

  // 메뉴 항목 정의 (역할별 접근 권한)
  const menuItems = [
    {
      path: `/${locale}/dashboard`,
      label: t.dashboard,
      icon: '📊',
      roles: ['Admin', 'OrderManager', 'ShipManager']
    },
    {
      path: `/${locale}/orders`,
      label: t.orders,
      icon: '📦',
      roles: ['Admin', 'OrderManager']
    },
    {
      path: `/${locale}/inventory`,
      label: t.inventory,
      icon: '📋',
      roles: ['Admin', 'OrderManager']
    },
    {
      path: `/${locale}/shipments`,
      label: t.shipments,
      icon: '🚚',
      roles: ['Admin', 'OrderManager', 'ShipManager']
    },
    {
      path: `/${locale}/cashbook`,
      label: t.cashbook,
      icon: '💰',
      roles: ['Admin', 'OrderManager', 'ShipManager']
    },
    {
      path: `/${locale}/users`,
      label: t.users,
      icon: '👥',
      roles: ['Admin']
    },
    {
      path: `/${locale}/track`,
      label: t.track,
      icon: '🔍',
      roles: ['Admin', 'OrderManager', 'ShipManager']
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
      {/* 데스크탑 네비게이션 */}
      <nav style={{
        backgroundColor: '#1f2937',
        color: 'white',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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

          {/* 데스크탑 메뉴 */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem',
            '@media (max-width: 768px)': { display: 'none' }
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
        </div>

        {/* 사용자 정보 및 언어 선택 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* 언어 선택 */}
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

          {/* 사용자 정보 */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              {userName}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {t[userRole as keyof typeof t] || userRole}
            </div>
          </div>

          {/* 로그아웃 버튼 */}
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

          {/* 모바일 메뉴 버튼 */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              display: 'none',
              padding: '0.5rem',
              backgroundColor: 'transparent',
              color: 'white',
              border: '1px solid #374151',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              '@media (max-width: 768px)': { display: 'block' }
            }}
          >
            {isMenuOpen ? t.close : t.menu}
          </button>
        </div>
      </nav>

      {/* 모바일 메뉴 */}
      {isMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '4rem',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#1f2937',
          zIndex: 40,
          padding: '1rem',
          display: 'none',
          '@media (max-width: 768px)': { display: 'block' }
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
          </div>
        </div>
      )}
    </>
  );
}