import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PiSignInBold } from 'react-icons/pi'
import AuthLayout, { Field, PasswordField, SubmitButton, DemoNotice, isEmail } from '../components/AuthLayout.jsx'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((er) => ({ ...er, [key]: null }))
    setSent(false)
  }

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!isEmail(form.email)) next.email = 'Düzgün email ünvanı yaz.'
    if (!form.password) next.password = 'Şifrəni yaz.'
    setErrors(next)
    setSent(Object.keys(next).length === 0)
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
        <div className="flex flex-col gap-2">
          <PasswordField
            id="login-password"
            label="Şifrə"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={update('password')}
            error={errors.password}
          />
          <button type="button" className="self-end text-[0.85rem] font-semibold text-inkdim hover:text-primary">
            Şifrəni unutmusan?
          </button>
        </div>

        <SubmitButton>
          <PiSignInBold size={18} /> Daxil ol
        </SubmitButton>

        {sent && <DemoNotice>Forma düzgündür. Giriş sistemi tezliklə işə düşəcək — hələlik məlumat göndərilmir.</DemoNotice>}
      </form>
    </AuthLayout>
  )
}
