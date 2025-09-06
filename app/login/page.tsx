'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Package, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        // Set session cookies for server-side auth
        const sessionData = {
          token: data.session?.access_token,
          expires: data.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }

        const userData = {
          id: data.user.id,
          email: data.user.email,
          role: 'Admin' // Default role, should be fetched from user profile
        }

        // Set cookies
        document.cookie = `session=${Buffer.from(JSON.stringify(sessionData)).toString('base64')}; path=/; max-age=${24 * 60 * 60}; secure; samesite=lax`
        document.cookie = `user=${Buffer.from(JSON.stringify(userData)).toString('base64')}; path=/; max-age=${24 * 60 * 60}; secure; samesite=lax`

        router.push('/dashboard')
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fillTestAccount = (role: 'admin' | 'order' | 'ship') => {
    const accounts = {
      admin: { email: 'admin@yuandi.com', password: 'admin123' },
      order: { email: 'order@yuandi.com', password: 'order123' },
      ship: { email: 'ship@yuandi.com', password: 'ship123' },
    }

    setEmail(accounts[role].email)
    setPassword(accounts[role].password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Mobile-optimized header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Package className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            YUANDI ERP
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Collection Management System
          </p>
        </div>

        {/* Mobile-optimized login card */}
        <Card className="shadow-2xl border-0">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl text-center font-semibold text-gray-900">
              로그인
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              계정 정보를 입력하여 시스템에 접속하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  이메일
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@yuandi.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12 text-base border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  비밀번호
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 h-12 text-base border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    로그인 중...
                  </div>
                ) : (
                  '로그인'
                )}
              </Button>
            </form>

            {/* Mobile-friendly test accounts */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4 text-center">테스트 계정 (개발용)</p>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillTestAccount('admin')}
                    className="h-10 text-sm"
                  >
                    👑 관리자 계정
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillTestAccount('order')}
                    className="h-10 text-sm"
                  >
                    📦 주문관리자 계정
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillTestAccount('ship')}
                    className="h-10 text-sm"
                  >
                    🚚 배송관리자 계정
                  </Button>
                </div>
              </div>
            )}

            {/* Mobile support */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                문제가 있으신가요?{' '}
                <a href="mailto:support@yuandi.com" className="text-blue-600 hover:text-blue-700 font-medium">
                  지원팀에 문의
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mobile app features */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">모바일에서 더 편리하게</p>
          <div className="flex justify-center space-x-4">
            <button className="px-4 py-2 bg-white rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm border">
              📱 홈 화면에 추가
            </button>
            <button className="px-4 py-2 bg-white rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm border">
              🔔 알림 설정
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}