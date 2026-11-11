import { useEffect, useState } from 'react'
import {
  PiPlusBold,
  PiTrashBold,
  PiArrowCounterClockwiseBold,
  PiCheckCircleBold,
  PiGlobeBold,
  PiCaretDownBold,
  PiPencilSimpleBold,
  PiArmchairBold,
  PiFilmSlateBold,
  PiGearSixBold,
  PiInfoBold,
} from 'react-icons/pi'
import Switch from '../../components/Switch.jsx'
import { tierStyle, TIER_STYLE } from '../../lib/club.js'
import { useAdminApi, card, Button, TextInput, ErrorBox, Spinner } from './ui.jsx'

const ICONS = ['👋', '☕', '🛋️', '🏠', '⭐', '👑', '🎲', '🎬', '🔥', '💎']
const COLOR_NAMES = { teal: 'Yaşıl', purple: 'Bənövşəyi', orange: 'Narıncı', pink: 'Çəhrayı', yellow: 'Sarı', cyan: 'Mavi' }

// Formada rəqəmlər mətn kimi saxlanır (sahəni boşaltmaq olsun), göndərəndə rəqəmə çevrilir
const NUMBER_FIELDS = ['minVisits', 'hallPercent', 'roomPercent', 'minHours']
const lang3 = (x) => ({ az: x?.az ?? '', en: x?.en ?? '', ru: x?.ru ?? '' })
const toForm = (club) => ({
  ...club,
  months: String(club.months),
  maxPercent: String(club.maxPercent),
  tiers: club.tiers.map((t) => ({
    ...t,
    name: lang3(t.name),
    ...Object.fromEntries(NUMBER_FIELDS.map((f) => [f, String(t[f])])),
    benefits: t.benefits.map(lang3),
    gifts: t.gifts.map(lang3),
  })),
})
const toBody = (form) => ({
  ...form,
  months: Number(form.months),
  maxPercent: Number(form.maxPercent),
  tiers: form.tiers
    .map((t) => ({ ...t, ...Object.fromEntries(NUMBER_FIELDS.map((f) => [f, Number(t[f])])) }))
    .sort((a, b) => a.minVisits - b.minVisits),
})

// "0–8 ziyarət" / "25+ ziyarət"
const rangeText = (tiers, i) => {
  const next = tiers[i + 1]
  return next ? `${tiers[i].minVisits}–${Number(next.minVisits) - 1} ziyarət` : `${tiers[i].minVisits}+ ziyarət`
}

