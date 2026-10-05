import {
  PiTrophy,
  PiCrown,
  PiMedal,
  PiGift,
  PiFlagCheckered,
  PiConfetti,
  PiMapPinLine,
  PiArmchair,
  PiDiceFive,
  PiForkKnife,
  PiShieldCheck,
  PiSteeringWheel,
  PiTicket,
  PiAirplaneTilt,
} from 'react-icons/pi'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal.jsx'
import { business } from '../data/business.js'

const top3 = [
  {
    rank: 1,
    name: 'Zar Ustası',
    points: 980,
    prize: '1 ay limitsiz giriş',
    icon: PiCrown,
    ring: 'border-medal-gold',
    badge: 'bg-medal-gold-soft text-medal-gold-deep',
    avatar: 'bg-medal-gold-soft text-medal-gold-deep',
  },
  {
    rank: 2,
    name: 'Kofe Kralı',
    points: 860,
    prize: '3 pulsuz saat',
    icon: PiMedal,
    ring: 'border-medal-silver',
    badge: 'bg-medal-silver-soft text-medal-silver-deep',
    avatar: 'bg-medal-silver-soft text-medal-silver-deep',
  },
  {
    rank: 3,
    name: 'Kino Gecəsi Ustası',
    points: 790,
    prize: 'Saat + desert pulsuz',
    icon: PiMedal,
    ring: 'border-medal-bronze',
    badge: 'bg-medal-bronze-soft text-medal-bronze-deep',
    avatar: 'bg-medal-bronze-soft text-medal-bronze-deep',
  },
]

const rest = [
  { rank: 4, name: 'Dalgona Ustası', points: 640 },
  { rank: 5, name: 'Domino Xanımı', points: 590 },
  { rank: 6, name: 'Şahmat Cəngavəri', points: 540 },
  { rank: 7, name: 'UNO Vurğunu', points: 505 },
  { rank: 8, name: 'Jenga Qəhrəmanı', points: 470 },
  { rank: 9, name: 'Tavla Tülküsü', points: 430 },
  { rank: 10, name: 'Yeni Üzv', points: 390 },
]

const maxRestPoints = Math.max(...rest.map((r) => r.points))

const gifts = [
  { icon: PiSteeringWheel, title: 'Kartinqdə yarış', desc: 'Adrenalin dolu kart yarışında sürət hissi.' },
  { icon: PiTicket, title: 'Librafdan kupon', desc: 'Kitab və yazı ləvazimatı üçün hədiyyə kuponu.' },
  { icon: PiAirplaneTilt, title: '2 nəfərlik tur', desc: 'Sevdiyinlə birgə yaddaqalan bir səyahət.' },
]

const steps = [
  { icon: PiMapPinLine, title: 'Məkana gəl', desc: 'DırDır Anticafe-yə addımla, saat işləməyə başlasın.' },
  { icon: PiArmchair, title: 'Zalda vaxt keçir', desc: 'Rahatla, dostlarınla otur, vaxtın sənindir.' },
  { icon: PiDiceFive, title: 'Oyunlar oyna', desc: 'Stolüstü oyun kolleksiyasından istədiyini seç.' },
  { icon: PiForkKnife, title: 'Limitsiz ye iç', desc: 'Çay, kofe, şirniyyat, sərin içki — hamısı limitsiz.' },
  { icon: PiShieldCheck, title: 'Liderliyini qoru', desc: 'Xal topla, lövhədə yerini qoru, mükafatı qazan.' },
]

