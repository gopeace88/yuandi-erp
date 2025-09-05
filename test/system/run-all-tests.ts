#!/usr/bin/env ts-node

/**
 * 시스템 테스트 마스터 스크립트
 * 모든 테스트를 순차적으로 실행
 */

import * as readline from 'readline';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const testSteps = [
  {
    name: 'DB 초기화',
    script: '01-database-reset.ts',
    description: '기존 데이터 백업 및 DB 초기화',
    critical: true
  },
  {
    name: '상품 데이터 생성',
    script: '02-seed-products.ts',
    description: '100개 이상의 상품 데이터 생성',
    critical: true
  },
  {
    name: '주문 데이터 생성',
    script: '03-seed-orders.ts',
    description: '1000개 이상의 주문 데이터 생성',
    critical: true
  },
  {
    name: '송장 데이터 생성',
    script: '04-seed-shipments.ts',
    description: '500개 이상의 송장 데이터 생성',
    critical: true
  },
  {
    name: 'DB 무결성 검증',
    script: '05-verify-integrity.ts',
    description: '데이터 무결성 및 비즈니스 규칙 검증',
    critical: false
  },
  {
    name: '기능 테스트',
    script: '06-functional-test.ts',
    description: '모든 핵심 기능 E2E 테스트',
    critical: false
  }
];

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// 로그 헬퍼
const log = {
  header: (msg: string) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  step: (step: number, total: number, name: string) => {
    console.log(`\n${colors.cyan}[${step}/${total}]${colors.reset} ${colors.bright}${name}${colors.reset}`);
  }
};

// 사용자 확인
async function getUserConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// 테스트 실행
async function runTest(script: string): Promise<boolean> {
  try {
    const scriptPath = path.join(__dirname, script);
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`스크립트 파일을 찾을 수 없습니다: ${script}`);
    }

    log.info(`실행 중: ${script}`);
    
    execSync(`npx ts-node ${scriptPath}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    return true;
  } catch (error) {
    if (error instanceof Error) {
      log.error(`실행 실패: ${error.message}`);
    }
    return false;
  }
}

// 테스트 결과 요약
interface TestResult {
  step: string;
  success: boolean;
  duration: number;
  error?: string;
}

const testResults: TestResult[] = [];

// 메인 실행 함수
async function runAllTests() {
  console.clear();
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║            YUANDI 시스템 테스트 - 마스터 스크립트              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  log.warning('이 스크립트는 모든 데이터를 초기화하고 테스트 데이터를 생성합니다.');
  log.warning('프로덕션 환경에서 실행하지 마세요!');
  
  // 환경 확인
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  log.info(`Supabase URL: ${supabaseUrl?.slice(0, 30)}...`);
  
  if (supabaseUrl?.includes('prod') || supabaseUrl?.includes('production')) {
    log.error('프로덕션 환경이 감지되었습니다. 실행을 중단합니다.');
    process.exit(1);
  }
  
  // 사용자 확인
  const confirmed = await getUserConfirmation('\n정말 계속하시겠습니까?');
  
  if (!confirmed) {
    log.info('테스트가 취소되었습니다.');
    process.exit(0);
  }
  
  const totalSteps = testSteps.length;
  const startTime = Date.now();
  let currentStep = 0;
  let failedCritical = false;
  
  // 각 테스트 단계 실행
  for (const step of testSteps) {
    currentStep++;
    log.step(currentStep, totalSteps, step.name);
    log.info(step.description);
    
    const stepStartTime = Date.now();
    const success = await runTest(step.script);
    const duration = Date.now() - stepStartTime;
    
    testResults.push({
      step: step.name,
      success,
      duration
    });
    
    if (success) {
      log.success(`${step.name} 완료 (${(duration / 1000).toFixed(2)}초)`);
    } else {
      log.error(`${step.name} 실패`);
      
      if (step.critical) {
        failedCritical = true;
        log.error('치명적인 단계가 실패했습니다. 테스트를 중단합니다.');
        break;
      } else {
        log.warning('비치명적 오류입니다. 계속 진행합니다.');
      }
    }
    
    // 단계 사이 대기
    if (currentStep < totalSteps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const totalDuration = Date.now() - startTime;
  
  // 결과 요약
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                         테스트 결과 요약                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const successCount = testResults.filter(r => r.success).length;
  const failCount = testResults.filter(r => !r.success).length;
  const successRate = Math.floor((successCount / testResults.length) * 100);
  
  console.log(`\n총 테스트: ${testResults.length}개`);
  console.log(`${colors.green}성공: ${successCount}개${colors.reset}`);
  console.log(`${colors.red}실패: ${failCount}개${colors.reset}`);
  console.log(`성공률: ${successRate}%`);
  console.log(`총 실행 시간: ${(totalDuration / 1000 / 60).toFixed(2)}분`);
  
  // 상세 결과
  console.log('\n상세 결과:');
  testResults.forEach((result, index) => {
    const icon = result.success ? '✓' : '✗';
    const color = result.success ? colors.green : colors.red;
    const time = (result.duration / 1000).toFixed(2);
    console.log(`  ${color}${icon}${colors.reset} ${result.step} (${time}초)`);
  });
  
  // 최종 평가
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  if (failedCritical) {
    console.log('║              ❌ 테스트 실패 - 치명적 오류 발생                ║');
  } else if (successRate === 100) {
    console.log('║              🎉 모든 테스트 성공! 시스템 준비 완료             ║');
  } else if (successRate >= 80) {
    console.log('║              ⚠️  일부 테스트 실패 - 검토 필요                 ║');
  } else {
    console.log('║              ❌ 다수 테스트 실패 - 수정 필요                  ║');
  }
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  // 다음 단계 안내
  if (successRate === 100) {
    console.log('\n다음 단계:');
    console.log('  1. 개발 서버 실행: npm run dev');
    console.log('  2. 관리자 계정으로 로그인');
    console.log('  3. 생성된 테스트 데이터 확인');
    console.log('  4. 각 기능별 수동 테스트 수행');
  } else if (!failedCritical) {
    console.log('\n권장 사항:');
    console.log('  1. 실패한 테스트 로그 확인');
    console.log('  2. 문제 수정 후 개별 테스트 재실행');
    console.log('  3. 모든 테스트 통과 후 전체 재실행');
  } else {
    console.log('\n필수 조치:');
    console.log('  1. 오류 로그 상세 확인');
    console.log('  2. 데이터베이스 연결 상태 확인');
    console.log('  3. 환경 변수 설정 확인');
    console.log('  4. 문제 해결 후 처음부터 다시 실행');
  }
  
  // 종료 코드 설정
  process.exit(failedCritical || successRate < 80 ? 1 : 0);
}

// 에러 핸들러
process.on('unhandledRejection', (error) => {
  log.error(`처리되지 않은 오류: ${error}`);
  process.exit(1);
});

process.on('SIGINT', () => {
  log.warning('\n테스트가 사용자에 의해 중단되었습니다.');
  process.exit(130);
});

// 스크립트 실행
if (require.main === module) {
  runAllTests().catch((error) => {
    log.error(`테스트 실행 중 오류: ${error.message}`);
    process.exit(1);
  });
}

export { runAllTests };