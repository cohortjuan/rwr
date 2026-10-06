'use client'

import { useSyncExternalStore } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'

// Who is playing: a guest, or a player with an account. One watcher feeds every screen.
export type Account = {
  // The signed-in player's email, or null for guests.
  email: string | null
  // A dev account can open the dev tools (see components/DevScreen.tsx). The flag is
  // `dev: true` in the account's app metadata, which only the database owner can set: a player
  // cannot give it to themselves. See docs/architecture/overview.md for how to set it.
  dev: boolean
  // False until the account has been read, so nothing acts on a guess.
  checked: boolean
  // True after the player opens a password reset link, until they choose a new password.
  recovering: boolean
}

const guest: Account = { email: null, dev: false, checked: false, recovering: false }
let account = guest
const listeners = new Set<() => void>()
let watching = false
let confirmedFor: string | null = null

function set(patch: Partial<Account>) {
  account = { ...account, ...patch }
  listeners.forEach((listener) => listener())
}

const isDev = (user: User) => user.app_metadata?.dev === true

function watch() {
  if (watching) return
  watching = true
  const supabase = getSupabase()
  if (!supabase) {
    account = { ...guest, checked: true }
    return
  }
  // Fires once straight away with the current session, then on every change.
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user
    if (!user) {
      confirmedFor = null
      set({ email: null, dev: false, checked: true, recovering: false })
      return
    }
    set({
      email: user.email ?? null,
      dev: isDev(user),
      recovering: account.recovering || event === 'PASSWORD_RECOVERY',
    })
    if (confirmedFor === user.id) return
    confirmedFor = user.id
    // The saved session can be older than the account's flags, so the server is asked once.
    // Not from inside this callback: supabase-js can lock up if it is called from here.
    window.setTimeout(async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) set({ email: data.user.email ?? null, dev: isDev(data.user), checked: true })
      else set({ checked: true })
    }, 0)
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  watch()
  return () => {
    listeners.delete(listener)
  }
}

export function useAccount(): Account {
  return useSyncExternalStore(
    subscribe,
    () => account,
    () => guest,
  )
}

// The signed-in player's email, or null for guests. Updates on log in and log out.
export function useAccountEmail(): string | null {
  return useAccount().email
}

export async function logOut() {
  await getSupabase()?.auth.signOut()
}

// Emails a link for choosing a new password. The answer is the same whether or not the email
// has an account, so this cannot be used to find out who plays. False only if the request
// itself failed (no connection, or too many tries in a short time).
export async function requestPasswordReset(email: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/privacy`,
  })
  return !error
}

// Saves the new password after a reset link was opened. The link has already logged the player in.
export async function setNewPassword(password: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return false
  set({ recovering: false })
  return true
}

// Leaves the reset without changing the password.
export function cancelRecovery() {
  set({ recovering: false })
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
