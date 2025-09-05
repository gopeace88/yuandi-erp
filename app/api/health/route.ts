import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import * as os from 'os'
import * as process from 'process'

// 헬스체크 타입 정의
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
    cache?: ComponentHealth
    queue?: ComponentHealth
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
  network?: {
    latency: number
    bandwidth?: number
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

// 메트릭 수집기
class MetricsCollector {
  private static requestCount = 0
  private static errorCount = 0
  private static startTime = Date.now()

  static incrementRequest() {
    this.requestCount++
  }

  static incrementError() {
    this.errorCount++
  }

  static getMetrics() {
    const uptime = Date.now() - this.startTime
    const rate = this.requestCount / (uptime / 1000)
    const errorRate = this.errorCount / Math.max(this.requestCount, 1)

    return {
      total: this.requestCount,
      rate,
      errorRate
    }
  }
}

// 데이터베이스 체크
async function checkDatabase(): Promise<ComponentHealth> {
  const startTime = Date.now()
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 간단한 쿼리로 연결 테스트
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1)
      .single()

    if (error) throw error

    const latency = Date.now() - startTime

    // 레이턴시에 따른 상태 결정
    const status = latency < 100 ? 'up' : latency < 500 ? 'degraded' : 'down'

    return {
      status,
      latency,
      message: `Database responding in ${latency}ms`,
      details: {
        connected: true,
        poolSize: process.env.DATABASE_POOL_SIZE || '10',
        version: process.env.DATABASE_VERSION || 'PostgreSQL 14'
      }
    }
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - startTime,
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    }
  }
}

