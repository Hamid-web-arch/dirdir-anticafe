import { useState } from 'react'
import { PiChatCircleTextBold, PiPaperPlaneTiltBold, PiCheckCircleFill, PiSpinnerBold } from 'react-icons/pi'
import Reveal from './Reveal.jsx'
import { api, apiEnabled } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useI18n } from '../i18n/index.jsx'

const inputClass =
  'w-full bg-bg border-2 border-ink/10 rounded-2xl px-4 py-3 outline-none focus:border-primary transition-colors placeholder:text-inkdim/60'

// "Rəy və təkliflər" — hər kəs yaza bilər; admin paneldə "Rəylər" bölməsində görünür.
export default function Feedback() {
  const { t, errorText, fieldErrors } = useI18n()
  const { user, token } = useAuth()
  const [form, setForm] = useState({ name: '', contact: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [tooShort, setTooShort] = useState(false)

  if (!apiEnabled) return null

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setError(null)
    setTooShort(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (form.message.trim().length < 5) return setTooShort(true)
    setSending(true)
    try {
      // Daxil olubsa, adı və əlaqəsi hesabdan götürülür
      const body = user
        ? { name: `${user.firstName} ${user.lastName}`, contact: user.email, message: form.message }
        : form
      await api('/feedback', { method: 'POST', body, token })
      setSent(true)
      setForm({ name: '', contact: '', message: '' })
    } catch (err) {
      setError(err)
    } finally {
      setSending(false)
    }
  }

  const messageError = tooShort ? t('feedback.tooShort') : fieldErrors(error)?.message

  return (
    <section id="rey" className="py-20">
      <div className="max-w-[760px] mx-auto px-5 sm:px-7">
        <Reveal className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 text-[0.8rem] tracking-wide uppercase text-brand-purple-deep font-bold mb-3 bg-brand-purple-soft px-3 py-1.5 rounded-full">
            <PiChatCircleTextBold size={15} /> {t('feedback.chip')}
          </span>
          <h2 className="font-display font-bold text-[1.9rem] md:text-[2.4rem] mb-2">{t('feedback.title')}</h2>
          <p className="text-inkdim">{t('feedback.intro')}</p>
        </Reveal>

        <Reveal>
          {sent ? (
            <div className="bg-card border border-ink/10 rounded-[24px] p-8 text-center">
              <PiCheckCircleFill size={44} className="mx-auto text-brand-teal mb-3" />
              <p className="font-display font-bold text-[1.3rem] mb-1">{t('feedback.thanks')}</p>
              <p className="text-inkdim mb-5">{t('feedback.thanksText')}</p>
              <button onClick={() => setSent(false)} className="font-bold text-primary hover:underline">
                {t('feedback.another')}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="bg-card border border-ink/10 rounded-[24px] p-6 sm:p-8 flex flex-col gap-4">
              {user ? (
                <p className="text-[0.88rem] text-inkdim">{t('feedback.asUser', { name: user.firstName })}</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    value={form.name}
                    onChange={set('name')}
                    maxLength={80}
                    placeholder={t('feedback.name')}
                    aria-label={t('feedback.name')}
                    className={inputClass}
                  />
                  <input
                    value={form.contact}
                    onChange={set('contact')}
                    maxLength={100}
                    placeholder={t('feedback.contact')}
                    aria-label={t('feedback.contact')}
                    className={inputClass}
                  />
                </div>
              )}
              <div>
                <textarea
                  value={form.message}
                  onChange={set('message')}
                  maxLength={2000}
                  rows={5}
                  placeholder={t('feedback.message')}
                  aria-label={t('feedback.message')}
                  aria-invalid={Boolean(messageError)}
                  className={`${inputClass} resize-y min-h-[130px] aria-[invalid=true]:border-brand-pink`}
                />
                {messageError && <p className="text-[0.82rem] font-semibold text-brand-pink-deep mt-1">{messageError}</p>}
              </div>
              {error && !fieldErrors(error)?.message && (
                <p className="text-[0.88rem] font-semibold text-brand-pink-deep">{errorText(error)}</p>
              )}
              <button
                type="submit"
                disabled={sending}
                className="self-start inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-[0.92rem] bg-primary text-white shadow-cta hover:-translate-y-0.5 hover:shadow-cta-hover transition-all disabled:opacity-60"
              >
                {sending ? <PiSpinnerBold size={17} className="animate-spin" /> : <PiPaperPlaneTiltBold size={17} />}
                {t('feedback.send')}
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  )
}
