'use client'

import { useEffect, useState } from 'react'
import { lines } from '@/lib/lines'
import type { LionSex } from '@/lib/progress'
import styles from './WardrobeScreen.module.css'

const IDEA_MAX = 200

type Props = {
  sex: LionSex
}

// A player's idea for a new wardrobe piece, emailed to the maker by the server
// (app/api/suggest). The form is shown only when the server says it has a mailbox to send
// from, so nobody is asked for an idea that would go nowhere.
export default function SuggestBox({ sex }: Props) {
  const [open, setOpen] = useState(false)
  const [idea, setIdea] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let stale = false
    fetch('/api/suggest')
      .then((response) => response.json())
      .then((data) => {
        if (!stale) setOpen(data.open === true)
      })
      .catch(() => {})
    return () => {
      stale = true
    }
  }, [])

  if (!open) return null

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = idea.trim()
    if (!text) {
      setStatus(lines.wardrobe.suggest.empty)
      return
    }
    setSending(true)
    setStatus('')
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: text, lion: sex }),
      })
      if (response.ok) {
        setIdea('')
        setStatus(lines.wardrobe.suggest.sent)
      } else {
        const data = await response.json().catch(() => ({}))
        setStatus(
          data.error === 'blocked'
            ? lines.wardrobe.suggest.blocked
            : data.error === 'daily'
              ? lines.wardrobe.suggest.daily
              : lines.wardrobe.suggest.failed,
        )
      }
    } catch {
      setStatus(lines.wardrobe.suggest.failed)
    }
    setSending(false)
  }

  return (
    <section className={`panel ${styles.suggest}`}>
      <h2 className={styles.subheading}>{lines.wardrobe.suggest.heading}</h2>
      <p>{lines.wardrobe.suggest.intro}</p>
      <form onSubmit={send}>
        <div className="field">
          <label htmlFor="wardrobe-idea">{lines.wardrobe.suggest.label}</label>
          <textarea
            id="wardrobe-idea"
            rows={2}
            maxLength={IDEA_MAX}
            placeholder={lines.wardrobe.suggest.placeholder}
            value={idea}
            onChange={(event) => {
              setIdea(event.target.value)
              setStatus('')
            }}
          />
        </div>
        <button type="submit" className="btn" disabled={sending || !idea.trim()}>
          {sending ? lines.wardrobe.suggest.sending : lines.wardrobe.suggest.send}
        </button>
        <p className={styles.status} role="status">
          {status}
        </p>
      </form>
      <p className={styles.fine}>{lines.wardrobe.suggest.fine}</p>
    </section>
  )
}
