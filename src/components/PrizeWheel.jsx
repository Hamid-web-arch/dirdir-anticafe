import { useCallback, useEffect, useRef, useState } from 'react'
import { PiWhatsappLogoBold, PiXBold, PiArrowClockwiseBold } from 'react-icons/pi'
import { reserveUrl } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'

// Çarxın dilimləri: yuxarıdan saat əqrəbi istiqamətində, hər biri 60°.
// Basanda çarx sürətlə fırlanır, yavaşlayıb dayanır; göstəricinin (yuxarı) altında qalan dilimə uyğun mesaj çıxır.
const SLICES = [
  { key: 'tea', fill: 'fill-brand-pink', text: 'fill-white', size: 22 },
  { key: 'coffee', fill: 'fill-brand-yellow', text: 'fill-ink', size: 20 },
  { key: 'cinema', fill: 'fill-brand-teal', text: 'fill-white', size: 19 },
  { key: 'games', fill: 'fill-brand-purple', text: 'fill-white', size: 19 },
  { key: 'sweets', fill: 'fill-brand-orange', text: 'fill-white', size: 18 },
  { key: 'drinks', fill: 'fill-brand-cyan', text: 'fill-ink', size: 15 },
]
const C = 170 // mərkəz
const R = 150 // radius
const IDLE_SPEED = 360 / 26000 // dərəcə/ms — sakit fırlanma (26 saniyəyə bir dövrə)
const SPIN_MS = 4200

// Çarxdakı söz uzundursa (məs. "СЛАДОСТИ"), şrift kiçilir ki, dilimə sığsın.
const fit = (label, base, room = 100) => Math.min(base, Math.floor(room / (label.length * 0.62)))

// Yuxarıdan saat əqrəbi ilə `deg` dərəcədə, mərkəzdən `r` məsafədə nöqtə
const point = (deg, r) => {
  const rad = (deg * Math.PI) / 180
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)]
}

const slicePath = (i) => {
  const [x1, y1] = point(i * 60, R)
  const [x2, y2] = point((i + 1) * 60, R)
  return `M${C},${C} L${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`
}

// Yavaşlayaraq dayanma
const easeOut = (t) => 1 - Math.pow(1 - t, 4)

export default function PrizeWheel({ price }) {
  const { t } = useI18n()
  const groupRef = useRef(null)
  const angle = useRef(0)
  const mode = useRef('idle') // idle | spinning | stopped
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null) // dilimin açarı

  const draw = () => groupRef.current?.setAttribute('transform', `rotate(${angle.current % 360} ${C} ${C})`)

  // Sakit fırlanma (hərəkəti azaldılmış cihazlarda yox)
  useEffect(() => {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let last = performance.now()
    let frame
    const tick = (now) => {
      if (mode.current === 'idle' && !still) {
        angle.current += (now - last) * IDLE_SPEED
        draw()
      }
      last = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const spin = useCallback(() => {
    if (mode.current === 'spinning') return
    setResult(null)
    // Təsadüfi dilim: onun ortası yuxarıya (göstəricinin altına) gəlsin, bir az da sağa-sola sürüşsün
    const index = Math.floor(Math.random() * SLICES.length)
    const center = index * 60 + 30
    const jitter = Math.random() * 36 - 18
    const start = angle.current
    const target = ((((-center + jitter - start) % 360) + 360) % 360) + start + 360 * 6

    const finish = () => {
      angle.current = target
      draw()
      mode.current = 'stopped'
      setSpinning(false)
      setResult(SLICES[index].key)
    }

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return finish()

    mode.current = 'spinning'
    setSpinning(true)
    const began = performance.now()
    const step = (now) => {
      const p = Math.min(1, (now - began) / SPIN_MS)
      angle.current = start + (target - start) * easeOut(p)
      draw()
      if (p < 1) requestAnimationFrame(step)
      else finish()
    }
    requestAnimationFrame(step)
  }, [])

  const close = () => {
    setResult(null)
    mode.current = 'idle'
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 340 340"
        role="button"
        tabIndex={0}
        aria-label={t('hero.wheelSpin')}
        onClick={spin}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            spin()
          }
        }}
        className={`drop-shadow-soft w-[230px] h-[230px] sm:w-[320px] sm:h-[320px] select-none outline-none focus-visible:ring-4 focus-visible:ring-primary/30 rounded-full transition-transform ${
          spinning ? 'cursor-progress' : 'cursor-pointer hover:scale-[1.03] active:scale-[0.98]'
        }`}
      >
        <g ref={groupRef}>
          <circle cx={C} cy={C} r={R} strokeWidth="2" className="fill-card stroke-ink/10" />
          {SLICES.map((s, i) => (
            <path key={s.key} d={slicePath(i)} className={s.fill} />
          ))}
          {SLICES.map((s, i) => {
            const [x, y] = point(i * 60 + 30, 102)
            const word = t(`hero.wheel.${s.key}`)
            return (
              <text
                key={s.key}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="700"
                fontSize={fit(word, s.size, 92)}
                className={`font-display ${s.text}`}
              >
                {word}
              </text>
            )
          })}
        </g>
        <circle cx={C} cy={C} r="58" className="fill-ink" />
        <text x={C} y="163" textAnchor="middle" fontWeight="700" fontSize="26" className="font-display fill-bg">
          {price}
        </text>
        <text
          x={C}
          y="184"
          textAnchor="middle"
          fontWeight="600"
          fontSize={fit(t('hero.wheel.firstHour'), 12, 90)}
          className="font-body fill-bg"
          opacity="0.8"
        >
          {t('hero.wheel.firstHour')}
        </text>
        {/* Göstərici: yuxarıdakı dilim "düşən"dir */}
        <polygon points="170,96 160,116 180,116" className="fill-ink" />
        <polygon points="157,1 183,1 170,24" className="fill-ink" />
      </svg>

      <div aria-live="polite" className="min-h-[1.5rem] w-full flex justify-center">
        {result ? (
          <Prize slice={result} onClose={close} onAgain={spin} />
        ) : (
          <span className={`text-[0.85rem] font-bold text-inkdim transition-opacity ${spinning ? 'opacity-0' : 'animate-pulse'}`}>
            👆 {t('hero.wheelHint')}
          </span>
        )}
      </div>
    </div>
  )
}

function Prize({ slice, onClose, onAgain }) {
  const { t } = useI18n()
  return (
    <div className="wheel-prize relative w-full max-w-[320px] bg-card border border-ink/10 rounded-2xl shadow-lift p-4 pr-10 text-left">
      <button
        type="button"
        onClick={onClose}
        aria-label={t('hero.wheelClose')}
        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-inkdim hover:bg-ink/5"
      >
        <PiXBold size={14} />
      </button>
      <p className="font-display font-bold text-[1.15rem] leading-tight mb-1">{t(`hero.wheelPrizes.${slice}.title`)}</p>
      <p className="text-[0.88rem] text-inkdim mb-3">{t(`hero.wheelPrizes.${slice}.text`)}</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={reserveUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-[0.85rem] bg-primary text-white"
        >
          <PiWhatsappLogoBold size={15} /> {t('nav.reserve')}
        </a>
        <button
          type="button"
          onClick={onAgain}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-[0.85rem] border-2 border-ink/15 hover:border-ink"
        >
          <PiArrowClockwiseBold size={15} /> {t('hero.wheelAgain')}
        </button>
      </div>
    </div>
  )
}
