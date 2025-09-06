/**
 * 모바일 최적화된 재고 관리 페이지
 * 카드 레이아웃으로 가독성 향상, 스크롤 최소화
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileBottomNav } from '@/components/Navigation';
import '../dashboard/dashboard.css';

interface InventoryPageProps {
  params: { locale: string };
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  model: string;
  color: string;
  brand: string;
  costCny: number;
  salePriceKrw: number;
  onHand: number;
  lowStockThreshold: number;
  imageUrl?: string;
  description?: string;
  active: boolean;
}

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'inbound' | 'sale' | 'adjustment';
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  unitCost?: number;
  note?: string;
  date: string;
  createdBy: string;
}

export default function InventoryPage({ params: { locale } }: InventoryPageProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [showInboundModal, setShowInboundModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);

  // 새 상품 폼 상태
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    model: '',
    color: '',
    brand: '',
    costCny: 0,
    salePriceKrw: 0,
    lowStockThreshold: 5,
    description: '',
    imageUrl: '',
  });

  // 입고 폼 상태
  const [inboundForm, setInboundForm] = useState({
    productId: '',
    quantity: 0,
    unitCost: 0,
    note: '',
  });

  // 다국어 텍스트
  const t = {
    ko: {
      title: '재고 관리',
      addProduct: '상품 등록',
      inbound: '재고 입고',
      search: '상품 검색...',
      filter: '카테고리',
      all: '전체',
      lowStock: '재고 부족',
      sku: 'SKU',
      productName: '상품명',
      category: '카테고리',
      model: '모델',
      color: '색상',
      brand: '브랜드',
      stock: '재고',
      cost: '원가',
      price: '판매가',
      status: '상태',
      actions: '작업',
      active: '활성',
      inactive: '비활성',
      noProducts: '등록된 상품이 없습니다',
      newProduct: '신규 상품 등록',
      productInfo: '상품 정보',
      stockInfo: '재고 정보',
      priceInfo: '가격 정보',
      imageUpload: '이미지 URL',
      description: '설명',
      lowStockThreshold: '재고 부족 임계값',
      cancel: '취소',
      save: '저장',
      stockInbound: '재고 입고',
      selectProduct: '상품 선택',
      quantity: '수량',
      unitCost: '단가',
      totalCost: '총액',
      note: '메모',
      currentStock: '현재 재고',
      afterInbound: '입고 후 재고',
      stockMovements: '최근 재고 이동',
      movementType: '유형',
      date: '날짜',
      inboundType: '입고',
      saleType: '판매',
      adjustmentType: '조정',
      balance: '잔량',
      operator: '담당자',
      viewDetails: '상세',
      stockSummary: '재고 요약',
      totalProducts: '총 상품',
      totalStock: '총 재고',
      lowStockItems: '부족 상품',
      stockValue: '재고 가치',
    },
    'zh-CN': {
      title: '库存管理',
      addProduct: '产品注册',
      inbound: '入库',
      search: '搜索产品...',
      filter: '类别',
      all: '全部',
      lowStock: '库存不足',
      sku: 'SKU',
      productName: '产品名称',
      category: '类别',
      model: '型号',
      color: '颜色',
      brand: '品牌',
      stock: '库存',
      cost: '成本',
      price: '售价',
      status: '状态',
      actions: '操作',
      active: '活动',
      inactive: '非活动',
      noProducts: '没有注册的产品',
      newProduct: '新产品注册',
      productInfo: '产品信息',
      stockInfo: '库存信息',
      priceInfo: '价格信息',
      imageUpload: '图片URL',
      description: '描述',
      lowStockThreshold: '库存不足阈值',
      cancel: '取消',
      save: '保存',
      stockInbound: '库存入库',
      selectProduct: '选择产品',
      quantity: '数量',
      unitCost: '单价',
      totalCost: '总额',
      note: '备注',
      currentStock: '当前库存',
      afterInbound: '入库后库存',
      stockMovements: '最近库存移动',
      movementType: '类型',
      date: '日期',
      inboundType: '入库',
      saleType: '销售',
      adjustmentType: '调整',
      balance: '余额',
      operator: '操作员',
      viewDetails: '详情',
      stockSummary: '库存摘要',
      totalProducts: '总产品',
      totalStock: '总库存',
      lowStockItems: '缺货产品',
      stockValue: '库存价值',
    }
  }[locale] || t.ko;

  // 사용자 권한 체크
  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    if (!userRole) {
      router.push(`/${locale}`);
      return;
    }
    if (userRole === 'ShipManager') {
      router.push(`/${locale}/shipments`);
      return;
    }
  }, [locale, router]);

  // 데이터 로드
  useEffect(() => {
    loadProducts();
    loadMovements();
  }, []);

  const loadProducts = () => {
    // 목 데이터
    const mockProducts: Product[] = [
      {
        id: '1',
        sku: 'BAG-LX2024-BLACK-YUAND-A1B2C',
        name: locale === 'ko' ? '프리미엄 가방' : '高级包',
        category: locale === 'ko' ? '패션' : '时尚',
        model: 'LX2024',
        color: locale === 'ko' ? '검정' : '黑色',
        brand: 'YUANDI',
        costCny: 450,
        salePriceKrw: 125000,
        onHand: 15,
        lowStockThreshold: 5,
        imageUrl: 'https://via.placeholder.com/150',
        description: locale === 'ko' ? '고급 소재로 제작된 프리미엄 가방' : '用高级材料制作的高级包',
        active: true,
      },
      {
        id: '2',
        sku: 'WATCH-SW100-SILVER-TECH-D3E4F',
        name: locale === 'ko' ? '스마트 워치' : '智能手表',
        category: locale === 'ko' ? '전자제품' : '电子产品',
        model: 'SW-100',
        color: locale === 'ko' ? '실버' : '银色',
        brand: 'TechBrand',
        costCny: 320,
        salePriceKrw: 89000,
        onHand: 3, // 재고 부족
        lowStockThreshold: 5,
        imageUrl: 'https://via.placeholder.com/150',
        active: true,
      },
      {
        id: '3',
        sku: 'COSM-BEAUTY-A-BEAUT-G5H6I',
        name: locale === 'ko' ? '화장품 세트' : '化妆品套装',
        category: locale === 'ko' ? '뷰티' : '美容',
        model: 'Beauty-A',
        color: '-',
        brand: 'BeautyPlus',
        costCny: 240,
        salePriceKrw: 67000,
        onHand: 25,
        lowStockThreshold: 10,
        active: true,
      },
    ];
    setProducts(mockProducts);
  };

  const loadMovements = () => {
    // 목 데이터
    const mockMovements: StockMovement[] = [
      {
        id: '1',
        productId: '1',
        productName: locale === 'ko' ? '프리미엄 가방' : '高级包',
        type: 'inbound',
        quantity: 20,
        balanceBefore: 10,
        balanceAfter: 30,
        unitCost: 450,
        note: locale === 'ko' ? '정기 입고' : '定期入库',
        date: '2024-01-04',
        createdBy: 'Admin',
      },
      {
        id: '2',
        productId: '1',
        productName: locale === 'ko' ? '프리미엄 가방' : '高级包',
        type: 'sale',
        quantity: -15,
        balanceBefore: 30,
        balanceAfter: 15,
        date: '2024-01-05',
        createdBy: 'System',
      },
      {
        id: '3',
        productId: '2',
        productName: locale === 'ko' ? '스마트 워치' : '智能手表',
        type: 'adjustment',
        quantity: -2,
        balanceBefore: 5,
        balanceAfter: 3,
        note: locale === 'ko' ? '불량품 폐기' : '不良品处理',
        date: '2024-01-05',
        createdBy: 'Admin',
      },
    ];
    setMovements(mockMovements);
  };

  const handleProductSave = () => {
    // SKU 자동 생성
    const generateSku = () => {
      const cat = newProduct.category.substring(0, 3).toUpperCase();
      const model = newProduct.model.substring(0, 5).toUpperCase();
      const color = newProduct.color.substring(0, 3).toUpperCase();
      const brand = newProduct.brand.substring(0, 5).toUpperCase();
      const hash = Math.random().toString(36).substring(2, 7).toUpperCase();
      return `${cat}-${model}-${color}-${brand}-${hash}`;
    };

    const productToSave: Product = {
      id: String(products.length + 1),
      sku: generateSku(),
      name: newProduct.name,
      category: newProduct.category,
      model: newProduct.model,
      color: newProduct.color,
      brand: newProduct.brand,
      costCny: newProduct.costCny,
      salePriceKrw: newProduct.salePriceKrw,
      onHand: 0,
      lowStockThreshold: newProduct.lowStockThreshold,
      imageUrl: newProduct.imageUrl,
      description: newProduct.description,
      active: true,
    };

    setProducts([...products, productToSave]);
    setShowProductModal(false);
    resetProductForm();
  };

  const handleInbound = () => {
    const product = products.find(p => p.id === inboundForm.productId);
    if (!product) return;

    // 재고 업데이트
    setProducts(products.map(p => 
      p.id === inboundForm.productId 
        ? { ...p, onHand: p.onHand + inboundForm.quantity }
        : p
    ));

    // 이동 내역 추가
    const movement: StockMovement = {
      id: String(movements.length + 1),
      productId: product.id,
      productName: product.name,
      type: 'inbound',
      quantity: inboundForm.quantity,
      balanceBefore: product.onHand,
      balanceAfter: product.onHand + inboundForm.quantity,
      unitCost: inboundForm.unitCost,
      note: inboundForm.note,
      date: new Date().toISOString().slice(0, 10),
      createdBy: localStorage.getItem('userName') || 'User',
    };

    setMovements([movement, ...movements]);
    setShowInboundModal(false);
    resetInboundForm();
  };

  const resetProductForm = () => {
    setNewProduct({
      name: '',
      category: '',
      model: '',
      color: '',
      brand: '',
      costCny: 0,
      salePriceKrw: 0,
      lowStockThreshold: 5,
      description: '',
      imageUrl: '',
    });
  };

  const resetInboundForm = () => {
    setInboundForm({
      productId: '',
      quantity: 0,
      unitCost: 0,
      note: '',
    });
  };

  const getStockStatus = (product: Product) => {
    if (product.onHand === 0) return { text: locale === 'ko' ? '품절' : '缺货', color: 'text-red-600 bg-red-100' };
    if (product.onHand <= product.lowStockThreshold) return { text: locale === 'ko' ? '부족' : '不足', color: 'text-amber-600 bg-amber-100' };
    return { text: locale === 'ko' ? '정상' : '正常', color: 'text-green-600 bg-green-100' };
  };

  const getMovementTypeColor = (type: string) => {
    switch(type) {
      case 'inbound': return 'bg-blue-100 text-blue-800';
      case 'sale': return 'bg-yellow-100 text-yellow-800';
      case 'adjustment': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesLowStock = !showLowStock || product.onHand <= product.lowStockThreshold;
    
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{t.title}</h1>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowProductModal(true)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium text-sm sm:text-base"
              >
                + {t.addProduct}
              </button>
              <button
                onClick={() => setShowInboundModal(true)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm sm:text-base"
              >
                + {t.inbound}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 재고 통계 요약 - 대시보드와 완전 동일한 스타일 및 배치 */}
      <div style={{ 
        padding: '1rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Stats Grid - 대시보드와 동일 */}
        <div className="stats-grid" style={{ marginBottom: '1rem' }}>
          {/* 총 상품수 */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {t.totalProducts}
            </div>
            <div className="stat-value-large" style={{ 
              fontWeight: 'bold', 
              color: '#2563eb' 
            }}>
              {products.length}
            </div>
          </div>

          {/* 재고 수량 */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {t.totalStock}
            </div>
            <div className="stat-value-large" style={{ 
              fontWeight: 'bold', 
              color: '#10b981' 
            }}>
              {products.reduce((sum, p) => sum + p.onHand, 0)}
            </div>
          </div>

          {/* 재고 부족 */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {t.lowStockItems}
            </div>
            <div className="stat-value-large" style={{ 
              fontWeight: 'bold', 
              color: '#f59e0b' 
            }}>
              {products.filter(p => p.onHand <= p.lowStockThreshold).length}
            </div>
          </div>

          {/* 재고 가치 */}
          <div className="stat-card" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-label" style={{ color: '#6b7280' }}>
              {t.stockValue}
            </div>
            <div className="revenue-value" style={{ 
              fontWeight: 'bold', 
              color: '#8b5cf6' 
            }}>
              ₩{products.reduce((sum, p) => sum + p.onHand * p.salePriceKrw, 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 - 모바일 최적화 (작은 크기, 깔끔한 배치) */}
      <div className="px-3 sm:px-6 lg:px-8 pb-3">
        <div className="space-y-1.5">
          {/* 검색창 - 첫번째 줄 */}
          <input
            type="text"
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2.5 py-1 border border-gray-300 rounded text-xs sm:text-base focus:outline-none focus:ring-1 focus:ring-blue-500"
            style={{ height: '32px' }}
          />
          {/* 필터 버튼들 - 두번째 줄 */}
          <div className="flex gap-1.5">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs sm:text-base focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ height: '32px' }}
            >
              <option value="all">{t.all}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={() => setShowLowStock(!showLowStock)}
              className={`px-2.5 py-1 rounded font-medium text-xs sm:text-base transition-colors ${
                showLowStock 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
              }`}
              style={{ height: '32px', minWidth: '80px' }}
            >
              {t.lowStock}
            </button>
          </div>
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="px-3 sm:px-6 lg:px-8 pb-6">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {t.noProducts}
          </div>
        ) : (
          <>
            {/* 모바일 테이블 레이아웃 - 좌우 스크롤 가능 */}
            <div className="block lg:hidden bg-white rounded-lg shadow" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ minWidth: '600px', width: '100%' }} className="divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {t.productName}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {t.category}
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {t.stock}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {t.cost}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {t.price}
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {t.status}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <tr key={product.id} onClick={() => setSelectedProduct(product)} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            {product.imageUrl && (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-8 h-8 object-cover rounded mr-2"
                              />
                            )}
                            <div>
                              <div className="text-xs font-medium text-gray-900">{product.name}</div>
                              <div className="text-[10px] text-gray-500">{product.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{product.category}</div>
                          <div className="text-[10px] text-gray-500">{product.brand}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <div className="text-xs font-semibold text-gray-900">{product.onHand}</div>
                          <div className="text-[10px] text-gray-500">/{product.lowStockThreshold}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-xs text-gray-900">
                          ¥{product.costCny}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-semibold text-blue-600">
                          ₩{product.salePriceKrw.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${stockStatus.color}`}>
                            {stockStatus.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 데스크탑 테이블 레이아웃 (큰 화면) */}
            <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.productName}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.category}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.stock}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.cost}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.price}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.status}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {product.imageUrl && (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded mr-3"
                              />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{product.name}</p>
                              <p className="text-xs text-gray-500 font-mono">{product.sku}</p>
                              <p className="text-xs text-gray-500">
                                {product.model} / {product.color} / {product.brand}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <p className="text-sm font-medium text-gray-900">{product.onHand}</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                            {stockStatus.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ¥{product.costCny}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          ₩{product.salePriceKrw.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {product.active ? t.active : t.inactive}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => setSelectedProduct(product)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            {t.viewDetails}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 최근 재고 이동 내역 - 테이블 형식 */}
      <div className="px-3 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t.stockMovements}</h2>
        <div className="bg-white rounded-lg shadow" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ minWidth: '700px', width: '100%' }} className="divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  상품명
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  구분
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  수량
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  잔량
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  날짜
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  비고
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements.slice(0, 10).map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-900">{movement.productName}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${getMovementTypeColor(movement.type)}`}>
                      {movement.type === 'inbound' ? t.inboundType : movement.type === 'sale' ? t.saleType : t.adjustmentType}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span className={`text-xs font-bold ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center text-xs text-gray-900">
                    {movement.balanceAfter}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-xs text-gray-900">{movement.date}</div>
                    <div className="text-[10px] text-gray-500">{movement.createdBy}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {movement.note || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상품 등록 모달 */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">{t.newProduct}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.productName} *</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.category} *</label>
                    <input
                      type="text"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.brand} *</label>
                    <input
                      type="text"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.model} *</label>
                    <input
                      type="text"
                      value={newProduct.model}
                      onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.color}</label>
                    <input
                      type="text"
                      value={newProduct.color}
                      onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.cost} (CNY) *</label>
                    <input
                      type="number"
                      value={newProduct.costCny}
                      onChange={(e) => setNewProduct({ ...newProduct, costCny: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.price} (KRW) *</label>
                    <input
                      type="number"
                      value={newProduct.salePriceKrw}
                      onChange={(e) => setNewProduct({ ...newProduct, salePriceKrw: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.lowStockThreshold}</label>
                  <input
                    type="number"
                    value={newProduct.lowStockThreshold}
                    onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.imageUpload}</label>
                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={newProduct.imageUrl}
                    onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    resetProductForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleProductSave}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
                >
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 재고 입고 모달 */}
      {showInboundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">{t.stockInbound}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.selectProduct} *</label>
                  <select
                    value={inboundForm.productId}
                    onChange={(e) => setInboundForm({ ...inboundForm, productId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- {t.selectProduct} --</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku}) - {t.currentStock}: {product.onHand}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.quantity} *</label>
                    <input
                      type="number"
                      min="1"
                      value={inboundForm.quantity}
                      onChange={(e) => setInboundForm({ ...inboundForm, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.unitCost} (CNY)</label>
                    <input
                      type="number"
                      value={inboundForm.unitCost}
                      onChange={(e) => setInboundForm({ ...inboundForm, unitCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {inboundForm.productId && inboundForm.quantity > 0 && (
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm text-gray-600">
                      {t.currentStock}: <span className="font-semibold">{products.find(p => p.id === inboundForm.productId)?.onHand || 0}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      {t.afterInbound}: <span className="font-semibold text-green-600">
                        {(products.find(p => p.id === inboundForm.productId)?.onHand || 0) + inboundForm.quantity}
                      </span>
                    </p>
                    {inboundForm.unitCost > 0 && (
                      <p className="text-sm text-gray-600">
                        {t.totalCost}: <span className="font-semibold">¥{(inboundForm.quantity * inboundForm.unitCost).toFixed(2)}</span>
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.note}</label>
                  <textarea
                    value={inboundForm.note}
                    onChange={(e) => setInboundForm({ ...inboundForm, note: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowInboundModal(false);
                    resetInboundForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleInbound}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                >
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 바 */}
      {/* 표준화된 모바일 하단 네비게이션 */}
      <MobileBottomNav locale={locale} />
    </div>
  );
}