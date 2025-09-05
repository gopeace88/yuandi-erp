/**
 * 시스템 헬스 모니터링 유틸리티
 * 헬스 체크 실행, 알림 생성, 메트릭 수집 관리
 */

import { SystemAlert } from '@/components/health/AlertPanel';
import { ComponentMetric } from '@/components/health/MetricsCard';

export interface HealthThresholds {
  cpu: {
    warning: number;
    critical: number;
  };
  memory: {
    warning: number;
    critical: number;
  };
  responseTime: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
  diskSpace: {
    warning: number;
    critical: number;
  };
}

export interface HealthMonitorConfig {
  thresholds: HealthThresholds;
  checkInterval: number; // milliseconds
  retentionPeriod: number; // milliseconds
  alertCooldown: number; // milliseconds
  enabledChecks: {
    database: boolean;
    storage: boolean;
    memory: boolean;
    cpu: boolean;
    network: boolean;
    external: boolean;
  };
}

export class HealthMonitor {
  private config: HealthMonitorConfig;
  private alerts: SystemAlert[] = [];
  private metrics: Map<string, ComponentMetric[]> = new Map();
  private lastAlertTimes: Map<string, number> = new Map();
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    this.config = {
      thresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 75, critical: 90 },
        responseTime: { warning: 1000, critical: 3000 },
        errorRate: { warning: 0.05, critical: 0.1 },
        diskSpace: { warning: 80, critical: 95 },
      },
      checkInterval: 30000, // 30초
      retentionPeriod: 24 * 60 * 60 * 1000, // 24시간
      alertCooldown: 5 * 60 * 1000, // 5분
      enabledChecks: {
        database: true,
        storage: true,
        memory: true,
        cpu: true,
        network: true,
        external: true,
      },
      ...config,
    };
  }

  /**
   * 헬스 모니터링 시작
   */
  start(): void {
    if (this.intervalId) {
      this.stop();
    }

    // 즉시 첫 번째 체크 실행
    this.performHealthCheck();

    // 주기적 체크 설정
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);

    console.log(`헬스 모니터 시작됨 (${this.config.checkInterval}ms 간격)`);
  }

  /**
   * 헬스 모니터링 중지
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('헬스 모니터 중지됨');
    }
  }

  /**
   * 헬스 체크 실행
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const response = await fetch('/api/health', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`헬스 체크 실패: ${response.status}`);
      }

      const healthData = await response.json();
      await this.processHealthData(healthData);

    } catch (error) {
      console.error('헬스 체크 실행 실패:', error);
      this.createAlert({
        type: 'error',
        title: '헬스 체크 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류',
        component: 'health_monitor',
      });
    }
  }

  /**
   * 헬스 데이터 처리 및 분석
   */
  private async processHealthData(healthData: any): Promise<void> {
    const timestamp = new Date().toISOString();

    // 각 구성 요소별 메트릭 생성
    const metrics: ComponentMetric[] = [];

    // 데이터베이스 메트릭
    if (this.config.enabledChecks.database && healthData.checks.database) {
      const dbMetric = this.createDatabaseMetric(healthData.checks.database, timestamp);
      metrics.push(dbMetric);
      this.checkDatabaseAlerts(dbMetric);
    }

    // 메모리 메트릭
    if (this.config.enabledChecks.memory && healthData.metrics.memory) {
      const memoryMetric = this.createMemoryMetric(healthData.metrics.memory, timestamp);
      metrics.push(memoryMetric);
      this.checkMemoryAlerts(memoryMetric);
    }

    // CPU 메트릭
    if (this.config.enabledChecks.cpu && healthData.metrics.cpu) {
      const cpuMetric = this.createCpuMetric(healthData.metrics.cpu, timestamp);
      metrics.push(cpuMetric);
      this.checkCpuAlerts(cpuMetric);
    }

    // 네트워크/요청 메트릭
    if (this.config.enabledChecks.network && healthData.metrics.requests) {
      const networkMetric = this.createNetworkMetric(healthData.metrics.requests, timestamp);
      metrics.push(networkMetric);
      this.checkNetworkAlerts(networkMetric);
    }

    // 스토리지 메트릭
    if (this.config.enabledChecks.storage && healthData.checks.storage) {
      const storageMetric = this.createStorageMetric(healthData.checks.storage, timestamp);
      metrics.push(storageMetric);
      this.checkStorageAlerts(storageMetric);
    }

    // 메트릭 저장
    this.storeMetrics(timestamp, metrics);

    // 전체 시스템 상태 확인
    this.checkOverallSystemHealth(healthData.status, timestamp);

    // 오래된 데이터 정리
    this.cleanupOldData();
  }

  /**
   * 데이터베이스 메트릭 생성
   */
  private createDatabaseMetric(dbCheck: any, timestamp: string): ComponentMetric {
    const previous = this.getPreviousMetric('database');
    
    return {
      id: 'database',
      name: '데이터베이스',
      status: this.mapHealthStatus(dbCheck.status),
      description: 'PostgreSQL 연결 상태',
      responseTime: dbCheck.latency,
      lastCheck: timestamp,
      metrics: {
        primary: {
          current: dbCheck.latency || 0,
          previous: previous?.responseTime,
          unit: 'ms',
          format: 'duration',
          threshold: this.config.thresholds.responseTime,
        },
        secondary: [
          {
            current: dbCheck.details?.poolSize || 0,
            unit: '연결',
            format: 'number',
          },
        ],
      },
      details: dbCheck.details,
    };
  }

  /**
   * 메모리 메트릭 생성
   */
  private createMemoryMetric(memoryData: any, timestamp: string): ComponentMetric {
    const previous = this.getPreviousMetric('memory');
    
    return {
      id: 'memory',
      name: '메모리',
      status: this.getThresholdStatus(memoryData.percentage, this.config.thresholds.memory),
      description: '시스템 메모리 사용률',
      lastCheck: timestamp,
      metrics: {
        primary: {
          current: memoryData.percentage,
          previous: previous?.metrics.primary.current,
          unit: '%',
          format: 'percentage',
          threshold: this.config.thresholds.memory,
        },
        secondary: [
          {
            current: memoryData.used,
            unit: 'bytes',
            format: 'bytes',
          },
          {
            current: memoryData.total,
            unit: '총 메모리',
            format: 'bytes',
          },
        ],
      },
    };
  }

  /**
   * CPU 메트릭 생성
   */
  private createCpuMetric(cpuData: any, timestamp: string): ComponentMetric {
    const previous = this.getPreviousMetric('cpu');
    
    return {
      id: 'cpu',
      name: 'CPU',
      status: this.getThresholdStatus(cpuData.usage, this.config.thresholds.cpu),
      description: 'CPU 사용률',
      lastCheck: timestamp,
      metrics: {
        primary: {
          current: cpuData.usage,
          previous: previous?.metrics.primary.current,
          unit: '%',
          format: 'percentage',
          threshold: this.config.thresholds.cpu,
        },
        secondary: [
          {
            current: cpuData.count,
            unit: '코어',
            format: 'number',
          },
          {
            current: cpuData.loadAverage[0],
            unit: '로드 평균',
            format: 'number',
          },
        ],
      },
    };
  }

  /**
   * 네트워크 메트릭 생성
   */
  private createNetworkMetric(requestData: any, timestamp: string): ComponentMetric {
    const previous = this.getPreviousMetric('network');
    const errorRatePercent = (requestData.errorRate || 0) * 100;
    
    return {
      id: 'network',
      name: '네트워크',
      status: this.getThresholdStatus(errorRatePercent, {
        warning: this.config.thresholds.errorRate.warning * 100,
        critical: this.config.thresholds.errorRate.critical * 100,
      }),
      description: '요청 처리 및 에러율',
      lastCheck: timestamp,
      metrics: {
        primary: {
          current: errorRatePercent,
          previous: previous?.metrics.primary.current,
          unit: '%',
          format: 'percentage',
          threshold: {
            warning: this.config.thresholds.errorRate.warning * 100,
            critical: this.config.thresholds.errorRate.critical * 100,
          },
        },
        secondary: [
          {
            current: requestData.rate || 0,
            unit: 'req/s',
            format: 'number',
          },
          {
            current: requestData.total || 0,
            unit: '총 요청',
            format: 'number',
          },
        ],
      },
    };
  }

  /**
   * 스토리지 메트릭 생성
   */
  private createStorageMetric(storageCheck: any, timestamp: string): ComponentMetric {
    const previous = this.getPreviousMetric('storage');
    
    return {
      id: 'storage',
      name: '스토리지',
      status: this.mapHealthStatus(storageCheck.status),
      description: 'Supabase 스토리지 상태',
      responseTime: storageCheck.latency,
      lastCheck: timestamp,
      metrics: {
        primary: {
          current: storageCheck.latency || 0,
          previous: previous?.responseTime,
          unit: 'ms',
          format: 'duration',
          threshold: this.config.thresholds.responseTime,
        },
        secondary: [
          {
            current: storageCheck.details?.buckets || 0,
            unit: '버킷',
            format: 'number',
          },
        ],
      },
      details: storageCheck.details,
    };
  }

  /**
   * 이전 메트릭 조회
   */
  private getPreviousMetric(componentId: string): ComponentMetric | undefined {
    const componentMetrics = this.metrics.get(componentId);
    if (!componentMetrics || componentMetrics.length === 0) {
      return undefined;
    }
    return componentMetrics[componentMetrics.length - 1];
  }

  /**
   * 메트릭 저장
   */
  private storeMetrics(timestamp: string, metrics: ComponentMetric[]): void {
    metrics.forEach(metric => {
      const existing = this.metrics.get(metric.id) || [];
      existing.push(metric);
      
      // 최대 100개 데이터 포인트만 유지
      if (existing.length > 100) {
        existing.shift();
      }
      
      this.metrics.set(metric.id, existing);
    });
  }

  /**
   * 헬스 상태 매핑
   */
  private mapHealthStatus(status: string): ComponentMetric['status'] {
    switch (status) {
      case 'up':
      case 'healthy':
        return 'healthy';
      case 'degraded':
        return 'warning';
      case 'down':
      case 'unhealthy':
        return 'critical';
      default:
        return 'warning';
    }
  }

  /**
   * 임계값 기반 상태 결정
   */
  private getThresholdStatus(value: number, threshold: { warning: number; critical: number }): ComponentMetric['status'] {
    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return 'healthy';
  }

  /**
   * 데이터베이스 알림 확인
   */
  private checkDatabaseAlerts(metric: ComponentMetric): void {
    if (metric.responseTime && metric.responseTime > this.config.thresholds.responseTime.critical) {
      this.createAlert({
        type: 'error',
        title: '데이터베이스 응답 지연',
        message: `데이터베이스 응답 시간이 ${metric.responseTime}ms로 임계값(${this.config.thresholds.responseTime.critical}ms)을 초과했습니다.`,
        component: 'database',
      });
    } else if (metric.responseTime && metric.responseTime > this.config.thresholds.responseTime.warning) {
      this.createAlert({
        type: 'warning',
        title: '데이터베이스 응답 지연 경고',
        message: `데이터베이스 응답 시간이 ${metric.responseTime}ms로 경고 임계값을 초과했습니다.`,
        component: 'database',
      });
    }
  }

  /**
   * 메모리 알림 확인
   */
  private checkMemoryAlerts(metric: ComponentMetric): void {
    const usage = metric.metrics.primary.current;
    
    if (usage >= this.config.thresholds.memory.critical) {
      this.createAlert({
        type: 'error',
        title: '메모리 사용률 위험',
        message: `메모리 사용률이 ${usage.toFixed(1)}%로 위험 수준에 도달했습니다.`,
        component: 'memory',
      });
    } else if (usage >= this.config.thresholds.memory.warning) {
      this.createAlert({
        type: 'warning',
        title: '메모리 사용률 경고',
        message: `메모리 사용률이 ${usage.toFixed(1)}%로 경고 수준에 도달했습니다.`,
        component: 'memory',
      });
    }
  }

  /**
   * CPU 알림 확인
   */
  private checkCpuAlerts(metric: ComponentMetric): void {
    const usage = metric.metrics.primary.current;
    
    if (usage >= this.config.thresholds.cpu.critical) {
      this.createAlert({
        type: 'error',
        title: 'CPU 사용률 위험',
        message: `CPU 사용률이 ${usage.toFixed(1)}%로 위험 수준에 도달했습니다.`,
        component: 'cpu',
      });
    } else if (usage >= this.config.thresholds.cpu.warning) {
      this.createAlert({
        type: 'warning',
        title: 'CPU 사용률 경고',
        message: `CPU 사용률이 ${usage.toFixed(1)}%로 경고 수준에 도달했습니다.`,
        component: 'cpu',
      });
    }
  }

  /**
   * 네트워크 알림 확인
   */
  private checkNetworkAlerts(metric: ComponentMetric): void {
    const errorRate = metric.metrics.primary.current;
    
    if (errorRate >= this.config.thresholds.errorRate.critical * 100) {
      this.createAlert({
        type: 'error',
        title: '높은 에러율 감지',
        message: `요청 에러율이 ${errorRate.toFixed(2)}%로 위험 수준에 도달했습니다.`,
        component: 'network',
      });
    } else if (errorRate >= this.config.thresholds.errorRate.warning * 100) {
      this.createAlert({
        type: 'warning',
        title: '에러율 증가',
        message: `요청 에러율이 ${errorRate.toFixed(2)}%로 경고 수준에 도달했습니다.`,
        component: 'network',
      });
    }
  }

  /**
   * 스토리지 알림 확인
   */
  private checkStorageAlerts(metric: ComponentMetric): void {
    if (metric.status === 'critical') {
      this.createAlert({
        type: 'error',
        title: '스토리지 서비스 장애',
        message: '스토리지 서비스에 연결할 수 없습니다.',
        component: 'storage',
      });
    }
  }

  /**
   * 전체 시스템 상태 확인
   */
  private checkOverallSystemHealth(status: string, timestamp: string): void {
    if (status === 'unhealthy') {
      this.createAlert({
        type: 'error',
        title: '시스템 전체 장애',
        message: '하나 이상의 핵심 구성 요소에 문제가 발생했습니다.',
        component: 'system',
      });
    } else if (status === 'degraded') {
      this.createAlert({
        type: 'warning',
        title: '시스템 성능 저하',
        message: '일부 구성 요소의 성능이 저하되었습니다.',
        component: 'system',
      });
    }
  }

  /**
   * 알림 생성
   */
  private createAlert(alertData: Omit<SystemAlert, 'id' | 'timestamp' | 'dismissible'>): void {
    const alertKey = `${alertData.component}-${alertData.type}`;
    const now = Date.now();
    
    // 쿨다운 체크
    const lastAlertTime = this.lastAlertTimes.get(alertKey);
    if (lastAlertTime && (now - lastAlertTime) < this.config.alertCooldown) {
      return; // 쿨다운 기간 내에는 중복 알림 생성하지 않음
    }

    const alert: SystemAlert = {
      id: `${alertKey}-${now}`,
      timestamp: new Date().toISOString(),
      dismissible: true,
      ...alertData,
    };

    this.alerts.unshift(alert); // 최신 알림을 앞에 추가
    this.lastAlertTimes.set(alertKey, now);

    console.log(`알림 생성: ${alert.title} - ${alert.message}`);
  }

  /**
   * 오래된 데이터 정리
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const cutoff = now - this.config.retentionPeriod;

    // 오래된 알림 제거
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoff
    );

    // 오래된 알림 시간 제거
    for (const [key, time] of this.lastAlertTimes.entries()) {
      if (time < cutoff) {
        this.lastAlertTimes.delete(key);
      }
    }
  }

  /**
   * 인증 토큰 조회
   */
  private getAuthToken(): string {
    // 실제 구현에서는 적절한 인증 토큰 조회 방법 사용
    return localStorage.getItem('auth_token') || 'default-token';
  }

  /**
   * 현재 알림 목록 조회
   */
  getAlerts(): SystemAlert[] {
    return [...this.alerts];
  }

  /**
   * 특정 구성 요소의 메트릭 이력 조회
   */
  getMetricHistory(componentId: string): ComponentMetric[] {
    return this.metrics.get(componentId) || [];
  }

  /**
   * 알림 해제
   */
  dismissAlert(alertId: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<HealthMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}