'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  Database, 
  HardDrive, 
  Memory, 
  Network, 
  RefreshCw, 
  Server,
  TrendingUp,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: ComponentHealth
    storage: ComponentHealth
    memory: ComponentHealth
    cpu: ComponentHealth
    disk: ComponentHealth
  }
  metrics: SystemMetrics
  dependencies: DependencyHealth[]
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded'
  latency?: number
  message?: string
  details?: any
}

interface SystemMetrics {
  memory: {
    used: number
    total: number
    percentage: number
  }
  cpu: {
    usage: number
    count: number
    loadAverage: number[]
  }
  disk: {
    used: number
    total: number
    percentage: number
  }
  requests: {
    total: number
    rate: number
    errorRate: number
  }
}

interface DependencyHealth {
  name: string
  status: 'up' | 'down' | 'unknown'
  latency?: number
  version?: string
}

export default function HealthDashboard() {
  const [health, setHealth] = useState<HealthCheckResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30초
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchHealthData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/health', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setHealth(data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return 'text-green-500'
      case 'degraded':
        return 'text-yellow-500'
      case 'unhealthy':
      case 'down':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusBadge = (status: string) => {
    const color = getStatusColor(status)
    const icon = status === 'up' || status === 'healthy' ? 
      <CheckCircle2 className="w-4 h-4" /> : 
      <AlertCircle className="w-4 h-4" />
    
    return (
      <Badge variant={status === 'up' || status === 'healthy' ? 'default' : 'destructive'}>
        <span className="flex items-center gap-1">
          {icon}
          {status.toUpperCase()}
        </span>
      </Badge>
    )
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatBytes = (bytes: number) => {
    const gb = bytes / 1024 / 1024 / 1024
    return `${gb.toFixed(2)} GB`
  }

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin">
          <RefreshCw className="w-8 h-8" />
        </div>
      </div>
    )
  }

  if (!health) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>오류</AlertTitle>
        <AlertDescription>헬스체크 데이터를 불러올 수 없습니다.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">시스템 헬스체크</h1>
          <p className="text-gray-500 mt-1">
            시스템 상태 및 성능 모니터링
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">자동 새로고침</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
          </div>
          <Button onClick={fetchHealthData} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 전체 상태 카드 */}
      <Card className={cn(
        "border-2",
        health.status === 'healthy' ? 'border-green-500' :
        health.status === 'degraded' ? 'border-yellow-500' :
        'border-red-500'
      )}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Activity className={cn("w-8 h-8", getStatusColor(health.status))} />
              <div>
                <CardTitle>시스템 상태</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  버전: {health.version} | 가동시간: {formatUptime(health.uptime)}
                </p>
              </div>
            </div>
            {getStatusBadge(health.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-2xl font-bold">{health.metrics.requests.total.toLocaleString()}</p>
              <p className="text-sm text-gray-500">총 요청 수</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-2xl font-bold">{health.metrics.requests.rate.toFixed(2)}/s</p>
              <p className="text-sm text-gray-500">요청 처리율</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-2xl font-bold">{(health.metrics.requests.errorRate * 100).toFixed(2)}%</p>
              <p className="text-sm text-gray-500">오류율</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 컴포넌트 상태 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 데이터베이스 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                <CardTitle className="text-base">데이터베이스</CardTitle>
              </div>
              {getStatusBadge(health.checks.database.status)}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{health.checks.database.message}</p>
            {health.checks.database.latency && (
              <p className="text-xs text-gray-500 mt-1">
                응답시간: {health.checks.database.latency}ms
              </p>
            )}
          </CardContent>
        </Card>

        {/* 스토리지 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                <CardTitle className="text-base">스토리지</CardTitle>
              </div>
              {getStatusBadge(health.checks.storage.status)}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{health.checks.storage.message}</p>
            {health.checks.storage.details?.buckets !== undefined && (
              <p className="text-xs text-gray-500 mt-1">
                버킷 수: {health.checks.storage.details.buckets}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 메모리 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Memory className="w-5 h-5" />
                <CardTitle className="text-base">메모리</CardTitle>
              </div>
              {getStatusBadge(health.checks.memory.status)}
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={health.metrics.memory.percentage} className="mb-2" />
            <p className="text-sm text-gray-600">
              {formatBytes(health.metrics.memory.used)} / {formatBytes(health.metrics.memory.total)}
            </p>
            <p className="text-xs text-gray-500">
              사용률: {health.metrics.memory.percentage.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        {/* CPU */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                <CardTitle className="text-base">CPU</CardTitle>
              </div>
              {getStatusBadge(health.checks.cpu.status)}
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={health.metrics.cpu.usage} className="mb-2" />
            <p className="text-sm text-gray-600">
              {health.metrics.cpu.count} 코어
            </p>
            <p className="text-xs text-gray-500">
              사용률: {health.metrics.cpu.usage.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500">
              부하: {health.metrics.cpu.loadAverage.join(', ')}
            </p>
          </CardContent>
        </Card>

        {/* 디스크 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                <CardTitle className="text-base">디스크</CardTitle>
              </div>
              {getStatusBadge(health.checks.disk.status)}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{health.checks.disk.message}</p>
            {health.checks.disk.details?.message && (
              <p className="text-xs text-gray-500 mt-1">
                {health.checks.disk.details.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 의존성 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>외부 의존성</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {health.dependencies.map((dep, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <Network className="w-5 h-5" />
                  <div>
                    <p className="font-medium">{dep.name}</p>
                    {dep.version && (
                      <p className="text-xs text-gray-500">버전: {dep.version}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {dep.latency && (
                    <p className="text-sm text-gray-500">{dep.latency}ms</p>
                  )}
                  {getStatusBadge(dep.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 최근 업데이트 시간 */}
      {lastUpdate && (
        <div className="text-sm text-gray-500 text-center">
          마지막 업데이트: {lastUpdate.toLocaleString('ko-KR')}
        </div>
      )}
    </div>
  )
}