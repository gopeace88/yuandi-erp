'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { 
  Activity, AlertCircle, CheckCircle, Clock, Database, 
  Globe, HardDrive, RefreshCw, Server, Shield, TrendingUp,
  Users, Zap, AlertTriangle, Info, Wifi, WifiOff
} from 'lucide-react'

// 실시간 시스템 메트릭 타입
interface SystemMetrics {
  timestamp: Date
  cpu: number
  memory: number
  disk: number
  network: {
    in: number
    out: number
  }
  database: {
    connections: number
    queryTime: number
    slowQueries: number
  }
  api: {
    requests: number
    avgResponseTime: number
    errorRate: number
  }
}

// 알림 타입
interface SystemAlert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  type: string
  message: string
  timestamp: Date
  resolved: boolean
}

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics[]>([])
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // 모의 실시간 데이터 생성
  useEffect(() => {
    const generateMetrics = (): SystemMetrics => ({
      timestamp: new Date(),
      cpu: Math.random() * 100,
      memory: 60 + Math.random() * 30,
      disk: 45 + Math.random() * 10,
      network: {
        in: Math.random() * 1000,
        out: Math.random() * 800
      },
      database: {
        connections: Math.floor(20 + Math.random() * 30),
        queryTime: Math.random() * 500,
        slowQueries: Math.floor(Math.random() * 5)
      },
      api: {
        requests: Math.floor(100 + Math.random() * 200),
        avgResponseTime: 50 + Math.random() * 150,
        errorRate: Math.random() * 5
      }
    })

    const interval = autoRefresh ? setInterval(() => {
      setMetrics(prev => [...prev.slice(-59), generateMetrics()].slice(-60))
    }, 5000) : null

    // 초기 데이터
    setMetrics(Array(20).fill(null).map(() => generateMetrics()))

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  // 모의 알림 생성
  useEffect(() => {
    const sampleAlerts: SystemAlert[] = [
      {
        id: '1',
        severity: 'warning',
        type: 'performance',
        message: 'API 응답 시간이 평균보다 50% 높습니다',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        resolved: false
      },
      {
        id: '2',
        severity: 'info',
        type: 'backup',
        message: '일일 백업이 성공적으로 완료되었습니다',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        resolved: true
      },
      {
        id: '3',
        severity: 'critical',
        type: 'database',
        message: '데이터베이스 연결 풀이 80% 이상 사용중입니다',
        timestamp: new Date(Date.now() - 1000 * 60 * 2),
        resolved: false
      }
    ]
    setAlerts(sampleAlerts)
  }, [])

  const currentMetrics = metrics[metrics.length - 1] || {
    cpu: 0,
    memory: 0,
    disk: 0,
    network: { in: 0, out: 0 },
    database: { connections: 0, queryTime: 0, slowQueries: 0 },
    api: { requests: 0, avgResponseTime: 0, errorRate: 0 }
  }

  // 상태별 색상
  const getStatusColor = (value: number, thresholds: { warning: number, critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-500'
    if (value >= thresholds.warning) return 'text-yellow-500'
    return 'text-green-500'
  }

  // 알림 아이콘
  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default: return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">시스템 모니터링</h1>
          <p className="text-gray-500">실시간 시스템 상태 및 성능 모니터링</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={isConnected ? "success" : "destructive"} className="flex items-center gap-1">
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? '연결됨' : '연결 끊김'}
          </Badge>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1h">1시간</option>
            <option value="6h">6시간</option>
            <option value="24h">24시간</option>
            <option value="7d">7일</option>
          </select>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? '자동 새로고침' : '일시정지'}
          </Button>
        </div>
      </div>

      {/* 주요 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">CPU 사용률</CardTitle>
              <Zap className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(currentMetrics.cpu, { warning: 70, critical: 90 })}`}>
              {currentMetrics.cpu.toFixed(1)}%
            </div>
            <Progress value={currentMetrics.cpu} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">평균: 65.3%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">메모리 사용률</CardTitle>
              <HardDrive className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(currentMetrics.memory, { warning: 80, critical: 95 })}`}>
              {currentMetrics.memory.toFixed(1)}%
            </div>
            <Progress value={currentMetrics.memory} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">8GB / 16GB</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">디스크 사용률</CardTitle>
              <Database className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(currentMetrics.disk, { warning: 70, critical: 85 })}`}>
              {currentMetrics.disk.toFixed(1)}%
            </div>
            <Progress value={currentMetrics.disk} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">45GB / 100GB</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">활성 연결</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {currentMetrics.database.connections}
            </div>
            <Progress value={currentMetrics.database.connections} max={100} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">최대: 100</p>
          </CardContent>
        </Card>
      </div>

      {/* 알림 섹션 */}
      {alerts.filter(a => !a.resolved).length > 0 && (
        <div className="space-y-2">
          {alerts.filter(a => !a.resolved).map(alert => (
            <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
              {getAlertIcon(alert.severity)}
              <AlertTitle className="ml-2">{alert.type.toUpperCase()}</AlertTitle>
              <AlertDescription className="ml-2">
                {alert.message}
                <span className="text-xs text-gray-500 ml-4">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* 상세 메트릭 탭 */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="performance">성능</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="database">데이터베이스</TabsTrigger>
          <TabsTrigger value="network">네트워크</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>CPU & 메모리 추이</CardTitle>
                <CardDescription>최근 {selectedTimeRange} 시스템 자원 사용률</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cpu" 
                      stroke="#8884d8" 
                      name="CPU (%)"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memory" 
                      stroke="#82ca9d" 
                      name="메모리 (%)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>시스템 상태</CardTitle>
                <CardDescription>전체 시스템 건강도</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">웹 서버</span>
                    <Badge variant="success">정상</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">데이터베이스</span>
                    <Badge variant="warning">경고</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">캐시 서버</span>
                    <Badge variant="success">정상</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">큐 서비스</span>
                    <Badge variant="success">정상</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">스토리지</span>
                    <Badge variant="success">정상</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">백업</span>
                    <Badge variant="success">정상</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>API 요청 추이</CardTitle>
                <CardDescription>분당 요청 수 및 응답 시간</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="api.requests" 
                      stroke="#8884d8" 
                      fill="#8884d8"
                      name="요청 수"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="api.avgResponseTime" 
                      stroke="#ff7300" 
                      name="응답 시간 (ms)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API 엔드포인트 상태</CardTitle>
                <CardDescription>주요 엔드포인트별 성능</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>/api/orders</span>
                      <span className="text-green-500">45ms</span>
                    </div>
                    <Progress value={45} max={200} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>/api/products</span>
                      <span className="text-green-500">32ms</span>
                    </div>
                    <Progress value={32} max={200} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>/api/inventory</span>
                      <span className="text-yellow-500">156ms</span>
                    </div>
                    <Progress value={156} max={200} className="bg-yellow-100" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>/api/dashboard</span>
                      <span className="text-green-500">89ms</span>
                    </div>
                    <Progress value={89} max={200} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>/api/export</span>
                      <span className="text-red-500">450ms</span>
                    </div>
                    <Progress value={450} max={500} className="bg-red-100" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>에러율</CardTitle>
              <CardDescription>HTTP 상태 코드별 분포</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: '2xx 성공', value: 92, fill: '#10b981' },
                      { name: '3xx 리다이렉트', value: 3, fill: '#3b82f6' },
                      { name: '4xx 클라이언트 오류', value: 4, fill: '#f59e0b' },
                      { name: '5xx 서버 오류', value: 1, fill: '#ef4444' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#3b82f6" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>데이터베이스 연결</CardTitle>
                <CardDescription>연결 풀 사용률</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.slice(-10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Bar 
                      dataKey="database.connections" 
                      fill="#8884d8"
                      name="활성 연결"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>쿼리 성능</CardTitle>
                <CardDescription>평균 쿼리 실행 시간</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SELECT 쿼리</span>
                    <span className="text-sm font-medium">12ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">INSERT 쿼리</span>
                    <span className="text-sm font-medium">8ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">UPDATE 쿼리</span>
                    <span className="text-sm font-medium">15ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">DELETE 쿼리</span>
                    <span className="text-sm font-medium">5ms</span>
                  </div>
                  <div className="pt-4 mt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">느린 쿼리</span>
                      <Badge variant="warning">{currentMetrics.database.slowQueries}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>테이블별 사용량</CardTitle>
              <CardDescription>주요 테이블 크기 및 레코드 수</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>orders (45,230 rows)</span>
                    <span>2.3 GB</span>
                  </div>
                  <Progress value={23} max={100} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>order_items (156,890 rows)</span>
                    <span>1.8 GB</span>
                  </div>
                  <Progress value={18} max={100} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>products (1,250 rows)</span>
                    <span>456 MB</span>
                  </div>
                  <Progress value={5} max={100} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>inventory_movements (89,450 rows)</span>
                    <span>890 MB</span>
                  </div>
                  <Progress value={9} max={100} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>네트워크 트래픽</CardTitle>
              <CardDescription>인바운드/아웃바운드 트래픽</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="network.in" 
                    stackId="1"
                    stroke="#8884d8" 
                    fill="#8884d8"
                    name="인바운드 (KB/s)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="network.out" 
                    stackId="1"
                    stroke="#82ca9d" 
                    fill="#82ca9d"
                    name="아웃바운드 (KB/s)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>CDN 캐시 히트율</CardTitle>
                <CardDescription>정적 자산 캐시 효율성</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-500">94.5%</div>
                  <p className="text-sm text-gray-500 mt-2">캐시 히트율</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>총 요청</span>
                      <span>1,234,567</span>
                    </div>
                    <div className="flex justify-between">
                      <span>캐시 히트</span>
                      <span className="text-green-500">1,166,666</span>
                    </div>
                    <div className="flex justify-between">
                      <span>캐시 미스</span>
                      <span className="text-red-500">67,901</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>지역별 레이턴시</CardTitle>
                <CardDescription>주요 지역 응답 시간</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">서울</span>
                    <span className="text-sm font-medium text-green-500">12ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">도쿄</span>
                    <span className="text-sm font-medium text-green-500">25ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">싱가포르</span>
                    <span className="text-sm font-medium text-yellow-500">65ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">시드니</span>
                    <span className="text-sm font-medium text-yellow-500">98ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">런던</span>
                    <span className="text-sm font-medium text-orange-500">145ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">뉴욕</span>
                    <span className="text-sm font-medium text-orange-500">178ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 이벤트 로그 */}
      <Card>
        <CardHeader>
          <CardTitle>시스템 이벤트 로그</CardTitle>
          <CardDescription>최근 시스템 이벤트 및 활동</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { time: '10:45:23', type: 'info', message: '일일 백업 시작' },
              { time: '10:42:15', type: 'success', message: '캐시 갱신 완료' },
              { time: '10:38:45', type: 'warning', message: 'API 응답 지연 감지 (/api/export)' },
              { time: '10:35:12', type: 'info', message: '새로운 배포 감지 (v2.0.1)' },
              { time: '10:30:00', type: 'success', message: '시스템 헬스체크 통과' },
            ].map((log, index) => (
              <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                <span className="text-xs text-gray-500 w-16">{log.time}</span>
                <Badge 
                  variant={
                    log.type === 'success' ? 'success' : 
                    log.type === 'warning' ? 'warning' : 
                    'default'
                  }
                  className="w-20 justify-center"
                >
                  {log.type}
                </Badge>
                <span className="text-sm">{log.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}