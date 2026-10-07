import { useState } from 'react'
import {
  PiUsersThreeBold,
  PiClockBold,
  PiStudentBold,
  PiTicketBold,
  PiMinusBold,
  PiPlusBold,
  PiCheckBold,
  PiXBold,
  PiInstagramLogoBold,
  PiArmchairBold,
  PiFilmSlateBold,
  PiCheckCircleFill,
  PiConfettiBold,
} from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { business } from '../data/business.js'
import { api, apiEnabled } from '../lib/api.js'

const { currency, pricing, studentDiscount, promoCodes, calculator } = business
const { hall, room } = pricing
// Backend qoşulubsa kodları server yoxlayır; yoxsa business.js-dəki siyahı (boşdursa sahə gizlənir).
const hasPromoCodes = apiEnabled || Object.keys(promoCodes).length > 0
const { smallGroup, group } = room

const money = (n) =>
  `${n.toLocaleString('az-AZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${currency}`
const hoursLabel = (h) => `${h.toLocaleString('az-AZ')} saat`

// Zalda bu saatdan sonra stop çek işə düşür (4 + 3 + 3 + 3 = 13 → 4 saat).
const hallCapHours = 1 + (hall.cap - hall.firstHour) / hall.nextHour

const MODES = [
  {
    id: 'hall',
    label: 'Zal',
    icon: PiArmchairBold,
    note: `İlk saat ${money(hall.firstHour)}, sonra ${money(hall.nextHour)}/saat`,
  },
  {
    id: 'room',
    label: 'Kino otağı',
    icon: PiFilmSlateBold,
    note: `${smallGroup.maxPeople} nəfərə ${money(smallGroup.firstHour)}-dan, ${room.maxPeople} nəfərə kimi`,
  },
]

const clamp = (v, { min, max }) => Math.min(max, Math.max(min, v))

// Hər rejim üçün məbləği və hesab sətirlərini qaytarır.
function quote(mode, people, hours) {
  if (mode === 'room') {
    if (people <= smallGroup.maxPeople) {
      const extraHours = hours - 1
      const rows = [{ label: `İlk saat (${smallGroup.maxPeople} nəfərə qədər)`, value: money(smallGroup.firstHour) }]
      if (extraHours > 0) {
        rows.push({
          label: `Sonrakı ${hoursLabel(extraHours)} × ${money(smallGroup.nextHour)}`,
          value: money(extraHours * smallGroup.nextHour),
        })
      }
      return { subtotal: smallGroup.firstHour + extraHours * smallGroup.nextHour, rows }
    }
    const roomCost = group.perHour * hours
    const extraPeople = Math.max(0, people - group.includedPeople)
    const extraCost = extraPeople * group.extraPerPerson * hours
    const rows = [{ label: `Otaq: ${hoursLabel(hours)} × ${money(group.perHour)}`, value: money(roomCost) }]
    if (extraPeople > 0) {
      rows.push({
        label: `${extraPeople} əlavə nəfər × ${money(group.extraPerPerson)} × ${hoursLabel(hours)}`,
        value: money(extraCost),
      })
    }
    return { subtotal: roomCost + extraCost, rows }
  }
  const raw = hall.firstHour + Math.max(0, hours - 1) * hall.nextHour
  const perPerson = Math.min(raw, hall.cap)
  return {
    subtotal: people * perPerson,
    capped: raw > hall.cap,
    rows: [
      { label: 'Nəfər başına', value: money(perPerson), note: raw > hall.cap ? 'stop çek' : null },
      { label: `${people} nəfər × ${money(perPerson)}`, value: money(people * perPerson) },
    ],
  }
}

