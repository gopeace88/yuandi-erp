'use client'

import { useState, useEffect } from 'react'
import { Locale, LOCALE_STORAGE_KEY, defaultLocale } from '@/lib/i18n/config'
import { translate } from '@/lib/i18n/translations'
import { UserModal } from '@/app/components/users/user-modal'

interface UserStats {
  totalUsers: number
  activeUsers: number
  adminUsers: number
  regularUsers: number
}

interface User {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  created_at: string
  last_login_at: string | null
}

interface UsersContentProps {
  stats: UserStats
  users: User[]
}

export function UsersContent({ stats, users }: UsersContentProps) {
  const [locale, setLocale] = useState<Locale>(defaultLocale)
  const [userModal, setUserModal] = useState<{
    isOpen: boolean
    mode: 'add' | 'edit'
    user?: any
  }>({ isOpen: false, mode: 'add' })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
      }
    }
  }, [])

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale
      if (stored && ['ko', 'zh-CN'].includes(stored)) {
        setLocale(stored)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      const handleLocaleChange = (e: CustomEvent) => {
        setLocale(e.detail.locale)
      }
      window.addEventListener('localeChange' as any, handleLocaleChange)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('localeChange' as any, handleLocaleChange)
      }
    }
  }, [])

  const t = (key: string) => translate(locale, key)

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`${userName} 사용자를 삭제하시겠습니까?`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/users/simple?id=${userId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete user')
      }
      
      // Refresh page to update list
      window.location.reload()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      alert(error.message || '사용자 삭제 중 오류가 발생했습니다.')
    }
  }

  const getRoleDisplay = (role: string) => {
    const roleMap = {
      'Admin': { label: t('roles.Admin'), color: 'bg-purple-100 text-purple-800' },
      'OrderManager': { label: t('roles.OrderManager'), color: 'bg-blue-100 text-blue-800' },
      'ShipManager': { label: t('roles.ShipManager'), color: 'bg-orange-100 text-orange-800' }
    }
    return roleMap[role as keyof typeof roleMap] || { label: role, color: 'bg-gray-100 text-gray-800' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
        <button 
          onClick={() => setUserModal({ isOpen: true, mode: 'add' })}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          사용자 추가
        </button>
      </div>

      {/* 사용자 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              👥
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('users.stats.total')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              ✅
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('users.stats.active')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              👑
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('users.stats.admins')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.adminUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              👤
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('users.stats.regular')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.regularUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">{t('users.list.title')}</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.table.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.table.email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.table.role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.table.lastLogin')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const roleDisplay = getRoleDisplay(user.role)
                return (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleDisplay.color}`}>
                        {roleDisplay.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.active ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {t('users.statusActive')}
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          {t('users.statusInactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleString(locale) : t('users.neverLoggedIn')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => setUserModal({ isOpen: true, mode: 'edit', user })}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        {t('common.edit')}
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 사용자 추가/수정 모달 */}
      {userModal.isOpen && (
        <UserModal
          locale={locale}
          mode={userModal.mode}
          user={userModal.user}
          onClose={() => setUserModal({ isOpen: false, mode: 'add' })}
          onSuccess={() => {
            setUserModal({ isOpen: false, mode: 'add' })
            // TODO: 사용자 목록 새로고침
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}