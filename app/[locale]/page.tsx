/**
 * 홈 페이지 - 다국어 지원
 * 언어별 홈 페이지 제공
 */

import { type Locale, getDictionary } from '@/lib/i18n';
import { TranslationProvider } from '@/components/i18n/TranslationProvider';
import LanguageSelector from '@/components/i18n/LanguageSelector';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Package, Truck, BarChart3, Globe } from 'lucide-react';

interface HomePageProps {
  params: { locale: Locale };
}

export default async function HomePage({ params: { locale } }: HomePageProps) {
  const dictionary = await getDictionary(locale);

  const features = [
    {
      icon: <ShoppingCart className="w-8 h-8 text-blue-600" />,
      title: dictionary.navigation?.orders || 'Order Management',
      description: locale === 'ko' 
        ? '주문 생성부터 배송완료까지 전체 프로세스 관리'
        : locale === 'zh-CN'
        ? '从订单创建到配送完成的全流程管理'
        : 'Complete process management from order creation to delivery'
    },
    {
      icon: <Package className="w-8 h-8 text-green-600" />,
      title: dictionary.navigation?.inventory || 'Inventory Management',
      description: locale === 'ko'
        ? '실시간 재고 현황 및 입출고 관리'
        : locale === 'zh-CN'
        ? '实时库存状态及进出库管理'
        : 'Real-time inventory status and stock management'
    },
    {
      icon: <Truck className="w-8 h-8 text-purple-600" />,
      title: dictionary.navigation?.shipping || 'Shipping Management',
      description: locale === 'ko'
        ? '배송 추적 및 고객 알림 서비스'
        : locale === 'zh-CN'
        ? '物流跟踪及客户通知服务'
        : 'Shipping tracking and customer notification service'
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-orange-600" />,
      title: dictionary.navigation?.reports || 'Analytics & Reports',
      description: locale === 'ko'
        ? '매출 분석 및 비즈니스 인사이트'
        : locale === 'zh-CN'
        ? '销售分析及业务洞察'
        : 'Sales analytics and business insights'
    }
  ];

  const getStartedText = locale === 'ko' 
    ? '시작하기'
    : locale === 'zh-CN'
    ? '开始使用'
    : 'Get Started';

  const trackOrderText = locale === 'ko'
    ? '주문 조회'
    : locale === 'zh-CN'
    ? '订单查询'  
    : 'Track Order';

  const welcomeTitle = locale === 'ko'
    ? 'YUANDI 주문관리 시스템에 오신 것을 환영합니다'
    : locale === 'zh-CN'
    ? '欢迎使用 YUANDI 订单管理系统'
    : 'Welcome to YUANDI Order Management System';

  const welcomeSubtitle = locale === 'ko'
    ? '해외 구매대행 전문 ERP 시스템으로 효율적인 비즈니스 운영을 시작하세요'
    : locale === 'zh-CN'
    ? '专业的海外代购 ERP 系统，开启高效的业务运营'
    : 'Professional overseas purchasing ERP system for efficient business operations';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Globe className="w-8 h-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">YUANDI</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageSelector currentLocale={locale} variant="compact" />
              <Link href={`/${locale}/auth/signin`}>
                <Button variant="outline">
                  {dictionary.common?.login || 'Login'}
                </Button>
              </Link>
              <Link href={`/${locale}/track`}>
                <Button variant="default">
                  {trackOrderText}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-8">
            {welcomeTitle}
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            {welcomeSubtitle}
          </p>
          
          <div className="flex justify-center space-x-4">
            <Link href={`/${locale}/dashboard`}>
              <Button size="lg" className="px-8 py-3">
                {getStartedText}
              </Button>
            </Link>
            <Link href={`/${locale}/track`}>
              <Button variant="outline" size="lg" className="px-8 py-3">
                {trackOrderText}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600 text-sm">
            <p>&copy; 2024 YUANDI. All rights reserved.</p>
            <p className="mt-2">
              {locale === 'ko' && '해외 구매대행 전문 주문관리 시스템'}
              {locale === 'zh-CN' && '专业的海外代购订单管理系统'}
              {locale === 'en' && 'Professional Overseas Purchase Order Management System'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}