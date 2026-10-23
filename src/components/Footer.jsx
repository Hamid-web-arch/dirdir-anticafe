import { Link } from 'react-router-dom'
import { business, whatsappUrl, whatsappDisplay } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'

// Hər səhifənin altında ad, ünvan, telefon (Google bunların hər yerdə eyni olmasına baxır) və əsas linklər.
export default function Footer() {
  const { t } = useI18n()
  const links = [
    { to: '/#pricing', label: t('nav.pricing') },
    { to: '/oyunlar', label: t('nav.games') },
    { to: '/arena', label: t('nav.arena') },
    { to: '/sponsorlar', label: t('nav.sponsors') },
  ]

  return (
    <footer className="border-t border-ink/10 py-10 text-[0.88rem] text-inkdim">
      <div className="max-w-[1120px] mx-auto px-5 sm:px-7 grid gap-8 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display font-bold text-[1.05rem] text-accent mb-2">{business.name}</p>
          <address className="not-italic leading-relaxed">
            <a href={business.mapUrl} target="_blank" rel="noreferrer" className="hover:text-primary">
              {t('contact.addressValue')}
            </a>
            <br />
            {t('footer.hours')} <time dateTime="11:00">11:00</time>–<time dateTime="23:00">23:00</time>
            <br />
            WhatsApp:{' '}
            <a href={whatsappUrl()} target="_blank" rel="noreferrer" className="hover:text-primary">
              {whatsappDisplay}
            </a>
            <br />
            Instagram:{' '}
            <a href={business.instagramUrl} target="_blank" rel="noreferrer" className="hover:text-primary">
              {business.instagramHandle}
            </a>
          </address>
        </div>

        <nav aria-label={t('footer.nav')}>
          <p className="font-bold text-ink mb-2">{t('footer.nav')}</p>
          <ul className="flex flex-col gap-1.5">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="md:text-right self-end">
          © {new Date().getFullYear()} {business.name}. {t('footer.rights')}
        </p>
      </div>
    </footer>
  )
}
