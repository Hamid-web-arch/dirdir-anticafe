import { PiMapPin, PiFilmSlate } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { business } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'
import { usePricing } from '../pricing/PricingContext.jsx'

const money = (n) => `${n}${business.currency}`

export default function Hero() {
  const { t } = useI18n()
  const pricing = usePricing()
  // Saatlıq qiymət — zalda ilk saat
  const pricePerHour = pricing.hall.firstHour

  return (
    <section id="top" className="relative overflow-hidden pt-20 pb-16">
      <div className="absolute w-[380px] h-[380px] bg-brand-yellow/35 rounded-full blur-3xl -top-32 -right-20 pointer-events-none" />
      <div className="absolute w-[260px] h-[260px] bg-brand-teal/35 rounded-full blur-3xl -bottom-16 -left-16 pointer-events-none" />

      <div className="relative z-10 max-w-[1120px] mx-auto px-7 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <Reveal direction="left">
          <span className="inline-flex items-center gap-1.5 text-[0.82rem] tracking-wide uppercase text-brand-purple font-bold mb-5 bg-brand-purple-soft px-3.5 py-1.5 rounded-full">
            <PiMapPin size={16} /> {t('hero.badge', { price: money(pricePerHour) })}
          </span>
          <h1 className="font-display font-bold text-[2.5rem] sm:text-[3rem] md:text-[4rem] leading-[1.06] mb-5">
            {t('hero.titleA', { price: pricePerHour })} <span className="text-accent">{t('hero.titleB')}</span>
          </h1>
          <p className="text-[1.12rem] text-inkdim max-w-[46ch] mb-8">
            {t('hero.text', {
              name: business.name,
              first: money(pricing.hall.firstHour),
              next: money(pricing.hall.nextHour),
              cap: money(pricing.hall.cap),
            })}
          </p>
          <div className="flex gap-3.5 flex-wrap">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 px-7 sm:px-8 py-4 rounded-full font-bold text-[0.95rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover active:translate-y-0 transition-all"
            >
              {t('hero.ctaPrice')}
            </a>
            <a
              href={business.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-7 sm:px-8 py-4 rounded-full font-bold text-[0.95rem] border-2 border-ink text-ink hover:bg-ink hover:text-bg active:scale-[0.98] transition-all"
            >
              {t('hero.ctaInstagram')}
            </a>
          </div>

          <div className="flex gap-8 flex-wrap mt-10">
            <div>
              <strong className="block font-display text-[1.7rem] text-brand-purple">{money(pricePerHour)}</strong>
              <span className="text-[0.82rem] text-inkdim font-semibold">{t('hero.statFirst')}</span>
            </div>
            <div>
              <strong className="block font-display text-[1.7rem] text-brand-purple">11–23</strong>
              <span className="text-[0.82rem] text-inkdim font-semibold">{t('hero.statHours')}</span>
            </div>
            <div>
              <strong className="block font-display text-[1.7rem] text-brand-purple">
                <PiFilmSlate />
              </strong>
              <span className="text-[0.82rem] text-inkdim font-semibold">{t('hero.statCinema')}</span>
            </div>
          </div>
        </Reveal>

        <Reveal direction="right" delay={120} className="flex justify-center items-center order-first md:order-last">
          <SpinnerSignature price={money(pricePerHour)} />
        </Reveal>
      </div>
    </section>
  )
}

// Çarxdakı söz uzundursa (məs. "СЛАДОСТИ"), şrift kiçilir ki, dilimə sığsın.
const fit = (label, base, room = 100) => Math.min(base, Math.floor(room / (label.length * 0.62)))

function SpinnerSignature({ price }) {
  const { t } = useI18n()
  const w = (key) => t(`hero.wheel.${key}`)
  const label = (x, y, key, base, fill = 'fill-white') => (
    <text x={x} y={y} textAnchor="middle" fontWeight="700" fontSize={fit(w(key), base)} className={`font-display ${fill}`}>
      {w(key)}
    </text>
  )

  return (
    <svg viewBox="0 0 340 340" width="320" height="320" className="drop-shadow-soft">
      <g className="origin-[170px_170px] animate-spin-slow">
        <circle cx="170" cy="170" r="150" strokeWidth="2" className="fill-card stroke-ink/10" />
        <path d="M170,170 L170,20 A150,150 0 0,1 300,95 Z" className="fill-brand-pink" />
        <path d="M170,170 L300,95 A150,150 0 0,1 300,245 Z" className="fill-brand-yellow" />
        <path d="M170,170 L300,245 A150,150 0 0,1 170,320 Z" className="fill-brand-teal" />
        <path d="M170,170 L170,320 A150,150 0 0,1 40,245 Z" className="fill-brand-purple" />
        <path d="M170,170 L40,245 A150,150 0 0,1 40,95 Z" className="fill-brand-orange" />
        <path d="M170,170 L40,95 A150,150 0 0,1 170,20 Z" className="fill-brand-cyan" />
        {label(170, 70, 'tea', 22)}
        {label(255, 140, 'coffee', 20)}
        {label(255, 205, 'cinema', 18)}
        {label(170, 285, 'games', 18)}
        {label(90, 205, 'sweets', 17, 'fill-ink')}
        {label(90, 140, 'drinks', 14, 'fill-ink')}
      </g>
      <circle cx="170" cy="170" r="58" className="fill-ink" />
      <text x="170" y="163" textAnchor="middle" fontWeight="700" fontSize="26" className="font-display fill-white">
        {price}
      </text>
      <text
        x="170"
        y="184"
        textAnchor="middle"
        fontWeight="600"
        fontSize={fit(t('hero.wheel.firstHour'), 12, 90)}
        className="font-body fill-white"
        opacity="0.8"
      >
        {t('hero.wheel.firstHour')}
      </text>
      <polygon points="170,96 160,116 180,116" className="fill-ink" />
    </svg>
  )
}
