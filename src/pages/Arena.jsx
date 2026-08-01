import {
  PiTrophy,
  PiHourglassMedium,
  PiFlagCheckered,
  PiConfetti,
  PiInstagramLogo,
  PiBellRinging,
  PiGameController,
} from 'react-icons/pi'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal.jsx'
import { business } from '../data/business.js'

const steps = [
  { icon: PiInstagramLogo, title: 'Instagramı izlə', desc: '@dirdiranticafe profilini izləyən ilk bilən olur.' },
  { icon: PiBellRinging, title: 'Elanı gözlə', desc: 'Tarix, qayda və mükafat story-də elan olunacaq.' },
  { icon: PiGameController, title: 'Meydana çıx', desc: 'Qeydiyyatdan keç, gəl, dırdırı qazan.' },
]

export default function Arena() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="absolute w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] bg-brand-purple/20 rounded-full blur-3xl -top-28 -right-24 pointer-events-none" />
      <div className="absolute w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] bg-brand-pink/20 rounded-full blur-3xl -bottom-16 -left-16 pointer-events-none" />

      <div className="relative z-10 max-w-[720px] mx-auto px-6 sm:px-7 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-[0.78rem] sm:text-[0.8rem] tracking-wide uppercase text-brand-purple font-bold mb-6 bg-[#EFE9FF] px-3.5 py-1.5 rounded-full">
            <PiTrophy size={16} /> Arena
          </span>
        </Reveal>

        <Reveal delay={80}>
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-7">
            <div className="absolute inset-0 rounded-full bg-brand-purple/10 animate-pulse" />
            <div className="relative w-full h-full rounded-full bg-white border border-ink/10 flex items-center justify-center shadow-[0_10px_24px_rgba(124,92,255,0.18)]">
              <PiHourglassMedium size={36} className="text-brand-purple" />
            </div>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <h1 className="font-display font-bold text-[1.8rem] sm:text-[2.6rem] leading-[1.1] mb-4">
            Hələlik meydan boşdur
          </h1>
          <p className="text-inkdim text-[0.98rem] sm:text-[1.05rem] max-w-[46ch] mx-auto mb-3 px-1">
            Zar atılsın, pult əldən çıxsın, kim uduzsa hesabı ödəsin — belə bir yarış hələ elan
            olunmayıb. Amma Arena artıq açıqdır və növbəti dırdır döyüşü lap yaxındadır.
          </p>
          <p className="text-inkdim text-[0.9rem] sm:text-[0.95rem] max-w-[42ch] mx-auto mb-9 px-1">
            İlk turnir elan olunanda tarixi, qaydaları və mükafatı buradan görəcəksən — hələlik
            yer sənə qalıb, gözlə.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-3.5 justify-center mb-16 sm:mb-20">
            <a
              href={business.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-4 rounded-full font-bold text-[0.92rem] sm:text-[0.95rem] bg-brand-pink text-white shadow-[0_8px_20px_rgba(255,79,129,0.35)] hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(255,79,129,0.45)] active:translate-y-0 transition-all"
            >
              <PiConfetti size={18} className="shrink-0" /> Elandan xəbərdar ol
            </a>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-4 rounded-full font-bold text-[0.92rem] sm:text-[0.95rem] border-2 border-ink text-ink hover:bg-ink hover:text-white active:scale-[0.98] transition-all"
            >
              <PiFlagCheckered size={18} className="shrink-0" /> Ana səhifəyə qayıt
            </Link>
          </div>
        </Reveal>

        <Reveal delay={260}>
          <div className="border-t border-ink/10 pt-10 sm:pt-12">
            <p className="text-[0.78rem] tracking-wide uppercase text-inkdim font-bold mb-7">
              Necə işləyəcək
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 text-left">
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className="relative bg-card border border-dashed border-ink/15 rounded-2xl p-5 sm:p-6"
                >
                  <span className="absolute -top-3 -left-2 w-7 h-7 rounded-full bg-brand-purple text-white text-[0.78rem] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <s.icon size={22} className="text-brand-purple mb-3" />
                  <h3 className="font-display font-semibold text-[1rem] mb-1">{s.title}</h3>
                  <p className="text-[0.85rem] text-inkdim">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
