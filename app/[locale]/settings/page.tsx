'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearSystemSettingsCache } from '@/lib/utils/system-settings';

interface Category {
  id: string;
  code: string;
  name_ko: string;
  name_zh: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

interface CashbookType {
  id: string;
  code: string;
  name_ko: string;
  name_zh: string;
  type: 'income' | 'expense' | 'adjustment';
  color: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  name_ko: string;
  name_zh: string;
  category: string;
  category_id?: string;
  model?: string;
  color?: string;
  color_ko?: string;
  color_zh?: string;
  brand?: string;
  brand_ko?: string;
  brand_zh?: string;
  cost_cny: number;
  price_krw: number;
  low_stock_threshold?: number;
  on_hand?: number;
  image_url?: string;
  description?: string;
  is_active: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'order_manager' | 'ship_manager';
  language: 'ko' | 'zh' | 'en';
  is_active: boolean;
}

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  value_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  name_ko: string;
  name_zh: string;
  description_ko?: string;
  description_zh?: string;
  min_value?: number;
  max_value?: number;
  default_value?: string;
  is_required: boolean;
  is_editable: boolean;
  display_order: number;
}

interface SettingsPageProps {
  params: { locale: string };
}

export default function SettingsPage({ params: { locale } }: SettingsPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'products' | 'users' | 'categories' | 'cashbook_types' | 'system'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cashbookTypes, setCashbookTypes] = useState<CashbookType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editCashbookType, setEditCashbookType] = useState<CashbookType | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [editedSettings, setEditedSettings] = useState<{[key: string]: string}>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCashbookModal, setShowCashbookModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);

  // 번역
  const t = locale === 'ko' ? {
    title: '설정',
    products: '상품 관리',
    users: '사용자 관리',
    categories: '카테고리 관리',
    cashbookTypes: '출납유형 관리',
    type: '유형',
    income: '수입',
    expense: '지출',
    adjustment: '조정',
    addCashbookType: '출납유형 추가',
    typeColor: '색상',
    name_ko: '한국어 이름',
    name_zh: '중국어 이름',
    code: '코드',
    description: '설명',
    displayOrder: '표시 순서',
    isSystem: '시스템',
    actions: '작업',
    addCategory: '카테고리 추가',
    addUser: '사용자 추가',
    addProduct: '상품 추가',
    productName: '상품명',
    productNameKo: '상품명 (한국어)',
    productNameZh: '상품명 (중국어)',
    sku: 'SKU',
    model: '모델',
    color: '색상',
    brand: '브랜드',
    costCny: '원가 (CNY)',
    priceKrw: '판매가 (KRW)',
    onHand: '재고수량',
    lowStockThreshold: '재고부족 임계값',
    imageUrl: '이미지 URL',
    save: '저장',
    cancel: '취소',
    edit: '수정',
    delete: '삭제',
    confirmDelete: '정말 삭제하시겠습니까?',
    systemCategoryWarning: '시스템 카테고리는 삭제할 수 없습니다.',
    adminOnly: '관리자만 접근 가능합니다.',
    email: '이메일',
    name: '이름',
    password: '비밀번호',
    role: '역할',
    status: '상태',
    active: '활성',
    inactive: '비활성',
    admin: '시스템 관리자',
    orderManager: '주문 관리자',
    shipManager: '배송 관리자',
    system: '시스템설정',
    systemSettings: '시스템 설정',
    inventory: '재고',
    order: '주문',
    shipping: '배송',
    currency: '환율',
    notification: '알림',
    accounting: '회계',
    allCategories: '전체',
    applyChanges: '변경사항 적용',
    resetToDefault: '기본값으로 재설정',
    bulkImport: '대량입력',
    selectFile: '파일 선택',
    downloadTemplate: '현재 설정 다운로드',
    upload: '업로드',
    importType: '입력 유형',
    importSuccess: '성공적으로 입력되었습니다',
    importFailed: '입력 실패',
    selectExcelFile: '엑셀 파일을 선택하세요',
    importing: '입력 중...',
    downloadExplanation: '현재 설정된 모든 데이터를 엑셀로 다운로드 받습니다.',
    uploadExplanation: '수정한 엑셀 파일을 업로드하면 일괄 업데이트됩니다.'
  } : {
    title: '设置',
    products: '产品管理',
    users: '用户管理',
    categories: '分类管理',
    cashbookTypes: '出纳类型管理',
    type: '类型',
    income: '收入',
    expense: '支出',
    adjustment: '调整',
    addCashbookType: '添加出纳类型',
    typeColor: '颜色',
    name_ko: '韩文名称',
    name_zh: '中文名称',
    code: '代码',
    description: '说明',
    displayOrder: '显示顺序',
    isSystem: '系统',
    actions: '操作',
    addCategory: '添加分类',
    addUser: '添加用户',
    addProduct: '添加产品',
    productName: '产品名称',
    productNameKo: '产品名称 (韩文)',
    productNameZh: '产品名称 (中文)',
    sku: 'SKU',
    model: '型号',
    color: '颜色',
    brand: '品牌',
    costCny: '成本 (CNY)',
    priceKrw: '售价 (KRW)',
    onHand: '库存数量',
    lowStockThreshold: '缺货阈值',
    imageUrl: '图片 URL',
    save: '保存',
    cancel: '取消',
    edit: '编辑',
    delete: '删除',
    confirmDelete: '确定要删除吗？',
    systemCategoryWarning: '系统分类无法删除。',
    adminOnly: '仅管理员可访问。',
    email: '邮箱',
    name: '姓名',
    password: '密码',
    role: '角色',
    status: '状态',
    active: '启用',
    inactive: '禁用',
    admin: '系统管理员',
    orderManager: '订单管理员',
    shipManager: '配送管理员',
    system: '系统设置',
    systemSettings: '系统设置',
    inventory: '库存',
    order: '订单',
    shipping: '配送',
    currency: '汇率',
    notification: '通知',
    accounting: '会计',
    allCategories: '全部',
    applyChanges: '应用更改',
    resetToDefault: '重置为默认值',
    bulkImport: '批量导入',
    selectFile: '选择文件',
    downloadTemplate: '下载当前设置',
    upload: '上传',
    importType: '导入类型',
    importSuccess: '导入成功',
    importFailed: '导入失败',
    selectExcelFile: '请选择Excel文件',
    importing: '导入中...',
    downloadExplanation: '下载所有当前设置数据为Excel文件。',
    uploadExplanation: '上传修改后的Excel文件进行批量更新。'
  };
  
  // 역할 표시 함수
  const getRoleDisplay = (role: string) => {
    switch(role) {
      case 'admin':
        return locale === 'ko' ? '시스템 관리자' : '系统管理员';
      case 'order_manager':
        return locale === 'ko' ? '주문 관리자' : '订单管理员';
      case 'ship_manager':
        return locale === 'ko' ? '배송 관리자' : '配送管理员';
      default:
        return role;
    }
  };

  // 사용자 권한 확인
  useEffect(() => {
    checkUserRole();
  }, []);

  // 탭별 데이터 로드
  useEffect(() => {
    if (activeTab === 'products') {
      loadProducts();
      loadCategories(); // 상품 탭에서도 카테고리 로드
    } else if (activeTab === 'categories') {
      loadCategories();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'cashbook_types') {
      loadCashbookTypes();
    } else if (activeTab === 'system') {
      loadSystemSettings();
    }
  }, [activeTab, selectedCategory]);

  const checkUserRole = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile?.role !== 'admin') {
          alert(t.adminOnly);
          router.push(`/${locale}/dashboard`);
        } else {
          setUserRole(profile.role);
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const loadCashbookTypes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cashbook-types');
      if (response.ok) {
        const data = await response.json();
        setCashbookTypes(data);
      }
    } catch (error) {
      console.error('Error loading cashbook types:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemSettings = async () => {
    try {
      const url = selectedCategory === 'all' 
        ? '/api/system-settings'
        : `/api/system-settings?category=${selectedCategory}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSystemSettings(data);
        // 초기 값 설정
        const initialValues: {[key: string]: string} = {};
        data.forEach((setting: SystemSetting) => {
          initialValues[setting.key] = setting.value;
        });
        setEditedSettings(initialValues);
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setEditedSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSystemSettings = async () => {
    try {
      setLoading(true);
      
      // 변경된 설정만 필터링
      const changedSettings = systemSettings
        .filter(setting => editedSettings[setting.key] !== setting.value)
        .map(setting => ({
          key: setting.key,
          value: editedSettings[setting.key],
          value_type: setting.value_type
        }));
      
      if (changedSettings.length === 0) {
        alert(locale === 'ko' ? '변경된 설정이 없습니다.' : '没有更改的设置。');
        return;
      }
      
      const response = await fetch('/api/system-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changedSettings)
      });
      
      if (response.ok) {
        // 캐시 초기화하여 변경된 설정이 즉시 반영되도록 함
        clearSystemSettingsCache();
        alert(locale === 'ko' ? '설정이 저장되었습니다.' : '设置已保存。');
        loadSystemSettings();
      } else {
        const error = await response.json();
        alert(error.message || '설정 저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error saving system settings:', error);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    if (confirm(locale === 'ko' ? '모든 설정을 기본값으로 재설정하시겠습니까?' : '确定要将所有设置重置为默认值吗？')) {
      const defaultValues: {[key: string]: string} = {};
      systemSettings.forEach(setting => {
        defaultValues[setting.key] = setting.default_value || setting.value;
      });
      setEditedSettings(defaultValues);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setProducts(data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // SKU 자동 생성 함수
  const generateSKU = (category: string, model: string, color: string, brand: string) => {
    const timestamp = Date.now().toString(36).toUpperCase(); // 타임스탬프를 36진수로 변환
    const categoryCode = category ? category.substring(0, 3).toUpperCase() : 'XXX';
    const modelCode = model ? model.substring(0, 3).toUpperCase() : '';
    const colorCode = color ? color.substring(0, 2).toUpperCase() : '';
    const brandCode = brand ? brand.substring(0, 2).toUpperCase() : '';
    
    // SKU 형식: [카테고리3자]-[모델3자]-[색상2자]-[브랜드2자]-[타임스탬프]
    const skuParts = [categoryCode];
    if (modelCode) skuParts.push(modelCode);
    if (colorCode) skuParts.push(colorCode);
    if (brandCode) skuParts.push(brandCode);
    skuParts.push(timestamp.substring(timestamp.length - 5)); // 마지막 5자리만 사용
    
    return skuParts.join('-');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    
    try {
      setLoading(true);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      // SKU 자동 생성 (신규 등록시만)
      let sku = editProduct.sku;
      if (!editProduct.id) {
        sku = generateSKU(
          editProduct.category,
          editProduct.model || '',
          editProduct.color_ko || editProduct.color || '',
          editProduct.brand_ko || editProduct.brand || ''
        );
      }
      
      // 데이터 준비
      const productData: any = {
        sku: sku,
        name: editProduct.name || '',
        name_ko: editProduct.name_ko || editProduct.name,
        name_zh: editProduct.name_zh || editProduct.name,
        category: editProduct.category,
        model: editProduct.model || null,
        color: editProduct.color || null,
        color_ko: editProduct.color_ko || editProduct.color,
        color_zh: editProduct.color_zh || editProduct.color,
        brand: editProduct.brand || null,
        brand_ko: editProduct.brand_ko || editProduct.brand,
        brand_zh: editProduct.brand_zh || editProduct.brand,
        cost_cny: editProduct.cost_cny || 0,
        price_krw: editProduct.price_krw || 0,
        is_active: editProduct.is_active !== false
      };
      
      if (editProduct.id) {
        // 수정
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editProduct.id);
        
        if (error) throw error;
        alert(locale === 'ko' ? '상품이 수정되었습니다.' : '产品已更新。');
      } else {
        // 신규 등록
        const { error } = await supabase
          .from('products')
          .insert(productData);
        
        if (error) throw error;
        alert(locale === 'ko' ? '상품이 등록되었습니다.' : '产品已注册。');
      }
      
      setShowProductModal(false);
      setEditProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert(locale === 'ko' ? '상품 저장 중 오류가 발생했습니다.' : '保存产品时出错。');
    } finally {
      setLoading(false);
    }
  };
  
  const ensureCurrentUserProfile = async () => {
    try {
      console.log('현재 사용자 프로필 확인 중...');
      const response = await fetch('/api/users/ensure-profile', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('프로필 확인/생성 완료:', data);
      } else {
        console.error('Failed to ensure user profile:', response.status);
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      console.log('사용자 목록 로드 시도...');
      const response = await fetch('/api/users');
      console.log('API 응답 상태:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        console.log('로드된 사용자 수:', data.length);
        console.log('사용자 목록:', data.map(u => ({ email: u.email, name: u.name })));
      } else {
        console.error('Failed to load users, status:', response.status);
        // 401 에러인 경우 로그인 필요 메시지
        if (response.status === 401) {
          alert(locale === 'ko' ? '로그인이 필요합니다.' : '需要登录。');
        } else if (response.status === 403) {
          alert(locale === 'ko' ? '사용자 관리 권한이 없습니다.' : '没有用户管理权限。');
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!editUser) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUser)
      });

      if (response.ok) {
        alert(locale === 'ko' ? '사용자가 추가되었습니다.' : '用户已添加。');
        setShowUserModal(false);
        setEditUser(null);
        loadUsers();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to add user'}`);
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert(locale === 'ko' ? '사용자 추가에 실패했습니다.' : '添加用户失败。');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUser)
      });

      if (response.ok) {
        alert(locale === 'ko' ? '사용자 정보가 수정되었습니다.' : '用户信息已更新。');
        setShowUserModal(false);
        setEditUser(null);
        loadUsers();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to update user'}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert(locale === 'ko' ? '사용자 수정에 실패했습니다.' : '更新用户失败。');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(locale === 'ko' ? '정말 이 사용자를 삭제하시겠습니까?' : '确定要删除此用户吗？')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert(locale === 'ko' ? '사용자가 삭제되었습니다.' : '用户已删除。');
        loadUsers();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to delete user'}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(locale === 'ko' ? '사용자 삭제에 실패했습니다.' : '删除用户失败。');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt(locale === 'ko' ? '새 비밀번호를 입력하세요:' : '请输入新密码：');
    if (!newPassword) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });

      if (response.ok) {
        alert(locale === 'ko' ? '비밀번호가 재설정되었습니다.' : '密码已重置。');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to reset password'}`);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert(locale === 'ko' ? '비밀번호 재설정에 실패했습니다.' : '重置密码失败。');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (category: Partial<Category>) => {
    try {
      const url = editCategory ? '/api/categories' : '/api/categories';
      const method = editCategory ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCategory ? { ...category, id: editCategory.id } : category)
      });
      
      if (response.ok) {
        loadCategories();
        setShowAddModal(false);
        setEditCategory(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save category');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  };

  const handleSaveCashbookType = async (cashbookType: Partial<CashbookType>) => {
    try {
      const url = '/api/cashbook-types';
      const method = editCashbookType ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCashbookType ? { ...cashbookType, id: editCashbookType.id } : cashbookType)
      });
      
      if (response.ok) {
        loadCashbookTypes();
        setShowCashbookModal(false);
        setEditCashbookType(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save cashbook type');
      }
    } catch (error) {
      console.error('Error saving cashbook type:', error);
      alert('Failed to save cashbook type');
    }
  };

  const handleDeleteCashbookType = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    
    try {
      const response = await fetch(`/api/cashbook-types?id=${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadCashbookTypes();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete cashbook type');
      }
    } catch (error) {
      console.error('Error deleting cashbook type:', error);
      alert('Failed to delete cashbook type');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    
    try {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadCategories();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const handleBulkImport = async () => {
    if (!bulkImportFile) {
      alert(t.selectExcelFile);
      return;
    }

    setBulkImportLoading(true);
    const formData = new FormData();
    formData.append('file', bulkImportFile);

    try {
      const response = await fetch('/api/bulk-import-v2', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        let message = t.importSuccess + '\n\n';
        if (result.details) {
          message += Object.values(result.details).join('\n');
        }
        if (result.total) {
          message += `\n\n전체: 성공 ${result.total.success}건, 실패 ${result.total.failed}건`;
        }
        alert(message);
        
        // 모든 데이터 다시 로드
        loadProducts();
        loadCategories();
        loadCashbookTypes();
        
        setShowBulkImportModal(false);
        setBulkImportFile(null);
      } else {
        alert(`${t.importFailed}: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      alert(t.importFailed);
    } finally {
      setBulkImportLoading(false);
    }
  };

  const downloadCurrentSettings = async () => {
    try {
      const response = await fetch('/api/bulk-import-v2');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `yuandi_settings_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert(locale === 'ko' ? '현재 설정 다운로드 실패' : '下载当前设置失败');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert(locale === 'ko' ? '다운로드 중 오류가 발생했습니다' : '下载过程中出现错误');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1.5rem', 
          borderRadius: '0.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>
              {t.title}
            </h1>
            {activeTab !== 'users' && activeTab !== 'system' && (
              <button
                onClick={() => setShowBulkImportModal(true)}
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
                📤 {t.bulkImport}
              </button>
            )}
          </div>
          
          {/* 탭 */}
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <button
              onClick={() => setActiveTab('products')}
              style={{
                padding: '0.75rem 1rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'products' ? '2px solid #2563eb' : 'none',
                color: activeTab === 'products' ? '#2563eb' : '#6b7280',
                fontWeight: activeTab === 'products' ? '600' : '400',
                cursor: 'pointer'
              }}
            >
              {t.products}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              style={{
                padding: '0.75rem 1rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'users' ? '2px solid #2563eb' : 'none',
                color: activeTab === 'users' ? '#2563eb' : '#6b7280',
                fontWeight: activeTab === 'users' ? '600' : '400',
                cursor: 'pointer'
              }}
            >
              {t.users}
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              style={{
                padding: '0.75rem 1rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'categories' ? '2px solid #2563eb' : 'none',
                color: activeTab === 'categories' ? '#2563eb' : '#6b7280',
                fontWeight: activeTab === 'categories' ? '600' : '400',
                cursor: 'pointer'
              }}
            >
              {t.categories}
            </button>
            <button
              onClick={() => setActiveTab('cashbook_types')}
              style={{
                padding: '0.75rem 1rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'cashbook_types' ? '2px solid #2563eb' : 'none',
                color: activeTab === 'cashbook_types' ? '#2563eb' : '#6b7280',
                fontWeight: activeTab === 'cashbook_types' ? '600' : '400',
                cursor: 'pointer'
              }}
            >
              {t.cashbookTypes}
            </button>
            <button
              onClick={() => setActiveTab('system')}
              style={{
                padding: '0.75rem 1rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'system' ? '2px solid #2563eb' : 'none',
                color: activeTab === 'system' ? '#2563eb' : '#6b7280',
                fontWeight: activeTab === 'system' ? '600' : '400',
                cursor: 'pointer'
              }}
            >
              {t.system}
            </button>
          </div>
        </div>

        {/* 상품 관리 탭 */}
        {activeTab === 'products' && (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{t.products}</h2>
              <button
                onClick={() => {
                  setEditProduct({
                    id: '',
                    sku: '',
                    name: '',
                    name_ko: '',
                    name_zh: '',
                    category: '',
                    model: '',
                    color: '',
                    color_ko: '',
                    color_zh: '',
                    brand: '',
                    brand_ko: '',
                    brand_zh: '',
                    cost_cny: 0,
                    price_krw: 0,
                    on_hand: 0,
                    is_active: true
                  });
                  setShowProductModal(true);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                + {t.addProduct}
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>로딩중...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{t.productName}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{t.category}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{locale === 'ko' ? '색상' : '颜色'}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{t.brand}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>{t.model}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>{t.costCny}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>{t.priceKrw}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>{t.status}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                            {product.name_ko || product.name || '-'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                            {product.name_zh || product.name || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {(() => {
                            const cat = categories.find(c => c.category === product.category);
                            return (
                              <div>
                                <div style={{ fontSize: '0.875rem' }}>
                                  {cat?.name_ko || product.category || '-'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                                  {cat?.name_zh || product.category || '-'}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontSize: '0.875rem' }}>
                            {product.color_ko || product.color || '-'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                            {product.color_zh || product.color || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontSize: '0.875rem' }}>
                            {product.brand_ko || product.brand || '-'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                            {product.brand_zh || product.brand || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{product.model || '-'}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right' }}>¥{product.cost_cny}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right' }}>₩{product.price_krw?.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            backgroundColor: product.is_active ? '#dcfce7' : '#fee2e2',
                            color: product.is_active ? '#166534' : '#991b1b'
                          }}>
                            {product.is_active ? t.active : t.inactive}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setEditProduct(product);
                              setShowProductModal(true);
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              marginRight: '0.5rem'
                            }}
                          >
                            {t.edit}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 사용자 관리 탭 */}
        {activeTab === 'users' && (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{t.users}</h2>
              <button
                onClick={() => {
                  setEditUser({
                    id: '',
                    email: '',
                    name: '',
                    password: '',
                    role: 'order_manager' as const,
                    is_active: true
                  });
                  setShowUserModal(true);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                + {t.addUser}
              </button>
            </div>

            {/* 사용자 테이블 */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.email}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.name}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.role}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t.status}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem' }}>{user.email}</td>
                        <td style={{ padding: '0.75rem' }}>{user.name}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: user.role === 'admin' ? '#dbeafe' : user.role === 'order_manager' ? '#dcfce7' : '#fef3c7',
                            color: user.role === 'admin' ? '#1e40af' : user.role === 'order_manager' ? '#166534' : '#92400e',
                            borderRadius: '0.25rem',
                            fontSize: '0.875rem'
                          }}>
                            {getRoleDisplay(user.role)}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: user.is_active ? '#dcfce7' : '#fee2e2',
                            color: user.is_active ? '#166534' : '#dc2626',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem'
                          }}>
                            {user.is_active ? t.active : t.inactive}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                setEditUser(user);
                                setShowUserModal(true);
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#f3f4f6',
                                color: '#4b5563',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              {t.edit}
                            </button>
                            <button
                              onClick={() => handleResetPassword(user.id)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              비밀번호
                            </button>
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {t.delete}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 카테고리 관리 탭 */}
        {activeTab === 'categories' && (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{t.categories}</h2>
              <button
                onClick={() => {
                  setEditCategory(null);
                  setShowAddModal(true);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                + {t.addCategory}
              </button>
            </div>

            {/* 카테고리 테이블 */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.displayOrder}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.code}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.name_ko}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.name_zh}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t.isSystem}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(category => (
                      <tr key={category.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem' }}>{category.display_order}</td>
                        <td style={{ padding: '0.75rem' }}>{category.code}</td>
                        <td style={{ padding: '0.75rem' }}>{category.name_ko}</td>
                        <td style={{ padding: '0.75rem' }}>{category.name_zh}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {false && (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem'
                            }}>
                              System
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setEditCategory(category);
                              setShowAddModal(true);
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              marginRight: '0.5rem',
                              backgroundColor: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.25rem',
                              fontSize: '0.875rem',
                              cursor: 'pointer'
                            }}
                          >
                            {t.edit}
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '0.25rem',
                              fontSize: '0.875rem',
                              cursor: 'pointer'
                            }}
                          >
                            {t.delete}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 출납유형 관리 탭 */}
        {activeTab === 'cashbook_types' && (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{t.cashbookTypes}</h2>
              <button
                onClick={() => {
                  setEditCashbookType(null);
                  setShowCashbookModal(true);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                + {t.addCashbookType}
              </button>
            </div>

            {/* 출납유형 테이블 */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.displayOrder}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.code}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.name_ko}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.name_zh}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t.type}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t.typeColor}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t.isSystem}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashbookTypes.map(type => (
                      <tr key={type.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem' }}>{type.display_order}</td>
                        <td style={{ padding: '0.75rem' }}>{type.code}</td>
                        <td style={{ padding: '0.75rem' }}>{type.name_ko}</td>
                        <td style={{ padding: '0.75rem' }}>{type.name_zh}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 
                              type.type === 'income' ? '#dcfce7' : 
                              type.type === 'expense' ? '#fee2e2' : '#f3f4f6',
                            color: 
                              type.type === 'income' ? '#166534' : 
                              type.type === 'expense' ? '#dc2626' : '#6b7280',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem'
                          }}>
                            {type.type === 'income' ? t.income : 
                             type.type === 'expense' ? t.expense : t.adjustment}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{
                            width: '2rem',
                            height: '2rem',
                            backgroundColor: type.color,
                            borderRadius: '0.25rem',
                            margin: '0 auto',
                            border: '1px solid #d1d5db'
                          }} />
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {false && (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem'
                            }}>
                              System
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setEditCashbookType(type);
                              setShowCashbookModal(true);
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              marginRight: '0.5rem',
                              backgroundColor: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.25rem',
                              fontSize: '0.875rem',
                              cursor: 'pointer'
                            }}
                          >
                            {t.edit}
                          </button>
                          <button
                            onClick={() => handleDeleteCashbookType(type.id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '0.25rem',
                              fontSize: '0.875rem',
                              cursor: 'pointer'
                            }}
                          >
                            {t.delete}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 시스템 설정(기타) 탭 */}
        {activeTab === 'system' && (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{t.systemSettings}</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={resetToDefaults}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  {t.resetToDefault}
                </button>
                <button
                  onClick={saveSystemSettings}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: loading ? '#9ca3af' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {t.applyChanges}
                </button>
              </div>
            </div>

            {/* 카테고리 필터 */}
            <div style={{ marginBottom: '1rem' }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  width: '200px'
                }}
              >
                <option value="all">{t.allCategories}</option>
                <option value="inventory">{t.inventory}</option>
                <option value="order">{t.order}</option>
                <option value="shipping">{t.shipping}</option>
                <option value="currency">{t.currency}</option>
                <option value="notification">{t.notification}</option>
                <option value="accounting">{t.accounting}</option>
                <option value="system">{t.system}</option>
              </select>
            </div>

            {/* 시스템 설정 테이블 */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', width: '30%' }}>
                        {locale === 'ko' ? '설정 항목' : '设置项'}
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', width: '40%' }}>
                        {locale === 'ko' ? '값' : '值'}
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', width: '30%' }}>
                        {locale === 'ko' ? '설명' : '说明'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemSettings.map((setting) => (
                      <tr key={setting.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: '500' }}>
                            {locale === 'ko' ? setting.name_ko : setting.name_zh}
                          </div>
                          {setting.is_required && (
                            <span style={{ color: '#ef4444', fontSize: '0.75rem' }}> *필수</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {setting.value_type === 'boolean' ? (
                            <select
                              value={editedSettings[setting.key] || setting.value}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                              disabled={!setting.is_editable}
                              style={{
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                width: '100%',
                                backgroundColor: setting.is_editable ? 'white' : '#f3f4f6'
                              }}
                            >
                              <option value="true">{locale === 'ko' ? '활성' : '启用'}</option>
                              <option value="false">{locale === 'ko' ? '비활성' : '禁用'}</option>
                            </select>
                          ) : setting.value_type === 'number' ? (
                            <input
                              type="number"
                              value={editedSettings[setting.key] || setting.value}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                              disabled={!setting.is_editable}
                              min={setting.min_value || undefined}
                              max={setting.max_value || undefined}
                              style={{
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                width: '100%',
                                backgroundColor: setting.is_editable ? 'white' : '#f3f4f6'
                              }}
                            />
                          ) : (
                            <input
                              type="text"
                              value={editedSettings[setting.key] || setting.value}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                              disabled={!setting.is_editable}
                              style={{
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                width: '100%',
                                backgroundColor: setting.is_editable ? 'white' : '#f3f4f6'
                              }}
                            />
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          {locale === 'ko' ? setting.description_ko : setting.description_zh}
                          {setting.min_value !== null && setting.max_value !== null && (
                            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                              {locale === 'ko' ? `범위: ${setting.min_value} ~ ${setting.max_value}` : `范围: ${setting.min_value} ~ ${setting.max_value}`}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 카테고리 추가/수정 모달 */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
              {editCategory ? t.edit : t.addCategory}
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSaveCategory({
                code: formData.get('code') as string,
                name_ko: formData.get('name_ko') as string,
                name_zh: formData.get('name_zh') as string,
                description: formData.get('description') as string,
                display_order: parseInt(formData.get('display_order') as string) || 999
              });
            }}>
              {!editCategory && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    {t.code} *
                  </label>
                  <input
                    name="code"
                    type="text"
                    required
                    defaultValue={editCategory?.code}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem'
                    }}
                  />
                </div>
              )}
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  {t.name_ko} *
                </label>
                <input
                  name="name_ko"
                  type="text"
                  required
                  defaultValue={editCategory?.name_ko}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  {t.name_zh} *
                </label>
                <input
                  name="name_zh"
                  type="text"
                  required
                  defaultValue={editCategory?.name_zh}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  {t.displayOrder}
                </label>
                <input
                  name="display_order"
                  type="number"
                  defaultValue={editCategory?.display_order || 999}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  {t.description}
                </label>
                <textarea
                  name="description"
                  defaultValue={editCategory?.description}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditCategory(null);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 출납유형 추가/수정 모달 */}
      {showCashbookModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
              {editCashbookType ? t.edit : t.addCashbookType}
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSaveCashbookType({
                code: formData.get('code') as string,
                name_ko: formData.get('name_ko') as string,
                name_zh: formData.get('name_zh') as string,
                type: formData.get('type') as 'income' | 'expense' | 'adjustment',
                color: formData.get('color') as string,
                description: formData.get('description') as string,
                display_order: parseInt(formData.get('display_order') as string) || 999
              });
            }}>
              {!editCashbookType && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    {t.code} *
                  </label>
                  <input
                    name="code"
                    type="text"
                    required
                    defaultValue={editCashbookType?.code}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem'
                    }}
                  />
                </div>
              )}
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  {t.type} *
                </label>
                <select
                  name="type"
                  required
                  defaultValue={editCashbookType?.type || 'income'}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                >
                  <option value="income">{t.income}</option>
                  <option value="expense">{t.expense}</option>
                  <option value="adjustment">{t.adjustment}</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  {t.name_ko} *
                </label>
                <input
                  name="name_ko"
                  type="text"
                  required
                  defaultValue={editCashbookType?.name_ko}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  {t.name_zh} *
                </label>
                <input
                  name="name_zh"
                  type="text"
                  required
                  defaultValue={editCashbookType?.name_zh}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  {t.typeColor}
                </label>
                <input
                  name="color"
                  type="color"
                  defaultValue={editCashbookType?.color || '#6B7280'}
                  style={{
                    width: '100%',
                    padding: '0.25rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    height: '2.5rem',
                    cursor: 'pointer'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  {t.displayOrder}
                </label>
                <input
                  name="display_order"
                  type="number"
                  defaultValue={editCashbookType?.display_order || 999}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  {t.description}
                </label>
                <textarea
                  name="description"
                  defaultValue={editCashbookType?.description}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCashbookModal(false);
                    setEditCashbookType(null);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 상품 추가/편집 모달 */}
      {showProductModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600',
              marginBottom: '1.5rem'
            }}>
              {editProduct?.id 
                ? (locale === 'ko' ? '상품 수정' : '编辑产品')
                : (locale === 'ko' ? '상품 등록' : '添加产品')
              }
            </h3>

            <form onSubmit={handleSaveProduct}>
              {/* 한글 상품명 */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {locale === 'ko' ? '상품명 (한글)' : '产品名称 (韩文)'} *
                </label>
                <input
                  type="text"
                  value={editProduct?.name_ko || ''}
                  onChange={(e) => setEditProduct(prev => ({ ...prev!, name_ko: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>

              {/* 중문 상품명 */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {locale === 'ko' ? '상품명 (중문)' : '产品名称 (中文)'} *
                </label>
                <input
                  type="text"
                  value={editProduct?.name_zh || ''}
                  onChange={(e) => setEditProduct(prev => ({ ...prev!, name_zh: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>

              {/* 카테고리 */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {locale === 'ko' ? '카테고리' : '分类'} *
                </label>
                <select
                  value={editProduct?.category || ''}
                  onChange={(e) => setEditProduct(prev => ({ ...prev!, category: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">{locale === 'ko' ? '선택하세요' : '请选择'}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.category}>
                      {locale === 'ko' ? cat.name_ko : cat.name_zh}
                    </option>
                  ))}
                </select>
              </div>

              {/* 모델 */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {locale === 'ko' ? '모델 (한글/중문 공통)' : '型号 (韩中共同)'}
                </label>
                <input
                  type="text"
                  value={editProduct?.model || ''}
                  onChange={(e) => setEditProduct(prev => ({ ...prev!, model: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>

              {/* 색상 (한글) */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {locale === 'ko' ? '색상 (한글)' : '颜色 (韩文)'}
                </label>
                <input
                  type="text"
                  value={editProduct?.color_ko || ''}
                  onChange={(e) => setEditProduct(prev => ({ ...prev!, color_ko: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>

              {/* 색상 (중문) */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {locale === 'ko' ? '색상 (중문)' : '颜色 (中文)'}
                </label>
                <input
                  type="text"
                  value={editProduct?.color_zh || ''}
                  onChange={(e) => setEditProduct(prev => ({ ...prev!, color_zh: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>

              {/* 브랜드 (한글) */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {locale === 'ko' ? '브랜드 (한글)' : '品牌 (韩文)'}
                </label>
                <input
                  type="text"
                  value={editProduct?.brand_ko || ''}
                  onChange={(e) => setEditProduct(prev => ({ ...prev!, brand_ko: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>

              {/* 브랜드 (중문) */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {locale === 'ko' ? '브랜드 (중문)' : '品牌 (中文)'}
                </label>
                <input
                  type="text"
                  value={editProduct?.brand_zh || ''}
                  onChange={(e) => setEditProduct(prev => ({ ...prev!, brand_zh: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>

              {/* 원가 CNY */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {t.costCny} *
                </label>
                <input
                  type="number"
                  value={editProduct?.cost_cny || 0}
                  onChange={(e) => setEditProduct(prev => ({ ...prev!, cost_cny: parseFloat(e.target.value) || 0 }))}
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>

              {/* 판매가 KRW */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {t.priceKrw} *
                </label>
                <input
                  type="number"
                  value={editProduct?.price_krw || 0}
                  onChange={(e) => setEditProduct(prev => ({ ...prev!, price_krw: parseInt(e.target.value) || 0 }))}
                  required
                  min="0"
                  step="1000"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>

              {/* 활성 상태 */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={editProduct?.is_active !== false}
                    onChange={(e) => setEditProduct(prev => ({ ...prev!, is_active: e.target.checked }))}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ color: '#374151' }}>
                    {t.active}
                  </span>
                </label>
              </div>

              {/* 버튼 */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false);
                    setEditProduct(null);
                  }}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? (locale === 'ko' ? '처리 중...' : '处理中...') : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 사용자 추가/수정 모달 */}
      {showUserModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ 
              marginBottom: '1.5rem', 
              color: '#1f2937',
              fontSize: '1.25rem',
              fontWeight: '600'
            }}>
              {editUser?.id ? (t.editUser || '사용자 수정') : (t.addUser || '사용자 추가')}
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editUser?.id) {
                handleUpdateUser();
              } else {
                handleAddUser();
              }
            }}>
              {/* 이메일 */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {t.email || '이메일'} *
                </label>
                <input
                  type="email"
                  value={editUser?.email || ''}
                  onChange={(e) => setEditUser(prev => ({ ...prev, email: e.target.value }))}
                  readOnly={!!editUser?.id} // 수정 시에는 읽기 전용
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    backgroundColor: editUser?.id ? '#f9fafb' : 'white'
                  }}
                />
              </div>

              {/* 이름 */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {t.name || '이름'} *
                </label>
                <input
                  type="text"
                  value={editUser?.name || ''}
                  onChange={(e) => setEditUser(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>

              {/* 비밀번호 */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {t.password} {!editUser?.id && '*'}
                </label>
                <input
                  type="password"
                  value={editUser?.password || ''}
                  onChange={(e) => setEditUser(prev => ({ ...prev, password: e.target.value }))}
                  required={!editUser?.id} // 신규 추가 시에만 필수
                  placeholder={editUser?.id ? (locale === 'ko' ? '변경하지 않으려면 비워두세요' : '留空以不更改') : ''}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
                {!editUser?.id && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {locale === 'ko' ? '최소 6자 이상' : '至少6个字符'}
                  </div>
                )}
              </div>

              {/* 역할 */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {t.role || '역할'} *
                </label>
                <select
                  value={editUser?.role || 'order_manager'}
                  onChange={(e) => setEditUser(prev => ({ ...prev, role: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="admin">{locale === 'ko' ? '관리자' : '管理员'}</option>
                  <option value="order_manager">{locale === 'ko' ? '주문 관리자' : '订单管理员'}</option>
                  <option value="ship_manager">{locale === 'ko' ? '배송 관리자' : '物流管理员'}</option>
                </select>
              </div>

              {/* 활성 상태 */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={editUser?.is_active !== false} // 기본값 true
                    onChange={(e) => setEditUser(prev => ({ ...prev, is_active: e.target.checked }))}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ color: '#374151' }}>
                    {t.active || '활성'}
                  </span>
                </label>
              </div>

              {/* 버튼 */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditUser(null);
                  }}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  {t.cancel || '취소'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? (locale === 'ko' ? '처리 중...' : '处理中...') : (t.save || '저장')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 대량입력 모달 */}
      {showBulkImportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600',
              marginBottom: '1.5rem'
            }}>
              {t.bulkImport}
            </h2>

            {/* 현재 설정 다운로드 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#6b7280',
                marginBottom: '0.75rem'
              }}>
                {t.downloadExplanation}
              </p>
              <button
                onClick={downloadCurrentSettings}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                📥 {t.downloadTemplate}
              </button>
            </div>

            {/* 파일 선택 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem',
                color: '#374151',
                fontWeight: '500'
              }}>
                {t.selectFile}
              </label>
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#6b7280',
                marginBottom: '0.75rem'
              }}>
                {t.uploadExplanation}
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setBulkImportFile(e.target.files?.[0] || null)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem'
                }}
              />
              {bulkImportFile && (
                <div style={{ 
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  📄 {bulkImportFile.name}
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowBulkImportModal(false);
                  setBulkImportFile(null);
                }}
                disabled={bulkImportLoading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleBulkImport}
                disabled={bulkImportLoading || !bulkImportFile}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  opacity: (bulkImportLoading || !bulkImportFile) ? 0.5 : 1
                }}
              >
                {bulkImportLoading ? t.importing : t.upload}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}