// 캐시 버스팅을 위한 버전 관리
export const APP_VERSION = `v${Date.now()}`;

// URL에 버전 파라미터 추가
export function addVersionParam(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${APP_VERSION}`;
}