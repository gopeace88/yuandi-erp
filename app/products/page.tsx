'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Package, AlertCircle } from 'lucide-react'
import { ProductModal } from '@/components/products/product-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface Product {
  id: string
  sku: string
  name: string
  category: string
  model: string
  color: string
  brand: string
  cost_cny: number
  sale_price_krw: number
  on_hand: number
  low_stock_threshold: number
  barcode?: string
  active: boolean
  created_at: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (!response.ok) throw new Error('Failed to fetch products')
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduct = () => {
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('정말로 이 상품을 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete product')
      await fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('상품 삭제에 실패했습니다.')
    }
  }

  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct.id}`
        : '/api/products'
      
      const method = editingProduct ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      })
      
      if (!response.ok) throw new Error('Failed to save product')
      
      setIsModalOpen(false)
      await fetchProducts()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('상품 저장에 실패했습니다.')
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">상품 관리</h1>
        <Button onClick={handleCreateProduct} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          새 상품 등록
        </Button>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="상품명, SKU, 브랜드로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="h-4 w-4" />
            <span>총 {filteredProducts.length}개 상품</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const isLowStock = product.on_hand <= product.low_stock_threshold
          const isOutOfStock = product.on_hand === 0
          
          return (
            <Card key={product.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.sku}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditProduct(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">카테고리</span>
                  <span className="font-medium">{product.category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">브랜드</span>
                  <span className="font-medium">{product.brand}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">모델</span>
                  <span className="font-medium">{product.model}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">색상</span>
                  <span className="font-medium">{product.color}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">원가</span>
                  <span className="font-medium">¥{product.cost_cny.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">판매가</span>
                  <span className="font-medium">₩{product.sale_price_krw.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">재고</span>
                  <div className="flex items-center gap-2">
                    {isOutOfStock && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                        품절
                      </span>
                    )}
                    {!isOutOfStock && isLowStock && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-600 rounded-full">
                        재고부족
                      </span>
                    )}
                    <span className={`font-semibold ${
                      isOutOfStock ? 'text-red-600' : 
                      isLowStock ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {product.on_hand}개
                    </span>
                  </div>
                </div>
                {isLowStock && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>재주문 필요 (기준: {product.low_stock_threshold}개)</span>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {isModalOpen && (
        <ProductModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSaveProduct}
          product={editingProduct}
          mode={editingProduct ? 'edit' : 'create'}
        />
      )}
    </div>
  )
}