import { PiMapPin, PiWhatsappLogoBold, PiInstagramLogoBold, PiArrowUpRightBold } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { business, whatsappUrl, whatsappDisplay } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'

export default function Contact() {
  const { t } = useI18n()

  return (
    <section id="contact" className="bg-card border-t border-ink/10 py-24">
      <div className="max-w-[1120px] mx-auto px-7 grid grid-cols-1 md:grid-cols-2 gap-12">
        <Reveal>
          <span className="inline-block text-[0.8rem] tracking-wide uppercase text-brand-teal-deep font-bold mb-3 bg-brand-teal-soft px-3 py-1.5 rounded-full">
            {t('contact.chip')}
          </span>
          <h2 className="font-display font-bold text-[2rem] mt-2 mb-7">{t('contact.title')}</h2>

          <InfoBlock label={t('contact.address')} value={t('contact.addressValue')} />
          <InfoBlock label={t('contact.hours')} value={business.hours} />

          {/* Əlaqə kartları: WhatsApp (rezervasiya) və Instagram (yeniliklər) — eyni görünüşdə */}
          <div className="flex flex-col gap-3 mt-2 max-w-[420px]">
            <ContactCard
              href={whatsappUrl()}
              icon={<PiWhatsappLogoBold size={24} />}
              iconClass="bg-[#25D366]"
              label="WhatsApp"
              value={whatsappDisplay}
              note={t('contact.whatsappNote')}
            />
            <ContactCard
              href={business.instagramUrl}
              icon={<PiInstagramLogoBold size={24} />}
              iconClass="bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5]"
              label="Instagram"
              value={business.instagramHandle}
              note={t('contact.instagramNote')}
            />
          </div>
        </Reveal>

        <Reveal>
          <div className="relative rounded-[20px] overflow-hidden border border-ink/10 min-h-[340px] h-full">
            <iframe
              src={business.mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={t('contact.mapTitle')}
              // Google koordinatla açılan xəritənin yuxarısında boş "məkan məlumatı" qutusu göstərir —
              // xəritəni 90px yuxarı sürüşdürüb o qutunu çərçivədən kənarda saxlayırıq.
              className="absolute left-0 -top-[90px] w-full h-[calc(100%+90px)] border-0"
            />
            <a
              href={business.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute top-4 right-4 inline-flex items-center gap-1.5 bg-card/95 backdrop-blur text-ink text-[0.82rem] font-bold px-3.5 py-2 rounded-full shadow-md border border-ink/10 hover:bg-accent hover:text-white transition-colors"
            >
              <PiMapPin size={15} /> {t('contact.openMaps')}
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

function ContactCard({ href, icon, iconClass, label, value, note }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3.5 rounded-2xl border border-ink/10 bg-bg p-4 hover:border-ink/25 hover:-translate-y-0.5 hover:shadow-md transition-all"
    >
      <span className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0 ${iconClass}`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[0.75rem] tracking-wide uppercase text-brand-teal font-bold">{label}</span>
        <span className="block font-bold text-[1rem] truncate">{value}</span>
        <span className="block text-[0.8rem] text-inkdim">{note}</span>
      </span>
      <PiArrowUpRightBold size={18} className="shrink-0 text-inkdim group-hover:text-primary transition-colors" />
    </a>
  )
}
