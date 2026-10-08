import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PiTrophy,
  PiCrown,
  PiMedal,
  PiFlagCheckered,
  PiConfetti,
  PiUserPlus,
  PiUsersThree,
  PiDiceFive,
  PiCalendarBlank,
  PiUsersThreeBold,
  PiSignInBold,
  PiSpinnerBold,
  PiWarningCircleBold,
  PiCheckCircleFill,
  PiGift,
} from 'react-icons/pi'
import Reveal from '../components/Reveal.jsx'
import { business } from '../data/business.js'
import { api, apiEnabled } from '../lib/api.js'
import { fieldMessage } from '../lib/forms.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useI18n } from '../i18n/index.jsx'

// Pyedestal üslubu yerə görə (1-ci ortada və hündür)
const MEDALS = [
  { icon: PiCrown, ring: 'border-medal-gold', soft: 'bg-medal-gold-soft text-medal-gold-deep', order: 'sm:order-2 sm:-translate-y-3 sm:pb-8 shadow-lift' },
  { icon: PiMedal, ring: 'border-medal-silver', soft: 'bg-medal-silver-soft text-medal-silver-deep', order: 'sm:order-1' },
  { icon: PiMedal, ring: 'border-medal-bronze', soft: 'bg-medal-bronze-soft text-medal-bronze-deep', order: 'sm:order-3' },
]
const STEP_ICONS = [PiUserPlus, PiUsersThree, PiDiceFive, PiTrophy]
const STATUS_STYLE = {
  ONGOING: 'bg-brand-teal-soft text-brand-teal-deep',
  UPCOMING: 'bg-brand-purple-soft text-brand-purple-deep',
  FINISHED: 'bg-ink/5 text-inkdim',
}

