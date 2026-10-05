import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PiUserPlusBold } from 'react-icons/pi'
import AuthLayout, { Field, PasswordField, SubmitButton, DemoNotice, isEmail } from '../components/AuthLayout.jsx'

// Azərbaycan mobil operator kodları (+994 XX ...)
const OPERATOR_CODES = ['10', '50', '51', '55', '60', '70', '77', '99']
const MIN_PASSWORD = 8

// "501234567" → "50 123 45 67"
const formatPhone = (digits) =>
  [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean).join(' ')

export default function Register() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((er) => ({ ...er, [key]: null }))
    setSent(false)
  }
  const update = (key) => (e) => set(key, e.target.value)

  // Yalnız rəqəmləri saxlayırıq; istifadəçi 0 və ya 994 ilə başlasa, onu atırıq.
  const updatePhone = (e) => {
    let digits = e.target.value.replace(/\D/g, '')
    if (digits.startsWith('994')) digits = digits.slice(3)
    if (digits.startsWith('0')) digits = digits.slice(1)
    set('phone', digits.slice(0, 9))
  }

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!form.firstName.trim()) next.firstName = 'Adını yaz.'
    if (!form.lastName.trim()) next.lastName = 'Soyadını yaz.'
    if (!isEmail(form.email)) next.email = 'Düzgün email ünvanı yaz.'
    if (form.phone.length !== 9 || !OPERATOR_CODES.includes(form.phone.slice(0, 2)))
      next.phone = 'Nömrəni tam yaz, məs. 50 123 45 67.'
    if (form.password.length < MIN_PASSWORD) next.password = `Şifrə ən azı ${MIN_PASSWORD} simvol olmalıdır.`
    if (form.confirm !== form.password || !form.confirm) next.confirm = 'Şifrələr eyni deyil.'
    setErrors(next)
    setSent(Object.keys(next).length === 0)
  }

  return (
    <AuthLayout
      title="Qeydiyyat"
      subtitle="Hesab yarat, Arena-da xal topla və yeniliklərdən ilk sən xəbər tut."
      panelTitle="DırDır ailəsinə qoşul"
      panelText="Oyunlar, kino gecələri, turnirlər — hamısı bir hesabla."
      footer={
        <>
          Artıq hesabın var?{' '}
          <Link to="/giris" className="font-bold text-primary hover:underline">
            Daxil ol
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field
            id="reg-first"
            label="Ad"
            autoComplete="given-name"
            placeholder="Adın"
            value={form.firstName}
            onChange={update('firstName')}
            error={errors.firstName}
          />
          <Field
            id="reg-last"
            label="Soyad"
            autoComplete="family-name"
            placeholder="Soyadın"
            value={form.lastName}
            onChange={update('lastName')}
            error={errors.lastName}
          />
        </div>
        <Field
          id="reg-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ad@mail.com"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />
        <Field
          id="reg-phone"
          label="Telefon"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          prefix="+994"
          placeholder="50 123 45 67"
          value={formatPhone(form.phone)}
          onChange={updatePhone}
          error={errors.phone}
        />
        <PasswordField
          id="reg-password"
          label="Şifrə"
          autoComplete="new-password"
          placeholder={`Ən azı ${MIN_PASSWORD} simvol`}
          value={form.password}
          onChange={update('password')}
          error={errors.password}
        />
        <PasswordField
          id="reg-confirm"
          label="Şifrəni təkrarla"
          autoComplete="new-password"
          placeholder="Şifrəni yenidən yaz"
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
        />

        <SubmitButton>
          <PiUserPlusBold size={18} /> Qeydiyyatdan keç
        </SubmitButton>

        {sent && (
          <DemoNotice>Forma düzgündür. Qeydiyyat sistemi tezliklə işə düşəcək — hələlik məlumat göndərilmir.</DemoNotice>
        )}
      </form>
    </AuthLayout>
  )
}
