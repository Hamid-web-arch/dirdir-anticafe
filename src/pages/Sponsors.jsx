import { PiHandshake, PiPlus, PiFlagCheckered, PiWhatsappLogoBold } from 'react-icons/pi'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal.jsx'
import { sponsorUrl } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'

const slotCount = 6

export default function Sponsors() {
  const { t } = useI18n()

  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div className="absolute w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] bg-brand-orange/20 rounded-full blur-3xl -top-28 -right-24 pointer-events-none" />
      <div className="absolute w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] bg-brand-purple/20 rounded-full blur-3xl -bottom-16 -left-16 pointer-events-none" />

      <div className="relative z-10 max-w-[880px] mx-auto px-6 sm:px-7 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-[0.78rem] sm:text-[0.8rem] tracking-wide uppercase text-brand-purple font-bold mb-5 bg-brand-purple-soft px-3.5 py-1.5 rounded-full">
            <PiHandshake size={16} /> {t('sponsors.chip')}
          </span>
        </Reveal>

        <Reveal delay={60}>
          <h1 className="font-display font-bold text-[1.8rem] sm:text-[2.6rem] leading-[1.1] mb-3">{t('sponsors.title')}</h1>
          <p className="text-inkdim text-[0.95rem] sm:text-[1.03rem] max-w-[52ch] mx-auto mb-3 px-1">{t('sponsors.text')}</p>
          <span className="inline-block text-[0.72rem] tracking-wide uppercase font-bold text-inkdim/70 border border-dashed border-ink/20 rounded-full px-3 py-1 mb-10 sm:mb-12">
            {t('sponsors.badge')}
          </span>
        </Reveal>

        <Reveal delay={120}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-16 sm:mb-20">
            {Array.from({ length: slotCount }).map((_, i) => (
              <a
                key={i}
                href={sponsorUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-2 aspect-[4/3] rounded-2xl border-2 border-dashed border-ink/15 text-inkdim/70 hover:border-primary hover:text-primary transition-colors"
              >
                <PiPlus size={24} />
                <span className="text-[0.82rem] font-semibold">{t('sponsors.slot')}</span>
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="border-t border-ink/10 pt-10 sm:pt-12">
            <h2 className="font-display font-bold text-[1.3rem] sm:text-[1.6rem] mb-3">{t('sponsors.ctaTitle')}</h2>
            <p className="text-inkdim text-[0.92rem] sm:text-[0.98rem] max-w-[46ch] mx-auto mb-8 px-1">{t('sponsors.ctaText')}</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-3.5 justify-center">
              <a
                href={sponsorUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-4 rounded-full font-bold text-[0.92rem] sm:text-[0.95rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover active:translate-y-0 transition-all"
              >
                <PiWhatsappLogoBold size={18} className="shrink-0" /> {t('sponsors.ctaButton')}
              </a>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-4 rounded-full font-bold text-[0.92rem] sm:text-[0.95rem] border-2 border-ink text-ink hover:bg-ink hover:text-bg active:scale-[0.98] transition-all"
              >
                <PiFlagCheckered size={18} className="shrink-0" /> {t('sponsors.backHome')}
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
