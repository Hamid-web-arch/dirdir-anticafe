import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  PiTrophyBold,
  PiImagesBold,
  PiUsersThreeBold,
  PiTicketBold,
  PiLockKeyBold,
  PiCurrencyCircleDollarBold,
  PiDiceFiveBold,
  PiChatCircleTextBold,
  PiMegaphoneBold,
  PiPaintBrushBold,
  PiClipboardTextBold,
  PiCaretDownBold,
  PiArrowSquareOutBold,
  PiSunBold,
  PiMoonBold,
  PiSignOutBold,
} from 'react-icons/pi'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useTheme } from '../../theme/ThemeContext.jsx'
import { Spinner, useAdminApi } from './ui.jsx'
import { useSeo } from '../../lib/seo.js'

const footerBtn = 'p-2 rounded-lg text-inkdim hover:text-ink hover:bg-ink/5'

// Menyu bölmələri qruplara bölünür ki, uzun siyahıda rahat tapılsın
const GROUPS = ['Gündəlik', 'İstifadəçilər', 'Sayt']

const TABS = [
  { to: 'hesabat', label: 'Günün hesabatı', icon: PiClipboardTextBold, group: 'Gündəlik' },
  { to: 'istifadeciler', label: 'İstifadəçilər', icon: PiUsersThreeBold, group: 'İstifadəçilər' },
  { to: 'yarislar', label: 'Yarışlar', icon: PiTrophyBold, group: 'İstifadəçilər' },
  { to: 'xeberler', label: 'Xəbər göndər', icon: PiMegaphoneBold, group: 'İstifadəçilər' },
  { to: 'reyler', label: 'Rəylər', icon: PiChatCircleTextBold, badge: 'feedback', group: 'İstifadəçilər' },
  { to: 'qiymetler', label: 'Qiymətlər', icon: PiCurrencyCircleDollarBold, group: 'Sayt' },
  { to: 'promokodlar', label: 'Promokodlar', icon: PiTicketBold, group: 'Sayt' },
  { to: 'oyunlar', label: 'Oyunlar', icon: PiDiceFiveBold, group: 'Sayt' },
  { to: 'slider', label: 'Slider', icon: PiImagesBold, group: 'Sayt' },
  { to: 'gorunus', label: 'Görünüş', icon: PiPaintBrushBold, group: 'Sayt' },
]

