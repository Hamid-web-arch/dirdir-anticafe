import { useState } from 'react'
import { PiUserBold, PiEnvelopeSimpleBold, PiLockKeyBold, PiCheckCircleBold } from 'react-icons/pi'
import { useAuth } from '../../auth/AuthContext.jsx'
import { formatPhone, MIN_PASSWORD } from '../../lib/forms.js'
import { useAdminApi, card, Button, Label, TextInput, ErrorBox } from './ui.jsx'

// Profilim — hər admin üçün (icazədən asılı deyil): ad, telefon, email və şifrə.
// Adminlərin sayt kabineti yoxdur, ona görə bunlar burada dəyişir.
export default function AdminProfile() {
  const { user } = useAuth()
  return (
    <div className="flex flex-col gap-5 max-w-[720px]">
      <header>
        <h1 className="font-display font-bold text-[1.6rem] sm:text-[1.9rem] leading-tight">Profilim</h1>
        <p className="text-inkdim text-[0.9rem]">
          {user.isSuperAdmin ? 'Baş admin' : 'Admin'} · {user.email}
        </p>
      </header>
      <InfoCard />
      <EmailCard />
      <PasswordCard />
    </div>
  )
}

// Bir kartın ümumi forması: başlıq, sahələr, xəta, "Yadda saxla" və uğur mesajı
function useSave() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const run = async (fn) => {
    setSaving(true)
    setError(null)
    setDone(false)
    try {
      await fn()
      setDone(true)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }
  return { saving, error, done, run, reset: () => setDone(false) }
}

function CardShell({ icon: Icon, title, note, onSubmit, state, submitLabel = 'Yadda saxla', doneText, children }) {
  return (
    <form onSubmit={onSubmit} className={`${card} flex flex-col gap-4`} noValidate>
      <div>
        <h2 className="flex items-center gap-2 font-display font-bold text-[1.15rem]">
          <Icon size={19} className="text-primary" /> {title}
        </h2>
        {note && <p className="text-[0.82rem] text-inkdim mt-0.5">{note}</p>}
      </div>
      {children}
      <ErrorBox error={state.error && !Object.keys(state.error.fields ?? {}).length ? state.error : null} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={state.saving}>
          {submitLabel}
        </Button>
        {state.done && (
          <span className="inline-flex items-center gap-1.5 text-brand-teal-deep font-bold text-[0.9rem]">
            <PiCheckCircleBold size={18} /> {doneText}
          </span>
        )}
      </div>
    </form>
  )
}

function InfoCard() {
  const request = useAdminApi()
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, phone: formatPhone(user.phone) })
  const state = useSave()
  const fields = state.error?.fields ?? {}
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    state.reset()
  }

  return (
    <CardShell
      icon={PiUserBold}
      title="Məlumatlar"
      state={state}
      doneText="Saxlandı"
      onSubmit={(e) => {
        e.preventDefault()
        state.run(async () => updateUser((await request('/auth/me', { method: 'PATCH', body: form })).user))
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pf-first">Ad</Label>
          <TextInput id="pf-first" value={form.firstName} onChange={set('firstName')} error={fields.firstName} />
        </div>
        <div>
          <Label htmlFor="pf-last">Soyad</Label>
          <TextInput id="pf-last" value={form.lastName} onChange={set('lastName')} error={fields.lastName} />
        </div>
        <div>
          <Label htmlFor="pf-phone">Telefon</Label>
          <TextInput id="pf-phone" type="tel" value={form.phone} onChange={set('phone')} error={fields.phone} />
        </div>
      </div>
    </CardShell>
  )
}

function EmailCard() {
  const request = useAdminApi()
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ email: user.email, currentPassword: '' })
  const state = useSave()
  const fields = state.error?.fields ?? {}
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    state.reset()
  }

  return (
    <CardShell
      icon={PiEnvelopeSimpleBold}
      title="Email"
      note="Sayta bu email ilə daxil olursan. Dəyişmək üçün hazırkı şifrəni də yaz."
      state={state}
      doneText="Email dəyişdi — bundan sonra yeni email ilə daxil ol"
      onSubmit={(e) => {
        e.preventDefault()
        state.run(async () => {
          updateUser((await request('/auth/me/email', { method: 'POST', body: form })).user)
          setForm((f) => ({ ...f, currentPassword: '' }))
        })
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pf-email">Yeni email</Label>
          <TextInput id="pf-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={fields.email} />
        </div>
        <div>
          <Label htmlFor="pf-email-pw">Hazırkı şifrə</Label>
          <TextInput
            id="pf-email-pw"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={set('currentPassword')}
            error={fields.currentPassword}
          />
        </div>
      </div>
    </CardShell>
  )
}

function PasswordCard() {
  const request = useAdminApi()
  const { replaceToken } = useAuth()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' })
  const state = useSave()
  const fields = state.error?.fields ?? {}
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    state.reset()
  }

  return (
    <CardShell
      icon={PiLockKeyBold}
      title="Şifrə"
      note="Dəyişəndə digər cihazlardan çıxarılırsan, bu cihazda daxil olmuş qalırsan."
      state={state}
      submitLabel="Şifrəni dəyiş"
      doneText="Şifrə dəyişdi"
      onSubmit={(e) => {
        e.preventDefault()
        state.run(async () => {
          replaceToken((await request('/auth/me/password', { method: 'POST', body: form })).token)
          setForm({ currentPassword: '', newPassword: '' })
        })
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pf-cur">Hazırkı şifrə</Label>
          <TextInput
            id="pf-cur"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={set('currentPassword')}
            error={fields.currentPassword}
          />
        </div>
        <div>
          <Label htmlFor="pf-new" hint={`ən azı ${MIN_PASSWORD} simvol`}>
            Yeni şifrə
          </Label>
          <TextInput id="pf-new" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={fields.newPassword} />
        </div>
      </div>
    </CardShell>
  )
}
