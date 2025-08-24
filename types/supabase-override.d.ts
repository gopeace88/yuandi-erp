// Temporary Supabase type overrides for build
// TODO: Generate proper types with `npm run db:generate`

declare module '@supabase/supabase-js' {
  export interface SupabaseClient {
    from: (table: string) => any;
  }
}

// Global type extensions for API routes
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_API_KEY: string;
      SUPABASE_API_KEY: string;
      SESSION_SECRET?: string;
      CRON_SECRET?: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};