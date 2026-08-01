import { PiDiceFive, PiFilmSlate, PiCookie, PiCoffee } from 'react-icons/pi'
import Reveal from './Reveal.jsx'

export default function About() {
  return (
    <section id="about" className="bg-card border-y border-ink/10 py-20">
      <div className="max-w-[1120px] mx-auto px-7">
        <Reveal className="max-w-[640px] mb-12">
          <span className="inline-block text-[0.8rem] tracking-wide uppercase text-[#00806E] font-bold mb-3 bg-[#DEFBF5] px-3 py-1.5 rounded-full">
            Haqqımızda
          </span>
          <h2 className="font-display font-bold text-[1.9rem] md:text-[2.5rem] mb-3">
            Konsepsiya sadədir: vaxtını sifariş et
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-14 items-start">
          <Reveal direction="left">
            <p className="font-display font-semibold text-[1.4rem] bg-[#FFF3E0] rounded-2xl px-6 py-5 mb-6 relative">
              <span className="text-brand-yellow font-display text-4xl absolute -top-1 left-3">&ldquo;</span>
              <span className="relative">Qidalanmaq üçün yox, ünsiyyət üçün gəldiyin yer.</span>
            </p>
            <p className="text-inkdim mb-4">
              DırDır Anticafe — klassik kafedən fərqli olaraq, menyudan sifariş vermirsən. Sadəcə qapıdan
              girirsən, saat işləməyə başlayır, sən isə çay, kofe, şirniyyat və sərin içkiləri istədiyin qədər
              götürürsən.
            </p>
          </Reveal>

          <Reveal direction="right" delay={100}>
            <p className="text-inkdim mb-4">
              Stolüstü oyun sevənlər üçün geniş kolleksiya, filmə baxmaq istəyənlər üçün ayrıca kino otağı var.
              Böyük qrupla gəlirsinizsə, yer saxlamaq üçün Instagram-dan DM yazmaq kifayətdir.
            </p>
            <div className="flex gap-2.5 flex-wrap mt-5">
              <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-bold px-3.5 py-2 rounded-full bg-[#FFE3EC] text-brand-pink">
                <PiDiceFive size={16} /> Stolüstü oyunlar
              </span>
              <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-bold px-3.5 py-2 rounded-full bg-[#E9E3FF] text-brand-purple">
                <PiFilmSlate size={16} /> Kino otağı
              </span>
              <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-bold px-3.5 py-2 rounded-full bg-[#DEFBF5] text-[#00806E]">
                <PiCookie size={16} /> Limitsiz şirniyyat
              </span>
              <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-bold px-3.5 py-2 rounded-full bg-[#FFF3CC] text-[#946E00]">
                <PiCoffee size={16} /> Çay & Kofe
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
