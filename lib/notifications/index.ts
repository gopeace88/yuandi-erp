/**
 * 통합 알림 서비스
 * 이메일, SMS, 푸시 알림을 통합 관리
 */

import {
  sendEmail,
  sendNotificationEmail,
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendLowStockAlert,
  sendSystemAlert,
  validateEmail
} from './email';

import {
  sendSMS,
  sendNotificationSMS,
  sendOrderConfirmationSMS,
  sendOrderShippedSMS,
  sendOrderDeliveredSMS,
  sendLowStockSMS,
  sendSystemAlertSMS,
  normalizeKoreanPhoneNumber,
  validatePhoneNumber
} from './sms';

// 알림 채널 타입
export type NotificationChannel = 'email' | 'sms' | 'push' | 'all';

// 알림 우선순위
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// 알림 타입
export type NotificationType = 
  | 'order_confirmation'
  | 'order_shipped' 
  | 'order_delivered'
  | 'order_cancelled'
  | 'order_refunded'
  | 'payment_failed'
  | 'low_stock'
  | 'system_alert'
  | 'maintenance'
  | 'promotion'
  | 'welcome'
  | 'password_reset';

// 사용자 알림 설정
export interface UserNotificationSettings {
  userId: string;
  email?: string;
  phone?: string;
  preferences: {
    [key in NotificationType]: {
      enabled: boolean;
      channels: NotificationChannel[];
    };
  };
  timezone: string;
  language: 'ko' | 'en' | 'zh-CN';
}

// 알림 요청
export interface NotificationRequest {
  type: NotificationType;
  recipient: {
    email?: string;
    phone?: string;
    userId?: string;
  };
  data: Record<string, any>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  scheduledAt?: Date;
  retryCount?: number;
}

// 알림 결과
export interface NotificationResult {
  success: boolean;
  channels: {
    email?: { sent: boolean; messageId?: string; error?: string };
    sms?: { sent: boolean; messageId?: string; error?: string };
    push?: { sent: boolean; messageId?: string; error?: string };
  };
  totalSent: number;
  totalFailed: number;
}

// 알림 큐 항목
interface QueuedNotification extends NotificationRequest {
  id: string;
  createdAt: Date;
  attempts: number;
  lastAttempt?: Date;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
}

// 메모리 기반 알림 큐 (실제로는 Redis나 데이터베이스 사용)
const notificationQueue: QueuedNotification[] = [];

// 기본 사용자 알림 설정
const defaultNotificationSettings: UserNotificationSettings['preferences'] = {
  order_confirmation: { enabled: true, channels: ['email', 'sms'] },
  order_shipped: { enabled: true, channels: ['email', 'sms'] },
  order_delivered: { enabled: true, channels: ['sms'] },
  order_cancelled: { enabled: true, channels: ['email', 'sms'] },
  order_refunded: { enabled: true, channels: ['email'] },
  payment_failed: { enabled: true, channels: ['email', 'sms'] },
  low_stock: { enabled: true, channels: ['email'] },
  system_alert: { enabled: true, channels: ['email'] },
  maintenance: { enabled: true, channels: ['email'] },
  promotion: { enabled: false, channels: ['email'] },
  welcome: { enabled: true, channels: ['email'] },
  password_reset: { enabled: true, channels: ['email'] }
};

// 사용자 알림 설정 조회
export async function getUserNotificationSettings(userId: string): Promise<UserNotificationSettings> {
  // 실제로는 데이터베이스에서 조회
  return {
    userId,
    preferences: defaultNotificationSettings,
    timezone: 'Asia/Seoul',
    language: 'ko'
  };
}

// 사용자 알림 설정 업데이트
export async function updateUserNotificationSettings(
  userId: string,
  settings: Partial<UserNotificationSettings>
): Promise<boolean> {
  try {
    // 실제로는 데이터베이스 업데이트
    console.log('Updating notification settings for user:', userId, settings);
    return true;
  } catch (error) {
    console.error('Failed to update notification settings:', error);
    return false;
  }
}

