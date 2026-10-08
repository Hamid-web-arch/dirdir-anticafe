import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { PiUserPlusBold } from 'react-icons/pi'
import Switch from '../components/Switch.jsx'
import AuthLayout, { Field, PasswordField, SubmitButton, DemoNotice, FormError } from '../components/AuthLayout.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiEnabled } from '../lib/api.js'
import { isEmail, isPhone, phoneDigits, formatPhone, MIN_PASSWORD, safeNext, fieldMessage } from '../lib/forms.js'
import { useI18n } from '../i18n/index.jsx'

export default function Register() {
  const { user, register } = useAuth()
  const i18n = useI18n()
  const { t, errorText } = i18n
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    newsletter: true, // standart olaraq açıq — istəyən söndürür
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((er) => ({ ...er, [key]: null }))
    setServerError(null)
    setSent(false)
  }
  const update = (key) => (e) => set(key, e.target.value)

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!form.firstName.trim()) found.firstName = { key: 'validation.firstName' }
    if (!form.lastName.trim()) found.lastName = { key: 'validation.lastName' }
    if (!isEmail(form.email)) found.email = { key: 'validation.email' }
    if (!isPhone(form.phone)) found.phone = { key: 'validation.phone' }
    if (form.password.length < MIN_PASSWORD) found.password = { key: 'validation.passwordMin', vars: { min: MIN_PASSWORD } }
    if (form.confirm !== form.password || !form.confirm) found.confirm = { key: 'validation.confirm' }
    setErrors(found)
    if (Object.keys(found).length > 0) return

    if (!apiEnabled) return setSent(true)

    setLoading(true)
    try {
      const { confirm, ...data } = form
      await register(data)
      navigate(next)
    } catch (err) {
      // Server sahə xətası qaytarırsa (məs. email artıq var), onu həmin sahənin altında göstəririk.
      setServerError(err)
    } finally {
      setLoading(false)
    }
  }

  if (user) return <Navigate to={next} replace />

  const message = (field) => fieldMessage(field, errors, serverError, i18n)
  const loginHref = params.get('next') ? `/giris?next=${encodeURIComponent(next)}` : '/giris'

  return (
    <AuthLayout
      imageKey="register"
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      panelTitle={t('auth.registerPanelTitle')}
      panelText={t('auth.registerPanelText')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to={loginHref} className="font-bold text-primary hover:underline">
            {t('auth.loginLink')}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field
            id="reg-first"
            label={t('auth.firstName')}
            autoComplete="given-name"
            placeholder={t('auth.firstNamePlaceholder')}
            value={form.firstName}
            onChange={update('firstName')}
            error={message('firstName')}
          />
          <Field
            id="reg-last"
            label={t('auth.lastName')}
            autoComplete="family-name"
            placeholder={t('auth.lastNamePlaceholder')}
            value={form.lastName}
            onChange={update('lastName')}
            error={message('lastName')}
          />
        </div>
        <Field
          id="reg-email"
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          placeholder="ad@mail.com"
          value={form.email}
          onChange={update('email')}
          error={message('email')}
        />
        <Field
          id="reg-phone"
          label={t('auth.phone')}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          prefix="+994"
          placeholder="50 123 45 67"
          value={formatPhone(form.phone)}
          onChange={(e) => set('phone', phoneDigits(e.target.value))}
          error={message('phone')}
        />
        <PasswordField
          id="reg-password"
          label={t('auth.password')}
          autoComplete="new-password"
          placeholder={t('auth.passwordMin', { min: MIN_PASSWORD })}
          value={form.password}
          onChange={update('password')}
          error={message('password')}
        />
        <PasswordField
          id="reg-confirm"
          label={t('auth.confirm')}
          autoComplete="new-password"
          placeholder={t('auth.confirmPlaceholder')}
          value={form.confirm}
          onChange={update('confirm')}
          error={message('confirm')}
        />

        <div className="rounded-2xl bg-bg border border-ink/10 px-4 py-3.5">
          <Switch checked={form.newsletter} onChange={(v) => set('newsletter', v)}>
            {t('auth.newsletter')}
          </Switch>
          <p className="text-[0.8rem] text-inkdim mt-1.5 pl-14">{t('auth.newsletterNote')}</p>
        </div>

        {serverError && <FormError>{errorText(serverError)}</FormError>}

        <SubmitButton loading={loading}>
          <PiUserPlusBold size={18} /> {t('auth.registerSubmit')}
        </SubmitButton>

        {sent && <DemoNotice>{t('auth.demoRegister')}</DemoNotice>}
      </form>
    </AuthLayout>
  )
}
