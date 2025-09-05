import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

// 로그 레벨 정의
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
}

// 로그 색상 정의
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey'
}

winston.addColors(colors)

// 로그 포맷 정의
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...metadata } = info
    let msg = `${timestamp} [${level}] ${message}`
    
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`
    }
    
    return msg
  })
)

// 개발 환경 포맷 (색상 포함)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...metadata } = info
    let msg = `${timestamp} [${level}] ${message}`
    
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata, null, 2)}`
    }
    
    return msg
  })
)

// 트랜스포트 설정
const transports = []

// 콘솔 출력
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: devFormat,
      level: 'debug'
    })
  )
} else {
  transports.push(
    new winston.transports.Console({
      format,
      level: 'info'
    })
  )
}

// 파일 로그 (에러)
transports.push(
  new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '30d',
    format
  })
)

// 파일 로그 (전체)
transports.push(
  new DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format
  })
)

// Logger 인스턴스 생성
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports,
  exitOnError: false
})

// 스트림 (Morgan과 연동용)
export const stream = {
  write: (message: string) => {
    logger.http(message.trim())
  }
}

// 커스텀 로거 클래스
export class ApplicationLogger {
  private context: string

  constructor(context: string) {
    this.context = context
  }

  private log(level: string, message: string, metadata?: any) {
    logger.log(level, message, {
      context: this.context,
      ...metadata
    })
  }

  error(message: string, error?: Error, metadata?: any) {
    this.log('error', message, {
      error: error?.message,
      stack: error?.stack,
      ...metadata
    })
  }

  warn(message: string, metadata?: any) {
    this.log('warn', message, metadata)
  }

  info(message: string, metadata?: any) {
    this.log('info', message, metadata)
  }

  http(message: string, metadata?: any) {
    this.log('http', message, metadata)
  }

  verbose(message: string, metadata?: any) {
    this.log('verbose', message, metadata)
  }

  debug(message: string, metadata?: any) {
    this.log('debug', message, metadata)
  }

  // 성능 측정 로깅
  performance(operation: string, duration: number, metadata?: any) {
    this.log('info', `Performance: ${operation}`, {
      duration,
      ...metadata
    })
  }

  // 감사 로깅
  audit(action: string, userId: string, metadata?: any) {
    this.log('info', `Audit: ${action}`, {
      userId,
      timestamp: new Date().toISOString(),
      ...metadata
    })
  }

  // 비즈니스 이벤트 로깅
  businessEvent(event: string, metadata?: any) {
    this.log('info', `Business Event: ${event}`, metadata)
  }
}

// 글로벌 에러 핸들러
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  })
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason,
    promise
  })
})

// 로거 팩토리
export function createLogger(context: string): ApplicationLogger {
  return new ApplicationLogger(context)
}

export default logger