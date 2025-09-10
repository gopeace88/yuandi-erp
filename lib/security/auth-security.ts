import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerSession } from '@/lib/auth/session'

/**
 * Enhanced Authentication Security Module
 */

// Session configuration
export const SESSION_CONFIG = {
  maxAge: 7 * 24 * 60 * 60, // 7 days
  updateAge: 24 * 60 * 60, // Update session every 24 hours
  cookieName: 'yuandi-session',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
}

/**
 * Rate limiting for authentication attempts
 */
class AuthRateLimiter {
  private attempts: Map<string, { count: number; resetAt: number }> = new Map()
  private readonly maxAttempts = 5
  private readonly windowMs = 15 * 60 * 1000 // 15 minutes

  isBlocked(identifier: string): boolean {
    const now = Date.now()
    const record = this.attempts.get(identifier)

    if (!record) return false

    if (now > record.resetAt) {
      this.attempts.delete(identifier)
      return false
    }

    return record.count >= this.maxAttempts
  }

  recordAttempt(identifier: string): void {
    const now = Date.now()
    const record = this.attempts.get(identifier)

    if (!record || now > record.resetAt) {
      this.attempts.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs,
      })
    } else {
      record.count++
    }
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier)
  }

  getRemainingAttempts(identifier: string): number {
    const record = this.attempts.get(identifier)
    if (!record) return this.maxAttempts
    return Math.max(0, this.maxAttempts - record.count)
  }
}

export const authRateLimiter = new AuthRateLimiter()

/**
 * CSRF Token Management
 */
class CSRFTokenManager {
  private readonly secret = process.env.CSRF_SECRET || 'default-csrf-secret'
  private tokens: Map<string, { token: string; expiresAt: number }> = new Map()
  private readonly tokenLifetime = 60 * 60 * 1000 // 1 hour

  generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex')
    const hashedToken = this.hashToken(token)
    
    this.tokens.set(sessionId, {
      token: hashedToken,
      expiresAt: Date.now() + this.tokenLifetime,
    })

    return token
  }

  validateToken(sessionId: string, token: string): boolean {
    const record = this.tokens.get(sessionId)
    
    if (!record) return false
    
    if (Date.now() > record.expiresAt) {
      this.tokens.delete(sessionId)
      return false
    }

    const hashedToken = this.hashToken(token)
    return crypto.timingSafeEqual(
      Buffer.from(record.token),
      Buffer.from(hashedToken)
    )
  }

  private hashToken(token: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(token)
      .digest('hex')
  }

  cleanup(): void {
    const now = Date.now()
    for (const [sessionId, record] of this.tokens.entries()) {
      if (now > record.expiresAt) {
        this.tokens.delete(sessionId)
      }
    }
  }
}

export const csrfTokenManager = new CSRFTokenManager()

/**
 * Session Security Validator
 */
export class SessionValidator {
  static async validateSession(request: NextRequest): Promise<{
    valid: boolean
    session?: any
    error?: string
  }> {
    try {
      const session = await getServerSession()

      if (!session) {
        return { valid: false, error: 'No session found' }
      }

      // Check session expiry  
      const sessionAge = Date.now() - new Date(session.expires_at || Date.now()).getTime()
      if (sessionAge > SESSION_CONFIG.maxAge * 1000) {
        return { valid: false, error: 'Session expired' }
      }

      // Check if user is active
      if (!(session.user as any).active) {
        return { valid: false, error: 'User account is inactive' }
      }

      // Validate session integrity
      if (!this.validateSessionIntegrity(session)) {
        return { valid: false, error: 'Session integrity check failed' }
      }

      return { valid: true, session }
    } catch (error) {
      console.error('Session validation error:', error)
      return { valid: false, error: 'Session validation failed' }
    }
  }

  private static validateSessionIntegrity(session: any): boolean {
    // Check required session fields
    const requiredFields = ['user', 'expires_at']
    for (const field of requiredFields) {
      if (!(field in session)) {
        return false
      }
    }

    // Check user object structure
    const requiredUserFields = ['id', 'email', 'role']
    for (const field of requiredUserFields) {
      if (!(field in session.user)) {
        return false
      }
    }

    return true
  }
}

/**
 * Password Security
 */
export class PasswordValidator {
  static readonly MIN_LENGTH = 8
  static readonly REQUIRE_UPPERCASE = true
  static readonly REQUIRE_LOWERCASE = true
  static readonly REQUIRE_NUMBER = true
  static readonly REQUIRE_SPECIAL = true

