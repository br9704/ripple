import { createClient } from '@supabase/supabase-js'
import { getReporterToken } from '@/lib/reporterToken'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) throw new Error('Missing Supabase environment variables. Check .env.local')

export const supabase = createClient(url, key, {
  global: {
    headers: {
      // Read by RLS via current_setting('request.headers') so anonymous users
      // can be scoped to their own rows without an account.
      // See supabase/migrations/015_rls_scope_reporter_token.sql.
      'x-reporter-token': getReporterToken(),
    },
  },
})
