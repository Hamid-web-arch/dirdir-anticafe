import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PiWhatsappLogoFill, PiXBold } from 'react-icons/pi'
import { supportUrl } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'

// Brauzerdə bu ziyarət ərzində baloncuq bağlanıbsa, bir daha göstərmirik
const DISMISS_KEY = 'dirdir.supportBubble'
const dismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

// Sağ aşağı küncdə həmişə görünən dairəvi WhatsApp düyməsi ("dəstək" düyməsi kimi).
// Animasiya: index.css → .wa-float. Admin paneldə göstərilmir.
export default function FloatingWhatsApp() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const [bubble, setBubble] = useState(false)
  const [raised, setRaised] = useState(false) // telefonda hesablayıcının aşağı zolağı açıqdır

  // Bir neçə saniyədən sonra "Sualın var?" baloncuğu çıxır, bir müddət sonra özü gizlənir
  useEffect(() => {
    if (dismissed()) return
    const show = setTimeout(() => setBubble(true), 4000)
    const hide = setTimeout(() => setBubble(false), 14000)
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [])

  useEffect(() => {
    const onBar = (e) => setRaised(Boolean(e.detail))
    window.addEventListener('dirdir:bottom-bar', onBar)
    return () => window.removeEventListener('dirdir:bottom-bar', onBar)
  }, [])

  const closeBubble = () => {
    setBubble(false)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {}
  }

  if (pathname.startsWith('/admin')) return null

  return (
    <div
      className={`fixed right-4 sm:right-6 z-40 flex items-end gap-3 transition-[bottom] duration-300 ${
        raised ? 'bottom-24 md:bottom-6' : 'bottom-4 sm:bottom-6'
      }`}
    >
      {bubble && (
        <div className="wa-bubble relative mb-2 max-w-[220px] bg-card text-ink rounded-2xl rounded-br-md shadow-lift border border-ink/10 pl-4 pr-9 py-3">
          <button
            type="button"
            onClick={closeBubble}
            aria-label={t('support.close')}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-inkdim hover:bg-ink/5"
          >
            <PiXBold size={12} />
          </button>
          <p className="font-bold text-[0.9rem] leading-snug">{t('support.title')}</p>
          <p className="text-[0.8rem] text-inkdim">{t('support.text')}</p>
        </div>
      )}
      <a
        href={supportUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={t('support.label')}
        onClick={closeBubble}
        className="wa-float relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lift hover:scale-110 active:scale-95 transition-transform"
      >
        <PiWhatsappLogoFill className="wa-float-icon w-8 h-8 sm:w-9 sm:h-9" />
      </a>
    </div>
  )
}
