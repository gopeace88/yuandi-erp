/**
 * 재고 관리 페이지
 * PRD v2.0: 재고 입고, 상품 등록, 이미지 관리
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { exportToExcel } from '@/lib/utils/excel';
import InventoryPageMobile from './InventoryPageMobile';
import ImageUpload from '@/components/common/ImageUpload';
import Pagination from '@/components/common/Pagination';

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
  const [isMobile, setIsMobile] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // 페이지당 20개 항목 표시

  // 상품 상세 클릭 핸들러
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      adjust: '재고 조정',
      search: '검색',
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
      cost: '원가(CNY)',
      price: '판매가(KRW)',
      status: '상태',
      actions: '작업',
      active: '활성',
      inactive: '비활성',
      noProducts: '등록된 상품이 없습니다',
      newProduct: '신규 상품 등록',
      editProduct: '상품 수정',
      productInfo: '상품 정보',
      stockInfo: '재고 정보',
      priceInfo: '가격 정보',
      imageUpload: '이미지 업로드',
      selectImage: '이미지 선택',
      description: '설명',
      lowStockThreshold: '재고 부족 임계값',
      cancel: '취소',
      save: '저장',
      processing: '처리중...',
      stockInbound: '재고 입고',
      selectProduct: '상품 선택',
      quantity: '수량',
      unitCost: '단가',
      totalCost: '총액',
      note: '메모',
      currentStock: '현재 재고',
      afterInbound: '입고 후 재고',
      stockAdjustment: '재고 조정',
      adjustmentReason: '조정 사유',
      adjustQuantity: '조정 수량',
      stockMovements: '재고 이동 내역',
      movementType: '유형',
      date: '날짜',
      inboundType: '입고',
      saleType: '판매',
      adjustmentType: '조정',
      balance: '잔량',
      operator: '담당자',
      viewDetails: '상세보기',
      close: '닫기',
    },
    'zh-CN': {
      title: '库存管理',
      addProduct: '产品注册',
      inbound: '入库',
      adjust: '库存调整',
      search: '搜索',
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
      cost: '成本(CNY)',
      price: '售价(KRW)',
      status: '状态',
      actions: '操作',
      active: '活动',
      inactive: '非活动',
      noProducts: '没有注册的产品',
      newProduct: '新产品注册',
      editProduct: '编辑产品',
      productInfo: '产品信息',
      stockInfo: '库存信息',
      priceInfo: '价格信息',
      imageUpload: '图片上传',
      selectImage: '选择图片',
      description: '描述',
      lowStockThreshold: '库存不足阈值',
      cancel: '取消',
      save: '保存',
      processing: '处理中...',
      stockInbound: '库存入库',
      selectProduct: '选择产品',
      quantity: '数量',
      unitCost: '单价',
      totalCost: '总额',
      note: '备注',
      currentStock: '当前库存',
      afterInbound: '入库后库存',
      stockAdjustment: '库存调整',
      adjustmentReason: '调整原因',
      adjustQuantity: '调整数量',
      stockMovements: '库存移动记录',
      movementType: '类型',
      date: '日期',
      inboundType: '入库',
      saleType: '销售',
      adjustmentType: '调整',
      balance: '余额',
      operator: '操作员',
      viewDetails: '查看详情',
      close: '关闭',
    }
  };

  const texts = t[locale as keyof typeof t] || t.ko;

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

  const loadProducts = async () => {
    try {
      const response = await api.products.list();
      
      // API 응답을 페이지 인터페이스에 맞게 변환
      const transformedProducts = response.products?.map((product: any) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        model: product.model || '',
        color: product.color || '',
        brand: product.brand || '',
        costCny: product.cost_cny,
        salePriceKrw: product.sale_price_krw || product.cost_cny * 165,
        onHand: product.on_hand,
        lowStockThreshold: product.low_stock_threshold,
        imageUrl: product.image_url || 'https://via.placeholder.com/150',
        description: product.description,
        active: product.active
      })) || [];
      
      setProducts(transformedProducts);
    } catch (error) {
      console.error('제품 로드 실패:', error);
      // 폴백으로 목 데이터 사용
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
    }
  };

  const loadMovements = async () => {
    try {
      const response = await api.inventory.movements();
      
      // API 응답을 페이지 인터페이스에 맞게 변환
      const transformedMovements = response.movements?.map((movement: any) => ({
        id: movement.id,
        productId: movement.product_id,
        productName: movement.product_name || '',
        type: movement.movement_type,
        quantity: movement.quantity,
        balanceBefore: movement.balance_before,
        balanceAfter: movement.balance_after,
        unitCost: movement.unit_cost,
        note: movement.note,
        date: movement.movement_date || movement.created_at,
        createdBy: movement.created_by || 'System'
      })) || [];
      
      setMovements(transformedMovements);
    } catch (error) {
      console.error('재고 이동 로드 실패:', error);
      // 폴백으로 목 데이터 사용
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
    }
  };

  const handleProductSave = async () => {
    try {
      const productData = {
        name: newProduct.name,
        category: newProduct.category,
        model: newProduct.model,
        color: newProduct.color,
        brand: newProduct.brand,
        cost_cny: newProduct.costCny,
        sale_price_krw: newProduct.salePriceKrw,
        low_stock_threshold: newProduct.lowStockThreshold,
        description: newProduct.description,
        on_hand: 0,
        active: true
      };

      await api.products.create(productData);
      
      // 제품 목록 새로고침
      await loadProducts();
      setShowProductModal(false);
      resetProductForm();
    } catch (error) {
      console.error('제품 생성 실패:', error);
      alert(locale === 'ko' ? '제품 생성에 실패했습니다.' : '产品创建失败');
    }
  };

  const handleInbound = async () => {
    const product = products.find(p => p.id === inboundForm.productId);
    if (!product) return;

    try {
      const inboundData = {
        product_id: inboundForm.productId,
        quantity: inboundForm.quantity,
        unit_cost: inboundForm.unitCost,
        note: inboundForm.note
      };

      await api.inventory.inbound(inboundData);
      
      // 제품 및 재고 이동 목록 새로고침
      await loadProducts();
      await loadMovements();
      setShowInboundModal(false);
      resetInboundForm();
    } catch (error) {
      console.error('재고 입고 실패:', error);
      alert(locale === 'ko' ? '재고 입고에 실패했습니다.' : '库存入库失败');
    }
  };

  const handleAdjustment = (productId: string, quantity: number, reason: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // 재고 업데이트
    setProducts(products.map(p => 
      p.id === productId 
        ? { ...p, onHand: Math.max(0, p.onHand + quantity) }
        : p
    ));

    // 이동 내역 추가
    const movement: StockMovement = {
      id: String(movements.length + 1),
      productId: product.id,
      productName: product.name,
      type: 'adjustment',
      quantity: quantity,
      balanceBefore: product.onHand,
      balanceAfter: Math.max(0, product.onHand + quantity),
      note: reason,
      date: new Date().toISOString().slice(0, 10),
      createdBy: localStorage.getItem('userName') || 'User',
    };

    setMovements([movement, ...movements]);
    setShowAdjustModal(false);
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
    if (product.onHand === 0) return { text: locale === 'ko' ? '품절' : '缺货', color: '#ef4444' };
    if (product.onHand <= product.lowStockThreshold) return { text: locale === 'ko' ? '부족' : '不足', color: '#f59e0b' };
    return { text: locale === 'ko' ? '정상' : '正常', color: '#10b981' };
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesLowStock = !showLowStock || product.onHand <= product.lowStockThreshold;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // 필터나 검색어 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, showLowStock]);

  const categories = Array.from(new Set(products.map(p => p.category)));

  // 모바일일 때는 InventoryPageMobile 컴포넌트 사용
  if (isMobile) {
    return <InventoryPageMobile params={{ locale }} />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* 헤더 */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{texts.title}</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowProductModal(true)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#10b981',
                color: 'white',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              + {texts.addProduct}
            </button>
            <button
              onClick={() => setShowInboundModal(true)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              + {texts.inbound}
            </button>
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder={texts.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem'
            }}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem'
            }}
          >
            <option value="all">{texts.all}</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: showLowStock ? '#f59e0b' : 'white',
              color: showLowStock ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            {texts.lowStock}
          </button>
        </div>

        {/* 재고 통계 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>총 상품 수</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{products.length}개</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>총 재고 수량</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{products.reduce((sum, p) => sum + p.onHand, 0)}개</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>재고 부족 상품</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
              {products.filter(p => p.onHand <= p.lowStockThreshold).length}개
            </p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>재고 가치</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              ₩{products.reduce((sum, p) => sum + p.onHand * p.salePriceKrw, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* 상품 목록 */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
            <button
              onClick={() => {
                const columns = [
                  { header: texts.sku, key: 'sku', width: 25 },
                  { header: texts.productName, key: 'name', width: 25 },
                  { header: texts.category, key: 'category', width: 15 },
                  { header: texts.model, key: 'model', width: 15 },
                  { header: texts.color, key: 'color', width: 15 },
                  { header: texts.brand, key: 'brand', width: 15 },
                  { header: texts.stock, key: 'onHand', width: 10 },
                  { header: texts.cost, key: 'costCny', width: 15 },
                  { header: texts.price, key: 'salePriceKrw', width: 20 },
                  { header: texts.status, key: 'active', width: 10 }
                ];
                
                exportToExcel({
                  data: filteredProducts.map(p => ({
                    ...p,
                    active: p.active ? texts.active : texts.inactive
                  })),
                  columns,
                  fileName: locale === 'ko' ? '재고현황' : 'inventory',
                  sheetName: locale === 'ko' ? '재고' : 'Inventory'
                });
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              📥 {locale === 'ko' ? '엑셀 저장' : locale === 'zh-CN' ? '导出Excel' : 'Export'}
            </button>
          </div>
          {filteredProducts.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              {texts.noProducts}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{texts.sku}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{texts.productName}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{texts.category}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>{texts.stock}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>{texts.cost}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>{texts.price}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>{texts.status}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <tr 
                      key={product.id} 
                      onClick={() => handleProductClick(product)}
                      style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '0.75rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>{product.sku}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '0.25rem' }}
                            />
                          )}
                          <div>
                            <p style={{ fontWeight: '600' }}>{product.name}</p>
                            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {product.model} / {product.color} / {product.brand}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{product.category}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div>
                          <p style={{ fontWeight: '600' }}>{product.onHand}</p>
                          <span style={{
                            fontSize: '0.75rem',
                            color: stockStatus.color,
                            fontWeight: '500'
                          }}>
                            {stockStatus.text}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>
                        ¥{product.costCny}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>
                        ₩{product.salePriceKrw.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: product.active ? '#d1fae5' : '#fee2e2',
                          color: product.active ? '#065f46' : '#dc2626',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem'
                        }}>
                          {product.active ? texts.active : texts.inactive}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          
          {/* 페이지네이션 */}
          {filteredProducts.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredProducts.length}
              itemsPerPage={itemsPerPage}
              className="mt-4 px-4 pb-4"
            />
          )}
        </div>

        {/* 재고 이동 내역 */}
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{texts.stockMovements}</h2>
            <button
              onClick={() => {
                const columns = [
                  { header: texts.date, key: 'date', width: 15 },
                  { header: texts.productName, key: 'productName', width: 25 },
                  { header: texts.movementType, key: 'type', width: 15 },
                  { header: texts.quantity, key: 'quantity', width: 10 },
                  { header: texts.balance, key: 'balanceAfter', width: 10 },
                  { header: texts.note, key: 'note', width: 30 },
                  { header: texts.operator, key: 'createdBy', width: 15 }
                ];
                
                exportToExcel({
                  data: movements.map(m => ({
                    ...m,
                    type: m.type === 'inbound' ? texts.inboundType : m.type === 'sale' ? texts.saleType : texts.adjustmentType
                  })),
                  columns,
                  fileName: locale === 'ko' ? '재고이동내역' : 'stock_movements',
                  sheetName: locale === 'ko' ? '재고이동' : 'Stock Movements'
                });
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              📥 {locale === 'ko' ? '엑셀 저장' : locale === 'zh-CN' ? '导出Excel' : 'Export'}
            </button>
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{texts.date}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{texts.productName}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>{texts.movementType}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>{texts.quantity}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>{texts.balance}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{texts.note}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{texts.operator}</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 10).map((movement) => (
                  <tr key={movement.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{movement.date}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{movement.productName}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: movement.type === 'inbound' ? '#dbeafe' : movement.type === 'sale' ? '#fef3c7' : '#fee2e2',
                        color: movement.type === 'inbound' ? '#1e40af' : movement.type === 'sale' ? '#92400e' : '#dc2626',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem'
                      }}>
                        {movement.type === 'inbound' ? texts.inboundType : movement.type === 'sale' ? texts.saleType : texts.adjustmentType}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '0.75rem', 
                      textAlign: 'right', 
                      fontSize: '0.875rem',
                      color: movement.quantity > 0 ? '#10b981' : '#ef4444',
                      fontWeight: '600'
                    }}>
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>
                      {movement.balanceAfter}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {movement.note || '-'}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{movement.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 상품 등록/수정 모달 */}
      {showProductModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {texts.newProduct}
            </h2>

            {/* 상품 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>{texts.productInfo}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.productName} *</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.category} *</label>
                  <input
                    type="text"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.model} *</label>
                  <input
                    type="text"
                    value={newProduct.model}
                    onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.color}</label>
                  <input
                    type="text"
                    value={newProduct.color}
                    onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.brand} *</label>
                  <input
                    type="text"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 가격 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>{texts.priceInfo}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.cost} *</label>
                  <input
                    type="number"
                    value={newProduct.costCny}
                    onChange={(e) => setNewProduct({ ...newProduct, costCny: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.price} *</label>
                  <input
                    type="number"
                    value={newProduct.salePriceKrw}
                    onChange={(e) => setNewProduct({ ...newProduct, salePriceKrw: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.lowStockThreshold}</label>
                  <input
                    type="number"
                    value={newProduct.lowStockThreshold}
                    onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: parseInt(e.target.value) || 5 })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
              </div>
            </div>

            {/* 이미지 업로드 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.imageUpload}</label>
              <input
                type="text"
                placeholder="https://example.com/image.jpg"
                value={newProduct.imageUrl}
                onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </div>

            {/* 설명 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.description}</label>
              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', minHeight: '80px' }}
              />
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  resetProductForm();
                }}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {texts.cancel}
              </button>
              <button
                onClick={handleProductSave}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {texts.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 재고 입고 모달 */}
      {showInboundModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '500px',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {texts.stockInbound}
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.selectProduct} *</label>
              <select
                value={inboundForm.productId}
                onChange={(e) => setInboundForm({ ...inboundForm, productId: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                required
              >
                <option value="">-- {texts.selectProduct} --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku}) - {texts.currentStock}: {product.onHand}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.quantity} *</label>
                <input
                  type="number"
                  min="1"
                  value={inboundForm.quantity}
                  onChange={(e) => setInboundForm({ ...inboundForm, quantity: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.unitCost} (CNY)</label>
                <input
                  type="number"
                  value={inboundForm.unitCost}
                  onChange={(e) => setInboundForm({ ...inboundForm, unitCost: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
              </div>
            </div>

            {inboundForm.productId && inboundForm.quantity > 0 && (
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.375rem' }}>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  {texts.currentStock}: <strong>{products.find(p => p.id === inboundForm.productId)?.onHand || 0}</strong>
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  {texts.afterInbound}: <strong>{(products.find(p => p.id === inboundForm.productId)?.onHand || 0) + inboundForm.quantity}</strong>
                </p>
                {inboundForm.unitCost > 0 && (
                  <p style={{ fontSize: '0.875rem' }}>
                    {texts.totalCost}: <strong>¥{(inboundForm.quantity * inboundForm.unitCost).toFixed(2)}</strong>
                  </p>
                )}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.note}</label>
              <textarea
                value={inboundForm.note}
                onChange={(e) => setInboundForm({ ...inboundForm, note: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', minHeight: '60px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowInboundModal(false);
                  resetInboundForm();
                }}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {texts.cancel}
              </button>
              <button
                onClick={handleInbound}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {texts.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상품 등록 모달 */}
      {showProductModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {texts.newProduct}
            </h2>

            {/* 상품 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>{texts.productInfo}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.productName} *</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.category} *</label>
                  <input
                    type="text"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.model} *</label>
                  <input
                    type="text"
                    value={newProduct.model}
                    onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.color}</label>
                  <input
                    type="text"
                    value={newProduct.color}
                    onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.brand} *</label>
                  <input
                    type="text"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 가격 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>{texts.priceInfo}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.cost} *</label>
                  <input
                    type="number"
                    value={newProduct.costCny}
                    onChange={(e) => setNewProduct({ ...newProduct, costCny: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.price} *</label>
                  <input
                    type="number"
                    value={newProduct.salePriceKrw}
                    onChange={(e) => setNewProduct({ ...newProduct, salePriceKrw: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.lowStockThreshold}</label>
                  <input
                    type="number"
                    value={newProduct.lowStockThreshold}
                    onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: parseInt(e.target.value) || 5 })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
              </div>
            </div>

            {/* 이미지 업로드 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <ImageUpload
                label={texts.imageUpload}
                value={newProduct.imageUrl}
                onChange={(url) => setNewProduct({ ...newProduct, imageUrl: url })}
                locale={locale}
              />
            </div>

            {/* 설명 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.description}</label>
              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', minHeight: '80px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowProductModal(false);
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
                }}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {texts.cancel}
              </button>
              <button
                onClick={() => {
                  // 상품 등록 로직
                  const newId = Date.now().toString();
                  const sku = `${newProduct.category.toUpperCase().slice(0, 3)}-${newProduct.model.toUpperCase().replace(/\s+/g, '')}-${newProduct.color?.toUpperCase().slice(0, 3) || 'NA'}-${newProduct.brand.toUpperCase().slice(0, 3)}-${newId.slice(-5)}`;
                  
                  const product: Product = {
                    id: newId,
                    sku,
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
                  
                  setProducts([...products, product]);
                  setShowProductModal(false);
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
                }}
                disabled={!newProduct.name || !newProduct.category || !newProduct.model || !newProduct.brand}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: newProduct.name && newProduct.category && newProduct.model && newProduct.brand ? '#2563eb' : '#9ca3af',
                  color: 'white',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: newProduct.name && newProduct.category && newProduct.model && newProduct.brand ? 'pointer' : 'not-allowed'
                }}
              >
                {texts.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상품 상세 모달 */}
      {showDetailModal && selectedProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {texts.viewDetails} - {selectedProduct.name}
            </h2>

            {/* 상품 이미지 */}
            {selectedProduct.imageUrl && (
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover', borderRadius: '0.5rem' }}
                />
              </div>
            )}

            {/* 상품 정보 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>SKU</p>
                  <p style={{ fontWeight: '600', fontFamily: 'monospace', fontSize: '0.875rem' }}>{selectedProduct.sku}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.category}</p>
                  <p style={{ fontWeight: '600' }}>{selectedProduct.category}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.model}</p>
                  <p style={{ fontWeight: '600' }}>{selectedProduct.model}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.color}</p>
                  <p style={{ fontWeight: '600' }}>{selectedProduct.color || '-'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.brand}</p>
                  <p style={{ fontWeight: '600' }}>{selectedProduct.brand}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.stock}</p>
                  <p style={{ fontWeight: '600', fontSize: '1.25rem', color: getStockStatus(selectedProduct).color }}>
                    {selectedProduct.onHand} ({getStockStatus(selectedProduct).text})
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.cost}</p>
                  <p style={{ fontWeight: '600' }}>¥{selectedProduct.costCny}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.price}</p>
                  <p style={{ fontWeight: '600', fontSize: '1.25rem', color: '#2563eb' }}>
                    ₩{selectedProduct.salePriceKrw.toLocaleString()}
                  </p>
                </div>
              </div>
              {selectedProduct.description && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>{texts.description}</p>
                  <p style={{ fontSize: '0.875rem' }}>{selectedProduct.description}</p>
                </div>
              )}
            </div>

            {/* 닫기 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {texts.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}