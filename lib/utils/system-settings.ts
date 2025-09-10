// 시스템 설정 유틸리티 함수

import { createClient } from '@/lib/supabase/client';

// 클라이언트 사이드 캐싱
let cachedSettings: { [key: string]: any } = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

/**
 * 시스템 설정값 가져오기 (클라이언트 사이드)
 * 캐싱을 통해 불필요한 API 호출을 줄임
 */
export async function getSystemSetting(key: string, defaultValue: any = null) {
  try {
    // 캐시 확인
    const now = Date.now();
    if (cachedSettings[key] && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedSettings[key];
    }

    // API 호출
    const response = await fetch('/api/system-settings');
    if (!response.ok) {
      console.error('Failed to fetch system settings');
      return defaultValue;
    }

    const settings = await response.json();
    
    // 캐시 업데이트
    cacheTimestamp = now;
    settings.forEach((setting: any) => {
      cachedSettings[setting.key] = setting.value_type === 'number' 
        ? parseFloat(setting.value)
        : setting.value_type === 'boolean'
        ? setting.value === 'true'
        : setting.value;
    });

    return cachedSettings[key] || defaultValue;
  } catch (error) {
    console.error('Error fetching system setting:', error);
    return defaultValue;
  }
}

/**
 * 재고 부족 임계값 가져오기
 */
export async function getLowStockThreshold(): Promise<number> {
  const threshold = await getSystemSetting('low_stock_threshold_default', 5);
  return typeof threshold === 'number' ? threshold : 5;
}

/**
 * 시스템 설정 캐시 초기화
 */
export function clearSystemSettingsCache() {
  cachedSettings = {};
  cacheTimestamp = 0;
}

/**
 * 서버 사이드에서 시스템 설정값 가져오기 (Supabase 직접 조회)
 */
export async function getSystemSettingServer(key: string, defaultValue: any = null) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('system_settings')
      .select('value, value_type')
      .eq('key', key)
      .single() as { data: { value: string; value_type: string } | null; error: any };

    if (error || !data) {
      return defaultValue;
    }

    // 타입에 따라 값 변환
    if (data.value_type === 'number') {
      return parseFloat(data.value);
    } else if (data.value_type === 'boolean') {
      return data.value === 'true';
    }
    
    return data.value;
  } catch (error) {
    console.error('Error fetching system setting from server:', error);
    return defaultValue;
  }
}

/**
 * 서버 사이드에서 재고 부족 임계값 가져오기
 */
export async function getLowStockThresholdServer(): Promise<number> {
  const threshold = await getSystemSettingServer('low_stock_threshold_default', 5);
  return typeof threshold === 'number' ? threshold : 5;
}