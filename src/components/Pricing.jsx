import { PiCheckCircleFill, PiArmchairBold, PiFilmSlateBold, PiCalculatorBold } from 'react-icons/pi'
import { Link } from 'react-router-dom'
import Reveal from './Reveal.jsx'
import { business } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'
import { usePricing } from '../pricing/PricingContext.jsx'

const money = (n) => `${n}${business.currency}`

export default function Pricing() {
  const { t } = useI18n()
  const { hall, room, studentDiscount } = usePricing()

  // Qiymət cədvəli admin paneldəki qiymətlərdən qurulur.
  const hallRows = [
    [t('pricing.firstHour'), money(hall.firstHour)],
    [t('pricing.nextHour'), money(hall.nextHour)],
    [t('pricing.cap'), money(hall.cap)],
    studentDiscount.percent > 0 && [t('pricing.students'), t('pricing.studentsValue', { percent: studentDiscount.percent })],
  ].filter(Boolean)
  const roomRows = [
    [t('pricing.roomSmallFirst', { small: room.smallGroup.maxPeople }), money(room.smallGroup.firstHour)],
    [t('pricing.nextHour'), money(room.smallGroup.nextHour)],
    [t('pricing.roomGroup', { from: room.smallGroup.maxPeople + 1, to: room.group.includedPeople }), money(room.group.perHour)],
    [
      t('pricing.roomExtra', { included: room.group.includedPeople }),
      `+${money(room.group.extraPerPerson)}${t('pricing.perHourSuffix')}`,
    ],
  ]

  return (
    <section id="pricing" className="py-24">
      <div className="max-w-[1120px] mx-auto px-7">
        <Reveal className="max-w-[640px] mb-12">
          <span className="inline-block text-[0.8rem] tracking-wide uppercase text-brand-teal-deep font-bold mb-3 bg-brand-teal-soft px-3 py-1.5 rounded-full">
            {t('pricing.chip')}
          </span>
          <h2 className="font-display font-bold text-[1.9rem] md:text-[2.5rem] mb-3">{t('pricing.title')}</h2>
        </Reveal>

        <Reveal>
          <div className="relative overflow-hidden rounded-[28px] p-8 md:p-12 text-white grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-9 items-center bg-gradient-to-br from-brand-purple to-brand-pink">
            <div className="absolute w-[260px] h-[260px] bg-white/10 rounded-full -top-24 -right-16" />
            <div className="relative z-10">
              <h3 className="font-display font-bold text-[1.6rem] mb-3">
                {t('pricing.headline', { first: money(hall.firstHour), cap: money(hall.cap) })}
              </h3>
              <p className="opacity-90 mb-6 max-w-[44ch]">{t('pricing.text')}</p>
              <ul className="flex flex-col gap-2.5">
                {t('pricing.included').map((item, i) => (
                  <li key={i}>
                    <Reveal direction="left" delay={i * 60} className="flex gap-2.5 items-start font-medium">
                      <PiCheckCircleFill className="text-brand-yellow shrink-0 mt-0.5" size={18} />
                      {item}
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative z-10 flex flex-col gap-4">
              <PriceCard icon={PiArmchairBold} title={t('pricing.hall')} note={t('pricing.perPerson')} rows={hallRows} />
              <PriceCard
                icon={PiFilmSlateBold}
                title={t('pricing.room')}
                note={t('pricing.roomUpTo', { max: room.maxPeople })}
                rows={roomRows}
              />
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 mt-7 text-center">
            <p className="text-inkdim text-[0.92rem]">{t('pricing.calcPrompt')}</p>
            <Link
              to="/#hesabla"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-[0.92rem] border-2 border-ink text-ink hover:bg-ink hover:text-bg active:scale-[0.98] transition-all"
            >
              <PiCalculatorBold size={18} /> {t('pricing.calcCta')}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function PriceCard({ icon: Icon, title, note, rows }) {
  return (
    <div className="bg-white/15 border border-white/30 rounded-[20px] p-5 sm:p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 mb-3.5">
        <Icon size={20} />
        <span className="font-display font-bold text-[1.2rem]">{title}</span>
        <span className="ml-auto text-[0.78rem] font-semibold opacity-80">{note}</span>
      </div>
      <dl className="flex flex-col gap-2 text-[0.92rem]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 border-t border-white/15 pt-2 first:border-none first:pt-0">
            <dt className="opacity-85">{label}</dt>
            <dd className="font-display font-bold text-[1.05rem] whitespace-nowrap">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
