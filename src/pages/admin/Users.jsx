import { useEffect, useState } from 'react'
import {
  PiMagnifyingGlassBold,
  PiXBold,
  PiProhibitBold,
  PiCheckCircleBold,
  PiTrashBold,
  PiCaretDownBold,
  PiFunnelBold,
  PiUserPlusBold,
  PiShieldCheckBold,
  PiShieldSlashBold,
  PiArrowsClockwiseBold,
} from 'react-icons/pi'
import { useAuth } from '../../auth/AuthContext.jsx'
import { assetUrl } from '../../lib/api.js'
import { formatPhone, MIN_PASSWORD } from '../../lib/forms.js'
import {
  useAdminApi,
  card,
  Button,
  ConfirmButton,
  Select,
  Label,
  TextInput,
  ErrorBox,
  Spinner,
  Empty,
  formatDateTime,
} from './ui.jsx'

const PAGE = 50

const EMPTY_FILTERS = { status: '', role: '', joined: '', competitionId: '', sort: 'new' }

const STATUS_LABELS = { UPCOMING: 'gələcək', ONGOING: 'gedir', FINISHED: 'bitib' }

export default function AdminUsers() {
  const request = useAdminApi()
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [result, setResult] = useState(null) // { users, total }
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [competitions, setCompetitions] = useState([])
  const [openId, setOpenId] = useState(null)

  const query = (offset) => {
    const params = new URLSearchParams({ limit: PAGE, offset })
    if (q.trim()) params.set('q', q.trim())
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
    return `/admin/users?${params}`
  }

  // Yazmağı bitirəndən 300 ms sonra axtarır; filtr dəyişəndə də yenidən yükləyir
  useEffect(() => {
    const id = setTimeout(() => {
      setError(null)
      request(query(0))
        .then(setResult)
        .catch(setError)
    }, 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filters])

  useEffect(() => {
    request('/admin/competitions')
      .then((d) => setCompetitions(d.competitions))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const more = await request(query(result.users.length))
      setResult((r) => ({ total: more.total, users: [...r.users, ...more.users] }))
    } catch (err) {
      setError(err)
    } finally {
      setLoadingMore(false)
    }
  }

  const replaceUser = (user) => setResult((r) => ({ ...r, users: r.users.map((u) => (u.id === user.id ? { ...u, ...user } : u)) }))
  const removeUser = (id) => setResult((r) => ({ total: r.total - 1, users: r.users.filter((u) => u.id !== id) }))

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))
  const activeFilters = Object.entries(filters).filter(([k, v]) => v && v !== EMPTY_FILTERS[k]).length

  const [creating, setCreating] = useState(false)
  const [createdName, setCreatedName] = useState(null)

  return (
    <div className="flex flex-col gap-4">
      {creating ? (
        <NewUserForm
          onCancel={() => setCreating(false)}
          onCreated={(user) => {
            setCreating(false)
            setCreatedName(`${user.firstName} ${user.lastName}`)
            setResult((r) => r && { total: r.total + 1, users: [user, ...r.users] })
            setOpenId(user.id)
          }}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={() => {
              setCreating(true)
              setCreatedName(null)
            }}
          >
            <PiUserPlusBold size={17} /> Yeni istifadəçi
          </Button>
          {createdName && (
            <span className="inline-flex items-center gap-1.5 text-brand-teal-deep font-bold text-[0.9rem]">
              <PiCheckCircleBold size={18} /> {createdName} əlavə olundu
            </span>
          )}
        </div>
      )}

      <div className={`${card} flex flex-col gap-4`}>
        <div className="relative">
          <PiMagnifyingGlassBold size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-inkdim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ad, soyad, email və ya telefon (məs. Aysel, 050 123)"
            aria-label="İstifadəçi axtar"
            className="w-full bg-bg border-2 border-ink/10 rounded-full pl-11 pr-11 py-3 outline-none focus:border-primary"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              aria-label="Axtarışı təmizlə"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-inkdim hover:bg-ink/5"
            >
              <PiXBold size={14} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <FilterSelect label="Vəziyyət" value={filters.status} onChange={setFilter('status')}>
            <option value="">Hamısı</option>
            <option value="active">Aktiv</option>
            <option value="blocked">Bloklanmış</option>
          </FilterSelect>
          <FilterSelect label="Rol" value={filters.role} onChange={setFilter('role')}>
            <option value="">Hamısı</option>
            <option value="USER">İstifadəçi</option>
            <option value="ADMIN">Admin</option>
          </FilterSelect>
          <FilterSelect label="Yarışlar" value={filters.joined} onChange={setFilter('joined')}>
            <option value="">Hamısı</option>
            <option value="yes">Yarışa qoşulub</option>
            <option value="no">Heç qoşulmayıb</option>
          </FilterSelect>
          <FilterSelect label="Konkret yarış" value={filters.competitionId} onChange={setFilter('competitionId')}>
            <option value="">Hamısı</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title.az}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Sıralama" value={filters.sort} onChange={setFilter('sort')}>
            <option value="new">Ən yenilər</option>
            <option value="old">Ən köhnələr</option>
            <option value="name">Ada görə (A–Z)</option>
          </FilterSelect>
        </div>

        {activeFilters > 0 && (
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="self-start inline-flex items-center gap-1.5 text-[0.85rem] font-bold text-primary hover:underline"
          >
            <PiFunnelBold size={15} /> Filtrləri sıfırla ({activeFilters})
          </button>
        )}
      </div>

      <ErrorBox error={error} />

      {result === null ? (
        <Spinner />
      ) : result.users.length === 0 ? (
        <Empty>Heç kim tapılmadı.</Empty>
      ) : (
        <>
          <p className="text-[0.85rem] text-inkdim font-semibold">
            {result.total} istifadəçi
            {result.total > result.users.length ? ` · ${result.users.length} göstərilir` : ''}
          </p>
          <div className={`${card} p-2 sm:p-2`}>
            {result.users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                open={openId === u.id}
                onToggle={() => setOpenId(openId === u.id ? null : u.id)}
                onChanged={replaceUser}
                onDeleted={() => removeUser(u.id)}
                onError={setError}
              />
            ))}
          </div>
          {result.total > result.users.length && (
            <Button onClick={loadMore} loading={loadingMore} className="self-center">
              Daha çox göstər
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function FilterSelect({ label, children, ...props }) {
  return (
    <label className="flex flex-col gap-1 text-[0.78rem] font-bold text-inkdim">
      {label}
      <Select {...props}>{children}</Select>
    </label>
  )
}

function Avatar({ user }) {
  return user.avatarUrl ? (
    <img src={assetUrl(user.avatarUrl)} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
  ) : (
    <span className="w-10 h-10 rounded-full bg-brand-orange-soft text-brand-orange-deep font-bold flex items-center justify-center shrink-0">
      {user.firstName.charAt(0)}
    </span>
  )
}

function UserRow({ user: u, open, onToggle, onChanged, onDeleted, onError }) {
  const request = useAdminApi()
  const { user: me } = useAuth()
  const [busy, setBusy] = useState(null) // hansı düymə işləyir
  const isAdmin = u.role === 'ADMIN'
  const isSelf = me?.id === u.id

  const update = async (body, which) => {
    setBusy(which)
    try {
      onChanged((await request(`/admin/users/${u.id}`, { method: 'PATCH', body })).user)
    } catch (err) {
      onError(err)
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    try {
      await request(`/admin/users/${u.id}`, { method: 'DELETE' })
      onDeleted()
    } catch (err) {
      onError(err)
    }
  }

  let actions
  if (isSelf) {
    actions = <p className="text-[0.82rem] text-inkdim">Bu sənin hesabındır — öz rolunu və hesabını buradan dəyişə bilməzsən.</p>
  } else if (isAdmin) {
    actions = (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" loading={busy === 'role'} onClick={() => update({ role: 'USER' }, 'role')}>
            <PiShieldSlashBold size={15} /> Adminlikdən çıxar
          </Button>
        </div>
        <p className="text-[0.78rem] text-inkdim">
          Admin panelə girə bilir. Bloklamaq və ya silmək üçün əvvəl adminlikdən çıxar.
        </p>
      </>
    )
  } else {
    actions = (
      <>
        <div className="flex flex-wrap items-center gap-2">
          {u.blocked ? (
            <Button size="sm" variant="outline" loading={busy === 'block'} onClick={() => update({ blocked: false }, 'block')}>
              <PiCheckCircleBold size={15} /> Bloku aç
            </Button>
          ) : (
            <Button size="sm" variant="outline" loading={busy === 'block'} onClick={() => update({ blocked: true }, 'block')}>
              <PiProhibitBold size={15} /> Blokla
            </Button>
          )}
          <Button size="sm" variant="outline" loading={busy === 'role'} onClick={() => update({ role: 'ADMIN' }, 'role')}>
            <PiShieldCheckBold size={15} /> Admin et
          </Button>
          <ConfirmButton onConfirm={remove} question="Hesab və komandaları silinsin?">
            <PiTrashBold size={15} /> Sil
          </ConfirmButton>
        </div>
        <p className="text-[0.78rem] text-inkdim">
          Bloklanan istifadəçi sayta daxil ola bilmir, komandaları lövhədə qalır. Silinəndə hesab və bütün komandaları
          həmişəlik silinir. Admin edilən istifadəçi admin panelə girə bilir.
        </p>
      </>
    )
  }

  return (
    <div className={`border-b border-ink/5 last:border-none ${u.blocked ? 'bg-ink/[0.03] rounded-xl' : ''}`}>
      <button onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-3 px-3 py-3 text-left">
        <span className={u.blocked ? 'opacity-50 grayscale' : ''}>
          <Avatar user={u} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">
            {u.firstName} {u.lastName}
            {isAdmin && (
              <span className="ml-2 text-[0.7rem] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-purple-soft text-brand-purple-deep">
                admin
              </span>
            )}
            {u.blocked && (
              <span className="ml-2 text-[0.7rem] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-pink-soft text-brand-pink-deep">
                bloklanıb
              </span>
            )}
          </div>
          <div className="text-[0.82rem] text-inkdim truncate">
            {u.email} · +994 {formatPhone(u.phone)}
          </div>
        </div>
        <div className="hidden sm:block text-right text-[0.8rem] text-inkdim shrink-0">
          <div>{u.teamCount} yarış</div>
          <div>{formatDateTime(u.createdAt)}</div>
        </div>
        <PiCaretDownBold size={16} className={`shrink-0 text-inkdim transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-3 pb-4 sm:pl-16 flex flex-col gap-3">
          <UserTeams userId={u.id} />
          <div className="text-[0.8rem] text-inkdim">
            Qeydiyyat: {formatDateTime(u.createdAt)}
            {u.blockedAt && ` · Bloklanıb: ${formatDateTime(u.blockedAt)}`}
          </div>
          {actions}
        </div>
      )}
    </div>
  )
}

function UserTeams({ userId }) {
  const request = useAdminApi()
  const [teams, setTeams] = useState(null)

  useEffect(() => {
    request(`/admin/users/${userId}`)
      .then((d) => setTeams(d.teams))
      .catch(() => setTeams([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (teams === null) return <p className="text-[0.85rem] text-inkdim">Yüklənir…</p>
  if (teams.length === 0) return <p className="text-[0.85rem] text-inkdim">Heç bir yarışa qoşulmayıb.</p>
  return (
    <ul className="flex flex-col gap-1.5">
      {teams.map((t) => (
        <li key={t.id} className="flex flex-wrap items-baseline gap-x-2 text-[0.88rem] bg-bg rounded-xl px-3 py-2">
          <span className="font-bold">{t.competition.title.az}</span>
          <span className="text-inkdim">({STATUS_LABELS[t.competition.status]})</span>
          <span className="text-inkdim">·</span>
          <span>
            komanda <b>{t.name}</b>
          </span>
          <span className="ml-auto font-bold text-primary">{t.points} xal</span>
        </li>
      ))}
    </ul>
  )
}

// Təsadüfi şifrə: oxşar simvollar (0/O, 1/l/I) yoxdur ki, şəxsə deyəndə qarışmasın
function randomPassword(length = 10) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(bytes, (n) => chars[n % chars.length]).join('')
}

const EMPTY_USER = { firstName: '', lastName: '', email: '', phone: '', password: '', role: 'USER' }

function NewUserForm({ onCreated, onCancel }) {
  const request = useAdminApi()
  const [form, setForm] = useState(EMPTY_USER)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const fields = error?.fields ?? {}

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      onCreated((await request('/admin/users', { method: 'POST', body: form })).user)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const input = (key, label, props = {}) => (
    <div>
      <Label htmlFor={`new-${key}`}>{label}</Label>
      <TextInput id={`new-${key}`} value={form[key]} onChange={set(key)} error={fields[key]} {...props} />
    </div>
  )

  return (
    <form onSubmit={submit} className={`${card} flex flex-col gap-4`} noValidate>
      <div className="flex items-center gap-2.5">
        <PiUserPlusBold size={20} className="text-primary" />
        <h2 className="font-display font-bold text-[1.15rem]">Yeni istifadəçi</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {input('firstName', 'Ad', { autoFocus: true, autoComplete: 'off' })}
        {input('lastName', 'Soyad', { autoComplete: 'off' })}
        {input('email', 'Email', { type: 'email', autoComplete: 'off' })}
        {input('phone', 'Telefon', { type: 'tel', placeholder: '50 123 45 67', autoComplete: 'off' })}
        <div>
          <Label htmlFor="new-password" hint={`ən azı ${MIN_PASSWORD} simvol`}>
            Şifrə
          </Label>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <TextInput
                id="new-password"
                type="text"
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
                error={fields.password}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 self-start mt-1"
              onClick={() => setForm((f) => ({ ...f, password: randomPassword() }))}
            >
              <PiArrowsClockwiseBold size={15} /> Yarat
            </Button>
          </div>
          <p className="text-[0.75rem] text-inkdim mt-1">Şifrəni şəxsə özün çatdır — sonra profilindən dəyişə bilər.</p>
        </div>
        <div>
          <Label htmlFor="new-role">Rol</Label>
          <Select id="new-role" value={form.role} onChange={set('role')}>
            <option value="USER">İstifadəçi</option>
            <option value="ADMIN">Admin — admin panelə girə bilir</option>
          </Select>
        </div>
      </div>
      <ErrorBox error={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={saving}>
          Əlavə et
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Ləğv et
        </Button>
      </div>
    </form>
  )
}
