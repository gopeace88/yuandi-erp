/**
 * 알림 설정 관리 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserNotificationSettings, 
  updateUserNotificationSettings,
  getNotificationServiceStatus,
  type UserNotificationSettings 
} from '@/lib/notifications';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// 사용자 알림 설정 조회
export async function GET(request: NextRequest) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    // Supabase에서 사용자 확인
    const supabase = createClient();
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const settings = await getUserNotificationSettings(userId);
    
    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        email: user.email,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('Get notification settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 사용자 알림 설정 업데이트
export async function PUT(request: NextRequest) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, ...settings }: { userId: string } & Partial<UserNotificationSettings> = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Supabase에서 사용자 확인
    const supabase = createClient();
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const success = await updateUserNotificationSettings(userId, settings);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update notification settings' },
        { status: 500 }
      );
    }

    // 업데이트된 설정 반환
    const updatedSettings = await getUserNotificationSettings(userId);
    
    return NextResponse.json({
      success: true,
      settings: updatedSettings
    });

  } catch (error) {
    console.error('Update notification settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 알림 서비스 상태 조회
export async function PATCH(request: NextRequest) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const status = await getNotificationServiceStatus();
    
    return NextResponse.json({
      success: true,
      services: status
    });

  } catch (error) {
    console.error('Get notification service status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}