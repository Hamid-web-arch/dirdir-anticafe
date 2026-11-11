import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  PiTrophyBold,
  PiSignOutBold,
  PiEnvelopeSimpleBold,
  PiPhoneBold,
  PiSpinnerBold,
  PiCameraBold,
  PiTrashBold,
  PiPencilSimpleBold,
  PiLockKeyBold,
  PiCheckCircleFill,
  PiBellRingingBold,
  PiCoffeeBold,
  PiGiftBold,
  PiIdentificationCardBold,
} from 'react-icons/pi'
import Reveal from '../components/Reveal.jsx'
import Switch from '../components/Switch.jsx'
import { Field, PasswordField, FormError } from '../components/AuthLayout.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { api, assetUrl } from '../lib/api.js'
import { formatPhone, phoneDigits, isPhone, MIN_PASSWORD, fieldMessage } from '../lib/forms.js'
import { useI18n } from '../i18n/index.jsx'
import { useSeo } from '../lib/seo.js'
import { tierStyle } from '../lib/club.js'
import { usePricing } from '../pricing/PricingContext.jsx'
import { visitPrice, visitMinutes, elapsedClock, durationText, useNow, bakuTime } from '../pricing/visitPrice.js'

const MAX_UPLOAD = 10 * 1024 * 1024

