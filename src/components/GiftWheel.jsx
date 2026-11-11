import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PiGiftBold, PiXBold, PiSpinnerBold, PiUserPlusBold, PiConfettiBold, PiClockBold } from 'react-icons/pi'
import { api, apiEnabled } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useI18n } from '../i18n/index.jsx'

// Hədiyyə çarxı: sol aşağıda fırlanan düymə → pəncərə açılır → qeydiyyatlı istifadəçi
// admin paneldə təyin olunan müddətdə (standart — həftədə) bir dəfə fırladır.
// Hədiyyəni server seçir; çarx yalnız nəticəyə qədər fırlanmanı göstərir.

const COLORS = [
  ['fill-brand-pink', 'fill-white'],
  ['fill-brand-yellow', 'fill-ink'],
  ['fill-brand-teal', 'fill-white'],
  ['fill-brand-purple', 'fill-white'],
  ['fill-brand-orange', 'fill-white'],
  ['fill-brand-cyan', 'fill-ink'],
]
const C = 170 // mərkəz
const R = 150 // radius
const HUB = 46 // ortadakı dairə
const IDLE_SPEED = 360 / 26000 // dərəcə/ms — gözləyərkən sakit fırlanma
const FAST_SPEED = 360 / 700 // server cavab verənə qədər sürətli fırlanma
const SPIN_MS = 4200

const point = (deg, r) => {
  const rad = (deg * Math.PI) / 180
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)]
}

function slicePath(i, n) {
  const step = 360 / n
  const [x1, y1] = point(i * step, R)
  const [x2, y2] = point((i + 1) * step, R)
  return `M${C},${C} L${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`
}

// Uzun adı iki sətrə bölür (ortaya ən yaxın boşluqdan)
function lines(label) {
  if (label.length <= 11 || !label.includes(' ')) return [label]
  const middle = label.length / 2
  let best = -1
  for (let i = 0; i < label.length; i++) if (label[i] === ' ' && (best < 0 || Math.abs(i - middle) < Math.abs(best - middle))) best = i
  return [label.slice(0, best), label.slice(best + 1)]
}

