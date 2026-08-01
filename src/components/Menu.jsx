import { PiCheckBold } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { business } from '../data/business.js'

export default function Menu() {
  return (
    <section id="menu" className="bg-card border-y border-ink/10 py-20">
      <div className="max-w-[1120px] mx-auto px-7">
        <Reveal className="max-w-[640px] mb-12">
          <span className="inline-block text-[0.8rem] tracking-wide uppercase text-[#00806E] font-bold mb-3 bg-[#DEFBF5] px-3 py-1.5 rounded-full">
            Menyu
          </span>
          <h2 className="font-display font-bold text-[1.9rem] md:text-[2.5rem] mb-3">
            Saat haqqına daxil olanlar
          </h2>
          <p className="text-inkdim text-[1.03rem]">
            Konkret menyu itemlərini profildəki fotolara əsasən uydurmuruq — dəqiq siyahını Instagram-dakı story
            highlight-larından yoxlaya bilərsiniz.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {business.menuCategories.map((cat, i) => (
            <Reveal key={cat.title} delay={i * 70}>
              <div className="bg-bg border border-ink/10 rounded-2xl p-6 hover:-translate-y-1.5 hover:shadow-lg transition-all h-full">
                <div className="w-11 h-11 rounded-xl bg-[#DEFBF5] text-[#00806E] flex items-center justify-center mb-3.5">
                  <cat.icon size={22} />
                </div>
                <h3 className="font-display font-semibold text-[1.15rem] mb-2">{cat.title}</h3>
                <p className="text-[0.9rem] text-inkdim">{cat.note}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <span className="inline-flex items-center gap-2 mt-7 text-[0.85rem] text-[#00806E] font-bold bg-[#DEFBF5] px-4 py-2 rounded-full">
            <PiCheckBold size={16} />
            hamısı {business.pricePerHour}{business.currency}/saat qiymətinə daxildir
          </span>
        </Reveal>
      </div>
    </section>
  )
}
