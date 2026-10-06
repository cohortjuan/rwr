import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Browser-side Supabase client for auth. The URL and publishable key are public by design.
// Returns null until both are set in .env.local, so guest mode works without any setup.

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  client ??= createClient(url, key)
  return client
}
