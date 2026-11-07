// Hesabatı yükləmək: PDF (çap pəncərəsi → "PDF kimi saxla") və Excel (CSV).
// PDF brauzerin çapı ilə yaradılır — Azərbaycan hərfləri (ə, ğ, ş) heç bir şrift faylı olmadan düzgün çıxır.
import { bakuTime } from '../../pricing/visitPrice.js'
import { formatAzDate } from '../../i18n/index.jsx'

const round2 = (n) => Math.round(n * 100) / 100
const money = (n) => `${n.toFixed(2)} ₼`
const dayText = (day) => formatAzDate(`${day}T12:00:00`, { day: 'numeric', month: 'long', year: 'numeric' })
const duration = (m) => (m == null ? '' : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`)
const PLACE = { hall: 'Zal', room: 'Kino' }

const discountText = (v) => {
  const parts = []
  if (v.students > 0 && v.kind !== 'room') parts.push(v.people > 1 ? `${v.students} tələbə` : 'tələbə')
  if (v.promoCode) parts.push(`${v.promoCode} −${v.promoPercent}%`)
  return parts.join(', ')
}

// Bir seansın cədvəl sətri (PDF və Excel üçün eyni)
function sessionRow(v) {
  const done = Boolean(v.endedAt)
  return {
    day: v.day,
    name: v.name,
    people: v.people,
    place: PLACE[v.kind] ?? 'Zal',
    start: bakuTime(v.startedAt),
    end: done ? bakuTime(v.endedAt) : 'davam edir',
    duration: duration(v.minutes),
    cash: done && v.paymentMethod === 'cash' ? v.amount : null,
    card: done && v.paymentMethod === 'card' ? v.amount : null,
    other: done && v.paymentMethod !== 'cash' && v.paymentMethod !== 'card' ? v.amount : null,
    discount: discountText(v),
    note: v.note ?? '',
  }
}

function totalsOf(visits) {
  const done = visits.filter((v) => v.endedAt)
  const by = (m) => round2(done.filter((v) => v.paymentMethod === m).reduce((s, v) => s + v.amount, 0))
  const total = round2(done.reduce((s, v) => s + v.amount, 0))
  return { people: visits.reduce((s, v) => s + v.people, 0), sessions: visits.length, cash: by('cash'), card: by('card'), total }
}

// Günlərə görə qısa cədvəl (aylıq / aralıq hesabatın əvvəlində)
function daySummary(visits) {
  const days = new Map()
  for (const v of visits) days.set(v.day, [...(days.get(v.day) ?? []), v])
  return [...days.entries()].map(([day, list]) => ({ day, ...totalsOf(list) }))
}

// ---------- Excel (CSV) ----------
// Ayırıcı ";" və onluq vergül — Azərbaycan/rus dilli Excel-də sütunlara düzgün bölünür; BOM — hərflər düzgün görünsün.
const cell = (value) => {
  if (value == null) return ''
  const text = typeof value === 'number' ? String(value).replace('.', ',') : String(value)
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadCsv({ filename, visits }) {
  const header = ['Tarix', 'Müştəri', 'Say', 'Yer', 'Giriş', 'Çıxış', 'Müddət', 'Nağd', 'Kart', 'Üsulsuz', 'Endirim', 'Qeyd']
  const lines = [header.map(cell).join(';')]
  for (const v of visits) {
    const r = sessionRow(v)
    lines.push([r.day, r.name, r.people, r.place, r.start, r.end, r.duration, r.cash, r.card, r.other, r.discount, r.note].map(cell).join(';'))
  }
  const t = totalsOf(visits)
  lines.push(['Cəmi', '', t.people, '', '', '', '', t.cash, t.card, round2(t.total - t.cash - t.card) || null, '', ''].map(cell).join(';'))

  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: `${filename}.csv` })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------- PDF (çap) ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const num = (n) => (n == null ? '' : money(n))

function sessionsTable(visits, withDate) {
  const t = totalsOf(visits)
  const rows = visits
    .map((v) => {
      const r = sessionRow(v)
      return `<tr>
        ${withDate ? `<td>${esc(dayText(r.day))}</td>` : ''}
        <td><b>${esc(r.name)}</b>${r.discount ? `<div class="sub">${esc(r.discount)}</div>` : ''}${r.note ? `<div class="sub"><i>${esc(r.note)}</i></div>` : ''}</td>
        <td class="r">${r.people}</td><td>${r.place}</td><td>${r.start}</td><td>${esc(r.end)}</td><td>${r.duration}</td>
        <td class="r">${num(r.cash ?? r.other)}${r.other != null ? ' ?' : ''}</td><td class="r">${num(r.card)}</td>
      </tr>`
    })
    .join('')
  return `<table>
    <thead><tr>${withDate ? '<th>Tarix</th>' : ''}<th>Müştəri</th><th class="r">Say</th><th>Yer</th><th>Giriş</th><th>Çıxış</th><th>Müddət</th><th class="r">Nağd</th><th class="r">Kart</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="${withDate ? 9 : 8}" class="empty">Qeyd yoxdur</td></tr>`}</tbody>
    <tfoot><tr><td${withDate ? ' colspan="2"' : ''}>Cəmi</td><td class="r">${t.people}</td><td colspan="4"></td><td class="r">${money(t.cash)}</td><td class="r">${money(t.card)}</td></tr></tfoot>
  </table>`
}

