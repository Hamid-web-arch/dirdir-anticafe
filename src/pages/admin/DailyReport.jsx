import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  PiArmchairBold,
  PiArrowCounterClockwiseBold,
  PiCalendarBlankBold,
  PiCaretDownBold,
  PiCaretLeftBold,
  PiCaretRightBold,
  PiCheckCircleFill,
  PiClockBold,
  PiCoinsBold,
  PiCreditCardBold,
  PiFilmSlateBold,
  PiMagnifyingGlassBold,
  PiMinusBold,
  PiMoneyBold,
  PiPencilSimpleBold,
  PiPlayFill,
  PiPlusBold,
  PiStopFill,
  PiStudentBold,
  PiTicketBold,
  PiTagBold,
  PiHandCoinsBold,
  PiCrownBold,
  PiTrashBold,
  PiUserCircleCheckBold,
  PiUsersBold,
  PiXBold,
  PiFilePdfBold,
  PiFileXlsBold,
} from 'react-icons/pi'
import { downloadCsv, downloadPdf, dayText } from './exportReport.js'
import { usePricing } from '../../pricing/PricingContext.jsx'
import {
  visitPrice,
  visitMinutes,
  elapsedClock,
  durationText,
  useNow,
  bakuDay,
  bakuTime,
  shiftDay,
  toBakuInput,
  fromBakuInput,
  studentTiers,
  paymentSplit,
} from '../../pricing/visitPrice.js'
import { formatAzDate } from '../../i18n/index.jsx'
import { tierStyle } from '../../lib/club.js'
import { useAdminApi, card, Button, ConfirmButton, Label, TextInput, ErrorBox, Spinner } from './ui.jsx'

// Məbləğ: 4 → "4₼", 5.5 → "5.50₼"
const money = (n) => `${Number.isInteger(n) ? n : n.toFixed(2)}₼`
const round2 = (n) => Math.round(n * 100) / 100

// Xüsusi endirim formada: { type: 'percent' | 'amount', value: '' } (mətn — sahəni boşaltmaq olsun)
const EMPTY_DISCOUNT = { type: 'percent', value: '' }
// Formadakı endirim → serverə; boşdursa və ya 0-dırsa — endirim yoxdur (null)
const discountBody = (d) => {
  const value = Number(String(d.value).replace(',', '.'))
  return String(d.value).trim() !== '' && value > 0 ? { type: d.type, value } : null
}
// Tətbiq olunan endirimin adı (cəmlənmir — ən böyüyü)
const DISCOUNT_SOURCE = { student: 'tələbə endirimi', promo: 'promokod', custom: 'xüsusi endirim', club: 'DırDır Club' }

// Müştərinin DırDır Club statusu: "☕ Qonaq · −10%" (axtarışda və seçiləndə)
function ClubTag({ club, kind = 'hall' }) {
  if (!club?.tier) return null
  const { tier } = club
  const style = tierStyle(tier.color)
  const percent = kind === 'room' ? tier.roomPercent : tier.hallPercent
  return (
    <span className={`inline-flex items-center gap-1 text-[0.7rem] font-bold px-2 py-0.5 rounded-full ${style.soft} ${style.text}`}>
      {tier.icon} {tier.name.az}
      {percent > 0 && ` · −${percent}%`}
      {percent > 0 && tier.minHours > 0 && ` (${tier.minHours} saatdan)`}
    </span>
  )
}
// Beh formada: { amount: '', method: 'cash' | 'card' }
const EMPTY_DEPOSIT = { amount: '', method: 'cash' }
// Formadakı beh → serverə; boşdursa və ya 0-dırsa — beh yoxdur (null)
const depositBody = (d) => {
  const amount = Number(String(d.amount).replace(',', '.'))
  return String(d.amount).trim() !== '' && amount > 0 ? { amount, method: d.method } : null
}
// Bir neçə seansın pulu ödəniş üsuluna görə (beh öz üsulunda, qalıq bitəndə seçilən üsulda)
const sumSplit = (visits, method) => round2(visits.reduce((s, v) => s + paymentSplit(v)[method], 0))
// "−15%" və ya "−2₼"
const discountLabel = (type, value) => (type === 'amount' ? `−${money(value)}` : `−${value}%`)

// Ödəniş üsulları — seans bitəndə seçilir
const PAYMENT = {
  cash: { label: 'Nağd', icon: PiMoneyBold },
  card: { label: 'Kart', icon: PiCreditCardBold },
}

// Seansın növü
const KINDS = {
  hall: { label: 'Ümumi zal', short: 'Zal', icon: PiArmchairBold },
  room: { label: 'Kino otağı', short: 'Kino', icon: PiFilmSlateBold },
}

const dayLabel = (day, options = { day: 'numeric', month: 'long', year: 'numeric' }) => formatAzDate(`${day}T12:00:00`, options)

