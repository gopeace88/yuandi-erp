import './globals.css';
import Navigation from '@/components/NavigationMobile';

export async function generateStaticParams() {
  return [
    { locale: 'ko' },
    { locale: 'zh-CN' },
  ];
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default function LocaleLayout({
  children,
  params: { locale }
}: LocaleLayoutProps) {
  // locale별 레이아웃이지만, html과 body는 루트 레이아웃에서 처리
  return (
    <>
      <Navigation locale={locale} />
      {children}
    </>
  );
}