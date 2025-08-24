'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const [locale, setLocale] = useState<'ko' | 'zh-CN'>('ko')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // localStorage에서 언어 설정 확인
      const storedLocale = localStorage.getItem('locale')
      
      if (storedLocale && ['ko', 'zh-CN'].includes(storedLocale)) {
        setLocale(storedLocale as 'ko' | 'zh-CN')
        // 쿠키에도 저장
        document.cookie = `locale=${storedLocale}; path=/; max-age=${60 * 60 * 24 * 365}`
      } else {
        // 쿠키 확인
        const cookieValue = document.cookie
          .split('; ')
          .find(row => row.startsWith('locale='))
          ?.split('=')[1] as 'ko' | 'zh-CN'
        
        if (cookieValue && ['ko', 'zh-CN'].includes(cookieValue)) {
          setLocale(cookieValue)
          localStorage.setItem('locale', cookieValue)
        } else {
          // 저장된 설정이 없으면 브라우저 언어 감지
          const browserLang = navigator.language?.toLowerCase() || 'ko'
          const detectedLocale = browserLang.includes('zh') ? 'zh-CN' : 'ko'
          setLocale(detectedLocale)
          localStorage.setItem('locale', detectedLocale)
          document.cookie = `locale=${detectedLocale}; path=/; max-age=${60 * 60 * 24 * 365}`
        }
      }
      setIsLoading(false)
    }
  }, [])

  const content = {
    'ko': {
      title: 'YUANDI Collection Management',
      subtitle: 'YUANDI Collection 주문/재고/배송 관리 시스템',
      dashboard: '대시보드로 이동',
      track: '주문 조회',
      language: '中文'
    },
    'zh-CN': {
      title: 'YUANDI Collection Management',
      subtitle: 'YUANDI Collection 订单/库存/配送管理系统',
      dashboard: '进入仪表板',
      track: '订单查询',
      language: '한국어'
    }
  }

  const toggleLanguage = () => {
    const newLocale = locale === 'ko' ? 'zh-CN' : 'ko'
    setLocale(newLocale)
    localStorage.setItem('locale', newLocale)
    document.cookie = `locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`
    // 페이지 새로고침으로 모든 컴포넌트가 새 언어를 적용하도록 함
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleLanguage}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
        >
          <span className="text-xl">{locale === 'ko' ? '🇨🇳' : '🇰🇷'}</span>
          <span className="text-sm font-medium">{content[locale].language}</span>
        </button>
      </div>
      
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {content[locale].title}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {content[locale].subtitle}
        </p>
        <div className="space-x-4">
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {content[locale].dashboard}
          </a>
          <a
            href="/track"
            className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            {content[locale].track}
          </a>
        </div>
      </div>
    </div>
  )
}