export default function Calculator() {
  const [mode, setMode] = useState('hall')
  const [people, setPeople] = useState(2)
  const [hours, setHours] = useState(2)
  const [student, setStudent] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState(null) // { code, percent }
  const [promoError, setPromoError] = useState(null)
  const [promoChecking, setPromoChecking] = useState(false)

  const limits = calculator[mode]
  const { subtotal, rows, capped } = quote(mode, people, hours)

  const studentEligible = mode === 'hall' && student && hours >= studentDiscount.minHours
  const studentPct = studentEligible ? studentDiscount.percent : 0
  const promoPct = promo?.percent ?? 0
  const discountPct = Math.max(studentPct, promoPct)
  const discountSource = discountPct === 0 ? null : promoPct > studentPct ? `promokod ${promo.code}` : 'tələbə endirimi'
  const discount = (subtotal * discountPct) / 100
  const total = subtotal - discount

  // Rejim dəyişəndə nəfər və saatı yeni rejimin hədlərinə salırıq.
  const switchMode = (next) => {
    const l = calculator[next]
    setPeople((p) => clamp(p, l.people))
    setHours((h) => clamp(Math.round(h / l.hours.step) * l.hours.step, l.hours))
    setMode(next)
  }

  const applyPromo = async (e) => {
    e.preventDefault()
    const code = promoInput.trim().toUpperCase()
    if (!code || promoChecking) return
    setPromoError(null)

    if (!apiEnabled) {
      if (promoCodes[code]) setPromo({ code, percent: promoCodes[code] })
      else setPromoError('Bu promokod tapılmadı.')
      return
    }

    setPromoChecking(true)
    try {
      setPromo(await api('/promo/validate', { method: 'POST', body: { code } }))
    } catch (err) {
      setPromoError(err.message)
    } finally {
      setPromoChecking(false)
    }
  }

  const removePromo = () => {
    setPromo(null)
    setPromoInput('')
    setPromoError(null)
  }

  const hoursHint =
    mode === 'hall' && capped ? (
      <div className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 bg-gradient-to-r from-brand-yellow-soft to-brand-orange-soft border-2 border-dashed border-primary/40">
        <span className="w-11 h-11 shrink-0 rounded-full bg-primary text-white flex items-center justify-center shadow-cta">
          <PiConfettiBold size={22} />
        </span>
        <div className="flex flex-col">
          <span className="font-display font-bold text-[1.05rem] leading-tight">
            Stop çek işə düşdü — qalan vaxt pulsuz!
          </span>
          <span className="text-[0.85rem] font-semibold text-inkdim">
            {hallCapHours} saatdan sonra nə qədər qalsan da, qiymət dəyişməyəcək.
          </span>
        </div>
      </div>
    ) : null

  const roomPeopleHint =
    people <= smallGroup.maxPeople
      ? `${smallGroup.maxPeople} nəfərə qədər: ilk saat ${money(smallGroup.firstHour)}, sonrakı hər saat ${money(smallGroup.nextHour)}.`
      : people <= group.includedPeople
        ? `${smallGroup.maxPeople + 1}–${group.includedPeople} nəfər: saatı ${money(group.perHour)}.`
        : `${group.includedPeople} nəfərdən çox: hər əlavə nəfər üçün saatda +${money(group.extraPerPerson)}. Maksimum ${room.maxPeople} nəfər.`

  return (
    <section id="hesabla" className="bg-card border-y border-ink/10 py-20">
      <div className="max-w-[1120px] mx-auto px-7">
        <Reveal className="max-w-[640px] mb-12">
          <span className="inline-block text-[0.8rem] tracking-wide uppercase text-brand-teal-deep font-bold mb-3 bg-brand-teal-soft px-3 py-1.5 rounded-full">
            Hesablayıcı
          </span>
          <h2 className="font-display font-bold text-[1.9rem] md:text-[2.5rem] mb-3">Nə qədər ödəyəcəksən?</h2>
          <p className="text-inkdim text-[1.03rem]">
            Harada oturacağını, neçə nəfər gəldiyinizi və nə qədər qalacağınızı seç — məbləğ dərhal hesablanır.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] gap-6 md:gap-8 items-start">
          <Reveal direction="left">
            <div className="bg-bg border border-ink/10 rounded-[24px] p-6 sm:p-8 flex flex-col gap-9">
              <div role="radiogroup" aria-label="Harada?" className="grid grid-cols-2 gap-3">
                {MODES.map((m) => {
                  const active = mode === m.id
                  return (
                    <button
                      key={m.id}
                      role="radio"
                      aria-checked={active}
                      onClick={() => switchMode(m.id)}
                      className={`relative flex flex-col items-start gap-1.5 text-left rounded-2xl border-2 p-4 sm:p-5 transition-all ${
                        active
                          ? 'border-primary bg-primary text-white shadow-cta'
                          : 'border-ink/10 bg-card text-inkdim hover:border-ink/25 hover:text-ink'
                      }`}
                    >
                      {active && <PiCheckCircleFill size={22} className="absolute top-3 right-3 text-white" />}
                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 transition-colors ${
                          active ? 'bg-white text-primary' : 'bg-ink/5'
                        }`}
                      >
                        <m.icon size={20} />
                      </span>
                      <span className="font-display font-bold text-[1.1rem]">{m.label}</span>
                      <span className={`text-[0.8rem] font-semibold leading-snug ${active ? 'text-white/90' : 'opacity-80'}`}>
                        {m.note}
                      </span>
                    </button>
                  )
                })}
              </div>

              <RangeControl
                icon={PiUsersThreeBold}
                label="Nəfər sayı"
                value={people}
                valueLabel={`${people} nəfər`}
                min={limits.people.min}
                max={limits.people.max}
                step={1}
                onChange={setPeople}
                ticks={scaleTicks(limits.people.min, limits.people.max)}
                hint={mode === 'room' ? roomPeopleHint : null}
                stepper
              />

              <RangeControl
                icon={PiClockBold}
                label="Vaxt"
                value={hours}
                valueLabel={hoursLabel(hours)}
                min={limits.hours.min}
                max={limits.hours.max}
                step={limits.hours.step}
                onChange={setHours}
                ticks={scaleTicks(limits.hours.min, limits.hours.max)}
                hint={hoursHint}
              />

              {mode === 'hall' && (
                <div className="flex flex-col gap-2.5">
                  <label className="flex items-center gap-3 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={student}
                      onChange={(e) => setStudent(e.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="w-6 h-6 shrink-0 rounded-md border-2 border-ink/25 bg-card flex items-center justify-center text-white transition-colors group-hover:border-primary peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-4 peer-focus-visible:ring-primary/30">
                      {student && <PiCheckBold size={14} />}
                    </span>
                    <span className="flex items-center gap-2 font-semibold">
                      <PiStudentBold size={18} className="text-primary" /> Tələbəyik
                    </span>
                    <span className="ml-auto text-[0.78rem] font-bold px-2.5 py-1 rounded-full bg-brand-orange-soft text-brand-orange-deep">
                      -{studentDiscount.percent}%
                    </span>
                  </label>
                  <p className="text-[0.85rem] text-inkdim pl-9">
                    {student && !studentEligible
                      ? `Endirim ${studentDiscount.minHours} saat və daha çox qalanda keçərlidir — vaxtı artır.`
                      : `${studentDiscount.minHours} saat və daha çox qalanda ${studentDiscount.percent}% endirim. Tələbə bileti tələb olunur.`}
                  </p>
                </div>
              )}

              {hasPromoCodes && (
                <div className="flex flex-col gap-2.5">
                  <span className="flex items-center gap-2 font-semibold">
                    <PiTicketBold size={18} className="text-primary" /> Promokod
                  </span>
                  {promo ? (
                    <div className="flex items-center gap-3 bg-brand-teal-soft text-brand-teal-deep rounded-2xl px-4 py-3">
                      <PiCheckBold size={18} className="shrink-0" />
                      <span className="font-bold">{promo.code}</span>
                      <span className="text-[0.88rem] font-semibold">−{promo.percent}% tətbiq olundu</span>
                      <button
                        onClick={removePromo}
                        aria-label="Promokodu sil"
                        className="ml-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-brand-teal/15"
                      >
                        <PiXBold size={14} />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={applyPromo} className="flex gap-2.5">
                      <input
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value)
                          setPromoError(null)
                        }}
                        placeholder="Kodu yaz"
                        aria-label="Promokod"
                        aria-invalid={Boolean(promoError)}
                        className={`flex-1 min-w-0 bg-card border-2 rounded-full px-5 py-3 font-semibold uppercase placeholder:normal-case placeholder:font-medium placeholder:text-inkdim/60 outline-none transition-colors ${
                          promoError ? 'border-brand-pink' : 'border-ink/15 focus:border-primary'
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={promoChecking}
                        className="disabled:opacity-60 shrink-0 px-6 py-3 rounded-full font-bold text-[0.92rem] border-2 border-ink text-ink hover:bg-ink hover:text-white active:scale-[0.98] transition-all"
                      >
                        {promoChecking ? 'Yoxlanılır...' : 'Tətbiq et'}
                      </button>
                    </form>
                  )}
                  {promoError && (
                    <p className="text-[0.85rem] font-semibold text-brand-pink-deep pl-1">{promoError}</p>
                  )}
                </div>
              )}
            </div>
          </Reveal>

          <Reveal direction="right" delay={100} className="md:sticky md:top-24">
            <div className="relative overflow-hidden bg-ink text-white rounded-[24px] p-7 sm:p-8">
              <div className="absolute w-[220px] h-[220px] bg-primary/25 rounded-full blur-3xl -top-20 -right-16 pointer-events-none" />
              <div className="relative">
                <div className="text-[0.8rem] tracking-wide uppercase font-bold text-white/60 mb-2">Cəmi ödəniş</div>
                <div className="flex items-end gap-3 flex-wrap mb-1">
                  <span className="font-display font-bold text-[3rem] leading-none">{money(total)}</span>
                  {discount > 0 && (
                    <span className="text-white/50 line-through font-semibold text-[1.1rem] mb-1">{money(subtotal)}</span>
                  )}
                </div>
                <div className="text-[0.88rem] text-white/70 font-semibold mb-7">
                  {MODES.find((m) => m.id === mode).label} · {people} nəfər · {hoursLabel(hours)}
                </div>

                <dl className="flex flex-col gap-3 text-[0.92rem] border-t border-white/15 pt-5 mb-7">
                  {rows.map((r) => (
                    <Row key={r.label} {...r} />
                  ))}
                  {discount > 0 && (
                    <Row label={`Endirim (${discountSource}, ${discountPct}%)`} value={`−${money(discount)}`} accent />
                  )}
                </dl>

                <a
                  href={business.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold text-[0.95rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover active:translate-y-0 transition-all"
                >
                  <PiInstagramLogoBold size={18} /> DM-dən yer saxla
                </a>
                <p className="text-[0.78rem] text-white/50 text-center mt-3">
                  Təxmini hesablamadır — son məbləğ kassada dəqiqləşir.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function RangeControl({ icon: Icon, label, value, valueLabel, min, max, step, onChange, ticks, hint, stepper }) {
  const fill = ((value - min) / (max - min)) * 100
  const bounds = { min, max }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-semibold">
          <Icon size={18} className="text-primary" /> {label}
        </span>
        <div className="flex items-center gap-2">
          {stepper && (
            <StepButton onClick={() => onChange(clamp(value - step, bounds))} disabled={value <= min} label={`${label}: azalt`}>
              <PiMinusBold size={14} />
            </StepButton>
          )}
          <span className="font-display font-bold text-[1.25rem] min-w-[5.5rem] text-center">{valueLabel}</span>
          {stepper && (
            <StepButton onClick={() => onChange(clamp(value + step, bounds))} disabled={value >= max} label={`${label}: artır`}>
              <PiPlusBold size={14} />
            </StepButton>
          )}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={valueLabel}
        className="range"
        style={{ '--fill': `${fill}%` }}
      />

      {/* Rəqəmlər slayder düyməsinin mərkəzi ilə üst-üstə düşür (düymə 28px → kənarlardan 14px) */}
      <div className="relative h-4 text-[0.75rem] font-semibold text-inkdim/70">
        {ticks.map(({ value: t, minor }) => (
          <span
            key={t}
            className={`absolute -translate-x-1/2 ${minor ? 'hidden sm:block' : ''} ${t === value ? 'text-primary font-bold' : ''}`}
            style={{ left: `calc(14px + (100% - 28px) * ${(t - min) / (max - min)})` }}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Mətn ipucu sadə qutuda, hazır element (məs. stop çek kartı) olduğu kimi göstərilir */}
      {typeof hint === 'string' ? (
        <p className="text-[0.85rem] font-semibold text-brand-teal-deep bg-brand-teal-soft rounded-xl px-3.5 py-2.5">
          {hint}
        </p>
      ) : (
        hint
      )}
    </div>
  )
}

function StepButton({ onClick, disabled, label, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-8 h-8 rounded-full border-2 border-ink/15 bg-card flex items-center justify-center hover:border-primary hover:text-primary disabled:opacity-40 disabled:pointer-events-none transition-colors"
    >
      {children}
    </button>
  )
}

function Row({ label, value, note, accent }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-white/70">
        {label}
        {note && <span className="ml-2 text-[0.72rem] uppercase tracking-wide font-bold text-brand-yellow">{note}</span>}
      </dt>
      <dd className={`font-bold ${accent ? 'text-brand-yellow' : ''}`}>{value}</dd>
    </div>
  )
}

function range(from, to, step) {
  const out = []
  for (let v = from; v <= to; v += step) out.push(v)
  return out
}

// Şkala rəqəmləri: hər tam ədəd. Uzun şkalada (məs. 1–20) telefonda yalnız 5-dən bir görünür ki, sıxlaşmasın.
function scaleTicks(min, max) {
  const long = max - min > 11
  return range(min, max, 1).map((value) => ({
    value,
    minor: long && value !== min && value % 5 !== 0,
  }))
}