// Günün hesabatı: admin hər gələn müştərinin seansını başladır, məbləğ canlı hesablanır.
// Gün URL-dədir (?gun=2026-11-07) — tarixçədən seçilən gün səhifə yenilənəndə də qalır.
export default function AdminDailyReport() {
  const request = useAdminApi()
  const pricing = usePricing()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null) // { day, today, visits }
  const [error, setError] = useState(null)
  const [daysVersion, setDaysVersion] = useState(0) // tarixçəni yeniləmək üçün
  const [pdfBusy, setPdfBusy] = useState(false)
  const [toast, notify] = useToast()
  const requested = params.get('gun')

  const load = useCallback(async () => {
    try {
      const d = await request(`/admin/visits${requested ? `?day=${requested}` : ''}`)
      setData(d)
      setError(null)
    } catch (err) {
      setError(err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested])

  useEffect(() => {
    setData(null)
    load()
  }, [load])

  const isToday = data && data.day === data.today
  const hasActive = Boolean(data?.visits.some((v) => !v.endedAt))

  // Bu gün açıqdırsa, başqa cihazdan edilən dəyişikliklər də görünsün
  useEffect(() => {
    if (!isToday) return
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [isToday, load])

  const now = useNow(1000, hasActive)

  const goTo = (day) => {
    if (!day) return
    setParams(data && day === data.today ? {} : { gun: day })
  }

  // Seans dəyişəndə siyahını yerində yeniləyirik, tarixçənin cəmini də
  const replace = (visit) => {
    setData((d) => {
      const others = d.visits.filter((v) => v.id !== visit.id)
      // Başlama vaxtı başqa günə keçibsə, bu gündən çıxır
      const visits = visit.day === d.day ? [...others, visit] : others
      return { ...d, visits: visits.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt)) }
    })
    setDaysVersion((v) => v + 1)
  }
  const remove = (id) => {
    setData((d) => ({ ...d, visits: d.visits.filter((v) => v.id !== id) }))
    setDaysVersion((v) => v + 1)
  }

  const visits = data?.visits ?? []
  const active = visits.filter((v) => !v.endedAt)
  const ended = visits.filter((v) => v.endedAt)
  const liveAmount = (v) => visitPrice(pricing, visitMinutes(v.startedAt, now), v).amount
  const roomBusy = active.find((v) => v.kind === 'room')
  const peopleCount = visits.reduce((sum, v) => sum + v.people, 0)
  const endedTotal = round2(ended.reduce((sum, v) => sum + v.amount, 0))
  const paidBy = (method) => sumSplit(ended, method)
  const total = round2(endedTotal + active.reduce((sum, v) => sum + liveAmount(v), 0))

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-[1.6rem] sm:text-[1.9rem] leading-tight">Günün hesabatı</h1>
          <p className="text-inkdim text-[0.9rem]">
            {data ? (isToday ? `Bu gün, ${dayLabel(data.day)}` : dayLabel(data.day)) : ' '}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DayPicker day={data?.day ?? requested} today={data?.today} onChange={goTo} />
          {data && (
            <span className="inline-flex gap-1">
              <Button
                variant="outline"
                size="sm"
                title="PDF faylı kimi yüklə"
                loading={pdfBusy}
                onClick={async () => {
                  setPdfBusy(true)
                  try {
                    await downloadPdf({
                      filename: `dirdir-hesabat-${data.day}`,
                      title: 'Günün hesabatı',
                      subtitle: dayText(data.day),
                      visits: data.visits,
                      mode: 'day',
                    })
                  } catch (err) {
                    setError(err)
                  } finally {
                    setPdfBusy(false)
                  }
                }}
              >
                <PiFilePdfBold size={16} /> PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Excel faylı kimi yüklə"
                onClick={() => downloadCsv({ filename: `dirdir-hesabat-${data.day}`, visits: data.visits })}
              >
                <PiFileXlsBold size={16} /> Excel
              </Button>
            </span>
          )}
        </div>
      </header>

      <ErrorBox error={error} />

      {!data ? (
        !error && <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Stat icon={PiUsersBold} label="Müştəri" value={peopleCount} />
            <Stat
              icon={PiClockBold}
              label="İndi içəridə"
              value={active.reduce((sum, v) => sum + v.people, 0)}
              accent={active.length > 0}
            />
            <Stat icon={PiMoneyBold} label="Nağd" value={money(paidBy('cash'))} />
            <Stat icon={PiCreditCardBold} label="Kart" value={money(paidBy('card'))} />
            <Stat
              icon={PiCoinsBold}
              label={active.length ? 'Cəmi (canlı)' : 'Cəmi'}
              value={money(total)}
              hint={active.length ? `Bitmiş: ${money(endedTotal)}` : null}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
            <div className="flex flex-col gap-5 xl:sticky xl:top-6">
              {isToday ? (
                <NewVisit
                  onCreated={(visit) => {
                    replace(visit)
                    notify(`${visit.name} — seans başladı`)
                  }}
                  roomBusy={roomBusy}
                />
              ) : (
                <div className={`${card} text-[0.9rem] text-inkdim`}>
                  Keçmiş günə baxırsan. Yeni müştəri yalnız bu günün hesabatına əlavə olunur.
                  <Button variant="dark" size="sm" className="mt-3" onClick={() => goTo(data.today)}>
                    Bu günə qayıt
                  </Button>
                </div>
              )}
              <History day={data.day} today={data.today} version={daysVersion} onSelect={goTo} />
            </div>

            <VisitsTable
              visits={visits}
              now={now}
              pricing={pricing}
              isToday={isToday}
              onChange={replace}
              onDelete={remove}
              notify={notify}
            />
          </div>
        </>
      )}
      <Toast toast={toast} />
    </div>
  )
}

