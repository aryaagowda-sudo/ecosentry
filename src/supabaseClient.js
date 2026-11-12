import { createClient } from '@supabase/supabase-js'

const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : typeof process !== 'undefined' && process.env
    ? process.env
    : {}

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const isSupabaseConfigured = Boolean(
  env.VITE_SUPABASE_URL &&
  env.VITE_SUPABASE_ANON_KEY &&
  !String(env.VITE_SUPABASE_URL).includes('placeholder')
)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