// 통합 알림 발송
export async function sendNotification(request: NotificationRequest): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: false,
    channels: {},
    totalSent: 0,
    totalFailed: 0
  };

  try {
    // 사용자 설정 확인
    let userSettings: UserNotificationSettings | null = null;
    if (request.recipient.userId) {
      userSettings = await getUserNotificationSettings(request.recipient.userId);
    }

    // 채널 결정
    let channels = request.channels || ['email'];
    if (userSettings?.preferences[request.type]) {
      const userPrefs = userSettings.preferences[request.type];
      if (!userPrefs.enabled) {
        result.success = true; // 사용자가 비활성화함
        return result;
      }
      channels = userPrefs.channels;
    }

    // 각 채널별 발송
    for (const channel of channels) {
      try {
        if (channel === 'email' && request.recipient.email) {
          const emailSent = await sendEmailNotification(request.type, request.recipient.email, request.data);
          result.channels.email = { sent: emailSent };
          if (emailSent) result.totalSent++;
          else result.totalFailed++;
        }
        
        if (channel === 'sms' && request.recipient.phone) {
          const smsSent = await sendSMSNotification(request.type, request.recipient.phone, request.data);
          result.channels.sms = { sent: smsSent };
          if (smsSent) result.totalSent++;
          else result.totalFailed++;
        }
        
        // 푸시 알림은 향후 구현
        if (channel === 'push') {
          result.channels.push = { sent: false, error: 'Push notifications not implemented' };
          result.totalFailed++;
        }
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error);
        if (channel === 'email') {
          result.channels.email = { sent: false, error: error instanceof Error ? error.message : 'Unknown error' };
        } else if (channel === 'sms') {
          result.channels.sms = { sent: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        result.totalFailed++;
      }
    }

    result.success = result.totalSent > 0;
    
    // 로깅
    console.log('Notification result:', {
      type: request.type,
      recipient: request.recipient,
      result
    });

    return result;
  } catch (error) {
    console.error('Failed to send notification:', error);
    result.totalFailed = 1;
    return result;
  }
}

// 이메일 알림 발송
async function sendEmailNotification(type: NotificationType, email: string, data: Record<string, any>): Promise<boolean> {
  if (!validateEmail(email)) {
    console.error('Invalid email address:', email);
    return false;
  }

  switch (type) {
    case 'order_confirmation':
      return await sendOrderConfirmationEmail(email, data);
    case 'order_shipped':
      return await sendOrderShippedEmail(email, data);
    case 'order_delivered':
      return await sendOrderDeliveredEmail(email, data);
    case 'low_stock':
      return await sendLowStockAlert([email], data);
    case 'system_alert':
      return await sendSystemAlert([email], data);
    default:
      return await sendNotificationEmail(type as any, email, data);
  }
}

// SMS 알림 발송
async function sendSMSNotification(type: NotificationType, phone: string, data: Record<string, any>): Promise<boolean> {
  if (!validatePhoneNumber(phone)) {
    console.error('Invalid phone number:', phone);
    return false;
  }

  switch (type) {
    case 'order_confirmation':
      return await sendOrderConfirmationSMS(phone, data);
    case 'order_shipped':
      return await sendOrderShippedSMS(phone, data);
    case 'order_delivered':
      return await sendOrderDeliveredSMS(phone, data);
    case 'low_stock':
      return await sendLowStockSMS(phone, data);
    case 'system_alert':
      return await sendSystemAlertSMS(phone, data);
    default:
      return await sendNotificationSMS(type as any, phone, data);
  }
}

// 예약된 알림 발송
export async function scheduleNotification(request: NotificationRequest): Promise<string> {
  const queuedItem: QueuedNotification = {
    ...request,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    attempts: 0,
    status: 'pending'
  };

  notificationQueue.push(queuedItem);
  
  console.log('Notification scheduled:', queuedItem.id);
  return queuedItem.id;
}

// 알림 큐 처리 (백그라운드 작업)
export async function processNotificationQueue(): Promise<void> {
  const now = new Date();
  const pendingItems = notificationQueue.filter(item => 
    item.status === 'pending' && 
    (!item.scheduledAt || item.scheduledAt <= now)
  );

  for (const item of pendingItems) {
    item.status = 'processing';
    item.attempts++;
    item.lastAttempt = now;

    try {
      const result = await sendNotification(item);
      item.status = result.success ? 'sent' : 'failed';
    } catch (error) {
      console.error('Failed to process queued notification:', error);
      item.status = 'failed';
    }

    // 재시도 로직
    if (item.status === 'failed' && item.attempts < (item.retryCount || 3)) {
      item.status = 'pending';
      item.scheduledAt = new Date(now.getTime() + Math.pow(2, item.attempts) * 60000); // 지수 백오프
    }
  }
}

