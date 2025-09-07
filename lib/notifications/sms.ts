/**
 * SMS 알림 서비스
 * Twilio API를 사용한 SMS 발송 (선택적 의존성)
 */

// Twilio 클라이언트 초기화 (선택적)
let twilioClient: any = null;

// Twilio는 선택적 의존성이므로 동적 import 사용
async function getTwilioClient() {
  if (twilioClient) return twilioClient;

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }

  try {
    // 동적 import를 사용하여 빌드 시점에 모듈을 찾지 않도록 함
    const twilioModule = await import('twilio').catch(() => null);
    if (!twilioModule) {
      console.warn('Twilio module not available');
      return null;
    }

    twilioClient = twilioModule.default(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    return twilioClient;
  } catch (error) {
    console.warn('Twilio not available:', error);
    return null;
  }
}

// SMS 발송 옵션
export interface SendSMSOptions {
  to: string;
  message: string;
  from?: string;
}

// SMS 템플릿 타입
export interface SMSTemplate {
  message: string;
}

// 알림 타입별 SMS 템플릿
export const SMS_TEMPLATES = {
  // 주문 관련
  orderConfirmation: {
    message: '[YUANDI] {{customerName}}님, 주문 {{orderNumber}}이 접수되었습니다. 총 {{totalAmount}}원. 배송까지 3-5일 소요됩니다.'
  },

  orderShipped: {
    message: '[YUANDI] {{customerName}}님, 주문 {{orderNumber}}이 발송되었습니다. 운송장: {{trackingNumber}} ({{courier}}). 추적: {{shortTrackingUrl}}'
  },

  orderDelivered: {
    message: '[YUANDI] {{customerName}}님, 주문 {{orderNumber}}의 배송이 완료되었습니다. 이용해 주셔서 감사합니다!'
  },

  // 배송 관련
  shipmentDelay: {
    message: '[YUANDI] {{customerName}}님, 주문 {{orderNumber}}의 배송이 지연되고 있습니다. 예상 도착일: {{newDeliveryDate}}. 양해 부탁드립니다.'
  },

  // 재고 관련 (관리자용)
  lowStockAlert: {
    message: '[YUANDI 관리자] 재고 부족: {{productName}} (현재: {{currentStock}}개, 최소: {{minStock}}개). 즉시 보충 필요.'
  },

  // 시스템 알림 (관리자용)
  systemAlert: {
    message: '[YUANDI 시스템] {{alertType}}: {{alertMessage}} ({{timestamp}})'
  },

  // 고객 서비스
  customerService: {
    message: '[YUANDI] {{customerName}}님, 문의사항에 대한 답변: {{response}}'
  },

  // 프로모션
  promotion: {
    message: '[YUANDI] {{customerName}}님을 위한 특별 혜택! {{promotionTitle}} {{promotionDetails}} 자세히: {{promotionUrl}}'
  }
};

// 한국 전화번호 정규화
export function normalizeKoreanPhoneNumber(phoneNumber: string): string {
  // 공백, 하이픈 제거
  let normalized = phoneNumber.replace(/[\s-]/g, '');

  // 국가코드 처리
  if (normalized.startsWith('+82')) {
    normalized = '0' + normalized.slice(3);
  } else if (normalized.startsWith('82')) {
    normalized = '0' + normalized.slice(2);
  } else if (!normalized.startsWith('0')) {
    normalized = '0' + normalized;
  }

  // 국제 형식으로 변환
  if (normalized.startsWith('0')) {
    normalized = '+82' + normalized.slice(1);
  }

  return normalized;
}

// 전화번호 검증
export function validatePhoneNumber(phoneNumber: string): boolean {
  const normalized = normalizeKoreanPhoneNumber(phoneNumber);
  // 한국 휴대폰 번호 패턴 (+82 10-xxxx-xxxx)
  const koreanMobilePattern = /^\+8210[0-9]{8}$/;
  return koreanMobilePattern.test(normalized);
}

// 템플릿 컴파일
function compileTemplate(template: string, data: Record<string, any>): string {
  let compiled = template;

  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    compiled = compiled.replace(regex, String(value || ''));
  });

  return compiled;
}

// SMS 발송 함수
export async function sendSMS(options: SendSMSOptions): Promise<boolean> {
  try {
    // 환경 변수 확인
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('Twilio credentials not configured');
      return false;
    }

    const fromNumber = options.from || process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      console.error('Twilio phone number not configured');
      return false;
    }

    // 전화번호 정규화 및 검증
    const normalizedTo = normalizeKoreanPhoneNumber(options.to);
    if (!validatePhoneNumber(options.to)) {
      console.error('Invalid phone number:', options.to);
      return false;
    }

    // Twilio 클라이언트 가져오기
    const client = await getTwilioClient();
    if (!client) {
      console.error('Twilio client not initialized');
      return false;
    }

    // SMS 발송
    const message = await client.messages.create({
      body: options.message,
      from: fromNumber,
      to: normalizedTo
    });

    console.log('SMS sent successfully:', {
      sid: message.sid,
      to: normalizedTo,
      status: message.status
    });

    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}

