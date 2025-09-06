'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // 브라우저 언어 감지
    const browserLang = navigator.language || navigator.languages[0];
    
    // 중국어 체크 (zh, zh-CN, zh-TW, zh-HK 등)
    if (browserLang.toLowerCase().startsWith('zh')) {
      router.push('/zh-CN');
    } else {
      // 한국어 또는 기타 언어는 모두 한국어로
      router.push('/ko');
    }
  }, [router]);

  // 리다이렉트 중에 보여줄 로딩 화면
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        {/* Logo/Icon */}
        <div className="w-20 h-20 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <span className="text-3xl text-white font-bold">Y</span>
        </div>
        
        {/* Main Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          YUANDI Collection
        </h1>
        
        {/* Loading indicator */}
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}