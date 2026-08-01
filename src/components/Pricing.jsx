import { PiCheckCircleFill } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { business } from '../data/business.js'

export default function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="max-w-[1120px] mx-auto px-7">
        <Reveal className="max-w-[640px] mb-12">
          <span className="inline-block text-[0.8rem] tracking-wide uppercase text-[#00806E] font-bold mb-3 bg-[#DEFBF5] px-3 py-1.5 rounded-full">
            Qiymət
          </span>
          <h2 className="font-display font-bold text-[1.9rem] md:text-[2.5rem] mb-3">
            Bir qiymət, hər şey daxil
          </h2>
        </Reveal>

        <Reveal>
          <div className="relative overflow-hidden rounded-[28px] p-8 md:p-12 text-white grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-9 items-center bg-gradient-to-br from-brand-purple to-brand-pink">
            <div className="absolute w-[260px] h-[260px] bg-white/10 rounded-full -top-24 -right-16" />
            <div className="relative z-10">
              <h3 className="font-display font-bold text-[1.6rem] mb-3">Saatı {business.pricePerHour}{business.currency} — nöqtə.</h3>
              <p className="opacity-90 mb-6 max-w-[44ch]">
                Əlavə menyu, gizli xərc, çaşdırıcı paket yoxdur. Ödədiyin saatın içinə hər şey daxildir:
              </p>
              <ul className="flex flex-col gap-2.5">
                {business.included.map((item, i) => (
                  <li key={item}>
                    <Reveal direction="left" delay={i * 60} className="flex gap-2.5 items-start font-medium">
                      <PiCheckCircleFill className="text-brand-yellow shrink-0 mt-0.5" size={18} />
                      {item}
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative z-10 bg-white/15 border border-white/30 rounded-[20px] p-8 text-center">
              <div className="font-display font-bold text-[3.2rem] leading-none">
                {business.pricePerHour}{business.currency}
                <sup className="text-[1.1rem] font-semibold">/saat</sup>
              </div>
              <div className="text-[0.85rem] opacity-85 font-semibold mt-2">nəfər başına</div>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <p className="text-center mt-6 text-inkdim text-[0.88rem]">
            Qrup endirimləri və rezervasiya şərtləri üçün birbaşa Instagram DM-dən soruşun — güncəl məlumat
            həmişə profildə olur.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
