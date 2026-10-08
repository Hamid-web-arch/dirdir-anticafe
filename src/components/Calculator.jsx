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
  PiWhatsappLogoBold,
  PiArmchairBold,
  PiFilmSlateBold,
  PiCheckCircleFill,
  PiConfettiBold,
} from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { business, whatsappUrl } from '../data/business.js'
import { api, apiEnabled } from '../lib/api.js'
import { useI18n } from '../i18n/index.jsx'
import { usePricing } from '../pricing/PricingContext.jsx'

const { currency, promoCodes } = business
// Backend qoşulubsa kodları server yoxlayır; yoxsa business.js-dəki siyahı (boşdursa sahə gizlənir).
const hasPromoCodes = apiEnabled || Object.keys(promoCodes).length > 0

// Zalda bu saatdan sonra stop çek işə düşür (4 + 3 + 3 + 3 = 13 → 4 saat); yarım saata yuxarı yuvarlanır.
const capHours = (hall) => Math.ceil((1 + (hall.cap - hall.firstHour) / hall.nextHour) * 2) / 2

// Slayder hədləri: kino otağında nəfər həddi qiymətlərdəki otaq tutumudur.
const limitsFor = (mode, pricing) =>
  mode === 'room'
    ? { ...business.calculator.room, people: { ...business.calculator.room.people, max: pricing.room.maxPeople } }
    : business.calculator.hall

const clamp = (v, { min, max }) => Math.min(max, Math.max(min, v))

