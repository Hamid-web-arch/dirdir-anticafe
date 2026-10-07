import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import Home from './pages/Home.jsx'
import Arena from './pages/Arena.jsx'
import Sponsors from './pages/Sponsors.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Account from './pages/Account.jsx'

export default function App() {
  return (
    <div className="font-body text-ink">
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/sponsorlar" element={<Sponsors />} />
          <Route path="/giris" element={<Login />} />
          <Route path="/qeydiyyat" element={<Register />} />
          <Route path="/hesabim" element={<Account />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
