import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PiPlusBold,
  PiPencilSimpleBold,
  PiTrashBold,
  PiArrowUpBold,
  PiArrowDownBold,
  PiArrowLeftBold,
  PiEyeBold,
  PiEyeSlashBold,
  PiUploadSimpleBold,
  PiArrowSquareOutBold,
} from 'react-icons/pi'
import { assetUrl } from '../../lib/api.js'
import {
  useAdminApi,
  card,
  Button,
  ConfirmButton,
  Label,
  TextInput,
  Checkbox,
  ErrorBox,
  LocalizedField,
  emptyLocalized,
  Spinner,
  Empty,
} from './ui.jsx'

const MAX_UPLOAD = 10 * 1024 * 1024

// Admin → Oyunlar: saytdakı /oyunlar səhifəsinin kartları
export default function AdminGames() {
  const request = useAdminApi()
  const [games, setGames] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null) // null | 'new' | oyun
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    request('/admin/games')
      .then((d) => setGames(d.games))
      .catch(setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(load, [load])

  if (editing)
    return (
      <GameForm
        game={editing === 'new' ? null : editing}
        onDone={() => {
          setEditing(null)
          load()
        }}
      />
    )

  const move = async (index, delta) => {
    const ids = games.map((g) => g.id)
    const target = index + delta
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    setBusy(true)
    try {
      setGames((await request('/admin/games/order', { method: 'PUT', body: { ids } })).games)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (game) => {
    try {
      await request(`/admin/games/${game.id}`, { method: 'PATCH', body: { active: !game.active } })
      load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-inkdim">
          Saytdakı{' '}
          <a href="/oyunlar" target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">
            Oyunlar səhifəsi
          </a>
          . Hər oyun kart kimi görünür; karta basanda "necə oynanılır" səhifəsi açılır.
        </p>
        <Button variant="primary" onClick={() => setEditing('new')} className="shrink-0">
          <PiPlusBold size={16} /> Yeni oyun
        </Button>
      </div>
      <ErrorBox error={error} />
      {games === null ? (
        <Spinner />
      ) : games.length === 0 ? (
        <Empty>Hələ oyun yoxdur. "Yeni oyun" ilə əlavə et.</Empty>
      ) : (
        games.map((g, i) => (
          <div key={g.id} className={`${card} flex flex-col sm:flex-row sm:items-center gap-4 ${g.active ? '' : 'opacity-60'}`}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <span className="w-7 text-center font-display font-bold text-inkdim">{i + 1}</span>
              <img src={assetUrl(g.imageUrl)} alt="" className="w-24 aspect-[4/3] shrink-0 rounded-xl object-cover bg-night" />
              <div className="min-w-0">
                <div className="font-display font-bold text-[1.1rem] truncate">{g.title.az}</div>
                <p className="text-[0.85rem] text-inkdim line-clamp-1">{g.summary.az}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5 text-[0.75rem] font-bold">
                  {[g.players && `👥 ${g.players}`, g.duration && `⏱ ${g.duration}`, g.age && g.age].filter(Boolean).map((f) => (
                    <span key={f} className="px-2 py-0.5 rounded-full bg-brand-teal-soft text-brand-teal-deep">
                      {f}
                    </span>
                  ))}
                  {['en', 'ru'].map((l) => (
                    <span key={l} className={`px-2 py-0.5 rounded-full ${g.title[l] ? 'bg-brand-teal-soft text-brand-teal-deep' : 'bg-ink/5 text-inkdim'}`}>
                      {l.toUpperCase()} {g.title[l] ? '✓' : '—'}
                    </span>
                  ))}
                  {!g.active && <span className="px-2 py-0.5 rounded-full bg-ink text-bg">gizli</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="ghost" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Yuxarı">
                <PiArrowUpBold size={16} />
              </Button>
              <Button size="sm" variant="ghost" disabled={busy || i === games.length - 1} onClick={() => move(i, 1)} aria-label="Aşağı">
                <PiArrowDownBold size={16} />
              </Button>
              <Button size="sm" onClick={() => toggleActive(g)}>
                {g.active ? <PiEyeSlashBold size={15} /> : <PiEyeBold size={15} />} {g.active ? 'Gizlət' : 'Göstər'}
              </Button>
              <Button size="sm" onClick={() => setEditing(g)}>
                <PiPencilSimpleBold size={15} /> Redaktə
              </Button>
              <ConfirmButton
                question="Oyun silinsin?"
                onConfirm={async () => {
                  try {
                    await request(`/admin/games/${g.id}`, { method: 'DELETE' })
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

function GameForm({ game, onDone }) {
  const request = useAdminApi()
  const fileInput = useRef(null)
  const [form, setForm] = useState(() => ({
    imageId: null, // yalnız yeni şəkil yüklənəndə dolur
    title: { ...emptyLocalized(), ...game?.title },
    summary: { ...emptyLocalized(), ...game?.summary },
    howTo: { ...emptyLocalized(), ...game?.howTo },
    players: game?.players ?? '',
    duration: game?.duration ?? '',
    age: game?.age ?? '',
    active: game?.active ?? true,
  }))
  const [preview, setPreview] = useState(game ? assetUrl(game.imageUrl) : null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const fields = error?.fields ?? {}

  const upload = async (file) => {
    if (!file) return
    setError(null)
    if (file.size > MAX_UPLOAD) return setError({ code: 'IMAGE_TOO_LARGE', message: 'Fayl çox böyükdür (ən çox 10 MB).' })
    setUploading(true)
    try {
      const { image } = await request('/admin/images', { method: 'POST', body: file })
      setForm((f) => ({ ...f, imageId: image.id }))
      setPreview(assetUrl(image.url))
    } catch (err) {
      setError(err)
    } finally {
      setUploading(false)
      fileInput.current.value = ''
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!game && !form.imageId) return setError({ code: 'VALIDATION', message: 'Şəkil yüklə.' })
    setSaving(true)
    setError(null)
    try {
      const { imageId, ...rest } = form
      const body = { ...rest, ...(imageId ? { imageId } : {}) }
      await request(game ? `/admin/games/${game.id}` : '/admin/games', { method: game ? 'PATCH' : 'POST', body })
      onDone()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className={`${card} flex flex-col gap-5 max-w-[860px]`}>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onDone}>
          <PiArrowLeftBold size={15} /> Geri
        </Button>
        <h2 className="font-display font-bold text-[1.3rem]">{game ? 'Oyunu redaktə et' : 'Yeni oyun'}</h2>
        {game && (
          <a href={`/oyunlar/${game.id}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[0.85rem] font-bold text-primary hover:underline">
            Saytda bax <PiArrowSquareOutBold size={14} />
          </a>
        )}
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <div className="flex flex-col gap-3">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-night flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white/60 text-[0.85rem] font-semibold px-4 text-center">Şəkil seçilməyib</span>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files[0])} />
          <Button loading={uploading} onClick={() => fileInput.current.click()}>
            <PiUploadSimpleBold size={16} /> {preview ? 'Şəkli əvəz et' : 'Şəkil yüklə'}
          </Button>
          <p className="text-[0.78rem] text-inkdim">Üfüqi şəkil yaxşı görünür (kartda 4:3). 10 MB-a qədər, avtomatik kiçildilir.</p>

          <div>
            <Label htmlFor="g-players">Oyunçu sayı</Label>
            <TextInput id="g-players" maxLength={30} placeholder="məs. 2–6" value={form.players} onChange={(e) => set('players')(e.target.value)} error={fields.players} />
          </div>
          <div>
            <Label htmlFor="g-duration">Müddət</Label>
            <TextInput id="g-duration" maxLength={30} placeholder="məs. 30–45 dəq" value={form.duration} onChange={(e) => set('duration')(e.target.value)} error={fields.duration} />
          </div>
          <div>
            <Label htmlFor="g-age">Yaş</Label>
            <TextInput id="g-age" maxLength={30} placeholder="məs. 8+" value={form.age} onChange={(e) => set('age')(e.target.value)} error={fields.age} />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <LocalizedField label="Oyunun adı" required maxLength={80} value={form.title} onChange={set('title')} error={fields['title.az']} />
          <LocalizedField label="Qısa təsvir (kartda)" multiline maxLength={300} value={form.summary} onChange={set('summary')} />
          <div>
            <LocalizedField label="Necə oynanılır" multiline maxLength={5000} value={form.howTo} onChange={set('howTo')} />
            <p className="text-[0.78rem] text-inkdim mt-1">Oyunun səhifəsində görünür. Abzasları boş sətirlə ayır.</p>
          </div>
          <Checkbox checked={form.active} onChange={set('active')}>
            Saytda göstər
          </Checkbox>
        </div>
      </div>

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
