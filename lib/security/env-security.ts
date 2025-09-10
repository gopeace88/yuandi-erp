/**
 * Environment Variable Security Module for YUANDI
 * 
 * Validates, sanitizes, and secures environment variables
 * Prevents exposure of sensitive data and configuration errors
 */

import crypto from 'crypto'

/**
 * Environment variable categories and security levels
 */
export enum SecurityLevel {
  PUBLIC = 'public',     // Can be exposed to client
  PRIVATE = 'private',   // Server-side only
  SECRET = 'secret',     // Highly sensitive, encrypted
  CRITICAL = 'critical', // Critical security keys
}

/**
 * Environment variable definitions with security metadata
 */
export const ENV_DEFINITIONS = {
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: {
    level: SecurityLevel.PUBLIC,
    required: true,
    validator: (value: string) => value.startsWith('https://'),
    description: 'Supabase project URL',
  },
  NEXT_PUBLIC_SUPABASE_API_KEY: {
    level: SecurityLevel.PUBLIC,
    required: true,
    validator: (value: string) => value.length > 20,
    description: 'Supabase public anon key',
  },
  SUPABASE_API_KEY: {
    level: SecurityLevel.SECRET,
    required: true,
    validator: (value: string) => value.length > 20,
    description: 'Supabase service role key (NEVER expose to client)',
    sensitive: true,
  },
  SUPABASE_JWT_SECRET: {
    level: SecurityLevel.CRITICAL,
    required: false,
    validator: (value: string) => value.length >= 32,
    description: 'JWT secret for token validation',
    sensitive: true,
  },

  // Security Configuration
  CSRF_SECRET: {
    level: SecurityLevel.CRITICAL,
    required: false,
    validator: (value: string) => value.length >= 32,
    description: 'CSRF token generation secret',
    sensitive: true,
    default: () => crypto.randomBytes(32).toString('hex'),
  },
  ENCRYPTION_KEY: {
    level: SecurityLevel.CRITICAL,
    required: false,
    validator: (value: string) => value.length === 64,
    description: 'Encryption key for sensitive data',
    sensitive: true,
    default: () => crypto.randomBytes(32).toString('hex'),
  },

  // Application Configuration
  NODE_ENV: {
    level: SecurityLevel.PUBLIC,
    required: true,
    validator: (value: string) => ['development', 'production', 'test'].includes(value),
    description: 'Node environment',
  },
  NEXT_PUBLIC_APP_URL: {
    level: SecurityLevel.PUBLIC,
    required: true,
    validator: (value: string) => value.startsWith('http'),
    description: 'Application URL',
  },

  // External Services
  DAUM_POSTCODE_KEY: {
    level: SecurityLevel.PRIVATE,
    required: false,
    validator: (value: string) => value.length > 10,
    description: 'Daum Postcode API key',
  },
  CRON_SECRET: {
    level: SecurityLevel.SECRET,
    required: false,
    validator: (value: string) => value.length >= 20,
    description: 'Secret for cron job authentication',
    sensitive: true,
  },

  // Analytics and Monitoring
  NEXT_PUBLIC_ANALYTICS_URL: {
    level: SecurityLevel.PUBLIC,
    required: false,
    validator: (value: string) => value.startsWith('http'),
    description: 'Analytics endpoint URL',
  },
  NEXT_PUBLIC_MONITORING_URL: {
    level: SecurityLevel.PUBLIC,
    required: false,
    validator: (value: string) => value.startsWith('http'),
    description: 'Monitoring endpoint URL',
  },
  SECURITY_LOG_ENDPOINT: {
    level: SecurityLevel.PRIVATE,
    required: false,
    validator: (value: string) => value.startsWith('http'),
    description: 'Security event logging endpoint',
  },

  // Development Only
  DEBUG_MODE: {
    level: SecurityLevel.PRIVATE,
    required: false,
    validator: (value: string) => ['true', 'false'].includes(value),
    description: 'Enable debug mode (development only)',
    developmentOnly: true,
  },
}

/**
 * Environment Variable Security Manager
 */
export class EnvSecurityManager {
  private static instance: EnvSecurityManager
  private encryptionKey?: Buffer
  private violations: Array<{
    variable: string
    issue: string
    severity: 'critical' | 'high' | 'medium' | 'low'
  }> = []

  private constructor() {
    this.initializeEncryption()
  }

  static getInstance(): EnvSecurityManager {
    if (!this.instance) {
      this.instance = new EnvSecurityManager()
    }
    return this.instance
  }

  /**
   * Initialize encryption for sensitive variables
   */
  private initializeEncryption(): void {
    const key = process.env.ENCRYPTION_KEY
    if (key) {
      this.encryptionKey = Buffer.from(key, 'hex')
    }
  }

