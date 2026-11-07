import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  PiCaretLeftBold,
  PiCaretRightBold,
  PiTableBold,
  PiChartBarBold,
  PiDownloadSimpleBold,
  PiFilePdfBold,
  PiFileXlsBold,
} from 'react-icons/pi'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useAdminApi, card, Button, ErrorBox, Spinner, Label, TextInput } from './ui.jsx'
import { canSee, SECTIONS } from './sections.js'
import { downloadCsv, openPrintWindow, printReport, dayText } from './exportReport.js'

// Statistika: Günün hesabatındakı seanslar günlük (ayın günləri) və aylıq (ilin ayları) üzrə.
// Rənglər index.css-dəki --chart-* (rəng korluğu yoxlamasından keçib, qaranlıq rejimdə ayrıca).
const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']

const money = (n) => `${Number.isInteger(n) ? n : n.toFixed(2)}₼`
const pad = (n) => String(n).padStart(2, '0')

// "2026-11" → bir ay əvvəl/sonra; "2026" → bir il
function shiftPeriod(view, period, delta) {
  if (view === 'monthly') return String(Number(period) + delta)
  const [y, m] = period.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}
const periodLabel = (view, period) =>
  view === 'monthly' ? period : `${MONTHS[Number(period.slice(5)) - 1]} ${period.slice(0, 4)}`
// Sütunun adı: günlük — "5 noyabr", aylıq — "Noyabr 2026"
const bucketLabel = (view, key) =>
  view === 'daily' ? `${Number(key.slice(8))} ${MONTHS[Number(key.slice(5, 7)) - 1].toLowerCase()}` : `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`
const axisLabel = (view, key) => (view === 'daily' ? String(Number(key.slice(8))) : MONTHS_SHORT[Number(key.slice(5)) - 1])

const REVENUE = [
  { key: 'cash', label: 'Nağd', color: 'var(--chart-cash)' },
  { key: 'card', label: 'Kart', color: 'var(--chart-card)' },
  { key: 'other', label: 'Üsul qeyd olunmayıb', color: 'var(--chart-other)', hideEmpty: true },
]
const PEOPLE = [{ key: 'people', label: 'Müştəri', color: 'var(--chart-people)' }]