// 스토리지 체크
async function checkStorage(): Promise<ComponentHealth> {
  const startTime = Date.now()
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 버킷 목록 조회로 스토리지 연결 테스트
    const { data, error } = await supabase.storage.listBuckets()

    if (error) throw error

    const latency = Date.now() - startTime

    return {
      status: 'up',
      latency,
      message: `Storage service available`,
      details: {
        buckets: data?.length || 0,
        provider: 'Supabase Storage'
      }
    }
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - startTime,
      message: `Storage service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// 메모리 체크
function checkMemory(): ComponentHealth {
  const totalMemory = os.totalmem()
  const freeMemory = os.freemem()
  const usedMemory = totalMemory - freeMemory
  const memoryUsage = (usedMemory / totalMemory) * 100

  // Node.js 프로세스 메모리
  const processMemory = process.memoryUsage()
  const heapUsed = processMemory.heapUsed / 1024 / 1024 // MB
  const heapTotal = processMemory.heapTotal / 1024 / 1024 // MB

  const status = memoryUsage < 70 ? 'up' : memoryUsage < 85 ? 'degraded' : 'down'

  return {
    status,
    message: `Memory usage: ${memoryUsage.toFixed(1)}%`,
    details: {
      system: {
        total: Math.round(totalMemory / 1024 / 1024 / 1024 * 10) / 10, // GB
        used: Math.round(usedMemory / 1024 / 1024 / 1024 * 10) / 10, // GB
        free: Math.round(freeMemory / 1024 / 1024 / 1024 * 10) / 10, // GB
        percentage: memoryUsage
      },
      process: {
        heapUsed: Math.round(heapUsed * 10) / 10, // MB
        heapTotal: Math.round(heapTotal * 10) / 10, // MB
        rss: Math.round(processMemory.rss / 1024 / 1024 * 10) / 10, // MB
        external: Math.round(processMemory.external / 1024 / 1024 * 10) / 10 // MB
      }
    }
  }
}

// CPU 체크
function checkCPU(): ComponentHealth {
  const cpuCount = os.cpus().length
  const loadAverage = os.loadavg()
  const cpuUsage = (loadAverage[0] / cpuCount) * 100

  const status = cpuUsage < 50 ? 'up' : cpuUsage < 80 ? 'degraded' : 'down'

  return {
    status,
    message: `CPU usage: ${cpuUsage.toFixed(1)}%`,
    details: {
      cores: cpuCount,
      model: os.cpus()[0]?.model,
      loadAverage: loadAverage.map(load => Math.round(load * 100) / 100),
      usage: cpuUsage
    }
  }
}

// 디스크 체크
function checkDisk(): ComponentHealth {
  // 간단한 디스크 체크 (실제로는 더 정교한 구현 필요)
  const status = 'up'
  
  return {
    status,
    message: 'Disk space available',
    details: {
      // Vercel/Edge 환경에서는 디스크 정보를 직접 가져올 수 없음
      message: 'Disk metrics not available in serverless environment'
    }
  }
}

// 외부 의존성 체크
async function checkDependencies(): Promise<DependencyHealth[]> {
  const dependencies: DependencyHealth[] = []

  // Supabase API 체크
  try {
    const startTime = Date.now()
    const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    
    dependencies.push({
      name: 'Supabase API',
      status: response.ok ? 'up' : 'down',
      latency: Date.now() - startTime
    })
  } catch {
    dependencies.push({
      name: 'Supabase API',
      status: 'down'
    })
  }

  // Vercel Edge 체크 (자체)
  dependencies.push({
    name: 'Vercel Edge',
    status: 'up',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown'
  })

  // 다음 우편번호 API 체크 (선택적)
  try {
    const startTime = Date.now()
    const response = await fetch('https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)
    })
    
    dependencies.push({
      name: 'Daum Postcode API',
      status: response.ok ? 'up' : 'down',
      latency: Date.now() - startTime
    })
  } catch {
    dependencies.push({
      name: 'Daum Postcode API', 
      status: 'unknown'
    })
  }

  return dependencies
}

// 시스템 메트릭 수집
function collectSystemMetrics(): SystemMetrics {
  const totalMemory = os.totalmem()
  const freeMemory = os.freemem()
  const usedMemory = totalMemory - freeMemory

  return {
    memory: {
      used: usedMemory,
      total: totalMemory,
      percentage: (usedMemory / totalMemory) * 100
    },
    cpu: {
      usage: os.loadavg()[0] / os.cpus().length * 100,
      count: os.cpus().length,
      loadAverage: os.loadavg()
    },
    disk: {
      used: 0, // Serverless 환경에서는 사용 불가
      total: 0,
      percentage: 0
    },
    requests: MetricsCollector.getMetrics()
  }
}

// 전체 상태 결정
function determineOverallStatus(checks: any): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map((check: any) => check.status)
  
  if (statuses.includes('down')) return 'unhealthy'
  if (statuses.includes('degraded')) return 'degraded'
  return 'healthy'
}

// 헬스체크 API
export async function GET(request: Request) {
  const headersList = headers()
  const authHeader = headersList.get('authorization')
  
  // 간단한 헬스체크 (인증 불필요)
  const url = new URL(request.url)
  if (url.searchParams.get('simple') === 'true') {
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
  }

  // 상세 헬스체크 (인증 필요)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    MetricsCollector.incrementRequest()

    // 모든 체크 병렬 실행
    const [database, storage, dependencies] = await Promise.all([
      checkDatabase(),
      checkStorage(),
      checkDependencies()
    ])

    const memory = checkMemory()
    const cpu = checkCPU()
    const disk = checkDisk()

    const checks = {
      database,
      storage,
      memory,
      cpu,
      disk
    }

    const result: HealthCheckResult = {
      status: determineOverallStatus(checks),
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || '1.0.0',
      uptime: process.uptime(),
      checks,
      metrics: collectSystemMetrics(),
      dependencies
    }

    // 상태 코드 결정
    const statusCode = result.status === 'healthy' ? 200 : 
                       result.status === 'degraded' ? 200 : 503

    return NextResponse.json(result, { status: statusCode })
  } catch (error) {
    MetricsCollector.incrementError()
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        database: { status: 'down' },
        storage: { status: 'down' },
        memory: { status: 'down' },
        cpu: { status: 'down' },
        disk: { status: 'down' }
      }
    }, { status: 503 })
  }
}

// 헬스체크 메트릭 리셋 (관리자용)
export async function POST(request: Request) {
  const headersList = headers()
  const authHeader = headersList.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 관리자 권한 확인 로직 추가 필요

  MetricsCollector['requestCount'] = 0
  MetricsCollector['errorCount'] = 0
  MetricsCollector['startTime'] = Date.now()

  return NextResponse.json({ 
    message: 'Metrics reset successfully',
    timestamp: new Date().toISOString()
  })
}