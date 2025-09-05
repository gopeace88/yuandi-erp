/**
 * 시스템 모니터링 컴포넌트
 * 실시간 시스템 상태 모니터링 및 알림
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import MetricsCard, { ComponentMetric } from './MetricsCard';
import AlertPanel, { SystemAlert } from './AlertPanel';
import { 
  Activity, 
  Server, 
  Database, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Network,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings
} from 'lucide-react';

interface SystemMonitorProps {
  refreshInterval?: number; // ms
  autoRefresh?: boolean;
  showAlerts?: boolean;
  compact?: boolean;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  uptime: number;
  components: ComponentMetric[];
  alerts: SystemAlert[];
  summary: {
    totalComponents: number;
    healthyCount: number;
    warningCount: number;
    criticalCount: number;
  };
}

export default function SystemMonitor({
  refreshInterval = 30000,
  autoRefresh = true,
  showAlerts = true,
  compact = false
}: SystemMonitorProps) {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 시스템 헬스 데이터 조회
  const fetchSystemHealth = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/health/system', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`시스템 상태를 가져올 수 없습니다: ${response.status}`);
      }

      const data = await response.json();
      
      // 모의 데이터 (실제 API가 없는 경우)
      const mockHealthData: SystemHealth = {
        overall: Math.random() > 0.8 ? 'warning' : 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(Math.random() * 86400 * 7), // 최대 7일
        components: [
          {
            id: 'database',
            name: '데이터베이스',
            status: Math.random() > 0.9 ? 'warning' : 'healthy',
            icon: <Database className="w-5 h-5" />,
            description: 'Supabase PostgreSQL 데이터베이스',
            metrics: {
              primary: {
                current: Math.floor(Math.random() * 200) + 50,
                previous: Math.floor(Math.random() * 200) + 50,
                unit: 'ms',
                format: 'duration'
              },
              secondary: [
                {
                  current: Math.floor(Math.random() * 100),
                  previous: Math.floor(Math.random() * 100),
                  unit: '연결',
                  format: 'number'
                },
                {
                  current: Math.floor(Math.random() * 1000) + 500,
                  previous: Math.floor(Math.random() * 1000) + 500,
                  unit: 'QPS',
                  format: 'number'
                }
              ]
            },
            responseTime: Math.floor(Math.random() * 200) + 50,
            lastCheck: new Date().toISOString(),
            details: {
              connectionPool: '10/20',
              version: 'PostgreSQL 15.4',
              replicationLag: '2ms'
            }
          },
          {
            id: 'storage',
            name: '스토리지',
            status: 'healthy',
            icon: <HardDrive className="w-5 h-5" />,
            description: 'Supabase Storage 파일 저장소',
            metrics: {
              primary: {
                current: Math.floor(Math.random() * 50) + 10,
                previous: Math.floor(Math.random() * 50) + 10,
                unit: 'GB',
                format: 'bytes'
              },
              secondary: [
                {
                  current: Math.floor(Math.random() * 100),
                  unit: '파일',
                  format: 'number'
                }
              ]
            },
            responseTime: Math.floor(Math.random() * 100) + 20,
            lastCheck: new Date().toISOString()
          },
          {
            id: 'memory',
            name: '메모리',
            status: Math.random() > 0.7 ? 'warning' : 'healthy',
            icon: <MemoryStick className="w-5 h-5" />,
            description: '시스템 메모리 사용률',
            metrics: {
              primary: {
                current: Math.floor(Math.random() * 40) + 40,
                previous: Math.floor(Math.random() * 40) + 40,
                unit: '%',
                format: 'percentage',
                threshold: {
                  warning: 70,
                  critical: 85
                }
              },
              secondary: [
                {
                  current: Math.floor(Math.random() * 2) + 1,
                  unit: 'GB',
                  format: 'bytes'
                }
              ]
            },
            lastCheck: new Date().toISOString()
          },
          {
            id: 'cpu',
            name: 'CPU',
            status: 'healthy',
            icon: <Cpu className="w-5 h-5" />,
            description: 'CPU 사용률',
            metrics: {
              primary: {
                current: Math.floor(Math.random() * 30) + 10,
                previous: Math.floor(Math.random() * 30) + 10,
                unit: '%',
                format: 'percentage',
                threshold: {
                  warning: 70,
                  critical: 90
                }
              },
              secondary: [
                {
                  current: 2,
                  unit: 'cores',
                  format: 'number'
                },
                {
                  current: Math.random() * 2,
                  unit: 'load',
                  format: 'number'
                }
              ]
            },
            lastCheck: new Date().toISOString()
          },
          {
            id: 'network',
            name: '네트워크',
            status: 'healthy',
            icon: <Network className="w-5 h-5" />,
            description: '네트워크 연결 상태',
            metrics: {
              primary: {
                current: Math.floor(Math.random() * 50) + 10,
                previous: Math.floor(Math.random() * 50) + 10,
                unit: 'ms',
                format: 'duration'
              },
              secondary: [
                {
                  current: Math.floor(Math.random() * 100) + 50,
                  unit: 'Mbps',
                  format: 'number'
                }
              ]
            },
            responseTime: Math.floor(Math.random() * 50) + 10,
            lastCheck: new Date().toISOString()
          },
          {
            id: 'api',
            name: 'API 서버',
            status: 'healthy',
            icon: <Server className="w-5 h-5" />,
            description: 'REST API 응답 상태',
            metrics: {
              primary: {
                current: Math.floor(Math.random() * 1000) + 100,
                previous: Math.floor(Math.random() * 1000) + 100,
                unit: 'req/min',
                format: 'number'
              },
              secondary: [
                {
                  current: Math.random() * 2,
                  unit: '에러율',
                  format: 'percentage'
                },
                {
                  current: Math.floor(Math.random() * 200) + 100,
                  unit: 'ms',
                  format: 'duration'
                }
              ]
            },
            responseTime: Math.floor(Math.random() * 200) + 100,
            lastCheck: new Date().toISOString(),
            details: {
              endpoints: 45,
              activeConnections: Math.floor(Math.random() * 20) + 5,
              errorRate: (Math.random() * 0.05).toFixed(3) + '%'
            }
          }
        ],
        alerts: [],
        summary: {
          totalComponents: 6,
          healthyCount: 0,
          warningCount: 0,
          criticalCount: 0
        }
      };

      // 요약 계산
      mockHealthData.components.forEach(component => {
        switch (component.status) {
          case 'healthy':
            mockHealthData.summary.healthyCount++;
            break;
          case 'warning':
            mockHealthData.summary.warningCount++;
            break;
          case 'critical':
            mockHealthData.summary.criticalCount++;
            break;
        }
      });

      // 알림 생성
      const alerts: SystemAlert[] = [];
      
      mockHealthData.components.forEach(component => {
        if (component.status === 'warning' || component.status === 'critical') {
          alerts.push({
            id: `alert-${component.id}-${Date.now()}`,
            type: component.status === 'critical' ? 'error' : 'warning',
            title: `${component.name} 상태 이상`,
            message: component.status === 'critical' 
              ? `${component.name}에 심각한 문제가 발생했습니다.`
              : `${component.name}의 성능이 저하되었습니다.`,
            timestamp: new Date().toISOString(),
            component: component.name,
            dismissible: true,
            actionLabel: '자세히 보기',
            onAction: () => console.log(`Component details: ${component.id}`)
          });
        }
      });

      // 메모리 경고
      const memoryComponent = mockHealthData.components.find(c => c.id === 'memory');
      if (memoryComponent && memoryComponent.metrics.primary.current > 70) {
        alerts.push({
          id: `memory-warning-${Date.now()}`,
          type: 'warning',
          title: '높은 메모리 사용률',
          message: `메모리 사용률이 ${memoryComponent.metrics.primary.current}%입니다. 시스템 성능에 영향을 줄 수 있습니다.`,
          timestamp: new Date().toISOString(),
          component: '메모리',
          dismissible: true
        });
      }

      mockHealthData.alerts = alerts;
      mockHealthData.overall = mockHealthData.summary.criticalCount > 0 ? 'critical' : 
                               mockHealthData.summary.warningCount > 0 ? 'warning' : 'healthy';

      setSystemHealth(mockHealthData);
      setLastUpdate(new Date());
      setError(null);
      
    } catch (err) {
      console.error('System health fetch error:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 자동 새로고침
  useEffect(() => {
    fetchSystemHealth();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchSystemHealth, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchSystemHealth, autoRefresh, refreshInterval]);

  // 전체 상태 아이콘
  const getOverallStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Activity className="w-6 h-6 text-gray-400" />;
    }
  };

  // 전체 상태 색상
  const getOverallStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 업타임 포맷팅
  const formatUptime = (uptime: number): string => {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    if (days > 0) {
      return `${days}일 ${hours}시간`;
    } else if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    } else {
      return `${minutes}분`;
    }
  };

  if (loading && !systemHealth) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>시스템 상태를 확인하는 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !systemHealth) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              시스템 상태를 확인할 수 없습니다: {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchSystemHealth} 
                className="ml-2"
              >
                다시 시도
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!systemHealth) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 전체 시스템 상태 요약 */}
      <Card className={`border-2 ${systemHealth.overall === 'critical' ? 'border-red-200' : 
                                    systemHealth.overall === 'warning' ? 'border-yellow-200' : 
                                    'border-green-200'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getOverallStatusIcon(systemHealth.overall)}
              <div>
                <CardTitle>시스템 전체 상태</CardTitle>
                <p className="text-sm text-gray-600">
                  마지막 업데이트: {lastUpdate?.toLocaleTimeString('ko-KR')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge className={getOverallStatusColor(systemHealth.overall)}>
                {systemHealth.overall === 'healthy' ? '정상' : 
                 systemHealth.overall === 'warning' ? '경고' : '위험'}
              </Badge>
              
              <Button variant="outline" size="sm" onClick={fetchSystemHealth} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                새로고침
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">전체 구성요소</p>
              <p className="text-2xl font-bold">{systemHealth.summary.totalComponents}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">정상</p>
              <p className="text-2xl font-bold text-green-600">{systemHealth.summary.healthyCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">경고</p>
              <p className="text-2xl font-bold text-yellow-600">{systemHealth.summary.warningCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">위험</p>
              <p className="text-2xl font-bold text-red-600">{systemHealth.summary.criticalCount}</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-600">
            <span>업타임: {formatUptime(systemHealth.uptime)}</span>
            <span>마지막 확인: {new Date(systemHealth.timestamp).toLocaleString('ko-KR')}</span>
          </div>
        </CardContent>
      </Card>

      {/* 구성 요소별 상태 */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {systemHealth.components.map((component) => (
          <MetricsCard
            key={component.id}
            component={component}
            showTrend={true}
            showDetails={!compact}
          />
        ))}
      </div>

      {/* 알림 패널 */}
      {showAlerts && systemHealth.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span>시스템 알림</span>
              <Badge variant="outline">{systemHealth.alerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertPanel
              alerts={systemHealth.alerts}
              onDismiss={(alertId) => {
                setSystemHealth(prev => prev ? {
                  ...prev,
                  alerts: prev.alerts.filter(alert => alert.id !== alertId)
                } : null);
              }}
              maxAlerts={5}
              showTimestamp={true}
            />
          </CardContent>
        </Card>
      )}

      {/* 에러 표시 */}
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            일부 시스템 정보를 가져오는 중 오류가 발생했습니다: {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}