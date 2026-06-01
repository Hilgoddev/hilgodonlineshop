import { createClient } from '@supabase/supabase-js'
import { cleanEnv } from './env'

// Strip any BOM/zero-width/whitespace the host may have injected — a dirty key
// throws "String contains non ISO-8859-1 code point" when used as an auth header.
const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
