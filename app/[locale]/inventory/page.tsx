/**
 * 재고 관리 페이지
 * PRD v2.0: 재고 입고, 상품 등록, 이미지 관리
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getLowStockThreshold, clearSystemSettingsCache } from '@/lib/utils/system-settings';
import api from '@/lib/api/client';
import { exportToExcel } from '@/lib/utils/excel';
import ImageUpload from '@/components/common/ImageUpload';
import Pagination from '@/components/common/Pagination';

interface InventoryPageProps {
  params: { locale: string };
}

interface Product {
  id: string;
  sku: string;
  name_ko: string;
  name_zh: string;
  category: string;
  model: string;
  color_ko: string;
  color_zh: string;
  brand_ko: string;
  brand_zh: string;
  costCny: number;
  salePriceKrw: number;
  onHand: number;
  lowStockThreshold: number;
  imageUrl?: string;
  description?: string;
  is_active: boolean;
}

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productModel?: string;
  productColor?: string;
  productCategory?: string;
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
  const [showStockEditModal, setShowStockEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [categories, setCategories] = useState<{id: string, name_ko: string, name_zh: string}[]>([]);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // 페이지당 20개 항목 표시

  // 상품 상세 클릭 핸들러
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };


  // 새 상품 폼 상태
  const [newProduct, setNewProduct] = useState({
    name_ko: '',
    name_zh: '',
    category: '',
    model: '',
    color_ko: '',
    color_zh: '',
    brand_ko: '',
    brand_zh: '',
    costCny: 0,
    salePriceKrw: 0,
    onHand: 1,
    lowStockThreshold: 5, // 초기값, useEffect에서 DB값으로 업데이트
    description: '',
    imageUrl: '',
  });
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState<number>(5);

  // 입고 폼 상태
  const [inboundForm, setInboundForm] = useState({
    productId: '',
    quantity: 0,
    unitCost: 0,
    note: '',
  });

  // 재고수정 폼 상태
  const [stockEditForm, setStockEditForm] = useState({
    productId: '',
    quantity: 0,
    unitCost: 0,
    reason: 'loss', // 'loss' | 'recovery'
    note: '',
  });

  // 다국어 텍스트
  const t = {
    ko: {
      title: '재고 관리',
      addProduct: '상품 등록',
      inbound: '재고 입고',
      adjust: '재고 조정',
      stockEdit: '재고 수정',
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
      totalProducts: '총 상품',
      totalStock: '총 재고',
      lowStockItems: '재고 부족',
      stockValue: '재고 가치',
      totalProductsCount: '총 상품 수',
      totalStockQuantity: '총 재고 수량',
      lowStockProducts: '재고 부족 상품',
      stockValueTotal: '재고 가치',
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
      initialStock: '초기 재고 수량',
      stockEditTitle: '재고 수정',
      reason: '사유',
      loss: '분실',
      recovery: '회수',
      adjustNote: '수정 사유를 입력하세요',
    },
    'zh-CN': {
      title: '库存管理',
      addProduct: '产品注册',
      inbound: '入库',
      adjust: '库存调整',
      stockEdit: '库存修改',
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
      totalProducts: '总产品',
      totalStock: '总库存',
      lowStockItems: '库存不足',
      stockValue: '库存价值',
      totalProductsCount: '总产品数',
      totalStockQuantity: '总库存数量',
      lowStockProducts: '库存不足产品',
      stockValueTotal: '库存价值',
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
      initialStock: '初始库存数量',
      stockEditTitle: '库存修改',
      reason: '原因',
      loss: '丢失',
      recovery: '找回',
      adjustNote: '请输入修改原因',
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
    if (userRole === 'ship_manager') {
      router.push(`/${locale}/shipments`);
      return;
    }
  }, [locale, router]);

  // 데이터 로드
  useEffect(() => {
    loadProducts();
    loadMovements();
    loadCategories();
    loadSystemSettings();
  }, []);

  // 시스템 설정 로드
  const loadSystemSettings = async () => {
    const threshold = await getLowStockThreshold();
    setDefaultLowStockThreshold(threshold);
    setNewProduct(prev => ({ ...prev, lowStockThreshold: threshold }));
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      // Supabase 직접 호출
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            name_ko,
            name_zh
          )
        `)
        .eq('is_active', true);
      
      if (error) {
        console.error('제품 로드 에러:', error);
        setProducts([]);
        return;
    }
    
    // 데이터 변환
    const transformedProducts = products?.map((product: any) => ({
      id: product.id,
      sku: product.sku,
      name_ko: product.name_ko,
      name_zh: product.name_zh,
      category: product.categories?.name_ko || product.category || '',
      model: product.model || '',
      color_ko: product.color_ko || '',
      color_zh: product.color_zh || '',
      brand_ko: product.brand_ko || '',
      brand_zh: product.brand_zh || '',
      costCny: product.cost_cny || 0,
      salePriceKrw: product.price_krw || 0,
      onHand: product.on_hand || 0,
      lowStockThreshold: product.low_stock_threshold || 5,
      imageUrl: product.image_url || '',
      description: product.description,
      is_active: product.is_active
    })) || [];
    
    setProducts(transformedProducts);
    } catch (error) {
      console.error('제품 로드 실패:', error);
      setProducts([]);
    }
  };

  const loadMovements = async () => {
    try {
      // Supabase 직접 호출
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data: movements, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          products (
            name_ko,
            name_zh,
            sku,
            model,
            color_ko,
            color_zh,
            category_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('재고 이동 로드 에러:', error);
        setMovements([]);
        return;
      }
      
      // 데이터 변환
      const transformedMovements = movements?.map((movement: any) => ({
        id: movement.id,
        productId: movement.product_id,
        productName: locale === 'ko' ? movement.products?.name_ko : movement.products?.name_zh || '',
        productModel: movement.products?.model || '',
        productColor: locale === 'ko' ? movement.products?.color_ko : movement.products?.color_zh || '',
        productCategory: movement.products?.category_id || '',
        type: movement.movement_type,
        quantity: movement.quantity,
        balanceBefore: movement.previous_quantity || 0,
        balanceAfter: movement.new_quantity || 0,
        unitCost: movement.cost_per_unit_cny,
        note: movement.notes,
        date: movement.created_at,
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
        createdBy: 'admin',
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
        createdBy: 'admin',
      },
    ];
    setMovements(mockMovements);
    }
  };

  const handleProductSave = async () => {
    console.log('🔥🔥🔥 handleProductSave 함수 호출됨! 🔥🔥🔥');
    console.log('📝 현재 newProduct 상태:', newProduct);
    
    // 페이지 타이틀 임시 변경으로 함수 호출 확인
    document.title = '함수 호출됨! - ' + new Date().toLocaleTimeString();
    
    // 디버깅을 위해 window 객체에 함수 노출
    if (typeof window !== 'undefined') {
      (window as any).testProductSave = handleProductSave;
      (window as any).currentProductData = newProduct;
    }
    
    // 필수 필드 체크 (brand 제외)
    const requiredFields = ['name_ko', 'name_zh', 'category', 'model'];
    const missingFields = requiredFields.filter(field => !newProduct[field]);
    console.log('❗ 누락된 필수 필드:', missingFields);
    
    if (missingFields.length > 0) {
      alert(`필수 필드가 누락되었습니다: ${missingFields.join(', ')}`);
      return;
    }
    
    try {
      const productData = {
        name_ko: newProduct.name_ko,
        name_zh: newProduct.name_zh,
        category_id: newProduct.category,  // category ID
        model: newProduct.model,
        color_ko: newProduct.color_ko,
        color_zh: newProduct.color_zh,
        brand_ko: newProduct.brand_ko,
        brand_zh: newProduct.brand_zh,
        cost_cny: newProduct.costCny,
        price_krw: newProduct.salePriceKrw,
        low_stock_threshold: newProduct.lowStockThreshold,
        description: newProduct.description,
        on_hand: newProduct.onHand || 0,  // 초기 재고 설정
        is_active: true
      };

      console.log('📤 API로 전송할 데이터:', productData);
      console.log('🚀 api.products.create 호출 시작...');
      
      const result = await api.products.create(productData);
      
      console.log('✅ API 호출 성공:', result);
      
      // 제품 목록 및 재고 이동 내역 새로고침
      await loadProducts();
      await loadMovements();  // 재고 이동 내역도 새로고침
      setShowProductModal(false);
      resetProductForm();
      
      console.log('🎉 상품 등록 완료!');
    } catch (error) {
      console.error('❌ 제품 생성 실패:', error);
      alert(locale === 'ko' ? '제품 생성에 실패했습니다.' : '产品创建失败');
    }
  };

  const handleInbound = async () => {
    console.log('🔥 handleInbound 함수 시작!');
    console.log('📋 inboundForm:', inboundForm);
    console.log('📋 전체 products 목록:', products);
    console.log('📋 products 개수:', products.length);
    console.log('📋 선택된 productId:', inboundForm.productId);
    console.log('📋 productId 타입:', typeof inboundForm.productId);
    
    const product = products.find(p => {
      const match = String(p.id) === String(inboundForm.productId);
      console.log(`🔍 비교: p.id(${p.id}, ${typeof p.id}) vs productId(${inboundForm.productId}, ${typeof inboundForm.productId}) = ${match}`);
      return match;
    });
    
    console.log('🎯 찾은 product:', product);
    
    if (!product) {
      console.error('❌ 상품을 찾을 수 없습니다:', inboundForm.productId);
      console.error('❌ 사용 가능한 상품 ID들:', products.map(p => p.id));
      alert('상품을 선택해주세요.');
      return;
    }

    if (!inboundForm.quantity || inboundForm.quantity <= 0) {
      console.error('❌ 수량이 유효하지 않습니다:', inboundForm.quantity);
      alert('수량을 입력해주세요.');
      return;
    }

    try {
      const inboundData = {
        product_id: inboundForm.productId,
        quantity: inboundForm.quantity,
        unit_cost: inboundForm.unitCost,
        note: inboundForm.note
      };

      console.log('📤 API 호출 데이터:', inboundData);
      const result = await api.inventory.inbound(inboundData);
      console.log('✅ API 호출 성공:', result);
      
      // 제품 및 재고 이동 목록 새로고침
      await loadProducts();
      await loadMovements();
      setShowInboundModal(false);
      resetInboundForm();
      
      console.log('🎉 재고 입고 완료!');
    } catch (error) {
      console.error('❌ 재고 입고 실패:', error);
      alert(locale === 'ko' ? '재고 입고에 실패했습니다.' : '库存入库失败');
    }
  };

  const handleStockEdit = async () => {
    const product = products.find(p => p.id === stockEditForm.productId);
    if (!product) return;

    try {
      const adjustmentData = {
        product_id: stockEditForm.productId,
        quantity: stockEditForm.quantity, // 마이너스 값도 가능
        type: 'adjustment',
        reason: stockEditForm.reason,
        note: stockEditForm.note || `${stockEditForm.reason === 'loss' ? texts.loss : texts.recovery}`,
        // 출납장부에는 기록하지 않음
        skip_cashbook: true
      };

      // API 호출
      const response = await fetch('/api/inventory/adjustment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adjustmentData)
      });

      if (!response.ok) {
        throw new Error('Failed to adjust stock');
      }
      
      // 제품 및 재고 이동 목록 새로고침
      await loadProducts();
      await loadMovements();
      setShowStockEditModal(false);
      // 폼 초기화
      setStockEditForm({
        productId: '',
        quantity: 0,
        unitCost: 0,
        reason: 'loss',
        note: '',
      });
      
      alert(locale === 'ko' ? '재고가 수정되었습니다.' : '库存已修改');
    } catch (error) {
      console.error('재고 수정 실패:', error);
      alert(locale === 'ko' ? '재고 수정에 실패했습니다.' : '库存修改失败');
    }
  };

  const handleAdjustment = async (productId: string, quantity: number, reason: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    try {
      // Supabase에 재고 조정 저장
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // 재고 조정 트랜잭션
      const newQuantity = Math.max(0, product.onHand + quantity);
      
      // 1. 재고 업데이트 (products 테이블에 직접 저장)
      const { error: inventoryError } = await supabase
        .from('products')
        .update({ 
          on_hand: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (inventoryError) {
        console.error('재고 업데이트 실패:', inventoryError);
        alert(locale === 'ko' ? '재고 조정에 실패했습니다.' : '库存调整失败');
        return;
      }

      // 2. 재고 이동 내역 기록
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: productId,
          movement_type: 'adjustment',
          quantity: quantity,
          previous_quantity: product.onHand,
          new_quantity: newQuantity,
          note: reason,
          movement_date: new Date().toISOString(),
          created_by: '00000000-0000-0000-0000-000000000000' // 임시 UUID, 실제로는 사용자 ID 필요
        });

      if (movementError) {
        console.error('재고 이동 내역 기록 실패:', movementError);
      }

      // UI 업데이트
      setProducts(products.map(p => 
        p.id === productId 
          ? { ...p, onHand: newQuantity }
          : p
      ));

      // 이동 내역 추가
      const movement: StockMovement = {
        id: String(movements.length + 1),
        productId: product.id,
        productName: locale === 'ko' ? product.name_ko : product.name_zh,
        type: 'adjustment',
        quantity: quantity,
        balanceBefore: product.onHand,
        balanceAfter: newQuantity,
        note: reason,
        date: new Date().toISOString().slice(0, 10),
        createdBy: localStorage.getItem('userName') || 'User',
      };

      setMovements([movement, ...movements]);
      setShowAdjustModal(false);
      
      alert(locale === 'ko' ? '재고가 조정되었습니다.' : '库存已调整');
    } catch (error) {
      console.error('재고 조정 중 오류:', error);
      alert(locale === 'ko' ? '재고 조정 중 오류가 발생했습니다.' : '库存调整时发生错误');
    }
  };

  const resetProductForm = () => {
    setNewProduct({
      name_ko: '',
      name_zh: '',
      category: '',
      model: '',
      color_ko: '',
      color_zh: '',
      brand_ko: '',
      brand_zh: '',
      costCny: 0,
      salePriceKrw: 0,
      onHand: 0,
      lowStockThreshold: defaultLowStockThreshold,
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
    // 품절: 재고가 0일 때만
    if (product.onHand === 0) return { text: locale === 'ko' ? '품절' : '缺货', color: '#ef4444' };
    // 재고 부족: 재고가 있지만 임계값 이하일 때 (0 < onHand <= threshold)
    if (product.onHand > 0 && product.onHand <= product.lowStockThreshold) return { text: locale === 'ko' ? '부족' : '不足', color: '#f59e0b' };
    // 정상: 재고가 임계값보다 많을 때
    return { text: locale === 'ko' ? '정상' : '正常', color: '#10b981' };
  };

  const filteredProducts = products.filter(product => {
    const name = locale === 'ko' ? product.name_ko : product.name_zh;
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const productCategories = Array.from(new Set(products.map(p => p.category)));


  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-lg md:text-2xl font-bold">{texts.title}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInboundModal(true)}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-md text-sm md:text-base font-medium hover:bg-blue-700"
            >
              + {texts.inbound}
            </button>
            <button
              onClick={() => setShowStockEditModal(true)}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-orange-500 text-white rounded-md text-sm md:text-base font-medium hover:bg-orange-600"
            >
              + {texts.stockEdit}
            </button>
          </div>
        </div>
      </div>


      {/* 필터 및 검색 */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder={texts.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm md:text-base"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm md:text-base"
          >
            <option value="all">{texts.all}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name_ko}>
                {locale === 'ko' ? cat.name_ko : cat.name_zh}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className={`px-3 py-2 rounded-md text-sm md:text-base font-medium ${
              showLowStock 
                ? 'bg-yellow-500 text-white' 
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            {texts.lowStock}
          </button>
        </div>

        {/* 재고 통계 - 모바일에서는 2x2, 데스크톱에서는 4열 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white p-3 md:p-4 rounded-lg shadow">
            <p className="text-xs md:text-sm text-gray-500">{texts.totalProductsCount}</p>
            <p className="text-lg md:text-2xl font-bold mt-1">{products.length}{locale === 'ko' ? '개' : '单'}</p>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-lg shadow">
            <p className="text-xs md:text-sm text-gray-500">{texts.totalStockQuantity}</p>
            <p className="text-lg md:text-2xl font-bold mt-1">{products.reduce((sum, p) => sum + p.onHand, 0)}{locale === 'ko' ? '개' : '单'}</p>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-lg shadow">
            <p className="text-xs md:text-sm text-gray-500">{texts.lowStockProducts}</p>
            <p className="text-lg md:text-2xl font-bold text-amber-600 mt-1">
              {products.filter(p => p.onHand <= p.lowStockThreshold).length}{locale === 'ko' ? '개' : '单'}
            </p>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-lg shadow">
            <p className="text-xs md:text-sm text-gray-500">{texts.stockValueTotal}</p>
            <p className="text-lg md:text-2xl font-bold mt-1">
              ₩{products.reduce((sum, p) => sum + p.onHand * p.salePriceKrw, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* 재고 내역 테이블 */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              {locale === 'ko' ? '재고 내역' : '库存明细'}
            </h2>
          </div>
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
            <>
              {/* 모바일 카드 뷰 */}
              <div className="md:hidden">
                {paginatedProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <div 
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      style={{
                        padding: '1rem',
                        borderBottom: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{product.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {product.sku}
                          </div>
                          <div className="text-xs text-gray-500">
                            {product.category} | {locale === 'ko' ? product.brand_ko : product.brand_zh}
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">재고: {product.onHand}</span>
                              <span className="text-xs px-2 py-0.5 rounded" 
                                style={{ backgroundColor: stockStatus.bgColor, color: stockStatus.color }}>
                                {stockStatus.text}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-blue-600">
                              ₩{product.salePriceKrw.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 데스크톱 테이블 뷰 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.date}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.productName}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.model}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.color}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.category}</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.stock}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.cost}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.price}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedProducts.map((product) => {
                      const stockStatus = getStockStatus(product);
                      return (
                        <tr 
                          key={product.id} 
                          onClick={() => handleProductClick(product)}
                          style={{
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {new Date().toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\. /g, '').replace(/\./g, '')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {product.imageUrl && (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              )}
                              <p className="text-sm font-medium">{product.name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{product.model}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{product.color || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{product.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div>
                              <p className="text-sm font-medium">{product.onHand}</p>
                              <span className="text-xs" style={{ color: stockStatus.color }}>
                                {stockStatus.text}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            ¥{product.costCny}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            ₩{product.salePriceKrw.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          
          {/* 페이지네이션 */}
          {filteredProducts.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredProducts.length}
              itemsPerPage={itemsPerPage}
              locale={locale}
              className="mt-4 px-4 pb-4"
            />
          )}
          </div>
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
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>
                    {locale === 'ko' ? '날짜' : '日期'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>
                    {texts.productName}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>
                    {texts.model}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>
                    {texts.color}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>
                    {texts.category}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>
                    {locale === 'ko' ? '수량' : '数量'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>
                    {locale === 'ko' ? '잔량' : '余额'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>
                    {locale === 'ko' ? '담당자' : '操作员'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 10).map((movement) => (
                  <tr key={movement.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      {new Date(movement.date).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace(/\./g, '')}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{movement.productName}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{movement.productModel || '-'}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{movement.productColor || '-'}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{movement.productCategory || '-'}</td>
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
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{movement.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>


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
                onChange={(e) => {
                  console.log('🔄 상품 선택 변경:', e.target.value);
                  console.log('🔄 변경 전 productId:', inboundForm.productId);
                  setInboundForm({ ...inboundForm, productId: e.target.value });
                  console.log('🔄 변경 후 productId:', e.target.value);
                }}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                required
              >
                <option value="">-- {texts.selectProduct} --</option>
                {products
                  .sort((a, b) => (a.model || '').localeCompare(b.model || ''))
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.model} | {product.name} | {product.category} | {texts.stock}: {product.onHand}
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
                  onFocus={(e) => e.target.select()}
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
                  onFocus={(e) => e.target.select()}
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
                onClick={(e) => {
                  console.log('🔥 재고 입고 저장 버튼 클릭!', e);
                  e.preventDefault();
                  handleInbound();
                }}
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

      {/* 재고 수정 모달 */}
      {showStockEditModal && (
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
              {texts.stockEditTitle}
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.selectProduct} *</label>
              <select
                value={stockEditForm.productId}
                onChange={(e) => {
                  const selectedProduct = products.find(p => p.id === e.target.value);
                  setStockEditForm({ 
                    ...stockEditForm, 
                    productId: e.target.value,
                    unitCost: selectedProduct?.costCny || 0
                  });
                }}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                required
              >
                <option value="">-- {texts.selectProduct} --</option>
                {products
                  .sort((a, b) => (a.model || '').localeCompare(b.model || ''))
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.model} | {product.name} | {product.category} | {texts.stock}: {product.onHand}
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.quantity} *</label>
                <input
                  type="number"
                  value={stockEditForm.quantity}
                  onChange={(e) => setStockEditForm({ ...stockEditForm, quantity: parseInt(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  placeholder={locale === 'ko' ? '+ 증가, - 감소' : '+ 增加, - 减少'}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.unitCost} (CNY)</label>
                <input
                  type="number"
                  value={stockEditForm.unitCost}
                  readOnly
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: '#f3f4f6' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.reason} *</label>
              <select
                value={stockEditForm.reason}
                onChange={(e) => setStockEditForm({ ...stockEditForm, reason: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                required
              >
                <option value="loss">{texts.loss}</option>
                <option value="recovery">{texts.recovery}</option>
              </select>
            </div>

            {stockEditForm.productId && stockEditForm.quantity !== 0 && (
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.375rem' }}>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  {texts.currentStock}: <strong>{products.find(p => p.id === stockEditForm.productId)?.onHand || 0}</strong>
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: stockEditForm.quantity > 0 ? '#10b981' : '#ef4444' }}>
                  {locale === 'ko' ? '변경 후 재고' : '修改后库存'}: <strong>{(products.find(p => p.id === stockEditForm.productId)?.onHand || 0) + stockEditForm.quantity}</strong>
                </p>
                <p style={{ fontSize: '0.875rem' }}>
                  {locale === 'ko' ? '조정 사유' : '调整原因'}: <strong>{stockEditForm.reason === 'loss' ? texts.loss : texts.recovery}</strong>
                </p>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.note}</label>
              <textarea
                value={stockEditForm.note}
                onChange={(e) => setStockEditForm({ ...stockEditForm, note: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', minHeight: '60px' }}
                placeholder={texts.adjustNote}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowStockEditModal(false);
                  setStockEditForm({
                    productId: '',
                    quantity: 0,
                    unitCost: 0,
                    reason: 'loss',
                    note: '',
                  });
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {texts.cancel}
              </button>
              <button
                onClick={handleStockEdit}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f97316',
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
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.productName} (한국어) *</label>
                  <input
                    type="text"
                    value={newProduct.name_ko}
                    onChange={(e) => setNewProduct({ ...newProduct, name_ko: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.productName} (중국어) *</label>
                  <input
                    type="text"
                    value={newProduct.name_zh}
                    onChange={(e) => setNewProduct({ ...newProduct, name_zh: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.category} *</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  >
                    <option value="">{locale === 'ko' ? '선택하세요' : '请选择'}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={locale === 'ko' ? cat.name_ko : cat.name_zh}>
                        {locale === 'ko' ? cat.name_ko : cat.name_zh}
                      </option>
                    ))}
                  </select>
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
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.color} (한국어)</label>
                  <input
                    type="text"
                    value={newProduct.color_ko}
                    onChange={(e) => setNewProduct({ ...newProduct, color_ko: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.color} (중국어)</label>
                  <input
                    type="text"
                    value={newProduct.color_zh}
                    onChange={(e) => setNewProduct({ ...newProduct, color_zh: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.brand} (한국어)</label>
                  <input
                    type="text"
                    value={newProduct.brand_ko}
                    onChange={(e) => setNewProduct({ ...newProduct, brand_ko: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.brand} (중국어)</label>
                  <input
                    type="text"
                    value={newProduct.brand_zh}
                    onChange={(e) => setNewProduct({ ...newProduct, brand_zh: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
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
                    onFocus={(e) => e.target.value === '0' && e.target.select()}
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
                    onFocus={(e) => e.target.value === '0' && e.target.select()}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.lowStockThreshold}</label>
                  <input
                    type="number"
                    value={newProduct.lowStockThreshold}
                    onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: parseInt(e.target.value) || defaultLowStockThreshold })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{texts.initialStock} *</label>
                  <input
                    type="number"
                    value={newProduct.onHand}
                    onChange={(e) => setNewProduct({ ...newProduct, onHand: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    placeholder="1"
                    min="0"
                    required
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
                    name_ko: '',
                    name_zh: '',
                    category: '',
                    model: '',
                    color_ko: '',
                    color_zh: '',
                    brand_ko: '',
                    brand_zh: '',
                    costCny: 0,
                    salePriceKrw: 0,
                    onHand: 0,
                    lowStockThreshold: defaultLowStockThreshold,
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
                onClick={(e) => {
                  console.log('🔥 버튼 클릭 이벤트 발생!', e);
                  document.title = '버튼 클릭됨! - ' + new Date().toLocaleTimeString();
                  handleProductSave();
                }}
                onMouseDown={() => console.log('🔥 버튼 마우스 다운!')}
                style={{
                  padding: '12px 24px !important',
                  backgroundColor: '#2563eb !important',
                  color: 'white !important',
                  borderRadius: '0.375rem',
                  border: 'none !important',
                  cursor: 'pointer !important',
                  minWidth: '80px',
                  minHeight: '44px',
                  fontSize: '14px',
                  fontWeight: '500',
                  boxSizing: 'border-box',
                  display: 'inline-block',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  userSelect: 'none',
                  outline: 'none'
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
              {texts.viewDetails} - {locale === 'ko' ? selectedProduct.name_ko : selectedProduct.name_zh}
            </h2>

            {/* 상품 이미지 */}
            {selectedProduct.imageUrl && (
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <img
                  src={selectedProduct.imageUrl}
                  alt={locale === 'ko' ? selectedProduct.name_ko : selectedProduct.name_zh}
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
                  <p style={{ fontWeight: '600' }}>{locale === 'ko' ? selectedProduct.color_ko : selectedProduct.color_zh || '-'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{texts.brand}</p>
                  <p style={{ fontWeight: '600' }}>{locale === 'ko' ? selectedProduct.brand_ko : selectedProduct.brand_zh}</p>
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