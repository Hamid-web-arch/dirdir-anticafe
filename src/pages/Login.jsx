import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { PiSignInBold } from 'react-icons/pi'
import AuthLayout, { Field, PasswordField, SubmitButton, DemoNotice, FormError } from '../components/AuthLayout.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiEnabled } from '../lib/api.js'
import { isEmail, isPhone, phoneDigits, safeNext, fieldMessage } from '../lib/forms.js'
import { useI18n } from '../i18n/index.jsx'

export default function Login() {
  const { user, login } = useAuth()
  const i18n = useI18n()
  const { t, errorText } = i18n
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  const [form, setForm] = useState({ login: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  if (user) return <Navigate to={next} replace />

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((er) => ({ ...er, [key]: null }))
    setServerError(null)
    setSent(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    // Email və ya telefon: @ varsa email, yoxdursa nömrə kimi yoxlanır
    const identifier = form.login.trim()
    if (identifier.includes('@') ? !isEmail(identifier) : !isPhone(phoneDigits(identifier))) found.login = { key: 'validation.login' }
    if (!form.password) found.password = { key: 'validation.passwordRequired' }
    setErrors(found)
    if (Object.keys(found).length > 0) return

    if (!apiEnabled) return setSent(true)

    setLoading(true)
    try {
      await login(form)
      navigate(next)
    } catch (err) {
      setServerError(err)
    } finally {
      setLoading(false)
    }
  }

  const message = (field) => fieldMessage(field, errors, serverError, i18n)
  const registerHref = params.get('next') ? `/qeydiyyat?next=${encodeURIComponent(next)}` : '/qeydiyyat'

  return (
    <AuthLayout
      imageKey="login"
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      panelTitle={t('auth.loginPanelTitle')}
      panelText={t('auth.loginPanelText')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to={registerHref} className="font-bold text-primary hover:underline">
            {t('auth.registerLink')}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field
          id="login-email"
          label={t('auth.emailOrPhone')}
          type="text"
          autoComplete="username"
          placeholder="ad@mail.com / 50 123 45 67"
          value={form.login}
          onChange={update('login')}
          error={message('login')}
        />
        <PasswordField
          id="login-password"
          label={t('auth.password')}
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={update('password')}
          error={message('password')}
        />

        {serverError && <FormError>{errorText(serverError)}</FormError>}

        <SubmitButton loading={loading}>
          <PiSignInBold size={18} /> {t('auth.loginSubmit')}
        </SubmitButton>

        {sent && <DemoNotice>{t('auth.demoLogin')}</DemoNotice>}
      </form>
    </AuthLayout>
  )
}
