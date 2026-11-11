import { useCallback, useEffect, useState } from 'react'
import { PiPlusBold, PiTrashBold, PiArrowCounterClockwiseBold, PiCheckCircleBold, PiGiftBold, PiCheckBold } from 'react-icons/pi'
import { formatAzDate } from '../../i18n/index.jsx'
import { prizeEffect, effectText } from '../../lib/prizeEffect.js'
import { useAdminApi, card, Button, Label, TextInput, ErrorBox, Spinner, Empty, Checkbox, Select } from './ui.jsx'

const formatDate = (iso) => formatAzDate(iso, { day: 'numeric', month: 'short', hour: '2-digit' })

// Formada rəqəmlər mətn kimi saxlanır (sahəni boşaltmaq olsun), göndərəndə rəqəmə çevrilir
const toForm = (wheel) => ({
  enabled: wheel.enabled,
  periodDays: String(wheel.periodDays),
  validDays: String(wheel.validDays ?? 7),
  prizes: wheel.prizes.map((p) => ({ label: { az: p.label.az, en: p.label.en ?? '', ru: p.label.ru ?? '' }, chance: String(p.chance) })),
})
const toBody = (form) => ({
  enabled: form.enabled,
  periodDays: Number(form.periodDays),
  validDays: Number(form.validDays),
  prizes: form.prizes.map((p) => ({ label: p.label, chance: Number(p.chance) })),
})

// Admin → Hədiyyə çarxı: hədiyyələr, şanslar, nə qədər vaxtdan bir fırlatmaq olar; qazananlar siyahısı
export default function AdminWheel() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-inkdim">
        Saytın sol aşağısındakı çarx. Yalnız qeydiyyatlı istifadəçilər fırlada bilir. Qazanılan hədiyyə istifadəçinin profilində görünür
        və müəyyən gün ərzində istifadə olunmalıdır; istifadə olunmamış hədiyyəsi olan yenisini qazana bilməz. Müştəri kafeyə gələndə
        Günün hesabatında onu sifarişə əlavə edin: endirim hədiyyəsində "İstifadə et" basın — endirim onun payına tətbiq olunur;
        sadə hədiyyədə (çay, desert…) — "Verildi".
      </p>
      <Settings />
      <Winners />
    </div>
  )
}

