import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'YUANDI Collection - 관리 시스템',
  description: 'YUANDI Collection 통합 관리 시스템',
  keywords: 'Collection, ERP, 재고관리, 주문관리, 배송관리',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}