// Admin → DırDır Club. Yuxarıda statusların xülasəsi; birinə basanda altında yalnız onun redaktəsi açılır.
export default function AdminClub() {
  const request = useAdminApi()
  const [form, setForm] = useState(null)
  const [defaults, setDefaults] = useState(null)
  const [selected, setSelected] = useState(null) // redaktə olunan statusun açarı
  const [rulesOpen, setRulesOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    request('/admin/club')
      .then((d) => {
        setForm(toForm(d.club))
        setDefaults(d.defaults)
      })
      .catch(setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!form) return error ? <ErrorBox error={error} /> : <Spinner />

  const change = (next) => {
    setForm(next)
    setDirty(true)
    setSaved(false)
  }
  const set = (key) => (value) => change({ ...form, [key]: value })
  const setTier = (key, patch) => change({ ...form, tiers: form.tiers.map((t) => (t.key === key ? { ...t, ...patch } : t)) })
  const fieldErrors = error?.fields ?? {}
  const index = form.tiers.findIndex((t) => t.key === selected)
  // Səhv olan statusu tapmaq üçün: xəta "tiers.2.minVisits" kimi gəlir
  const tierHasError = (i) => Object.keys(fieldErrors).some((k) => k.startsWith(`tiers.${i}.`))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const { club } = await request('/admin/club', { method: 'PUT', body: toBody(form) })
      setForm(toForm(club))
      setDirty(false)
      setSaved(true)
    } catch (err) {
      setError(err)
      // Səhv olan status bağlıdırsa — açırıq ki, admin xətanı görsün
      const bad = Object.keys(err.fields ?? {}).map((k) => /^tiers\.(\d+)\./.exec(k)?.[1]).find(Boolean)
      if (bad != null) setSelected(form.tiers[Number(bad)]?.key ?? null)
      if (['months', 'maxPercent', 'startDay'].some((k) => err.fields?.[k])) setRulesOpen(true)
    } finally {
      setSaving(false)
    }
  }

  const addTier = () => {
    const last = form.tiers.at(-1)
    const key = `status-${Date.now().toString(36)}`
    change({
      ...form,
      tiers: [
        ...form.tiers,
        {
          key,
          name: lang3(),
          icon: '⭐',
          color: 'yellow',
          minVisits: String(Number(last?.minVisits ?? 0) + 10),
          hallPercent: last?.hallPercent ?? '0',
          roomPercent: last?.roomPercent ?? '0',
          minHours: last?.minHours ?? '2',
          benefits: [],
          gifts: [],
        },
      ],
    })
    setSelected(key)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Açıq / bağlı */}
      <section className={`${card} flex flex-wrap items-center justify-between gap-3`}>
        <div className="min-w-0">
          <h2 className="font-display font-bold text-[1.15rem]">DırDır Club {form.enabled ? 'işləyir' : 'söndürülüb'}</h2>
          <p className="text-[0.85rem] text-inkdim">
            {form.enabled
              ? 'Qeydiyyatlı müştərilər statuslarını kabinetdə görür, status endirimi kassada avtomatik tətbiq olunur.'
              : 'Status endirimləri tətbiq olunmur, müştərilər Club kartını görmür.'}
          </p>
        </div>
        <Switch checked={form.enabled} onChange={set('enabled')} label="DırDır Club" />
      </section>

      {/* 2. Statuslar — xülasə */}
      <section>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-display font-bold text-[1.15rem]">Statuslar</h2>
            <p className="text-[0.85rem] text-inkdim">Dəyişmək istədiyin statusa bas.</p>
          </div>
          <Button size="sm" onClick={addTier} disabled={form.tiers.length >= 8}>
            <PiPlusBold size={14} /> Status əlavə et
          </Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {form.tiers.map((tier, i) => {
            const style = tierStyle(tier.color)
            const active = tier.key === selected
            return (
              <button
                key={tier.key}
                type="button"
                aria-expanded={active}
                onClick={() => setSelected(active ? null : tier.key)}
                className={`text-left rounded-[20px] border-2 p-4 transition-all ${style.soft} ${
                  active ? `${style.border} shadow-lift` : tierHasError(i) ? 'border-brand-pink' : 'border-transparent hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[1.9rem] leading-none">{tier.icon}</span>
                  <PiPencilSimpleBold size={15} className={`${style.text} opacity-60`} />
                </div>
                <div className={`font-display font-bold text-[1.1rem] mt-2 ${style.text} truncate`}>{tier.name.az || 'Adsız status'}</div>
                <div className="text-[0.78rem] font-semibold text-inkdim">{rangeText(form.tiers, i)}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[0.72rem] font-bold px-2 py-0.5 rounded-full bg-card">Zal −{tier.hallPercent || 0}%</span>
                  <span className="text-[0.72rem] font-bold px-2 py-0.5 rounded-full bg-card">Kino −{tier.roomPercent || 0}%</span>
                </div>
                <div className="text-[0.72rem] font-semibold text-inkdim mt-1.5">
                  {Number(tier.minHours) > 0 ? `Endirim ${tier.minHours} saatdan` : 'Endirim istənilən müddətə'}
                </div>
                <div className="text-[0.72rem] text-inkdim mt-1.5">
                  {tier.benefits.length} üstünlük · {tier.gifts.length} hədiyyə
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 3. Seçilmiş statusun redaktəsi */}
      {index >= 0 && (
        <TierEditor
          key={form.tiers[index].key}
          tier={form.tiers[index]}
          index={index}
          range={rangeText(form.tiers, index)}
          maxPercent={form.maxPercent}
          errors={fieldErrors}
          onChange={(patch) => setTier(form.tiers[index].key, patch)}
          onClose={() => setSelected(null)}
          onRemove={
            form.tiers.length > 2
              ? () => {
                  change({ ...form, tiers: form.tiers.filter((t) => t.key !== selected) })
                  setSelected(null)
                }
              : null
          }
        />
      )}

      {/* 4. Ümumi qaydalar — az dəyişir, ona görə bağlıdır */}
      <section className={card}>
        <button type="button" onClick={() => setRulesOpen((v) => !v)} aria-expanded={rulesOpen} className="w-full flex items-center gap-2.5 text-left">
          <PiGearSixBold size={20} className="text-primary shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block font-display font-bold text-[1.1rem]">Ümumi qaydalar</span>
            <span className="block text-[0.82rem] text-inkdim truncate">
              Son {form.months} ay · maksimum {form.maxPercent}% · {form.combine === 'max' ? 'endirimlər cəmlənmir' : 'endirimlər cəmlənir'} ·{' '}
              {form.group ? 'zalda bütün qrupa' : 'zalda yalnız müştərinin özünə'}
            </span>
          </span>
          <PiCaretDownBold size={16} className={`shrink-0 transition-transform ${rulesOpen ? 'rotate-180' : ''}`} />
        </button>
        {rulesOpen && (
          <div className="mt-5 flex flex-col gap-5">
            <Sentence label="Status son neçə ayın ziyarətlərinə görə hesablansın?">
              <SmallNumber id="club-months" value={form.months} onChange={set('months')} unit="ay" error={fieldErrors.months} />
            </Sentence>
            <Sentence label="Status endirimi ən çox neçə faiz ola bilər?">
              <SmallNumber id="club-max" value={form.maxPercent} onChange={set('maxPercent')} unit="%" error={fieldErrors.maxPercent} />
            </Sentence>
            <Sentence label="Ziyarətlər hansı gündən sayılsın?" hint="Club işə düşən gün. Ondan əvvəlki ziyarətlər statusa daxil deyil.">
              <div className="w-[180px]">
                <TextInput id="club-start" type="date" value={form.startDay} onChange={(e) => set('startDay')(e.target.value)} error={fieldErrors.startDay} />
              </div>
            </Sentence>
            <Choice
              label="Müştərinin başqa endirimi də varsa (tələbə, promokod, xüsusi endirim)?"
              value={form.combine}
              onChange={set('combine')}
              options={[
                ['max', 'Hansı çoxdursa, o tətbiq olunsun', 'Məs. status 10%, promokod 15% — 15% tətbiq olunur'],
                ['stack', 'İkisi də tətbiq olunsun (cəmlənsin)', 'Məs. status 10% + promokod 15%'],
              ]}
            />
            <Choice
              label="Müştəri zala dostları ilə gələndə status endirimi kimə tətbiq olunsun?"
              value={form.group ? 'group' : 'self'}
              onChange={(v) => set('group')(v === 'group')}
              options={[
                ['self', 'Yalnız müştərinin özünə', 'Qrupun qalan hissəsi tam qiymət ödəyir'],
                ['group', 'Bütün qrupa', 'Kino otağında endirim həmişə bütün otağa tətbiq olunur'],
              ]}
            />
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 text-[0.82rem] text-inkdim">
        <PiInfoBold size={16} className="shrink-0 mt-0.5" />
        Status müştərinin son {form.months} ayda neçə fərqli gün ödənişli ziyarət etdiyinə görə hər gün avtomatik hesablanır (Günün hesabatındakı bitmiş
        seanslar). Bir gündə bir neçə dəfə gəlmək — 1 ziyarət; pulsuz seans sayılmır.
      </p>

      {/* Saxlama zolağı — həmişə aşağıda görünür */}
      <div className="sticky bottom-3 z-30 bg-card/95 backdrop-blur border border-ink/10 shadow-lift rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        <Button variant="primary" loading={saving} disabled={!dirty} onClick={save}>
          Yadda saxla
        </Button>
        {dirty && <span className="text-[0.85rem] font-semibold text-brand-orange-deep">Dəyişikliklər hələ saxlanmayıb</span>}
        {saved && !dirty && (
          <span className="inline-flex items-center gap-1.5 text-brand-teal-deep font-bold text-[0.9rem]">
            <PiCheckCircleBold size={18} /> Saxlandı
          </span>
        )}
        {error && <span className="text-[0.85rem] font-semibold text-brand-pink-deep">Xəta var — qırmızı sahələrə bax</span>}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => change(toForm(defaults))}>
          <PiArrowCounterClockwiseBold size={15} /> İlkin qaydalara qaytar
        </Button>
      </div>
    </div>
  )
}

// Bir statusun redaktəsi: bölmələrə ayrılıb — əvvəl əsas (ad, ziyarət, endirim), sonra siyahılar, sonra görünüş
const TABS = [
  ['main', 'Əsas'],
  ['benefits', 'Üstünlüklər'],
  ['gifts', 'Hədiyyələr'],
  ['look', 'Görünüş'],
]

function TierEditor({ tier, index, range, maxPercent, errors, onChange, onClose, onRemove }) {
  const [tab, setTab] = useState('main')
  const style = tierStyle(tier.color)
  const err = (field) => errors[`tiers.${index}.${field}`]
  const tabHasError = (name) =>
    Object.keys(errors).some((k) =>
      name === 'main'
        ? /^tiers\.\d+\.(name|minVisits|hallPercent|roomPercent|minHours)/.test(k) && k.startsWith(`tiers.${index}.`)
        : k.startsWith(`tiers.${index}.${name}`),
    )

  return (
    <section className={`${card} !p-0 overflow-hidden border-2 ${style.border}`}>
      <header className={`${style.soft} px-5 py-4 flex items-center gap-3`}>
        <span className="text-[2rem] leading-none">{tier.icon}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-display font-bold text-[1.25rem] ${style.text} truncate`}>{tier.name.az || 'Adsız status'}</div>
          <div className="text-[0.8rem] font-semibold text-inkdim">{range}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Bağla
        </Button>
      </header>

      <div className="flex gap-1 px-5 pt-4 overflow-x-auto" role="tablist">
        {TABS.map(([name, label]) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={`relative shrink-0 px-4 py-2 rounded-full font-bold text-[0.88rem] transition-colors ${
              tab === name ? 'bg-ink text-bg' : 'text-inkdim hover:bg-ink/5'
            }`}
          >
            {label}
            {name === 'benefits' && ` (${tier.benefits.length})`}
            {name === 'gifts' && ` (${tier.gifts.length})`}
            {tabHasError(name) && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-pink" />}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === 'main' && (
          <div className="flex flex-col gap-5">
            <TranslatedInput
              label="Statusun adı"
              value={tier.name}
              maxLength={30}
              placeholder="məs. Qonaq"
              onChange={(name) => onChange({ name })}
              error={err('name.az')}
            />
            <Sentence label={index === 0 ? 'Bu status neçə ziyarətdən başlayır?' : 'Bu statusa neçə ziyarətdən sonra keçilir?'} hint={index === 0 ? 'Birinci status həmişə 0-dan başlayır.' : null}>
              <SmallNumber id={`tier-min-${index}`} value={tier.minVisits} onChange={(minVisits) => onChange({ minVisits })} unit="ziyarət" error={err('minVisits')} />
            </Sentence>
            <div className="grid sm:grid-cols-2 gap-4">
              <Sentence
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <PiArmchairBold size={16} /> Ümumi zal üçün endirim
                  </span>
                }
              >
                <SmallNumber id={`tier-hall-${index}`} value={tier.hallPercent} onChange={(hallPercent) => onChange({ hallPercent })} unit="%" error={err('hallPercent')} />
              </Sentence>
              <Sentence
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <PiFilmSlateBold size={16} /> Kino otağı üçün endirim
                  </span>
                }
              >
                <SmallNumber id={`tier-room-${index}`} value={tier.roomPercent} onChange={(roomPercent) => onChange({ roomPercent })} unit="%" error={err('roomPercent')} />
              </Sentence>
            </div>
            <Sentence
              label="Endirim neçə saat oturanda aktiv olsun?"
              hint="Seans bundan qısadırsa, status endirimi tətbiq olunmur. 0 yazsan — istənilən müddətə."
            >
              <SmallNumber id={`tier-hours-${index}`} value={tier.minHours} onChange={(minHours) => onChange({ minHours })} unit="saat" step="0.5" error={err('minHours')} />
            </Sentence>
            <p className="text-[0.78rem] text-inkdim">Endirim ən çox {maxPercent}% ola bilər (Ümumi qaydalarda dəyişir).</p>
          </div>
        )}

        {tab === 'benefits' && (
          <ListEditor
            hint="Müştəri kabinetində bu statusun üstünlükləri kimi göstərilir."
            items={tier.benefits}
            placeholder="məs. Ad günü üstünlüyü"
            onChange={(benefits) => onChange({ benefits })}
            errors={errors}
            errorPrefix={`tiers.${index}.benefits`}
          />
        )}

        {tab === 'gifts' && (
          <ListEditor
            hint="Müştəri kabinetində 🎁 ilə göstərilir."
            items={tier.gifts}
            placeholder="məs. 1 saatlıq zal hədiyyəsi"
            onChange={(gifts) => onChange({ gifts })}
            errors={errors}
            errorPrefix={`tiers.${index}.gifts`}
          />
        )}

        {tab === 'look' && (
          <div className="flex flex-col gap-5">
            <div>
              <span className="block text-[0.9rem] font-bold mb-2">İkon</span>
              <div className="flex flex-wrap gap-1.5">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    aria-pressed={tier.icon === icon}
                    onClick={() => onChange({ icon })}
                    className={`w-11 h-11 rounded-xl text-[1.4rem] border-2 transition-colors ${
                      tier.icon === icon ? 'border-primary bg-brand-orange-soft' : 'border-ink/10 hover:bg-ink/5'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-[0.9rem] font-bold mb-2">Rəng</span>
              <div className="flex flex-wrap gap-2">
                {Object.keys(TIER_STYLE).map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-pressed={tier.color === color}
                    onClick={() => onChange({ color })}
                    className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border-2 font-semibold text-[0.85rem] ${
                      tier.color === color ? 'border-ink' : 'border-ink/10 hover:border-ink/30'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full ${TIER_STYLE[color].solid}`} /> {COLOR_NAMES[color]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {onRemove && (
        <footer className="px-5 py-3 border-t border-ink/10 flex justify-end">
          <Button variant="danger" size="sm" onClick={onRemove}>
            <PiTrashBold size={15} /> Bu statusu sil
          </Button>
        </footer>
      )}
    </section>
  )
}

// Sual + cavab sahəsi bir sətirdə (telefonda alt-alta)
function Sentence({ label, hint, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[0.92rem]">{label}</div>
        {hint && <div className="text-[0.78rem] text-inkdim">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SmallNumber({ id, value, onChange, unit, error, step = '1' }) {
  return (
    <div className="w-[150px]">
      <div className="relative">
        <TextInput
          id={id}
          type="number"
          inputMode={step === '1' ? 'numeric' : 'decimal'}
          min="0"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(',', '.'))}
          error={error}
          className="pr-16 text-[1.05rem] font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="absolute right-3.5 top-[0.72rem] text-[0.82rem] font-bold text-inkdim pointer-events-none">{unit}</span>
      </div>
    </div>
  )
}

// İki-üç variantdan biri — izahı ilə
function Choice({ label, value, onChange, options }) {
  return (
    <fieldset>
      <legend className="font-semibold text-[0.92rem] mb-2">{label}</legend>
      <div className="grid sm:grid-cols-2 gap-2">
        {options.map(([key, title, note]) => (
          <label
            key={key}
            className={`flex gap-2.5 items-start rounded-2xl border-2 p-3 cursor-pointer transition-colors ${
              value === key ? 'border-primary bg-brand-orange-soft' : 'border-ink/10 hover:border-ink/25'
            }`}
          >
            <input type="radio" checked={value === key} onChange={() => onChange(key)} className="mt-1 w-4 h-4 accent-[var(--color-primary)]" />
            <span>
              <span className="block font-bold text-[0.9rem]">{title}</span>
              <span className="block text-[0.78rem] text-inkdim">{note}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// Azərbaycanca sahə + 🌐 ilə ingilis və rus dili (boş qalsa — saytda azərbaycanca göstərilir)
function TranslatedInput({ label, value, onChange, maxLength, placeholder, error }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <span className="block font-semibold text-[0.92rem] mb-1.5">{label}</span>
      <div className="flex gap-1.5">
        <div className="flex-1 min-w-0">
          <TextInput value={value.az} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange({ ...value, az: e.target.value })} error={error} />
        </div>
        <TranslateToggle open={open} filled={Boolean(value.en || value.ru)} onClick={() => setOpen((v) => !v)} />
      </div>
      {open && <Translations value={value} onChange={onChange} maxLength={maxLength} />}
    </div>
  )
}

function TranslateToggle({ open, filled, onClick }) {
  return (
    <button
      type="button"
      title="İngilis və rus dilində yaz"
      aria-label="Tərcümə"
      aria-expanded={open}
      onClick={onClick}
      className={`relative h-[42px] px-3 shrink-0 rounded-xl inline-flex items-center gap-1.5 text-[0.8rem] font-bold ${
        open ? 'bg-ink text-bg' : 'text-inkdim border-2 border-ink/10 hover:border-ink/30'
      }`}
    >
      <PiGlobeBold size={16} /> EN/RU
      {filled && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-teal" />}
    </button>
  )
}

function Translations({ value, onChange, maxLength }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2 mt-2">
      <TextInput aria-label="İngiliscə" placeholder="İngiliscə (könüllü)" maxLength={maxLength} value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} />
      <TextInput aria-label="Rusca" placeholder="Rusca (könüllü)" maxLength={maxLength} value={value.ru} onChange={(e) => onChange({ ...value, ru: e.target.value })} />
    </div>
  )
}

// Sətir-sətir siyahı (üstünlüklər / hədiyyələr)
function ListEditor({ hint, items, placeholder, onChange, errors, errorPrefix }) {
  const [open, setOpen] = useState(null) // tərcüməsi açıq olan sətir
  const update = (i, patch) => onChange(items.map((item, j) => (j === i ? { ...item, ...patch } : item)))

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.82rem] text-inkdim">{hint}</p>
      {items.length === 0 && <p className="text-[0.88rem] text-inkdim py-3 text-center border-2 border-dashed border-ink/10 rounded-xl">Hələ heç nə yoxdur.</p>}
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex gap-1.5">
            <span className="w-7 shrink-0 h-[42px] flex items-center justify-center text-[0.85rem] font-bold text-inkdim">{i + 1}.</span>
            <div className="flex-1 min-w-0">
              <TextInput
                aria-label={`${i + 1}-ci sətir`}
                value={item.az}
                maxLength={160}
                placeholder={placeholder}
                onChange={(e) => update(i, { az: e.target.value })}
                error={errors[`${errorPrefix}.${i}.az`]}
              />
            </div>
            <TranslateToggle open={open === i} filled={Boolean(item.en || item.ru)} onClick={() => setOpen(open === i ? null : i)} />
            <button
              type="button"
              aria-label="Sil"
              title="Sil"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="h-[42px] w-[42px] shrink-0 rounded-xl flex items-center justify-center text-brand-pink-deep hover:bg-brand-pink-soft"
            >
              <PiTrashBold size={17} />
            </button>
          </div>
          {open === i && (
            <div className="pl-8">
              <Translations value={item} onChange={(v) => update(i, v)} maxLength={160} />
            </div>
          )}
        </div>
      ))}
      <div>
        <Button size="sm" className="mt-1" disabled={items.length >= 20} onClick={() => onChange([...items, lang3()])}>
          <PiPlusBold size={14} /> Sətir əlavə et
        </Button>
      </div>
    </div>
  )
}