// Qısa təsdiq mesajı (aşağıda, 3 saniyə)
function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const notify = useCallback((text) => {
    clearTimeout(timer.current)
    setToast({ text, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), 3000)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return [toast, notify]
}

function Toast({ toast }) {
  return (
    <div aria-live="polite" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      {toast && (
        <div
          key={toast.id}
          className="flex items-center gap-2 bg-ink text-bg px-4 py-2.5 rounded-full shadow-lg font-bold text-[0.9rem]"
        >
          <PiCheckCircleFill size={18} className="text-brand-teal" /> {toast.text}
        </div>
      )}
    </div>
  )
}

// Günün seansları — cədvəl (kağız jurnal kimi): giriş saatı sırası ilə, aşağıda cəm sətri.
// Davam edən seansda "Çıxış" yerində canlı saat, Nağd/Kart yerində canlı məbləğ.
function VisitsTable({ visits, now, pricing, isToday, onChange, onDelete, notify }) {
  const th = 'px-3 py-2.5 text-[0.78rem] font-bold whitespace-nowrap border-b-2 border-brand-orange/40'
  const paid = (method) => sumSplit(visits, method)
  const unknown = sumSplit(visits, 'other')
  const live = round2(
    visits.filter((v) => !v.endedAt).reduce((s, v) => s + visitPrice(pricing, visitMinutes(v.startedAt, now), v).amount, 0),
  )
  const people = visits.reduce((s, v) => s + v.people, 0)
  const td = 'px-3 py-2.5'

  return (
    <section className={`${card} !p-0 overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-[0.9rem] tabular-nums border-collapse">
          <thead className="bg-brand-orange-soft">
            <tr>
              <th className={`${th} text-left`}>Müştəri</th>
              <th className={`${th} text-right`}>Say</th>
              <th className={`${th} text-left`}>Yer</th>
              <th className={`${th} text-left`}>Giriş</th>
              <th className={`${th} text-left`}>Çıxış</th>
              <th className={`${th} text-right`}>Nağd</th>
              <th className={`${th} text-right`}>Kart</th>
              <th className={th}>
                <span className="sr-only">Əməliyyatlar</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visits.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-inkdim">
                  {isToday ? 'Hələ müştəri yoxdur. Soldan yeni müştəri başlat.' : 'Bu gün üçün qeyd yoxdur.'}
                </td>
              </tr>
            ) : (
              visits.map((v) => (
                <VisitTableRow key={v.id} visit={v} now={now} pricing={pricing} onChange={onChange} onDelete={onDelete} notify={notify} />
              ))
            )}
          </tbody>
          {visits.length > 0 && (
            <tfoot>
              <tr className="font-bold bg-ink/[0.03] border-t-2 border-ink/15">
                <td className={td}>Cəmi</td>
                <td className={`${td} text-right`}>{people}</td>
                <td colSpan={3} className={`${td} text-[0.8rem] font-semibold text-inkdim`}>
                  {live > 0 && `Davam edənlər hələlik: ${money(live)}`}
                  {unknown > 0 && `${live > 0 ? ' · ' : ''}Üsulsuz: ${money(unknown)}`}
                </td>
                <td className={`${td} text-right`}>{money(paid('cash'))}</td>
                <td className={`${td} text-right`}>{money(paid('card'))}</td>
                <td className={td} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  )
}

// Cədvəlin bir sətri. "Bitir" basılanda altında ödəniş seçimi, "Düzəlt" basılanda düzəliş forması açılır.
function VisitTableRow({ visit, now, pricing, onChange, onDelete, notify }) {
  const request = useAdminApi()
  const [editing, setEditing] = useState(false)
  const [ending, setEnding] = useState(false) // "Bitir" basılıb — ödəniş üsulu soruşulur
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const isActive = !visit.endedAt
  const isRoom = visit.kind === 'room'
  const minutes = isActive ? visitMinutes(visit.startedAt, now) : visit.minutes
  const price = visitPrice(pricing, minutes, visit)
  const amount = isActive ? price.amount : visit.amount

  const act = async (path, options, message) => {
    setBusy(true)
    setError(null)
    try {
      const res = await request(path, options)
      // Sətir cədvəldə qalır (bitən seans yerini dəyişmir) — ödəniş seçimi bağlanmalıdır
      setEnding(false)
      if (res?.visit) onChange(res.visit)
      else onDelete(visit.id)
      notify(typeof message === 'function' ? message(res?.visit) : message)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const td = 'px-3 py-2.5 border-b border-ink/10 align-top'
  const full = (children, extra = '') => (
    <tr>
      <td colSpan={8} className={`px-3 py-3 border-b border-ink/10 ${extra}`}>
        {children}
      </td>
    </tr>
  )

  if (editing) {
    return full(
      <EditVisit
        visit={visit}
        onCancel={() => setEditing(false)}
        onSaved={(v) => {
          onChange(v)
          setEditing(false)
          notify('Düzəliş saxlandı')
        }}
      />,
      'bg-card',
    )
  }

  // Bitmiş seansın pulu ödəniş üsullarının sütunlarında (beh öz üsulunda, qalıq bitəndə seçilən üsulda);
  // üsulu qeyd olunmayan hissə — Nağd sütununda "?" ilə
  const split = paymentSplit(visit)
  const paidIn = (method) => (
    <>
      {split[method] !== 0 && money(split[method])}
      {method === 'cash' && split.other !== 0 && (
        <span title="Ödəniş üsulu qeyd olunmayıb" className="block">
          {money(split.other)} ?
        </span>
      )}
    </>
  )
  // Bitəndə ödəniləcək: məbləğ − beh (mənfidirsə — müştəriyə qaytarılır)
  const deposit = Number(visit.deposit ?? 0)
  const due = round2(amount - deposit)
  const iconBtn = 'p-1.5 rounded-lg text-inkdim hover:text-ink hover:bg-ink/5 disabled:opacity-40'

  return (
    <>
      <tr className={isActive ? 'bg-brand-teal-soft/50' : 'hover:bg-ink/[0.02]'}>
        <td className={td}>
          <div className="font-bold">{visit.name}</div>
          <div className="flex flex-wrap gap-1 mt-0.5 empty:hidden">
            <VisitBadges visit={visit} inTable />
          </div>
          {price.discount > 0 && (
            <div className="text-[0.72rem] text-inkdim mt-0.5">
              {price.clubDiscount > 0 && price.discountSource !== 'club'
                ? `${DISCOUNT_SOURCE[price.discountSource]} −${money(round2(price.discount - price.clubDiscount))} · DırDır Club −${money(price.clubDiscount)}`
                : `${DISCOUNT_SOURCE[price.discountSource]} −${money(price.discount)}`}
            </div>
          )}
          {visit.note && <div className="text-[0.75rem] italic text-inkdim mt-0.5">{visit.note}</div>}
        </td>
        <td className={`${td} text-right font-semibold`}>{visit.people}</td>
        <td className={td}>{isRoom ? 'Kino' : 'Zal'}</td>
        <td className={td}>{bakuTime(visit.startedAt)}</td>
        <td className={td}>
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 font-bold text-brand-teal-deep">
              <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
              {elapsedClock(visit.startedAt, now)}
            </span>
          ) : (
            <>
              {bakuTime(visit.endedAt)}
              <div className="text-[0.72rem] text-inkdim">{durationText(visit.minutes)}</div>
            </>
          )}
        </td>
        {isActive ? (
          <td colSpan={2} className={`${td} text-right`}>
            <div className="font-display font-bold text-primary text-[1.05rem] leading-tight">{money(amount)}</div>
            <div className="text-[0.7rem] text-inkdim">
              canlı · {!isRoom && visit.people > 1 ? `${visit.people} × ${money(price.perPerson)} · ` : ''}
              {price.capped ? 'stop çek' : `${price.billedHours} saat`}
            </div>
          </td>
        ) : (
          <>
            <td className={`${td} text-right font-semibold`}>{paidIn('cash')}</td>
            <td className={`${td} text-right font-semibold`}>{paidIn('card')}</td>
          </>
        )}
        <td className={`${td} text-right whitespace-nowrap`}>
          <span className="inline-flex items-center gap-0.5">
            {isActive ? (
              <Button variant="dark" size="sm" onClick={() => setEnding((v) => !v)} className="mr-1">
                <PiStopFill size={12} /> Bitir
              </Button>
            ) : (
              <button
                type="button"
                title="Davam etdir"
                aria-label="Davam etdir"
                disabled={busy}
                onClick={() => act(`/admin/visits/${visit.id}/resume`, { method: 'POST' }, `${visit.name} — seans yenidən davam edir`)}
                className={iconBtn}
              >
                <PiArrowCounterClockwiseBold size={16} />
              </button>
            )}
            <button type="button" title="Düzəlt" aria-label="Düzəlt" onClick={() => setEditing(true)} className={iconBtn}>
              <PiPencilSimpleBold size={16} />
            </button>
            <ConfirmButton question="Silinsin?" onConfirm={() => act(`/admin/visits/${visit.id}`, { method: 'DELETE' }, 'Seans silindi')}>
              <PiTrashBold size={16} />
            </ConfirmButton>
          </span>
        </td>
      </tr>
      {ending &&
        isActive &&
        full(
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <span className="text-[0.88rem] font-bold mr-1">
              {visit.name} · {deposit > 0 ? `cəmi ${money(amount)} · beh ${money(deposit)} · ` : ''}
              {due >= 0 ? 'ödəniş' : 'qaytarılmalı'}: <span className="text-primary">{money(Math.abs(due))}</span>
            </span>
            {Object.entries(PAYMENT).map(([method, { label, icon: Icon }]) => (
              <Button
                key={method}
                variant="dark"
                size="sm"
                loading={busy}
                onClick={() =>
                  act(
                    `/admin/visits/${visit.id}/end`,
                    { method: 'POST', body: { paymentMethod: method } },
                    (v) =>
                      `${visit.name} — seans bitdi: ${money(v.amount)}${deposit > 0 ? ` (beh ${money(deposit)}, qalıq ${money(round2(v.amount - deposit))} · ${label})` : ` · ${label}`}`,
                  )
                }
              >
                <Icon size={15} /> {label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setEnding(false)}>
              Ləğv et
            </Button>
          </div>,
          'bg-brand-teal-soft/30',
        )}
      {error && full(<ErrorBox error={error} />)}
    </>
  )
}

// Seansın nişanları: kino otağı, nəfər sayı, tələbə, promokod, qeydiyyatlı
// inTable — cədvəldə "Kino otağı" və nəfər sayı öz sütunlarındadır, nişan kimi təkrarlanmır
function VisitBadges({ visit, inTable }) {
  const isRoom = visit.kind === 'room'
  const badge = 'inline-flex items-center gap-1 text-[0.7rem] font-bold px-2 py-0.5 rounded-full'
  return (
    <>
      {isRoom && !inTable && (
        <span className={`${badge} text-brand-orange-deep bg-brand-orange-soft`}>
          <PiFilmSlateBold size={13} /> Kino otağı
        </span>
      )}
      {visit.people > 1 && !inTable && (
        <span className={`${badge} text-brand-purple-deep bg-brand-purple-soft`}>
          <PiUsersBold size={13} /> {visit.people} nəfər
        </span>
      )}
      {visit.students > 0 && !isRoom && (
        <span className={`${badge} text-brand-cyan-deep bg-brand-cyan-soft`}>
          <PiStudentBold size={13} /> {visit.people > 1 ? `${visit.students} tələbə` : 'Tələbə'}
        </span>
      )}
      {visit.promoCode && (
        <span className={`${badge} text-brand-pink-deep bg-brand-pink-soft`}>
          <PiTicketBold size={13} /> {visit.promoCode} −{visit.promoPercent}%
        </span>
      )}
      {visit.club && (
        <span className={`${badge} text-brand-orange-deep bg-brand-orange-soft`} title="DırDır Club statusu (seans başlayanda)">
          <PiCrownBold size={13} /> {visit.club.name} −{isRoom ? visit.club.roomPercent : visit.club.hallPercent}%
        </span>
      )}
      {visit.deposit > 0 && (
        <span className={`${badge} text-brand-teal-deep bg-brand-teal-soft`} title="Əvvəlcədən alınan məbləğ">
          <PiHandCoinsBold size={13} /> Beh {money(visit.deposit)} · {PAYMENT[visit.depositMethod]?.label.toLowerCase() ?? '?'}
        </span>
      )}
      {visit.discountValue > 0 && (
        <span className={`${badge} text-brand-orange-deep bg-brand-orange-soft`} title="Xüsusi endirim">
          <PiTagBold size={13} /> Endirim {discountLabel(visit.discountType, visit.discountValue)}
        </span>
      )}
      {visit.user && (
        <span className={`${badge} text-brand-teal-deep bg-brand-teal-soft`} title="Saytda qeydiyyatı var — seans kabinetində görünür">
          <PiUserCircleCheckBold size={13} /> Qeydiyyatlı
        </span>
      )}
    </>
  )
}

function Stat({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className="bg-card border border-ink/10 rounded-[18px] p-3.5 sm:p-4">
      <div className="flex items-center gap-1.5 text-[0.75rem] sm:text-[0.8rem] font-bold text-inkdim">
        <Icon size={15} className={accent ? 'text-brand-teal-deep' : ''} /> {label}
      </div>
      <div className="font-display font-bold text-[1.3rem] sm:text-[1.7rem] leading-tight mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[0.75rem] text-inkdim mt-0.5">{hint}</div>}
    </div>
  )
}

// Gün seçimi: ‹ tarix › və "Bu gün"
function DayPicker({ day, today, onChange }) {
  if (!day) return null
  const isToday = day === today
  return (
    <div className="flex items-center gap-1.5">
      <Button variant="ghost" size="sm" aria-label="Əvvəlki gün" onClick={() => onChange(shiftDay(day, -1))}>
        <PiCaretLeftBold size={16} />
      </Button>
      {/* Tarix azərbaycanca yazılır; üstündəki görünməz tarix sahəsi kliklə təqvimi açır */}
      <label className="relative inline-flex items-center gap-2 bg-card border-2 border-ink/10 rounded-xl px-3.5 py-2 font-bold text-[0.9rem] cursor-pointer hover:border-ink/30 focus-within:border-primary">
        <PiCalendarBlankBold size={17} className="text-primary" />
        {dayLabel(day)}
        <input
          type="date"
          value={day}
          max={today}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          aria-label="Gün seç"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      <Button variant="ghost" size="sm" aria-label="Növbəti gün" disabled={isToday} onClick={() => onChange(shiftDay(day, 1))}>
        <PiCaretRightBold size={16} />
      </Button>
      {!isToday && (
        <Button variant="dark" size="sm" onClick={() => onChange(today)}>
          Bu gün
        </Button>
      )}
    </div>
  )
}

// Yeni müştəri: ad yazılır; qeydiyyatlı istifadəçi tapılarsa seçilir və seans onun kabinetində də görünür.
function NewVisit({ onCreated, roomBusy }) {
  const request = useAdminApi()
  const pricing = usePricing()
  const { room, studentDiscount } = pricing
  const [focused, setFocused] = useState(false)
  const [extrasOpen, setExtrasOpen] = useState(false)
  const [kind, setKind] = useState('hall')
  const [students, setStudents] = useState(0)
  const [promo, setPromo] = useState(null) // { code, percent }
  const [discount, setDiscount] = useState(EMPTY_DISCOUNT)
  const [deposit, setDeposit] = useState(EMPTY_DEPOSIT)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [people, setPeople] = useState(1)
  const [time, setTime] = useState('') // boşdursa — indi
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Yazdıqca qeydiyyatlı istifadəçiləri axtarırıq (bir az gözləyib — hər hərfə sorğu getməsin)
  useEffect(() => {
    const q = query.trim()
    if (selected || q.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const id = setTimeout(() => {
      request(`/admin/users?q=${encodeURIComponent(q)}&status=active&limit=6`)
        .then((d) => !cancelled && setResults(d.users))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setSearching(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected])

  const reset = () => {
    setQuery('')
    setSelected(null)
    setResults([])
    setTime('')
    setPeople(1)
    setStudents(0)
    setPromo(null)
    setDiscount(EMPTY_DISCOUNT)
    setDeposit(EMPTY_DEPOSIT)
    setKind('hall')
    setExtrasOpen(false)
    document.getElementById('visit-name')?.focus()
  }

  const start = async (e) => {
    e.preventDefault()
    setError(null)
    const counts = { kind, people, students: kind === 'room' ? 0 : students }
    if (promo) counts.promoCode = promo.code
    if (customDiscount) counts.discount = customDiscount
    if (depositBody(deposit)) counts.deposit = depositBody(deposit)
    const body = selected ? { userId: selected.id, ...counts } : { name: query.trim(), ...counts }
    if (time) body.startedAt = fromBakuInput(`${bakuDay()}T${time}`)
    setSaving(true)
    try {
      const { visit } = await request('/admin/visits', { method: 'POST', body })
      onCreated(visit)
      reset()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const isRoom = kind === 'room'
  const customDiscount = discountBody(discount)
  const canStart = (selected || query.trim().length > 0) && !(isRoom && roomBusy)
  const showResults = focused && !selected && query.trim().length >= 2
  // Əlavə seçimlərdə nə seçilib — bağlı olanda da görünsün
  const extrasSummary = [
    !isRoom && students > 0 && (people > 1 ? `${students} tələbə` : 'tələbə'),
    promo && `${promo.code} −${promo.percent}%`,
    customDiscount && `endirim ${discountLabel(customDiscount.type, customDiscount.value)}`,
    depositBody(deposit) && `beh ${money(depositBody(deposit).amount)}`,
    time && `${time}-dan`,
  ].filter(Boolean)
  // Başlanğıc məbləğ (ilk saat) — admin müştəriyə dərhal deyə bilsin
  const firstHour = visitPrice(pricing, 0, {
    kind,
    people,
    students: isRoom ? 0 : students,
    promoPercent: promo?.percent,
    discountType: customDiscount?.type,
    discountValue: customDiscount?.value,
    club: selected?.club?.tier ?? null,
  })

  return (
    <form onSubmit={start} className={card} noValidate>
      <h2 className="font-display font-bold text-[1.1rem] mb-3">Yeni müştəri</h2>

      <Label htmlFor="visit-name" hint="qeydiyyatlıdırsa, siyahıdan seç">
        Müştəri
      </Label>
      {selected ? (
        <div className="flex items-center gap-2.5 bg-brand-teal-soft rounded-xl px-3.5 py-2.5">
          <PiUserCircleCheckBold size={22} className="text-brand-teal-deep shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">
              {selected.firstName} {selected.lastName}
            </div>
            <div className="text-[0.78rem] text-inkdim truncate">
              <b className="text-ink">{selected.customerCode}</b> · Qeydiyyatlı · {selected.phone}
            </div>
            {selected.club && (
              <div className="mt-1">
                <ClubTag club={selected.club} kind={kind} />
              </div>
            )}
          </div>
          <button type="button" onClick={reset} aria-label="Seçimi ləğv et" className="p-1.5 rounded-full hover:bg-ink/10">
            <PiXBold size={15} />
          </button>
        </div>
      ) : null}
      {selected && <UserGifts userId={selected.id} />}
      {selected ? null : (
        <div className="relative">
          <PiMagnifyingGlassBold size={17} className="absolute left-3.5 top-[0.85rem] text-inkdim pointer-events-none" />
          <TextInput
            id="visit-name"
            value={query}
            maxLength={80}
            autoComplete="off"
            placeholder="Ad, telefon və ya müştəri kodu (DD1001)"
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            className="pl-10"
          />
          {/* Axtarış nəticələri — sahənin altında üzən siyahı (səhifəni itələmir) */}
          {showResults && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-xl border border-ink/10 bg-card shadow-xl overflow-hidden">
              {results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  // blur-dan əvvəl seçilsin (yoxsa siyahı bağlanıb klik itir)
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSelected(u)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-ink/5 border-b border-ink/5"
                >
                  <PiUserCircleCheckBold size={20} className="text-brand-teal-deep shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold truncate">
                      {u.firstName} {u.lastName}
                    </span>
                    <span className="block text-[0.78rem] text-inkdim truncate">
                      <b className="text-ink">{u.customerCode}</b> · {u.phone} · {u.email}
                    </span>
                    {u.club && (
                      <span className="block mt-0.5">
                        <ClubTag club={u.club} />
                      </span>
                    )}
                  </span>
                </button>
              ))}
              <div className="px-3.5 py-2.5 text-[0.8rem] text-inkdim bg-ink/[0.03]">
                {searching
                  ? 'Axtarılır…'
                  : results.length
                    ? `Siyahıda yoxdursa, "${query.trim()}" qeydiyyatsız müştəri kimi başladılacaq.`
                    : `Qeydiyyatlı istifadəçi tapılmadı — "${query.trim()}" qeydiyyatsız müştəri kimi başladılacaq.`}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3.5 flex items-end gap-3">
        <div className="flex-1 min-w-0">
          <KindToggle
            short
            value={kind}
            onChange={(next) => {
              setKind(next)
              if (next === 'room') setPeople((n) => Math.min(n, room.maxPeople))
            }}
          />
        </div>
        <PeopleStepper
          id="visit-people"
          value={people}
          compact
          onChange={(n) => {
            setPeople(n)
            setStudents((s) => Math.min(s, n))
          }}
          max={isRoom ? room.maxPeople : 50}
        />
      </div>
      {isRoom && roomBusy && (
        <p className="text-[0.8rem] font-semibold text-brand-pink-deep mt-2">
          Kino otağı məşğuldur — {roomBusy.name} adına seans davam edir.
        </p>
      )}
      {isRoom && !roomBusy && <p className="text-[0.75rem] text-inkdim mt-1.5">Otaq qiyməti bütün qrup üçündür, ən çox {room.maxPeople} nəfər.</p>}

      {/* Az istifadə olunan seçimlər — bağlıdır ki, "Başlat" həmişə görünsün */}
      <button
        type="button"
        onClick={() => setExtrasOpen((v) => !v)}
        aria-expanded={extrasOpen}
        className="mt-3 w-full flex items-center gap-2 text-left text-[0.85rem] font-bold text-inkdim hover:text-ink"
      >
        <PiCaretDownBold size={14} className={`transition-transform ${extrasOpen ? 'rotate-180' : ''}`} />
        {isRoom ? 'Beh, promokod, endirim, başlama saatı' : 'Beh, tələbə, promokod, endirim, başlama saatı'}
        {!extrasOpen && extrasSummary.length > 0 && (
          <span className="ml-auto text-primary truncate">{extrasSummary.join(' · ')}</span>
        )}
      </button>
      {extrasOpen && (
        <div className="mt-3 flex flex-col gap-3.5 pl-1">
          {!isRoom && studentTiers(studentDiscount).length > 0 && (
            <StudentField id="visit-students" people={people} value={students} onChange={setStudents} discount={studentDiscount} />
          )}
          <div>
            <PromoField id="visit-promo" value={promo} onChange={setPromo} />
          </div>
          <DiscountField id="visit-discount" value={discount} onChange={setDiscount} error={error?.fields?.['discount.value']} />
          <DepositField id="visit-deposit" value={deposit} onChange={setDeposit} error={error?.fields?.['deposit.amount']} />
          <div>
            <Label htmlFor="visit-time" hint="boş qalsa — indi">
              Başlama saatı
            </Label>
            <TextInput id="visit-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <ErrorBox error={error} />
        <Button type="submit" variant="primary" loading={saving} disabled={!canStart} className="w-full py-3 text-[1rem]">
          <PiPlayFill size={15} /> Başlat
          <span className="font-semibold opacity-80">· ilk saat {money(firstHour.amount)}</span>
        </Button>
      </div>
    </form>
  )
}

// Seçilmiş qeydiyyatlı müştərinin hədiyyə çarxından qazanıb hələ almadığı hədiyyələr.
// Hədiyyəni verəndə "Verildi" — siyahıdan çıxır (Hədiyyə çarxı bölməsində tarixçə qalır).
function UserGifts({ userId }) {
  const request = useAdminApi()
  const [spins, setSpins] = useState([])
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let cancelled = false
    request(`/admin/wheel/spins?status=unused&userId=${encodeURIComponent(userId)}`)
      .then((d) => !cancelled && setSpins(d.spins))
      .catch(() => !cancelled && setSpins([]))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const give = async (spin) => {
    setBusyId(spin.id)
    try {
      await request(`/admin/wheel/spins/${spin.id}`, { method: 'PATCH', body: { used: true } })
      setSpins((list) => list.filter((s) => s.id !== spin.id))
    } catch {
      // uğursuz olsa siyahıda qalır — admin yenidən basa bilər
    } finally {
      setBusyId(null)
    }
  }

  if (!spins.length) return null
  return (
    <div className="mt-2 rounded-xl border-2 border-dashed border-primary/40 bg-brand-orange-soft px-3.5 py-2.5">
      <p className="text-[0.8rem] font-bold text-brand-orange-deep mb-1.5">🎁 Hədiyyə çarxından qazandığı hədiyyə var:</p>
      <ul className="flex flex-col gap-1.5">
        {spins.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <span className="flex-1 min-w-0 font-bold text-[0.9rem] truncate">{s.prize.az}</span>
            <Button variant="dark" size="sm" loading={busyId === s.id} onClick={() => give(s)}>
              Verildi
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Ümumi zal / Kino otağı seçimi
// short — dar yerdə qısa yazı ("Zal" / "Kino")
function KindToggle({ value, onChange, short }) {
  return (
    <div className="grid grid-cols-2 bg-ink/5 rounded-xl p-1 gap-1" role="group" aria-label="Harada">
      {Object.entries(KINDS).map(([kind, { label, short: shortLabel, icon: Icon }]) => (
        <button
          key={kind}
          type="button"
          aria-pressed={value === kind}
          onClick={() => onChange(kind)}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-bold text-[0.85rem] transition-colors ${
            value === kind ? 'bg-card shadow text-ink' : 'text-inkdim hover:text-ink'
          }`}
        >
          <Icon size={16} /> {short ? shortLabel : label}
        </button>
      ))}
    </div>
  )
}

