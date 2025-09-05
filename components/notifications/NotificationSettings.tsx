/**
 * 알림 설정 컴포넌트
 * 사용자별 알림 채널 및 타입 설정
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Settings,
  Save,
  TestTube,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationChannel {
  id: 'email' | 'sms' | 'push';
  name: string;
  icon: React.ReactNode;
  description: string;
  available: boolean;
}

interface NotificationType {
  id: string;
  name: string;
  description: string;
  category: 'order' | 'system' | 'marketing';
  defaultEnabled: boolean;
  supportedChannels: ('email' | 'sms' | 'push')[];
}

interface NotificationSettings {
  userId: string;
  email?: string;
  phone?: string;
  preferences: Record<string, {
    enabled: boolean;
    channels: string[];
  }>;
  timezone: string;
  language: string;
}

interface NotificationServiceStatus {
  email: { available: boolean; lastCheck: Date };
  sms: { available: boolean; lastCheck: Date };
  push: { available: boolean; lastCheck: Date };
}

const NOTIFICATION_CHANNELS: NotificationChannel[] = [
  {
    id: 'email',
    name: '이메일',
    icon: <Mail className="w-4 h-4" />,
    description: '이메일로 상세한 알림을 받습니다',
    available: true
  },
  {
    id: 'sms',
    name: 'SMS',
    icon: <MessageSquare className="w-4 h-4" />,
    description: 'SMS 문자로 즉시 알림을 받습니다',
    available: true
  },
  {
    id: 'push',
    name: '푸시 알림',
    icon: <Smartphone className="w-4 h-4" />,
    description: '앱 푸시 알림을 받습니다 (준비 중)',
    available: false
  }
];

const NOTIFICATION_TYPES: NotificationType[] = [
  // 주문 관련
  {
    id: 'order_confirmation',
    name: '주문 접수',
    description: '주문이 접수되었을 때',
    category: 'order',
    defaultEnabled: true,
    supportedChannels: ['email', 'sms']
  },
  {
    id: 'order_shipped',
    name: '배송 시작',
    description: '상품이 발송되었을 때',
    category: 'order',
    defaultEnabled: true,
    supportedChannels: ['email', 'sms']
  },
  {
    id: 'order_delivered',
    name: '배송 완료',
    description: '상품이 배송 완료되었을 때',
    category: 'order',
    defaultEnabled: true,
    supportedChannels: ['sms']
  },
  {
    id: 'order_cancelled',
    name: '주문 취소',
    description: '주문이 취소되었을 때',
    category: 'order',
    defaultEnabled: true,
    supportedChannels: ['email', 'sms']
  },
  {
    id: 'order_refunded',
    name: '환불 처리',
    description: '환불이 처리되었을 때',
    category: 'order',
    defaultEnabled: true,
    supportedChannels: ['email']
  },
  {
    id: 'payment_failed',
    name: '결제 실패',
    description: '결제가 실패했을 때',
    category: 'order',
    defaultEnabled: true,
    supportedChannels: ['email', 'sms']
  },
  
  // 시스템 관련
  {
    id: 'maintenance',
    name: '시스템 점검',
    description: '시스템 점검이 예정되었을 때',
    category: 'system',
    defaultEnabled: true,
    supportedChannels: ['email']
  },
  {
    id: 'password_reset',
    name: '비밀번호 재설정',
    description: '비밀번호 재설정 요청 시',
    category: 'system',
    defaultEnabled: true,
    supportedChannels: ['email']
  },
  
  // 마케팅 관련
  {
    id: 'promotion',
    name: '프로모션',
    description: '할인 및 이벤트 정보',
    category: 'marketing',
    defaultEnabled: false,
    supportedChannels: ['email']
  },
  {
    id: 'newsletter',
    name: '뉴스레터',
    description: '제품 소식 및 업데이트',
    category: 'marketing',
    defaultEnabled: false,
    supportedChannels: ['email']
  }
];

interface NotificationSettingsProps {
  userId: string;
  onSave?: (settings: NotificationSettings) => void;
}

export default function NotificationSettings({ userId, onSave }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [serviceStatus, setServiceStatus] = useState<NotificationServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  // 설정 불러오기
  useEffect(() => {
    loadSettings();
    loadServiceStatus();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/notifications/settings?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        toast.error('알림 설정을 불러올 수 없습니다');
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      toast.error('알림 설정을 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const loadServiceStatus = async () => {
    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setServiceStatus(data.services);
      }
    } catch (error) {
      console.error('Failed to load service status:', error);
    }
  };

  // 설정 저장
  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast.success('알림 설정이 저장되었습니다');
        onSave?.(settings);
      } else {
        toast.error('알림 설정 저장에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      toast.error('설정 저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 알림 타입 활성화/비활성화
  const toggleNotificationType = (typeId: string) => {
    if (!settings) return;

    setSettings({
      ...settings,
      preferences: {
        ...settings.preferences,
        [typeId]: {
          ...settings.preferences[typeId],
          enabled: !settings.preferences[typeId]?.enabled
        }
      }
    });
  };

  // 알림 채널 토글
  const toggleNotificationChannel = (typeId: string, channelId: string) => {
    if (!settings) return;

    const currentChannels = settings.preferences[typeId]?.channels || [];
    const newChannels = currentChannels.includes(channelId)
      ? currentChannels.filter(c => c !== channelId)
      : [...currentChannels, channelId];

    setSettings({
      ...settings,
      preferences: {
        ...settings.preferences,
        [typeId]: {
          ...settings.preferences[typeId],
          enabled: settings.preferences[typeId]?.enabled || false,
          channels: newChannels
        }
      }
    });
  };

  // 연락처 정보 업데이트
  const updateContactInfo = (field: 'email' | 'phone', value: string) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [field]: value
    });
  };

  // 테스트 알림 발송
  const testNotification = async (channelId: string) => {
    setTestingChannel(channelId);
    
    try {
      const recipient: any = {};
      if (channelId === 'email') recipient.email = settings?.email;
      if (channelId === 'sms') recipient.phone = settings?.phone;

      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          type: 'welcome',
          recipient,
          data: {
            customerName: '테스트 사용자',
            message: '알림 설정 테스트입니다.'
          },
          channels: [channelId]
        })
      });

      if (response.ok) {
        toast.success(`${NOTIFICATION_CHANNELS.find(c => c.id === channelId)?.name} 테스트 알림이 발송되었습니다`);
      } else {
        toast.error('테스트 알림 발송에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error('테스트 알림 발송 중 오류가 발생했습니다');
    } finally {
      setTestingChannel(null);
    }
  };

  // 카테고리별 알림 타입 그룹화
  const groupedNotificationTypes = NOTIFICATION_TYPES.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, NotificationType[]>);

  const categoryNames = {
    order: '주문 관련',
    system: '시스템 관련',
    marketing: '마케팅'
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>알림 설정을 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              알림 설정을 불러올 수 없습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <CardTitle>알림 설정</CardTitle>
          </div>
          <CardDescription>
            받고 싶은 알림의 종류와 방법을 설정할 수 있습니다.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 연락처 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>연락처 정보</CardTitle>
          <CardDescription>
            알림을 받을 이메일 주소와 전화번호를 설정하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일 주소</Label>
              <Input
                id="email"
                type="email"
                value={settings.email || ''}
                onChange={(e) => updateContactInfo('email', e.target.value)}
                placeholder="example@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                type="tel"
                value={settings.phone || ''}
                onChange={(e) => updateContactInfo('phone', e.target.value)}
                placeholder="010-1234-5678"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 알림 채널 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>알림 채널 상태</CardTitle>
          <CardDescription>
            각 알림 채널의 상태를 확인하고 테스트할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {NOTIFICATION_CHANNELS.map(channel => {
              const serviceAvailable = serviceStatus?.[channel.id]?.available ?? false;
              const canTest = channel.available && serviceAvailable &&
                ((channel.id === 'email' && settings.email) ||
                 (channel.id === 'sms' && settings.phone));

              return (
                <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {channel.icon}
                    <div>
                      <p className="font-medium">{channel.name}</p>
                      <p className="text-sm text-gray-600">{channel.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={serviceAvailable ? "default" : "secondary"}
                      className={serviceAvailable ? "bg-green-100 text-green-800" : ""}
                    >
                      {serviceAvailable ? '사용 가능' : '사용 불가'}
                    </Badge>
                    {canTest && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testNotification(channel.id)}
                        disabled={testingChannel === channel.id}
                      >
                        {testingChannel === channel.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <TestTube className="w-3 h-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 알림 설정 */}
      {Object.entries(groupedNotificationTypes).map(([category, types]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{categoryNames[category as keyof typeof categoryNames]}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {types.map(type => {
                const preference = settings.preferences[type.id] || {
                  enabled: type.defaultEnabled,
                  channels: type.supportedChannels
                };

                return (
                  <div key={type.id} className="flex items-center justify-between py-4 border-b last:border-b-0">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Switch
                          checked={preference.enabled}
                          onCheckedChange={() => toggleNotificationType(type.id)}
                        />
                        <div>
                          <p className="font-medium">{type.name}</p>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                      </div>
                      
                      {preference.enabled && (
                        <div className="ml-8 flex items-center space-x-4">
                          <span className="text-sm text-gray-600">알림 방법:</span>
                          {type.supportedChannels.map(channelId => {
                            const channel = NOTIFICATION_CHANNELS.find(c => c.id === channelId);
                            if (!channel) return null;

                            const isActive = preference.channels.includes(channelId);
                            const isAvailable = channel.available && 
                              ((channelId === 'email' && settings.email) ||
                               (channelId === 'sms' && settings.phone) ||
                               channelId === 'push');

                            return (
                              <Button
                                key={channelId}
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleNotificationChannel(type.id, channelId)}
                                disabled={!isAvailable}
                                className="flex items-center space-x-1"
                              >
                                {channel.icon}
                                <span>{channel.name}</span>
                                {isActive && <CheckCircle className="w-3 h-3" />}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              설정 저장
            </>
          )}
        </Button>
      </div>
    </div>
  );
}