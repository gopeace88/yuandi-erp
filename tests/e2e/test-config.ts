// 테스트 환경 설정
export const getTestUrl = (path: string = ''): string => {
  // 환경 변수로 테스트 환경 결정 (production, local)
  const testEnv = process.env.TEST_ENV || 'local';

  const baseUrls = {
    production: 'https://00-yuandi-erp.vercel.app',
    local: 'http://localhost:8081'
  };

  const baseUrl = baseUrls[testEnv] || baseUrls.local;

  // 경로가 /로 시작하지 않으면 추가
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
};

// 테스트 계정 정보
export const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@yuandi.com',
    password: 'yuandi123!'
  },
  orderManager: {
    email: 'order@yuandi.com',
    password: 'yuandi123!'
  },
  shipManager: {
    email: 'ship@yuandi.com',
    password: 'yuandi123!'
  }
};

// 테스트 타임아웃 설정
export const TIMEOUTS = {
  short: 1000,
  medium: 2000,
  long: 5000,
  navigation: 30000
};

// 현재 테스트 환경 출력
export const logTestEnvironment = () => {
  const testEnv = process.env.TEST_ENV || 'local';
  const baseUrl = getTestUrl();
  console.log(`\n📌 테스트 환경: ${testEnv.toUpperCase()}`);
  console.log(`📌 베이스 URL: ${baseUrl}\n`);
};