  /**
   * Validate all environment variables
   */
  validateAll(): {
    valid: boolean
    violations: typeof this.violations
    summary: string
  } {
    this.violations = []

    for (const [key, definition] of Object.entries(ENV_DEFINITIONS)) {
      this.validateVariable(key, definition)
    }

    // Check for unexpected variables
    this.checkUnexpectedVariables()

    // Check for sensitive data exposure
    this.checkSensitiveExposure()

    // Verify production requirements
    if (process.env.NODE_ENV === 'production') {
      this.verifyProductionRequirements()
    }

    return {
      valid: this.violations.length === 0,
      violations: this.violations,
      summary: this.generateSummary(),
    }
  }

  /**
   * Validate individual environment variable
   */
  private validateVariable(key: string, definition: any): void {
    const value = process.env[key]

    // Check if required variable is missing
    if (definition.required && !value) {
      // Apply default if available
      if (definition.default) {
        process.env[key] = definition.default()
      } else {
        this.violations.push({
          variable: key,
          issue: 'Required variable is missing',
          severity: 'critical',
        })
        return
      }
    }

    // Skip validation if not present and not required
    if (!value && !definition.required) {
      return
    }

    // Validate value
    if (value && definition.validator && !definition.validator(value)) {
      this.violations.push({
        variable: key,
        issue: 'Variable failed validation',
        severity: definition.level === SecurityLevel.CRITICAL ? 'critical' : 'high',
      })
    }

    // Check development-only variables in production
    if (definition.developmentOnly && process.env.NODE_ENV === 'production' && value) {
      this.violations.push({
        variable: key,
        issue: 'Development-only variable set in production',
        severity: 'high',
      })
    }

    // Check for hardcoded secrets
    if (definition.sensitive && value) {
      this.checkHardcodedSecret(key, value)
    }
  }

  /**
   * Check for unexpected environment variables
   */
  private checkUnexpectedVariables(): void {
    const definedKeys = Object.keys(ENV_DEFINITIONS)
    const actualKeys = Object.keys(process.env)

    for (const key of actualKeys) {
      // Skip Node.js internal variables
      if (key.startsWith('npm_') || key.startsWith('NODE_') || key === 'PATH') {
        continue
      }

      // Check if it's a known variable
      if (!definedKeys.includes(key) && !key.startsWith('NEXT_')) {
        this.violations.push({
          variable: key,
          issue: 'Unexpected environment variable detected',
          severity: 'low',
        })
      }
    }
  }

  /**
   * Check for sensitive data exposure
   */
  private checkSensitiveExposure(): void {
    // Check if private/secret variables are exposed as public
    for (const [key, definition] of Object.entries(ENV_DEFINITIONS)) {
      if (definition.level === SecurityLevel.SECRET || definition.level === SecurityLevel.CRITICAL) {
        // Check if there's a public version of this variable
        const publicKey = `NEXT_PUBLIC_${key}`
        if (process.env[publicKey]) {
          this.violations.push({
            variable: publicKey,
            issue: `Potentially exposing sensitive data from ${key}`,
            severity: 'critical',
          })
        }
      }
    }

    // Check for sensitive patterns in public variables
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /private/i,
      /token/i,
      /key/i,
      /credential/i,
    ]