export default function AdminStats() {
  const request = useAdminApi()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = params.get('gorunus') === 'ayliq' ? 'monthly' : 'daily'
  const requested = params.get('dovr')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [asTable, setAsTable] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(null)
    const q = new URLSearchParams({ view })
    if (requested) q.set(view === 'daily' ? 'month' : 'year', requested)
    request(`/admin/stats?${q}`)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, requested])

  const go = (nextView, period) => {
    const next = {}
    if (nextView === 'monthly') next.gorunus = 'ayliq'
    if (period) next.dovr = period
    setParams(next)
  }

  const period = data?.period ?? requested
  const nowPeriod = data ? (view === 'daily' ? data.today.slice(0, 7) : data.today.slice(0, 4)) : null
  const canOpenDay = canSee(user, SECTIONS.find((s) => s.to === 'hesabat'))

  // Ortalama — yalnız keçmiş və bu günün/ayın sütunları üzrə
  const past = data ? data.buckets.filter((b) => !b.future) : []
  const best = past.reduce((a, b) => (b.total > (a?.total ?? 0) ? b : a), null)
  const average = past.length ? data.totals.total / past.length : 0
  const unit = view === 'daily' ? 'gün' : 'ay'

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-[1.6rem] sm:text-[1.9rem] leading-tight">Statistika</h1>
          <p className="text-inkdim text-[0.9rem]">Gəlir yalnız bitmiş seanslardan hesablanır.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-ink/5 rounded-xl p-1" role="group" aria-label="Görünüş">
            {[
              ['daily', 'Günlük'],
              ['monthly', 'Aylıq'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => go(key)}
                className={`px-4 py-1.5 rounded-lg font-bold text-[0.88rem] transition-colors ${
                  view === key ? 'bg-card shadow text-ink' : 'text-inkdim hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {period && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" aria-label="Əvvəlki" onClick={() => go(view, shiftPeriod(view, period, -1))}>
                <PiCaretLeftBold size={16} />
              </Button>
              <span className="min-w-[130px] text-center font-bold">{periodLabel(view, period)}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Növbəti"
                disabled={nowPeriod && period >= nowPeriod}
                onClick={() => go(view, shiftPeriod(view, period, 1))}
              >
                <PiCaretRightBold size={16} />
              </Button>
            </div>
          )}
          {period && (
            <Button variant={exportOpen ? 'dark' : 'outline'} size="sm" onClick={() => setExportOpen((v) => !v)}>
              <PiDownloadSimpleBold size={16} /> Yüklə
            </Button>
          )}
        </div>
      </header>

      {exportOpen && period && <ExportPanel view={view} period={period} today={data?.today} />}

      <ErrorBox error={error} />
      {!data ? (
        !error && <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi label="Gəlir" value={money(data.totals.total)} strong />
            <Kpi label="Nağd" value={money(data.totals.cash)} swatch="var(--chart-cash)" />
            <Kpi label="Kart" value={money(data.totals.card)} swatch="var(--chart-card)" />
            <Kpi label="Müştəri" value={data.totals.people} hint={`${data.totals.sessions} seans`} swatch="var(--chart-people)" />
            <Kpi label={`Orta / ${unit}`} value={money(Math.round(average * 100) / 100)} />
            <Kpi
              label={`Ən yaxşı ${unit}`}
              value={best ? money(best.total) : '—'}
              hint={best ? bucketLabel(view, best.key) : null}
            />
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setAsTable((v) => !v)}>
              {asTable ? <PiChartBarBold size={16} /> : <PiTableBold size={16} />} {asTable ? 'Qrafik' : 'Cədvəl'}
            </Button>
          </div>

          {asTable ? (
            <StatsTable view={view} data={data} />
          ) : (
            <>
              <section className={card}>
                <h2 className="font-display font-bold text-[1.1rem] mb-1">Gəlir</h2>
                <p className="text-[0.8rem] text-inkdim mb-3">
                  {view === 'daily'
                    ? canOpenDay
                      ? 'Hər gün — nağd və kart. Sütuna bas — həmin günün hesabatı açılır.'
                      : 'Hər gün — nağd və kart.'
                    : 'Hər ay — nağd və kart. Sütuna bas — həmin ayın günləri açılır.'}
                </p>
                <BarChart
                  view={view}
                  rows={data.buckets}
                  series={REVENUE.filter((s) => !s.hideEmpty || data.totals[s.key] > 0)}
                  format={money}
                  onSelect={
                    view === 'monthly'
                      ? (row) => go('daily', row.key)
                      : canOpenDay
                        ? (row) => navigate(row.key === data.today ? '/admin/hesabat' : `/admin/hesabat?gun=${row.key}`)
                        : null
                  }
                />
              </section>

              <section className={card}>
                <h2 className="font-display font-bold text-[1.1rem] mb-3">Müştəri sayı</h2>
                <BarChart view={view} rows={data.buckets} series={PEOPLE} format={(n) => String(n)} height={180} />
              </section>
            </>
          )}

          {data.totals.room > 0 && (
            <p className="text-[0.85rem] text-inkdim">
              Gəlirin {money(data.totals.hall)}-i ümumi zaldan, {money(data.totals.room)}-i kino otağındandır.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, hint, swatch, strong }) {
  return (
    <div className="bg-card border border-ink/10 rounded-[18px] p-3.5 sm:p-4">
      <div className="flex items-center gap-1.5 text-[0.78rem] font-bold text-inkdim">
        {swatch && <span className="w-2.5 h-2.5 rounded-sm" style={{ background: swatch }} />}
        {label}
      </div>
      <div className={`font-display font-bold leading-tight mt-1 tabular-nums ${strong ? 'text-[1.7rem] text-primary' : 'text-[1.4rem]'}`}>
        {value}
      </div>
      {hint && <div className="text-[0.75rem] text-inkdim mt-0.5">{hint}</div>}
    </div>
  )
}

// Yuxarı hədd üçün "yuvarlaq" addım: 1, 2, 5 × 10ⁿ
function niceScale(max, ticks = 4) {
  if (max <= 0) return { top: ticks, step: 1 }
  const raw = max / ticks
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw)
  return { top: step * Math.ceil(max / step), step }
}

// Üst-üstə yığılmış sütun qrafiki (bir ox). Sütunun üstünə gələndə tooltip; onSelect varsa — klik.
function BarChart({ view, rows, series, format, height = 240, onSelect }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  const pad = { top: 8, right: 4, bottom: 22, left: 44 }
  const innerW = Math.max(0, width - pad.left - pad.right)
  const innerH = height - pad.top - pad.bottom
  const totalOf = (r) => series.reduce((s, x) => s + r[x.key], 0)
  const { top, step } = niceScale(Math.max(...rows.map(totalOf)))
  const y = (v) => pad.top + innerH - (v / top) * innerH
  const band = rows.length ? innerW / rows.length : 0
  const barW = Math.max(3, Math.min(28, band * 0.68))
  // Dar ekranda hər sütunun altına yazı sığmır — hər n-ci
  const labelEvery = Math.max(1, Math.ceil(26 / Math.max(band, 1)))
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)

  const hovered = hover != null ? rows[hover] : null

  return (
    <div>
      {series.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[0.8rem] font-semibold text-inkdim">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </div>
      )}
      <div ref={wrapRef} className="relative" onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Sütun qrafiki" className="block select-none">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-ink/10" />
                <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-inkdim text-[11px] tabular-nums">
                  {format(t)}
                </text>
              </g>
            ))}
            {rows.map((r, i) => {
              const cx = pad.left + band * i + band / 2
              const x = cx - barW / 2
              let base = 0
              const visible = series.filter((s) => r[s.key] > 0)
              return (
                <g key={r.key}>
                  {hover === i && <rect x={pad.left + band * i} y={pad.top} width={band} height={innerH} className="fill-ink/5" />}
                  {visible.map((s, j) => {
                    const y0 = y(base)
                    base += r[s.key]
                    const y1 = y(base)
                    const isTop = j === visible.length - 1
                    // 2px fon boşluğu seqmentlər arasında; yuxarı uc 4px yumru
                    const h = Math.max(1, y0 - y1 - (j > 0 ? 2 : 0))
                    const yTop = y0 - (j > 0 ? 2 : 0) - h
                    const radius = isTop ? Math.min(4, h, barW / 2) : 0
                    return (
                      <path
                        key={s.key}
                        d={`M${x},${yTop + h} V${yTop + radius} Q${x},${yTop} ${x + radius},${yTop} H${x + barW - radius} Q${x + barW},${yTop} ${x + barW},${yTop + radius} V${yTop + h} Z`}
                        style={{ fill: s.color }}
                      />
                    )
                  })}
                  {(i % labelEvery === 0 || i === rows.length - 1) && (
                    <text
                      x={cx}
                      y={height - 6}
                      textAnchor="middle"
                      className={`text-[11px] tabular-nums ${r.future ? 'fill-inkdim/50' : 'fill-inkdim'}`}
                    >
                      {axisLabel(view, r.key)}
                    </text>
                  )}
                  {/* Görünməz geniş hədəf — nazik sütunu tutmaq asan olsun */}
                  <rect
                    x={pad.left + band * i}
                    y={pad.top}
                    width={band}
                    height={innerH + pad.bottom}
                    fill="transparent"
                    className={onSelect && !r.future ? 'cursor-pointer' : ''}
                    onMouseEnter={() => setHover(i)}
                    onClick={() => onSelect && !r.future && onSelect(r)}
                  />
                </g>
              )
            })}
            <line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke="currentColor" className="text-ink/25" />
          </svg>
        )}
        {hovered && (
          <div
            className="absolute z-10 pointer-events-none bg-card border border-ink/10 shadow-xl rounded-xl px-3 py-2 text-[0.82rem] min-w-[150px]"
            style={{
              left: Math.min(Math.max(pad.left + band * hover + band / 2 - 75, 0), Math.max(0, width - 160)),
              top: 0,
            }}
          >
            <div className="font-bold mb-1">{bucketLabel(view, hovered.key)}</div>
            {hovered.future ? (
              <div className="text-inkdim">Hələ gəlməyib</div>
            ) : (
              <>
                {series.map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                    <span className="flex-1 text-inkdim">{s.label}</span>
                    <span className="font-bold tabular-nums">{format(hovered[s.key])}</span>
                  </div>
                ))}
                {series.length > 1 && (
                  <div className="flex justify-between mt-1 pt-1 border-t border-ink/10">
                    <span className="text-inkdim">Cəmi</span>
                    <span className="font-bold tabular-nums">{format(totalOf(hovered))}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Cədvəl görünüşü — eyni rəqəmlər, qrafiksiz
function StatsTable({ view, data }) {
  const rows = data.buckets.filter((b) => !b.future)
  return (
    <section className={`${card} overflow-x-auto`}>
      <table className="w-full text-[0.88rem] tabular-nums">
        <thead>
          <tr className="text-left text-inkdim text-[0.78rem] uppercase tracking-wide">
            <th className="py-2 pr-3 font-bold">{view === 'daily' ? 'Gün' : 'Ay'}</th>
            <th className="py-2 px-3 font-bold text-right">Müştəri</th>
            <th className="py-2 px-3 font-bold text-right">Seans</th>
            <th className="py-2 px-3 font-bold text-right">Nağd</th>
            <th className="py-2 px-3 font-bold text-right">Kart</th>
            <th className="py-2 pl-3 font-bold text-right">Cəmi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={`border-t border-ink/5 ${r.sessions ? '' : 'text-inkdim'}`}>
              <td className="py-2 pr-3 font-semibold">{bucketLabel(view, r.key)}</td>
              <td className="py-2 px-3 text-right">{r.people}</td>
              <td className="py-2 px-3 text-right">{r.sessions}</td>
              <td className="py-2 px-3 text-right">{money(r.cash)}</td>
              <td className="py-2 px-3 text-right">{money(r.card)}</td>
              <td className="py-2 pl-3 text-right font-bold">{money(r.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink/15 font-bold">
            <td className="py-2 pr-3">Cəmi</td>
            <td className="py-2 px-3 text-right">{data.totals.people}</td>
            <td className="py-2 px-3 text-right">{data.totals.sessions}</td>
            <td className="py-2 px-3 text-right">{money(data.totals.cash)}</td>
            <td className="py-2 px-3 text-right">{money(data.totals.card)}</td>
            <td className="py-2 pl-3 text-right text-primary">{money(data.totals.total)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}

// Dövrün ilk və son günü: "2026-11" → 2026-11-01..2026-11-30, "2026" → 2026-01-01..2026-12-31
function periodRange(view, period) {
  if (view === 'monthly') return { from: `${period}-01-01`, to: `${period}-12-31` }
  const [y, m] = period.split('-').map(Number)
  return { from: `${period}-01`, to: `${period}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}` }
}

// Yükləmə: göstərilən ay/il və ya istənilən tarix aralığı — PDF (çap) və ya Excel (CSV)
function ExportPanel({ view, period, today }) {
  const request = useAdminApi()
  const shown = periodRange(view, period)
  const [scope, setScope] = useState('period') // 'period' | 'range'
  const [range, setRange] = useState(shown)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const { from, to } = scope === 'period' ? shown : range
  const title = scope === 'period' ? (view === 'daily' ? 'Aylıq hesabat' : 'İllik hesabat') : 'Hesabat'
  const subtitle = scope === 'period' ? periodLabel(view, period) : `${dayText(from)} — ${dayText(to)}`

  const run = async (format) => {
    setError(null)
    // PDF pəncərəsi klik anında açılmalıdır, yoxsa brauzer bloklayır
    const win = format === 'pdf' ? openPrintWindow() : null
    setBusy(format)
    try {
      const { visits } = await request(`/admin/stats/export?from=${from}&to=${to}`)
      if (format === 'pdf') {
        if (!printReport(win, { title, subtitle, visits, mode: from === to ? 'day' : 'range' })) {
          setError({ message: 'Brauzer yeni pəncərəni blokladı — bu sayt üçün pop-up-lara icazə ver.' })
        }
      } else {
        downloadCsv({ filename: `dirdir-hesabat-${from}${from === to ? '' : `_${to}`}`, visits })
      }
    } catch (err) {
      win?.close()
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  const radio = (value, label) => (
    <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-[0.9rem]">
      <input type="radio" name="export-scope" checked={scope === value} onChange={() => setScope(value)} className="w-4 h-4 accent-[var(--color-primary)]" />
      {label}
    </label>
  )

  return (
    <section className={`${card} flex flex-col gap-4`}>
      <h2 className="font-display font-bold text-[1.1rem]">Hesabatı yüklə</h2>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {radio('period', `Göstərilən dövr — ${periodLabel(view, period)}`)}
        {radio('range', 'Tarix aralığı seç')}
      </div>
      {scope === 'range' && (
        <div className="flex flex-wrap gap-3">
          <div>
            <Label htmlFor="export-from">Başlanğıc</Label>
            <TextInput id="export-from" type="date" value={range.from} max={today} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="export-to">Son</Label>
            <TextInput id="export-to" type="date" value={range.to} max={today} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
          </div>
          <p className="self-end pb-3 text-[0.78rem] text-inkdim">Bir gün üçün hər iki tarixi eyni seç. Ən çox 1 il.</p>
        </div>
      )}
      <ErrorBox error={error} />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" loading={busy === 'pdf'} onClick={() => run('pdf')}>
          <PiFilePdfBold size={17} /> PDF
        </Button>
        <Button variant="outline" loading={busy === 'csv'} onClick={() => run('csv')}>
          <PiFileXlsBold size={17} /> Excel
        </Button>
      </div>
      <p className="text-[0.78rem] text-inkdim">
        PDF: hesabat yeni pəncərədə açılır — çap pəncərəsində "PDF kimi saxla" seç. Excel: hər seans bir sətir, tarix ilə; faylı Excel və ya Google Sheets açır.
      </p>
    </section>
  )
}
