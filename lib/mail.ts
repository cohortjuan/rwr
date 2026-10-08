import nodemailer from 'nodemailer'

// Sends the maker an email. Server-side only: the mailbox's address and password come from
// `.env.local` (MAIL_USER, MAIL_PASS) and are never sent to a browser, logged, or committed.
//
// It sends from the maker's own mailbox over SMTP, to that same mailbox unless MAIL_TO names
// another. With Gmail, MAIL_PASS is an app password made for this one use, not the account's
// own password. Nothing here is a paid service.

const PORT = Number(process.env.MAIL_PORT) || 465

// Whether there is a mailbox to send from.
export function mailReady(): boolean {
  return Boolean(process.env.MAIL_USER && process.env.MAIL_PASS)
}

export async function sendMail(subject: string, text: string): Promise<void> {
  const user = process.env.MAIL_USER
  const pass = process.env.MAIL_PASS
  if (!user || !pass) throw new Error('No mailbox is set up')
  const transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: PORT,
    // Port 465 is encrypted from the first byte. Other ports start plain and must upgrade.
    secure: PORT === 465,
    requireTLS: PORT !== 465,
    auth: { user, pass },
  })
  await transport.sendMail({ from: user, to: process.env.MAIL_TO || user, subject, text })
}
