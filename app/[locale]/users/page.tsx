/**
 * 설정 페이지 - settings로 리다이렉트
 * /users는 deprecated되었고 /settings로 이동
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UsersPageProps {
  params: { locale: string };
}

export default function UsersPage({ params: { locale } }: UsersPageProps) {
  const router = useRouter();

  useEffect(() => {
    // settings 페이지로 즉시 리다이렉트
    router.replace(`/${locale}/settings`);
  }, [locale, router]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
          {locale === 'ko' ? '설정 페이지로 이동 중...' : '正在跳转到设置页面...'}
        </p>
      </div>
    </div>
  );
}