function summaryTable(visits) {
  const rows = daySummary(visits)
  const t = totalsOf(visits)
  return `<table class="summary">
    <thead><tr><th>Gün</th><th class="r">Müştəri</th><th class="r">Seans</th><th class="r">Nağd</th><th class="r">Kart</th><th class="r">Cəmi</th></tr></thead>
    <tbody>${rows
      .map((d) => `<tr><td>${esc(dayText(d.day))}</td><td class="r">${d.people}</td><td class="r">${d.sessions}</td><td class="r">${money(d.cash)}</td><td class="r">${money(d.card)}</td><td class="r"><b>${money(d.total)}</b></td></tr>`)
      .join('')}</tbody>
    <tfoot><tr><td>Cəmi</td><td class="r">${t.people}</td><td class="r">${t.sessions}</td><td class="r">${money(t.cash)}</td><td class="r">${money(t.card)}</td><td class="r">${money(t.total)}</td></tr></tfoot>
  </table>`
}

const STYLE = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Inter, Arial, sans-serif; color: #1D2B24; font-size: 11px; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  h2 { font-size: 13px; margin: 18px 0 6px; }
  .meta { color: #5B6A62; margin-bottom: 12px; }
  .kpis { display: flex; gap: 8px; margin: 10px 0 4px; }
  .kpi { border: 1px solid #d9e2dc; border-radius: 6px; padding: 6px 10px; flex: 1; }
  .kpi span { display: block; color: #5B6A62; font-size: 10px; }
  .kpi b { font-size: 14px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #c9d3cd; padding: 4px 6px; text-align: left; vertical-align: top; }
  thead th { background: #fbb040; font-weight: 700; }
  tfoot td { font-weight: 700; background: #f3f5f4; }
  .r { text-align: right; white-space: nowrap; }
  .sub { color: #5B6A62; font-size: 9.5px; }
  .empty { text-align: center; color: #5B6A62; padding: 14px; }
  tr { page-break-inside: avoid; }
  .hint { position: fixed; top: 0; left: 0; right: 0; background: #1D2B24; color: #fff; padding: 8px 14px; font-size: 12px; }
  @media print { .hint { display: none; } }
`

// Yeni pəncərəni KLİK ANINDA açmaq lazımdır (sonra açılsa brauzer bloklayır) — məlumat sonra yazılır.
export function openPrintWindow() {
  const w = window.open('', '_blank')
  if (w) w.document.write('<p style="font-family:sans-serif;padding:20px">Hesabat hazırlanır…</p>')
  return w
}

export function printReport(w, { title, subtitle, visits, mode }) {
  if (!w) return false
  const t = totalsOf(visits)
  const kpis = `<div class="kpis">
    <div class="kpi"><span>Gəlir</span><b>${money(t.total)}</b></div>
    <div class="kpi"><span>Nağd</span><b>${money(t.cash)}</b></div>
    <div class="kpi"><span>Kart</span><b>${money(t.card)}</b></div>
    <div class="kpi"><span>Müştəri</span><b>${t.people}</b></div>
    <div class="kpi"><span>Seans</span><b>${t.sessions}</b></div>
  </div>`
  const body =
    mode === 'day'
      ? sessionsTable(visits, false)
      : `<h2>Günlər üzrə</h2>${summaryTable(visits)}<h2>Bütün seanslar</h2>${sessionsTable(visits, true)}`
  w.document.open()
  w.document.write(`<!doctype html><html lang="az"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${STYLE}</style></head>
    <body>
      <div class="hint">PDF kimi saxlamaq üçün çap pəncərəsində "Printer" → "PDF kimi saxla" (Save as PDF) seç.</div>
      <h1>DırDır Anticafe — ${esc(title)}</h1>
      <div class="meta">${esc(subtitle)} · Hazırlanıb: ${esc(formatAzDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit' }))}</div>
      ${kpis}
      ${body}
      <script>window.onload = () => setTimeout(() => window.print(), 200)</script>
    </body></html>`)
  w.document.close()
  return true
}

export { dayText }
