import { useState } from 'react'
import { PiEyeBold, PiEyeSlashBold, PiWarningCircleBold, PiSpinnerBold } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import hallImg from '../assets/upper-hal.jpeg'

// Giriş və qeydiyyat səhifələrinin ümumi çərçivəsi: solda foto paneli, sağda forma.
export default function AuthLayout({ title, subtitle, panelTitle, panelText, children, footer }) {
  return (
    <section className="relative overflow-hidden py-12 sm:py-20">
      <div className="absolute w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] bg-brand-orange/20 rounded-full blur-3xl -top-28 -right-24 pointer-events-none" />
      <div className="absolute w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] bg-brand-purple/20 rounded-full blur-3xl -bottom-16 -left-16 pointer-events-none" />

      <div className="relative z-10 max-w-[1000px] mx-auto px-5 sm:px-7">
        <Reveal>
          <div className="grid md:grid-cols-[0.9fr_1.1fr] bg-card border border-ink/10 rounded-[28px] overflow-hidden shadow-lift">
            <div className="relative hidden md:flex flex-col justify-end p-9 min-h-[560px] text-white">
              <img src={hallImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/10" />
              <div className="relative">
                <span className="font-display font-bold text-2xl">
                  DırDır<span className="text-primary">.</span>
                </span>
                <h2 className="font-display font-bold text-[1.8rem] leading-tight mt-4 mb-2">{panelTitle}</h2>
                <p className="text-white/80 text-[0.95rem]">{panelText}</p>
              </div>
            </div>

            <div className="p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
              <h1 className="font-display font-bold text-[1.8rem] sm:text-[2.2rem] leading-tight mb-2">{title}</h1>
              <p className="text-inkdim mb-8">{subtitle}</p>
              {children}
              {footer && <div className="mt-8 text-center text-[0.92rem] text-inkdim">{footer}</div>}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function Field({ label, error, id, prefix, children, ...inputProps }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.88rem] font-semibold">
        {label}
      </label>
      <div
        className={`flex items-center bg-bg border-2 rounded-2xl transition-colors focus-within:border-primary ${
          error ? 'border-brand-pink' : 'border-ink/10'
        }`}
      >
        {prefix && <span className="pl-4 pr-1 font-semibold text-inkdim select-none">{prefix}</span>}
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="flex-1 min-w-0 bg-transparent px-4 py-3.5 outline-none placeholder:text-inkdim/50"
          {...inputProps}
        />
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-brand-pink-deep">
          <PiWarningCircleBold size={15} className="shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

export function PasswordField(props) {
  const [visible, setVisible] = useState(false)
  return (
    <Field {...props} type={visible ? 'text' : 'password'}>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
        className="px-4 text-inkdim hover:text-primary transition-colors"
      >
        {visible ? <PiEyeSlashBold size={20} /> : <PiEyeBold size={20} />}
      </button>
    </Field>
  )
}

export function SubmitButton({ children, loading }) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold text-[0.95rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover active:translate-y-0 transition-all disabled:opacity-70 disabled:pointer-events-none"
    >
      {loading ? (
        <>
          <PiSpinnerBold size={18} className="animate-spin" /> Gözlə...
        </>
      ) : (
        children
      )}
    </button>
  )
}

// Serverdən gələn ümumi xəta (sahəyə aid olmayan).
export function FormError({ children }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-2xl bg-brand-pink-soft text-brand-pink-deep px-4 py-3.5 text-[0.9rem] font-semibold"
    >
      <PiWarningCircleBold size={18} className="shrink-0" /> {children}
    </div>
  )
}

// Demo rejim (VITE_API_URL yoxdur) — forma düzgün doldurulanda bunu göstəririk.
export function DemoNotice({ children }) {
  return (
    <div
      role="status"
      className="rounded-2xl bg-brand-teal-soft text-brand-teal-deep px-4 py-3.5 text-[0.9rem] font-semibold"
    >
      {children}
    </div>
  )
}

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
