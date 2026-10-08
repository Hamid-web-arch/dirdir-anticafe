import { useEffect, useState } from 'react'
import { PiArmchairBold, PiFilmSlateBold, PiStudentBold, PiCheckCircleBold, PiArrowCounterClockwiseBold } from 'react-icons/pi'
import { usePricingUpdate } from '../../pricing/PricingContext.jsx'
import { useAdminApi, card, Button, Label, TextInput, ErrorBox, Spinner } from './ui.jsx'

// Formadakı sahələr: yol (server cavabındakı "hall.cap" kimi), ad, vahid, addım.
const SECTIONS = [
  {
    title: 'Ümumi zal',
    icon: PiArmchairBold,
    note: 'Nəfər başına. Uzun qalanda qiymət stop çekdə dayanır.',
    fields: [
      { path: 'hall.firstHour', label: 'İlk saat', unit: '₼' },
      { path: 'hall.nextHour', label: 'Sonrakı hər saat', unit: '₼' },
      { path: 'hall.cap', label: 'Stop çek (maksimum)', unit: '₼' },
    ],
  },
  {
    title: 'Kino otağı',
    icon: PiFilmSlateBold,
    note: 'Kiçik qrup: ilk saat + sonrakı saatlar. Böyük qrup: saatlıq qiymət + limitdən sonra hər nəfərə əlavə.',
    fields: [
      { path: 'room.maxPeople', label: 'Otağın tutumu', unit: 'nəfər', step: 1 },
      { path: 'room.smallGroup.maxPeople', label: 'Kiçik qrup (nəfərə qədər)', unit: 'nəfər', step: 1 },
      { path: 'room.smallGroup.firstHour', label: 'Kiçik qrup — ilk saat', unit: '₼' },
      { path: 'room.smallGroup.nextHour', label: 'Kiçik qrup — sonrakı hər saat', unit: '₼' },
      { path: 'room.group.perHour', label: 'Böyük qrup — saatı', unit: '₼' },
      { path: 'room.group.includedPeople', label: 'Böyük qrup — daxil nəfər', unit: 'nəfər', step: 1 },
      { path: 'room.group.extraPerPerson', label: 'Hər əlavə nəfər — saatı', unit: '₼' },
    ],
  },
  {
    title: 'Tələbə endirimi',
    icon: PiStudentBold,
    note: 'Yalnız ümumi zalda. Faiz 0 olsa, endirim saytda görünmür.',
    fields: [
      { path: 'studentDiscount.percent', label: 'Endirim', unit: '%', step: 1 },
      { path: 'studentDiscount.minHours', label: 'Ən az qalma müddəti', unit: 'saat', step: 0.5 },
    ],
  },
]

const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
const set = (obj, path, value) => {
  const [key, ...rest] = path.split('.')
  return { ...obj, [key]: rest.length ? set(obj[key], rest.join('.'), value) : value }
}

// Formada dəyərlər mətn kimi saxlanır (boş sahə yazmağa imkan versin), göndərəndə rəqəmə çevrilir.
const toForm = (pricing) => SECTIONS.flatMap((s) => s.fields).reduce((f, { path }) => set(f, path, String(get(pricing, path))), pricing)
const toNumbers = (form) =>
  SECTIONS.flatMap((s) => s.fields).reduce((p, { path }) => {
    const raw = String(get(form, path)).replace(',', '.').trim()
    return set(p, path, raw === '' ? null : Number(raw))
  }, form)

export default function AdminPrices() {
  const request = useAdminApi()
  const updateSitePricing = usePricingUpdate()
  const [form, setForm] = useState(null)
  const [defaults, setDefaults] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    request('/admin/pricing')
      .then((d) => {
        setForm(toForm(d.pricing))
        setDefaults(d.defaults)
      })
      .catch(setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!form) return error ? <ErrorBox error={error} /> : <Spinner />

  const fieldErrors = error?.fields ?? {}

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const { pricing } = await request('/admin/pricing', { method: 'PUT', body: toNumbers(form) })
      setForm(toForm(pricing))
      updateSitePricing(pricing)
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4" noValidate>
      <p className="text-inkdim">
        Burada dəyişən qiymətlər saytdakı qiymət cədvəlində, hesablayıcıda və əsas ekranda dərhal görünür.
      </p>

      {SECTIONS.map((section) => (
        <fieldset key={section.title} className={card}>
          <legend className="sr-only">{section.title}</legend>
          <div className="flex items-center gap-2.5 mb-1">
            <section.icon size={20} className="text-primary" />
            <h2 className="font-display font-bold text-[1.15rem]">{section.title}</h2>
          </div>
          <p className="text-[0.85rem] text-inkdim mb-4">{section.note}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.fields.map((f) => {
              const id = `price-${f.path}`
              return (
                <div key={f.path}>
                  <Label htmlFor={id}>{f.label}</Label>
                  <div className="relative">
                    <TextInput
                      id={id}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step={f.step ?? 0.5}
                      value={get(form, f.path)}
                      onChange={(e) => {
                        setForm(set(form, f.path, e.target.value))
                        setSaved(false)
                      }}
                      className="pr-14 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      error={fieldErrors[f.path]}
                    />
                    <span className="absolute right-3.5 top-[0.7rem] text-[0.85rem] font-bold text-inkdim pointer-events-none">
                      {f.unit}
                    </span>
                  </div>
                  <p className="text-[0.75rem] text-inkdim mt-1">
                    Standart: {get(defaults, f.path)} {f.unit}
                  </p>
                </div>
              )
            })}
          </div>
        </fieldset>
      ))}

      <ErrorBox error={error} />

      <div className="flex flex-wrap items-center gap-3 sticky bottom-3 bg-bg/90 backdrop-blur rounded-full py-2">
        <Button type="submit" variant="primary" loading={saving}>
          Yadda saxla
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setForm(toForm(defaults))
            setSaved(false)
            setError(null)
          }}
        >
          <PiArrowCounterClockwiseBold size={16} /> Standart qiymətləri doldur
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
