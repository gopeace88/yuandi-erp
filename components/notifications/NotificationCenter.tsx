/**
 * 알림 센터 컴포넌트
 * 실시간 알림 목록 및 관리
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellRing,
  Check,
  CheckAll,
  Trash2,
  Filter,
  Settings,
  Mail,
  MessageSquare,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { ko } from 'date-fns/locale';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  category: 'order' | 'system' | 'marketing' | 'general';
  channel: 'email' | 'sms' | 'push' | 'web';
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

interface NotificationCenterProps {
  userId?: string;
  maxNotifications?: number;
  realtime?: boolean;
  showFilters?: boolean;
  onNotificationClick?: (notification: Notification) => void;
}

const NOTIFICATION_ICONS = {
  info: <Info className="w-4 h-4 text-blue-500" />,
  success: <CheckCircle className="w-4 h-4 text-green-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  error: <XCircle className="w-4 h-4 text-red-500" />
};

const CHANNEL_ICONS = {
  email: <Mail className="w-3 h-3" />,
  sms: <MessageSquare className="w-3 h-3" />,
  push: <Bell className="w-3 h-3" />,
  web: <Bell className="w-3 h-3" />
};

const CATEGORY_COLORS = {
  order: 'bg-blue-100 text-blue-800',
  system: 'bg-gray-100 text-gray-800',
  marketing: 'bg-purple-100 text-purple-800',
  general: 'bg-green-100 text-green-800'
};

const CATEGORY_NAMES = {
  order: '주문',
  system: '시스템',
  marketing: '마케팅',
  general: '일반'
};

export default function NotificationCenter({
  userId,
  maxNotifications = 50,
  realtime = true,
  showFilters = true,
  onNotificationClick
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    read?: boolean;
    category?: string;
    type?: string;
  }>({});
  const [markingAsRead, setMarkingAsRead] = useState<string[]>([]);

  // 알림 목록 조회
  const loadNotifications = useCallback(async () => {
    try {
      // 실제로는 API에서 조회
      // const response = await fetch(`/api/notifications?userId=${userId}`);
      
      // 모의 데이터
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'success',
          title: '주문이 완료되었습니다',
          message: '주문 번호 ORD-240101-001의 배송이 완료되었습니다.',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30분 전
          read: false,
          category: 'order',
          channel: 'sms',
          actionUrl: '/orders/ORD-240101-001',
          actionLabel: '주문 확인'
        },
        {
          id: '2',
          type: 'info',
          title: '새 상품이 입고되었습니다',
          message: '요청하신 상품이 새로 입고되었습니다. 지금 주문하세요!',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2시간 전
          read: false,
          category: 'general',
          channel: 'email',
          actionUrl: '/products',
          actionLabel: '상품 보기'
        },
        {
          id: '3',
          type: 'warning',
          title: '배송 지연 안내',
          message: '주문 ORD-240101-002의 배송이 지연되고 있습니다.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5시간 전
          read: true,
          category: 'order',
          channel: 'email'
        },
        {
          id: '4',
          type: 'info',
          title: '시스템 점검 예정',
          message: '오늘 밤 12시부터 2시간 동안 시스템 점검이 예정되어 있습니다.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1일 전
          read: true,
          category: 'system',
          channel: 'web'
        },
        {
          id: '5',
          type: 'success',
          title: '결제가 완료되었습니다',
          message: '주문 ORD-240101-003의 결제가 성공적으로 처리되었습니다.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2일 전
          read: true,
          category: 'order',
          channel: 'email'
        }
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 초기 로딩
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // 실시간 업데이트 (WebSocket 또는 폴링)
  useEffect(() => {
    if (!realtime) return;

    const interval = setInterval(loadNotifications, 30000); // 30초마다 업데이트
    return () => clearInterval(interval);
  }, [loadNotifications, realtime]);

  // 필터링된 알림 목록
  const filteredNotifications = notifications.filter(notification => {
    if (filter.read !== undefined && notification.read !== filter.read) return false;
    if (filter.category && notification.category !== filter.category) return false;
    if (filter.type && notification.type !== filter.type) return false;
    return true;
  }).slice(0, maxNotifications);

  // 읽지 않은 알림 수
  const unreadCount = notifications.filter(n => !n.read).length;

  // 알림을 읽음 처리
  const markAsRead = async (notificationId: string) => {
    if (markingAsRead.includes(notificationId)) return;

    setMarkingAsRead(prev => [...prev, notificationId]);
    
    try {
      // 실제로는 API 호출
      // await fetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setMarkingAsRead(prev => prev.filter(id => id !== notificationId));
    }
  };

  // 모든 알림을 읽음 처리
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    setMarkingAsRead(unreadIds);
    
    try {
      // 실제로는 API 호출
      // await fetch(`/api/notifications/mark-all-read`, { method: 'PATCH' });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    } finally {
      setMarkingAsRead([]);
    }
  };

  // 알림 삭제
  const deleteNotification = async (notificationId: string) => {
    try {
      // 실제로는 API 호출
      // await fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' });
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // 알림 클릭 처리
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    onNotificationClick?.(notification);
  };

  // 시간 포맷팅
  const formatTimestamp = (timestamp: string) => {
    return formatDistance(new Date(timestamp), new Date(), { 
      addSuffix: true, 
      locale: ko 
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {unreadCount > 0 ? (
              <BellRing className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
            <CardTitle>알림</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={markingAsRead.length > 0}
              >
                <CheckAll className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {showFilters && (
        <div className="px-6 pb-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex space-x-1">
              <Button
                variant={filter.read === undefined ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(prev => ({ ...prev, read: undefined }))}
              >
                전체
              </Button>
              <Button
                variant={filter.read === false ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(prev => ({ ...prev, read: false }))}
              >
                읽지 않음
              </Button>
              <Button
                variant={filter.read === true ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(prev => ({ ...prev, read: true }))}
              >
                읽음
              </Button>
            </div>
          </div>
        </div>
      )}

      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600">알림을 불러오는 중...</span>
              </div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">알림이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <div 
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {NOTIFICATION_ICONS[notification.type]}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${CATEGORY_COLORS[notification.category]}`}
                              >
                                {CATEGORY_NAMES[notification.category]}
                              </Badge>
                              
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                {CHANNEL_ICONS[notification.channel]}
                                <Clock className="w-3 h-3" />
                                <span>{formatTimestamp(notification.timestamp)}</span>
                              </div>
                            </div>
                            
                            {notification.actionUrl && notification.actionLabel && (
                              <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1">
                                {notification.actionLabel}
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-1 ml-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                disabled={markingAsRead.includes(notification.id)}
                                className="p-1 h-auto"
                              >
                                {markingAsRead.includes(notification.id) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="p-1 h-auto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {index < filteredNotifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}