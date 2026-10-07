import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { PiTrophyBold, PiSignOutBold, PiEnvelopeSimpleBold, PiPhoneBold, PiSpinnerBold } from 'react-icons/pi'
import Reveal from '../components/Reveal.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { api } from '../lib/api.js'

// "501234567" → "+994 50 123 45 67"
const formatPhone = (p) => `+994 ${p.slice(0, 2)} ${p.slice(2, 5)} ${p.slice(5, 7)} ${p.slice(7, 9)}`

export default function Account() {
  const { user, token, checking, logout } = useAuth()
  const [arena, setArena] = useState(null)

  useEffect(() => {
    if (!token) return
    api('/arena/me', { token })
      .then(setArena)
      .catch(() => setArena(null))
  }, [token])

  if (checking) {
    return (
      <div className="flex justify-center py-32 text-inkdim">
        <PiSpinnerBold size={28} className="animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/giris" replace />

  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div className="absolute w-[320px] h-[320px] bg-brand-orange/20 rounded-full blur-3xl -top-28 -right-24 pointer-events-none" />
      <div className="relative z-10 max-w-[720px] mx-auto px-5 sm:px-7">
        <Reveal>
          <div className="bg-card border border-ink/10 rounded-[28px] p-7 sm:p-10 shadow-lift">
            <div className="flex items-center gap-4 mb-8">
              <span className="w-16 h-16 shrink-0 rounded-full bg-primary text-white font-display font-bold text-[1.6rem] flex items-center justify-center">
                {user.firstName.charAt(0)}
              </span>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-[1.6rem] sm:text-[2rem] leading-tight truncate">
                  Salam, {user.firstName}!
                </h1>
                <p className="text-inkdim">
                  {user.firstName} {user.lastName}
                  {user.role === 'ADMIN' && (
                    <span className="ml-2 text-[0.75rem] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-purple-soft text-brand-purple-deep">
                      admin
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="rounded-2xl bg-ink text-white p-6">
                <div className="flex items-center gap-2 text-white/70 text-[0.85rem] font-semibold mb-2">
                  <PiTrophyBold size={16} /> Arena xalı
                </div>
                <div className="font-display font-bold text-[2.4rem] leading-none">{user.points}</div>
              </div>
              <div className="rounded-2xl bg-brand-orange-soft p-6">
                <div className="text-brand-orange-deep text-[0.85rem] font-semibold mb-2">Lövhədə yerin</div>
                <div className="font-display font-bold text-[2.4rem] leading-none">
                  {arena?.rank ? `#${arena.rank}` : '—'}
                </div>
                {!arena?.rank && (
                  <p className="text-[0.82rem] text-inkdim mt-2">İlk xalını qazan, lövhəyə düş.</p>
                )}
              </div>
            </div>

            <dl className="flex flex-col gap-3 text-[0.95rem] mb-8">
              <div className="flex items-center gap-3">
                <PiEnvelopeSimpleBold size={18} className="text-primary shrink-0" />
                <dt className="sr-only">Email</dt>
                <dd className="truncate">{user.email}</dd>
              </div>
              <div className="flex items-center gap-3">
                <PiPhoneBold size={18} className="text-primary shrink-0" />
                <dt className="sr-only">Telefon</dt>
                <dd>{formatPhone(user.phone)}</dd>
              </div>
            </dl>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/arena"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-bold text-[0.92rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover transition-all"
              >
                <PiTrophyBold size={18} /> Liderlər lövhəsi
              </Link>
              <button
                onClick={logout}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-bold text-[0.92rem] border-2 border-ink text-ink hover:bg-ink hover:text-white transition-all"
              >
                <PiSignOutBold size={18} /> Çıxış
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