function Settings() {
  const request = useAdminApi()
  const [form, setForm] = useState(null)
  const [defaults, setDefaults] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    request('/admin/wheel')
      .then((d) => {
        setForm(toForm(d.wheel))
        setDefaults(d.defaults)
      })
      .catch(setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!form) return error ? <ErrorBox error={error} /> : <Spinner />

  const change = (next) => {
    setForm(next)
    setSaved(false)
  }
  const setPrize = (i, patch) => change({ ...form, prizes: form.prizes.map((p, j) => (j === i ? { ...p, ...patch } : p)) })
  const fieldErrors = error?.fields ?? {}
  const totalChance = form.prizes.reduce((s, p) => s + (Number(p.chance) || 0), 0)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      setForm(toForm((await request('/admin/wheel', { method: 'PUT', body: toBody(form) })).wheel))
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className={`${card} flex flex-col gap-5`} noValidate>
      <div className="flex flex-wrap items-end gap-5">
        <Checkbox checked={form.enabled} onChange={(enabled) => change({ ...form, enabled })}>
          Çarx saytda görünsün
        </Checkbox>
        <div className="w-full sm:w-[300px]">
          <Label htmlFor="wheel-period" hint="7 = həftədə bir">
            Bir istifadəçi neçə gündə bir
          </Label>
          <div className="relative">
            <TextInput
              id="wheel-period"
              type="number"
              inputMode="numeric"
              min="1"
              max="365"
              value={form.periodDays}
              onChange={(e) => change({ ...form, periodDays: e.target.value })}
              error={fieldErrors.periodDays}
              className="pr-14"
            />
            <span className="absolute right-3.5 top-[0.7rem] text-[0.85rem] font-bold text-inkdim pointer-events-none">gün</span>
          </div>
        </div>
        <div className="w-full sm:w-[300px]">
          <Label htmlFor="wheel-valid" hint="7 = bir həftə">
            Hədiyyə neçə gün etibarlıdır
          </Label>
          <div className="relative">
            <TextInput
              id="wheel-valid"
              type="number"
              inputMode="numeric"
              min="1"
              max="365"
              value={form.validDays}
              onChange={(e) => change({ ...form, validDays: e.target.value })}
              error={fieldErrors.validDays}
              className="pr-14"
            />
            <span className="absolute right-3.5 top-[0.7rem] text-[0.85rem] font-bold text-inkdim pointer-events-none">gün</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display font-bold text-[1.1rem] mb-1">Hədiyyələr</h2>
        <p className="text-[0.82rem] text-inkdim mb-3">
          2–10 hədiyyə, adı ən çox 24 simvol (çarxa sığsın). <b>Şans</b> — nə qədər tez-tez düşəcəyi: məsələn 30 və 10 olan
          hədiyyələrdən birincisi 3 dəfə tez-tez düşür. İngilis və rus adı boş qalsa, azərbaycanca göstərilir.
          Hesaba necə tətbiq olunacağı adından anlaşılır: "15% endirim" — faiz, "Kino 25% endirim" — yalnız kinoda,
          "Pulsuz 30 dəq" / "Pulsuz 1 saat" — zalda pulsuz vaxt; başqa adlar (çay, desert…) — sadə hədiyyə.
        </p>
        <div className="flex flex-col gap-2">
          {form.prizes.map((p, i) => {
            const err = (key) => fieldErrors[`prizes.${i}.${key}`]
            const percent = totalChance > 0 ? Math.round(((Number(p.chance) || 0) / totalChance) * 100) : 0
            return (
              <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.3fr_1fr_1fr_110px_auto] gap-2 items-start rounded-2xl border border-ink/10 p-3">
                <div className="col-span-2 sm:col-span-1">
                  <TextInput
                    aria-label={`${i + 1}-ci hədiyyə (az)`}
                    placeholder="məs. 10% endirim"
                    maxLength={24}
                    value={p.label.az}
                    onChange={(e) => setPrize(i, { label: { ...p.label, az: e.target.value } })}
                    error={err('label.az')}
                  />
                  {p.label.az.trim() && <p className="text-[0.72rem] text-inkdim mt-0.5">→ {effectText(prizeEffect(p.label))}</p>}
                </div>
                <TextInput
                  aria-label={`${i + 1}-ci hədiyyə (en)`}
                  placeholder="EN (könüllü)"
                  maxLength={24}
                  value={p.label.en}
                  onChange={(e) => setPrize(i, { label: { ...p.label, en: e.target.value } })}
                  className="hidden sm:block"
                />
                <TextInput
                  aria-label={`${i + 1}-ci hədiyyə (ru)`}
                  placeholder="RU (könüllü)"
                  maxLength={24}
                  value={p.label.ru}
                  onChange={(e) => setPrize(i, { label: { ...p.label, ru: e.target.value } })}
                  className="hidden sm:block"
                />
                <div>
                  <TextInput
                    aria-label={`${i + 1}-ci hədiyyənin şansı`}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={p.chance}
                    onChange={(e) => setPrize(i, { chance: e.target.value })}
                    error={err('chance')}
                  />
                  <p className="text-[0.72rem] text-inkdim mt-0.5 text-center">≈ {percent}%</p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  aria-label="Hədiyyəni sil"
                  disabled={form.prizes.length <= 2}
                  onClick={() => change({ ...form, prizes: form.prizes.filter((_, j) => j !== i) })}
                  className="mt-1"
                >
                  <PiTrashBold size={16} />
                </Button>
              </div>
            )
          })}
        </div>
        {fieldErrors.prizes && <p className="text-[0.8rem] font-semibold text-brand-pink-deep mt-1">{fieldErrors.prizes}</p>}
        <Button
          className="mt-3"
          disabled={form.prizes.length >= 10}
          onClick={() => change({ ...form, prizes: [...form.prizes, { label: { az: '', en: '', ru: '' }, chance: '10' }] })}
        >
          <PiPlusBold size={15} /> Hədiyyə əlavə et
        </Button>
      </div>

      <ErrorBox error={error && !Object.keys(fieldErrors).length ? error : null} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={saving}>
          Yadda saxla
        </Button>
        <Button variant="ghost" onClick={() => change(toForm(defaults))}>
          <PiArrowCounterClockwiseBold size={16} /> Nümunə siyahını doldur
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-brand-teal-deep font-bold text-[0.9rem]">
            <PiCheckCircleBold size={18} /> Saxlandı — saytda yeniləndi
          </span>
        )}
      </div>
    </form>
  )
}

