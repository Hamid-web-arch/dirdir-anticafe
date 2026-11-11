// Hesabatı yükləmək: PDF və Excel (CSV) — hər ikisi düyməyə basan kimi fayl kimi yüklənir.
// PDF brauzerdə pdfmake ilə yaradılır (çap pəncərəsi yoxdur). Kitabxana böyükdür — yalnız PDF istənəndə yüklənir.
// Onun Roboto şriftində Azərbaycan hərfləri (ə, ğ, ş, ı) və ₼ var.
import { bakuTime, paymentSplit } from '../../pricing/visitPrice.js'
import { formatAzDate } from '../../i18n/index.jsx'

const round2 = (n) => Math.round(n * 100) / 100
const money = (n) => `${n.toFixed(2)} ₼`
const dayText = (day) => formatAzDate(`${day}T12:00:00`, { day: 'numeric', month: 'long', year: 'numeric' })
const duration = (m) => (m == null ? '' : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`)
const PLACE = { hall: 'Zal', room: 'Kino' }
const METHOD = { cash: 'nağd', card: 'kart' }

// Endirimlər və beh — müştərinin adının altında qısa qeyd
const discountText = (v) => {
  const parts = []
  if (v.students > 0 && v.kind !== 'room') parts.push(v.people > 1 ? `${v.students} tələbə` : 'tələbə')
  if (v.promoCode) parts.push(`${v.promoCode} −${v.promoPercent}%`)
  if (v.discountValue > 0) parts.push(`endirim −${v.discountValue}${v.discountType === 'amount' ? ' ₼' : '%'}`)
  if (v.club) parts.push(`Club: ${v.club.name} −${v.kind === 'room' ? v.club.roomPercent : v.club.hallPercent}%`)
  if (v.deposit > 0) parts.push(`beh ${money(v.deposit)} (${METHOD[v.depositMethod] ?? '?'})`)
  return parts.join(', ')
}

// Bir seansın cədvəl sətri (PDF və Excel üçün eyni). Pul ödəniş üsullarına bölünür: beh öz üsulunda, qalıq — bitəndə.
function sessionRow(v) {
  const done = Boolean(v.endedAt)
  const split = paymentSplit(v)
  return {
    day: v.day,
    name: v.name,
    people: v.people,
    place: PLACE[v.kind] ?? 'Zal',
    start: bakuTime(v.startedAt),
    end: done ? bakuTime(v.endedAt) : 'davam edir',
    duration: duration(v.minutes),
    cash: done && split.cash !== 0 ? split.cash : null,
    card: done && split.card !== 0 ? split.card : null,
    other: done && split.other !== 0 ? split.other : null,
    discount: discountText(v),
    note: v.note ?? '',
  }
}

function totalsOf(visits) {
  const done = visits.filter((v) => v.endedAt)
  const by = (m) => round2(done.reduce((s, v) => s + paymentSplit(v)[m], 0))
  const total = round2(done.reduce((s, v) => s + v.amount, 0))
  return { people: visits.reduce((s, v) => s + v.people, 0), sessions: visits.length, cash: by('cash'), card: by('card'), total }
}

// Günlərə görə qısa cədvəl (aylıq / aralıq hesabatın əvvəlində)
function daySummary(visits) {
  const days = new Map()
  for (const v of visits) days.set(v.day, [...(days.get(v.day) ?? []), v])
  return [...days.entries()].map(([day, list]) => ({ day, ...totalsOf(list) }))
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------- Excel (CSV) ----------
// Ayırıcı ";" və onluq vergül — Azərbaycan/rus dilli Excel-də sütunlara düzgün bölünür; BOM — hərflər düzgün görünsün.
const cell = (value) => {
  if (value == null) return ''
  const text = typeof value === 'number' ? String(value).replace('.', ',') : String(value)
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadCsv({ filename, visits }) {
  const header = ['Tarix', 'Müştəri', 'Say', 'Yer', 'Giriş', 'Çıxış', 'Müddət', 'Nağd', 'Kart', 'Üsulsuz', 'Endirim / beh', 'Qeyd']
  const lines = [header.map(cell).join(';')]
  for (const v of visits) {
    const r = sessionRow(v)
    lines.push([r.day, r.name, r.people, r.place, r.start, r.end, r.duration, r.cash, r.card, r.other, r.discount, r.note].map(cell).join(';'))
  }
  const t = totalsOf(visits)
  lines.push(['Cəmi', '', t.people, '', '', '', '', t.cash, t.card, round2(t.total - t.cash - t.card) || null, '', ''].map(cell).join(';'))
  saveBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`)
}

// ---------- PDF ----------
const ORANGE = '#fbb040'
const GREY = '#5B6A62'
const LINE = '#c9d3cd'

const th = (text, alignment) => ({ text, bold: true, fillColor: ORANGE, alignment })
const tf = (text, alignment, extra = {}) => ({ text, bold: true, fillColor: '#f3f5f4', alignment, ...extra })
const num = (n) => (n == null ? '' : money(n))

