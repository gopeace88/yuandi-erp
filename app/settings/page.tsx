'use client'

import { useState, useEffect } from 'react'
import { Save, Globe, Bell, Shield, Package, Mail, Phone, MapPin } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CompanySettings {
  name: string
  email: string
  phone: string
  address: string
  registration_no: string
  tax_id: string
}

interface SystemSettings {
  default_locale: 'ko' | 'zh-CN'
  currency: 'KRW' | 'CNY'
  low_stock_threshold: number
  order_prefix: string
  enable_notifications: boolean
  notification_email: string
  backup_enabled: boolean
  backup_frequency: 'daily' | 'weekly' | 'monthly'
}

interface ShippingSettings {
  default_courier: string
  customs_threshold: number
  shipping_fee_domestic: number
  shipping_fee_international: number
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: 'YUANDI Collection',
    email: 'contact@yuandi.com',
    phone: '010-1234-5678',
    address: '서울시 강남구 테헤란로 123',
    registration_no: '123-45-67890',
    tax_id: '1234567890',
  })

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    default_locale: 'ko',
    currency: 'KRW',
    low_stock_threshold: 5,
    order_prefix: 'ORD',
    enable_notifications: true,
    notification_email: 'admin@yuandi.com',
    backup_enabled: true,
    backup_frequency: 'daily',
  })

  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>({
    default_courier: 'cj',
    customs_threshold: 150000,
    shipping_fee_domestic: 3000,
    shipping_fee_international: 15000,
  })

  const handleSaveCompany = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companySettings),
      })

      if (!response.ok) throw new Error('Failed to save company settings')
      
      alert('회사 정보가 저장되었습니다.')
    } catch (error) {
      console.error('Error saving company settings:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSystem = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/system', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(systemSettings),
      })

      if (!response.ok) throw new Error('Failed to save system settings')
      
      alert('시스템 설정이 저장되었습니다.')
    } catch (error) {
      console.error('Error saving system settings:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveShipping = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/shipping', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shippingSettings),
      })

      if (!response.ok) throw new Error('Failed to save shipping settings')
      
      alert('배송 설정이 저장되었습니다.')
    } catch (error) {
      console.error('Error saving shipping settings:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">설정</h1>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company">회사 정보</TabsTrigger>
          <TabsTrigger value="system">시스템 설정</TabsTrigger>
          <TabsTrigger value="shipping">배송 설정</TabsTrigger>
          <TabsTrigger value="security">보안</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>회사 정보</CardTitle>
              <CardDescription>
                거래명세서 및 문서에 표시될 회사 정보를 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">회사명</Label>
                  <Input
                    id="company-name"
                    value={companySettings.name}
                    onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">이메일</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={companySettings.email}
                    onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone">전화번호</Label>
                  <Input
                    id="company-phone"
                    value={companySettings.phone}
                    onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration-no">사업자등록번호</Label>
                  <Input
                    id="registration-no"
                    value={companySettings.registration_no}
                    onChange={(e) => setCompanySettings({ ...companySettings, registration_no: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-address">주소</Label>
                <Textarea
                  id="company-address"
                  value={companySettings.address}
                  onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                  rows={2}
                />
              </div>
              <Button onClick={handleSaveCompany} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>시스템 설정</CardTitle>
              <CardDescription>
                시스템 운영에 필요한 기본 설정을 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default-locale">기본 언어</Label>
                  <Select 
                    value={systemSettings.default_locale}
                    onValueChange={(value) => setSystemSettings({ ...systemSettings, default_locale: value as 'ko' | 'zh-CN' })}
                  >
                    <SelectTrigger id="default-locale">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ko">한국어</SelectItem>
                      <SelectItem value="zh-CN">중국어</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">기본 통화</Label>
                  <Select 
                    value={systemSettings.currency}
                    onValueChange={(value) => setSystemSettings({ ...systemSettings, currency: value as 'KRW' | 'CNY' })}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KRW">원화 (₩)</SelectItem>
                      <SelectItem value="CNY">위안화 (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="low-stock">저재고 임계값</Label>
                  <Input
                    id="low-stock"
                    type="number"
                    value={systemSettings.low_stock_threshold}
                    onChange={(e) => setSystemSettings({ ...systemSettings, low_stock_threshold: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order-prefix">주문번호 접두사</Label>
                  <Input
                    id="order-prefix"
                    value={systemSettings.order_prefix}
                    onChange={(e) => setSystemSettings({ ...systemSettings, order_prefix: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>알림 설정</Label>
                    <div className="text-sm text-gray-500">
                      중요한 이벤트 발생 시 이메일 알림을 받습니다.
                    </div>
                  </div>
                  <Switch
                    checked={systemSettings.enable_notifications}
                    onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, enable_notifications: checked })}
                  />
                </div>
                {systemSettings.enable_notifications && (
                  <div className="space-y-2">
                    <Label htmlFor="notification-email">알림 이메일</Label>
                    <Input
                      id="notification-email"
                      type="email"
                      value={systemSettings.notification_email}
                      onChange={(e) => setSystemSettings({ ...systemSettings, notification_email: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>자동 백업</Label>
                    <div className="text-sm text-gray-500">
                      데이터를 정기적으로 백업합니다.
                    </div>
                  </div>
                  <Switch
                    checked={systemSettings.backup_enabled}
                    onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, backup_enabled: checked })}
                  />
                </div>
                {systemSettings.backup_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="backup-frequency">백업 주기</Label>
                    <Select 
                      value={systemSettings.backup_frequency}
                      onValueChange={(value) => setSystemSettings({ ...systemSettings, backup_frequency: value as 'daily' | 'weekly' | 'monthly' })}
                    >
                      <SelectTrigger id="backup-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">매일</SelectItem>
                        <SelectItem value="weekly">매주</SelectItem>
                        <SelectItem value="monthly">매월</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Button onClick={handleSaveSystem} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping">
          <Card>
            <CardHeader>
              <CardTitle>배송 설정</CardTitle>
              <CardDescription>
                배송 관련 기본값과 설정을 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default-courier">기본 택배사</Label>
                  <Select 
                    value={shippingSettings.default_courier}
                    onValueChange={(value) => setShippingSettings({ ...shippingSettings, default_courier: value })}
                  >
                    <SelectTrigger id="default-courier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cj">CJ대한통운</SelectItem>
                      <SelectItem value="hanjin">한진택배</SelectItem>
                      <SelectItem value="lotte">롯데택배</SelectItem>
                      <SelectItem value="post">우체국택배</SelectItem>
                      <SelectItem value="sf">순풍택배</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customs-threshold">관세 기준 금액</Label>
                  <Input
                    id="customs-threshold"
                    type="number"
                    value={shippingSettings.customs_threshold}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, customs_threshold: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-fee-domestic">국내 배송비</Label>
                  <Input
                    id="shipping-fee-domestic"
                    type="number"
                    value={shippingSettings.shipping_fee_domestic}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, shipping_fee_domestic: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-fee-international">해외 배송비</Label>
                  <Input
                    id="shipping-fee-international"
                    type="number"
                    value={shippingSettings.shipping_fee_international}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, shipping_fee_international: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <Button onClick={handleSaveShipping} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>보안 설정</CardTitle>
              <CardDescription>
                시스템 보안 및 접근 권한을 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold">2단계 인증</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    계정 보안을 강화하기 위해 2단계 인증을 설정합니다.
                  </p>
                  <Button variant="outline">설정하기</Button>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">세션 관리</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    현재 활성 세션: 1개
                  </p>
                  <Button variant="outline">모든 세션 종료</Button>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">비밀번호 정책</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked readOnly />
                      <label>최소 8자 이상</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked readOnly />
                      <label>대소문자 포함</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked readOnly />
                      <label>숫자 포함</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked readOnly />
                      <label>특수문자 포함</label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}