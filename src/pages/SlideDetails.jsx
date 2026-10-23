import { useParams } from 'react-router-dom'
import DetailPage, { useApiItem, DetailImage, RichText } from '../components/DetailPage.jsx'
import { useI18n } from '../i18n/index.jsx'
import { assetUrl } from '../lib/api.js'
import { useSeo, pageTitle, excerpt } from '../lib/seo.js'

// "Nələr var?" slayderindəki "Ətraflı" — mətni admin paneldən yazılır.
export default function SlideDetails() {
  const { id } = useParams()
  const { t, pick } = useI18n()
  const state = useApiItem(`/slides/${id}`, (res) => res.slide)
  const slide = state.data
  useSeo(
    state.failed
      ? { title: t('seo.notFound.title'), noindex: true }
      : {
          title: slide && pageTitle(pick(slide.title)),
          description: slide && excerpt(pick(slide.desc) || pick(slide.body)),
          image: slide?.imageUrl && assetUrl(slide.imageUrl),
        },
  )

  return (
    <DetailPage
      state={state}
      backTo="/#neler-var"
      backLabel={t('pages.backHome')}
      render={(slide) => (
        <article>
          <DetailImage src={slide.imageUrl} alt={pick(slide.title)} fit={slide.fit} />
          <h1 className="font-display font-bold text-[2rem] sm:text-[2.6rem] leading-tight mb-3">{pick(slide.title)}</h1>
          {pick(slide.desc) && <p className="text-inkdim text-[1.1rem] mb-6">{pick(slide.desc)}</p>}
          <RichText text={pick(slide.body)} />
        </article>
      )}
    />
  )
}
