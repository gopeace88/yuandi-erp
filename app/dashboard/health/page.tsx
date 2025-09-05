/**
 * 시스템 헬스 모니터링 대시보드
 * 실시간 시스템 상태 모니터링 및 메트릭 표시
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  Database, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Wifi, 
  Server, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

// 타입 정의
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    storage: ComponentHealth;
    memory: ComponentHealth;
    cpu: ComponentHealth;
    disk: ComponentHealth;
  };
  metrics: SystemMetrics;
  dependencies: DependencyHealth[];
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  message?: string;
  details?: any;
}

interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    count: number;
    loadAverage: number[];
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  requests: {
    total: number;
    rate: number;
    errorRate: number;
  };
}

interface DependencyHealth {
  name: string;
  status: 'up' | 'down' | 'unknown';
  latency?: number;
  version?: string;
}

interface HistoricalData {
  timestamp: string;
  cpu: number;
  memory: number;
  requestRate: number;
  errorRate: number;
  responseTime: number;
}

const COLORS = {
  healthy: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  primary: '#3b82f6',
  secondary: '#8b5cf6'
};

export default function HealthDashboard() {
  const [healthData, setHealthData] = useState<HealthCheckResult | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // 초

  // 헬스 데이터 조회
  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/health', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setHealthData(data);

      // 히스토리 데이터 업데이트
      const newDataPoint: HistoricalData = {
        timestamp: new Date().toISOString(),
        cpu: data.metrics.cpu.usage,
        memory: data.metrics.memory.percentage,
        requestRate: data.metrics.requests.rate,
        errorRate: data.metrics.requests.errorRate * 100,
        responseTime: data.checks.database.latency || 0
      };

      setHistoricalData(prev => [
        ...prev.slice(-29), // 최근 30개 데이터 포인트만 유지
        newDataPoint
      ]);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 자동 새로고침
  useEffect(() => {
    fetchHealthData();

    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // 상태별 아이콘 반환
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'unhealthy':
      case 'down':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  // 상태별 색상 반환
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
      case 'up':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
      case 'down':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 업타임 포맷팅
  const formatUptime = (uptime: number): string => {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    } else if (minutes > 0) {
      return `${minutes}분 ${seconds}초`;
    } else {
      return `${seconds}초`;
    }
  };

  // 메모리 크기 포맷팅
  const formatBytes = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`;
    } else {
      return `${mb.toFixed(0)} MB`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>시스템 상태를 확인하는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <XCircle className="w-12 h-12 text-red-500" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">시스템 상태를 확인할 수 없습니다</h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <Button onClick={fetchHealthData} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">시스템 헬스 모니터링</h1>
          <p className="text-gray-600 mt-1">실시간 시스템 상태 및 성능 메트릭</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">자동 새로고침</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefresh}
              className="text-sm border rounded px-2 py-1"
            >
              <option value={10}>10초</option>
              <option value={30}>30초</option>
              <option value={60}>1분</option>
              <option value={300}>5분</option>
            </select>
          </div>
          
          <Button onClick={fetchHealthData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 전체 시스템 상태 */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(healthData.status)}
              <CardTitle>전체 시스템 상태</CardTitle>
            </div>
            <Badge className={getStatusColor(healthData.status)}>
              {healthData.status === 'healthy' ? '정상' : 
               healthData.status === 'degraded' ? '경고' : '장애'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">버전</p>
              <p className="font-semibold">{healthData.version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">업타임</p>
              <p className="font-semibold">{formatUptime(healthData.uptime)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">마지막 확인</p>
              <p className="font-semibold">
                {new Date(healthData.timestamp).toLocaleTimeString('ko-KR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">환경</p>
              <p className="font-semibold capitalize">{process.env.NODE_ENV || 'development'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 구성 요소 상태 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 데이터베이스 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <CardTitle className="text-lg">데이터베이스</CardTitle>
              </div>
              {getStatusIcon(healthData.checks.database.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">응답 시간</span>
                <span className="font-semibold">{healthData.checks.database.latency}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">상태</span>
                <Badge className={getStatusColor(healthData.checks.database.status)}>
                  {healthData.checks.database.status === 'up' ? '정상' : '오류'}
                </Badge>
              </div>
              {healthData.checks.database.details && (
                <div className="text-sm text-gray-600 mt-2">
                  {healthData.checks.database.details.version}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 스토리지 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-5 h-5" />
                <CardTitle className="text-lg">스토리지</CardTitle>
              </div>
              {getStatusIcon(healthData.checks.storage.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">응답 시간</span>
                <span className="font-semibold">{healthData.checks.storage.latency}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">상태</span>
                <Badge className={getStatusColor(healthData.checks.storage.status)}>
                  {healthData.checks.storage.status === 'up' ? '정상' : '오류'}
                </Badge>
              </div>
              {healthData.checks.storage.details?.buckets !== undefined && (
                <div className="text-sm text-gray-600 mt-2">
                  버킷 수: {healthData.checks.storage.details.buckets}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 메모리 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MemoryStick className="w-5 h-5" />
                <CardTitle className="text-lg">메모리</CardTitle>
              </div>
              {getStatusIcon(healthData.checks.memory.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">사용률</span>
                <span className="font-semibold">{healthData.metrics.memory.percentage.toFixed(1)}%</span>
              </div>
              <Progress value={healthData.metrics.memory.percentage} />
              <div className="flex justify-between text-xs text-gray-500">
                <span>사용: {formatBytes(healthData.metrics.memory.used)}</span>
                <span>총: {formatBytes(healthData.metrics.memory.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CPU */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5" />
                <CardTitle className="text-lg">CPU</CardTitle>
              </div>
              {getStatusIcon(healthData.checks.cpu.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">사용률</span>
                <span className="font-semibold">{healthData.metrics.cpu.usage.toFixed(1)}%</span>
              </div>
              <Progress value={healthData.metrics.cpu.usage} />
              <div className="flex justify-between text-xs text-gray-500">
                <span>코어: {healthData.metrics.cpu.count}개</span>
                <span>로드: {healthData.metrics.cpu.loadAverage[0].toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 네트워크/요청 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <CardTitle className="text-lg">요청 처리</CardTitle>
              </div>
              <Badge className="bg-blue-100 text-blue-800">
                {healthData.metrics.requests.total}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">초당 요청수</span>
                <span className="font-semibold">{healthData.metrics.requests.rate.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">에러율</span>
                <span className="font-semibold">{(healthData.metrics.requests.errorRate * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">총 요청수</span>
                <span className="font-semibold">{healthData.metrics.requests.total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 외부 의존성 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wifi className="w-5 h-5" />
                <CardTitle className="text-lg">외부 서비스</CardTitle>
              </div>
              <Badge className="bg-gray-100 text-gray-800">
                {healthData.dependencies.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthData.dependencies.map((dep, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{dep.name}</span>
                  <div className="flex items-center space-x-2">
                    {dep.latency && (
                      <span className="text-xs text-gray-500">{dep.latency}ms</span>
                    )}
                    {getStatusIcon(dep.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 성능 차트 */}
      {historicalData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU 및 메모리 트렌드 */}
          <Card>
            <CardHeader>
              <CardTitle>시스템 리소스 트렌드</CardTitle>
              <CardDescription>최근 30분간 CPU 및 메모리 사용률</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString('ko-KR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString('ko-KR')}
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)}%`, 
                        name === 'cpu' ? 'CPU' : '메모리'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cpu" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="CPU"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memory" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="메모리"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 요청 처리 및 에러율 */}
          <Card>
            <CardHeader>
              <CardTitle>요청 처리 현황</CardTitle>
              <CardDescription>요청 처리율 및 에러율 추이</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString('ko-KR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 10]} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString('ko-KR')}
                      formatter={(value: number, name: string) => [
                        name === 'requestRate' ? `${value.toFixed(1)} req/s` : 
                        name === 'errorRate' ? `${value.toFixed(2)}%` :
                        `${value.toFixed(0)}ms`,
                        name === 'requestRate' ? '요청/초' : 
                        name === 'errorRate' ? '에러율' : '응답시간'
                      ]}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="requestRate" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="요청/초"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="errorRate" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="에러율"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 알림 및 경고 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>시스템 알림</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {healthData.status === 'unhealthy' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-800 font-medium">시스템 장애 발생</span>
                </div>
                <p className="text-red-700 text-sm mt-1">
                  하나 이상의 핵심 구성 요소에 문제가 발생했습니다.
                </p>
              </div>
            )}
            
            {healthData.status === 'degraded' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-800 font-medium">시스템 성능 저하</span>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  일부 구성 요소의 성능이 저하되었습니다.
                </p>
              </div>
            )}

            {healthData.metrics.memory.percentage > 80 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-orange-800 font-medium">높은 메모리 사용률</span>
                </div>
                <p className="text-orange-700 text-sm mt-1">
                  메모리 사용률이 {healthData.metrics.memory.percentage.toFixed(1)}%입니다.
                </p>
              </div>
            )}

            {healthData.metrics.cpu.usage > 70 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-orange-800 font-medium">높은 CPU 사용률</span>
                </div>
                <p className="text-orange-700 text-sm mt-1">
                  CPU 사용률이 {healthData.metrics.cpu.usage.toFixed(1)}%입니다.
                </p>
              </div>
            )}

            {healthData.metrics.requests.errorRate > 0.05 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-800 font-medium">높은 에러율</span>
                </div>
                <p className="text-red-700 text-sm mt-1">
                  요청 에러율이 {(healthData.metrics.requests.errorRate * 100).toFixed(2)}%입니다.
                </p>
              </div>
            )}

            {healthData.status === 'healthy' && 
             healthData.metrics.memory.percentage < 70 && 
             healthData.metrics.cpu.usage < 50 && 
             healthData.metrics.requests.errorRate < 0.01 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-800 font-medium">모든 시스템이 정상 작동 중</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  모든 구성 요소가 정상 상태를 유지하고 있습니다.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}