// Promokod: yazılır və "Tətbiq et" ilə yoxlanır; tətbiq olunanda kod və faiz görünür.
// Tələbə endirimi ilə cəmlənmir — hansı çoxdursa, o tətbiq olunur.
function PromoField({ id, value, onChange }) {
  const request = useAdminApi()
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)

  if (value) {
    return (
      <>
        <span className="block text-[0.85rem] font-bold mb-1.5">Promokod</span>
        <div className="flex items-center gap-2.5 bg-brand-pink-soft rounded-xl px-3.5 py-2.5">
          <PiTicketBold size={20} className="text-brand-pink-deep shrink-0" />
          <span className="flex-1 font-bold">
            {value.code} <span className="text-brand-pink-deep">−{value.percent}%</span>
          </span>
          <button type="button" onClick={() => onChange(null)} aria-label="Promokodu sil" className="p-1.5 rounded-full hover:bg-ink/10">
            <PiXBold size={15} />
          </button>
        </div>
      </>
    )
  }

  const apply = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setChecking(true)
    setError(null)
    try {
      const promo = await request('/promo/validate', { method: 'POST', body: { code: trimmed } })
      onChange({ code: promo.code, percent: promo.percent })
      setCode('')
    } catch (err) {
      setError(err.code === 'PROMO_NOT_FOUND' ? 'Bu promokod tapılmadı və ya vaxtı keçib.' : err.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <>
      <Label htmlFor={id} hint="könüllü">
        Promokod
      </Label>
      <div className="flex gap-2">
        <TextInput
          id={id}
          value={code}
          maxLength={32}
          autoComplete="off"
          placeholder="məs. DIRDIR10"
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            setError(null)
          }}
          onKeyDown={(e) => {
            // Formanı göndərmək əvəzinə kodu yoxla
            if (e.key === 'Enter') {
              e.preventDefault()
              apply()
            }
          }}
          error={error}
          className="uppercase"
        />
        <Button variant="outline" size="md" loading={checking} disabled={!code.trim()} onClick={apply} className="shrink-0 self-start">
          Tətbiq et
        </Button>
      </div>
    </>
  )
}

