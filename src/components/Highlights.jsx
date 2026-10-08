import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PiCaretLeftBold, PiCaretRightBold, PiArrowRightBold, PiImageBold } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { api, apiEnabled, assetUrl } from '../lib/api.js'
import { useI18n } from '../i18n/index.jsx'

const AUTOPLAY_MS = 2000
const SWIPE_PX = 40

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Slaydlar admin paneldən idarə olunur (bazada). Heç biri yoxdursa, bölmə görünmür.
export default function Highlights() {
  const { t } = useI18n()
  const [slides, setSlides] = useState(null) // null = yüklənir

  useEffect(() => {
    if (!apiEnabled) return setSlides([])
    api('/slides')
      .then((d) => setSlides(d.slides))
      .catch(() => setSlides([]))
  }, [])

  if (slides && slides.length === 0) return null

  return (
    <section id="neler-var" className="py-20">
      <div className="max-w-[1120px] mx-auto px-7">
        <Reveal className="mb-10">
          <h2 className="font-display font-bold text-[1.9rem] md:text-[2.5rem]">{t('highlights.title')}</h2>
        </Reveal>
        {slides ? (
          <Carousel slides={slides} />
        ) : (
          <div className="rounded-[28px] border border-ink/10 bg-card animate-pulse aspect-[4/5] sm:aspect-auto sm:h-[460px] lg:h-[520px]" />
        )}
      </div>
    </section>
  )
}

function Carousel({ slides }) {
  const { t, pick } = useI18n()
  const [index, setIndex] = useState(0)
  // İstifadəçi slaydı özü dəyişən kimi avtomatik keçid birdəfəlik dayanır.
  const [autoplay, setAutoplay] = useState(() => !prefersReducedMotion() && slides.length > 1)
  const touchX = useRef(null)
  const count = slides.length

  // Hər slayd üçün taymer yenidən başlayır ki, nöqtədəki dolma zolağı ilə eyni vaxtda bitsin.
  useEffect(() => {
    if (!autoplay) return
    const id = setTimeout(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS)
    return () => clearTimeout(id)
  }, [autoplay, index, count])

  const goTo = (i) => {
    setAutoplay(false)
    setIndex((i + count) % count)
  }

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) > SWIPE_PX) goTo(index + (dx < 0 ? 1 : -1))
  }

  return (
    <Reveal>
      <div
        className="relative overflow-hidden rounded-[28px] border border-ink/10 bg-card"
        role="region"
        aria-roledescription="carousel"
        aria-label={t('highlights.title')}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((s, i) => (
            <Slide
              key={s.id}
              slide={s}
              title={pick(s.title)}
              desc={pick(s.desc)}
              active={i === index}
              position={`${i + 1} / ${count}`}
              number={`${String(i + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`}
            />
          ))}
        </div>

        {count > 1 && (
          // Oxlar slaydın üzərində: telefonda şəklin ortasında, böyük ekranda bütün slaydın ortasında
          <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/5] sm:aspect-auto sm:bottom-0 flex items-center justify-between px-3 sm:px-5">
            <ArrowButton onClick={() => goTo(index - 1)} label={t('highlights.prev')}>
              <PiCaretLeftBold size={18} />
            </ArrowButton>
            <ArrowButton onClick={() => goTo(index + 1)} label={t('highlights.next')}>
              <PiCaretRightBold size={18} />
            </ArrowButton>
          </div>
        )}
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              aria-label={t('highlights.goTo', { n: i + 1, title: pick(s.title) })}
              aria-current={i === index}
              className={`relative h-2.5 rounded-full overflow-hidden transition-all ${
                i === index ? 'w-10 bg-ink/15' : 'w-2.5 bg-ink/20 hover:bg-ink/40'
              }`}
            >
              {i === index && (
                // Avtomatik keçid işləyəndə dolur; istifadəçi dəyişəndən sonra tam dolu qalır.
                <span
                  key={index}
                  className={`absolute inset-y-0 left-0 rounded-full bg-primary ${autoplay ? 'animate-progress' : 'w-full'}`}
                  style={autoplay ? { animationDuration: `${AUTOPLAY_MS}ms` } : undefined}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </Reveal>
  )
}

// Telefonda şəkil yuxarıda, mətn altda; planşet/kompüterdə şəkil solda, mətn sağda.
function Slide({ slide, title, desc, active, position, number }) {
  return (
    <div
      className="w-full shrink-0 flex flex-col sm:grid sm:grid-cols-[1fr_1.1fr] sm:h-[460px] lg:h-[520px]"
      role="group"
      aria-roledescription="slide"
      aria-label={position}
      aria-hidden={!active}
    >
      <div className="relative aspect-[4/5] sm:aspect-auto sm:h-full overflow-hidden bg-night">
        <SlideMedia src={assetUrl(slide.imageUrl)} fit={slide.fit} alt={title} />
      </div>

      <div className="flex flex-col justify-center gap-4 p-6 sm:p-10 lg:p-14">
        <span className="font-display font-bold text-[0.95rem] text-primary">{number}</span>
        <h3 className="font-display font-bold text-[1.6rem] sm:text-[2rem] lg:text-[2.4rem] leading-tight">{title}</h3>
        {desc && <p className="text-inkdim text-[0.95rem] sm:text-[1.03rem] max-w-[40ch]">{desc}</p>}
        {/* "Ətraflı": admin mətn yazıbsa slaydın öz səhifəsi, yoxdursa (varsa) link */}
        {(slide.hasDetails || slide.link) && (
          <div className="mt-2">
            <DetailsLink to={slide.hasDetails ? `/neler-var/${slide.id}` : slide.link} tabIndex={active ? 0 : -1} />
          </div>
        )}
      </div>
    </div>
  )
}

function SlideMedia({ src, fit, alt }) {
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-brand-purple to-brand-pink flex items-center justify-center text-white/80">
        <PiImageBold size={90} />
      </div>
    )
  }

  if (fit === 'contain') {
    // Poster tam görünür, boş qalan yerləri eyni şəklin bulanıq versiyası doldurur.
    return (
      <>
        <img src={src} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60" />
        <img src={src} alt={alt} onError={() => setBroken(true)} className="absolute inset-0 w-full h-full object-contain" />
      </>
    )
  }

  return <img src={src} alt={alt} onError={() => setBroken(true)} className="absolute inset-0 w-full h-full object-cover" />
}

function DetailsLink({ to, tabIndex }) {
  const { t } = useI18n()
  const className =
    'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-[0.92rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover active:translate-y-0 transition-all'
  const content = (
    <>
      {t('highlights.details')} <PiArrowRightBold size={16} />
    </>
  )

  if (/^https?:/.test(to)) {
    return (
      <a href={to} target="_blank" rel="noreferrer" tabIndex={tabIndex} className={className}>
        {content}
      </a>
    )
  }
  return (
    <Link to={to} tabIndex={tabIndex} className={className}>
      {content}
    </Link>
  )
}

function ArrowButton({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="pointer-events-auto w-11 h-11 rounded-full bg-card/90 backdrop-blur text-ink shadow-lift flex items-center justify-center hover:bg-primary hover:text-white active:scale-95 transition-all"
    >
      {children}
    </button>
  )
}