function sessionsTable(visits, withDate) {
  const t = totalsOf(visits)
  const header = [
    ...(withDate ? [th('Tarix')] : []),
    th('Müştəri'),
    th('Say', 'right'),
    th('Yer'),
    th('Giriş'),
    th('Çıxış'),
    th('Müddət'),
    th('Nağd', 'right'),
    th('Kart', 'right'),
  ]
  const rows = visits.map((v) => {
    const r = sessionRow(v)
    const nameCell = {
      stack: [
        { text: r.name, bold: true },
        ...(r.discount ? [{ text: r.discount, fontSize: 7.5, color: GREY }] : []),
        ...(r.note ? [{ text: r.note, fontSize: 7.5, color: GREY, italics: true }] : []),
      ],
    }
    // Üsulu qeyd olunmayan pul — Nağd sütununda "?" ilə
    const cash = [num(r.cash), r.other != null ? `${money(r.other)} ?` : ''].filter(Boolean).join('\n')
    return [
      ...(withDate ? [dayText(r.day)] : []),
      nameCell,
      { text: String(r.people), alignment: 'right' },
      r.place,
      r.start,
      r.end,
      r.duration,
      { text: cash, alignment: 'right' },
      { text: num(r.card), alignment: 'right' },
    ]
  })
  const columns = header.length
  const body = [
    header,
    ...(rows.length ? rows : [[{ text: 'Qeyd yoxdur', colSpan: columns, alignment: 'center', color: GREY }, ...Array(columns - 1).fill('')]]),
    [
      tf('Cəmi', undefined, withDate ? { colSpan: 2 } : {}),
      ...(withDate ? [''] : []),
      tf(String(t.people), 'right'),
      tf('', undefined, { colSpan: 4 }),
      '',
      '',
      '',
      tf(money(t.cash), 'right'),
      tf(money(t.card), 'right'),
    ],
  ]
  return {
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: [...(withDate ? [62] : []), '*', 24, 30, 32, 44, 36, 52, 52],
      body,
    },
    layout: { hLineColor: LINE, vLineColor: LINE, paddingTop: () => 3, paddingBottom: () => 3 },
  }
}

function summaryTable(visits) {
  const t = totalsOf(visits)
  return {
    table: {
      headerRows: 1,
      widths: ['*', 50, 40, 60, 60, 64],
      body: [
        [th('Gün'), th('Müştəri', 'right'), th('Seans', 'right'), th('Nağd', 'right'), th('Kart', 'right'), th('Cəmi', 'right')],
        ...daySummary(visits).map((d) => [
          dayText(d.day),
          { text: String(d.people), alignment: 'right' },
          { text: String(d.sessions), alignment: 'right' },
          { text: money(d.cash), alignment: 'right' },
          { text: money(d.card), alignment: 'right' },
          { text: money(d.total), alignment: 'right', bold: true },
        ]),
        [tf('Cəmi'), tf(String(t.people), 'right'), tf(String(t.sessions), 'right'), tf(money(t.cash), 'right'), tf(money(t.card), 'right'), tf(money(t.total), 'right')],
      ],
    },
    layout: { hLineColor: LINE, vLineColor: LINE },
  }
}

function kpis(t) {
  const box = (label, value) => ({
    stack: [
      { text: label, fontSize: 8, color: GREY },
      { text: value, fontSize: 12, bold: true },
    ],
  })
  return {
    table: {
      widths: ['*', '*', '*', '*', '*'],
      body: [[box('Gəlir', money(t.total)), box('Nağd', money(t.cash)), box('Kart', money(t.card)), box('Müştəri', String(t.people)), box('Seans', String(t.sessions))]],
    },
    layout: { hLineColor: LINE, vLineColor: LINE, paddingLeft: () => 8, paddingTop: () => 5, paddingBottom: () => 5 },
    margin: [0, 8, 0, 10],
  }
}

let pdfMakeLoading = null
function loadPdfMake() {
  pdfMakeLoading ??= Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]).then(([lib, fonts]) => {
    const pdfMake = lib.default ?? lib
    const vfsModule = fonts.default ?? fonts
    pdfMake.vfs = vfsModule.pdfMake?.vfs ?? vfsModule.vfs ?? vfsModule
    return pdfMake
  })
  return pdfMakeLoading
}

// mode: 'day' — bir günün seansları; 'range' — əvvəlcə günlər üzrə cəm, sonra bütün seanslar
export async function downloadPdf({ filename, title, subtitle, visits, mode }) {
  const pdfMake = await loadPdfMake()
  const t = totalsOf(visits)
  const made = formatAzDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit' })
  const doc = {
    pageSize: 'A4',
    pageMargins: [36, 36, 36, 40],
    info: { title: `DırDır Anticafe — ${title}` },
    defaultStyle: { font: 'Roboto', fontSize: 8.5, color: '#1D2B24' },
    footer: (page, pages) => ({ text: `${page} / ${pages}`, alignment: 'center', fontSize: 7.5, color: GREY, margin: [0, 12, 0, 0] }),
    content: [
      { text: `DırDır Anticafe — ${title}`, fontSize: 15, bold: true },
      { text: `${subtitle} · Hazırlanıb: ${made}`, color: GREY, margin: [0, 2, 0, 0] },
      kpis(t),
      ...(mode === 'day'
        ? [sessionsTable(visits, false)]
        : [
            { text: 'Günlər üzrə', fontSize: 11, bold: true, margin: [0, 4, 0, 6] },
            summaryTable(visits),
            { text: 'Bütün seanslar', fontSize: 11, bold: true, margin: [0, 14, 0, 6] },
            sessionsTable(visits, true),
          ]),
    ],
  }
  const blob = await new Promise((resolve) => pdfMake.createPdf(doc).getBlob(resolve))
  saveBlob(blob, `${filename}.pdf`)
}

export { dayText }
