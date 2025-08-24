'use client'

import { useEffect } from 'react'

interface LanguageHomeProps {
  locale: 'ko' | 'zh-CN'
  title: string
  description: string
  dashboardText: string
  trackText: string
  languageChangeText: string
}

export default function LanguageHome({
  locale,
  title,
  description,
  dashboardText,
  trackText,
  languageChangeText
}: LanguageHomeProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', locale)
    }
  }, [locale])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {title}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {description}
        </p>
        <div className="space-x-4">
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {dashboardText}
          </a>
          <a
            href="/track"
            className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            {trackText}
          </a>
        </div>
        
        <div className="mt-8">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            {languageChangeText}
          </a>
        </div>
      </div>
    </div>
  )
}