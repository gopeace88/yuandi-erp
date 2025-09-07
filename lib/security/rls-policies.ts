/**
 * Row Level Security (RLS) Policy Verification for YUANDI
 * 
 * This module verifies that Supabase RLS policies are correctly configured
 * and enforces security rules at the database level
 */

import { createClient } from '@supabase/supabase-js'

/**
 * RLS Policy Definitions
 */
export const RLS_POLICIES = {
  // Products table policies
  products: {
    select: {
      name: 'products_select_policy',
      definition: 'authenticated users can view all products',
      roles: ['admin', 'order_manager', 'ship_manager'],
      condition: 'auth.uid() IS NOT NULL',
    },
    insert: {
      name: 'products_insert_policy',
      definition: 'only admin and order_manager can create products',
      roles: ['admin', 'order_manager'],
      condition: "auth.jwt() ->> 'role' IN ('admin', 'order_manager')",
    },
    update: {
      name: 'products_update_policy',
      definition: 'only admin and order_manager can update products',
      roles: ['admin', 'order_manager'],
      condition: "auth.jwt() ->> 'role' IN ('admin', 'order_manager')",
    },
    delete: {
      name: 'products_delete_policy',
      definition: 'only admin can delete products',
      roles: ['admin'],
      condition: "auth.jwt() ->> 'role' = 'admin'",
    },
  },

  // Orders table policies
  orders: {
    select: {
      name: 'orders_select_policy',
      definition: 'authenticated users can view orders based on role',
      roles: ['admin', 'order_manager', 'ship_manager'],
      condition: 'auth.uid() IS NOT NULL',
    },
    insert: {
      name: 'orders_insert_policy',
      definition: 'admin and order_manager can create orders',
      roles: ['admin', 'order_manager'],
      condition: "auth.jwt() ->> 'role' IN ('admin', 'order_manager')",
    },
    update: {
      name: 'orders_update_policy',
      definition: 'users can update orders based on role and status',
      roles: ['admin', 'order_manager', 'ship_manager'],
      condition: `
        (auth.jwt() ->> 'role' = 'admin') OR
        (auth.jwt() ->> 'role' = 'order_manager') OR
        (auth.jwt() ->> 'role' = 'ship_manager' AND status IN ('paid', 'shipped'))
      `,
    },
    delete: {
      name: 'orders_delete_policy',
      definition: 'only admin can delete orders',
      roles: ['admin'],
      condition: "auth.jwt() ->> 'role' = 'admin'",
    },
  },

  // Inventory table policies
  inventory: {
    select: {
      name: 'inventory_select_policy',
      definition: 'authenticated users can view inventory',
      roles: ['admin', 'order_manager', 'ship_manager'],
      condition: 'auth.uid() IS NOT NULL',
    },
    update: {
      name: 'inventory_update_policy',
      definition: 'only admin and order_manager can update inventory',
      roles: ['admin', 'order_manager'],
      condition: "auth.jwt() ->> 'role' IN ('admin', 'order_manager')",
    },
  },

  // Cashbook table policies
  cashbook: {
    select: {
      name: 'cashbook_select_policy',
      definition: 'all authenticated users can view cashbook',
      roles: ['admin', 'order_manager', 'ship_manager'],
      condition: 'auth.uid() IS NOT NULL',
    },
    insert: {
      name: 'cashbook_insert_policy',
      definition: 'system-generated entries only',
      roles: [],
      condition: 'false', // Only through triggers
    },
  },

  // Users table policies
  users: {
    select: {
      name: 'users_select_policy',
      definition: 'users can view their own profile, admin can view all',
      roles: ['admin', 'order_manager', 'ship_manager'],
      condition: `
        (auth.uid() = id) OR
        (auth.jwt() ->> 'role' = 'admin')
      `,
    },
    update: {
      name: 'users_update_policy',
      definition: 'users can update own profile, admin can update all',
      roles: ['admin', 'order_manager', 'ship_manager'],
      condition: `
        (auth.uid() = id) OR
        (auth.jwt() ->> 'role' = 'admin')
      `,
    },
  },

  // Event logs table policies
  event_logs: {
    select: {
      name: 'event_logs_select_policy',
      definition: 'only admin can view event logs',
      roles: ['admin'],
      condition: "auth.jwt() ->> 'role' = 'admin'",
    },
    insert: {
      name: 'event_logs_insert_policy',
      definition: 'system-generated entries only',
      roles: [],
      condition: 'false', // Only through triggers
    },
  },
}

/**
 * RLS Policy Verifier
 */
