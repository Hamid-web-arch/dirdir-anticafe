import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { PiEnvelopeSimpleBold, PiArrowLeftBold, PiPaperPlaneTiltBold, PiLockKeyBold } from 'react-icons/pi'
import AuthLayout, { Field, PasswordField, SubmitButton, FormError } from '../components/AuthLayout.jsx'
import { CodeField, ResendCode } from '../components/EmailCode.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { api } from '../lib/api.js'
import { isEmail, MIN_PASSWORD, fieldMessage } from '../lib/forms.js'
import { useI18n } from '../i18n/index.jsx'
import { useSeo } from '../lib/seo.js'

// /sifre-berpa — iki addım: email → (emailə kod) → kod + yeni şifrə. Sonda istifadəçi daxil olur.
export default function ForgotPassword() {
  const { user } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [email, setEmail] = useState(null) // kod göndərilən email — ikinci addım
  useSeo({ title: t('seo.forgot.title'), noindex: true })

  if (user && !email) return <Navigate to="/hesabim" replace />

  return (
    <AuthLayout
      imageKey="login"
      title={t('auth.forgotTitle')}
      subtitle={email ? t('auth.resetSubtitle', { email }) : t('auth.forgotSubtitle')}
      panelTitle={t('auth.loginPanelTitle')}
      panelText={t('auth.loginPanelText')}
      footer={
        email ? (
          <button type="button" onClick={() => setEmail(null)} className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline">
            <PiArrowLeftBold size={15} /> {t('auth.codeChangeEmail')}
          </button>
        ) : (
          <Link to="/giris" className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline">
            <PiArrowLeftBold size={15} /> {t('auth.backToLogin')}
          </Link>
        )
      }
    >
      {email ? (
        // Sonra kabinetə (/hesabim adminləri özü admin panelə yönləndirir)
        <ResetStep email={email} onDone={() => navigate('/hesabim', { replace: true })} />
      ) : (
        <EmailStep onSent={setEmail} />
      )}
    </AuthLayout>
  )
}

function EmailStep({ onSent }) {
  const i18n = useI18n()
  const { t, errorText, lang } = i18n
  const [value, setValue] = useState('')
  const [error, setError] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!isEmail(value)) return setError({ key: 'validation.email' })
    setLoading(true)
    setServerError(null)
    try {
      const res = await api('/auth/password/forgot', { method: 'POST', body: { email: value.trim(), lang } })
      onSent(res.email)
    } catch (err) {
      setServerError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field
        id="forgot-email"
        label={t('auth.email')}
        type="email"
        autoComplete="email"
        placeholder="ad@mail.com"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setError(null)
          setServerError(null)
        }}
        error={fieldMessage('email', { email: error }, serverError, i18n)}
        autoFocus
      />
      {serverError && !serverError.fields?.email && <FormError>{errorText(serverError)}</FormError>}
      <SubmitButton loading={loading}>
        <PiPaperPlaneTiltBold size={18} /> {t('auth.forgotSubmit')}
      </SubmitButton>
    </form>
  )
}

function ResetStep({ email, onDone }) {
  const { resetPassword } = useAuth()
  const i18n = useI18n()
  const { t, errorText, lang } = i18n
  const [form, setForm] = useState({ code: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((er) => ({ ...er, [key]: null }))
    setServerError(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (form.code.length !== 6) found.code = { key: 'validation.code' }
    if (form.password.length < MIN_PASSWORD) found.password = { key: 'validation.passwordMin', vars: { min: MIN_PASSWORD } }
    if (form.confirm !== form.password || !form.confirm) found.confirm = { key: 'validation.confirm' }
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setLoading(true)
    try {
      await resetPassword({ email, code: form.code, newPassword: form.password })
      onDone()
    } catch (err) {
      setServerError(err)
    } finally {
      setLoading(false)
    }
  }

  // Server "newPassword" sahəsində xəta qaytarır — formada "password" sahəsinin altında göstəririk
  const serverForFields = serverError?.fields?.newPassword
    ? { ...serverError, fields: { ...serverError.fields, password: serverError.fields.newPassword } }
    : serverError
  const message = (field) => fieldMessage(field, errors, serverForFields, i18n)
  const known = ['code', 'newPassword']

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <CodeField value={form.code} onChange={(v) => set('code', v)} error={message('code')} />
      <p className="flex items-center gap-2 text-[0.85rem] text-inkdim -mt-2">
        <PiEnvelopeSimpleBold size={16} className="shrink-0" /> {t('auth.codeHint')}
      </p>
      <PasswordField
        id="reset-password"
        label={t('auth.newPassword')}
        autoComplete="new-password"
        placeholder={t('auth.passwordMin', { min: MIN_PASSWORD })}
        value={form.password}
        onChange={(e) => set('password', e.target.value)}
        error={message('password')}
      />
      <PasswordField
        id="reset-confirm"
        label={t('auth.confirm')}
        autoComplete="new-password"
        placeholder={t('auth.confirmPlaceholder')}
        value={form.confirm}
        onChange={(e) => set('confirm', e.target.value)}
        error={message('confirm')}
      />
      {serverError && !known.some((k) => serverError.fields?.[k]) && <FormError>{errorText(serverError)}</FormError>}
      <SubmitButton loading={loading}>
        <PiLockKeyBold size={18} /> {t('auth.resetSubmit')}
      </SubmitButton>
      <ResendCode onResend={() => api('/auth/password/forgot', { method: 'POST', body: { email, lang } })} />
    </form>
  )
}