// Qazananlar: hədiyyə kafedə veriləndə "Verildi"
function Winners() {
  const request = useAdminApi()
  const [status, setStatus] = useState('unused')
  const [spins, setSpins] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setSpins(null)
    request(`/admin/wheel/spins?status=${status}`)
      .then((d) => setSpins(d.spins))
      .catch(setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])
  useEffect(load, [load])

  const mark = async (spin, used) => {
    try {
      const { spin: updated } = await request(`/admin/wheel/spins/${spin.id}`, { method: 'PATCH', body: { used } })
      setSpins((list) => (status === 'all' ? list.map((s) => (s.id === updated.id ? updated : s)) : list.filter((s) => s.id !== updated.id)))
    } catch (err) {
      setError(err)
    }
  }

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2 font-display font-bold text-[1.1rem]">
          <PiGiftBold size={19} className="text-primary" /> Qazananlar
        </h2>
        <div className="w-[200px]">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Göstər">
            <option value="unused">Verilməyənlər</option>
            <option value="used">Verilənlər</option>
            <option value="expired">Vaxtı keçənlər</option>
            <option value="all">Hamısı</option>
          </Select>
        </div>
      </div>
      <ErrorBox error={error} />
      {spins === null ? (
        <Spinner />
      ) : spins.length === 0 ? (
        <Empty>
          {status === 'unused' ? 'Verilməmiş hədiyyə yoxdur.' : status === 'expired' ? 'Vaxtı keçən hədiyyə yoxdur.' : 'Hələ heç kim qazanmayıb.'}
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {spins.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 px-4 py-3">
              <span className="flex-1 min-w-[180px]">
                <span className="block font-bold">{s.prize.az}</span>
                <span className="block text-[0.8rem] text-inkdim">
                  {s.user ? (
                    <>
                      <b className="text-ink">{s.user.customerCode}</b> · {s.user.firstName} {s.user.lastName}
                    </>
                  ) : (
                    'silinmiş istifadəçi'
                  )}{' '}
                  · {formatDate(s.createdAt)}
                  {!s.usedAt && s.expiresAt && (
                    <span className={s.expired ? 'text-brand-pink-deep font-bold' : ''}>
                      {' '}
                      · {s.expired ? 'vaxtı keçib' : `${formatDate(s.expiresAt)} tarixinədək`}
                    </span>
                  )}
                </span>
              </span>
              {s.usedAt ? (
                <>
                  <span className="text-[0.78rem] font-bold text-brand-teal-deep">Verildi · {formatDate(s.usedAt)}</span>
                  <Button variant="ghost" size="sm" onClick={() => mark(s, false)}>
                    Geri al
                  </Button>
                </>
              ) : s.reserved ? (
                <span className="text-[0.78rem] font-bold text-brand-orange-deep">Davam edən sifarişdə tətbiq olunur</span>
              ) : (
                <Button variant="dark" size="sm" onClick={() => mark(s, true)}>
                  <PiCheckBold size={14} /> Verildi
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