// Tələbə endirimi: tək nəfərdə "Tələbədir" qutusu, qrupda "neçəsi tələbədir" sayğacı
function StudentField({ id, people, value, onChange, discount }) {
  // "2 saat −10%, 3+ saat −20%" — son pillə "və çox" deməkdir
  const tiers = studentTiers(discount)
  const rule = tiers.map((tier, i) => `${tier.minHours}${i === tiers.length - 1 ? '+' : ''} saat −${tier.percent}%`).join(', ')
  if (people === 1) {
    return (
      <label htmlFor={id} className="flex items-center gap-2.5 cursor-pointer select-none rounded-xl border-2 border-ink/10 px-3.5 py-2.5">
        <input
          id={id}
          type="checkbox"
          checked={value > 0}
          onChange={(e) => onChange(e.target.checked ? 1 : 0)}
          className="w-5 h-5 accent-[var(--color-primary)]"
        />
        <PiStudentBold size={18} className="text-primary" />
        <span className="flex-1 font-bold text-[0.9rem]">Tələbədir</span>
        <span className="text-[0.75rem] text-inkdim">{rule}</span>
      </label>
    )
  }
  return (
    <>
      <Label htmlFor={id} hint={rule}>
        Neçəsi tələbədir
      </Label>
      <PeopleStepper id={id} value={value} onChange={onChange} min={0} max={people} />
    </>
  )
}