// 대량 알림 발송
export async function sendBulkNotifications(
  notifications: NotificationRequest[],
  batchSize: number = 10
): Promise<{ success: number; failed: number }> {
  const results = { success: 0, failed: 0 };

  for (let i = 0; i < notifications.length; i += batchSize) {
    const batch = notifications.slice(i, i + batchSize);
    const promises = batch.map(notification => sendNotification(notification));
    
    const batchResults = await Promise.allSettled(promises);
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        results.success++;
      } else {
        results.failed++;
      }
    });

    // 배치 간 대기
    if (i + batchSize < notifications.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// 주문 관련 통합 알림
export async function sendOrderNotification(
  type: 'confirmation' | 'shipped' | 'delivered',
  orderData: {
    customerEmail?: string;
    customerPhone?: string;
    customerName: string;
    orderNumber: string;
    [key: string]: any;
  },
  channels: NotificationChannel[] = ['email', 'sms']
): Promise<NotificationResult> {
  const notificationType = `order_${type}` as NotificationType;
  
  return await sendNotification({
    type: notificationType,
    recipient: {
      email: orderData.customerEmail,
      phone: orderData.customerPhone
    },
    data: orderData,
    channels,
    priority: 'normal'
  });
}

// 시스템 알림 (관리자용)
export async function sendAdminAlert(
  alertData: {
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details?: string;
  },
  adminContacts: { email?: string; phone?: string }[]
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];
  
  for (const contact of adminContacts) {
    const result = await sendNotification({
      type: 'system_alert',
      recipient: contact,
      data: {
        alertType: alertData.type,
        alertTitle: `시스템 알림 - ${alertData.type}`,
        alertMessage: alertData.message,
        severity: alertData.severity,
        critical: alertData.severity === 'critical',
        timestamp: new Date().toLocaleString('ko-KR'),
        details: alertData.details
      },
      channels: alertData.severity === 'critical' ? ['email', 'sms'] : ['email'],
      priority: alertData.severity === 'critical' ? 'urgent' : 'high'
    });
    
    results.push(result);
  }
  
  return results;
}

// 알림 통계
export async function getNotificationStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalSent: number;
  totalFailed: number;
  byChannel: Record<string, { sent: number; failed: number }>;
  byType: Record<string, { sent: number; failed: number }>;
}> {
  // 실제로는 데이터베이스나 로그에서 조회
  return {
    totalSent: 0,
    totalFailed: 0,
    byChannel: {
      email: { sent: 0, failed: 0 },
      sms: { sent: 0, failed: 0 },
      push: { sent: 0, failed: 0 }
    },
    byType: {
      order_confirmation: { sent: 0, failed: 0 },
      order_shipped: { sent: 0, failed: 0 },
      order_delivered: { sent: 0, failed: 0 }
    }
  };
}

// 알림 서비스 상태 확인
export async function getNotificationServiceStatus(): Promise<{
  email: { available: boolean; lastCheck: Date };
  sms: { available: boolean; lastCheck: Date };
  push: { available: boolean; lastCheck: Date };
}> {
  const now = new Date();
  
  return {
    email: {
      available: !!process.env.RESEND_API_KEY,
      lastCheck: now
    },
    sms: {
      available: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      lastCheck: now
    },
    push: {
      available: false, // 아직 구현 안됨
      lastCheck: now
    }
  };
}

// 주기적 큐 처리 시작
let queueProcessorInterval: NodeJS.Timeout | null = null;

export function startNotificationQueueProcessor(intervalMs: number = 30000): void {
  if (queueProcessorInterval) {
    clearInterval(queueProcessorInterval);
  }
  
  queueProcessorInterval = setInterval(processNotificationQueue, intervalMs);
  console.log('Notification queue processor started');
}

export function stopNotificationQueueProcessor(): void {
  if (queueProcessorInterval) {
    clearInterval(queueProcessorInterval);
    queueProcessorInterval = null;
    console.log('Notification queue processor stopped');
  }
}

// 내보내기
export * from './email';
export * from './sms';