    for (const key of Object.keys(process.env)) {
      if (key.startsWith('NEXT_PUBLIC_')) {
        for (const pattern of sensitivePatterns) {
          if (pattern.test(key) && !ENV_DEFINITIONS[key]) {
            this.violations.push({
              variable: key,
              issue: 'Public variable name suggests sensitive data',
              severity: 'high',
            })
          }
        }
      }
    }
  }

  /**
   * Check for hardcoded secrets
   */
  private checkHardcodedSecret(key: string, value: string): void {
    const commonSecrets = [
      'password123',
      'secret123',
      'test123',
      'yuandi123!',
      'demo123',
      '12345678',
      'changeme',
      'default',
    ]

    if (commonSecrets.includes(value.toLowerCase())) {
      this.violations.push({
        variable: key,
        issue: 'Using common/weak secret value',
        severity: 'critical',
      })
    }

    // Check for placeholder values
    if (value.includes('YOUR_') || value.includes('CHANGE_ME') || value === 'xxx') {
      this.violations.push({
        variable: key,
        issue: 'Placeholder value not replaced',
        severity: 'critical',
      })
    }
  }

  /**
   * Verify production requirements
   */
  private verifyProductionRequirements(): void {
    const productionRequired = [
      'SUPABASE_API_KEY',
      'CSRF_SECRET',
      'ENCRYPTION_KEY',
    ]

    for (const key of productionRequired) {
      if (!process.env[key]) {
        this.violations.push({
          variable: key,
          issue: 'Critical production variable missing',
          severity: 'critical',
        })
      }
    }

    // Check HTTPS enforcement
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
      this.violations.push({
        variable: 'NEXT_PUBLIC_APP_URL',
        issue: 'Production URL must use HTTPS',
        severity: 'critical',
      })
    }
  }

  /**
   * Generate validation summary
   */
  private generateSummary(): string {
    if (this.violations.length === 0) {
      return 'All environment variables are properly configured'
    }

    const critical = this.violations.filter(v => v.severity === 'critical').length
    const high = this.violations.filter(v => v.severity === 'high').length
    const medium = this.violations.filter(v => v.severity === 'medium').length
    const low = this.violations.filter(v => v.severity === 'low').length

    return `Found ${this.violations.length} violations: ${critical} critical, ${high} high, ${medium} medium, ${low} low`
  }

  /**
   * Encrypt sensitive value
   */
  encryptValue(value: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured')
    }

    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv)
    
    let encrypted = cipher.update(value, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return `${iv.toString('hex')}:${encrypted}`
  }

  /**
   * Decrypt sensitive value
   */
  decryptValue(encryptedValue: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured')
    }

    const [ivHex, encrypted] = encryptedValue.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  /**
   * Get safe environment variables for client
   */
  getPublicVariables(): Record<string, string> {
    const publicVars: Record<string, string> = {}

    for (const [key, definition] of Object.entries(ENV_DEFINITIONS)) {
      if (definition.level === SecurityLevel.PUBLIC && process.env[key]) {
        publicVars[key] = process.env[key]!
      }
    }

    return publicVars
  }

  /**
   * Mask sensitive values for logging
   */
  static maskSensitiveValue(value: string, showChars: number = 4): string {
    if (value.length <= showChars * 2) {
      return '***'
    }
    
    const start = value.substring(0, showChars)
    const end = value.substring(value.length - showChars)
    return `${start}${'*'.repeat(8)}${end}`
  }
}

/**
 * Environment configuration validator
 */
export function validateEnvironment(): void {
  const manager = EnvSecurityManager.getInstance()
  const result = manager.validateAll()

  if (!result.valid) {
    console.error('Environment variable validation failed:')
    console.error(result.summary)
    
    // Log violations
    for (const violation of result.violations) {
      const emoji = violation.severity === 'critical' ? '🚨' :
                   violation.severity === 'high' ? '⚠️' :
                   violation.severity === 'medium' ? '⚡' : 'ℹ️'
      
      console.error(`${emoji} ${violation.variable}: ${violation.issue}`)
    }

    // Exit in production if critical violations exist
    if (process.env.NODE_ENV === 'production' && 
        result.violations.some(v => v.severity === 'critical')) {
      process.exit(1)
    }
  }
}

/**
 * Secure environment variable getter
 */
export function getEnvVar(key: string): string | undefined {
  const definition = ENV_DEFINITIONS[key as keyof typeof ENV_DEFINITIONS]
  
  if (!definition) {
    console.warn(`Accessing undefined environment variable: ${key}`)
    return process.env[key]
  }

  const value = process.env[key]
  
  // Apply default if needed
  if (!value && definition.default) {
    const defaultValue = definition.default()
    process.env[key] = defaultValue
    return defaultValue
  }

  return value
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Generate .env.example file content
 */
export function generateEnvExample(): string {
  const lines: string[] = [
    '# YUANDI Environment Variables',
    '# Copy this file to .env.local and fill in the values',
    '',
  ]

  const categories = {
    'Supabase Configuration': ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_API_KEY', 'SUPABASE_API_KEY'],
    'Security Configuration': ['CSRF_SECRET', 'ENCRYPTION_KEY'],
    'Application Configuration': ['NODE_ENV', 'NEXT_PUBLIC_APP_URL'],
    'External Services': ['DAUM_POSTCODE_KEY', 'CRON_SECRET'],
    'Analytics and Monitoring': ['NEXT_PUBLIC_ANALYTICS_URL', 'NEXT_PUBLIC_MONITORING_URL', 'SECURITY_LOG_ENDPOINT'],
  }

  for (const [category, keys] of Object.entries(categories)) {
    lines.push(`# ${category}`)
    
    for (const key of keys) {
      const definition = ENV_DEFINITIONS[key as keyof typeof ENV_DEFINITIONS]
      if (definition) {
        lines.push(`# ${definition.description}`)
        if (definition.required) {
          lines.push(`# Required: Yes`)
        }
        if (definition.sensitive) {
          lines.push(`# ⚠️ SENSITIVE - Never commit with real values`)
        }
        
        // Add example value
        const exampleValue = definition.sensitive ? 'YOUR_SECRET_HERE' : 'YOUR_VALUE_HERE'
        lines.push(`${key}=${exampleValue}`)
        lines.push('')
      }
    }
  }

  return lines.join('\n')
}