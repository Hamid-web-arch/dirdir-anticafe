import nodemailer from 'nodemailer'
import { config } from './config.js'

// SMTP təyin olunubsa email göndərmək mümkündür (Render-də SMTP_* mühit dəyişənləri).
export const emailConfigured = () => Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS)

let transport
function getTransport() {
  transport ??= nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  })
  return transport
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// Sadə, oxunaqlı məktub: başlıq + mətn (sətir keçidləri saxlanır)
export async function sendMail({ to, subject, text }) {
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1D2B24;max-width:560px">
<p style="font-size:18px;font-weight:bold;color:#f16623;margin:0 0 16px">DırDır Anticafe</p>
${escapeHtml(text).replace(/\n/g, '<br>')}
<p style="margin-top:24px;font-size:12px;color:#5B6A62">Bu məktubu saytda "Yeniliklərdən xəbərdar ol" seçdiyin üçün aldın. Profilindən istənilən vaxt söndürə bilərsən.</p>
</div>`
  await getTransport().sendMail({ from: config.MAIL_FROM || config.SMTP_USER, to, subject, text, html })
}
