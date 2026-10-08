// Admin panelin ümumi hissələri. Admin panel yalnız azərbaycancadır.
import { useState } from 'react'
import { PiSpinnerBold, PiWarningCircleBold } from 'react-icons/pi'
import { useAuth } from '../../auth/AuthContext.jsx'
import { api } from '../../lib/api.js'
import { useI18n, formatAzDate } from '../../i18n/index.jsx'

// Admin sorğuları: token avtomatik əlavə olunur.
export function useAdminApi() {
  const { token } = useAuth()
  return (path, options = {}) => api(path, { ...options, token })
}

export const card = 'bg-card border border-ink/10 rounded-[20px] p-5 sm:p-6'

const buttonStyles = {
  primary: 'bg-primary text-white hover:shadow-cta',
  dark: 'bg-ink text-bg hover:bg-primary',
  outline: 'border-2 border-ink/15 text-ink hover:border-ink',
  ghost: 'text-inkdim hover:text-ink hover:bg-ink/5',
  danger: 'text-brand-pink-deep hover:bg-brand-pink-soft',
}

export function Button({ variant = 'outline', size = 'md', loading, children, className = '', ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-[0.82rem]', md: 'px-5 py-2.5 text-[0.9rem]' }
  return (
    <button
      type="button"
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition-all disabled:opacity-50 disabled:pointer-events-none ${sizes[size]} ${buttonStyles[variant]} ${className}`}
      {...props}
    >
      {loading && <PiSpinnerBold size={15} className="animate-spin" />}
      {children}
    </button>
  )
}

// İki addımlı təsdiq: "Sil" → "Əminsən? Bəli / Xeyr". Brauzerin confirm() pəncərəsi olmadan.
export function ConfirmButton({ onConfirm, children, question = 'Əminsən?', size = 'sm' }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!asking) {
    return (
      <Button variant="danger" size={size} onClick={() => setAsking(true)}>
        {children}
      </Button>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-brand-pink-soft rounded-full pl-3 pr-1 py-1">
      <span className="text-[0.8rem] font-bold text-brand-pink-deep">{question}</span>
      <Button
        variant="dark"
        size="sm"
        loading={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await onConfirm()
          } finally {
            setBusy(false)
            setAsking(false)
          }
        }}
      >
        Bəli
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setAsking(false)}>
        Xeyr
      </Button>
    </span>
  )
}

export function Label({ children, htmlFor, hint }) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-[0.85rem] font-bold mb-1.5">
      {children}
      {hint && <span className="font-medium text-inkdim text-[0.78rem]">{hint}</span>}
    </label>
  )
}

const inputClass =
  'w-full bg-bg border-2 border-ink/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-primary transition-colors aria-[invalid=true]:border-brand-pink'

export function TextInput({ error, ...props }) {
  return (
    <>
      <input {...props} aria-invalid={Boolean(error)} className={`${inputClass} ${props.className ?? ''}`} />
      {error && <FieldError>{error}</FieldError>}
    </>
  )
}

export function TextArea({ error, ...props }) {
  return (
    <>
      <textarea {...props} aria-invalid={Boolean(error)} className={`${inputClass} min-h-[90px] resize-y`} />
      {error && <FieldError>{error}</FieldError>}
    </>
  )
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={inputClass}>
      {children}
    </select>
  )
}

export function Checkbox({ checked, onChange, children }) {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none font-semibold text-[0.9rem]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 accent-[var(--color-primary)]" />
      {children}
    </label>
  )
}

export function FieldError({ children }) {
  return <p className="text-[0.8rem] font-semibold text-brand-pink-deep mt-1">{children}</p>
}

export function ErrorBox({ error }) {
  const { errorText } = useI18n()
  if (!error) return null
  const fields = Object.entries(error.fields ?? {})
  return (
    <div role="alert" className="flex gap-2 rounded-xl bg-brand-pink-soft text-brand-pink-deep px-4 py-3 text-[0.88rem] font-semibold">
      <PiWarningCircleBold size={18} className="shrink-0 mt-0.5" />
      <div>
        {errorText(error)}
        {fields.length > 0 && (
          <ul className="mt-1 font-medium list-disc pl-4">
            {fields.map(([key, msg]) => (
              <li key={key}>{msg}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const LANGS = [
  { code: 'az', label: 'AZ', required: true },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
]

// Üç dildə mətn: dil düymələri ilə keçid; doldurulmuş dilin yanında nöqtə. Boş en/ru saytda az-a qayıdır.
export function LocalizedField({ label, value, onChange, multiline, maxLength, required, error, id }) {
  const [lang, setLang] = useState('az')
  const Input = multiline ? TextArea : TextInput
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[0.85rem] font-bold">
          {label} {required && <span className="text-brand-pink-deep">*</span>}
        </span>
        <div className="inline-flex bg-ink/5 rounded-full p-0.5">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`relative px-2.5 py-1 rounded-full text-[0.75rem] font-bold transition-colors ${
                lang === l.code ? 'bg-card shadow text-ink' : 'text-inkdim hover:text-ink'
              }`}
            >
              {l.label}
              {value[l.code]?.trim() && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-teal" />}
            </button>
          ))}
        </div>
      </div>
      <Input
        id={id}
        lang={lang}
        value={value[lang] ?? ''}
        maxLength={maxLength}
        placeholder={lang === 'az' ? '' : `Boş qalsa, azərbaycanca göstərilir`}
        onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
        error={lang === 'az' ? error : undefined}
      />
    </div>
  )
}

export const emptyLocalized = () => ({ az: '', en: '', ru: '' })

// <input type="datetime-local"> ilə ISO tarix arasında çevirmə (yerli vaxtla)
export function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const fromLocalInput = (value) => new Date(value).toISOString()

export const formatDateTime = (iso) => formatAzDate(iso, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit' })

export function Spinner() {
  return (
    <div className="flex justify-center py-12 text-inkdim">
      <PiSpinnerBold size={26} className="animate-spin" />
    </div>
  )
}

export function Empty({ children }) {
  return <p className="text-center text-inkdim font-semibold py-10 border-2 border-dashed border-ink/10 rounded-2xl">{children}</p>
}
