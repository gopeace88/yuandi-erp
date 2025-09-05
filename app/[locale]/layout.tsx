/**
 * 루트 레이아웃 - 다국어 지원
 * 각 언어별로 별도 레이아웃 제공
 */

import { Inter } from 'next/font/google';
import { type Locale, locales, getDictionary } from '@/lib/i18n';
import { TranslationProvider } from '@/components/i18n/TranslationProvider';
import { Metadata } from 'next';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: { locale }
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const dict = await getDictionary(locale);
  
  return {
    title: {
      default: 'YUANDI - ' + (dict.navigation?.dashboard || 'Order Management System'),
      template: '%s | YUANDI'
    },
    description: locale === 'ko' 
      ? 'YUANDI 해외 구매대행 주문관리 시스템' 
      : locale === 'zh-CN'
      ? 'YUANDI 海外代购订单管理系统'
      : 'YUANDI Overseas Purchase Order Management System',
    keywords: locale === 'ko'
      ? ['주문관리', '재고관리', '배송관리', '구매대행', 'ERP']
      : locale === 'zh-CN'
      ? ['订单管理', '库存管理', '物流管理', '代购', 'ERP']
      : ['order management', 'inventory management', 'shipping', 'purchasing', 'ERP'],
    authors: [{ name: 'YUANDI' }],
    creator: 'YUANDI',
    publisher: 'YUANDI',
    robots: {
      index: false,
      follow: false,
    },
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 1,
    },
    themeColor: '#000000',
    manifest: '/manifest.json',
  };
}

interface RootLayoutProps {
  children: React.ReactNode;
  params: { locale: Locale };
}

export default async function RootLayout({
  children,
  params: { locale }
}: RootLayoutProps) {
  // Validate locale
  if (!locales.includes(locale)) {
    return (
      <html lang="ko">
        <body className={inter.className}>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">지원하지 않는 언어입니다</h1>
              <p className="text-gray-600">
                지원하는 언어: 한국어, 中文, English
              </p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale} dir="ltr">
      <body className={inter.className}>
        <TranslationProvider 
          initialLocale={locale} 
          initialDictionary={dictionary}
        >
          {children}
        </TranslationProvider>
      </body>
    </html>
  );
}