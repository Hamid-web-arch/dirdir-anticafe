import { Link } from 'react-router-dom'
import { PiWarningCircleBold, PiArrowLeftBold } from 'react-icons/pi'
import { useI18n } from '../i18n/index.jsx'
import { useSeo } from '../lib/seo.js'

// Olmayan ünvan: əvvəllər boş səhifə açılırdı. noindex — Google belə ünvanları axtarışa salmasın.
export default function NotFound() {
  const { t } = useI18n()
  useSeo({ title: t('seo.notFound.title'), noindex: true })

  return (
    <section className="max-w-[560px] mx-auto px-6 py-24 text-center">
      <PiWarningCircleBold size={44} className="mx-auto text-inkdim mb-4" />
      <h1 className="font-display font-bold text-[1.8rem] mb-2">404</h1>
      <p className="text-inkdim mb-8">{t('pages.notFound')}</p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-[0.92rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 transition-all"
      >
        <PiArrowLeftBold size={16} /> {t('pages.backHome')}
      </Link>
    </section>
  )
}
