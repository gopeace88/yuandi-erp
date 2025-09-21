/**
 * 홈 페이지 - 로그인 화면
 * PRD v2.0 요구사항: 사용자 인증 시스템
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface HomePageProps {
  params: { locale: string };
}

export default function HomePage({ params: { locale } }: HomePageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // 다국어 텍스트
  const texts = {
    ko: {
      title: 'YUANDI Collection',
      subtitle: '통합 관리 시스템',
      description: '해외 구매대행 전문 ERP 시스템',
      email: '이메일',
      password: '비밀번호',
      login: '로그인',
      guestAccess: '주문 조회 (고객용)',
      error: '로그인 실패',
      loading: '로그인 중...',
      forgotPassword: '비밀번호를 잊으셨나요?',
      testAccount: '테스트 계정',
      adminRole: '관리자',
      orderManagerRole: '주문 관리자',
      shipManagerRole: '배송 관리자'
    },
    'zh-CN': {
      title: 'YUANDI Collection',
      subtitle: '综合管理系统',
      description: '海外代购专业ERP系统',
      email: '电子邮件',
      password: '密码',
      login: '登录',
      guestAccess: '订单查询（客户）',
      error: '登录失败',
      loading: '登录中...',
      forgotPassword: '忘记密码？',
      testAccount: '测试账户',
      adminRole: '管理员',
      orderManagerRole: '订单经理',
      shipManagerRole: '配送经理'
    }
  };

  const t = texts[locale as keyof typeof texts] || texts.ko;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const supabase = createClient();
      
      // Supabase 인증
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError) {
        console.error('Auth error:', authError);
        const message = authError.message?.includes('Invalid login credentials')
          ? (locale === 'ko' ? '이메일 또는 비밀번호가 올바르지 않습니다.' : '邮箱或密码不正确。')
          : t.error;
        setError(message);
        setIsLoading(false);
        return;
      }
      
      // 사용자 프로필 조회
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user?.id)
        .single();
      
      if (profileError || !profile) {
        console.error('Profile error:', profileError);
        setError(locale === 'ko' ? '사용자 프로필을 불러올 수 없습니다.' : '无法加载用户信息。');
        setIsLoading(false);
        return;
      }
      
      // 로컬 스토리지에 저장
      localStorage.setItem('userRole', profile.role);
      localStorage.setItem('userName', profile.name);
      localStorage.setItem('userEmail', profile.email);
      
      // 대시보드로 이동
      window.location.href = `/${locale}/dashboard`;
      
    } catch (error) {
      console.error('Login error:', error);
      setError(locale === 'ko' ? '로그인 처리 중 문제가 발생했습니다.' : '登录过程中出现问题。');
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* 로고 및 타이틀 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
            {t.title}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">{t.subtitle}</p>
          <p className="text-gray-500 text-xs sm:text-sm mt-2">
            {t.description}
          </p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg">
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                {t.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin@yuandi.com"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                {t.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-md font-medium text-white text-base transition-colors ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {isLoading ? t.loading : t.login}
            </button>
          </form>

          {/* 구분선 */}
          <div className="my-6 border-t border-gray-200"></div>

          {/* 고객 조회 버튼 */}
          <a
            href={`/${locale}/track`}
            className="block w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium text-center transition-colors"
          >
            {t.guestAccess}
          </a>
        </div>


        {/* 언어 선택 */}
        <div style={{ 
          textAlign: 'center',
          marginTop: '1rem',
          fontSize: '0.875rem'
        }}>
          <a
            href="/ko"
            style={{
              color: locale === 'ko' ? '#2563eb' : '#6b7280',
              marginRight: '1rem',
              textDecoration: 'none'
            }}
          >
            한국어
          </a>
          <a
            href="/zh-CN"
            style={{
              color: locale === 'zh-CN' ? '#2563eb' : '#6b7280',
              textDecoration: 'none'
            }}
          >
            中文
          </a>
        </div>
      </div>
    </div>
  );
}
