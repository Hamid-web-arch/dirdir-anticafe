import { useEffect, useRef, useState } from 'react'
import {
  PiListBold,
  PiXBold,
  PiTrophyBold,
  PiHandshake,
  PiUserCircleBold,
  PiWhatsappLogoBold,
  PiGlobeBold,
  PiCaretDownBold,
  PiCheckBold,
  PiSunBold,
  PiMoonBold,
} from 'react-icons/pi'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { reserveUrl } from '../data/business.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useI18n, LANGUAGES } from '../i18n/index.jsx'
import { assetUrl } from '../lib/api.js'
import { useTheme } from '../theme/ThemeContext.jsx'
import Switch from './Switch.jsx'
import ReserveButton from './ReserveButton.jsx'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname, hash } = useLocation()
  const { user } = useAuth()
  const { t } = useI18n()

  const links = [
    { href: '/#neler-var', label: t('nav.highlights') },
    { href: '/#pricing', label: t('nav.pricing') },
    { href: '/oyunlar', label: t('nav.games') },
    { href: '/#contact', label: t('nav.contact') },
  ]
  const pageLinks = [
    { to: '/sponsorlar', label: t('nav.sponsors'), icon: PiHandshake },
    { to: '/arena', label: t('nav.arena'), icon: PiTrophyBold },
  ]
  // Daxil olubsa düymə hesaba aparır və adını (və şəklini) göstərir
  const account = user ? { to: '/hesabim', label: user.firstName } : { to: '/giris', label: t('nav.login') }
  const accountIcon = user?.avatarUrl ? (
    <img src={assetUrl(user.avatarUrl)} alt="" className="w-[18px] h-[18px] rounded-full object-cover" />
  ) : (
    <PiUserCircleBold size={18} />
  )

  // "/#bölmə" linkləri — ana səhifədə həmin bölmədə olanda; "/oyunlar" kimi səhifələr — həmin səhifədə
  // və ya onun alt səhifəsində (/oyunlar/:id) olanda aktivdir.
  const isHashActive = (href) =>
    href.includes('#')
      ? pathname === '/' && hash === `#${href.split('#')[1]}`
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur border-b border-ink/10">
      <div className="max-w-[1120px] mx-auto flex items-center justify-between gap-3 px-5 sm:px-7 py-3.5 sm:py-4">
        <Link to="/" className="flex items-center shrink-0" aria-label="DırDır Anticafe">
          <img src="/logo.webp" alt="DırDır Anticafe" width="520" height="313" className="h-11 sm:h-14 w-auto dark:bg-white/90 dark:rounded-xl dark:px-1.5 dark:py-0.5" />
        </Link>

        <ul className="hidden lg:flex items-center gap-5 xl:gap-7">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                to={l.href}
                className={`inline-block font-semibold text-[0.94rem] transition-colors whitespace-nowrap ${
                  isHashActive(l.href) ? 'text-primary' : 'text-inkdim hover:text-primary'
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
          {pageLinks.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 font-semibold text-[0.94rem] transition-colors whitespace-nowrap ${
                    isActive ? 'text-primary' : 'text-brand-purple hover:text-primary'
                  }`
                }
              >
                <l.icon size={15} /> {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <LanguageMenu />
          <Link
            to={account.to}
            aria-label={account.label}
            className="hidden lg:inline-flex items-center gap-1.5 border-2 border-ink text-ink px-3 xl:px-5 py-2.5 rounded-full font-bold text-sm hover:bg-ink hover:text-bg transition-colors whitespace-nowrap"
          >
            {accountIcon} <span className="hidden xl:inline max-w-[8rem] truncate">{account.label}</span>
          </Link>
          <ReserveButton
            href={reserveUrl}
            label={t('nav.reserve')}
            wrapClassName="hidden lg:inline-flex"
            className="inline-flex items-center gap-1.5 bg-primary text-white shadow-cta px-3 xl:px-6 py-3 rounded-full font-bold text-sm hover:bg-brand-orange-deep transition-colors whitespace-nowrap"
          >
            <PiWhatsappLogoBold size={18} className="reserve-icon" /> <span className="hidden xl:inline">{t('nav.reserve')}</span>
          </ReserveButton>

          <button
            className="lg:hidden text-2xl text-ink shrink-0"
            aria-label={t('nav.menu')}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <PiXBold /> : <PiListBold />}
          </button>
        </div>
      </div>

      <div
        className="lg:hidden grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden bg-card border-b border-ink/10">
          <ul className="flex flex-col px-5 sm:px-7 py-2">
            {links.map((l) => (
              <li key={l.href} className="border-b border-ink/10 last:border-none">
                <Link
                  to={l.href}
                  onClick={() => setOpen(false)}
                  className={`block py-3.5 font-semibold text-[0.94rem] transition-colors ${
                    isHashActive(l.href) ? 'text-primary' : 'text-inkdim hover:text-primary'
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            {pageLinks.map((l) => (
              <li key={l.to} className="border-b border-ink/10 last:border-none">
                <NavLink
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 py-3.5 font-semibold text-[0.94rem] transition-colors ${
                      isActive ? 'text-primary' : 'text-brand-purple hover:text-primary'
                    }`
                  }
                >
                  <l.icon size={15} /> {l.label}
                </NavLink>
              </li>
            ))}
            {/* Yuxarı-aşağı yer: rezerv düyməsinin pişiyinin başı və quyruğu kəsilməsin */}
            <li className="pt-6 pb-9 flex flex-wrap items-center gap-2.5">
              <Link
                to={account.to}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 border-2 border-ink text-ink px-5 py-2.5 rounded-full font-bold text-sm hover:bg-ink hover:text-bg transition-colors"
              >
                {accountIcon} {account.label}
              </Link>
              <ReserveButton
                href={reserveUrl}
                label={t('nav.reserve')}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 bg-primary text-white shadow-cta px-6 py-3 rounded-full font-bold text-sm hover:bg-brand-orange-deep transition-colors"
              >
                <PiWhatsappLogoBold size={18} className="reserve-icon" /> {t('nav.reserve')}
              </ReserveButton>
            </li>
          </ul>
        </div>
      </div>
    </header>
  )
}