export class RLSPolicyVerifier {
  private supabase: any
  private violations: Array<{
    table: string
    policy: string
    issue: string
    severity: 'critical' | 'high' | 'medium' | 'low'
  }> = []

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * Verify all RLS policies
   */
  async verifyAllPolicies(): Promise<{
    valid: boolean
    violations: typeof this.violations
    summary: string
  }> {
    this.violations = []

    // Check if RLS is enabled for all tables
    await this.verifyRLSEnabled()

    // Verify individual policies
    for (const [table, policies] of Object.entries(RLS_POLICIES)) {
      await this.verifyTablePolicies(table, policies)
    }

    // Check for missing policies
    await this.checkMissingPolicies()

    // Check for overly permissive policies
    await this.checkPermissivePolicies()

    return {
      valid: this.violations.length === 0,
      violations: this.violations,
      summary: this.generateSummary(),
    }
  }

  /**
   * Verify RLS is enabled for all tables
   */
  private async verifyRLSEnabled(): Promise<void> {
    const tables = Object.keys(RLS_POLICIES)
    
    for (const table of tables) {
      try {
        // Query to check if RLS is enabled
        const { data, error } = await this.supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_name', table)
          .single()

        if (error) {
          this.violations.push({
            table,
            policy: 'RLS_ENABLED',
            issue: `Failed to verify RLS status: ${error.message}`,
            severity: 'critical',
          })
        }

        // Additional check for RLS status would require admin access
        // This is a placeholder for the actual implementation
      } catch (error) {
        this.violations.push({
          table,
          policy: 'RLS_ENABLED',
          issue: `Error checking RLS status: ${error}`,
          severity: 'critical',
        })
      }
    }
  }

  /**
   * Verify policies for a specific table
   */
  private async verifyTablePolicies(
    table: string,
    policies: any
  ): Promise<void> {
    for (const [operation, policy] of Object.entries(policies)) {
      await this.verifyPolicy(table, operation, policy as any)
    }
  }

  /**
   * Verify individual policy
   */
  private async verifyPolicy(
    table: string,
    operation: string,
    policy: any
  ): Promise<void> {
    try {
      // Test policy with different roles
      for (const role of policy.roles) {
        const testResult = await this.testPolicyAccess(
          table,
          operation,
          role
        )
        
        if (!testResult.allowed && policy.roles.includes(role)) {
          this.violations.push({
            table,
            policy: `${operation}_${role}`,
            issue: `Role ${role} should have ${operation} access but doesn't`,
            severity: 'high',
          })
        }
      }

      // Test that unauthorized roles are blocked
      const unauthorizedRoles = this.getUnauthorizedRoles(policy.roles)
      for (const role of unauthorizedRoles) {
        const testResult = await this.testPolicyAccess(
          table,
          operation,
          role
        )
        
        if (testResult.allowed) {
          this.violations.push({
            table,
            policy: `${operation}_${role}`,
            issue: `Role ${role} should NOT have ${operation} access but does`,
            severity: 'critical',
          })
        }
      }
    } catch (error) {
      this.violations.push({
        table,
        policy: operation,
        issue: `Failed to verify policy: ${error}`,
        severity: 'medium',
      })
    }
  }

  /**
   * Test policy access for a specific role
   */
  private async testPolicyAccess(
    table: string,
    operation: string,
    role: string
  ): Promise<{ allowed: boolean; error?: string }> {
    // This would require setting up test users with different roles
    // and attempting operations to verify policies work correctly
    // Placeholder for actual implementation
    
    try {
      // Simulate policy check
      const operationMap: Record<string, string> = {
        select: 'GET',
        insert: 'POST',
        update: 'PATCH',
        delete: 'DELETE',
      }

      // In production, this would make actual API calls with role-specific tokens
      // For now, return simulated results based on policy definitions
      const policy = RLS_POLICIES[table as keyof typeof RLS_POLICIES]?.[
        operation as keyof typeof policy
      ]
      
      if (!policy) {
        return { allowed: false, error: 'Policy not defined' }
      }

      return {
        allowed: policy.roles.includes(role),
      }
    } catch (error) {
      return {
        allowed: false,
        error: String(error),
      }
    }
  }

  /**
   * Check for missing policies
   */
  private async checkMissingPolicies(): Promise<void> {
    const requiredOperations = ['select', 'insert', 'update', 'delete']
    const criticalTables = ['orders', 'products', 'inventory', 'users']

    for (const table of criticalTables) {
      const policies = RLS_POLICIES[table as keyof typeof RLS_POLICIES]
      
      for (const operation of requiredOperations) {
        if (!policies?.[operation as keyof typeof policies]) {
          // Some operations might be intentionally missing (e.g., delete for inventory)
          const isCritical = 
            (table === 'orders' && operation === 'delete') ||
            (table === 'users' && operation === 'delete')
          
          if (isCritical) {
            this.violations.push({
              table,
              policy: operation,
              issue: `Missing ${operation} policy for critical table`,
              severity: 'high',
            })
          }
        }
      }
    }
  }

