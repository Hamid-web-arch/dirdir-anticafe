import { Link } from 'react-router-dom'
import { PiChatCircleDots, PiDiceFive, PiArrowRightBold } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { business } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'

export default function Events() {
  const { t } = useI18n()

  return (
    <section id="events" className="py-24">
      <div className="max-w-[1120px] mx-auto px-7">
        <Reveal className="max-w-[640px] mb-12">
          <span className="inline-block text-[0.8rem] tracking-wide uppercase text-brand-teal-deep font-bold mb-3 bg-brand-teal-soft px-3 py-1.5 rounded-full">
            {t('events.chip')}
          </span>
          <h2 className="font-display font-bold text-[1.9rem] md:text-[2.5rem] mb-3">{t('events.title')}</h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-9">
          {t('events.items').map((item, i) => {
            const Icon = business.amenityIcons[i]
            return (
              <Reveal key={i} delay={i * 70}>
                <div className="bg-card border border-ink/10 rounded-2xl p-7 flex gap-4 items-start h-full">
                  <span className="w-12 h-12 shrink-0 rounded-xl bg-brand-pink-soft text-brand-pink flex items-center justify-center">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h3 className="font-display font-semibold text-[1.1rem] mb-1.5">{item.title}</h3>
                    <p className="text-[0.9rem] text-inkdim">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal>
          <div className="bg-brand-yellow-soft rounded-2xl px-6 py-5 text-[0.92rem] text-brand-yellow-deep font-semibold flex gap-3 items-center">
            <PiChatCircleDots size={20} className="shrink-0" />
            {t('events.note')}
          </div>
        </Reveal>

        <Reveal>
          <div className="flex justify-center mt-8">
            <Link
              to="/oyunlar"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-[0.92rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover transition-all"
            >
              <PiDiceFive size={18} /> {t('games.allGames')} <PiArrowRightBold size={15} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
