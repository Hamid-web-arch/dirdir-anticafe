import { useCallback, useEffect, useState } from 'react'
import { PiPlusBold, PiPencilSimpleBold, PiTrashBold, PiUsersThreeBold, PiArrowLeftBold, PiClockCounterClockwiseBold, PiGiftBold, PiXBold } from 'react-icons/pi'
import { formatPhone } from '../../lib/forms.js'
import {
  useAdminApi,
  card,
  Button,
  ConfirmButton,
  Label,
  TextInput,
  Select,
  Checkbox,
  ErrorBox,
  LocalizedField,
  emptyLocalized,
  toLocalInput,
  fromLocalInput,
  formatDateTime,
  Spinner,
  Empty,
} from './ui.jsx'

const STATUS = {
  UPCOMING: { label: 'Tezliklə', style: 'bg-brand-purple-soft text-brand-purple-deep' },
  ONGOING: { label: 'Gedir', style: 'bg-brand-teal-soft text-brand-teal-deep' },
  FINISHED: { label: 'Bitib', style: 'bg-ink/5 text-inkdim' },
}

export default function AdminCompetitions() {
  const request = useAdminApi()
  const [list, setList] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null) // null | 'new' | yarış obyekti
  const [teamsOf, setTeamsOf] = useState(null) // komandalarına baxılan yarış

  const load = useCallback(() => {
    request('/admin/competitions')
      .then((d) => setList(d.competitions))
      .catch(setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(load, [load])

  if (teamsOf) return <Teams competition={teamsOf} onBack={() => (setTeamsOf(null), load())} />
  if (editing)
    return (
      <CompetitionForm
        competition={editing === 'new' ? null : editing}
        onDone={() => {
          setEditing(null)
          load()
        }}
      />
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-inkdim">Yarışlar saytın Arena səhifəsində görünür. İstifadəçilər komanda adı ilə qoşulur.</p>
        <Button variant="primary" onClick={() => setEditing('new')} className="shrink-0">
          <PiPlusBold size={16} /> Yeni yarış
        </Button>
      </div>
      <ErrorBox error={error} />
      {list === null ? (
        <Spinner />
      ) : list.length === 0 ? (
        <Empty>Hələ yarış yoxdur. "Yeni yarış" ilə ilkini yarat.</Empty>
      ) : (
        list.map((c) => (
          <div key={c.id} className={`${card} flex flex-col md:flex-row md:items-center gap-4`}>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-[0.72rem] font-bold uppercase px-2.5 py-1 rounded-full ${STATUS[c.status].style}`}>
                  {STATUS[c.status].label}
                </span>
                {!c.registrationOpen && (
                  <span className="text-[0.72rem] font-bold uppercase px-2.5 py-1 rounded-full bg-ink/5 text-inkdim">qeydiyyat bağlı</span>
                )}
              </div>
              <h3 className="font-display font-bold text-[1.15rem] truncate">{c.title.az}</h3>
              <p className="text-[0.85rem] text-inkdim">
                {formatDateTime(c.startsAt)} · {c.teamCount} komanda{c.maxTeams ? ` / ${c.maxTeams}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="dark" size="sm" onClick={() => setTeamsOf(c)}>
                <PiUsersThreeBold size={15} /> Komandalar və xallar
              </Button>
              <Button size="sm" onClick={() => setEditing(c)}>
                <PiPencilSimpleBold size={15} /> Redaktə
              </Button>
              <ConfirmButton
                question="Yarış və bütün komandaları silinsin?"
                onConfirm={async () => {
                  try {
                    await request(`/admin/competitions/${c.id}`, { method: 'DELETE' })
                    load()
                  } catch (err) {
                    setError(err)
                  }
                }}
              >
                <PiTrashBold size={15} /> Sil
              </ConfirmButton>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function CompetitionForm({ competition, onDone }) {
  const request = useAdminApi()
  const [form, setForm] = useState(() => ({
    title: { ...emptyLocalized(), ...competition?.title },
    description: { ...emptyLocalized(), ...competition?.description },
    startsAt: toLocalInput(competition?.startsAt),
    status: competition?.status ?? 'UPCOMING',
    registrationOpen: competition?.registrationOpen ?? true,
    maxTeams: competition?.maxTeams ?? '',
    prizes: (competition?.prizes ?? []).map((p) => ({ place: String(p.place), title: { ...emptyLocalized(), ...p.title } })),
  }))
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        ...form,
        startsAt: fromLocalInput(form.startsAt),
        maxTeams: form.maxTeams === '' ? null : Number(form.maxTeams),
        prizes: form.prizes.map((p) => ({ place: Number(p.place), title: p.title })),
      }
      await request(competition ? `/admin/competitions/${competition.id}` : '/admin/competitions', {
        method: competition ? 'PATCH' : 'POST',
        body,
      })
      onDone()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className={`${card} flex flex-col gap-5 max-w-[720px]`}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onDone}>
          <PiArrowLeftBold size={15} /> Geri
        </Button>
        <h2 className="font-display font-bold text-[1.3rem]">{competition ? 'Yarışı redaktə et' : 'Yeni yarış'}</h2>
      </div>

      <LocalizedField label="Ad" required maxLength={80} value={form.title} onChange={set('title')} error={error?.fields?.['title.az']} />
      <LocalizedField label="Təsvir" multiline maxLength={1000} value={form.description} onChange={set('description')} />

      <PrizesEditor prizes={form.prizes} onChange={set('prizes')} errors={error?.fields ?? {}} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="c-start">Başlanğıc</Label>
          <TextInput id="c-start" type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt')(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="c-status">Vəziyyət</Label>
          <Select id="c-status" value={form.status} onChange={(e) => set('status')(e.target.value)}>
            {Object.entries(STATUS).map(([value, s]) => (
              <option key={value} value={value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="c-max" hint="boş = limitsiz">
            Maksimum komanda
          </Label>
          <TextInput
            id="c-max"
            type="number"
            min={2}
            max={500}
            value={form.maxTeams}
            onChange={(e) => set('maxTeams')(e.target.value)}
          />
        </div>
        <div className="flex items-end pb-2">
          <Checkbox checked={form.registrationOpen} onChange={set('registrationOpen')}>
            Qeydiyyat açıqdır
          </Checkbox>
        </div>
      </div>
      <p className="text-[0.82rem] text-inkdim">
        Qoşulmaq üçün qeydiyyat açıq olmalı və yarış bitməmiş olmalıdır. İstifadəçi komandadan yalnız "Tezliklə" vəziyyətində çıxa bilər.
      </p>

      <ErrorBox error={error} />
      <div className="flex gap-2.5">
        <Button type="submit" variant="primary" loading={saving}>
          Yadda saxla
        </Button>
        <Button onClick={onDone}>Ləğv et</Button>
      </div>
    </form>
  )
}

// Hədiyyələr: hər sətir — yer (1, 2, 3...) və hədiyyənin adı 3 dildə. Saytda yerə görə sıralı görünür.
function PrizesEditor({ prizes, onChange, errors }) {
  const update = (i, patch) => onChange(prizes.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const add = () => {
    const next = Math.max(0, ...prizes.map((p) => Number(p.place) || 0)) + 1
    onChange([...prizes, { place: String(next), title: emptyLocalized() }])
  }
  const remove = (i) => onChange(prizes.filter((_, j) => j !== i))
  const listError = errors.prizes

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[0.85rem] font-bold">
          <PiGiftBold size={17} className="text-primary" /> Hədiyyələr
        </span>
        <Button size="sm" onClick={add} disabled={prizes.length >= 20}>
          <PiPlusBold size={14} /> Hədiyyə əlavə et
        </Button>
      </div>

      {prizes.length === 0 ? (
        <p className="text-[0.85rem] text-inkdim bg-bg rounded-xl px-4 py-3">
          Hədiyyə yoxdur — saytda hədiyyələr bölməsi görünməyəcək.
        </p>
      ) : (
        prizes.map((prize, i) => (
          <div key={i} className="flex gap-3 items-start bg-bg rounded-2xl p-3 sm:p-4">
            <div className="w-20 shrink-0">
              <Label htmlFor={`prize-place-${i}`}>Yer</Label>
              <TextInput
                id={`prize-place-${i}`}
                type="number"
                min={1}
                max={100}
                value={prize.place}
                onChange={(e) => update(i, { place: e.target.value })}
                error={errors[`prizes.${i}.place`]}
              />
            </div>
            <div className="flex-1 min-w-0">
              <LocalizedField
                label="Hədiyyə"
                required
                maxLength={120}
                value={prize.title}
                onChange={(title) => update(i, { title })}
                error={errors[`prizes.${i}.title.az`]}
              />
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Hədiyyəni sil"
              className="mt-7 w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-inkdim hover:bg-brand-pink-soft hover:text-brand-pink-deep"
            >
              <PiXBold size={16} />
            </button>
          </div>
        ))
      )}
      {listError && <p className="text-[0.8rem] font-semibold text-brand-pink-deep">{listError}</p>}
    </div>
  )
}

function Teams({ competition, onBack }) {
  const request = useAdminApi()
  const [teams, setTeams] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    request(`/admin/competitions/${competition.id}/teams`)
      .then((d) => setTeams(d.teams))
      .catch(setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition.id])
  useEffect(load, [load])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <PiArrowLeftBold size={15} /> Yarışlar
        </Button>
        <h2 className="font-display font-bold text-[1.3rem]">{competition.title.az}</h2>
        <span className={`text-[0.72rem] font-bold uppercase px-2.5 py-1 rounded-full ${STATUS[competition.status].style}`}>
          {STATUS[competition.status].label}
        </span>
      </div>
      <ErrorBox error={error} />
      {teams === null ? (
        <Spinner />
      ) : teams.length === 0 ? (
        <Empty>Bu yarışa hələ komanda qoşulmayıb.</Empty>
      ) : (
        teams.map((team) => <TeamRow key={team.id} team={team} onChanged={load} onError={setError} />)
      )}
    </div>
  )
}

function TeamRow({ team, onChanged, onError }) {
  const request = useAdminApi()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState(null)

  const award = async (value) => {
    const n = Number(value)
    if (!Number.isInteger(n) || n === 0 || !reason.trim()) {
      return onError({ code: 'VALIDATION', message: 'Xal (tam ədəd, 0 olmayan) və səbəb yazılmalıdır.' })
    }
    setSaving(true)
    try {
      await request(`/admin/teams/${team.id}/points`, { method: 'POST', body: { amount: n, reason: reason.trim() } })
      setAmount('')
      setHistory(null)
      onChanged()
    } catch (err) {
      onError(err)
    } finally {
      setSaving(false)
    }
  }

  const toggleHistory = async () => {
    if (history) return setHistory(null)
    try {
      setHistory((await request(`/admin/teams/${team.id}/points`)).entries)
    } catch (err) {
      onError(err)
    }
  }

  return (
    <div className={card}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-brand-orange-soft text-brand-orange-deep font-display font-bold flex items-center justify-center">
            #{team.rank}
          </span>
          <div className="min-w-0">
            <div className="font-display font-bold text-[1.1rem] truncate">
              {team.name} · <span className="text-primary">{team.points} xal</span>
            </div>
            <div className="text-[0.82rem] text-inkdim truncate">
              {team.user.blockedAt && <span className="font-bold text-brand-pink-deep">bloklanıb · </span>}
              {team.user.firstName} {team.user.lastName} · +994 {formatPhone(team.user.phone)} · {team.user.email}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Səbəb (məs. 2-ci tur)"
            maxLength={200}
            className="w-44 bg-bg border-2 border-ink/10 rounded-full px-3.5 py-1.5 text-[0.85rem] outline-none focus:border-primary"
          />
          {[1, 5, 10].map((n) => (
            <Button key={n} size="sm" variant="outline" disabled={saving} onClick={() => award(n)}>
              +{n}
            </Button>
          ))}
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="±"
            className="w-20 bg-bg border-2 border-ink/10 rounded-full px-3 py-1.5 text-[0.85rem] outline-none focus:border-primary"
          />
          <Button size="sm" variant="primary" loading={saving} onClick={() => award(amount)}>
            Əlavə et
          </Button>
          <Button size="sm" variant="ghost" onClick={toggleHistory} aria-label="Xal tarixçəsi">
            <PiClockCounterClockwiseBold size={16} />
          </Button>
          <ConfirmButton
            question="Komanda silinsin?"
            onConfirm={async () => {
              try {
                await request(`/admin/teams/${team.id}`, { method: 'DELETE' })
                onChanged()
              } catch (err) {
                onError(err)
              }
            }}
          >
            <PiTrashBold size={15} />
          </ConfirmButton>
        </div>
      </div>

      {history && (
        <ul className="mt-4 border-t border-ink/10 pt-3 flex flex-col gap-1.5 text-[0.85rem]">
          {history.length === 0 && <li className="text-inkdim">Hələ xal verilməyib.</li>}
          {history.map((h) => (
            <li key={h.id} className="flex gap-3">
              <span className={`w-12 font-bold ${h.amount > 0 ? 'text-brand-teal-deep' : 'text-brand-pink-deep'}`}>
                {h.amount > 0 ? `+${h.amount}` : h.amount}
              </span>
              <span className="flex-1">{h.reason}</span>
              <span className="text-inkdim">
                {formatDateTime(h.createdAt)}
                {h.createdBy && ` · ${h.createdBy.firstName}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
