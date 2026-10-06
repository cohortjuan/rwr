'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { lines } from '@/lib/lines'
import { getSupabase } from '@/lib/supabase'
import styles from './LoginBox.module.css'

type Tab = 'login' | 'signup'

type Props = {
  open: boolean
  onClose: () => void
  onEnter: () => void
  // False where playing as a guest is not on offer (the wardrobe needs an account).
  guest?: boolean
}

// Floating retro dialog: log in, sign up, or play as guest.
// A native <dialog> gives us the focus trap and Esc-to-close.
export default function LoginBox({ open, onClose, onEnter, guest = true }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = getSupabase()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMessage('')
    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setMessage(lines.login.genericError)
          return
        }
        onEnter()
        return
      }
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(lines.login.genericError)
        return
      }
      if (data.session) {
        onEnter()
        return
      }
      setMessage(lines.login.signupCheckEmail)
      setTab('login')
    } catch {
      setMessage(lines.login.genericError)
    } finally {
      setBusy(false)
      setPassword('')
    }
  }

  function switchTab(next: Tab) {
    setTab(next)
    setMessage('')
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="login-heading" onClose={onClose}>
      <h2 id="login-heading" className={styles.heading}>
        {lines.login.heading}
      </h2>

      <div className={styles.tabs} role="tablist" aria-label={lines.login.heading}>
        <button
          type="button"
          role="tab"
          id="tab-login"
          aria-selected={tab === 'login'}
          aria-controls="login-panel"
          className={tab === 'login' ? styles.tabActive : styles.tab}
          onClick={() => switchTab('login')}
        >
          {lines.login.tabLogin}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-signup"
          aria-selected={tab === 'signup'}
          aria-controls="login-panel"
          className={tab === 'signup' ? styles.tabActive : styles.tab}
          onClick={() => switchTab('signup')}
        >
          {lines.login.tabSignup}
        </button>
      </div>

      <form
        id="login-panel"
        role="tabpanel"
        aria-labelledby={tab === 'login' ? 'tab-login' : 'tab-signup'}
        onSubmit={submit}
      >
        <div className="field">
          <label htmlFor="login-email">{lines.login.email}</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            disabled={!supabase}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">{lines.login.password}</label>
          <input
            id="login-password"
            type="password"
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            disabled={!supabase}
            aria-describedby={tab === 'signup' ? 'login-password-hint' : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {tab === 'signup' && (
            <span id="login-password-hint" className="note">
              {lines.login.passwordHint}
            </span>
          )}
        </div>

        <p className={styles.message} role="status">
          {!supabase ? lines.login.notConfigured : busy ? lines.login.working : message}
        </p>

        <button type="submit" className="btn" disabled={!supabase || busy}>
          {tab === 'login' ? lines.login.submitLogin : lines.login.submitSignup}
        </button>
      </form>

      <div className={styles.guestRow}>
        {guest && (
          <button type="button" className="btn" onClick={onEnter}>
            {lines.login.guest}
          </button>
        )}
        <button type="button" className="btn btn-quiet" onClick={onClose}>
          {lines.login.close}
        </button>
      </div>

      <p className="note">
        {lines.login.privacy} <Link href="/privacy">{lines.login.privacyLink}</Link>
      </p>
    </dialog>
  )
}