// Beh: əvvəlcədən alınan məbləğ + nağd/kart. Seans bitəndə yalnız qalıq ödənilir.
function DepositField({ id, value, onChange, error }) {
  return (
    <div>
      <Label htmlFor={id} hint="könüllü · bitəndə qalıq ödənilir">
        Beh
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <TextInput
            id={id}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            placeholder="məs. 10"
            value={value.amount}
            onChange={(e) => onChange({ ...value, amount: e.target.value })}
            error={error}
            className="pr-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="absolute right-3.5 top-[0.7rem] text-[0.85rem] font-bold text-inkdim pointer-events-none">₼</span>
        </div>
        <div className="inline-flex shrink-0 self-start bg-ink/5 rounded-xl p-1 gap-1" role="group" aria-label="Behin ödəniş üsulu">
          {Object.entries(PAYMENT).map(([method, { label, icon: Icon }]) => (
            <button
              key={method}
              type="button"
              aria-pressed={value.method === method}
              onClick={() => onChange({ ...value, method })}
              className={`inline-flex items-center gap-1 px-2.5 h-[34px] rounded-lg font-bold text-[0.82rem] transition-colors ${
                value.method === method ? 'bg-card shadow text-ink' : 'text-inkdim hover:text-ink'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Xüsusi endirim: rəqəm + faiz/manat seçimi. Boş qalsa — endirim yoxdur.
// Tələbə endirimi və promokodla cəmlənmir — hansı çoxdursa, o tətbiq olunur.
function DiscountField({ id, value, onChange, error }) {
  const isPercent = value.type === 'percent'
  return (
    <div>
      <Label htmlFor={id} hint="könüllü · ən böyük endirim tətbiq olunur">
        Xüsusi endirim
      </Label>
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <TextInput
            id={id}
            type="number"
            inputMode="decimal"
            min="0"
            max={isPercent ? 100 : undefined}
            step={isPercent ? 1 : 0.5}
            placeholder={isPercent ? 'məs. 15' : 'məs. 2'}
            value={value.value}
            onChange={(e) => onChange({ ...value, value: e.target.value })}
            error={error}
            className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <div className="inline-flex shrink-0 self-start bg-ink/5 rounded-xl p-1 gap-1" role="group" aria-label="Endirimin növü">
          {[
            ['percent', '%', 'Faizlə'],
            ['amount', '₼', 'Manatla'],
          ].map(([type, label, title]) => (
            <button
              key={type}
              type="button"
              title={title}
              aria-label={title}
              aria-pressed={value.type === type}
              onClick={() => onChange({ ...value, type })}
              className={`w-10 h-[34px] rounded-lg font-bold transition-colors ${
                value.type === type ? 'bg-card shadow text-ink' : 'text-inkdim hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Nəfər sayı: − 5 + (min–max)
// compact — formada "Harada" ilə yanaşı: başlığı üstündə, kiçik düymələr
function PeopleStepper({ id, value, onChange, min = 1, max = 50, compact }) {
  const set = (n) => onChange(Math.min(max, Math.max(min, Number.isFinite(n) ? Math.round(n) : min)))
  const size = compact ? 'w-9 h-[42px]' : 'w-11 h-11'
  const btn = `${size} shrink-0 rounded-xl border-2 border-ink/10 flex items-center justify-center hover:border-ink disabled:opacity-40`
  const stepper = (
    <div className={`flex items-center ${compact ? 'gap-1' : 'gap-2'}`}>
      <button type="button" className={btn} onClick={() => set(value - 1)} disabled={value <= min} aria-label="Bir nəfər az">
        <PiMinusBold size={16} />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className={`${compact ? 'w-11 h-[42px]' : 'w-16 h-11'} text-center font-display font-bold text-[1.15rem] bg-bg border-2 border-ink/10 rounded-xl outline-none focus:border-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      <button type="button" className={btn} onClick={() => set(value + 1)} disabled={value >= max} aria-label="Bir nəfər çox">
        <PiPlusBold size={16} />
      </button>
    </div>
  )
  if (!compact) return stepper
  return (
    <div className="shrink-0">
      <label htmlFor={id} className="block text-[0.75rem] font-bold text-inkdim mb-1 text-center">
        Nəfər
      </label>
      {stepper}
    </div>
  )
}

// Səhv düzəltmək: ad (qeydiyyatsızda), başlama/bitmə vaxtı, qeyd. Bitmiş seansın məbləği server tərəfindən yenidən hesablanır.
function EditVisit({ visit, onCancel, onSaved }) {
  const request = useAdminApi()
  const { room, studentDiscount } = usePricing()
  const [form, setForm] = useState({
    name: visit.name,
    startedAt: toBakuInput(visit.startedAt),
    endedAt: visit.endedAt ? toBakuInput(visit.endedAt) : '',
    note: visit.note ?? '',
    paymentMethod: visit.paymentMethod ?? '',
    people: visit.people,
    kind: visit.kind,
    students: visit.students,
    promo: visit.promoCode ? { code: visit.promoCode, percent: visit.promoPercent } : null,
    discount: visit.discountValue ? { type: visit.discountType, value: String(visit.discountValue) } : EMPTY_DISCOUNT,
    deposit: visit.deposit ? { amount: String(visit.deposit), method: visit.depositMethod ?? 'cash' } : EMPTY_DEPOSIT,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) })

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const body = { startedAt: fromBakuInput(form.startedAt), note: form.note.trim() || null, people: form.people, ...(visit.endedAt ? { kind: form.kind } : {}), students: form.kind === 'room' ? 0 : form.students, promoCode: form.promo?.code ?? null, discount: discountBody(form.discount), deposit: depositBody(form.deposit) }
    if (!visit.user) body.name = form.name
    if (visit.endedAt && form.endedAt) body.endedAt = fromBakuInput(form.endedAt)
    if (visit.endedAt && form.paymentMethod) body.paymentMethod = form.paymentMethod
    try {
      const { visit: updated } = await request(`/admin/visits/${visit.id}`, { method: 'PATCH', body })
      onSaved(updated)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const fieldErrors = error?.fields ?? {}

  return (
    <div className="rounded-2xl border-2 border-primary/40 p-4">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2" noValidate>
        {!visit.user && (
          <div className="sm:col-span-2">
            <Label htmlFor={`name-${visit.id}`}>Ad</Label>
            <TextInput id={`name-${visit.id}`} maxLength={80} {...field('name')} error={fieldErrors.name} />
          </div>
        )}
        <div>
          <span className="block text-[0.85rem] font-bold mb-1.5">Harada</span>
          {visit.endedAt ? (
            <KindToggle
              value={form.kind}
              onChange={(kind) =>
                setForm({ ...form, kind, people: kind === 'room' ? Math.min(form.people, room.maxPeople) : form.people })
              }
            />
          ) : (
            // Davam edən seansın yeri dəyişmir (zal ↔ kino otağı) — yalnız göstərilir
            <div className="flex items-center gap-2 h-[42px] px-3.5 rounded-xl bg-ink/5 font-bold text-[0.9rem] text-inkdim">
              {(() => {
                const { label, icon: Icon } = KINDS[visit.kind]
                return (
                  <>
                    <Icon size={16} /> {label}
                  </>
                )
              })()}
            </div>
          )}
        </div>
        <div>
          <Label htmlFor={`people-${visit.id}`}>Nəfər sayı</Label>
          <PeopleStepper
            id={`people-${visit.id}`}
            value={form.people}
            onChange={(people) => setForm({ ...form, people, students: Math.min(form.students, people) })}
            max={form.kind === 'room' ? room.maxPeople : 50}
          />
          {fieldErrors.people && <p className="text-[0.8rem] font-semibold text-brand-pink-deep mt-1">{fieldErrors.people}</p>}
        </div>
        <div className="sm:col-span-2">
          <PromoField id={`promo-${visit.id}`} value={form.promo} onChange={(promo) => setForm({ ...form, promo })} />
          {fieldErrors.promoCode && <p className="text-[0.8rem] font-semibold text-brand-pink-deep mt-1">{fieldErrors.promoCode}</p>}
        </div>
        <div className="sm:col-span-2">
          <DiscountField
            id={`discount-${visit.id}`}
            value={form.discount}
            onChange={(discount) => setForm({ ...form, discount })}
            error={fieldErrors['discount.value']}
          />
        </div>
        <div className="sm:col-span-2">
          <DepositField
            id={`deposit-${visit.id}`}
            value={form.deposit}
            onChange={(deposit) => setForm({ ...form, deposit })}
            error={fieldErrors['deposit.amount']}
          />
        </div>
        {form.kind !== 'room' && studentTiers(studentDiscount).length > 0 && (
          <div className="sm:col-span-2">
            <StudentField
              id={`students-${visit.id}`}
              people={form.people}
              value={form.students}
              onChange={(students) => setForm({ ...form, students })}
              discount={studentDiscount}
            />
            {fieldErrors.students && <p className="text-[0.8rem] font-semibold text-brand-pink-deep mt-1">{fieldErrors.students}</p>}
          </div>
        )}
        <div>
          <Label htmlFor={`start-${visit.id}`}>Başlama</Label>
          <TextInput id={`start-${visit.id}`} type="datetime-local" {...field('startedAt')} error={fieldErrors.startedAt} />
        </div>
        {visit.endedAt && (
          <div>
            <Label htmlFor={`end-${visit.id}`}>Bitmə</Label>
            <TextInput id={`end-${visit.id}`} type="datetime-local" {...field('endedAt')} error={fieldErrors.endedAt} />
          </div>
        )}
        {visit.endedAt && (
          <div className="sm:col-span-2">
            <span className="block text-[0.85rem] font-bold mb-1.5">Ödəniş</span>
            <div className="inline-flex bg-ink/5 rounded-full p-1 gap-1">
              {Object.entries(PAYMENT).map(([method, { label, icon: Icon }]) => (
                <button
                  key={method}
                  type="button"
                  aria-pressed={form.paymentMethod === method}
                  onClick={() => setForm({ ...form, paymentMethod: method })}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-[0.85rem] transition-colors ${
                    form.paymentMethod === method ? 'bg-ink text-bg' : 'text-inkdim hover:text-ink'
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="sm:col-span-2">
          <Label htmlFor={`note-${visit.id}`} hint="könüllü">
            Qeyd
          </Label>
          <TextInput id={`note-${visit.id}`} maxLength={300} placeholder="məs. 2 çay, masa 4" {...field('note')} />
        </div>
        <div className="sm:col-span-2 flex flex-col gap-2">
          <ErrorBox error={error && !Object.keys(fieldErrors).length ? error : null} />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" loading={saving}>
              Yadda saxla
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Ləğv et
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

// Tarixçə: qeyd olan günlər — müştəri sayı və cəmi. Gün seçiləndə həmin günün hesabatı açılır.
function History({ day, today, version, onSelect }) {
  const request = useAdminApi()
  const [days, setDays] = useState(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    request('/admin/visits/days')
      .then((d) => setDays(d.days))
      .catch(() => setDays([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const list = days ? (showAll ? days : days.slice(0, 10)) : []

  return (
    <section className={card}>
      <h2 className="flex items-center gap-2 font-display font-bold text-[1.1rem] mb-3">
        <PiCalendarBlankBold size={19} className="text-primary" /> Tarixçə
      </h2>
      {days === null ? (
        <Spinner />
      ) : days.length === 0 ? (
        <p className="text-[0.88rem] text-inkdim">Hələ heç bir gün qeyd olunmayıb.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-1">
            {list.map((d) => (
              <li key={d.day}>
                <button
                  type="button"
                  onClick={() => onSelect(d.day)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                    d.day === day ? 'bg-primary text-white' : 'hover:bg-ink/5'
                  }`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-[0.9rem]">
                      {d.day === today ? 'Bu gün' : dayLabel(d.day, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className={`block text-[0.72rem] tabular-nums ${d.day === day ? 'text-white/80' : 'text-inkdim'}`}>
                      Nağd {money(d.cash)} · Kart {money(d.card)}
                    </span>
                  </span>
                  <span className={`text-[0.8rem] ${d.day === day ? 'text-white/80' : 'text-inkdim'}`}>{d.count} nəfər</span>
                  <span className="font-bold text-[0.9rem] tabular-nums w-[70px] text-right">{money(d.total)}</span>
                </button>
              </li>
            ))}
          </ul>
          {days.length > 10 && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Az göstər' : `Hamısını göstər (${days.length})`}
            </Button>
          )}
          <p className="text-[0.75rem] text-inkdim mt-2">Cəmə yalnız bitmiş seanslar daxildir.</p>
        </>
      )}
    </section>
  )
}
