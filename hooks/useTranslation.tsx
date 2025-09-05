'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

type Locale = 'ko' | 'zh-CN' | 'en';

const translations = {
  ko: {
    dashboard: '대시보드',
    orders: '주문 관리',
    products: '상품 관리',
    inventory: '재고 관리',
    customers: '고객 관리',
    settings: '설정',
    logout: '로그아웃',
    search: '검색',
    save: '저장',
    cancel: '취소',
    delete: '삭제',
    edit: '수정',
    add: '추가',
    loading: '로딩중...',
    error: '오류가 발생했습니다',
    success: '성공적으로 처리되었습니다',
    confirm: '확인',
  },
  'zh-CN': {
    dashboard: '仪表板',
    orders: '订单管理',
    products: '产品管理',
    inventory: '库存管理',
    customers: '客户管理',
    settings: '设置',
    logout: '登出',
    search: '搜索',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    loading: '加载中...',
    error: '发生错误',
    success: '处理成功',
    confirm: '确认',
  },
  en: {
    dashboard: 'Dashboard',
    orders: 'Orders',
    products: 'Products',
    inventory: 'Inventory',
    customers: 'Customers',
    settings: 'Settings',
    logout: 'Logout',
    search: 'Search',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    loading: 'Loading...',
    error: 'An error occurred',
    success: 'Successfully processed',
    confirm: 'Confirm',
  },
};

export function useTranslation() {
  const params = useParams();
  const [locale, setLocale] = useState<Locale>('ko');

  useEffect(() => {
    const detectedLocale = (params?.locale as Locale) || 'ko';
    if (detectedLocale && ['ko', 'zh-CN', 'en'].includes(detectedLocale)) {
      setLocale(detectedLocale);
    }
  }, [params]);

  const t = (key: keyof typeof translations.ko): string => {
    return translations[locale]?.[key] || translations.ko[key] || key;
  };

  return { t, locale, setLocale };
}

export default useTranslation;