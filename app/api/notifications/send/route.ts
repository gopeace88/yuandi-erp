/**
 * 알림 발송 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendNotification, sendBulkNotifications, type NotificationRequest } from '@/lib/notifications';
import { headers } from 'next/headers';

// 단일 알림 발송
export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    // 인증 확인
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      type,
      recipient,
      data,
      channels,
      priority,
      scheduledAt
    }: NotificationRequest = body;

    // 요청 검증
    if (!type || !recipient || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, recipient, data' },
        { status: 400 }
      );
    }

    // 수신자 검증
    if (!recipient.email && !recipient.phone && !recipient.userId) {
      return NextResponse.json(
        { error: 'At least one recipient contact method is required' },
        { status: 400 }
      );
    }

    const notificationRequest: NotificationRequest = {
      type,
      recipient,
      data,
      channels: channels || ['email'],
      priority: priority || 'normal',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
    };

    const result = await sendNotification(notificationRequest);

    return NextResponse.json({
      success: result.success,
      result: {
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
        channels: result.channels
      }
    });

  } catch (error) {
    console.error('Notification send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 대량 알림 발송
export async function PUT(request: NextRequest) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    // 인증 확인
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notifications, batchSize = 10 }: { 
      notifications: NotificationRequest[]; 
      batchSize?: number; 
    } = body;

    // 요청 검증
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return NextResponse.json(
        { error: 'notifications must be a non-empty array' },
        { status: 400 }
      );
    }

    // 각 알림 요청 검증
    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];
      if (!notification.type || !notification.recipient || !notification.data) {
        return NextResponse.json(
          { error: `Invalid notification at index ${i}: missing required fields` },
          { status: 400 }
        );
      }
    }

    const result = await sendBulkNotifications(notifications, batchSize);

    return NextResponse.json({
      success: result.success > 0,
      result: {
        totalRequested: notifications.length,
        successful: result.success,
        failed: result.failed,
        successRate: (result.success / notifications.length * 100).toFixed(1) + '%'
      }
    });

  } catch (error) {
    console.error('Bulk notification send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}