export default function Account() {
  const { t } = useI18n()
  const { user, checking, logout } = useAuth()
  useSeo({ title: t('seo.account.title'), noindex: true })

  if (checking) {
    return (
      <div className="flex justify-center py-32 text-inkdim">
        <PiSpinnerBold size={28} className="animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/giris" replace />
  // Adminin kabineti yoxdur — hər şey admin paneldədir
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />

  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div className="absolute w-[320px] h-[320px] bg-brand-orange/20 rounded-full blur-3xl -top-28 -right-24 pointer-events-none" />
      <div className="relative z-10 max-w-[760px] mx-auto px-5 sm:px-7 flex flex-col gap-6">
        <Reveal>
          <ProfileCard />
        </Reveal>
        <Reveal delay={20}>
          <ClubCard />
        </Reveal>
        <Reveal delay={30}>
          <Gifts />
        </Reveal>
        <Reveal delay={40}>
          <Visits />
        </Reveal>
        <Reveal delay={60}>
          <History />
        </Reveal>
        <Reveal delay={90}>
          <NewsletterCard />
        </Reveal>
        <Reveal delay={120}>
          <PasswordCard />
        </Reveal>
        <Reveal delay={160}>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={logout}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-bold text-[0.92rem] border-2 border-ink text-ink hover:bg-ink hover:text-bg transition-all"
            >
              <PiSignOutBold size={18} /> {t('account.logout')}
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const card = 'bg-card border border-ink/10 rounded-[24px] p-6 sm:p-8'

function ProfileCard() {
  const i18n = useI18n()
  const { t, errorText } = i18n
  const { user, token, updateUser } = useAuth()
  const fileInput = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)
  const [editing, setEditing] = useState(false)

  const uploadAvatar = async (file) => {
    if (!file) return
    setAvatarError(null)
    if (file.size > MAX_UPLOAD) return setAvatarError({ code: 'IMAGE_TOO_LARGE' })
    setUploading(true)
    try {
      updateUser((await api('/auth/me/avatar', { method: 'PUT', body: file, token })).user)
    } catch (err) {
      setAvatarError(err)
    } finally {
      setUploading(false)
      fileInput.current.value = ''
    }
  }

  const removeAvatar = async () => {
    setUploading(true)
    try {
      updateUser((await api('/auth/me/avatar', { method: 'DELETE', token })).user)
    } catch (err) {
      setAvatarError(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={card}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-6">
        <div className="relative w-24 h-24 shrink-0">
          {user.avatarUrl ? (
            <img src={assetUrl(user.avatarUrl)} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-brand-orange-soft" />
          ) : (
            <span className="w-24 h-24 rounded-full bg-primary text-white font-display font-bold text-[2.4rem] flex items-center justify-center">
              {user.firstName.charAt(0)}
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 rounded-full bg-ink/50 text-white flex items-center justify-center">
              <PiSpinnerBold size={26} className="animate-spin" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-bold text-[1.6rem] sm:text-[2rem] leading-tight break-words">
            {t('account.hello', { name: user.firstName })}
          </h1>
          <p className="text-inkdim">
            {user.firstName} {user.lastName}
            {user.role === 'ADMIN' && (
              <span className="ml-2 text-[0.75rem] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-purple-soft text-brand-purple-deep">
                {t('account.admin')}
              </span>
            )}
          </p>
          {/* Müştəri kodu: kafedə deyir, admin Günün hesabatında bununla tapır */}
          {user.customerCode && (
            <div className="inline-flex items-center gap-2.5 mt-2.5 rounded-xl bg-brand-orange-soft px-3 py-1.5" title={t('account.customerCodeHint')}>
              <PiIdentificationCardBold size={18} className="text-primary shrink-0" />
              <span className="text-[0.8rem] font-semibold text-inkdim">{t('account.customerCode')}:</span>
              <span className="font-display font-bold text-[1.05rem] tracking-wider text-ink">{user.customerCode}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => uploadAvatar(e.target.files[0])}
            />
            <button
              disabled={uploading}
              onClick={() => fileInput.current.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.85rem] font-bold border-2 border-ink/15 hover:border-primary hover:text-primary disabled:opacity-60 transition-colors"
            >
              <PiCameraBold size={16} /> {user.avatarUrl ? t('account.avatarChange') : t('account.avatarAdd')}
            </button>
            {user.avatarUrl && (
              <button
                disabled={uploading}
                onClick={removeAvatar}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.85rem] font-bold text-inkdim hover:text-brand-pink-deep disabled:opacity-60"
              >
                <PiTrashBold size={16} /> {t('account.avatarRemove')}
              </button>
            )}
          </div>
          {avatarError && <p className="text-[0.85rem] font-semibold text-brand-pink-deep mt-2">{errorText(avatarError)}</p>}
        </div>
      </div>

      {editing ? (
        <EditForm onDone={() => setEditing(false)} />
      ) : (
        <>
          <dl className="flex flex-col gap-3 text-[0.95rem] border-t border-ink/10 pt-5">
            <div className="flex items-center gap-3">
              <PiEnvelopeSimpleBold size={18} className="text-primary shrink-0" />
              <dt className="sr-only">{t('auth.email')}</dt>
              <dd className="truncate">{user.email}</dd>
            </div>
            <div className="flex items-center gap-3">
              <PiPhoneBold size={18} className="text-primary shrink-0" />
              <dt className="sr-only">{t('auth.phone')}</dt>
              <dd>+994 {formatPhone(user.phone)}</dd>
            </div>
          </dl>
          <button
            onClick={() => setEditing(true)}
            className="mt-5 inline-flex items-center gap-1.5 text-[0.9rem] font-bold text-primary hover:underline"
          >
            <PiPencilSimpleBold size={16} /> {t('account.edit')}
          </button>
        </>
      )}
    </div>
  )
}

function EditForm({ onDone }) {
  const i18n = useI18n()
  const { t, errorText } = i18n
  const { user, token, updateUser } = useAuth()
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, phone: user.phone })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: null }))
    setServerError(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!form.firstName.trim()) found.firstName = { key: 'validation.firstName' }
    if (!form.lastName.trim()) found.lastName = { key: 'validation.lastName' }
    if (!isPhone(form.phone)) found.phone = { key: 'validation.phone' }
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      updateUser((await api('/auth/me', { method: 'PATCH', body: form, token })).user)
      onDone()
    } catch (err) {
      setServerError(err)
    } finally {
      setSaving(false)
    }
  }

  const message = (field) => fieldMessage(field, errors, serverError, i18n)

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 border-t border-ink/10 pt-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field id="acc-first" label={t('auth.firstName')} autoComplete="given-name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} error={message('firstName')} />
        <Field id="acc-last" label={t('auth.lastName')} autoComplete="family-name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} error={message('lastName')} />
      </div>
      <Field
        id="acc-phone"
        label={t('auth.phone')}
        type="tel"
        inputMode="numeric"
        prefix="+994"
        value={formatPhone(form.phone)}
        onChange={(e) => set('phone', phoneDigits(e.target.value))}
        error={message('phone')}
      />
      <p className="text-[0.82rem] text-inkdim">
        {user.email} · {t('account.emailNote')}
      </p>
      {serverError && !Object.keys(serverError.fields ?? {}).length && <FormError>{errorText(serverError)}</FormError>}
      <div className="flex gap-2.5">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-[0.92rem] bg-primary text-white disabled:opacity-60"
        >
          {saving && <PiSpinnerBold size={16} className="animate-spin" />} {saving ? t('account.saving') : t('account.save')}
        </button>
        <button type="button" onClick={onDone} className="px-6 py-3 rounded-full font-bold text-[0.92rem] border-2 border-ink/20 hover:border-ink">
          {t('account.cancel')}
        </button>
      </div>
    </form>
  )
}

