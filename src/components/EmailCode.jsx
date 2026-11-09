import { useEffect, useState } from 'react'
import { PiArrowClockwiseBold, PiCheckCircleBold } from 'react-icons/pi'
import { Field } from './AuthLayout.jsx'
import { useI18n } from '../i18n/index.jsx'

const RESEND_SECONDS = 60 // server/src/emailCodes.js → RESEND_AFTER_SECONDS ilə eyni

// Emailə gələn 6 rəqəmli kod: yalnız rəqəmlər, telefonda rəqəm klaviaturası və SMS/email-dən avtomatik doldurma
export function CodeField({ value, onChange, error, id = 'email-code' }) {
  const { t } = useI18n()
  return (
    <Field
      id={id}
      label={t('auth.codeLabel')}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      placeholder="••••••"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      error={error}
      autoFocus
      // Field-in öz sinifləri burada əvəz olunur — onları da yazırıq
      className="flex-1 min-w-0 bg-transparent px-4 py-3 outline-none placeholder:text-inkdim/40 font-display text-[1.5rem] tracking-[0.5em] text-center"
    />
  )
}

// "Kodu yenidən göndər" — kod göndəriləndən 60 saniyə sonra aktiv olur
export function ResendCode({ onResend }) {
  const { t, errorText } = useI18n()
  const [left, setLeft] = useState(RESEND_SECONDS)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (left <= 0) return
    const id = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [left])

  const resend = async () => {
    setBusy(true)
    setError(null)
    setDone(false)
    try {
      await onResend()
      setDone(true)
      setLeft(RESEND_SECONDS)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="text-center text-[0.88rem]">
      {left > 0 ? (
        <span className="text-inkdim">{t('auth.codeResendIn', { seconds: left })}</span>
      ) : (
        <button type="button" onClick={resend} disabled={busy} className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline disabled:opacity-60">
          <PiArrowClockwiseBold size={15} className={busy ? 'animate-spin' : ''} /> {t('auth.codeResend')}
        </button>
      )}
      {done && (
        <p className="inline-flex items-center gap-1 text-brand-teal-deep font-semibold mt-1.5 w-full justify-center">
          <PiCheckCircleBold size={15} /> {t('auth.codeResent')}
        </p>
      )}
      {error && <p className="text-brand-pink-deep font-semibold mt-1.5">{errorText(error)}</p>}
    </div>
  )
}
