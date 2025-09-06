'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Locale, LOCALE_STORAGE_KEY, defaultLocale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'
import { ProductAddModal } from '@/app/components/inventory/product-add-modal'
import { StockModal } from '@/app/components/inventory/stock-modal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Plus,
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  XCircle,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { BottomNavigation } from '@/components/layout/mobile-navigation'

export default function InventoryPage() {
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>(defaultLocale)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [stockModal, setStockModal] = useState<{
    isOpen: boolean
    type: 'inbound' | 'adjustment'
    product: any
  }>({ isOpen: false, type: 'inbound', product: null })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 샘플 재고 데이터
  const inventoryData = [
    {
      id: '1',
      name: 'iPhone 15 Pro',
      model: 'iPhone15Pro',
      color: 'Blue',
      manufacturer: 'Apple',
      category: 'electronics',
      stock: 25,
      safetyStock: 10,
      status: 'normal',
      price: 1200000,
      imageUrl: '/api/placeholder/60/60'
    },
    {
      id: '2',
      name: '스마트워치 Ultra',
      model: 'WatchUltra',
      color: 'Black',
      manufacturer: 'Apple',
      category: 'electronics',
      stock: 3,
      safetyStock: 5,
      status: 'low',
      price: 800000,
      imageUrl: '/api/placeholder/60/60'
    },
    {
      id: '3',
      name: '무선 이어폰 Pro',
      model: 'AirPodsPro',
      color: 'White',
      manufacturer: 'Apple',
      category: 'electronics',
      stock: 0,
      safetyStock: 10,
      status: 'out',
      price: 300000,
      imageUrl: '/api/placeholder/60/60'
    },
    {
      id: '4',
      name: 'iPad Pro 12.9',
      model: 'iPadPro12',
      color: 'Silver',
      manufacturer: 'Apple',
      category: 'electronics',
      stock: 8,
      safetyStock: 5,
      status: 'normal',
      price: 1500000,
      imageUrl: '/api/placeholder/60/60'
    },
    {
      id: '5',
      name: 'MacBook Air M2',
      model: 'MacBookAirM2',
      color: 'Gray',
      manufacturer: 'Apple',
      category: 'electronics',
      stock: 2,
      safetyStock: 3,
      status: 'low',
      price: 1800000,
      imageUrl: '/api/placeholder/60/60'
    },
  ]

  // 통계 계산
  const stats = {
    totalProducts: inventoryData.length,
    totalStock: inventoryData.reduce((sum, item) => sum + item.stock, 0),
    lowStock: inventoryData.filter(item => item.status === 'low').length,
    outOfStock: inventoryData.filter(item => item.status === 'out').length,
    totalValue: inventoryData.reduce((sum, item) => sum + (item.stock * item.price), 0)
  }

  // 필터링된 데이터
  const filteredData = inventoryData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !filterCategory || item.category === filterCategory
    return matchesSearch && matchesCategory
  })

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setIsAuthenticated(true)
      } else {
        router.push('/login')
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
      }
    }
  }, [])

  const t = (key: string) => translate(locale, key)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-800'
      case 'low': return 'bg-yellow-100 text-yellow-800'
      case 'out': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'normal': return '정상'
      case 'low': return '부족'
      case 'out': return '품절'
      default: return '알 수 없음'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">재고 관리</h1>
            <p className="text-xs text-gray-500">상품 재고 현황을 확인하세요</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="h-8 w-8 p-0"
            >
              {viewMode === 'grid' ? <MoreHorizontal className="h-4 w-4" /> : <Package className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="h-8 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 통계 카드 - 모바일 최적화 */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">총 상품</p>
                  <p className="text-lg font-bold text-gray-900">{stats.totalProducts}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">총 재고</p>
                  <p className="text-lg font-bold text-gray-900">{stats.totalStock}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">재고 부족</p>
                  <p className="text-lg font-bold text-yellow-600">{stats.lowStock}</p>
                </div>
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">품절</p>
                  <p className="text-lg font-bold text-red-600">{stats.outOfStock}</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 검색 및 필터 */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="상품명 또는 모델명 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <div className="flex space-x-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체 카테고리</option>
                  <option value="electronics">전자제품</option>
                  <option value="fashion">패션</option>
                  <option value="home">홈</option>
                </select>
                <Button variant="outline" size="sm" className="h-10 px-3">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 상품 목록 - 모바일 최적화 */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-3">
            {filteredData.map((item) => (
              <Card key={item.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {item.imageUrl ? (
                        <img
                          className="w-12 h-12 rounded-lg object-cover"
                          src={item.imageUrl}
                          alt={item.name}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {item.model} • {item.color}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.manufacturer}
                          </p>
                        </div>
                        <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                          {getStatusText(item.status)}
                        </Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">현재 재고:</span>
                          <span className="ml-1 font-medium">{item.stock}개</span>
                        </div>
                        <div>
                          <span className="text-gray-500">안전 재고:</span>
                          <span className="ml-1 font-medium">{item.safetyStock}개</span>
                        </div>
                      </div>

                      <div className="mt-3 flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStockModal({ isOpen: true, type: 'inbound', product: item })}
                          className="flex-1 h-8 text-xs"
                        >
                          입고
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStockModal({ isOpen: true, type: 'adjustment', product: item })}
                          className="flex-1 h-8 text-xs"
                        >
                          조정
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {filteredData.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {item.imageUrl ? (
                          <img
                            className="w-10 h-10 rounded-lg object-cover"
                            src={item.imageUrl}
                            alt={item.name}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </h3>
                          <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                            {getStatusText(item.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.model} • {item.color} • {item.manufacturer}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <span>재고: <span className="font-medium text-gray-900">{item.stock}</span></span>
                          <span>안전: <span className="font-medium text-gray-900">{item.safetyStock}</span></span>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStockModal({ isOpen: true, type: 'inbound', product: item })}
                          className="h-8 px-2 text-xs"
                        >
                          입고
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStockModal({ isOpen: true, type: 'adjustment', product: item })}
                          className="h-8 px-2 text-xs"
                        >
                          조정
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 빈 상태 */}
        {filteredData.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-2">상품을 찾을 수 없습니다</h3>
              <p className="text-xs text-gray-500 mb-4">
                검색 조건을 변경하거나 새 상품을 추가해보세요
              </p>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                상품 추가
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 상품 추가 모달 */}
      {isAddModalOpen && (
        <ProductAddModal
          locale={locale}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false)
            // TODO: 목록 새로고침
          }}
        />
      )}

      {/* 재고 입고/조정 모달 */}
      {stockModal.isOpen && stockModal.product && (
        <StockModal
          locale={locale}
          type={stockModal.type}
          product={stockModal.product}
          onClose={() => setStockModal({ isOpen: false, type: 'inbound', product: null })}
          onSuccess={(quantity, note) => {
            console.log(`${stockModal.type} - Product: ${stockModal.product.name}, Quantity: ${quantity}, Note: ${note}`)
            setStockModal({ isOpen: false, type: 'inbound', product: null })
            // TODO: 재고 업데이트 및 새로고침
          }}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}