// Yeniliklərdən xəbərdar olmaq: açar dəyişən kimi yadda saxlanır
function NewsletterCard() {
  const { t, errorText } = useI18n()
  const { user, token, updateUser } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const change = async (newsletter) => {
    setSaving(true)
    setError(null)
    try {
      updateUser((await api('/auth/me', { method: 'PATCH', body: { newsletter }, token })).user)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={card}>
      <h2 className="flex items-center gap-2 font-display font-bold text-[1.2rem] mb-3">
        <PiBellRingingBold size={20} className="text-primary" /> {t('account.newsletterTitle')}
      </h2>
      <Switch checked={Boolean(user.newsletter)} onChange={change} disabled={saving}>
        {t('auth.newsletter')}
      </Switch>
      <p className="text-[0.85rem] text-inkdim mt-2 pl-14">
        {user.newsletter ? t('account.newsletterOn') : t('account.newsletterOff')}
      </p>
      {error && <FormError>{errorText(error)}</FormError>}
    </div>
  )
}

function PasswordCard() {
  const i18n = useI18n()
  const { t, errorText } = i18n
  const { token, replaceToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((er) => ({ ...er, [key]: null }))
    setServerError(null)
    setDone(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!form.currentPassword) found.currentPassword = { key: 'validation.currentPassword' }
    if (form.newPassword.length < MIN_PASSWORD) found.newPassword = { key: 'validation.passwordMin', vars: { min: MIN_PASSWORD } }
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      // Digər cihazlardakı sessiyalar bağlanır; bu cihaz yeni tokenlə daxil olmuş qalır
      const { token: fresh } = await api('/auth/me/password', { method: 'POST', body: form, token })
      replaceToken(fresh)
      setForm({ currentPassword: '', newPassword: '' })
      setDone(true)
      setOpen(false)
    } catch (err) {
      setServerError(err)
    } finally {
      setSaving(false)
    }
  }

  const message = (field) => fieldMessage(field, errors, serverError, i18n)

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display font-bold text-[1.2rem]">
          <PiLockKeyBold size={20} className="text-primary" /> {t('account.passwordTitle')}
        </h2>
        {!open && (
          <button onClick={() => setOpen(true)} className="text-[0.9rem] font-bold text-primary hover:underline">
            {t('account.change')}
          </button>
        )}
      </div>
      {done && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[0.9rem] font-semibold text-brand-teal-deep">
          <PiCheckCircleFill size={18} /> {t('account.passwordChanged')}
        </p>
      )}
      {open && (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4 mt-5">
          <PasswordField
            id="pw-current"
            label={t('account.currentPassword')}
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={set('currentPassword')}
            error={message('currentPassword')}
          />
          <PasswordField
            id="pw-new"
            label={t('account.newPassword')}
            autoComplete="new-password"
            placeholder={t('auth.passwordMin', { min: MIN_PASSWORD })}
            value={form.newPassword}
            onChange={set('newPassword')}
            error={message('newPassword')}
          />
          {serverError && !serverError.fieldCodes?.currentPassword && <FormError>{errorText(serverError)}</FormError>}
          <div className="flex gap-2.5">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-[0.92rem] bg-primary text-white disabled:opacity-60"
            >
              {saving && <PiSpinnerBold size={16} className="animate-spin" />} {saving ? t('account.saving') : t('account.save')}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-6 py-3 rounded-full font-bold text-[0.92rem] border-2 border-ink/20 hover:border-ink"
            >
              {t('account.cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// Anticafe ziyarətləri: admin seansı başladanda burada canlı saat və məbləğ görünür.
// Seans başlayıb-bitəndə görünsün deyə siyahı vaxtaşırı yenilənir.
// DırDır Club: statusun, növbəti statusa qalan ziyarətlər, üstünlüklər və bütün statuslar (qaydalar).
// Club söndürülübsə kart görünmür.
function ClubCard() {
  const { t, pick, date } = useI18n()
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    api('/club', { token })
      .then((d) => !cancelled && setData(d))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token])

  const me = data?.me
  if (!me) return null
  const { club } = data
  const tier = club.tiers[me.tier.index] ?? club.tiers[0]
  const style = tierStyle(tier.color)
  const next = me.next
  // Hazırkı statusun əvvəlindən növbəti statusa qədər irəliləyiş
  const progress = next ? Math.min(100, Math.round(((me.visits - tier.minVisits) / (next.minVisits - tier.minVisits)) * 100)) : 100
  const items = (list) => list.map(pick).filter(Boolean)

  return (
    <div className="bg-card border border-ink/10 rounded-[24px] overflow-hidden">
      <div className={`${style.soft} p-6 sm:p-8`}>
        <div className="flex items-center gap-4">
          <span className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-[22px] bg-card shadow-lift flex items-center justify-center text-[2.2rem] sm:text-[2.6rem]">
            {tier.icon}
          </span>
          <div className="min-w-0">
            <p className={`text-[0.75rem] font-bold uppercase tracking-wider ${style.text}`}>{t('club.title')}</p>
            <h2 className="font-display font-bold text-[1.7rem] sm:text-[2rem] leading-tight">{pick(tier.name)}</h2>
            <p className="text-[0.9rem] text-inkdim font-semibold">{t('club.visits', { count: me.visits, months: club.months })}</p>
            {me.given?.name && me.given.bonus > 0 && <p className="text-[0.85rem] font-bold mt-0.5">{t('club.given', { name: pick(me.given.name) })}</p>}
          </div>
        </div>

        {(tier.hallPercent > 0 || tier.roomPercent > 0) && (
          <p className={`inline-flex mt-4 px-3 py-1.5 rounded-full bg-card font-bold text-[0.9rem] ${style.text}`}>
            {t('club.discounts', { hall: tier.hallPercent, room: tier.roomPercent })}
          </p>
        )}

        <div className="mt-5">
          <div className="h-3 rounded-full bg-card overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full ${style.solid} transition-[width] duration-700`} style={{ width: `${Math.max(4, progress)}%` }} />
          </div>
          <p className="text-[0.88rem] font-bold mt-2">
            {next ? t('club.next', { icon: next.icon, name: pick(next.name), count: next.needed }) : t('club.top')}
          </p>
        </div>
      </div>

      <div className="p-6 sm:p-8 flex flex-col gap-5">
        {items(tier.benefits).length > 0 && (
          <div>
            <h3 className="font-display font-bold text-[1.05rem] mb-2">{t('club.benefits')}</h3>
            <ul className="flex flex-col gap-1.5">
              {items(tier.benefits).map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-[0.92rem]">
                  <PiCheckCircleFill size={18} className={`shrink-0 mt-0.5 ${style.text}`} /> {b}
                </li>
              ))}
            </ul>
          </div>
        )}
        {items(tier.gifts).length > 0 && (
          <div>
            <h3 className="font-display font-bold text-[1.05rem] mb-2">{t('club.gifts')}</h3>
            <ul className="flex flex-col gap-1.5">
              {items(tier.gifts).map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-[0.92rem]">
                  <span aria-hidden="true">🎁</span> {g}
                </li>
              ))}
            </ul>
          </div>
        )}

        {me.tier.index > 0 && (
          <p className="text-[0.85rem] text-inkdim">
            {t('club.keep', { months: club.months, count: me.keepVisits })}
            {me.leavesOn && <> {t('club.leaves', { date: date(`${me.leavesOn}T12:00:00`) })}</>}
          </p>
        )}

        <div>
          <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className="font-bold text-primary hover:underline text-[0.92rem]">
            {showAll ? t('club.hideTiers') : t('club.allTiers')}
          </button>
          {showAll && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid sm:grid-cols-2 gap-3">
                {club.tiers.map((tr, i) => {
                  const s = tierStyle(tr.color)
                  const upper = club.tiers[i + 1]
                  const current = i === me.tier.index
                  return (
                    <div key={tr.key} className={`rounded-2xl border-2 p-4 ${current ? s.border : 'border-ink/10'}`}>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className={`w-10 h-10 rounded-xl ${s.soft} flex items-center justify-center text-[1.3rem]`}>{tr.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-display font-bold leading-tight">{pick(tr.name)}</div>
                          <div className="text-[0.75rem] text-inkdim font-semibold">
                            {upper ? t('club.range', { from: tr.minVisits, to: upper.minVisits - 1 }) : t('club.rangeFrom', { from: tr.minVisits })}
                          </div>
                        </div>
                        {current && <span className={`text-[0.7rem] font-bold px-2 py-0.5 rounded-full ${s.soft} ${s.text}`}>{t('club.you')}</span>}
                      </div>
                      <p className={`text-[0.82rem] font-bold ${s.text} mb-1.5`}>
                        {t('club.discounts', { hall: tr.hallPercent, room: tr.roomPercent })}
                      </p>
                      <ul className="text-[0.8rem] text-inkdim flex flex-col gap-0.5">
                        {[...items(tr.benefits), ...items(tr.gifts).map((g) => `🎁 ${g}`)].map((line, j) => (
                          <li key={j}>• {line}</li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
              <p className="text-[0.82rem] text-inkdim">
                {t('club.rules', { months: club.months })} {club.combine === 'stack' ? t('club.combineStack') : t('club.combine')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Hədiyyə çarxından qazanılanlar. Heç fırlatmayıbsa kart görünmür.
function Gifts() {
  const { t, pick, date } = useI18n()
  const { user, token } = useAuth()
  const [spins, setSpins] = useState(null)

  useEffect(() => {
    let cancelled = false
    api('/wheel', { token })
      .then((d) => !cancelled && setSpins(d.me?.spins ?? []))
      .catch(() => !cancelled && setSpins([]))
    return () => {
      cancelled = true
    }
  }, [token])

  if (!spins?.length) return null

  return (
    <div className={card}>
      <h2 className="flex items-center gap-2 font-display font-bold text-[1.2rem] mb-1">
        <PiGiftBold size={20} className="text-primary" /> {t('account.giftsTitle')}
      </h2>
      <p className="text-[0.85rem] text-inkdim mb-4">
        {t('account.giftsHint')} <span className="font-bold text-ink">{user.customerCode}</span>
      </p>
      <ul className="flex flex-col gap-2">
        {spins.map((s) => (
          <li key={s.id} className={`flex items-center gap-3 rounded-2xl border border-ink/10 px-4 py-3 ${s.usedAt ? 'opacity-60' : ''}`}>
            <span className="text-[1.3rem]" aria-hidden="true">
              🎁
            </span>
            <span className="flex-1 min-w-0">
              <span className={`block font-bold ${s.usedAt ? 'line-through' : ''}`}>{pick(s.prize)}</span>
              <span className="block text-[0.78rem] text-inkdim">{date(s.createdAt)}</span>
            </span>
            <span
              className={`shrink-0 text-[0.75rem] font-bold px-2.5 py-1 rounded-full ${
                s.usedAt ? 'bg-ink/5 text-inkdim' : 'bg-brand-teal-soft text-brand-teal-deep'
              }`}
            >
              {s.usedAt ? t('account.giftUsed') : t('account.giftWaiting')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Visits() {
  const { t, date } = useI18n()
  const { token } = useAuth()
  const pricing = usePricing()
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      api('/auth/me/visits', { token })
        .then((d) => !cancelled && setData(d))
        .catch(() => !cancelled && setData((prev) => prev ?? { active: null, visits: [] }))
    load()
    const id = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [token])

  const active = data?.active
  const now = useNow(1000, Boolean(active))
  const units = { h: t('account.hoursShort'), m: t('account.minutesShort') }
  const money = (n) => `${Number.isInteger(n) ? n : n.toFixed(2)}₼`

  if (data && !active && data.visits.length === 0) return null // heç ziyarət yoxdursa kartı göstərmirik

  const live = active ? visitPrice(pricing, visitMinutes(active.startedAt, now), active) : null

  return (
    <div className={card}>
      <h2 className="flex items-center gap-2 font-display font-bold text-[1.2rem] mb-4">
        <PiCoffeeBold size={20} className="text-primary" /> {t('account.visits')}
      </h2>
      {data === null ? (
        <PiSpinnerBold size={22} className="animate-spin text-inkdim" />
      ) : (
        <>
          {active && (
            <div className="rounded-2xl bg-brand-teal-soft p-5 mb-4">
              <div className="flex items-center gap-2 font-bold text-brand-teal-deep">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-teal animate-pulse" />
                {t('account.visitNow')}
                <span className="font-semibold text-ink/60">· {t('account.visitSince', { time: bakuTime(active.startedAt) })}</span>
              </div>
              <div className="flex items-end justify-between gap-4 mt-3">
                <div className="font-display font-bold text-[2rem] leading-none tabular-nums">{elapsedClock(active.startedAt, now)}</div>
                <div className="text-right">
                  <div className="text-[0.78rem] font-bold text-ink/60">{t('account.visitAmount')}</div>
                  <div className="font-display font-bold text-[2rem] leading-none text-primary tabular-nums">{money(live.amount)}</div>
                </div>
              </div>
              <p className="text-[0.8rem] text-ink/60 mt-3">
                {active.kind === 'room' && `${t('account.visitRoom')} · ${t('units.people', { count: active.people })} · `}
                {active.kind !== 'room' && active.people > 1 && `${t('units.people', { count: active.people })} × ${money(live.perPerson)} · `}
                {live.capped ? t('account.visitCap') : t('account.visitBilled', { hours: live.billedHours })} ·{' '}
                {live.discount > 0 &&
                  `${
                    live.discountSource === 'promo'
                      ? t('account.visitPromo', { code: active.promoCode, amount: money(live.discount) })
                      : t('account.visitStudent', { amount: money(live.discount) })
                  } · `}
                {t('account.visitsLive')}
              </p>
            </div>
          )}
          {data.visits.length > 0 && (
            <ul className="flex flex-col divide-y divide-ink/5">
              {data.visits.map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{date(v.startedAt)}</div>
                    <div className="text-[0.85rem] text-inkdim tabular-nums">
                      {bakuTime(v.startedAt)} – {bakuTime(v.endedAt)} · {durationText(v.minutes, units)}
                      {v.kind === 'room' && ` · ${t('account.visitRoom')}`}
                      {v.people > 1 && ` · ${t('units.people', { count: v.people })}`}
                    </div>
                  </div>
                  <span className="shrink-0 font-display font-bold text-primary tabular-nums">{money(v.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function History() {
  const { t, pick, date } = useI18n()
  const { token } = useAuth()
  const [teams, setTeams] = useState(null)

  useEffect(() => {
    api('/auth/me/teams', { token })
      .then((d) => setTeams(d.teams))
      .catch(() => setTeams([]))
  }, [token])

  return (
    <div className={card}>
      <h2 className="flex items-center gap-2 font-display font-bold text-[1.2rem] mb-4">
        <PiTrophyBold size={20} className="text-primary" /> {t('account.history')}
      </h2>
      {teams === null ? (
        <PiSpinnerBold size={22} className="animate-spin text-inkdim" />
      ) : teams.length === 0 ? (
        <div className="text-inkdim">
          <p className="mb-3">{t('account.historyEmpty')}</p>
          <Link to="/arena" className="font-bold text-primary hover:underline">
            {t('account.findCompetitions')} →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-ink/5">
          {teams.map((team) => (
            <li key={team.id} className="flex items-center gap-3 py-3">
              <span className="w-12 h-12 shrink-0 rounded-xl bg-brand-orange-soft text-brand-orange-deep font-display font-bold flex items-center justify-center">
                #{team.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{pick(team.competition.title)}</div>
                <div className="text-[0.85rem] text-inkdim truncate">
                  {team.name} · {date(team.competition.startsAt)} · {t(`arena.status.${team.competition.status}`)}
                </div>
              </div>
              <span className="shrink-0 font-display font-bold text-primary">{t('units.points', { count: team.points })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