// Hər rejim üçün məbləği və hesab sətirlərini qaytarır. f — dilə görə formatlayıcılar.
function quote(pricing, mode, people, hours, f) {
  const { t, money, hoursText } = f
  const { hall, room } = pricing
  const { smallGroup, group } = room
  if (mode === 'room') {
    if (people <= smallGroup.maxPeople) {
      const extraHours = hours - 1
      const rows = [{ label: t('calc.rowFirstHourSmall', { small: smallGroup.maxPeople }), value: money(smallGroup.firstHour) }]
      if (extraHours > 0) {
        rows.push({
          label: t('calc.rowNextHours', { hours: hoursText(extraHours), price: money(smallGroup.nextHour) }),
          value: money(extraHours * smallGroup.nextHour),
        })
      }
      return { subtotal: smallGroup.firstHour + extraHours * smallGroup.nextHour, rows }
    }
    const roomCost = group.perHour * hours
    const extraPeople = Math.max(0, people - group.includedPeople)
    const extraCost = extraPeople * group.extraPerPerson * hours
    const rows = [{ label: t('calc.rowRoom', { hours: hoursText(hours), price: money(group.perHour) }), value: money(roomCost) }]
    if (extraPeople > 0) {
      rows.push({
        label: t('calc.rowExtraPeople', { count: extraPeople, price: money(group.extraPerPerson), hours: hoursText(hours) }),
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
      { label: t('calc.rowPerPerson'), value: money(perPerson), note: raw > hall.cap ? t('calc.capNote') : null },
      {
        label: t('calc.rowPeopleTimes', { people: t('units.people', { count: people }), price: money(perPerson) }),
        value: money(people * perPerson),
      },
    ],
  }
}

export default function Calculator() {
  const { t, number, errorText } = useI18n()
  const pricing = usePricing()
  const { hall, room, studentDiscount } = pricing
  const { smallGroup, group } = room
  const money = (n) => `${number(n, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${currency}`
  const hoursText = (h) => t('units.hours', { count: h })

  const [mode, setMode] = useState('hall')
  const [chosenPeople, setPeople] = useState(2)
  const [hours, setHours] = useState(2)
  const [student, setStudent] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState(null) // { code, percent }
  const [promoError, setPromoError] = useState(null) // xəta obyekti — dil dəyişəndə mətni də dəyişir
  const [promoChecking, setPromoChecking] = useState(false)

  const limits = limitsFor(mode, pricing)
  // Admin otağın tutumunu azaldıbsa, seçilmiş nəfər sayı yeni həddi keçməsin.
  const people = clamp(chosenPeople, limits.people)
  const { subtotal, rows, capped } = quote(pricing, mode, people, hours, { t, money, hoursText })

  const studentEligible = mode === 'hall' && student && hours >= studentDiscount.minHours
  const studentPct = studentEligible ? studentDiscount.percent : 0
  const promoPct = promo?.percent ?? 0
  const discountPct = Math.max(studentPct, promoPct)
  const discountSource =
    discountPct === 0
      ? null
      : promoPct > studentPct
        ? t('calc.discountPromo', { code: promo.code })
        : t('calc.discountStudent')
  const discount = (subtotal * discountPct) / 100
  const total = subtotal - discount

  // WhatsApp-a hesablama ilə hazır mesaj (əməkdaş üçün həmişə azərbaycanca)
  const reserveLink = whatsappUrl(
    `Salam! Rezerv etmək istəyirəm: ${mode === 'room' ? 'kino otağı' : 'ümumi zal'}, ${people} nəfər, ${hours} saat.` +
      (promo && promoPct > studentPct ? ` Promokod: ${promo.code}.` : studentPct ? ' Tələbəyəm.' : '') +
      ` Hesablayıcıda təxmini məbləğ: ${Math.round(total * 100) / 100}${currency}.`,
  )

  const modes = [
    {
      id: 'hall',
      label: t('calc.modeHall'),
      icon: PiArmchairBold,
      note: t('calc.modeHallNote', { first: money(hall.firstHour), next: money(hall.nextHour) }),
    },
    {
      id: 'room',
      label: t('calc.modeRoom'),
      icon: PiFilmSlateBold,
      note: t('calc.modeRoomNote', { small: smallGroup.maxPeople, price: money(smallGroup.firstHour), max: room.maxPeople }),
    },
  ]

  // Rejim dəyişəndə nəfər və saatı yeni rejimin hədlərinə salırıq.
  const switchMode = (next) => {
    const l = limitsFor(next, pricing)
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
      else setPromoError({ code: 'PROMO_NOT_FOUND' })
      return
    }

    setPromoChecking(true)
    try {
      setPromo(await api('/promo/validate', { method: 'POST', body: { code } }))
    } catch (err) {
      setPromoError(err)
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
          <span className="font-display font-bold text-[1.05rem] leading-tight">{t('calc.capTitle')}</span>
          <span className="text-[0.85rem] font-semibold text-inkdim">{t('calc.capText', { hours: capHours(hall) })}</span>
        </div>
      </div>
    ) : null

  const roomPeopleHint =
    people <= smallGroup.maxPeople
      ? t('calc.roomSmall', { small: smallGroup.maxPeople, first: money(smallGroup.firstHour), next: money(smallGroup.nextHour) })
      : people <= group.includedPeople
        ? t('calc.roomGroup', { from: smallGroup.maxPeople + 1, to: group.includedPeople, price: money(group.perHour) })
        : t('calc.roomExtra', { included: group.includedPeople, extra: money(group.extraPerPerson), max: room.maxPeople })

  return (
    <section id="hesabla" className="bg-card border-y border-ink/10 py-20">
      <div className="max-w-[1120px] mx-auto px-7">
        <Reveal className="max-w-[640px] mb-12">
          <span className="inline-block text-[0.8rem] tracking-wide uppercase text-brand-teal-deep font-bold mb-3 bg-brand-teal-soft px-3 py-1.5 rounded-full">
            {t('calc.chip')}
          </span>
          <h2 className="font-display font-bold text-[1.9rem] md:text-[2.5rem] mb-3">{t('calc.title')}</h2>
          <p className="text-inkdim text-[1.03rem]">{t('calc.intro')}</p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] gap-6 md:gap-8 items-start">
          <Reveal direction="left">
            <div className="bg-bg border border-ink/10 rounded-[24px] p-6 sm:p-8 flex flex-col gap-9">
              <div role="radiogroup" aria-label={t('calc.where')} className="grid grid-cols-2 gap-3">
                {modes.map((m) => {
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
                label={t('calc.people')}
                value={people}
                valueLabel={t('units.people', { count: people })}
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
                label={t('calc.time')}
                value={hours}
                valueLabel={hoursText(hours)}
                min={limits.hours.min}
                max={limits.hours.max}
                step={limits.hours.step}
                onChange={setHours}
                ticks={scaleTicks(limits.hours.min, limits.hours.max)}
                hint={hoursHint}
              />

              {mode === 'hall' && studentDiscount.percent > 0 && (
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
                      <PiStudentBold size={18} className="text-primary" /> {t('calc.student')}
                    </span>
                    <span className="ml-auto text-[0.78rem] font-bold px-2.5 py-1 rounded-full bg-brand-orange-soft text-brand-orange-deep">
                      -{studentDiscount.percent}%
                    </span>
                  </label>
                  <p className="text-[0.85rem] text-inkdim pl-9">
                    {student && !studentEligible
                      ? t('calc.studentTooShort', { hours: studentDiscount.minHours })
                      : t('calc.studentHint', { hours: studentDiscount.minHours, percent: studentDiscount.percent })}
                  </p>
                </div>
              )}

              {hasPromoCodes && (
                <div className="flex flex-col gap-2.5">
                  <span className="flex items-center gap-2 font-semibold">
                    <PiTicketBold size={18} className="text-primary" /> {t('calc.promo')}
                  </span>
                  {promo ? (
                    <div className="flex items-center gap-3 bg-brand-teal-soft text-brand-teal-deep rounded-2xl px-4 py-3">
                      <PiCheckBold size={18} className="shrink-0" />
                      <span className="font-bold">{promo.code}</span>
                      <span className="text-[0.88rem] font-semibold">{t('calc.promoApplied', { percent: promo.percent })}</span>
                      <button
                        onClick={removePromo}
                        aria-label={t('calc.promoRemove')}
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
                        placeholder={t('calc.promoPlaceholder')}
                        aria-label={t('calc.promo')}
                        aria-invalid={Boolean(promoError)}
                        className={`flex-1 min-w-0 bg-card border-2 rounded-full px-5 py-3 font-semibold uppercase placeholder:normal-case placeholder:font-medium placeholder:text-inkdim/60 outline-none transition-colors ${
                          promoError ? 'border-brand-pink' : 'border-ink/15 focus:border-primary'
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={promoChecking}
                        className="disabled:opacity-60 shrink-0 px-6 py-3 rounded-full font-bold text-[0.92rem] border-2 border-ink text-ink hover:bg-ink hover:text-bg active:scale-[0.98] transition-all"
                      >
                        {promoChecking ? t('calc.promoChecking') : t('calc.promoApply')}
                      </button>
                    </form>
                  )}
                  {promoError && (
                    <p className="text-[0.85rem] font-semibold text-brand-pink-deep pl-1">{errorText(promoError)}</p>
                  )}
                </div>
              )}
            </div>
          </Reveal>

          <Reveal direction="right" delay={100} className="md:sticky md:top-24">
            <div className="relative overflow-hidden bg-night text-white rounded-[24px] p-7 sm:p-8">
              <div className="absolute w-[220px] h-[220px] bg-primary/25 rounded-full blur-3xl -top-20 -right-16 pointer-events-none" />
              <div className="relative">
                <div className="text-[0.8rem] tracking-wide uppercase font-bold text-white/60 mb-2">{t('calc.total')}</div>
                <div className="flex items-end gap-3 flex-wrap mb-1">
                  <span className="font-display font-bold text-[3rem] leading-none">{money(total)}</span>
                  {discount > 0 && (
                    <span className="text-white/50 line-through font-semibold text-[1.1rem] mb-1">{money(subtotal)}</span>
                  )}
                </div>
                <div className="text-[0.88rem] text-white/70 font-semibold mb-7">
                  {modes.find((m) => m.id === mode).label} · {t('units.people', { count: people })} · {hoursText(hours)}
                </div>

                <dl className="flex flex-col gap-3 text-[0.92rem] border-t border-white/15 pt-5 mb-7">
                  {rows.map((r) => (
                    <Row key={r.label} {...r} />
                  ))}
                  {discount > 0 && (
                    <Row
                      label={t('calc.discount', { source: discountSource, percent: discountPct })}
                      value={`−${money(discount)}`}
                      accent
                    />
                  )}
                </dl>

                <a
                  href={reserveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold text-[0.95rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover active:translate-y-0 transition-all"
                >
                  <PiWhatsappLogoBold size={18} /> {t('calc.reserve')}
                </a>
                <p className="text-[0.78rem] text-white/50 text-center mt-3">{t('calc.disclaimer')}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function RangeControl({ icon: Icon, label, value, valueLabel, min, max, step, onChange, ticks, hint, stepper }) {
  const { t } = useI18n()
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
            <StepButton onClick={() => onChange(clamp(value - step, bounds))} disabled={value <= min} label={t('calc.decrease', { label })}>
              <PiMinusBold size={14} />
            </StepButton>
          )}
          <span className="font-display font-bold text-[1.25rem] min-w-[5.5rem] text-center">{valueLabel}</span>
          {stepper && (
            <StepButton onClick={() => onChange(clamp(value + step, bounds))} disabled={value >= max} label={t('calc.increase', { label })}>
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
        {ticks.map(({ value: tick, minor }) => (
          <span
            key={tick}
            className={`absolute -translate-x-1/2 ${minor ? 'hidden sm:block' : ''} ${tick === value ? 'text-primary font-bold' : ''}`}
            style={{ left: `calc(14px + (100% - 28px) * ${(tick - min) / (max - min)})` }}
          >
            {tick}
          </span>
        ))}
      </div>

      {/* Mətn ipucu sadə qutuda, hazır element (məs. stop çek kartı) olduğu kimi göstərilir */}
      {typeof hint === 'string' ? (
        <p className="text-[0.85rem] font-semibold text-brand-teal-deep bg-brand-teal-soft rounded-xl px-3.5 py-2.5">{hint}</p>
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