const easeOut = (t) => 1 - Math.pow(1 - t, 4)
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Çarxın şəkli. spinTo(index) — həmin dilim göstəricinin (yuxarı) altında dayanana qədər fırladır.
function Wheel({ labels, mode, target, onStopped }) {
  const groupRef = useRef(null)
  const angle = useRef(0)
  const n = labels.length
  const step = 360 / n

  const draw = () => groupRef.current?.setAttribute('transform', `rotate(${angle.current % 360} ${C} ${C})`)

  // idle — sakit, fast — server cavabını gözləyərkən sürətli fırlanma
  useEffect(() => {
    if (mode !== 'idle' && mode !== 'fast') return
    const still = reducedMotion()
    let last = performance.now()
    let frame
    const tick = (now) => {
      if (!still || mode === 'fast') {
        angle.current += (now - last) * (mode === 'fast' ? FAST_SPEED : IDLE_SPEED)
        draw()
      }
      last = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [mode])

  // Nəticə gəldi: seçilmiş dilimin ortası yuxarıya gəlsin, bir az sağa-sola sürüşsün, 5 dövrə əlavə
  useEffect(() => {
    if (mode !== 'landing' || target == null) return
    const center = target * step + step / 2
    const jitter = (Math.random() - 0.5) * step * 0.6
    const start = angle.current
    const end = ((((-center + jitter - start) % 360) + 360) % 360) + start + 360 * 5
    if (reducedMotion()) {
      angle.current = end
      draw()
      onStopped()
      return
    }
    let frame
    const began = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - began) / SPIN_MS)
      angle.current = start + (end - start) * easeOut(p)
      draw()
      if (p < 1) frame = requestAnimationFrame(tick)
      else onStopped()
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, target])

  return (
    <svg viewBox="0 0 340 340" aria-hidden="true" className="w-full h-full drop-shadow-soft select-none">
      <g ref={groupRef}>
        <circle cx={C} cy={C} r={R + 4} className="fill-ink" />
        {labels.map((label, i) => (
          <path key={i} d={slicePath(i, n)} className={COLORS[i % COLORS.length][0]} stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
        ))}
        {labels.map((label, i) => {
          // Yazı radius boyunca, mərkəzdən kənara doğru oxunur
          const rows = lines(label)
          const longest = Math.max(...rows.map((r) => r.length))
          const size = Math.min(16, Math.floor(88 / (longest * 0.6)), n > 8 ? 12 : 16)
          const mid = (R + HUB) / 2 + 4
          return (
            <g key={i} transform={`rotate(${i * step + step / 2} ${C} ${C})`}>
              <text
                x={C}
                y={C - mid}
                transform={`rotate(-90 ${C} ${C - mid})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="700"
                fontSize={size}
                className={`font-display ${COLORS[i % COLORS.length][1]}`}
              >
                {rows.map((row, r) => (
                  <tspan key={r} x={C} dy={rows.length === 1 ? 0 : r === 0 ? -size * 0.55 : size * 1.1}>
                    {row}
                  </tspan>
                ))}
              </text>
            </g>
          )
        })}
      </g>
      <circle cx={C} cy={C} r={HUB} className="fill-ink" stroke="white" strokeWidth="4" />
      <text x={C} y={C + 1} textAnchor="middle" dominantBaseline="middle" fontSize="30">
        🎁
      </text>
      {/* Göstərici: yuxarıdakı dilim qazanılandır */}
      <polygon points="152,0 188,0 170,30" className="fill-ink" stroke="white" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  )
}

// Gözləmə müddəti: "3 gün 4 saat" / "5 saat 20 dəq"
function waitText(until, t) {
  const ms = Math.max(0, new Date(until).getTime() - Date.now())
  const minutes = Math.ceil(ms / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  if (days) return t('wheel.waitDays', { days, hours })
  if (hours) return t('wheel.waitHours', { hours, minutes: minutes % 60 })
  return t('wheel.waitMinutes', { minutes })
}

// null — yüklənir; { failed: true } — server cavab vermədi; yoxsa { enabled, periodDays, prizes, me }
function useWheelState(token) {
  const [state, setState] = useState(null)
  const reload = useCallback(
    () =>
      api('/wheel', { token })
        .then(setState)
        // Əvvəl yüklənibsə, köhnə məlumat qalır
        .catch(() => setState((s) => (s?.prizes ? s : { failed: true }))),
    [token],
  )
  useEffect(() => {
    if (apiEnabled) reload()
  }, [reload])
  return [state, setState, reload]
}

export default function GiftWheel() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const { token } = useAuth()
  const [state, setState, reload] = useWheelState(token)
  const [open, setOpen] = useState(false)
  const [raised, setRaised] = useState(false) // telefonda hesablayıcının aşağı zolağı açıqdır

  useEffect(() => {
    const onBar = (e) => setRaised(Boolean(e.detail))
    window.addEventListener('dirdir:bottom-bar', onBar)
    return () => window.removeEventListener('dirdir:bottom-bar', onBar)
  }, [])

  // Düymə dərhal görünür — serverin cavabını gözləmir (Render-in pulsuz serveri yatıbsa, cavab ~30–60 san. çəkir).
  // Yalnız admin çarxı söndürübsə gizlənir. Admin paneldə göstərilmir.
  if (!apiEnabled || pathname.startsWith('/admin') || state?.enabled === false) return null

  return (
    <>
      <div
        className={`fixed left-4 sm:left-6 z-40 flex items-center gap-2.5 transition-[bottom] duration-300 ${
          raised ? 'bottom-24 md:bottom-6' : 'bottom-4 sm:bottom-6'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('wheel.open')}
          className="gift-float relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        >
          <MiniWheel className="gift-float-wheel absolute inset-1.5" />
          <span className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-ink flex items-center justify-center border-2 border-white">
            <PiGiftBold size={16} />
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          tabIndex={-1}
          aria-hidden="true"
          className="gift-label bg-card text-ink border border-ink/10 shadow-lift rounded-2xl rounded-bl-md px-3 py-2 text-left font-display font-bold text-[0.82rem] sm:text-[0.9rem] leading-tight hover:border-primary"
        >
          {t('wheel.label')}
        </button>
      </div>
      {open &&
        (state?.prizes ? (
          <WheelModal state={state} setState={setState} reload={reload} onClose={() => setOpen(false)} />
        ) : (
          <WheelLoading
            failed={state?.failed}
            onRetry={() => {
              setState(null)
              reload()
            }}
            onClose={() => setOpen(false)}
          />
        ))}
    </>
  )
}

// Server hələ cavab verməyib (yatmış serverin oyanması ~30–60 san.) və ya cavab gəlmədi
function WheelLoading({ failed, onRetry, onClose }) {
  const { t } = useI18n()
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-night/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('wheel.title')}
        className="gift-modal relative w-full sm:max-w-[440px] bg-card text-ink rounded-t-[28px] sm:rounded-[28px] shadow-lift px-6 py-10 text-center"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('wheel.close')}
          className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-inkdim hover:bg-ink/5"
        >
          <PiXBold size={16} />
        </button>
        <MiniWheel className={`w-24 h-24 mx-auto mb-4 ${failed ? '' : 'animate-spin'}`} />
        <p className="font-display font-bold text-[1.2rem] mb-1">{t('wheel.title')}</p>
        {failed ? (
          <>
            <p className="text-inkdim text-[0.9rem] mb-4">{t('wheel.failed')}</p>
            <button type="button" onClick={onRetry} className="px-6 py-3 rounded-full font-bold bg-primary text-white">
              {t('wheel.retry')}
            </button>
          </>
        ) : (
          <p className="text-inkdim text-[0.9rem]">{t('wheel.loading')}</p>
        )}
      </div>
    </div>
  )
}

// Düymədəki kiçik rəngli çarx
function MiniWheel({ className }) {
  return (
    <svg viewBox="0 0 340 340" aria-hidden="true" className={className}>
      {COLORS.map(([fill], i) => (
        <path key={i} d={slicePath(i, COLORS.length)} className={fill} />
      ))}
    </svg>
  )
}

function WheelModal({ state, setState, reload, onClose }) {
  const { t, pick } = useI18n()
  const { user, token } = useAuth()
  const { pathname } = useLocation()
  const closeRef = useRef(null)
  const [mode, setMode] = useState('idle') // idle | fast | landing | done
  const [target, setTarget] = useState(null)
  const [won, setWon] = useState(null) // qazanılan hədiyyə { az, en, ru }
  const [error, setError] = useState(null)
  const [needAccount, setNeedAccount] = useState(false)

  // Esc ilə bağlanır, açıq olanda səhifə sürüşmür; fırlanarkən bağlamaq olmur
  const busy = mode === 'fast' || mode === 'landing'
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [busy, onClose])

  const me = state.me
  const waiting = me?.nextSpinAt && new Date(me.nextSpinAt) > new Date()
  // İstifadə olunmamış hədiyyəsi var — ondan istifadə edənə qədər yenisini qazana bilməz
  const hasGift = Boolean(me?.openGift) && mode !== 'done' && !waiting
  const labels = state.prizes.map((p) => pick(p.label))
  const period = state.periodDays === 7 ? t('wheel.weekly') : t('wheel.everyDays', { days: state.periodDays })

  const spin = async () => {
    if (busy) return
    setError(null)
    if (!user) return setNeedAccount(true)
    setMode('fast')
    try {
      const res = await api('/wheel/spin', { method: 'POST', token })
      setState((s) => ({
        ...s,
        prizes: res.prizes,
        me: { nextSpinAt: res.nextSpinAt, openGift: true, spins: [res.spin, ...(s.me?.spins ?? [])] },
      }))
      setWon(res.spin.prize)
      setTarget(res.index)
      setMode('landing')
    } catch (err) {
      setMode('idle')
      if (err.code === 'WHEEL_WAIT' || err.code === 'WHEEL_HAS_GIFT') reload()
      else setError(err)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-night/70 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gift-wheel-title"
        className="gift-modal relative w-full sm:max-w-[440px] max-h-[100dvh] overflow-y-auto bg-card text-ink rounded-t-[28px] sm:rounded-[28px] shadow-lift px-5 pt-5 pb-6 sm:p-7"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label={t('wheel.close')}
          className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-inkdim hover:bg-ink/5 disabled:opacity-40"
        >
          <PiXBold size={16} />
        </button>

        <div className="text-center mb-4 pr-6 pl-6">
          <h2 id="gift-wheel-title" className="font-display font-bold text-[1.45rem] sm:text-[1.6rem] leading-tight">
            {t('wheel.title')}
          </h2>
          <p className="text-[0.9rem] text-inkdim mt-1">{t('wheel.subtitle', { period })}</p>
        </div>

        <button
          type="button"
          onClick={spin}
          disabled={busy || waiting || hasGift || mode === 'done'}
          aria-label={t('wheel.spin')}
          className="block mx-auto w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] rounded-full outline-none focus-visible:ring-4 focus-visible:ring-primary/30 enabled:cursor-pointer enabled:hover:scale-[1.02] transition-transform"
        >
          <Wheel labels={labels} mode={mode === 'done' ? 'stopped' : mode} target={target} onStopped={() => setMode('done')} />
        </button>

        <div aria-live="polite" className="mt-5">
          {mode === 'done' && won ? (
            <div className="wheel-prize text-center bg-brand-orange-soft rounded-2xl p-4">
              <PiConfettiBold size={30} className="mx-auto text-primary mb-1" />
              <p className="font-display font-bold text-[1.25rem] leading-tight">{t('wheel.won', { prize: pick(won) })}</p>
              <p className="text-[0.88rem] text-inkdim mt-1.5">
                {t('wheel.claim', { code: user.customerCode })} {state.validDays ? t('wheel.validFor', { days: state.validDays }) : ''}
              </p>
              <Link
                to="/hesabim"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 mt-3 px-5 py-2.5 rounded-full font-bold text-[0.88rem] bg-primary text-white"
              >
                <PiGiftBold size={16} /> {t('wheel.myPrizes')}
              </Link>
            </div>
          ) : needAccount ? (
            <div className="wheel-prize text-center">
              <p className="font-bold mb-3">{t('wheel.needAccount')}</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  to={`/qeydiyyat?next=${encodeURIComponent(pathname)}`}
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full font-bold text-[0.9rem] bg-primary text-white"
                >
                  <PiUserPlusBold size={17} /> {t('wheel.register')}
                </Link>
                <Link
                  to={`/giris?next=${encodeURIComponent(pathname)}`}
                  onClick={onClose}
                  className="inline-flex items-center justify-center px-5 py-3 rounded-full font-bold text-[0.9rem] border-2 border-ink/15 hover:border-ink"
                >
                  {t('wheel.login')}
                </Link>
              </div>
            </div>
          ) : hasGift ? (
            <div className="text-center">
              <p className="font-bold text-inkdim">{t('wheel.hasGift')}</p>
              <Link
                to="/hesabim"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 mt-3 px-5 py-2.5 rounded-full font-bold text-[0.88rem] bg-primary text-white"
              >
                <PiGiftBold size={16} /> {t('wheel.myPrizes')}
              </Link>
            </div>
          ) : waiting ? (
            <div className="text-center">
              <p className="inline-flex items-center gap-1.5 font-bold text-inkdim">
                <PiClockBold size={18} /> {t('wheel.nextIn', { time: waitText(me.nextSpinAt, t) })}
              </p>
              {me.spins[0] && (
                <p className="text-[0.88rem] text-inkdim mt-1.5">{t('wheel.lastPrize', { prize: pick(me.spins[0].prize) })}</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <button
                type="button"
                onClick={spin}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-[1rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 transition-all disabled:opacity-70"
              >
                {busy ? <PiSpinnerBold size={18} className="animate-spin" /> : <PiGiftBold size={18} />}
                {busy ? t('wheel.spinning') : t('wheel.spin')}
              </button>
              {!user && <p className="text-[0.8rem] text-inkdim mt-2">{t('wheel.onlyMembers')}</p>}
              {error && <p className="text-[0.85rem] font-semibold text-brand-pink-deep mt-2">{error.message}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
