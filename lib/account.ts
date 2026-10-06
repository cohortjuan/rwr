'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'

// The signed-in player's email, or null for guests. Updates on log in and log out.
export function useAccountEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return
    // Fires once straight away with the current session, then on every change.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return email
}

export async function logOut() {
  await getSupabase()?.auth.signOut()
}

// Deletes the signed-in player's account and every row they own, then clears the local session.
// Returns false if the server could not be reached, so the caller can say so.
export async function deleteAccount(): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { error } = await supabase.rpc('delete_own_account')
  if (error) return false
  await supabase.auth.signOut({ scope: 'local' })
  return true
}
