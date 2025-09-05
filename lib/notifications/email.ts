/**
 * 이메일 알림 서비스
 * Resend API를 사용한 이메일 발송
 */

import { Resend } from 'resend';

// Resend 클라이언트 초기화 - API 키가 없으면 더미 값 사용
const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_build');

// 이메일 템플릿 타입
export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

// 이메일 발송 옵션
export interface SendEmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  template?: EmailTemplate;
  data?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

// 알림 타입별 템플릿
export const EMAIL_TEMPLATES = {
  // 주문 관련
  orderConfirmation: {
    subject: '[YUANDI] 주문이 접수되었습니다 - #{orderNumber}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">YUANDI Collection</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #333;">주문 접수 완료</h2>
          <p>안녕하세요, <strong>{{customerName}}</strong>님!</p>
          <p>주문이 성공적으로 접수되었습니다.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">주문 정보</h3>
            <p><strong>주문번호:</strong> {{orderNumber}}</p>
            <p><strong>주문일시:</strong> {{orderDate}}</p>
            <p><strong>총 금액:</strong> {{totalAmount}} KRW</p>
          </div>
          
          <h3>주문 상품</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">상품명</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">수량</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">금액</th>
              </tr>
            </thead>
            <tbody>
              {{#each items}}
              <tr>
                <td style="padding: 10px; border: 1px solid #dee2e6;">{{productName}}</td>
                <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">{{quantity}}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">{{price}} KRW</td>
              </tr>
              {{/each}}
            </tbody>
          </table>
          
          <div style="margin: 30px 0; padding: 15px; background: #e3f2fd; border-radius: 5px;">
            <p style="margin: 0;"><strong>배송 주소:</strong></p>
            <p style="margin: 5px 0;">{{shippingAddress}}</p>
          </div>
          
          <p>주문 처리 및 배송까지 통상 3-5일 소요됩니다.</p>
          <p>궁금한 점이 있으시면 언제든 연락주세요!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>YUANDI Collection | 해외구매대행 서비스</p>
          <p>문의: info@yuandi.com | 전화: +82-10-0000-0000</p>
        </div>
      </div>
    `
  },

  orderShipped: {
    subject: '[YUANDI] 주문 상품이 발송되었습니다 - #{orderNumber}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">YUANDI Collection</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #28a745;">🚚 배송 시작</h2>
          <p>안녕하세요, <strong>{{customerName}}</strong>님!</p>
          <p>주문하신 상품이 발송되었습니다.</p>
          
          <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #155724;">배송 정보</h3>
            <p><strong>주문번호:</strong> {{orderNumber}}</p>
            <p><strong>택배사:</strong> {{courier}}</p>
            <p><strong>운송장 번호:</strong> <a href="{{trackingUrl}}" style="color: #007bff;">{{trackingNumber}}</a></p>
            <p><strong>발송일시:</strong> {{shippedDate}}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{trackingUrl}}" 
               style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              배송 추적하기
            </a>
          </div>
          
          <p>배송까지 통상 1-2일 소요됩니다.</p>
          <p>상품 수령 후 문제가 있으시면 즉시 연락주세요!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>YUANDI Collection | 해외구매대행 서비스</p>
          <p>문의: info@yuandi.com | 전화: +82-10-0000-0000</p>
        </div>
      </div>
    `
  },

  orderDelivered: {
    subject: '[YUANDI] 주문 상품이 배송 완료되었습니다 - #{orderNumber}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">YUANDI Collection</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #28a745;">✅ 배송 완료</h2>
          <p>안녕하세요, <strong>{{customerName}}</strong>님!</p>
          <p>주문하신 상품의 배송이 완료되었습니다.</p>
          
          <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #155724;">주문 정보</h3>
            <p><strong>주문번호:</strong> {{orderNumber}}</p>
            <p><strong>배송완료일:</strong> {{deliveredDate}}</p>
          </div>
          
          <p>상품을 잘 받으셨나요? 만족스러운 서비스였기를 바랍니다!</p>
          <p>상품에 문제가 있거나 궁금한 점이 있으시면 언제든 연락주세요.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666;">서비스 만족도 조사에 참여해주세요!</p>
            <a href="{{feedbackUrl}}" 
               style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              후기 작성하기
            </a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>YUANDI Collection | 해외구매대행 서비스</p>
          <p>문의: info@yuandi.com | 전화: +82-10-0000-0000</p>
        </div>
      </div>
    `
  },

  // 재고 관련
  lowStockAlert: {
    subject: '[YUANDI] 재고 부족 알림 - 관리자',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">⚠️ 재고 부족 알림</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <p>다음 상품들의 재고가 부족합니다:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">상품명</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">현재 재고</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">최소 재고</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">상태</th>
              </tr>
            </thead>
            <tbody>
              {{#each products}}
              <tr>
                <td style="padding: 10px; border: 1px solid #dee2e6;">{{name}}</td>
                <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">{{currentStock}}</td>
                <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">{{minStock}}</td>
                <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">
                  <span style="color: {{#if critical}}#dc3545{{else}}#ffc107{{/if}}; font-weight: bold;">
                    {{#if critical}}위험{{else}}주의{{/if}}
                  </span>
                </td>
              </tr>
              {{/each}}
            </tbody>
          </table>
          
          <p><strong>즉시 재고 보충이 필요합니다!</strong></p>
        </div>
      </div>
    `
  },

  // 시스템 알림
  systemAlert: {
    subject: '[YUANDI] 시스템 알림 - {{alertType}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: {{#if critical}}#dc3545{{else}}#ffc107{{/if}}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">{{#if critical}}🚨{{else}}⚠️{{/if}} 시스템 알림</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2>{{alertTitle}}</h2>
          <p>{{alertMessage}}</p>
          
          {{#if details}}
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>상세 정보</h3>
            <pre style="white-space: pre-wrap; font-family: monospace;">{{details}}</pre>
          </div>
          {{/if}}
          
          <p><strong>발생 시간:</strong> {{timestamp}}</p>
          <p><strong>심각도:</strong> {{severity}}</p>
        </div>
      </div>
    `
  }
};

// Handlebars 템플릿 컴파일
function compileTemplate(template: string, data: Record<string, any>): string {
  let compiled = template;
  
  // 간단한 Handlebars 스타일 템플릿 처리
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    compiled = compiled.replace(regex, String(value || ''));
  });
  
  // 배열 처리 (#each)
  const eachRegex = /{{#each (\w+)}}([\s\S]*?){{\/each}}/g;
  compiled = compiled.replace(eachRegex, (match, arrayKey, innerTemplate) => {
    const arrayData = data[arrayKey];
    if (!Array.isArray(arrayData)) return '';
    
    return arrayData.map(item => {
      let itemTemplate = innerTemplate;
      Object.entries(item).forEach(([itemKey, itemValue]) => {
        const itemRegex = new RegExp(`{{${itemKey}}}`, 'g');
        itemTemplate = itemTemplate.replace(itemRegex, String(itemValue || ''));
      });
      return itemTemplate;
    }).join('');
  });
  
  // 조건문 처리 (#if)
  const ifRegex = /{{#if (\w+)}}([\s\S]*?)(?:{{else}}([\s\S]*?))?{{\/if}}/g;
  compiled = compiled.replace(ifRegex, (match, conditionKey, trueTemplate, falseTemplate = '') => {
    const condition = data[conditionKey];
    return condition ? trueTemplate : falseTemplate;
  });
  
  return compiled;
}

// 이메일 발송 함수
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const fromEmail = options.from || process.env.FROM_EMAIL || 'noreply@yuandi.com';
    
    let html = options.html;
    let subject = options.subject;
    
    // 템플릿 사용 시 컴파일
    if (options.template && options.data) {
      html = compileTemplate(options.template.html, options.data);
      subject = compileTemplate(options.template.subject, options.data);
    }
    
    const emailData = {
      from: fromEmail,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject,
      html,
      text: options.text,
      attachments: options.attachments
    };
    
    const result = await resend.emails.send(emailData);
    
    console.log('Email sent successfully:', {
      id: result.data?.id,
      to: options.to,
      subject
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// 특정 타입의 알림 이메일 발송
export async function sendNotificationEmail(
  type: keyof typeof EMAIL_TEMPLATES,
  to: string | string[],
  data: Record<string, any>
): Promise<boolean> {
  const template = EMAIL_TEMPLATES[type];
  if (!template) {
    throw new Error(`Unknown email template: ${type}`);
  }
  
  return await sendEmail({
    to,
    template,
    data
  });
}

// 주문 확인 이메일
export async function sendOrderConfirmationEmail(
  customerEmail: string,
  orderData: {
    customerName: string;
    orderNumber: string;
    orderDate: string;
    totalAmount: string;
    items: Array<{ productName: string; quantity: number; price: string }>;
    shippingAddress: string;
  }
): Promise<boolean> {
  return await sendNotificationEmail('orderConfirmation', customerEmail, orderData);
}

// 배송 시작 이메일
export async function sendOrderShippedEmail(
  customerEmail: string,
  shippingData: {
    customerName: string;
    orderNumber: string;
    courier: string;
    trackingNumber: string;
    trackingUrl: string;
    shippedDate: string;
  }
): Promise<boolean> {
  return await sendNotificationEmail('orderShipped', customerEmail, shippingData);
}

// 배송 완료 이메일
export async function sendOrderDeliveredEmail(
  customerEmail: string,
  deliveryData: {
    customerName: string;
    orderNumber: string;
    deliveredDate: string;
    feedbackUrl?: string;
  }
): Promise<boolean> {
  return await sendNotificationEmail('orderDelivered', customerEmail, deliveryData);
}

// 재고 부족 알림 이메일 (관리자용)
export async function sendLowStockAlert(
  adminEmails: string[],
  stockData: {
    products: Array<{
      name: string;
      currentStock: number;
      minStock: number;
      critical: boolean;
    }>;
  }
): Promise<boolean> {
  return await sendNotificationEmail('lowStockAlert', adminEmails, stockData);
}

// 시스템 알림 이메일
export async function sendSystemAlert(
  adminEmails: string[],
  alertData: {
    alertType: string;
    alertTitle: string;
    alertMessage: string;
    details?: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    critical: boolean;
  }
): Promise<boolean> {
  return await sendNotificationEmail('systemAlert', adminEmails, alertData);
}

// 이메일 주소 검증
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 대량 이메일 발송 (배치)
export async function sendBulkEmails(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    data?: Record<string, any>;
  }>,
  batchSize: number = 10
): Promise<{ success: number; failed: number }> {
  const results = { success: 0, failed: 0 };
  
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const promises = batch.map(email => sendEmail(email));
    
    const batchResults = await Promise.allSettled(promises);
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        results.success++;
      } else {
        results.failed++;
      }
    });
    
    // 배치 간 대기 (레이트 리밋 방지)
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}