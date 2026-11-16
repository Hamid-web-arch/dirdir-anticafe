import { useEffect, useState } from 'react'
import { PiMapPin, PiMapPinBold, PiFilmSlate, PiCoffee, PiDiceFive, PiChatCircleDotsBold } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { business, visitUrl } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'
import { usePricing } from '../pricing/PricingContext.jsx'
import { useHeroVideo } from '../lib/site.js'
import { openStatus } from '../lib/openNow.js'

const money = (n) => `${n}${business.currency}`

// Ana səhifənin ilk ekranı: "İndi açıqdır" statusu, qısa başlıq, 3 bənd və məkanın videosu.
// Telefonda video yuxarıda (bütün enə), düymələr aşağıdakı sabit paneldədir (MobileActionBar).
// Böyük ekranda iki sütun: solda mətn və düymələr, sağda video kartda (mətn videonun üstündə qalmır).
export default function Hero() {
  const { t } = useI18n()
  const pricing = usePricing()
  // Admin paneldən (Görünüş) yüklənən video; yoxdursa — mətn tək sütunda, fonda rəngli ləkələr
  const video = useHeroVideo()
  const status = useOpenStatus()

  const features = [
    { icon: PiCoffee, label: t('hero.featTea') },
    { icon: PiDiceFive, label: t('hero.featGames') },
    { icon: PiFilmSlate, label: t('hero.featCinema') },
  ]

  return (
    <section id="top" className={`relative overflow-hidden pb-8 md:pt-16 md:pb-16 ${video ? '' : 'pt-8'}`}>
      {!video && (
        <>
          <div className="absolute w-[380px] h-[380px] bg-brand-yellow/35 rounded-full blur-3xl -top-32 -right-20 pointer-events-none" />
          <div className="absolute w-[260px] h-[260px] bg-brand-teal/35 rounded-full blur-3xl -bottom-16 -left-16 pointer-events-none" />
        </>
      )}

      <div
        className={`relative z-10 w-full max-w-[1120px] mx-auto px-5 sm:px-7 ${
          video ? 'grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-6 md:gap-10 items-center' : ''
        }`}
      >
        {video && <HeroVideo src={video} roomPeople={pricing.room.maxPeople} t={t} />}

        <Reveal direction="left" className="max-w-[640px]">
          <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-5">
            <span className="inline-flex items-center gap-1.5 text-[0.8rem] md:text-[0.85rem] font-bold bg-card border border-ink/10 px-3 py-1.5 rounded-full">
              <span className={`w-2 h-2 rounded-full ${status.open ? 'bg-brand-teal' : 'bg-brand-pink'}`} />
              {status.open ? t('hero.openNow', { time: status.closesAt }) : t('hero.closedNow', { time: status.opensAt })}
            </span>
            <span className="inline-flex items-center gap-1 text-[0.8rem] md:text-[0.85rem] font-bold bg-card border border-ink/10 px-3 py-1.5 rounded-full">
              <PiMapPin size={14} /> {t('hero.location')}
            </span>
          </div>

          <h1 className="font-display font-bold text-[2.2rem] sm:text-[3rem] lg:text-[3.6rem] leading-[1.06] mb-3 md:mb-4">
            {t('hero.titleShortA', { price: money(pricing.hall.firstHour) })}{' '}
            <span className="text-accent md:block">{t('hero.titleShortB')}</span>
          </h1>
          <p className="text-[1rem] md:text-[1.15rem] text-inkdim mb-5 md:mb-7">{t('hero.capLine', { cap: money(pricing.hall.cap) })}</p>

          {/* Telefonda siyahı, böyük ekranda üç kart yan-yana */}
          <ul className="flex flex-col md:grid md:grid-cols-3 gap-2.5 md:gap-3">
            {features.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex md:flex-col items-center md:items-start gap-3 md:gap-2 font-semibold text-[0.98rem] md:text-[0.9rem] md:bg-card md:border md:border-ink/10 md:rounded-2xl md:p-3.5"
              >
                <span className="w-9 h-9 rounded-xl bg-brand-orange-soft text-primary flex items-center justify-center shrink-0">
                  <Icon size={19} />
                </span>
                {label}
              </li>
            ))}
          </ul>

          {/* Böyük ekranda düymələr (telefonda aşağıdakı sabit paneldədir) */}
          <div className="hidden md:flex flex-wrap items-center gap-3 mt-8">
            <a
              href={visitUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-bold text-[0.95rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover active:translate-y-0 transition-all"
            >
              <PiChatCircleDotsBold size={19} /> {t('bar.reserve')}
            </a>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-bold text-[0.95rem] border-2 border-ink text-ink hover:bg-ink hover:text-bg active:scale-[0.98] transition-all"
            >
              {t('hero.ctaPrice')}
            </a>
            <a
              href={business.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-3.5 font-bold text-[0.95rem] text-inkdim hover:text-primary transition-colors"
            >
              <PiMapPinBold size={18} /> {t('bar.directions')}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// "İndi açıqdır" statusu — dəqiqədə bir yenilənir
function useOpenStatus() {
  const [status, setStatus] = useState(() => openStatus())
  useEffect(() => {
    const id = setInterval(() => setStatus(openStatus()), 60_000)
    return () => clearInterval(id)
  }, [])
  return status
}

// Məkanın videosu: səssiz, təkrarlanan. Telefonda mətnin üstündə bütün enə (alt kənarı fona keçir),
// böyük ekranda sağ sütunda yuvarlaq kartda, küncündə kino otağı haqqında kiçik kart.
// Hərəkəti azaldılmış cihazlarda avtomatik oynamır (ilk kadr görünür).
function HeroVideo({ src, roomPeople, t }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return (
    <div className="relative -mx-5 sm:-mx-7 md:mx-0 md:order-last">
      <div className="relative h-[42vh] min-h-[220px] max-h-[360px] md:h-auto md:max-h-none md:aspect-[4/3] md:rounded-[28px] overflow-hidden md:shadow-lift md:border md:border-ink/10">
        <video
          key={src}
          src={src}
          autoPlay={!reduced}
          muted
          loop
          playsInline
          preload={reduced ? 'metadata' : 'auto'}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg to-transparent md:hidden" />
      </div>
      <div className="hidden md:flex absolute -left-5 bottom-6 items-center gap-2.5 bg-card border border-ink/10 shadow-lift rounded-2xl px-3.5 py-2.5">
        <span className="w-9 h-9 rounded-xl bg-brand-purple-soft text-brand-purple flex items-center justify-center">
          <PiFilmSlate size={19} />
        </span>
        <span className="leading-tight">
          <span className="block font-bold text-[0.9rem]">{t('hero.featCinema')}</span>
          <span className="block text-[0.78rem] text-inkdim">{t('hero.roomCard', { people: roomPeople })}</span>
        </span>
      </div>
    </div>
  )
}
