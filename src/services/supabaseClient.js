import { createClient } from '@supabase/supabase-js'

export const SUPABASE_CONFIG_ERROR = 'SUPABASE_NOT_CONFIGURED'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigured) {
  console.warn('Missing Supabase environment variables.')
}

export const supabaseConfigError = {
  message: 'Supabase is not configured.',
  code: SUPABASE_CONFIG_ERROR,
}

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