  static validate(password: string): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`)
    }

    if (this.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (this.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (this.REQUIRE_NUMBER && !/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (this.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    // Check for common weak passwords
    if (this.isCommonPassword(password)) {
      errors.push('Password is too common, please choose a stronger password')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  private static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '12345678', 'password123', 'yuandi123!',
      'qwerty123', 'letmein', 'welcome123', 'monkey123',
    ]
    
    const lowerPassword = password.toLowerCase()
    return commonPasswords.some(common => lowerPassword.includes(common))
  }

  static generateSecurePassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    const allChars = uppercase + lowercase + numbers + special
    let password = ''
    
    // Ensure at least one of each required type
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]
    
    // Fill the rest randomly
    for (let i = password.length; i < 16; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }
}

/**
 * Two-Factor Authentication
 */
export class TwoFactorAuth {
  private static readonly issuer = 'YUANDI'
  private static readonly algorithm = 'sha256'
  private static readonly digits = 6
  private static readonly period = 30

  static generateSecret(): string {
    return crypto.randomBytes(32).toString('base64')
  }

  static generateTOTP(secret: string): string {
    const counter = Math.floor(Date.now() / 1000 / this.period)
    const hmac = crypto.createHmac(this.algorithm, Buffer.from(secret, 'base64'))
    
    const counterBuffer = Buffer.alloc(8)
    counterBuffer.writeBigInt64BE(BigInt(counter))
    
    const hash = hmac.update(counterBuffer).digest()
    const offset = hash[hash.length - 1] & 0x0f
    
    const binary = 
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)
    
    const otp = binary % Math.pow(10, this.digits)
    return otp.toString().padStart(this.digits, '0')
  }

  static verifyTOTP(secret: string, token: string, window: number = 1): boolean {
    const currentCounter = Math.floor(Date.now() / 1000 / this.period)
    
    for (let i = -window; i <= window; i++) {
      const counter = currentCounter + i
      const expectedToken = this.generateTOTP(secret)
      
      if (crypto.timingSafeEqual(
        Buffer.from(token),
        Buffer.from(expectedToken)
      )) {
        return true
      }
    }
    
    return false
  }

  static generateQRCode(email: string, secret: string): string {
    const otpauth = `otpauth://totp/${this.issuer}:${email}?secret=${secret}&issuer=${this.issuer}&algorithm=${this.algorithm.toUpperCase()}&digits=${this.digits}&period=${this.period}`
    return otpauth
  }
}

/**
 * IP-based Security
 */
export class IPSecurity {
  private static readonly maxFailedAttempts = 10
  private static readonly blockDuration = 60 * 60 * 1000 // 1 hour
  private static blockedIPs: Map<string, number> = new Map()

  static isIPBlocked(ip: string): boolean {
    const blockedUntil = this.blockedIPs.get(ip)
    
    if (!blockedUntil) return false
    
    if (Date.now() > blockedUntil) {
      this.blockedIPs.delete(ip)
      return false
    }
    
    return true
  }

  static blockIP(ip: string): void {
    this.blockedIPs.set(ip, Date.now() + this.blockDuration)
  }

  static unblockIP(ip: string): void {
    this.blockedIPs.delete(ip)
  }

  static getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
           request.headers.get('x-real-ip') ||
           request.headers.get('cf-connecting-ip') ||
           'unknown'
  }

  static isPrivateIP(ip: string): boolean {
    const parts = ip.split('.')
    if (parts.length !== 4) return false
    
    const first = parseInt(parts[0])
    const second = parseInt(parts[1])
    
    // Check for private IP ranges
    return (
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      first === 127
    )
  }
}

/**
 * Security Audit Logger
 */
export class SecurityAuditLogger {
  static async logSecurityEvent(event: {
    type: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 
          'password_change' | 'permission_denied' | 'suspicious_activity'
    userId?: string
    ip: string
    userAgent: string
    details?: any
  }): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event,
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[SECURITY AUDIT]', logEntry)
    }

    // In production, send to logging service
    if (process.env.SECURITY_LOG_ENDPOINT) {
      try {
        await fetch(process.env.SECURITY_LOG_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry),
        })
      } catch (error) {
        console.error('Failed to log security event:', error)
      }
    }
  }
}

// Cleanup expired tokens periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    csrfTokenManager.cleanup()
  }, 60 * 60 * 1000) // Every hour
}