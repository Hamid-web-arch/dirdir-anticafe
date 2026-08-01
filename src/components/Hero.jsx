import { PiMapPin, PiFilmSlate } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { business } from '../data/business.js'

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-20 pb-16">
      <div className="absolute w-[380px] h-[380px] bg-brand-yellow/35 rounded-full blur-3xl -top-32 -right-20 pointer-events-none" />
      <div className="absolute w-[260px] h-[260px] bg-brand-teal/35 rounded-full blur-3xl -bottom-16 -left-16 pointer-events-none" />

      <div className="relative z-10 max-w-[1120px] mx-auto px-7 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <Reveal direction="left">
          <span className="inline-flex items-center gap-1.5 text-[0.82rem] tracking-wide uppercase text-brand-purple font-bold mb-5 bg-[#EFE9FF] px-3.5 py-1.5 rounded-full">
            <PiMapPin size={16} /> Sahil m. · saatı {business.pricePerHour}{business.currency}
          </span>
          <h1 className="font-display font-bold text-[2.5rem] sm:text-[3rem] md:text-[4rem] leading-[1.06] mb-5">
            Otur, oyna, dırdır et — <span className="text-brand-pink">saat sənindir</span>
          </h1>
          <p className="text-[1.12rem] text-inkdim max-w-[46ch] mb-8">
            {business.name}-də hər saat cəmi {business.pricePerHour}{business.currency}-dir və şirniyyat, çay, kofe,
            sərin içkilər limitsiz daxildir. Üstəlük stolüstü oyunlar və öz kino otağımız var.
          </p>
          <div className="flex gap-3.5 flex-wrap">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 px-7 sm:px-8 py-4 rounded-full font-bold text-[0.95rem] bg-brand-pink text-white shadow-[0_8px_20px_rgba(255,79,129,0.35)] hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(255,79,129,0.45)] active:translate-y-0 transition-all"
            >
              Qiymətə bax →
            </a>
            <a
              href={business.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-7 sm:px-8 py-4 rounded-full font-bold text-[0.95rem] border-2 border-ink text-ink hover:bg-ink hover:text-white active:scale-[0.98] transition-all"
            >
              Instagramda izlə
            </a>
          </div>

          <div className="flex gap-8 flex-wrap mt-10">
            <div>
              <strong className="block font-display text-[1.7rem] text-brand-purple">
                {business.pricePerHour}{business.currency}
              </strong>
              <span className="text-[0.82rem] text-inkdim font-semibold">/ saat, hər şey daxil</span>
            </div>
            <div>
              <strong className="block font-display text-[1.7rem] text-brand-purple">11–23</strong>
              <span className="text-[0.82rem] text-inkdim font-semibold">gündəlik iş saatları</span>
            </div>
            <div>
              <strong className="block font-display text-[1.7rem] text-brand-purple">
                <PiFilmSlate />
              </strong>
              <span className="text-[0.82rem] text-inkdim font-semibold">öz kino otağımız</span>
            </div>
          </div>
        </Reveal>

        <Reveal direction="right" delay={120} className="flex justify-center items-center order-first md:order-last">
          <SpinnerSignature price={business.pricePerHour} currency={business.currency} />
        </Reveal>
      </div>
    </section>
  )
}

function SpinnerSignature({ price, currency }) {
  return (
    <svg viewBox="0 0 340 340" width="320" height="320" className="drop-shadow-[0_6px_14px_rgba(29,43,36,0.25)]">
      <g className="origin-[170px_170px] animate-spin-slow">
        <circle cx="170" cy="170" r="150" fill="#fff" stroke="rgba(29,43,36,0.1)" strokeWidth="2" />
        <path d="M170,170 L170,20 A150,150 0 0,1 300,95 Z" fill="#FF4F81" />
        <path d="M170,170 L300,95 A150,150 0 0,1 300,245 Z" fill="#FFC839" />
        <path d="M170,170 L300,245 A150,150 0 0,1 170,320 Z" fill="#00BFA6" />
        <path d="M170,170 L170,320 A150,150 0 0,1 40,245 Z" fill="#7C5CFF" />
        <path d="M170,170 L40,245 A150,150 0 0,1 40,95 Z" fill="#FF9D4D" />
        <path d="M170,170 L40,95 A150,150 0 0,1 170,20 Z" fill="#4DD0E1" />
        <text x="170" y="70" textAnchor="middle" fontFamily="Fredoka" fontWeight="700" fontSize="22" fill="#fff">ÇAY</text>
        <text x="255" y="140" textAnchor="middle" fontFamily="Fredoka" fontWeight="700" fontSize="20" fill="#fff">KOFE</text>
        <text x="255" y="205" textAnchor="middle" fontFamily="Fredoka" fontWeight="700" fontSize="18" fill="#fff">KİNO</text>
        <text x="170" y="285" textAnchor="middle" fontFamily="Fredoka" fontWeight="700" fontSize="18" fill="#fff">OYUN</text>
        <text x="90" y="205" textAnchor="middle" fontFamily="Fredoka" fontWeight="700" fontSize="17" fill="#1D2B24">ŞİRNİ</text>
        <text x="90" y="140" textAnchor="middle" fontFamily="Fredoka" fontWeight="700" fontSize="14" fill="#1D2B24">SƏRİN İÇKİ</text>
      </g>
      <circle cx="170" cy="170" r="58" fill="#1D2B24" />
      <text x="170" y="163" textAnchor="middle" fontFamily="Fredoka" fontWeight="700" fontSize="26" fill="#fff">
        {price}{currency}
      </text>
      <text x="170" y="184" textAnchor="middle" fontFamily="Inter" fontWeight="600" fontSize="12" fill="#fff" opacity="0.8">
        / SAAT
      </text>
      <polygon points="170,96 160,116 180,116" fill="#1D2B24" />
    </svg>
  )
}
