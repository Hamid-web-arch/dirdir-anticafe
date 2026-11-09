import nodemailer from 'nodemailer'
import { config } from './config.js'

// Məktub göndərmə yolu:
// - resend  — Resend HTTPS API (canlı sayt: Render-in pulsuz planında SMTP portları bağlıdır, HTTPS açıqdır)
// - smtp    — SMTP (SMTP-yə icazə verən hostinqdə)
// - console — lokal inkişaf: məktub göndərilmir, serverin terminalına yazılır (qeydiyyat kodunu orada görürsən)
// - test    — testlər: məktublar testMailbox-a düşür
// - null    — canlıda heç nə qurulmayıb: kodla təsdiq söndürülür (qeydiyyat əvvəlki kimi dərhal)
export function mailMode() {
  if (config.NODE_ENV === 'test') return 'test'
  if (config.RESEND_API_KEY) return 'resend'
  if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) return 'smtp'
  return config.NODE_ENV === 'development' ? 'console' : null
}

// Admin paneldəki "Xəbər göndər" email kanalı yalnız həqiqi göndərmə qurulanda işləyir
export const emailConfigured = () => ['resend', 'smtp'].includes(mailMode())

// Qeydiyyat və şifrə bərpası kodları göndərilə bilərmi (lokalda və testdə — bəli)
export const canSendCodes = () => mailMode() !== null

export const testMailbox = []

const fromAddress = () => config.MAIL_FROM || config.SMTP_USER || 'DırDır Anticafe <noreply@dirdir.az>'

let transport
function smtpTransport() {
  transport ??= nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  })
  return transport
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const NEWSLETTER_FOOTER =
  'Bu məktubu saytda "Yeniliklərdən xəbərdar ol" seçdiyin üçün aldın. Profilindən istənilən vaxt söndürə bilərsən.'

// Sadə, oxunaqlı məktub: başlıq + mətn (sətir keçidləri saxlanır).
// code — böyük, seçilə bilən kod bloku (qeydiyyat / şifrə bərpası). footer — altdakı kiçik qeyd.
export async function sendMail({ to, subject, text, code, footer = NEWSLETTER_FOOTER }) {
  const codeBlock = code
    ? `<p style="margin:20px 0;font-size:32px;font-weight:bold;letter-spacing:8px;color:#1D2B24;background:#FDEBE2;border-radius:12px;padding:14px 20px;display:inline-block">${escapeHtml(code)}</p><br>`
    : ''
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1D2B24;max-width:560px">
<p style="font-size:18px;font-weight:bold;color:#f16623;margin:0 0 16px">DırDır Anticafe</p>
${escapeHtml(text).replace(/\n/g, '<br>').replace('{{code}}', codeBlock)}
${footer ? `<p style="margin-top:24px;font-size:12px;color:#5B6A62">${escapeHtml(footer)}</p>` : ''}
</div>`
  const plain = text.replace('{{code}}', code ?? '')
  const message = { from: fromAddress(), to, subject, text: plain, html }

  switch (mailMode()) {
    case 'test':
      testMailbox.push(message)
      return
    case 'console':
      console.log(`\n✉️  Məktub (lokal, göndərilmir) → ${to}\n   ${subject}\n   ${plain.replace(/\n/g, '\n   ')}\n`)
      return
    case 'resend': {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text().catch(() => '')}`)
      return
    }
    case 'smtp':
      await smtpTransport().sendMail(message)
      return
    default:
      throw new Error('Email göndərmə qurulmayıb (RESEND_API_KEY və ya SMTP_*).')
  }
}
