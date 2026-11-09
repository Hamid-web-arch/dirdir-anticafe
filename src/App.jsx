import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import FloatingWhatsApp from './components/FloatingWhatsApp.jsx'
import GiftWheel from './components/GiftWheel.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import Home from './pages/Home.jsx'
import Arena from './pages/Arena.jsx'
import Sponsors from './pages/Sponsors.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Account from './pages/Account.jsx'
import Games, { GameDetails } from './pages/Games.jsx'
import SlideDetails from './pages/SlideDetails.jsx'
import NotFound from './pages/NotFound.jsx'
import { Spinner } from './pages/admin/ui.jsx'
import { useI18n } from './i18n/index.jsx'

// Admin panel ayrıca yüklənir — adi ziyarətçilər onun kodunu endirmir.
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'))
const AdminCompetitions = lazy(() => import('./pages/admin/Competitions.jsx'))
const AdminSlides = lazy(() => import('./pages/admin/Slides.jsx'))
const AdminUsers = lazy(() => import('./pages/admin/Users.jsx'))
const AdminPromos = lazy(() => import('./pages/admin/Promos.jsx'))
const AdminPrices = lazy(() => import('./pages/admin/Prices.jsx'))
const AdminGames = lazy(() => import('./pages/admin/Games.jsx'))
const AdminFeedback = lazy(() => import('./pages/admin/Feedback.jsx'))
const AdminAppearance = lazy(() => import('./pages/admin/Appearance.jsx'))
const AdminBroadcasts = lazy(() => import('./pages/admin/Broadcasts.jsx'))
const AdminAdmins = lazy(() => import('./pages/admin/Admins.jsx'))
const AdminStats = lazy(() => import('./pages/admin/Stats.jsx'))
const AdminProfile = lazy(() => import('./pages/admin/Profile.jsx'))
const AdminDailyReport = lazy(() => import('./pages/admin/DailyReport.jsx'))
const AdminWheel = lazy(() => import('./pages/admin/Wheel.jsx'))

export default function App() {
  const { t } = useI18n()
  // Admin panel tam ekrandır: saytın menyusu, footeri və WhatsApp düyməsi orada göstərilmir
  const isAdmin = useLocation().pathname.startsWith('/admin')
  return (
    <div className="font-body text-ink">
      <ScrollToTop />
      {/* Klaviatura və ekran oxuyucusu ilə gələnlər menyunu keçib birbaşa məzmuna gedə bilsin */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-primary focus:text-white focus:px-4 focus:py-2.5 focus:rounded-full focus:font-bold"
      >
        {t('nav.skip')}
      </a>
      {!isAdmin && <Navbar />}
      <main id="main" tabIndex={-1} className="outline-none">
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/arena" element={<Arena />} />
            <Route path="/sponsorlar" element={<Sponsors />} />
            <Route path="/giris" element={<Login />} />
            <Route path="/qeydiyyat" element={<Register />} />
            <Route path="/sifre-berpa" element={<ForgotPassword />} />
            <Route path="/hesabim" element={<Account />} />
            <Route path="/oyunlar" element={<Games />} />
            <Route path="/oyunlar/:id" element={<GameDetails />} />
            <Route path="/neler-var/:id" element={<SlideDetails />} />
            <Route path="/admin" element={<AdminLayout />}>
              {/* /admin — AdminLayout icazəli ilk bölməyə yönləndirir */}
              <Route index element={null} />
              <Route path="hesabat" element={<AdminDailyReport />} />
              <Route path="yarislar" element={<AdminCompetitions />} />
              <Route path="slider" element={<AdminSlides />} />
              <Route path="istifadeciler" element={<AdminUsers />} />
              <Route path="promokodlar" element={<AdminPromos />} />
              <Route path="qiymetler" element={<AdminPrices />} />
              <Route path="oyunlar" element={<AdminGames />} />
              <Route path="reyler" element={<AdminFeedback />} />
              <Route path="gorunus" element={<AdminAppearance />} />
              <Route path="xeberler" element={<AdminBroadcasts />} />
              <Route path="adminler" element={<AdminAdmins />} />
              <Route path="statistika" element={<AdminStats />} />
              <Route path="carx" element={<AdminWheel />} />
              <Route path="profil" element={<AdminProfile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdmin && (
        <>
          <Footer />
          <FloatingWhatsApp />
          <GiftWheel />
        </>
      )}
    </div>
  )
}