export default function Arena() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div className="absolute w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] bg-brand-purple/20 rounded-full blur-3xl -top-28 -right-24 pointer-events-none" />
      <div className="absolute w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] bg-brand-orange/20 rounded-full blur-3xl -bottom-16 -left-16 pointer-events-none" />

      <div className="relative z-10 max-w-[880px] mx-auto px-6 sm:px-7 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-[0.78rem] sm:text-[0.8rem] tracking-wide uppercase text-brand-purple font-bold mb-5 bg-brand-purple-soft px-3.5 py-1.5 rounded-full">
            <PiTrophy size={16} /> Arena
          </span>
        </Reveal>

        <Reveal delay={60}>
          <h1 className="font-display font-bold text-[1.8rem] sm:text-[2.6rem] leading-[1.1] mb-3">
            Liderlər Lövhəsi
          </h1>
          <p className="text-inkdim text-[0.95rem] sm:text-[1.03rem] max-w-[52ch] mx-auto mb-3 px-1">
            İlk rəqabət hələ elan olunmayıb, amma lövhə belə görünəcək: ən çox xal toplayan
            ilk üç nəfər xüsusi mükafat qazanır.
          </p>
          <span className="inline-block text-[0.72rem] tracking-wide uppercase font-bold text-inkdim/70 border border-dashed border-ink/20 rounded-full px-3 py-1 mb-10 sm:mb-12">
            nümunə dizayn — real nəticələr deyil
          </span>
        </Reveal>

        {/* Podium */}
        <Reveal delay={120}>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-4 mb-6">
            {top3.map((p) => (
              <div
                key={p.rank}
                className={`flex-1 bg-card border-2 ${p.ring} rounded-2xl p-5 sm:p-6 relative
                  ${p.rank === 1 ? 'sm:order-2 sm:-translate-y-3 sm:pb-8 shadow-lift' : ''}
                  ${p.rank === 2 ? 'sm:order-1' : ''}
                  ${p.rank === 3 ? 'sm:order-3' : ''}
                `}
              >
                <span
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-[0.85rem] font-bold ${p.badge} border-2 border-card`}
                >
                  {p.rank}
                </span>
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center mb-3 mt-2 ${p.avatar}`}
                >
                  <p.icon size={p.rank === 1 ? 34 : 28} />
                </div>
                <h3 className="font-display font-bold text-[1.05rem] sm:text-[1.15rem] mb-1">{p.name}</h3>
                <p className="text-[0.82rem] text-inkdim font-semibold mb-3">{p.points} xal</p>
                <span className={`inline-flex items-center gap-1.5 text-[0.76rem] font-bold px-3 py-1.5 rounded-full ${p.badge}`}>
                  <PiGift size={14} /> {p.prize}
                </span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Ranks 4-10 */}
        <Reveal delay={180}>
          <div className="bg-card border border-ink/10 rounded-2xl p-2 sm:p-3 mb-16 sm:mb-20 text-left">
            {rest.map((r) => (
              <div
                key={r.rank}
                className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 border-b border-ink/5 last:border-none"
              >
                <span className="w-7 shrink-0 text-center text-[0.85rem] font-bold text-inkdim">{r.rank}</span>
                <span className="flex-1 font-semibold text-[0.92rem] truncate">{r.name}</span>
                <span className="hidden sm:block w-28 h-1.5 rounded-full bg-bg overflow-hidden shrink-0">
                  <span
                    className="block h-full rounded-full bg-brand-purple/60"
                    style={{ width: `${(r.points / maxRestPoints) * 100}%` }}
                  />
                </span>
                <span className="shrink-0 text-[0.85rem] font-bold text-inkdim w-14 text-right">{r.points} xal</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Gifts */}
        <Reveal delay={200}>
          <div className="mb-16 sm:mb-20">
            <p className="text-[0.78rem] tracking-wide uppercase text-inkdim font-bold mb-7">
              Hədiyyələr
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 text-left">
              {gifts.map((g) => (
                <div
                  key={g.title}
                  className="bg-card border border-ink/10 rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all"
                >
                  <div className="h-36 sm:h-40 bg-gradient-to-br from-brand-orange-soft to-brand-orange/20 text-brand-orange flex items-center justify-center">
                    <g.icon size={64} />
                  </div>
                  <div className="p-5 sm:p-6">
                    <h3 className="font-display font-semibold text-[1.05rem] mb-1.5">{g.title}</h3>
                    <p className="text-[0.85rem] text-inkdim">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div className="border-t border-ink/10 pt-10 sm:pt-12">
            <p className="text-[0.78rem] tracking-wide uppercase text-inkdim font-bold mb-7">
              Zirvəyə necə qalxmaq olar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 text-left mb-12">
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

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-3.5 justify-center">
              <a
                href={business.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-4 rounded-full font-bold text-[0.92rem] sm:text-[0.95rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover active:translate-y-0 transition-all"
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
          </div>
        </Reveal>
      </div>
    </section>
  )
}
