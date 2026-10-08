import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PiUsersThreeBold, PiClockBold, PiCakeBold, PiDiceFive, PiSpinnerBold, PiArrowRightBold } from 'react-icons/pi'
import Reveal from '../components/Reveal.jsx'
import DetailPage, { useApiItem, DetailImage, RichText } from '../components/DetailPage.jsx'
import { api, apiEnabled, assetUrl } from '../lib/api.js'
import { useI18n } from '../i18n/index.jsx'

// Oyunun qısa məlumatı: neçə nəfər, nə qədər vaxt, yaş həddi
function GameFacts({ game, large }) {
  const { t } = useI18n()
  const facts = [
    game.players && { icon: PiUsersThreeBold, label: t('games.players'), value: game.players },
    game.duration && { icon: PiClockBold, label: t('games.duration'), value: game.duration },
    game.age && { icon: PiCakeBold, label: t('games.age'), value: game.age },
  ].filter(Boolean)
  if (facts.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {facts.map((f) => (
        <span
          key={f.label}
          title={f.label}
          className={`inline-flex items-center gap-1.5 rounded-full bg-brand-teal-soft text-brand-teal-deep font-bold ${
            large ? 'px-4 py-2 text-[0.92rem]' : 'px-2.5 py-1 text-[0.78rem]'
          }`}
        >
          <f.icon size={large ? 17 : 14} />
          {large && <span className="font-semibold opacity-80">{f.label}:</span>}
          {f.value}
        </span>
      ))}
    </div>
  )
}

// /oyunlar — admin paneldən əlavə olunan bütün oyunlar
export default function Games() {
  const { t, pick } = useI18n()
  const [games, setGames] = useState(null)

  useEffect(() => {
    if (!apiEnabled) return setGames([])
    api('/games')
      .then((d) => setGames(d.games))
      .catch(() => setGames([]))
  }, [])

  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <div className="absolute w-[360px] h-[360px] bg-brand-purple/15 rounded-full blur-3xl -top-28 -left-24 pointer-events-none" />
      <div className="relative z-10 max-w-[1120px] mx-auto px-5 sm:px-7">
        <Reveal className="max-w-[640px] mb-10">
          <span className="inline-block text-[0.8rem] tracking-wide uppercase text-brand-purple-deep font-bold mb-3 bg-brand-purple-soft px-3 py-1.5 rounded-full">
            {t('games.chip')}
          </span>
          <h1 className="font-display font-bold text-[2rem] md:text-[2.6rem] mb-3">{t('games.title')}</h1>
          <p className="text-inkdim text-[1.03rem]">{t('games.intro')}</p>
        </Reveal>

        {games === null ? (
          <div className="flex justify-center py-20 text-inkdim">
            <PiSpinnerBold size={28} className="animate-spin" />
          </div>
        ) : games.length === 0 ? (
          <div className="bg-card border border-dashed border-ink/15 rounded-[24px] p-10 text-center">
            <PiDiceFive size={40} className="mx-auto text-inkdim mb-3" />
            <p className="font-semibold text-inkdim">{t('games.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {games.map((game, i) => (
              <Reveal key={game.id} delay={(i % 3) * 60}>
                <Link
                  to={`/oyunlar/${game.id}`}
                  className="group h-full flex flex-col bg-card border border-ink/10 rounded-[22px] overflow-hidden hover:-translate-y-1 hover:shadow-lift transition-all"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-night">
                    <img
                      src={assetUrl(game.imageUrl)}
                      alt={pick(game.title)}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2.5 p-5 flex-1">
                    <h2 className="font-display font-bold text-[1.25rem] leading-tight">{pick(game.title)}</h2>
                    {pick(game.summary) && <p className="text-inkdim text-[0.92rem] line-clamp-3">{pick(game.summary)}</p>}
                    <div className="mt-auto pt-2 flex items-end justify-between gap-3">
                      <GameFacts game={game} />
                      <span className="shrink-0 inline-flex items-center gap-1 text-primary font-bold text-[0.88rem]">
                        {t('games.howToPlay')} <PiArrowRightBold size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// /oyunlar/:id — oyun haqqında: necə oynanılır
export function GameDetails() {
  const { id } = useParams()
  const { t, pick } = useI18n()
  const state = useApiItem(`/games/${id}`, (res) => res.game)

  return (
    <DetailPage
      state={state}
      backTo="/oyunlar"
      backLabel={t('games.back')}
      render={(game) => (
        <article>
          <DetailImage src={game.imageUrl} alt={pick(game.title)} />
          <h1 className="font-display font-bold text-[2rem] sm:text-[2.6rem] leading-tight mb-3">{pick(game.title)}</h1>
          {pick(game.summary) && <p className="text-inkdim text-[1.1rem] mb-5">{pick(game.summary)}</p>}
          <div className="mb-8">
            <GameFacts game={game} large />
          </div>
          {pick(game.howTo) && (
            <>
              <h2 className="font-display font-bold text-[1.4rem] mb-3">{t('games.howToPlay')}</h2>
              <RichText text={pick(game.howTo)} />
            </>
          )}
        </article>
      )}
    />
  )
}
