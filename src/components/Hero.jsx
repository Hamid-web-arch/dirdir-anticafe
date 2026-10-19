import { PiMapPin, PiFilmSlate } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { business } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'
import { usePricing } from '../pricing/PricingContext.jsx'
import PrizeWheel from './PrizeWheel.jsx'

const money = (n) => `${n}${business.currency}`

export default function Hero() {
  const { t } = useI18n()
  const pricing = usePricing()
  // Saatlıq qiymət — zalda ilk saat
  const pricePerHour = pricing.hall.firstHour

  return (
    <section id="top" className="relative overflow-hidden pt-10 sm:pt-20 pb-12 sm:pb-16">
      <div className="absolute w-[380px] h-[380px] bg-brand-yellow/35 rounded-full blur-3xl -top-32 -right-20 pointer-events-none" />
      <div className="absolute w-[260px] h-[260px] bg-brand-teal/35 rounded-full blur-3xl -bottom-16 -left-16 pointer-events-none" />

      <div className="relative z-10 max-w-[1120px] mx-auto px-5 sm:px-7 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-8 md:gap-12 items-center">
        <Reveal direction="left">
          <span className="inline-flex items-center gap-1.5 text-[0.82rem] tracking-wide uppercase text-brand-purple font-bold mb-5 bg-brand-purple-soft px-3.5 py-1.5 rounded-full">
            <PiMapPin size={16} /> {t('hero.badge', { price: money(pricePerHour) })}
          </span>
          <h1 className="font-display font-bold text-[2.3rem] sm:text-[3rem] md:text-[4rem] leading-[1.06] mb-4 sm:mb-5">
            {t('hero.titleA', { price: pricePerHour })} <span className="text-accent">{t('hero.titleB')}</span>
          </h1>
          <p className="text-[1.02rem] sm:text-[1.12rem] text-inkdim max-w-[46ch] mb-6 sm:mb-8">
            {t('hero.text', {
              name: business.name,
              first: money(pricing.hall.firstHour),
              next: money(pricing.hall.nextHour),
              cap: money(pricing.hall.cap),
            })}
          </p>
          {/* Telefonda düymələr tam enlidir — barmaqla basmaq rahat olsun */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-3.5">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-4 rounded-full font-bold text-[0.95rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover active:translate-y-0 transition-all"
            >
              {t('hero.ctaPrice')}
            </a>
            <a
              href={business.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-4 rounded-full font-bold text-[0.95rem] border-2 border-ink text-ink hover:bg-ink hover:text-bg active:scale-[0.98] transition-all"
            >
              {t('hero.ctaInstagram')}
            </a>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:flex sm:gap-8 sm:flex-wrap mt-8 sm:mt-10">
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

        {/* Telefonda çarx mətndən sonra və kiçik — başlıq ilk ekranda görünsün */}
        <Reveal direction="right" delay={120} className="flex justify-center items-center">
          <PrizeWheel price={money(pricePerHour)} />
        </Reveal>
      </div>
    </section>
  )
}
