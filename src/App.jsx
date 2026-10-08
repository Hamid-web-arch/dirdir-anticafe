import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import Home from './pages/Home.jsx'
import Arena from './pages/Arena.jsx'
import Sponsors from './pages/Sponsors.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Account from './pages/Account.jsx'
import Games, { GameDetails } from './pages/Games.jsx'
import SlideDetails from './pages/SlideDetails.jsx'
import { Spinner } from './pages/admin/ui.jsx'

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

export default function App() {
  return (
    <div className="font-body text-ink">
      <ScrollToTop />
      <Navbar />
      <main>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/arena" element={<Arena />} />
            <Route path="/sponsorlar" element={<Sponsors />} />
            <Route path="/giris" element={<Login />} />
            <Route path="/qeydiyyat" element={<Register />} />
            <Route path="/hesabim" element={<Account />} />
            <Route path="/oyunlar" element={<Games />} />
            <Route path="/oyunlar/:id" element={<GameDetails />} />
            <Route path="/neler-var/:id" element={<SlideDetails />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="yarislar" replace />} />
              <Route path="yarislar" element={<AdminCompetitions />} />
              <Route path="slider" element={<AdminSlides />} />
              <Route path="istifadeciler" element={<AdminUsers />} />
              <Route path="promokodlar" element={<AdminPromos />} />
              <Route path="qiymetler" element={<AdminPrices />} />
              <Route path="oyunlar" element={<AdminGames />} />
              <Route path="reyler" element={<AdminFeedback />} />
              <Route path="gorunus" element={<AdminAppearance />} />
              <Route path="xeberler" element={<AdminBroadcasts />} />
            </Route>
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
