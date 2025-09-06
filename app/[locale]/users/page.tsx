/**
 * 사용자 관리 페이지
 * PRD v2.0 요구사항: Admin 전용 사용자 관리
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileBottomNav } from '@/components/Navigation';

interface UsersPageProps {
  params: { locale: string };
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Admin' | 'OrderManager' | 'ShipManager';
  locale: 'ko' | 'zh-CN';
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Mock 데이터
const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@yuandi.com',
    phone: '010-1111-1111',
    role: 'Admin',
    locale: 'ko',
    active: true,
    lastLoginAt: '2024-12-25T10:30:00',
    createdAt: '2024-01-01T00:00:00',
    updatedAt: '2024-12-25T10:30:00'
  },
  {
    id: '2',
    name: 'Order Manager',
    email: 'order@yuandi.com',
    phone: '010-2222-2222',
    role: 'OrderManager',
    locale: 'ko',
    active: true,
    lastLoginAt: '2024-12-25T09:15:00',
    createdAt: '2024-01-15T00:00:00',
    updatedAt: '2024-12-25T09:15:00'
  },
  {
    id: '3',
    name: 'Ship Manager',
    email: 'ship@yuandi.com',
    phone: '010-3333-3333',
    role: 'ShipManager',
    locale: 'zh-CN',
    active: true,
    lastLoginAt: '2024-12-25T14:30:00',
    createdAt: '2024-02-01T00:00:00',
    updatedAt: '2024-12-25T14:30:00'
  },
  {
    id: '4',
    name: '김철수',
    email: 'kim@yuandi.com',
    phone: '010-4444-4444',
    role: 'OrderManager',
    locale: 'ko',
    active: false,
    lastLoginAt: '2024-11-30T16:45:00',
    createdAt: '2024-03-01T00:00:00',
    updatedAt: '2024-11-30T16:45:00'
  },
  {
    id: '5',
    name: '王小明',
    email: 'wang@yuandi.com',
    phone: '010-5555-5555',
    role: 'ShipManager',
    locale: 'zh-CN',
    active: true,
    createdAt: '2024-06-01T00:00:00',
    updatedAt: '2024-06-01T00:00:00'
  }
];

export default function UsersPage({ params: { locale } }: UsersPageProps) {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [userRole, setUserRole] = useState<string>('');
  const router = useRouter();

  // 사용자 추가/수정 폼 상태
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'OrderManager' as 'Admin' | 'OrderManager' | 'ShipManager',
    locale: 'ko' as 'ko' | 'zh-CN',
    password: '',
    confirmPassword: ''
  });

  // 다국어 텍스트
  const texts = {
    ko: {
      title: '사용자 관리',
      searchPlaceholder: '이름, 이메일, 전화번호 검색...',
      filterRole: '역할',
      filterStatus: '상태',
      addUser: '사용자 추가',
      // Table Headers
      name: '이름',
      email: '이메일',
      phone: '전화번호',
      role: '역할',
      language: '언어',
      status: '상태',
      lastLogin: '마지막 로그인',
      createdAt: '생성일',
      action: '작업',
      // Roles
      all: '전체',
      Admin: '관리자',
      OrderManager: '주문 관리자',
      ShipManager: '배송 관리자',
      // Status
      active: '활성',
      inactive: '비활성',
      // Languages
      korean: '한국어',
      chinese: '중국어',
      // Modal
      addModalTitle: '새 사용자 추가',
      editModalTitle: '사용자 정보 수정',
      password: '비밀번호',
      confirmPassword: '비밀번호 확인',
      selectRole: '역할 선택',
      selectLanguage: '언어 선택',
      cancel: '취소',
      save: '저장',
      edit: '수정',
      deactivate: '비활성화',
      activate: '활성화',
      delete: '삭제',
      // Messages
      passwordMismatch: '비밀번호가 일치하지 않습니다.',
      emailExists: '이미 존재하는 이메일입니다.',
      deleteConfirm: '정말로 이 사용자를 삭제하시겠습니까?',
      noUsers: '사용자가 없습니다.',
      totalUsers: '전체 사용자',
      activeUsers: '활성 사용자',
      // Validation
      required: '필수 입력 항목입니다.',
      invalidEmail: '올바른 이메일 형식이 아닙니다.',
      invalidPhone: '올바른 전화번호 형식이 아닙니다.',
      passwordLength: '비밀번호는 최소 6자 이상이어야 합니다.'
    },
    'zh-CN': {
      title: '用户管理',
      searchPlaceholder: '搜索姓名、邮箱、电话...',
      filterRole: '角色',
      filterStatus: '状态',
      addUser: '添加用户',
      // Table Headers
      name: '姓名',
      email: '邮箱',
      phone: '电话',
      role: '角色',
      language: '语言',
      status: '状态',
      lastLogin: '最后登录',
      createdAt: '创建日期',
      action: '操作',
      // Roles
      all: '全部',
      Admin: '管理员',
      OrderManager: '订单经理',
      ShipManager: '配送经理',
      // Status
      active: '活动',
      inactive: '停用',
      // Languages
      korean: '韩语',
      chinese: '中文',
      // Modal
      addModalTitle: '添加新用户',
      editModalTitle: '编辑用户信息',
      password: '密码',
      confirmPassword: '确认密码',
      selectRole: '选择角色',
      selectLanguage: '选择语言',
      cancel: '取消',
      save: '保存',
      edit: '编辑',
      deactivate: '停用',
      activate: '激活',
      delete: '删除',
      // Messages
      passwordMismatch: '密码不匹配。',
      emailExists: '邮箱已存在。',
      deleteConfirm: '确定要删除此用户吗？',
      noUsers: '没有用户。',
      totalUsers: '总用户',
      activeUsers: '活跃用户',
      // Validation
      required: '必填项。',
      invalidEmail: '邮箱格式不正确。',
      invalidPhone: '电话格式不正确。',
      passwordLength: '密码至少需要6个字符。'
    }
  };

  const t = texts[locale as keyof typeof texts] || texts.ko;

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!role || role !== 'Admin') {
      router.push(`/${locale}/dashboard`);
      return;
    }
    setUserRole(role);
  }, [locale, router]);

  // 필터링된 사용자 목록
  const filteredUsers = users.filter(user => {
    // 검색 필터
    if (searchTerm && !(
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm)
    )) {
      return false;
    }

    // 역할 필터
    if (filterRole !== 'all' && user.role !== filterRole) {
      return false;
    }

    // 상태 필터
    if (filterStatus === 'active' && !user.active) {
      return false;
    }
    if (filterStatus === 'inactive' && user.active) {
      return false;
    }

    return true;
  });

  // 통계
  const stats = {
    total: users.length,
    active: users.filter(u => u.active).length
  };

  // 역할별 색상
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return { bg: '#fee2e2', text: '#dc2626' };
      case 'OrderManager': return { bg: '#dbeafe', text: '#1e40af' };
      case 'ShipManager': return { bg: '#dcfce7', text: '#166534' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  // 사용자 추가
  const handleAddUser = () => {
    if (!userForm.name || !userForm.email || !userForm.password) {
      alert(t.required);
      return;
    }

    if (userForm.password !== userForm.confirmPassword) {
      alert(t.passwordMismatch);
      return;
    }

    if (userForm.password.length < 6) {
      alert(t.passwordLength);
      return;
    }

    if (users.some(u => u.email === userForm.email)) {
      alert(t.emailExists);
      return;
    }

    const newUser: User = {
      id: Date.now().toString(),
      name: userForm.name,
      email: userForm.email,
      phone: userForm.phone,
      role: userForm.role,
      locale: userForm.locale,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setUsers([...users, newUser]);
    setShowAddModal(false);
    resetForm();
  };

  // 사용자 수정
  const handleEditUser = () => {
    if (!selectedUser || !userForm.name || !userForm.email) {
      alert(t.required);
      return;
    }

    if (userForm.password && userForm.password !== userForm.confirmPassword) {
      alert(t.passwordMismatch);
      return;
    }

    if (userForm.password && userForm.password.length < 6) {
      alert(t.passwordLength);
      return;
    }

    setUsers(users.map(u =>
      u.id === selectedUser.id
        ? {
            ...u,
            name: userForm.name,
            email: userForm.email,
            phone: userForm.phone,
            role: userForm.role,
            locale: userForm.locale,
            updatedAt: new Date().toISOString()
          }
        : u
    ));

    setShowEditModal(false);
    setSelectedUser(null);
    resetForm();
  };

  // 사용자 활성/비활성화
  const handleToggleActive = (userId: string) => {
    setUsers(users.map(u =>
      u.id === userId
        ? { ...u, active: !u.active, updatedAt: new Date().toISOString() }
        : u
    ));
  };

  // 사용자 삭제
  const handleDeleteUser = (userId: string) => {
    if (confirm(t.deleteConfirm)) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setUserForm({
      name: '',
      email: '',
      phone: '',
      role: 'OrderManager',
      locale: 'ko',
      password: '',
      confirmPassword: ''
    });
  };

  // 수정 모달 열기
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      locale: user.locale,
      password: '',
      confirmPassword: ''
    });
    setShowEditModal(true);
  };

  return (
    <div style={{ padding: '2rem', paddingBottom: '5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          {t.title}
        </h1>

        {/* 통계 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              {t.totalUsers}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#374151' }}>
              {stats.total}
            </div>
          </div>
          <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#166534', marginBottom: '0.5rem' }}>
              {t.activeUsers}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534' }}>
              {stats.active}
            </div>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* 역할 필터 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>{t.filterRole}:</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="all">{t.all}</option>
              <option value="Admin">{t.Admin}</option>
              <option value="OrderManager">{t.OrderManager}</option>
              <option value="ShipManager">{t.ShipManager}</option>
            </select>
          </div>

          {/* 상태 필터 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>{t.filterStatus}:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="all">{t.all}</option>
              <option value="active">{t.active}</option>
              <option value="inactive">{t.inactive}</option>
            </select>
          </div>

          {/* 검색 */}
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              minWidth: '250px'
            }}
          />

          {/* 사용자 추가 버튼 */}
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            + {t.addUser}
          </button>
        </div>
      </div>

      {/* 사용자 목록 */}
      {filteredUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          {t.noUsers}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.name}</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.email}</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.phone}</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.role}</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.language}</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.status}</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>{t.lastLogin}</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const roleColor = getRoleColor(user.role);
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>{user.name}</td>
                    <td style={{ padding: '0.75rem', color: '#6b7280' }}>{user.email}</td>
                    <td style={{ padding: '0.75rem', color: '#6b7280' }}>{user.phone}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: roleColor.bg,
                        color: roleColor.text
                      }}>
                        {t[user.role as keyof typeof t] || user.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        backgroundColor: '#f3f4f6'
                      }}>
                        {user.locale === 'ko' ? t.korean : t.chinese}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: user.active ? '#dcfce7' : '#fee2e2',
                        color: user.active ? '#166534' : '#dc2626'
                      }}>
                        {user.active ? t.active : t.inactive}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => openEditModal(user)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          {t.edit}
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: user.active ? '#fbbf24' : '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          {user.active ? t.deactivate : t.activate}
                        </button>
                        {user.role !== 'Admin' && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            style={{
                              padding: '0.25rem 0.75rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 사용자 추가 모달 */}
      {showAddModal && (
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
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {t.addModalTitle}
            </h2>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* 이름 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.name} *
                </label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* 이메일 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.email} *
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* 전화번호 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.phone}
                </label>
                <input
                  type="tel"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* 역할 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.role} *
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'Admin' | 'OrderManager' | 'ShipManager' })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="Admin">{t.Admin}</option>
                  <option value="OrderManager">{t.OrderManager}</option>
                  <option value="ShipManager">{t.ShipManager}</option>
                </select>
              </div>

              {/* 언어 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.language}
                </label>
                <select
                  value={userForm.locale}
                  onChange={(e) => setUserForm({ ...userForm, locale: e.target.value as 'ko' | 'zh-CN' })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="ko">{t.korean}</option>
                  <option value="zh-CN">{t.chinese}</option>
                </select>
              </div>

              {/* 비밀번호 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.password} *
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* 비밀번호 확인 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.confirmPassword} *
                </label>
                <input
                  type="password"
                  value={userForm.confirmPassword}
                  onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleAddUser}
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
          </div>
        </div>
      )}

      {/* 사용자 수정 모달 */}
      {showEditModal && selectedUser && (
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
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {t.editModalTitle}
            </h2>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* 이름 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.name} *
                </label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* 이메일 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.email} *
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* 전화번호 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.phone}
                </label>
                <input
                  type="tel"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* 역할 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.role} *
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'Admin' | 'OrderManager' | 'ShipManager' })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="Admin">{t.Admin}</option>
                  <option value="OrderManager">{t.OrderManager}</option>
                  <option value="ShipManager">{t.ShipManager}</option>
                </select>
              </div>

              {/* 언어 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.language}
                </label>
                <select
                  value={userForm.locale}
                  onChange={(e) => setUserForm({ ...userForm, locale: e.target.value as 'ko' | 'zh-CN' })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="ko">{t.korean}</option>
                  <option value="zh-CN">{t.chinese}</option>
                </select>
              </div>

              {/* 비밀번호 (선택사항) */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t.password}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Leave blank to keep current password"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* 비밀번호 확인 (선택사항) */}
              {userForm.password && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {t.confirmPassword}
                  </label>
                  <input
                    type="password"
                    value={userForm.confirmPassword}
                    onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  resetForm();
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleEditUser}
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
          </div>
        </div>
      )}
      
      {/* 표준화된 모바일 하단 네비게이션 */}
      <MobileBottomNav locale={locale} />
    </div>
  );
}