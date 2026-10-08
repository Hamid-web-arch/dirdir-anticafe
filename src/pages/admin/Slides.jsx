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
  PiLinkBold,
} from 'react-icons/pi'
import { assetUrl } from '../../lib/api.js'
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
  Spinner,
  Empty,
} from './ui.jsx'

const MAX_UPLOAD = 10 * 1024 * 1024

export default function AdminSlides() {
  const request = useAdminApi()
  const [slides, setSlides] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null) // null | 'new' | slayd
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    request('/admin/slides')
      .then((d) => setSlides(d.slides))
      .catch(setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(load, [load])

  if (editing)
    return (
      <SlideForm
        slide={editing === 'new' ? null : editing}
        onDone={() => {
          setEditing(null)
          load()
        }}
      />
    )

  // Bir slaydı yuxarı/aşağı aparır: bütün sıranı serverə göndəririk.
  const move = async (index, delta) => {
    const ids = slides.map((s) => s.id)
    const target = index + delta
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    setBusy(true)
    try {
      setSlides((await request('/admin/slides/order', { method: 'PUT', body: { ids } })).slides)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (slide) => {
    try {
      await request(`/admin/slides/${slide.id}`, { method: 'PATCH', body: { active: !slide.active } })
      load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-inkdim">Ana səhifədəki "Nələr var?" slayderi. Sıra buradakı kimidir; gizlədilən slayd saytda görünmür.</p>
        <Button variant="primary" onClick={() => setEditing('new')} className="shrink-0">
          <PiPlusBold size={16} /> Yeni slayd
        </Button>
      </div>
      <ErrorBox error={error} />
      {slides === null ? (
        <Spinner />
      ) : slides.length === 0 ? (
        <Empty>Slayd yoxdur — slayder saytda gizlənir. "Yeni slayd" ilə əlavə et.</Empty>
      ) : (
        slides.map((s, i) => (
          <div key={s.id} className={`${card} flex flex-col sm:flex-row sm:items-center gap-4 ${s.active ? '' : 'opacity-60'}`}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <span className="w-7 text-center font-display font-bold text-inkdim">{i + 1}</span>
              <img
                src={assetUrl(s.imageUrl)}
                alt=""
                className={`w-20 h-24 shrink-0 rounded-xl bg-night ${s.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
              />
              <div className="min-w-0">
                <h3 className="font-display font-bold text-[1.1rem] truncate">{s.title.az}</h3>
                <p className="text-[0.85rem] text-inkdim line-clamp-2">{s.desc.az}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5 text-[0.75rem] font-bold">
                  {['en', 'ru'].map((l) => (
                    <span key={l} className={`px-2 py-0.5 rounded-full ${s.title[l] ? 'bg-brand-teal-soft text-brand-teal-deep' : 'bg-ink/5 text-inkdim'}`}>
                      {l.toUpperCase()} {s.title[l] ? '✓' : '—'}
                    </span>
                  ))}
                  {s.hasDetails && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-orange-soft text-brand-orange-deep">ətraflı səhifə ✓</span>
                  )}
                  {s.link && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-purple-soft text-brand-purple-deep">
                      <PiLinkBold size={12} /> {s.link}
                    </span>
                  )}
                  {!s.active && <span className="px-2 py-0.5 rounded-full bg-ink text-bg">gizli</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="ghost" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Yuxarı">
                <PiArrowUpBold size={16} />
              </Button>
              <Button size="sm" variant="ghost" disabled={busy || i === slides.length - 1} onClick={() => move(i, 1)} aria-label="Aşağı">
                <PiArrowDownBold size={16} />
              </Button>
              <Button size="sm" onClick={() => toggleActive(s)}>
                {s.active ? <PiEyeSlashBold size={15} /> : <PiEyeBold size={15} />} {s.active ? 'Gizlət' : 'Göstər'}
              </Button>
              <Button size="sm" onClick={() => setEditing(s)}>
                <PiPencilSimpleBold size={15} /> Redaktə
              </Button>
              <ConfirmButton
                question="Slayd silinsin?"
                onConfirm={async () => {
                  try {
                    await request(`/admin/slides/${s.id}`, { method: 'DELETE' })
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

function SlideForm({ slide, onDone }) {
  const request = useAdminApi()
  const fileInput = useRef(null)
  const [form, setForm] = useState(() => ({
    imageId: null, // yalnız yeni şəkil yüklənəndə dolur (redaktədə köhnə şəkil qalır)
    fit: slide?.fit ?? 'cover',
    title: { ...emptyLocalized(), ...slide?.title },
    desc: { ...emptyLocalized(), ...slide?.desc },
    body: { ...emptyLocalized(), ...slide?.body },
    link: slide?.link ?? '',
    active: slide?.active ?? true,
  }))
  const [preview, setPreview] = useState(slide ? assetUrl(slide.imageUrl) : null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

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
    if (!slide && !form.imageId) return setError({ code: 'VALIDATION', message: 'Şəkil yüklə.' })
    setSaving(true)
    setError(null)
    try {
      const { imageId, ...rest } = form
      const body = { ...rest, link: form.link.trim() || null, ...(imageId ? { imageId } : {}) }
      await request(slide ? `/admin/slides/${slide.id}` : '/admin/slides', { method: slide ? 'PATCH' : 'POST', body })
      onDone()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className={`${card} flex flex-col gap-5 max-w-[860px]`}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onDone}>
          <PiArrowLeftBold size={15} /> Geri
        </Button>
        <h2 className="font-display font-bold text-[1.3rem]">{slide ? 'Slaydı redaktə et' : 'Yeni slayd'}</h2>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <div className="flex flex-col gap-3">
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-night flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="" className={`w-full h-full ${form.fit === 'contain' ? 'object-contain' : 'object-cover'}`} />
            ) : (
              <span className="text-white/60 text-[0.85rem] font-semibold px-4 text-center">Şəkil seçilməyib</span>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files[0])} />
          <Button loading={uploading} onClick={() => fileInput.current.click()}>
            <PiUploadSimpleBold size={16} /> {preview ? 'Şəkli əvəz et' : 'Şəkil yüklə'}
          </Button>
          <p className="text-[0.78rem] text-inkdim">
            İstənilən şəkil olar (10 MB-a qədər) — avtomatik kiçildilir. Şaquli şəkillər daha yaxşı görünür.
          </p>
          <div>
            <Label htmlFor="s-fit">Şəkil necə yerləşsin</Label>
            <Select id="s-fit" value={form.fit} onChange={(e) => set('fit')(e.target.value)}>
              <option value="cover">Doldur (kənarları kəsilə bilər)</option>
              <option value="contain">Tam göstər (yazılı posterlər üçün)</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <LocalizedField label="Başlıq" required maxLength={80} value={form.title} onChange={set('title')} error={error?.fields?.['title.az']} />
          <LocalizedField label="Mətn" multiline maxLength={300} value={form.desc} onChange={set('desc')} />
          <div>
            <LocalizedField
              label='"Ətraflı" səhifəsinin mətni'
              multiline
              maxLength={5000}
              value={form.body}
              onChange={set('body')}
            />
            <p className="text-[0.78rem] text-inkdim mt-1">
              Yazılsa, "Ətraflı bax" düyməsi bu slaydın öz səhifəsini açır. Abzasları boş sətirlə ayır.
            </p>
          </div>
          <div>
            <Label htmlFor="s-link" hint="yuxarıdakı mətn boşdursa işləyir">
              "Ətraflı bax" linki
            </Label>
            <TextInput
              id="s-link"
              value={form.link}
              onChange={(e) => set('link')(e.target.value)}
              placeholder="/arena, /#menu və ya https://…"
              error={error?.fields?.link}
            />
          </div>
          <Checkbox checked={form.active} onChange={set('active')}>
            Saytda göstər
          </Checkbox>
        </div>
      </div>

      <ErrorBox error={error} />
      <div className="flex gap-2.5">
        <Button type="submit" variant="primary" loading={saving} disabled={uploading}>
          Yadda saxla
        </Button>
        <Button onClick={onDone}>Ləğv et</Button>
      </div>
    </form>
  )
}
