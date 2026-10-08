import { PiCheckBold } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { business } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'

export default function Menu() {
  const { t } = useI18n()

  return (
    <section id="menu" className="bg-card border-y border-ink/10 py-20">
      <div className="max-w-[1120px] mx-auto px-7">
        <Reveal className="max-w-[640px] mb-12">
          <span className="inline-block text-[0.8rem] tracking-wide uppercase text-brand-teal-deep font-bold mb-3 bg-brand-teal-soft px-3 py-1.5 rounded-full">
            {t('menu.chip')}
          </span>
          <h2 className="font-display font-bold text-[1.9rem] md:text-[2.5rem] mb-3">{t('menu.title')}</h2>
          <p className="text-inkdim text-[1.03rem]">{t('menu.text')}</p>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {t('menu.items').map((item, i) => {
            const Icon = business.menuIcons[i]
            return (
              <Reveal key={i} delay={i * 70}>
                <div className="bg-bg border border-ink/10 rounded-2xl p-6 hover:-translate-y-1.5 hover:shadow-lg transition-all h-full">
                  <div className="w-11 h-11 rounded-xl bg-brand-teal-soft text-brand-teal-deep flex items-center justify-center mb-3.5">
                    <Icon size={22} />
                  </div>
                  <h3 className="font-display font-semibold text-[1.15rem] mb-2">{item.title}</h3>
                  <p className="text-[0.9rem] text-inkdim">{item.note}</p>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal>
          <span className="inline-flex items-center gap-2 mt-7 text-[0.85rem] text-brand-teal-deep font-bold bg-brand-teal-soft px-4 py-2 rounded-full">
            <PiCheckBold size={16} />
            {t('menu.allIncluded')}
          </span>
        </Reveal>
      </div>
    </section>
  )
}