// Admin panel: yalnız ADMIN rolu. Server də hər sorğuda bunu yoxlayır — bu, yalnız ekran qoruyucusudur.
export default function AdminLayout() {
  const { user, checking } = useAuth()
  const unread = useUnreadFeedback(user?.role === 'ADMIN')
  useSeo({ title: 'Admin panel — DırDır Anticafe', noindex: true })

  if (checking) return <Spinner />
  if (!user) return <Navigate to={`/giris?next=${encodeURIComponent('/admin')}`} replace />
  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <PiLockKeyBold size={40} className="text-inkdim mb-4" />
        <h1 className="font-display font-bold text-[1.6rem] mb-2">İcazə yoxdur</h1>
        <p className="text-inkdim mb-5">Bu səhifə yalnız adminlər üçündür.</p>
        <Link to="/" className="font-bold text-primary hover:underline">
          ← Sayta qayıt
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <Sidebar unread={unread} />
      <div className="min-w-0 px-4 sm:px-6 lg:px-10 py-5 lg:py-8">
        <div className="max-w-[1180px]">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

// Sol tərəfdəki menyu. Böyük ekranda ekran boyu hündürlükdədir və səhifə ilə sürüşmür;
// telefonda yuxarıda zolaqdır — düymə ilə bölmələr siyahısı açılır.
function Sidebar({ unread }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const current = TABS.find((tab) => pathname.startsWith(`/admin/${tab.to}`)) ?? TABS[0]
  const dark = theme === 'dark'

  // Bölmə seçiləndə telefondakı menyu bağlansın
  useEffect(() => setOpen(false), [pathname])

  return (
    <aside className="sticky top-0 z-40 bg-card border-b lg:border-b-0 lg:border-r border-ink/10 lg:h-screen lg:flex lg:flex-col">
      <div className="flex items-center gap-2.5 px-4 lg:px-5 py-3 lg:py-5">
        <Link to="/admin" className="flex items-center gap-2.5 min-w-0 flex-1">
          <img src="/logo.webp" alt="DırDır" width="520" height="313" className="h-9 w-auto dark:bg-white/90 dark:rounded-lg dark:px-1" />
          <span className="font-display font-bold text-[1.05rem] leading-tight truncate">Admin panel</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-nav"
          className="lg:hidden inline-flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl border border-ink/10 font-bold text-[0.88rem]"
        >
          <current.icon size={17} className="text-primary" />
          <span className="max-w-[130px] truncate">{current.label}</span>
          {unread > 0 && !open && <span className="w-2 h-2 rounded-full bg-brand-pink" />}
          <PiCaretDownBold size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div
        className={`${open ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-h-0 max-h-[calc(100vh-64px)] lg:max-h-none overflow-y-auto border-t lg:border-t-0 border-ink/10`}
      >
        <nav id="admin-nav" aria-label="Admin bölmələri" className="flex flex-col p-2 lg:px-3 lg:pt-0">
          {GROUPS.map((group, i) => (
            <div key={group} className={`flex flex-col gap-0.5 ${i ? 'mt-1.5 pt-1.5 border-t border-ink/5' : ''}`}>
              <div className="px-3 pt-1 pb-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-inkdim">{group}</div>
              {TABS.filter((tab) => tab.group === group).map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-[0.9rem] transition-colors ${
                      isActive ? 'bg-primary text-white shadow-cta' : 'text-inkdim hover:text-ink hover:bg-ink/5'
                    }`
                  }
                >
                  <tab.icon size={18} className="shrink-0" />
                  <span className="flex-1">{tab.label}</span>
                  {tab.badge === 'feedback' && unread > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-brand-pink text-white text-[0.72rem] flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
  
        {/* Aşağıda: hesab, sayta keçid, rejim və çıxış (saytın menyusu admin paneldə yoxdur) — bir sətirdə */}
        <div className="mt-auto p-2 lg:p-3 border-t border-ink/10">
          <div className="flex items-center gap-2 pl-2">
            <span className="w-8 h-8 shrink-0 rounded-full bg-ink text-bg flex items-center justify-center font-bold text-[0.78rem]">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </span>
            <span className="flex-1 min-w-0 font-bold text-[0.85rem] truncate" title={user.email}>
              {user.firstName}
            </span>
            <Link to="/" title="Sayta keç" aria-label="Sayta keç" className={footerBtn}>
              <PiArrowSquareOutBold size={18} />
            </Link>
            <button
              type="button"
              onClick={toggle}
              title={dark ? 'Açıq rejim' : 'Qaranlıq rejim'}
              aria-label={dark ? 'Açıq rejim' : 'Qaranlıq rejim'}
              className={footerBtn}
            >
              {dark ? <PiSunBold size={18} /> : <PiMoonBold size={18} />}
            </button>
            <button
              type="button"
              onClick={logout}
              title="Çıxış"
              aria-label="Çıxış"
              className={`${footerBtn} hover:!text-brand-pink-deep hover:!bg-brand-pink-soft`}
            >
              <PiSignOutBold size={18} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

// Oxunmamış rəylərin sayı — səhifə dəyişəndə yenilənir (məs. rəyi oxuyub başqa bölməyə keçəndə)
function useUnreadFeedback(enabled) {
  const request = useAdminApi()
  const { pathname } = useLocation()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled) return
    request('/admin/feedback?status=unread')
      .then((d) => setCount(d.unread))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pathname])
  return count
}
