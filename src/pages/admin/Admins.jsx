import { useEffect, useState } from 'react'
import {
  PiUserPlusBold,
  PiArrowsClockwiseBold,
  PiCrownBold,
  PiShieldCheckBold,
  PiKeyBold,
  PiProhibitBold,
  PiCheckCircleBold,
  PiShieldSlashBold,
  PiTrashBold,
  PiMagnifyingGlassBold,
  PiUserCircleCheckBold,
  PiXBold,
} from 'react-icons/pi'
import { formatPhone, MIN_PASSWORD } from '../../lib/forms.js'
import { useAdminApi, card, Button, ConfirmButton, Label, TextInput, ErrorBox, Spinner, Empty, formatDateTime } from './ui.jsx'
import { GROUPS, PERMISSION_SECTIONS } from './sections.js'

// Adminlər — yalnız baş admin görür (server də yoxlayır).
// Yeni admin yaratmaq, mövcud istifadəçini admin etmək, hər adminin hansı bölmələri görəcəyini seçmək.
export default function AdminAdmins() {
  const request = useAdminApi()
  const [admins, setAdmins] = useState(null)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState(null) // 'new' | 'promote' | null

  useEffect(() => {
    request('/admin/admins')
      .then((d) => setAdmins(d.admins))
      .catch(setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const upsert = (admin) =>
    setAdmins((list) => (list.some((a) => a.id === admin.id) ? list.map((a) => (a.id === admin.id ? admin : a)) : [...list, admin]))
  const drop = (id) => setAdmins((list) => list.filter((a) => a.id !== id))

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-[1.6rem] sm:text-[1.9rem] leading-tight">Adminlər</h1>
          <p className="text-inkdim text-[0.9rem] max-w-[620px]">
            Hər admin yalnız ona açdığın bölmələri görür. İcazələri istənilən vaxt dəyişə bilərsən — dərhal tətbiq olunur.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={mode === 'promote' ? 'dark' : 'outline'} onClick={() => setMode(mode === 'promote' ? null : 'promote')}>
            <PiShieldCheckBold size={16} /> İstifadəçini admin et
          </Button>
          <Button variant="primary" onClick={() => setMode(mode === 'new' ? null : 'new')}>
            <PiUserPlusBold size={16} /> Yeni admin
          </Button>
        </div>
      </header>

      {mode === 'new' && (
        <NewAdminForm
          onCreated={(admin) => {
            upsert(admin)
            setMode(null)
          }}
          onCancel={() => setMode(null)}
        />
      )}
      {mode === 'promote' && (
        <PromoteForm
          onPromoted={(admin) => {
            upsert(admin)
            setMode(null)
          }}
          onCancel={() => setMode(null)}
        />
      )}

      <ErrorBox error={error} />
      {admins === null ? (
        !error && <Spinner />
      ) : admins.length === 0 ? (
        <Empty>Admin yoxdur.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {admins.map((a) => (
            <AdminCard key={a.id} admin={a} onChanged={upsert} onRemoved={() => drop(a.id)} />
          ))}
        </ul>
      )}
    </div>
  )
}

// Bölmə icazələri: qruplar üzrə qutular + "Hamısı / Heç biri"
function PermissionPicker({ value, onChange }) {
  const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key])
  const all = PERMISSION_SECTIONS.map((s) => s.to)
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-[0.85rem] font-bold">Hansı bölmələri görə bilər</span>
        <span className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onChange(all)}>
            Hamısı
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onChange([])}>
            Heç biri
          </Button>
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {GROUPS.filter((g) => PERMISSION_SECTIONS.some((s) => s.group === g)).map((group) => (
          <fieldset key={group} className="rounded-xl border border-ink/10 p-3">
            <legend className="px-1 text-[0.7rem] font-bold uppercase tracking-wider text-inkdim">{group}</legend>
            <div className="flex flex-col gap-1">
              {PERMISSION_SECTIONS.filter((s) => s.group === group).map((s) => (
                <label key={s.to} className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg cursor-pointer hover:bg-ink/5 select-none">
                  <input
                    type="checkbox"
                    checked={value.includes(s.to)}
                    onChange={() => toggle(s.to)}
                    className="w-[18px] h-[18px] accent-[var(--color-primary)]"
                  />
                  <s.icon size={17} className="text-inkdim shrink-0" />
                  <span className="font-semibold text-[0.9rem]">{s.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  )
}

function PermissionChips({ admin }) {
  if (admin.isSuperAdmin) return <p className="text-[0.85rem] text-inkdim">Bütün bölmələr və adminlərin idarəsi.</p>
  const sections = PERMISSION_SECTIONS.filter((s) => admin.permissions.includes(s.to))
  if (sections.length === 0) return <p className="text-[0.85rem] font-semibold text-brand-pink-deep">Heç bir bölmə açılmayıb.</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {sections.map((s) => (
        <span key={s.to} className="inline-flex items-center gap-1 text-[0.75rem] font-bold px-2.5 py-1 rounded-full bg-ink/5">
          <s.icon size={13} /> {s.label}
        </span>
      ))}
    </div>
  )
}

function AdminCard({ admin: a, onChanged, onRemoved }) {
  const request = useAdminApi()
  const [panel, setPanel] = useState(null) // 'permissions' | 'password' | null
  const [permissions, setPermissions] = useState(a.permissions)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const run = async (which, path, options, after) => {
    setBusy(which)
    setError(null)
    setDone(null)
    try {
      const res = await request(path, options)
      after(res)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  const patch = (which, body, message) =>
    run(which, `/admin/admins/${a.id}`, { method: 'PATCH', body }, (res) => {
      onChanged(res.admin)
      setPanel(null)
      setDone(message)
    })

  return (
    <li className={`${card} ${a.blocked ? 'opacity-80' : ''}`}>
      <div className="flex flex-wrap items-start gap-3">
        <span
          className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center font-bold ${
            a.isSuperAdmin ? 'bg-primary text-white' : 'bg-ink text-bg'
          }`}
        >
          {a.isSuperAdmin ? <PiCrownBold size={20} /> : `${a.firstName?.[0] ?? ''}${a.lastName?.[0] ?? ''}`}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[1.05rem]">
              {a.firstName} {a.lastName}
            </span>
            {a.isSuperAdmin && (
              <span className="text-[0.7rem] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-orange-soft text-brand-orange-deep">
                baş admin
              </span>
            )}
            {a.blocked && (
              <span className="text-[0.7rem] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-pink-soft text-brand-pink-deep">
                bloklanıb
              </span>
            )}
          </div>
          <div className="text-[0.85rem] text-inkdim">
            {a.email} · +994 {formatPhone(a.phone)} · {formatDateTime(a.createdAt)}
          </div>
          <div className="mt-2.5">
            <PermissionChips admin={a} />
          </div>
        </div>
      </div>

      {!a.isSuperAdmin && (
        <>
          {panel === 'permissions' && (
            <div className="mt-4 flex flex-col gap-3">
              <PermissionPicker value={permissions} onChange={setPermissions} />
              <div className="flex gap-2">
                <Button variant="primary" size="sm" loading={busy === 'permissions'} onClick={() => patch('permissions', { permissions }, 'İcazələr saxlandı')}>
                  Yadda saxla
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPermissions(a.permissions)
                    setPanel(null)
                  }}
                >
                  Ləğv et
                </Button>
              </div>
            </div>
          )}

          {panel === 'password' && (
            <div className="mt-4 flex flex-col gap-2 max-w-[460px]">
              <Label htmlFor={`pw-${a.id}`} hint={`ən azı ${MIN_PASSWORD} simvol`}>
                Yeni şifrə
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <TextInput id={`pw-${a.id}`} type="text" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" className="shrink-0 self-start mt-1" onClick={() => setPassword(randomPassword())}>
                  <PiArrowsClockwiseBold size={15} /> Yarat
                </Button>
              </div>
              <p className="text-[0.75rem] text-inkdim">Saxlayanda bu admin bütün cihazlardan çıxarılır — yeni şifrəni ona özün çatdır.</p>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  loading={busy === 'password'}
                  disabled={!password}
                  onClick={() => patch('password', { password }, 'Şifrə yeniləndi')}
                >
                  Şifrəni saxla
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPanel(null)}>
                  Ləğv et
                </Button>
              </div>
            </div>
          )}

          {!panel && (
            <div className="flex flex-wrap items-center gap-1.5 mt-4">
              <Button variant="dark" size="sm" onClick={() => setPanel('permissions')}>
                <PiShieldCheckBold size={15} /> İcazələri dəyiş
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPassword('')
                  setPanel('password')
                }}
              >
                <PiKeyBold size={15} /> Şifrəni yenilə
              </Button>
              {a.blocked ? (
                <Button variant="ghost" size="sm" loading={busy === 'block'} onClick={() => patch('block', { blocked: false }, 'Blok açıldı')}>
                  <PiCheckCircleBold size={15} /> Bloku aç
                </Button>
              ) : (
                <Button variant="ghost" size="sm" loading={busy === 'block'} onClick={() => patch('block', { blocked: true }, 'Bloklandı — panelə girə bilmir')}>
                  <PiProhibitBold size={15} /> Blokla
                </Button>
              )}
              <span className="ml-auto flex flex-wrap gap-1.5">
                <ConfirmButton
                  question="Adi istifadəçi olsun?"
                  onConfirm={() => run('demote', `/admin/admins/${a.id}/demote`, { method: 'POST' }, onRemoved)}
                >
                  <PiShieldSlashBold size={15} /> Adminlikdən çıxar
                </ConfirmButton>
                <ConfirmButton question="Hesab silinsin?" onConfirm={() => run('delete', `/admin/admins/${a.id}`, { method: 'DELETE' }, onRemoved)}>
                  <PiTrashBold size={15} /> Sil
                </ConfirmButton>
              </span>
            </div>
          )}
        </>
      )}

      {done && <p className="mt-3 text-[0.85rem] font-bold text-brand-teal-deep">✓ {done}</p>}
      {error && (
        <div className="mt-3">
          <ErrorBox error={error} />
        </div>
      )}
    </li>
  )
}

// Təsadüfi şifrə: oxşar simvollar (0/O, 1/l/I) yoxdur ki, şəxsə deyəndə qarışmasın
function randomPassword(length = 10) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(bytes, (n) => chars[n % chars.length]).join('')
}

const EMPTY_ADMIN = { firstName: '', lastName: '', email: '', phone: '', password: '', permissions: ['hesabat'] }

function NewAdminForm({ onCreated, onCancel }) {
  const request = useAdminApi()
  const [form, setForm] = useState(EMPTY_ADMIN)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const fields = error?.fields ?? {}
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      onCreated((await request('/admin/admins', { method: 'POST', body: form })).admin)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const input = (key, label, props = {}) => (
    <div>
      <Label htmlFor={`adm-${key}`}>{label}</Label>
      <TextInput id={`adm-${key}`} value={form[key]} onChange={set(key)} error={fields[key]} {...props} />
    </div>
  )

  return (
    <form onSubmit={submit} className={`${card} flex flex-col gap-4`} noValidate>
      <div className="flex items-center gap-2.5">
        <PiUserPlusBold size={20} className="text-primary" />
        <h2 className="font-display font-bold text-[1.15rem]">Yeni admin</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {input('firstName', 'Ad', { autoFocus: true, autoComplete: 'off' })}
        {input('lastName', 'Soyad', { autoComplete: 'off' })}
        {input('email', 'Email', { type: 'email', autoComplete: 'off' })}
        {input('phone', 'Telefon', { type: 'tel', placeholder: '50 123 45 67', autoComplete: 'off' })}
        <div className="sm:col-span-2 max-w-[460px]">
          <Label htmlFor="adm-password" hint={`ən azı ${MIN_PASSWORD} simvol`}>
            Şifrə
          </Label>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <TextInput id="adm-password" type="text" autoComplete="new-password" value={form.password} onChange={set('password')} error={fields.password} />
            </div>
            <Button size="sm" variant="outline" className="shrink-0 self-start mt-1" onClick={() => setForm((f) => ({ ...f, password: randomPassword() }))}>
              <PiArrowsClockwiseBold size={15} /> Yarat
            </Button>
          </div>
          <p className="text-[0.75rem] text-inkdim mt-1">Şifrəni adminə özün çatdır — sonra profilindən dəyişə bilər.</p>
        </div>
      </div>
      <PermissionPicker value={form.permissions} onChange={(permissions) => setForm((f) => ({ ...f, permissions }))} />
      <ErrorBox error={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={saving}>
          Admin yarat
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Ləğv et
        </Button>
      </div>
    </form>
  )
}

// Saytda qeydiyyatı olan istifadəçini tapıb admin etmək
function PromoteForm({ onPromoted, onCancel }) {
  const request = useAdminApi()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [permissions, setPermissions] = useState(['hesabat'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const query = q.trim()
    if (selected || query.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    const id = setTimeout(() => {
      request(`/admin/users?q=${encodeURIComponent(query)}&role=USER&status=active&limit=6`)
        .then((d) => !cancelled && setResults(d.users))
        .catch(() => !cancelled && setResults([]))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, selected])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      onPromoted((await request('/admin/admins/promote', { method: 'POST', body: { userId: selected.id, permissions } })).admin)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className={`${card} flex flex-col gap-4`} noValidate>
      <div className="flex items-center gap-2.5">
        <PiShieldCheckBold size={20} className="text-primary" />
        <h2 className="font-display font-bold text-[1.15rem]">İstifadəçini admin et</h2>
      </div>
      <div className="max-w-[520px]">
        <Label htmlFor="promote-q">Saytda qeydiyyatı olan istifadəçi</Label>
        {selected ? (
          <div className="flex items-center gap-2.5 bg-brand-teal-soft rounded-xl px-3.5 py-2.5">
            <PiUserCircleCheckBold size={22} className="text-brand-teal-deep shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">
                {selected.firstName} {selected.lastName}
              </div>
              <div className="text-[0.78rem] text-inkdim truncate">
                {selected.email} · +994 {formatPhone(selected.phone)}
              </div>
            </div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Seçimi ləğv et" className="p-1.5 rounded-full hover:bg-ink/10">
              <PiXBold size={15} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <PiMagnifyingGlassBold size={17} className="absolute left-3.5 top-[0.85rem] text-inkdim pointer-events-none" />
            <TextInput
              id="promote-q"
              value={q}
              autoFocus
              autoComplete="off"
              placeholder="Ad, email və ya telefon"
              onChange={(e) => setQ(e.target.value)}
              className="pl-10"
            />
            {results.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-xl border border-ink/10 bg-card shadow-xl overflow-hidden">
                {results.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelected(u)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-ink/5 border-b border-ink/5"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold truncate">
                        {u.firstName} {u.lastName}
                      </span>
                      <span className="block text-[0.78rem] text-inkdim truncate">
                        {u.email} · +994 {formatPhone(u.phone)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {selected && <PermissionPicker value={permissions} onChange={setPermissions} />}
      <ErrorBox error={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={saving} disabled={!selected}>
          Admin et
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Ləğv et
        </Button>
      </div>
    </form>
  )
}