export default function Arena() {
  const { t } = useI18n()
  const { token } = useAuth()
  const [list, setList] = useState(null) // null = yüklənir
  const [failed, setFailed] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const loadList = useCallback(() => {
    if (!apiEnabled) return setList([])
    setFailed(false)
    api('/competitions', { token })
      .then((d) => {
        setList(d.competitions)
        setSelectedId((id) => (d.competitions.some((c) => c.id === id) ? id : d.competitions[0]?.id ?? null))
      })
      .catch(() => setFailed(true))
  }, [token])

  useEffect(loadList, [loadList])

  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div className="absolute w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] bg-brand-purple/20 rounded-full blur-3xl -top-28 -right-24 pointer-events-none" />
      <div className="absolute w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] bg-brand-orange/20 rounded-full blur-3xl -bottom-16 -left-16 pointer-events-none" />

      <div className="relative z-10 max-w-[880px] mx-auto px-6 sm:px-7 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-[0.78rem] sm:text-[0.8rem] tracking-wide uppercase text-brand-purple font-bold mb-5 bg-brand-purple-soft px-3.5 py-1.5 rounded-full">
            <PiTrophy size={16} /> {t('arena.chip')}
          </span>
        </Reveal>
        <Reveal delay={60}>
          <h1 className="font-display font-bold text-[1.8rem] sm:text-[2.6rem] leading-[1.1] mb-3">{t('arena.title')}</h1>
          <p className="text-inkdim text-[0.95rem] sm:text-[1.03rem] max-w-[52ch] mx-auto mb-10 sm:mb-12 px-1">{t('arena.intro')}</p>
        </Reveal>

        {failed ? (
          <StateCard icon={PiWarningCircleBold} title={t('arena.loadError')}>
            <button onClick={loadList} className="mt-4 font-bold text-primary hover:underline">
              {t('arena.retry')}
            </button>
          </StateCard>
        ) : list === null ? (
          <div className="flex justify-center py-16 text-inkdim">
            <PiSpinnerBold size={28} className="animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <StateCard icon={PiTrophy} title={t('arena.emptyTitle')} text={t('arena.emptyText')}>
            <a
              href={business.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-bold text-[0.92rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 transition-all"
            >
              <PiConfetti size={18} /> {t('arena.followCta')}
            </a>
          </StateCard>
        ) : (
          <>
            {list.length > 1 && <CompetitionTabs list={list} selectedId={selectedId} onSelect={setSelectedId} />}
            {selectedId && <CompetitionView key={selectedId} id={selectedId} onChanged={loadList} />}
          </>
        )}

        <Steps />
      </div>
    </section>
  )
}

function StateCard({ icon: Icon, title, text, children }) {
  return (
    <Reveal>
      <div className="bg-card border border-ink/10 rounded-[24px] px-6 py-12 mb-16 sm:mb-20">
        <span className="w-16 h-16 mx-auto rounded-full bg-brand-purple-soft text-brand-purple flex items-center justify-center mb-4">
          <Icon size={30} />
        </span>
        <h2 className="font-display font-bold text-[1.4rem] mb-2">{title}</h2>
        {text && <p className="text-inkdim max-w-[44ch] mx-auto">{text}</p>}
        {children}
      </div>
    </Reveal>
  )
}

function StatusBadge({ status }) {
  const { t } = useI18n()
  return (
    <span className={`inline-flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${STATUS_STYLE[status]}`}>
      {status === 'ONGOING' && <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />}
      {t(`arena.status.${status}`)}
    </span>
  )
}

function CompetitionTabs({ list, selectedId, onSelect }) {
  const { t, pick } = useI18n()
  return (
    <div role="tablist" aria-label={t('arena.competitions')} className="flex gap-2.5 overflow-x-auto pb-2 mb-6 -mx-1 px-1 text-left">
      {list.map((c) => (
        <button
          key={c.id}
          role="tab"
          aria-selected={c.id === selectedId}
          onClick={() => onSelect(c.id)}
          className={`shrink-0 flex flex-col gap-1.5 items-start rounded-2xl border-2 px-4 py-3 transition-all ${
            c.id === selectedId ? 'border-primary bg-card shadow-lift' : 'border-ink/10 bg-card/60 hover:border-ink/25'
          }`}
        >
          <span className="font-display font-bold text-[0.98rem] max-w-[14rem] truncate">{pick(c.title)}</span>
          <StatusBadge status={c.status} />
        </button>
      ))}
    </div>
  )
}

function CompetitionView({ id, onChanged }) {
  const { t, pick, date } = useI18n()
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [period, setPeriod] = useState('all')

  const load = useCallback(() => {
    setFailed(false)
    api(`/competitions/${id}?period=${period}`, { token })
      .then(setData)
      .catch(() => setFailed(true))
  }, [id, token, period])

  useEffect(load, [load])

  if (failed) {
    return (
      <StateCard icon={PiWarningCircleBold} title={t('arena.loadError')}>
        <button onClick={load} className="mt-4 font-bold text-primary hover:underline">
          {t('arena.retry')}
        </button>
      </StateCard>
    )
  }
  if (!data) {
    return (
      <div className="flex justify-center py-16 text-inkdim">
        <PiSpinnerBold size={28} className="animate-spin" />
      </div>
    )
  }

  const { competition: c, leaderboard } = data
  const refresh = () => {
    load()
    onChanged()
  }
  const description = pick(c.description)
  const spotsLeft = c.maxTeams != null ? Math.max(0, c.maxTeams - c.teamCount) : null

  return (
    <>
      <Reveal>
        <div className="bg-card border border-ink/10 rounded-[24px] p-6 sm:p-8 mb-8 text-left">
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <StatusBadge status={c.status} />
            <span className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-inkdim">
              <PiCalendarBlank size={16} />
              {date(c.startsAt, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-inkdim">
              <PiUsersThreeBold size={16} />
              {t('units.teams', { count: c.teamCount })}
              {spotsLeft != null && spotsLeft > 0 && c.status !== 'FINISHED' && ` · ${t('units.spotsLeft', { count: spotsLeft })}`}
            </span>
          </div>
          <h2 className="font-display font-bold text-[1.5rem] sm:text-[1.9rem] leading-tight mb-2">{pick(c.title)}</h2>
          {description && <p className="text-inkdim whitespace-pre-line mb-2">{description}</p>}
          <JoinPanel competition={c} onChanged={refresh} />
        </div>
      </Reveal>

      <Prizes prizes={c.prizes} />

      {leaderboard.length > 0 && <PeriodTabs period={period} onChange={setPeriod} since={data.periodStart} />}
      <Leaderboard
        leaderboard={leaderboard}
        myTeamId={c.myTeam?.id}
        // Dövr dəyişib, yeni lövhə hələ gəlməyib — köhnəsini solğun göstəririk
        stale={data.period !== period}
        emptyPeriod={data.period !== 'all' && leaderboard.every((r) => r.points === 0)}
      />
    </>
  )
}

function JoinPanel({ competition: c, onChanged }) {
  const i18n = useI18n()
  const { t, errorText } = i18n
  const { user, token } = useAuth()
  const [open, setOpen] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [clientError, setClientError] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  const panel = 'mt-5 rounded-2xl p-4 sm:p-5'

  if (c.myTeam) {
    const leave = async () => {
      setBusy(true)
      try {
        await api(`/competitions/${c.id}/join`, { method: 'DELETE', token })
        onChanged()
      } catch (err) {
        setServerError(err)
        setConfirmLeave(false)
      } finally {
        setBusy(false)
      }
    }

    return (
      <div className={`${panel} bg-brand-orange-soft flex flex-col sm:flex-row sm:items-center gap-3`}>
        <PiCheckCircleFill size={26} className="text-primary shrink-0" />
        <div className="flex-1">
          <div className="text-[0.8rem] font-bold uppercase tracking-wide text-brand-orange-deep">{t('arena.yourTeam')}</div>
          <div className="font-display font-bold text-[1.2rem] break-words">
            {c.myTeam.name} · <span className="text-primary">{t('units.points', { count: c.myTeam.points })}</span>
          </div>
          {serverError && <p className="text-[0.85rem] font-semibold text-brand-pink-deep mt-1">{errorText(serverError)}</p>}
        </div>
        {c.canLeave &&
          (confirmLeave ? (
            <div className="flex flex-col gap-2 sm:items-end">
              <span className="text-[0.85rem] font-semibold">{t('arena.leaveConfirm')}</span>
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={leave}
                  className="px-4 py-2 rounded-full font-bold text-[0.85rem] bg-ink text-bg hover:bg-brand-pink-deep disabled:opacity-60"
                >
                  {t('arena.leaveYes')}
                </button>
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="px-4 py-2 rounded-full font-bold text-[0.85rem] border-2 border-ink/20"
                >
                  {t('arena.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="text-[0.85rem] font-bold text-inkdim hover:text-brand-pink-deep underline-offset-2 hover:underline"
            >
              {t('arena.leave')}
            </button>
          ))}
      </div>
    )
  }

  if (!c.canJoin) {
    return (
      <div className={`${panel} bg-ink/5 text-inkdim font-semibold`}>
        {c.isFull ? t('arena.full') : t('arena.registrationClosed')}
      </div>
    )
  }

  // Yarışa yalnız hesabı olanlar qoşula bilər — girişdən sonra Arena-ya qayıdır.
  if (!user) {
    return (
      <Link
        to={`/giris?next=${encodeURIComponent('/arena')}`}
        className="mt-5 inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-[0.92rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover transition-all"
      >
        <PiSignInBold size={18} /> {t('arena.loginToJoin')}
      </Link>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-5 inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-[0.92rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover transition-all"
      >
        <PiUserPlus size={18} /> {t('arena.join')}
      </button>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    const name = teamName.trim().replace(/\s+/g, ' ')
    if (name.length < 2 || name.length > 40) return setClientError({ key: 'validation.teamName' })
    setBusy(true)
    try {
      await api(`/competitions/${c.id}/join`, { method: 'POST', body: { teamName: name }, token })
      onChanged()
    } catch (err) {
      setServerError(err)
    } finally {
      setBusy(false)
    }
  }

  const fieldError = fieldMessage('teamName', clientError ? { teamName: clientError } : {}, serverError, i18n)
  const generalError = serverError && !fieldError ? errorText(serverError) : null

  return (
    <form onSubmit={submit} className={`${panel} bg-bg border border-ink/10 flex flex-col gap-3`} noValidate>
      <label htmlFor="team-name" className="font-display font-bold text-[1.05rem]">
        {t('arena.joinTitle')}
      </label>
      <div className="flex flex-col sm:flex-row gap-2.5">
        <input
          id="team-name"
          autoFocus
          value={teamName}
          maxLength={40}
          onChange={(e) => {
            setTeamName(e.target.value)
            setClientError(null)
            setServerError(null)
          }}
          placeholder={t('arena.teamNamePlaceholder')}
          aria-label={t('arena.teamName')}
          aria-invalid={Boolean(fieldError)}
          className={`flex-1 min-w-0 bg-card border-2 rounded-full px-5 py-3 font-semibold outline-none transition-colors ${
            fieldError ? 'border-brand-pink' : 'border-ink/15 focus:border-primary'
          }`}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-[0.92rem] bg-primary text-white disabled:opacity-60"
          >
            {busy && <PiSpinnerBold size={16} className="animate-spin" />} {t('arena.join')}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-5 py-3 rounded-full font-bold text-[0.92rem] border-2 border-ink/20 hover:border-ink"
          >
            {t('arena.cancel')}
          </button>
        </div>
      </div>
      {(fieldError || generalError) && (
        <p className="text-[0.85rem] font-semibold text-brand-pink-deep">{fieldError || generalError}</p>
      )}
    </form>
  )
}

// "1-ci yer", "1st place", "1 место". Azərbaycan dilində şəkilçi son rəqəmin səsinə uyğunlaşır.
const AZ_UNITS = { 1: 'ci', 2: 'ci', 3: 'cü', 4: 'cü', 5: 'ci', 6: 'cı', 7: 'ci', 8: 'ci', 9: 'cu' }
const AZ_TENS = { 1: 'cu', 2: 'ci', 3: 'cu', 4: 'cı', 5: 'ci', 6: 'cı', 7: 'ci', 8: 'ci', 9: 'cı' }

function placeLabel(lang, n) {
  if (lang === 'ru') return `${n} место`
  if (lang === 'en') {
    const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'
    return `${n}${suffix} place`
  }
  const suffix = n % 10 ? AZ_UNITS[n % 10] : n % 100 ? AZ_TENS[(n % 100) / 10] : 'cü'
  return `${n}-${suffix} yer`
}

function Prizes({ prizes }) {
  const { t, pick, lang } = useI18n()
  if (!prizes?.length) return null

  return (
    <Reveal>
      <div className="mb-10 text-left">
        <h3 className="inline-flex items-center gap-2 font-display font-bold text-[1.3rem] sm:text-[1.5rem] mb-4">
          <PiGift size={24} className="text-primary" /> {t('arena.prizesTitle')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {prizes.map((prize) => {
            const medal = MEDALS[prize.place - 1]
            const Icon = medal?.icon ?? PiGift
            return (
              <div
                key={prize.place}
                className={`flex items-center gap-3.5 bg-card rounded-2xl p-4 border-2 ${medal ? medal.ring : 'border-ink/10'}`}
              >
                <span
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    medal ? medal.soft : 'bg-ink/5 text-inkdim'
                  }`}
                >
                  <Icon size={22} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.78rem] font-bold uppercase tracking-wide text-inkdim">
                    {placeLabel(lang, prize.place)}
                  </span>
                  <span className="block font-display font-bold text-[1.05rem] leading-snug break-words">{pick(prize.title)}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Reveal>
  )
}

const PERIODS = ['week', 'month', 'all']

function PeriodTabs({ period, onChange, since }) {
  const { t, date } = useI18n()
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <div
        role="tablist"
        aria-label={t('arena.periodLabel')}
        className="inline-flex self-start bg-card border border-ink/10 rounded-full p-1"
      >
        {PERIODS.map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={period === p}
            onClick={() => onChange(p)}
            className={`px-4 sm:px-5 py-2 rounded-full font-bold text-[0.88rem] transition-colors ${
              period === p ? 'bg-primary text-white shadow-cta' : 'text-inkdim hover:text-ink'
            }`}
          >
            {t(`arena.periods.${p}`)}
          </button>
        ))}
      </div>
      {period !== 'all' && since && (
        <span className="text-[0.85rem] font-semibold text-inkdim">
          {t('arena.periodSince', { date: date(since, { day: 'numeric', month: 'long' }) })}
        </span>
      )}
    </div>
  )
}

function Leaderboard({ leaderboard, myTeamId, stale, emptyPeriod }) {
  const { t } = useI18n()

  if (leaderboard.length === 0) {
    return (
      <Reveal>
        <p className="bg-card border border-dashed border-ink/15 rounded-2xl px-6 py-10 text-inkdim font-semibold mb-16 sm:mb-20">
          {t('arena.noTeams')}
        </p>
      </Reveal>
    )
  }

  const podium = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)
  const maxRest = Math.max(1, ...rest.map((r) => r.points))
  const me = (id) => id === myTeamId

  return (
    <div className={`mb-16 sm:mb-20 transition-opacity ${stale ? 'opacity-50' : ''}`}>
      {emptyPeriod && (
        <p className="bg-brand-teal-soft text-brand-teal-deep rounded-2xl px-5 py-3 font-semibold text-[0.9rem] mb-6">
          {t('arena.noPointsInPeriod')}
        </p>
      )}
      <Reveal delay={60}>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6 mt-4">
          {podium.map((team, i) => {
            const m = MEDALS[i]
            return (
              <div key={team.id} className={`flex-1 bg-card border-2 ${m.ring} rounded-2xl p-5 sm:p-6 relative ${m.order}`}>
                <span
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-[0.85rem] font-bold ${m.soft} border-2 border-card`}
                >
                  {team.rank}
                </span>
                <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center mb-3 mt-2 ${m.soft}`}>
                  <m.icon size={i === 0 ? 34 : 28} />
                </div>
                <h3 className="font-display font-bold text-[1.05rem] sm:text-[1.15rem] mb-1 break-words">
                  {team.name}
                  {me(team.id) && <span className="ml-1.5 text-primary">{t('arena.you')}</span>}
                </h3>
                <p className="text-[0.85rem] text-inkdim font-semibold">{t('units.points', { count: team.points })}</p>
              </div>
            )
          })}
        </div>
      </Reveal>

      {rest.length > 0 && (
        <Reveal delay={120}>
          <div className="bg-card border border-ink/10 rounded-2xl p-2 sm:p-3 text-left">
            {rest.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 border-b border-ink/5 last:border-none ${
                  me(r.id) ? 'bg-brand-orange-soft rounded-xl' : ''
                }`}
              >
                <span className="w-7 shrink-0 text-center text-[0.85rem] font-bold text-inkdim">{r.rank}</span>
                <span className="flex-1 font-semibold text-[0.92rem] truncate">
                  {r.name}
                  {me(r.id) && <span className="ml-1.5 text-primary">{t('arena.you')}</span>}
                </span>
                <span className="hidden sm:block w-28 h-1.5 rounded-full bg-bg overflow-hidden shrink-0">
                  <span className="block h-full rounded-full bg-brand-purple/60" style={{ width: `${(Math.max(0, r.points) / maxRest) * 100}%` }} />
                </span>
                <span className="shrink-0 text-[0.85rem] font-bold text-inkdim text-right">{t('units.points', { count: r.points })}</span>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  )
}

function Steps() {
  const { t } = useI18n()
  return (
    <Reveal>
      <div className="border-t border-ink/10 pt-10 sm:pt-12">
        <p className="text-[0.78rem] tracking-wide uppercase text-inkdim font-bold mb-7">{t('arena.how')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 text-left mb-12">
          {t('arena.steps').map((s, i) => {
            const Icon = STEP_ICONS[i]
            return (
              <div key={i} className="relative bg-card border border-dashed border-ink/15 rounded-2xl p-5 sm:p-6">
                <span className="absolute -top-3 -left-2 w-7 h-7 rounded-full bg-brand-purple text-white text-[0.78rem] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <Icon size={22} className="text-brand-purple mb-3" />
                <h3 className="font-display font-semibold text-[1rem] mb-1">{s.title}</h3>
                <p className="text-[0.85rem] text-inkdim">{s.desc}</p>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-3.5 justify-center">
          <a
            href={business.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-4 rounded-full font-bold text-[0.92rem] sm:text-[0.95rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover active:translate-y-0 transition-all"
          >
            <PiConfetti size={18} className="shrink-0" /> {t('arena.followCta')}
          </a>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-4 rounded-full font-bold text-[0.92rem] sm:text-[0.95rem] border-2 border-ink text-ink hover:bg-ink hover:text-bg active:scale-[0.98] transition-all"
          >
            <PiFlagCheckered size={18} className="shrink-0" /> {t('arena.backHome')}
          </Link>
        </div>
      </div>
    </Reveal>
  )
}
