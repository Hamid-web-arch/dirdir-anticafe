import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { PiTrophyBold, PiImagesBold, PiUsersThreeBold, PiTicketBold, PiShieldCheckBold, PiLockKeyBold, PiCurrencyCircleDollarBold, PiDiceFiveBold, PiChatCircleTextBold, PiMegaphoneBold, PiPaintBrushBold } from 'react-icons/pi'
import { useAuth } from '../../auth/AuthContext.jsx'
import { Spinner, useAdminApi } from './ui.jsx'

const TABS = [
  { to: 'yarislar', label: 'Yarışlar', icon: PiTrophyBold },
  { to: 'oyunlar', label: 'Oyunlar', icon: PiDiceFiveBold },
  { to: 'slider', label: 'Slider', icon: PiImagesBold },
  { to: 'istifadeciler', label: 'İstifadəçilər', icon: PiUsersThreeBold },
  { to: 'xeberler', label: 'Xəbər göndər', icon: PiMegaphoneBold },
  { to: 'reyler', label: 'Rəylər', icon: PiChatCircleTextBold, badge: 'feedback' },
  { to: 'qiymetler', label: 'Qiymətlər', icon: PiCurrencyCircleDollarBold },
  { to: 'promokodlar', label: 'Promokodlar', icon: PiTicketBold },
  { to: 'gorunus', label: 'Görünüş', icon: PiPaintBrushBold },
]

// Admin panel: yalnız ADMIN rolu. Server də hər sorğuda bunu yoxlayır — bu, yalnız ekran qoruyucusudur.
export default function AdminLayout() {
  const { user, checking } = useAuth()
  const unread = useUnreadFeedback(user?.role === 'ADMIN')

  if (checking) return <Spinner />
  if (!user) return <Navigate to={`/giris?next=${encodeURIComponent('/admin')}`} replace />
  if (user.role !== 'ADMIN') {
    return (
      <div className="max-w-[520px] mx-auto px-6 py-24 text-center">
        <PiLockKeyBold size={40} className="mx-auto text-inkdim mb-4" />
        <h1 className="font-display font-bold text-[1.6rem] mb-2">İcazə yoxdur</h1>
        <p className="text-inkdim">Bu səhifə yalnız adminlər üçündür.</p>
      </div>
    )
  }

  return (
    <section className="max-w-[1120px] mx-auto px-5 sm:px-7 py-10 sm:py-14">
      <div className="flex items-center gap-2.5 mb-6">
        <span className="w-10 h-10 rounded-xl bg-ink text-bg flex items-center justify-center">
          <PiShieldCheckBold size={20} />
        </span>
        <h1 className="font-display font-bold text-[1.6rem] sm:text-[2rem]">Admin panel</h1>
      </div>

      <nav className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-[0.9rem] transition-colors ${
                isActive ? 'bg-primary text-white shadow-cta' : 'bg-card border border-ink/10 text-inkdim hover:text-ink'
              }`
            }
          >
            <tab.icon size={17} /> {tab.label}
            {tab.badge === 'feedback' && unread > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-brand-pink text-white text-[0.72rem] flex items-center justify-center">{unread}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </section>
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