// Açıq / qaranlıq rejim açarı: günəş ↔ ay
function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const { t } = useI18n()
  const dark = theme === 'dark'
  return (
    <Switch
      size="sm"
      checked={dark}
      onChange={toggle}
      label={t('nav.darkMode')}
      icon={dark ? <PiMoonBold size={12} /> : <PiSunBold size={12} className="text-brand-orange" />}
    />
  )
}

// Dil seçimi: "AZ ▾" düyməsi, açılanda üç dil. Kənara klikləyəndə və ya Esc ilə bağlanır.
function LanguageMenu() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('nav.language')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-full font-bold text-sm text-ink hover:bg-ink/5 transition-colors"
      >
        <PiGlobeBold size={17} />
        <span className="uppercase">{lang}</span>
        <PiCaretDownBold size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-full mt-2 min-w-[11rem] bg-card border border-ink/10 rounded-2xl shadow-lift p-1.5 z-50"
        >
          {LANGUAGES.map((code) => (
            <li key={code}>
              <button
                role="menuitemradio"
                aria-checked={code === lang}
                lang={code}
                onClick={() => {
                  setLang(code)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[0.92rem] font-semibold transition-colors ${
                  code === lang ? 'bg-brand-orange-soft text-ink' : 'text-inkdim hover:bg-ink/5 hover:text-ink'
                }`}
              >
                <span className="w-7 text-[0.75rem] font-bold uppercase text-primary">{code}</span>
                <span className="flex-1">{LANGUAGE_NAMES[code]}</span>
                {code === lang && <PiCheckBold size={14} className="text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Dil adları həmişə öz dilində göstərilir — istifadəçi tanımadığı dildə olsa da öz dilini tapsın.
const LANGUAGE_NAMES = { az: 'Azərbaycanca', en: 'English', ru: 'Русский' }
