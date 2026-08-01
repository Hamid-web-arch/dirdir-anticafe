import { useState } from 'react'
import { PiListBold, PiXBold, PiTrophyBold } from 'react-icons/pi'
import { Link } from 'react-router-dom'
import { business } from '../data/business.js'

const links = [
  { href: '/#about', label: 'Haqqımızda' },
  { href: '/#pricing', label: 'Qiymət' },
  { href: '/#menu', label: 'Menyu' },
  { href: '/#events', label: 'Oyunlar' },
  { href: '/#contact', label: 'Əlaqə' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur border-b border-ink/10">
      <div className="max-w-[1120px] mx-auto flex items-center justify-between px-5 sm:px-7 py-3.5 sm:py-4">
        <Link to="/" className="font-display font-bold text-xl sm:text-2xl text-ink flex items-center shrink-0">
          DırDır<span className="text-brand-pink">.</span>
        </Link>

        <ul className="hidden lg:flex items-center gap-6 xl:gap-8">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="inline-block text-inkdim hover:text-brand-pink font-semibold text-[0.94rem] transition-colors whitespace-nowrap"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              to="/arena"
              className="inline-flex items-center gap-1.5 text-brand-purple hover:text-brand-pink font-semibold text-[0.94rem] transition-colors whitespace-nowrap"
            >
              <PiTrophyBold size={15} /> Arena
            </Link>
          </li>
        </ul>

        <div className="flex items-center gap-3">
          <a
            href={business.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden lg:inline-block bg-ink text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-brand-pink transition-colors whitespace-nowrap"
          >
            DM at, gəl
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
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 text-inkdim hover:text-brand-pink font-semibold text-[0.94rem] transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="border-b border-ink/10 last:border-none">
              <Link
                to="/arena"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 py-3.5 text-brand-purple hover:text-brand-pink font-semibold text-[0.94rem] transition-colors"
              >
                <PiTrophyBold size={15} /> Arena
              </Link>
            </li>
            <li className="py-3.5">
              <a
                href={business.instagramUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="inline-block bg-ink text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-brand-pink transition-colors"
              >
                DM at, gəl
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  )
}
