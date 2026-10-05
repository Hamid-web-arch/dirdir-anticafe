import { useState } from 'react'
import { PiListBold, PiXBold, PiTrophyBold, PiHandshake, PiUserCircleBold, PiWhatsappLogoBold } from 'react-icons/pi'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { reserveUrl } from '../data/business.js'

const links = [
  { href: '/#neler-var', label: 'Nələr var?' },
  { href: '/#pricing', label: 'Qiymət' },
  { href: '/#events', label: 'Oyunlar' },
  { href: '/#contact', label: 'Əlaqə' },
]

const pageLinks = [
  { to: '/sponsorlar', label: 'Sponsorlar', icon: PiHandshake },
  { to: '/arena', label: 'Arena', icon: PiTrophyBold },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname, hash } = useLocation()

  const isHashActive = (href) => pathname === '/' && hash === `#${href.split('#')[1]}`

  return (
    <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur border-b border-ink/10">
      <div className="max-w-[1120px] mx-auto flex items-center justify-between px-5 sm:px-7 py-3.5 sm:py-4">
        <Link to="/" className="font-display font-bold text-xl sm:text-2xl text-ink flex items-center shrink-0">
          DırDır<span className="text-accent">.</span>
        </Link>

        <ul className="hidden lg:flex items-center gap-6 xl:gap-8">
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

        <div className="flex items-center gap-3">
          <Link
            to="/giris"
            aria-label="Daxil ol"
            className="hidden lg:inline-flex items-center gap-1.5 border-2 border-ink text-ink px-3 xl:px-5 py-2.5 rounded-full font-bold text-sm hover:bg-ink hover:text-white transition-colors whitespace-nowrap"
          >
            <PiUserCircleBold size={18} /> <span className="hidden xl:inline">Daxil ol</span>
          </Link>
          <a
            href={reserveUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden lg:inline-flex items-center gap-1.5 bg-ink text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-primary transition-colors whitespace-nowrap"
          >
            <PiWhatsappLogoBold size={18} /> Rezerv et
          </a>

          <button
            className="lg:hidden text-2xl text-ink shrink-0"
            aria-label="Menyu"
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
            <li className="py-3.5 flex flex-wrap gap-2.5">
              <Link
                to="/giris"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 border-2 border-ink text-ink px-5 py-2.5 rounded-full font-bold text-sm hover:bg-ink hover:text-white transition-colors"
              >
                <PiUserCircleBold size={18} /> Daxil ol
              </Link>
              <a
                href={reserveUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 bg-ink text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-primary transition-colors"
              >
                <PiWhatsappLogoBold size={18} /> Rezerv et
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  )
}