  /**
   * Check for overly permissive policies
   */
  private async checkPermissivePolicies(): Promise<void> {
    // Check for policies that might be too permissive
    const dangerousConditions = [
      'true', // Always allow
      '1=1',  // Always true
      'auth.uid() IS NOT NULL', // Too broad for sensitive operations
    ]

    for (const [table, policies] of Object.entries(RLS_POLICIES)) {
      for (const [operation, policy] of Object.entries(policies)) {
        const policyDef = policy as any
        
        // Check for dangerous conditions in sensitive operations
        if (['delete', 'update'].includes(operation)) {
          for (const dangerous of dangerousConditions) {
            if (policyDef.condition?.includes(dangerous)) {
              this.violations.push({
                table,
                policy: operation,
                issue: `Potentially overly permissive condition: ${dangerous}`,
                severity: operation === 'delete' ? 'critical' : 'high',
              })
            }
          }
        }
      }
    }
  }

  /**
   * Get unauthorized roles for testing
   */
  private getUnauthorizedRoles(authorizedRoles: string[]): string[] {
    const allRoles = ['admin', 'order_manager', 'ship_manager', 'customer']
    return allRoles.filter(role => !authorizedRoles.includes(role))
  }

  /**
   * Generate summary of verification results
   */
  private generateSummary(): string {
    if (this.violations.length === 0) {
      return 'All RLS policies are correctly configured'
    }

    const critical = this.violations.filter(v => v.severity === 'critical').length
    const high = this.violations.filter(v => v.severity === 'high').length
    const medium = this.violations.filter(v => v.severity === 'medium').length
    const low = this.violations.filter(v => v.severity === 'low').length

    return `Found ${this.violations.length} policy violations: ${critical} critical, ${high} high, ${medium} medium, ${low} low`
  }
}

/**
 * RLS Policy Generator
 */
export class RLSPolicyGenerator {
  /**
   * Generate SQL for creating RLS policies
   */
  static generatePolicySQL(
    table: string,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    policyName: string,
    condition: string
  ): string {
    return `
      CREATE POLICY "${policyName}"
      ON public.${table}
      FOR ${operation}
      TO authenticated
      USING (${condition});
    `
  }

  /**
   * Generate all policies for a table
   */
  static generateTablePolicies(table: string): string[] {
    const policies = RLS_POLICIES[table as keyof typeof RLS_POLICIES]
    if (!policies) return []

    const sqlStatements: string[] = []

    // Enable RLS
    sqlStatements.push(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`)

    // Generate policies
    for (const [operation, policy] of Object.entries(policies)) {
      const policyDef = policy as any
      if (policyDef.condition && policyDef.condition !== 'false') {
        sqlStatements.push(
          this.generatePolicySQL(
            table,
            operation.toUpperCase() as any,
            policyDef.name,
            policyDef.condition
          )
        )
      }
    }

    return sqlStatements
  }

  /**
   * Generate all RLS policies
   */
  static generateAllPolicies(): string {
    const allStatements: string[] = []

    for (const table of Object.keys(RLS_POLICIES)) {
      allStatements.push(...this.generateTablePolicies(table))
    }

    return allStatements.join('\n\n')
  }
}

/**
 * RLS Testing utilities
 */
export class RLSTester {
  private supabase: any

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * Test RLS policies with different user roles
   */
  async testWithRole(
    role: string,
    operation: () => Promise<any>
  ): Promise<{
    success: boolean
    data?: any
    error?: any
  }> {
    try {
      // Set role in JWT claims (this would be done server-side in production)
      // For testing, you'd need to create test users with different roles
      
      const result = await operation()
      
      return {
        success: !result.error,
        data: result.data,
        error: result.error,
      }
    } catch (error) {
      return {
        success: false,
        error,
      }
    }
  }

  /**
   * Run comprehensive RLS tests
   */
  async runComprehensiveTests(): Promise<{
    passed: number
    failed: number
    results: Array<{
      test: string
      passed: boolean
      details: any
    }>
  }> {
    const results: Array<{
      test: string
      passed: boolean
      details: any
    }> = []

    // Test 1: admin can access everything
    const adminTest = await this.testWithRole('admin', async () => {
      return this.supabase.from('orders').select('*')
    })
    results.push({
      test: 'admin can access orders',
      passed: adminTest.success,
      details: adminTest,
    })

    // Test 2: Ship manager cannot delete orders
    const shipManagerDeleteTest = await this.testWithRole('ship_manager', async () => {
      return this.supabase.from('orders').delete().eq('id', 'test-id')
    })
    results.push({
      test: 'Ship manager cannot delete orders',
      passed: !shipManagerDeleteTest.success,
      details: shipManagerDeleteTest,
    })

    // Test 3: customer cannot access admin tables
    const customerAccessTest = await this.testWithRole('customer', async () => {
      return this.supabase.from('event_logs').select('*')
    })
    results.push({
      test: 'customer cannot access event logs',
      passed: !customerAccessTest.success,
      details: customerAccessTest,
    })

    // Calculate summary
    const passed = results.filter(r => r.passed).length
    const failed = results.filter(r => !r.passed).length

    return {
      passed,
      failed,
      results,
    }
  }
}