// 특정 타입의 알림 SMS 발송
export async function sendNotificationSMS(
  type: keyof typeof SMS_TEMPLATES,
  to: string,
  data: Record<string, any>
): Promise<boolean> {
  const template = SMS_TEMPLATES[type];
  if (!template) {
    throw new Error(`Unknown SMS template: ${type}`);
  }

  const message = compileTemplate(template.message, data);

  return await sendSMS({
    to,
    message
  });
}

// 주문 확인 SMS
export async function sendOrderConfirmationSMS(
  customerPhone: string,
  orderData: {
    customerName: string;
    orderNumber: string;
    totalAmount: string;
  }
): Promise<boolean> {
  return await sendNotificationSMS('orderConfirmation', customerPhone, orderData);
}

// 배송 시작 SMS
export async function sendOrderShippedSMS(
  customerPhone: string,
  shippingData: {
    customerName: string;
    orderNumber: string;
    trackingNumber: string;
    courier: string;
    shortTrackingUrl: string;
  }
): Promise<boolean> {
  return await sendNotificationSMS('orderShipped', customerPhone, shippingData);
}

// 배송 완료 SMS
export async function sendOrderDeliveredSMS(
  customerPhone: string,
  deliveryData: {
    customerName: string;
    orderNumber: string;
  }
): Promise<boolean> {
  return await sendNotificationSMS('orderDelivered', customerPhone, deliveryData);
}

// 배송 지연 SMS
export async function sendShipmentDelaySMS(
  customerPhone: string,
  delayData: {
    customerName: string;
    orderNumber: string;
    newDeliveryDate: string;
  }
): Promise<boolean> {
  return await sendNotificationSMS('shipmentDelay', customerPhone, delayData);
}

// 재고 부족 알림 SMS (관리자용)
export async function sendLowStockSMS(
  adminPhone: string,
  stockData: {
    productName: string;
    currentStock: number;
    minStock: number;
  }
): Promise<boolean> {
  return await sendNotificationSMS('lowStockAlert', adminPhone, stockData);
}

// 시스템 알림 SMS (관리자용)
export async function sendSystemAlertSMS(
  adminPhone: string,
  alertData: {
    alertType: string;
    alertMessage: string;
    timestamp: string;
  }
): Promise<boolean> {
  return await sendNotificationSMS('systemAlert', adminPhone, alertData);
}

// 고객 서비스 응답 SMS
export async function sendcustomerServiceSMS(
  customerPhone: string,
  serviceData: {
    customerName: string;
    response: string;
  }
): Promise<boolean> {
  return await sendNotificationSMS('customerService', customerPhone, serviceData);
}

// 프로모션 SMS
export async function sendPromotionSMS(
  customerPhone: string,
  promotionData: {
    customerName: string;
    promotionTitle: string;
    promotionDetails: string;
    promotionUrl: string;
  }
): Promise<boolean> {
  return await sendNotificationSMS('promotion', customerPhone, promotionData);
}

// 대량 SMS 발송
export async function sendBulkSMS(
  messages: Array<{
    to: string;
    message: string;
    data?: Record<string, any>;
  }>,
  batchSize: number = 5
): Promise<{ success: number; failed: number }> {
  const results = { success: 0, failed: 0 };

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const promises = batch.map(msg => sendSMS({
      to: msg.to,
      message: msg.message
    }));

    const batchResults = await Promise.allSettled(promises);

    batchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        results.success++;
      } else {
        results.failed++;
      }
    });

    // 배치 간 대기 (레이트 리밋 방지 - SMS는 더 제한적)
    if (i + batchSize < messages.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

// URL 단축 (SMS에서 사용)
export async function shortenUrl(longUrl: string): Promise<string> {
  try {
    // 실제로는 bit.ly, tinyurl 등의 서비스를 사용
    // 여기서는 간단한 구현
    const shortCode = Math.random().toString(36).substring(2, 8);
    const shortUrl = `https://yuandi.link/${shortCode}`;

    // 실제 구현에서는 데이터베이스에 매핑 저장
    // await saveUrlMapping(shortCode, longUrl);

    return shortUrl;
  } catch (error) {
    console.error('Failed to shorten URL:', error);
    return longUrl;
  }
}

// SMS 발송 상태 확인
export async function getSMSStatus(messageSid: string): Promise<string | null> {
  try {
    const client = getTwilioClient();
    if (!client) {
      console.error('Twilio client not initialized');
      return null;
    }

    const message = await client.messages(messageSid).fetch();
    return message.status;
  } catch (error) {
    console.error('Failed to get SMS status:', error);
    return null;
  }
}

// SMS 사용량 통계
export async function getSMSUsageStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalSent: number;
  totalCost: number;
  successRate: number;
} | null> {
  try {
    const client = await getTwilioClient();
    if (!client) {
      return null;
    }

    const usage = await client.usage.records.list({
      category: 'sms',
      startDate,
      endDate
    });

    const totalSent = usage.reduce((sum, record) => sum + parseInt(record.count), 0);
    const totalCost = usage.reduce((sum, record) => sum + parseFloat(record.price), 0);

    // 성공률 계산 (실제로는 더 정교한 계산 필요)
    const successRate = 0.95; // 가정값

    return {
      totalSent,
      totalCost,
      successRate
    };
  } catch (error) {
    console.error('Failed to get SMS usage stats:', error);
    return null;
  }
}