import { PiMapPin } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { business } from '../data/business.js'

export default function Contact() {
  return (
    <section id="contact" className="bg-card border-t border-ink/10 py-24">
      <div className="max-w-[1120px] mx-auto px-7 grid grid-cols-1 md:grid-cols-2 gap-12">
        <Reveal>
          <span className="inline-block text-[0.8rem] tracking-wide uppercase text-[#00806E] font-bold mb-3 bg-[#DEFBF5] px-3 py-1.5 rounded-full">
            Əlaqə
          </span>
          <h2 className="font-display font-bold text-[2rem] mt-2 mb-7">Gəlməzdən əvvəl DM at</h2>

          <InfoBlock label="Ünvan" value={business.address} />
          <InfoBlock label="İş saatları" value={business.hours} />
          <InfoBlock label="Rezervasiya" value={business.reservation} />

          <div className="mb-6">
            <div className="text-[0.78rem] tracking-wide uppercase text-brand-teal font-bold mb-1.5">
              Instagram
            </div>
            <div className="text-[1.05rem] font-medium">
              <a href={business.instagramUrl} target="_blank" rel="noreferrer" className="text-brand-pink font-bold">
                {business.instagramHandle}
              </a>
            </div>
            <div className="flex gap-3.5 mt-2">
              <a
                href={business.instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-11 h-11 rounded-full border border-ink/15 flex items-center justify-center text-inkdim hover:border-brand-pink hover:text-brand-pink hover:bg-[#FFE3EC] hover:-translate-y-1 transition-all"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" />
                </svg>
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="relative rounded-[20px] overflow-hidden border border-ink/10 min-h-[340px] h-full">
            <iframe
              src={business.mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="DırDır Anticafe xəritədə"
              className="w-full h-full min-h-[340px] border-0"
            />
            <a
              href={business.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute top-4 right-4 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur text-ink text-[0.82rem] font-bold px-3.5 py-2 rounded-full shadow-md border border-ink/10 hover:bg-brand-pink hover:text-white transition-colors"
            >
              <PiMapPin size={15} /> Google Maps-də aç
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function InfoBlock({ label, value }) {
  return (
    <div className="mb-6">
      <div className="text-[0.78rem] tracking-wide uppercase text-brand-teal font-bold mb-1.5">{label}</div>
      <div className="text-[1.05rem] font-medium">{value}</div>
    </div>
  )
}
