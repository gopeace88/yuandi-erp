/**
 * 관리자 설정 페이지
 * 시스템 설정, 사용자 관리, 백업 등 관리 기능
 */

'use client';

import React, { useState } from 'react';
import { useTranslationContext } from '@/components/i18n/TranslationProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Settings, 
  Users, 
  Shield, 
  Bell, 
  Database, 
  Globe,
  Moon,
  Sun,
  Save,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Mail,
  MessageSquare,
  Smartphone,
  Key,
  Lock,
  UserPlus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Clock,
  Calendar,
  DollarSign,
  Package,
  Truck,
  CreditCard,
  ChevronRight,
  Info,
  Activity,
  Zap,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi,
  WifiOff
} from 'lucide-react';
import { type Locale } from '@/lib/i18n';
import LanguageSelector from '@/components/i18n/LanguageSelector';

interface AdminSettingsPageProps {
  params: { locale: Locale };
}

interface SystemConfig {
  siteName: string;
  siteUrl: string;
  adminEmail: string;
  timezone: string;
  currency: string;
  taxRate: number;
  lowStockThreshold: number;
  orderPrefix: string;
  autoBackup: boolean;
  backupFrequency: string;
  maintenanceMode: boolean;
  debugMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  twoFactorAuth: boolean;
}

interface NotificationConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  orderConfirmation: boolean;
  shippingNotification: boolean;
  deliveryNotification: boolean;
  lowStockAlert: boolean;
  newUserWelcome: boolean;
  passwordReset: boolean;
  systemAlerts: boolean;
  marketingEmails: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'order_manager' | 'ship_manager' | 'customer';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin?: string;
  twoFactorEnabled: boolean;
}

