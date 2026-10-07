import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { PiSignInBold } from 'react-icons/pi'
import AuthLayout, {
  Field,
  PasswordField,
  SubmitButton,
  DemoNotice,
  FormError,
  isEmail,
} from '../components/AuthLayout.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiEnabled } from '../lib/api.js'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  if (user) return <Navigate to="/hesabim" replace />

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((er) => ({ ...er, [key]: null }))
    setFormError(null)
    setSent(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!isEmail(form.email)) next.email = 'Düzgün email ünvanı yaz.'
    if (!form.password) next.password = 'Şifrəni yaz.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    if (!apiEnabled) return setSent(true)

    setLoading(true)
    try {
      await login(form)
      navigate('/hesabim')
    } catch (err) {
      setErrors(err.fields)
      setFormError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Xoş gəldin!"
      subtitle="Hesabına daxil ol və Arena xallarını izlə."
      panelTitle="Yenidən görüşdük"
      panelText="Çay hazırdır, oyunlar rəfdədir — sadəcə daxil ol."
      footer={
        <>
          Hesabın yoxdur?{' '}
          <Link to="/qeydiyyat" className="font-bold text-primary hover:underline">
            Qeydiyyatdan keç
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ad@mail.com"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />
        <PasswordField
          id="login-password"
          label="Şifrə"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
        />

        {formError && <FormError>{formError}</FormError>}

        <SubmitButton loading={loading}>
          <PiSignInBold size={18} /> Daxil ol
        </SubmitButton>

        {sent && <DemoNotice>Forma düzgündür. Giriş sistemi tezliklə işə düşəcək — hələlik məlumat göndərilmir.</DemoNotice>}
      </form>
    </AuthLayout>
  )
}
