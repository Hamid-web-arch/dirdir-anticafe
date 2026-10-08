import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PiArrowLeftBold, PiSpinnerBold, PiWarningCircleBold } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { api, assetUrl } from '../lib/api.js'
import { useI18n } from '../i18n/index.jsx'

// Serverdən bir qeydi yükləyir: { data, failed }. path dəyişəndə yenidən yükləyir.
export function useApiItem(path, pick) {
  const [state, setState] = useState({ data: null, failed: false })
  useEffect(() => {
    let alive = true
    setState({ data: null, failed: false })
    api(path)
      .then((res) => alive && setState({ data: pick(res), failed: false }))
      .catch(() => alive && setState({ data: null, failed: true }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])
  return state
}

// Slayd və oyun səhifələrinin ümumi görünüşü: geri linki, böyük şəkil, başlıq, mətn.
export default function DetailPage({ state, backTo, backLabel, render }) {
  const { t } = useI18n()

  return (
    <section className="relative overflow-hidden py-10 sm:py-16">
      <div className="absolute w-[320px] h-[320px] bg-brand-orange/15 rounded-full blur-3xl -top-28 -right-24 pointer-events-none" />
      <div className="relative z-10 max-w-[960px] mx-auto px-5 sm:px-7">
        <Link to={backTo} className="inline-flex items-center gap-2 font-bold text-[0.92rem] text-inkdim hover:text-primary mb-6">
          <PiArrowLeftBold size={16} /> {backLabel}
        </Link>

        {state.failed ? (
          <div className="bg-card border border-ink/10 rounded-[24px] p-10 text-center">
            <PiWarningCircleBold size={36} className="mx-auto text-inkdim mb-3" />
            <p className="font-semibold text-inkdim">{t('pages.notFound')}</p>
          </div>
        ) : !state.data ? (
          <div className="flex justify-center py-24 text-inkdim">
            <PiSpinnerBold size={28} className="animate-spin" />
          </div>
        ) : (
          <Reveal>{render(state.data)}</Reveal>
        )}
      </div>
    </section>
  )
}

export function DetailImage({ src, alt, fit = 'cover' }) {
  return (
    <div className="relative aspect-[16/10] rounded-[24px] overflow-hidden bg-night mb-8">
      {fit === 'contain' && (
        <img src={assetUrl(src)} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60" />
      )}
      <img
        src={assetUrl(src)}
        alt={alt}
        className={`absolute inset-0 w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
      />
    </div>
  )
}

// Uzun mətn: boş sətirlə ayrılan hissələr abzas olur, tək sətir keçidləri saxlanır
export function RichText({ text }) {
  const paragraphs = (text ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return (
    <div className="flex flex-col gap-4 text-[1.02rem] leading-relaxed text-ink/90">
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  )
}