export default function AdminSettingsPage({ params: { locale } }: AdminSettingsPageProps) {
  const { t, formatDate, formatCurrency } = useTranslationContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // System configuration state
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    siteName: 'YUANDI',
    siteUrl: 'https://yuandi.com',
    adminEmail: 'admin@yuandi.com',
    timezone: 'Asia/Seoul',
    currency: 'KRW',
    taxRate: 10,
    lowStockThreshold: 5,
    orderPrefix: 'ORD',
    autoBackup: true,
    backupFrequency: 'daily',
    maintenanceMode: false,
    debugMode: false,
    allowRegistration: false,
    requireEmailVerification: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    twoFactorAuth: false
  });

  // Notification configuration state
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: false,
    orderConfirmation: true,
    shippingNotification: true,
    deliveryNotification: true,
    lowStockAlert: true,
    newUserWelcome: true,
    passwordReset: true,
    systemAlerts: true,
    marketingEmails: false
  });

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  
  // Users state
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: '관리자',
      email: 'admin@yuandi.com',
      phone: '010-1234-5678',
      role: 'admin',
      status: 'active',
      createdAt: '2024-01-01',
      lastLogin: '2024-01-20',
      twoFactorEnabled: true
    },
    {
      id: '2',
      name: '주문 관리자',
      email: 'order@yuandi.com',
      phone: '010-2345-6789',
      role: 'order_manager',
      status: 'active',
      createdAt: '2024-01-05',
      lastLogin: '2024-01-19',
      twoFactorEnabled: false
    },
    {
      id: '3',
      name: '배송 관리자',
      email: 'shipping@yuandi.com',
      phone: '010-3456-7890',
      role: 'ship_manager',
      status: 'active',
      createdAt: '2024-01-10',
      lastLogin: '2024-01-18',
      twoFactorEnabled: false
    }
  ]);

  const [showPassword, setShowPassword] = useState(false);
  const [newUserModal, setNewUserModal] = useState(false);

  // Save system configuration
  const saveSystemConfig = async () => {
    setSaving(true);
    try {
      // API call to save configuration
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Show success message
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  // Export data
  const exportData = async (type: 'orders' | 'products' | 'customers' | 'all') => {
    setLoading(true);
    try {
      // API call to export data
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Trigger download
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Backup database
  const backupDatabase = async () => {
    setLoading(true);
    try {
      // API call to create backup
      await new Promise(resolve => setTimeout(resolve, 3000));
      // Show success message
    } catch (error) {
      console.error('Backup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Restore database
  const restoreDatabase = async () => {
    // Implementation for database restore
  };

  const roleColors = {
    admin: 'bg-red-100 text-red-800',
    order_manager: 'bg-blue-100 text-blue-800',
    ship_manager: 'bg-green-100 text-green-800',
    customer: 'bg-gray-100 text-gray-800'
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800'
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-2">
          {locale === 'ko' && '시스템 설정 및 관리 기능'}
          {locale === 'zh-CN' && '系统设置和管理功能'}
          {locale === 'en' && 'System settings and management features'}
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {locale === 'ko' && '일반'}
            {locale === 'zh-CN' && '常规'}
            {locale === 'en' && 'General'}
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('navigation.users')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {t('navigation.notifications')}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {t('settings.security')}
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            {t('settings.backup')}
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.preferences')}</CardTitle>
              <CardDescription>
                {locale === 'ko' && '기본 시스템 설정을 관리합니다'}
                {locale === 'zh-CN' && '管理基本系统设置'}
                {locale === 'en' && 'Manage basic system settings'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">
                    {locale === 'ko' && '사이트 이름'}
                    {locale === 'zh-CN' && '网站名称'}
                    {locale === 'en' && 'Site Name'}
                  </Label>
                  <Input
                    id="siteName"
                    value={systemConfig.siteName}
                    onChange={(e) => setSystemConfig({...systemConfig, siteName: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="siteUrl">
                    {locale === 'ko' && '사이트 URL'}
                    {locale === 'zh-CN' && '网站 URL'}
                    {locale === 'en' && 'Site URL'}
                  </Label>
                  <Input
                    id="siteUrl"
                    value={systemConfig.siteUrl}
                    onChange={(e) => setSystemConfig({...systemConfig, siteUrl: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">
                    {t('settings.timezone')}
                  </Label>
                  <Select value={systemConfig.timezone} onValueChange={(value) => setSystemConfig({...systemConfig, timezone: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Seoul">Seoul (UTC+9)</SelectItem>
                      <SelectItem value="Asia/Shanghai">Beijing (UTC+8)</SelectItem>
                      <SelectItem value="America/New_York">New York (UTC-5)</SelectItem>
                      <SelectItem value="Europe/London">London (UTC+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">
                    {t('settings.currency')}
                  </Label>
                  <Select value={systemConfig.currency} onValueChange={(value) => setSystemConfig({...systemConfig, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KRW">KRW (₩)</SelectItem>
                      <SelectItem value="CNY">CNY (¥)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">
                    {t('settings.language')}
                  </Label>
                  <LanguageSelector currentLocale={locale} variant="dropdown" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme">
                    {t('settings.theme')}
                  </Label>
                  <Select value={theme} onValueChange={(value: 'light' | 'dark' | 'system') => setTheme(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center">
                          <Sun className="w-4 h-4 mr-2" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center">
                          <Moon className="w-4 h-4 mr-2" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center">
                          <Settings className="w-4 h-4 mr-2" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">
                  {locale === 'ko' && '비즈니스 설정'}
                  {locale === 'zh-CN' && '业务设置'}
                  {locale === 'en' && 'Business Settings'}
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxRate">
                      {locale === 'ko' && '세율 (%)'}
                      {locale === 'zh-CN' && '税率 (%)'}
                      {locale === 'en' && 'Tax Rate (%)'}
                    </Label>
                    <Input
                      id="taxRate"
                      type="number"
                      value={systemConfig.taxRate}
                      onChange={(e) => setSystemConfig({...systemConfig, taxRate: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lowStock">
                      {locale === 'ko' && '재고 부족 임계값'}
                      {locale === 'zh-CN' && '库存不足阈值'}
                      {locale === 'en' && 'Low Stock Threshold'}
                    </Label>
                    <Input
                      id="lowStock"
                      type="number"
                      value={systemConfig.lowStockThreshold}
                      onChange={(e) => setSystemConfig({...systemConfig, lowStockThreshold: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orderPrefix">
                      {locale === 'ko' && '주문 번호 접두사'}
                      {locale === 'zh-CN' && '订单号前缀'}
                      {locale === 'en' && 'Order Number Prefix'}
                    </Label>
                    <Input
                      id="orderPrefix"
                      value={systemConfig.orderPrefix}
                      onChange={(e) => setSystemConfig({...systemConfig, orderPrefix: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSystemConfig} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {t('common.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Management */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('navigation.users')}</CardTitle>
                  <CardDescription>
                    {locale === 'ko' && '사용자 계정을 관리합니다'}
                    {locale === 'zh-CN' && '管理用户账户'}
                    {locale === 'en' && 'Manage user accounts'}
                  </CardDescription>
                </div>
                <Button onClick={() => setNewUserModal(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {locale === 'ko' && '사용자 추가'}
                  {locale === 'zh-CN' && '添加用户'}
                  {locale === 'en' && 'Add User'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          {user.phone && (
                            <p className="text-sm text-gray-500">{user.phone}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Badge className={roleColors[user.role]}>
                          {user.role === 'admin' && '관리자'}
                          {user.role === 'order_manager' && '주문관리'}
                          {user.role === 'ship_manager' && '배송관리'}
                          {user.role === 'customer' && '고객'}
                        </Badge>
                        <Badge className={statusColors[user.status]}>
                          {user.status === 'active' && '활성'}
                          {user.status === 'inactive' && '비활성'}
                          {user.status === 'suspended' && '정지'}
                        </Badge>
                        {user.twoFactorEnabled && (
                          <Badge variant="outline">
                            <Shield className="w-3 h-3 mr-1" />
                            2FA
                          </Badge>
                        )}
                        
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Key className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {locale === 'ko' && '사용자 삭제'}
                                  {locale === 'zh-CN' && '删除用户'}
                                  {locale === 'en' && 'Delete User'}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {locale === 'ko' && '정말로 이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'}
                                  {locale === 'zh-CN' && '确定要删除此用户吗？此操作无法撤消。'}
                                  {locale === 'en' && 'Are you sure you want to delete this user? This action cannot be undone.'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                                  {t('common.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.notifications')}</CardTitle>
              <CardDescription>
                {locale === 'ko' && '알림 설정을 관리합니다'}
                {locale === 'zh-CN' && '管理通知设置'}
                {locale === 'en' && 'Manage notification settings'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">
                  {locale === 'ko' && '알림 채널'}
                  {locale === 'zh-CN' && '通知渠道'}
                  {locale === 'en' && 'Notification Channels'}
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium">{t('notifications.channels.email')}</p>
                        <p className="text-sm text-gray-600">
                          {locale === 'ko' && '이메일로 알림 전송'}
                          {locale === 'zh-CN' && '通过电子邮件发送通知'}
                          {locale === 'en' && 'Send notifications via email'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationConfig.emailEnabled}
                      onCheckedChange={(checked) => setNotificationConfig({...notificationConfig, emailEnabled: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium">{t('notifications.channels.sms')}</p>
                        <p className="text-sm text-gray-600">
                          {locale === 'ko' && 'SMS로 알림 전송'}
                          {locale === 'zh-CN' && '通过短信发送通知'}
                          {locale === 'en' && 'Send notifications via SMS'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationConfig.smsEnabled}
                      onCheckedChange={(checked) => setNotificationConfig({...notificationConfig, smsEnabled: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium">{t('notifications.channels.push')}</p>
                        <p className="text-sm text-gray-600">
                          {locale === 'ko' && '푸시 알림 전송'}
                          {locale === 'zh-CN' && '发送推送通知'}
                          {locale === 'en' && 'Send push notifications'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationConfig.pushEnabled}
                      onCheckedChange={(checked) => setNotificationConfig({...notificationConfig, pushEnabled: checked})}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">
                  {locale === 'ko' && '알림 유형'}
                  {locale === 'zh-CN' && '通知类型'}
                  {locale === 'en' && 'Notification Types'}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="orderConfirmation">
                      {locale === 'ko' && '주문 확인'}
                      {locale === 'zh-CN' && '订单确认'}
                      {locale === 'en' && 'Order Confirmation'}
                    </Label>
                    <Switch
                      id="orderConfirmation"
                      checked={notificationConfig.orderConfirmation}
                      onCheckedChange={(checked) => setNotificationConfig({...notificationConfig, orderConfirmation: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="shippingNotification">
                      {locale === 'ko' && '배송 알림'}
                      {locale === 'zh-CN' && '发货通知'}
                      {locale === 'en' && 'Shipping Notification'}
                    </Label>
                    <Switch
                      id="shippingNotification"
                      checked={notificationConfig.shippingNotification}
                      onCheckedChange={(checked) => setNotificationConfig({...notificationConfig, shippingNotification: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="deliveryNotification">
                      {locale === 'ko' && '배송 완료'}
                      {locale === 'zh-CN' && '送达通知'}
                      {locale === 'en' && 'Delivery Notification'}
                    </Label>
                    <Switch
                      id="deliveryNotification"
                      checked={notificationConfig.deliveryNotification}
                      onCheckedChange={(checked) => setNotificationConfig({...notificationConfig, deliveryNotification: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="lowStockAlert">
                      {locale === 'ko' && '재고 부족'}
                      {locale === 'zh-CN' && '库存不足'}
                      {locale === 'en' && 'Low Stock Alert'}
                    </Label>
                    <Switch
                      id="lowStockAlert"
                      checked={notificationConfig.lowStockAlert}
                      onCheckedChange={(checked) => setNotificationConfig({...notificationConfig, lowStockAlert: checked})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSystemConfig} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {t('common.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.security')}</CardTitle>
              <CardDescription>
                {locale === 'ko' && '보안 설정을 관리합니다'}
                {locale === 'zh-CN' && '管理安全设置'}
                {locale === 'en' && 'Manage security settings'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">
                  {locale === 'ko' && '인증 설정'}
                  {locale === 'zh-CN' && '认证设置'}
                  {locale === 'en' && 'Authentication Settings'}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">
                      {locale === 'ko' && '세션 타임아웃 (분)'}
                      {locale === 'zh-CN' && '会话超时（分钟）'}
                      {locale === 'en' && 'Session Timeout (minutes)'}
                    </Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={systemConfig.sessionTimeout}
                      onChange={(e) => setSystemConfig({...systemConfig, sessionTimeout: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">
                      {locale === 'ko' && '최대 로그인 시도'}
                      {locale === 'zh-CN' && '最大登录尝试次数'}
                      {locale === 'en' && 'Max Login Attempts'}
                    </Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={systemConfig.maxLoginAttempts}
                      onChange={(e) => setSystemConfig({...systemConfig, maxLoginAttempts: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">
                      {locale === 'ko' && '최소 비밀번호 길이'}
                      {locale === 'zh-CN' && '最小密码长度'}
                      {locale === 'en' && 'Min Password Length'}
                    </Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={systemConfig.passwordMinLength}
                      onChange={(e) => setSystemConfig({...systemConfig, passwordMinLength: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">
                  {locale === 'ko' && '보안 옵션'}
                  {locale === 'zh-CN' && '安全选项'}
                  {locale === 'en' && 'Security Options'}
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {locale === 'ko' && '2단계 인증'}
                        {locale === 'zh-CN' && '双因素认证'}
                        {locale === 'en' && 'Two-Factor Authentication'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {locale === 'ko' && '추가 보안을 위한 2단계 인증 사용'}
                        {locale === 'zh-CN' && '使用双因素认证以提高安全性'}
                        {locale === 'en' && 'Use two-factor authentication for additional security'}
                      </p>
                    </div>
                    <Switch
                      checked={systemConfig.twoFactorAuth}
                      onCheckedChange={(checked) => setSystemConfig({...systemConfig, twoFactorAuth: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {locale === 'ko' && '이메일 인증 필수'}
                        {locale === 'zh-CN' && '需要电子邮件验证'}
                        {locale === 'en' && 'Require Email Verification'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {locale === 'ko' && '새 계정에 이메일 인증 요구'}
                        {locale === 'zh-CN' && '新账户需要电子邮件验证'}
                        {locale === 'en' && 'Require email verification for new accounts'}
                      </p>
                    </div>
                    <Switch
                      checked={systemConfig.requireEmailVerification}
                      onCheckedChange={(checked) => setSystemConfig({...systemConfig, requireEmailVerification: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {locale === 'ko' && '회원가입 허용'}
                        {locale === 'zh-CN' && '允许注册'}
                        {locale === 'en' && 'Allow Registration'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {locale === 'ko' && '새 사용자 회원가입 허용'}
                        {locale === 'zh-CN' && '允许新用户注册'}
                        {locale === 'en' && 'Allow new user registration'}
                      </p>
                    </div>
                    <Switch
                      checked={systemConfig.allowRegistration}
                      onCheckedChange={(checked) => setSystemConfig({...systemConfig, allowRegistration: checked})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSystemConfig} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {t('common.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup & Recovery */}
        <TabsContent value="backup" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="w-5 h-5 mr-2" />
                  {locale === 'ko' && '백업'}
                  {locale === 'zh-CN' && '备份'}
                  {locale === 'en' && 'Backup'}
                </CardTitle>
                <CardDescription>
                  {locale === 'ko' && '시스템 데이터를 백업합니다'}
                  {locale === 'zh-CN' && '备份系统数据'}
                  {locale === 'en' && 'Backup system data'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoBackup">
                      {locale === 'ko' && '자동 백업'}
                      {locale === 'zh-CN' && '自动备份'}
                      {locale === 'en' && 'Auto Backup'}
                    </Label>
                    <Switch
                      id="autoBackup"
                      checked={systemConfig.autoBackup}
                      onCheckedChange={(checked) => setSystemConfig({...systemConfig, autoBackup: checked})}
                    />
                  </div>

                  {systemConfig.autoBackup && (
                    <div className="space-y-2">
                      <Label htmlFor="backupFrequency">
                        {locale === 'ko' && '백업 주기'}
                        {locale === 'zh-CN' && '备份频率'}
                        {locale === 'en' && 'Backup Frequency'}
                      </Label>
                      <Select value={systemConfig.backupFrequency} onValueChange={(value) => setSystemConfig({...systemConfig, backupFrequency: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">
                            {locale === 'ko' && '매일'}
                            {locale === 'zh-CN' && '每日'}
                            {locale === 'en' && 'Daily'}
                          </SelectItem>
                          <SelectItem value="weekly">
                            {locale === 'ko' && '매주'}
                            {locale === 'zh-CN' && '每周'}
                            {locale === 'en' && 'Weekly'}
                          </SelectItem>
                          <SelectItem value="monthly">
                            {locale === 'ko' && '매월'}
                            {locale === 'zh-CN' && '每月'}
                            {locale === 'en' && 'Monthly'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={backupDatabase}
                    disabled={loading}
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4 mr-2" />
                    )}
                    {locale === 'ko' && '전체 백업 시작'}
                    {locale === 'zh-CN' && '开始完整备份'}
                    {locale === 'en' && 'Start Full Backup'}
                  </Button>

                  <div className="text-sm text-gray-600">
                    {locale === 'ko' && '마지막 백업: 2024-01-20 14:30'}
                    {locale === 'zh-CN' && '最后备份：2024-01-20 14:30'}
                    {locale === 'en' && 'Last backup: 2024-01-20 14:30'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  {locale === 'ko' && '복원'}
                  {locale === 'zh-CN' && '恢复'}
                  {locale === 'en' && 'Restore'}
                </CardTitle>
                <CardDescription>
                  {locale === 'ko' && '백업에서 시스템을 복원합니다'}
                  {locale === 'zh-CN' && '从备份恢复系统'}
                  {locale === 'en' && 'Restore system from backup'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      {locale === 'ko' && '백업 파일 업로드'}
                      {locale === 'zh-CN' && '上传备份文件'}
                      {locale === 'en' && 'Upload Backup File'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                        {locale === 'ko' && '복원 경고'}
                        {locale === 'zh-CN' && '恢复警告'}
                        {locale === 'en' && 'Restore Warning'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {locale === 'ko' && '복원을 진행하면 현재의 모든 데이터가 백업 파일의 데이터로 대체됩니다. 이 작업은 되돌릴 수 없습니다.'}
                        {locale === 'zh-CN' && '恢复将用备份文件中的数据替换所有当前数据。此操作无法撤消。'}
                        {locale === 'en' && 'Restoring will replace all current data with data from the backup file. This action cannot be undone.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                        {locale === 'ko' && '복원 진행'}
                        {locale === 'zh-CN' && '继续恢复'}
                        {locale === 'en' && 'Proceed with Restore'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">
                    {locale === 'ko' && '최근 백업'}
                    {locale === 'zh-CN' && '最近备份'}
                    {locale === 'en' && 'Recent Backups'}
                  </h4>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 border rounded hover:bg-gray-50">
                        <span className="text-sm">backup_2024-01-20_1430.sql</span>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-center p-2 border rounded hover:bg-gray-50">
                        <span className="text-sm">backup_2024-01-19_1430.sql</span>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-center p-2 border rounded hover:bg-gray-50">
                        <span className="text-sm">backup_2024-01-18_1430.sql</span>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                {locale === 'ko' && '데이터 내보내기'}
                {locale === 'zh-CN' && '数据导出'}
                {locale === 'en' && 'Data Export'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' && '시스템 데이터를 Excel 파일로 내보냅니다'}
                {locale === 'zh-CN' && '将系统数据导出为 Excel 文件'}
                {locale === 'en' && 'Export system data to Excel files'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => exportData('orders')}
                  disabled={loading}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {t('navigation.orders')}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => exportData('products')}
                  disabled={loading}
                >
                  <Package className="w-4 h-4 mr-2" />
                  {t('navigation.products')}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => exportData('customers')}
                  disabled={loading}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {t('navigation.customers')}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => exportData('all')}
                  disabled={loading}
                >
                  <Database className="w-4 h-4 mr-2" />
                  {locale === 'ko' && '전체'}
                  {locale === 'zh-CN' && '全部'}
                  {locale === 'en' && 'All'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}