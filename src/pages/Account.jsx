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
  PiShieldCheckBold,
  PiCheckCircleFill,
  PiBellRingingBold,
} from 'react-icons/pi'
import Reveal from '../components/Reveal.jsx'
import Switch from '../components/Switch.jsx'
import { Field, PasswordField, FormError } from '../components/AuthLayout.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { api, assetUrl } from '../lib/api.js'
import { formatPhone, phoneDigits, isPhone, MIN_PASSWORD, fieldMessage } from '../lib/forms.js'
import { useI18n } from '../i18n/index.jsx'

const MAX_UPLOAD = 10 * 1024 * 1024

export default function Account() {
  const { t } = useI18n()
  const { user, checking, logout } = useAuth()

  if (checking) {
    return (
      <div className="flex justify-center py-32 text-inkdim">
        <PiSpinnerBold size={28} className="animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/giris" replace />

  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div className="absolute w-[320px] h-[320px] bg-brand-orange/20 rounded-full blur-3xl -top-28 -right-24 pointer-events-none" />
      <div className="relative z-10 max-w-[760px] mx-auto px-5 sm:px-7 flex flex-col gap-6">
        <Reveal>
          <ProfileCard />
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
            {user.role === 'ADMIN' && (
              <Link
                to="/admin"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-bold text-[0.92rem] bg-ink text-bg hover:bg-primary transition-colors"
              >
                <PiShieldCheckBold size={18} /> {t('account.adminPanel')}
              </Link>
            )}
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
  const { token } = useAuth()
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
      await api('/auth/me/password', { method: 'POST', body: form, token })
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
