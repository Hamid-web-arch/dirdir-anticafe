import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PiChatCircleDotsBold, PiMapPinBold } from 'react-icons/pi'
import { business, visitUrl } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'

// Telefonda ekranın altında sabit panel: "Yer saxla" (WhatsApp) və "Yol tap" (xəritə).
// Sağ aşağıdakı ayrıca WhatsApp düyməsi telefonda bununla əvəz olunur.
// Hesablayıcının öz aşağı zolağı açılanda (dirdir:bottom-bar) gizlənir — üst-üstə düşməsinlər.
// Admin paneldə göstərilmir.
export default function MobileActionBar() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onBar = (e) => setHidden(Boolean(e.detail))
    window.addEventListener('dirdir:bottom-bar', onBar)
    return () => window.removeEventListener('dirdir:bottom-bar', onBar)
  }, [])

  if (pathname.startsWith('/admin')) return null

  return (
    <>
      {/* Səhifənin sonu panelin altında qalmasın */}
      <div className="h-[76px] md:hidden" aria-hidden="true" />
      <nav
        aria-label={t('bar.label')}
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 bg-bg/95 backdrop-blur border-t border-ink/10 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] grid grid-cols-[1.3fr_1fr] gap-2.5 transition-transform duration-300 ${
          hidden ? 'translate-y-full' : ''
        }`}
      >
        <a
          href={visitUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary text-white font-bold text-[0.95rem] shadow-cta active:scale-[0.98] transition-transform"
        >
          <PiChatCircleDotsBold size={19} /> {t('bar.reserve')}
        </a>
        <a
          href={business.mapUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-ink/20 text-ink font-bold text-[0.95rem] active:scale-[0.98] transition-transform"
        >
          <PiMapPinBold size={18} /> {t('bar.directions')}
        </a>
      </nav>
    </>
  )
}
