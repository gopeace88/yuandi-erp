/**
 * 모바일 최적화된 네비게이션 컴포넌트
 * PRD v2.0 요구사항: 역할 기반 메뉴 표시 + 모바일 반응형
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
      dashboard: '대시보드',
      orders: '주문 관리',
      inventory: '재고 관리',
      shipments: '배송 관리',
      cashbook: '출납장부',
      users: '사용자 관리',
      track: '주문 조회',
      logout: '로그아웃',
      Admin: '관리자',
      OrderManager: '주문 관리자',
      ShipManager: '배송 관리자',
      menu: '메뉴'
    },
    'zh-CN': {
      title: 'YUANDI Collection',
      subtitle: '综合管理系统',
      dashboard: '仪表板',
      orders: '订单管理',
      inventory: '库存管理',
      shipments: '配送管理',
      cashbook: '出纳簿',
      users: '用户管理',
      track: '订单查询',
      logout: '退出',
      Admin: '管理员',
      OrderManager: '订单管理员',
      ShipManager: '配送管理员',
      menu: '菜单'
    }
  };

  const t = texts[locale as keyof typeof texts] || texts.ko;

  useEffect(() => {
    const role = localStorage.getItem('userRole') || '';
    const name = localStorage.getItem('userName') || '';
    setUserRole(role);
    setUserName(name);
  }, []);

  // 메뉴 항목 정의
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
      icon: '📋',
      roles: ['Admin', 'OrderManager']
    },
    {
      path: `/${locale}/inventory`,
      label: t.inventory,
      icon: '📦',
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

  const visibleMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    router.push(`/${locale}/`);
  };

  const handleLanguageChange = (newLocale: string) => {
    const currentPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(currentPath);
  };

  const isActive = (path: string) => pathname === path;

  if (!userRole) return null;

  return (
    <>
      {/* 네비게이션 바 */}
      <nav className="bg-gray-800 text-white shadow-lg">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 로고 & 타이틀 */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-lg sm:text-xl font-bold">{t.title}</h1>
                <p className="text-xs text-gray-400 hidden sm:block">{t.subtitle}</p>
              </div>

              {/* 데스크탑 메뉴 */}
              <div className="hidden md:block ml-10">
                <div className="flex items-center space-x-2">
                  {visibleMenuItems.map(item => (
                    <a
                      key={item.path}
                      href={item.path}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? 'bg-gray-900 text-blue-400'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <span className="mr-1">{item.icon}</span>
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* 우측 메뉴 */}
            <div className="flex items-center space-x-3">
              {/* 언어 선택 */}
              <div className="hidden sm:flex space-x-1">
                <button
                  onClick={() => handleLanguageChange('ko')}
                  className={`px-2 py-1 text-xs rounded ${
                    locale === 'ko' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  한국어
                </button>
                <button
                  onClick={() => handleLanguageChange('zh-CN')}
                  className={`px-2 py-1 text-xs rounded ${
                    locale === 'zh-CN' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  中文
                </button>
              </div>

              {/* 사용자 정보 (데스크탑) */}
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-gray-400">{t[userRole as keyof typeof t] || userRole}</p>
              </div>

              {/* 로그아웃 버튼 (데스크탑) */}
              <button
                onClick={handleLogout}
                className="hidden md:block px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                {t.logout}
              </button>

              {/* 모바일 메뉴 버튼 */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
              >
                <svg 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <div className="md:hidden bg-gray-800 border-t border-gray-700">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {visibleMenuItems.map(item => (
                <a
                  key={item.path}
                  href={item.path}
                  className={`block px-3 py-3 rounded-md text-base font-medium ${
                    isActive(item.path)
                      ? 'bg-gray-900 text-blue-400'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </div>

            {/* 모바일 하단 메뉴 */}
            <div className="px-4 py-3 border-t border-gray-700">
              {/* 사용자 정보 */}
              <div className="mb-3">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-gray-400">{t[userRole as keyof typeof t] || userRole}</p>
              </div>

              {/* 언어 선택 (모바일) */}
              <div className="flex space-x-2 mb-3">
                <button
                  onClick={() => handleLanguageChange('ko')}
                  className={`flex-1 py-2 text-sm rounded ${
                    locale === 'ko' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  한국어
                </button>
                <button
                  onClick={() => handleLanguageChange('zh-CN')}
                  className={`flex-1 py-2 text-sm rounded ${
                    locale === 'zh-CN' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  中文
                </button>
              </div>

              {/* 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                {t.logout}
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}