import { useCallback, useEffect, useState } from 'react'
import {
  PiEnvelopeSimpleBold,
  PiWhatsappLogoBold,
  PiPaperPlaneTiltBold,
  PiMagnifyingGlassBold,
  PiCheckCircleBold,
  PiWarningCircleBold,
  PiUsersThreeBold,
} from 'react-icons/pi'
import { formatPhone } from '../../lib/forms.js'
import { useAdminApi, card, Button, Label, TextInput, TextArea, ErrorBox, Spinner, Empty, formatDateTime } from './ui.jsx'

const CHANNELS = [
  { id: 'email', label: 'Email', icon: PiEnvelopeSimpleBold },
  { id: 'whatsapp', label: 'WhatsApp', icon: PiWhatsappLogoBold },
]

// Admin → Xəbərlər: "Yeniliklərdən xəbərdar ol" seçmiş istifadəçilərə mesaj
export default function AdminBroadcasts() {
  const request = useAdminApi()
  const [info, setInfo] = useState(null) // { emailConfigured, subscribers, broadcasts }
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null) // son göndərişin nəticəsi

  const load = useCallback(() => {
    request('/admin/broadcasts')
      .then(setInfo)
      .catch(setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(load, [load])

  if (!info) return error ? <ErrorBox error={error} /> : <Spinner />

  return (
    <div className="flex flex-col gap-5">
      <p className="text-inkdim">
        Mesaj yalnız qeydiyyatda və ya profilində <b>"Yeniliklərdən xəbərdar ol"</b> açarını açıq saxlayan, bloklanmamış istifadəçilərə gedir. Hazırda
        belə istifadəçi: <b>{info.subscribers}</b>.
      </p>

      {result ? (
        <Result result={result} onClose={() => setResult(null)} />
      ) : (
        <Composer
          info={info}
          onSent={(r) => {
            setResult(r)
            load()
          }}
        />
      )}

      <History broadcasts={info.broadcasts} />
    </div>
  )
}

function Composer({ info, onSent }) {
  const request = useAdminApi()
  const [channel, setChannel] = useState(info.emailConfigured ? 'email' : 'whatsapp')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [mode, setMode] = useState('all') // all | selected
  const [selected, setSelected] = useState(() => new Map()) // id → istifadəçi
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const count = mode === 'all' ? info.subscribers : selected.size
  const blocked = channel === 'email' && !info.emailConfigured

  const send = async (e) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await request('/admin/broadcasts', {
        method: 'POST',
        body: { channel, subject, body, ...(mode === 'selected' ? { userIds: [...selected.keys()] } : {}) },
      })
      onSent({ ...res, channel })
    } catch (err) {
      setError(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={send} className={`${card} flex flex-col gap-5 max-w-[860px]`}>
      <div>
        <Label>Kanal</Label>
        <div className="grid grid-cols-2 gap-3 max-w-[420px]">
          {CHANNELS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChannel(c.id)}
              aria-pressed={channel === c.id}
              className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 font-bold transition-colors ${
                channel === c.id ? 'border-primary bg-primary text-white' : 'border-ink/10 text-inkdim hover:text-ink'
              }`}
            >
              <c.icon size={19} /> {c.label}
            </button>
          ))}
        </div>
      </div>

      {channel === 'email' && !info.emailConfigured && <EmailSetupNote />}
      {channel === 'whatsapp' && (
        <p className="text-[0.85rem] text-inkdim bg-bg rounded-xl px-4 py-3">
          WhatsApp avtomatik kütləvi mesajı yalnız ödənişli WhatsApp Business API ilə mümkündür. Ona görə "Hazırla" basandan sonra hər alıcı üçün
          mətni hazır yazışma linki çıxacaq — basırsan, WhatsApp açılır, "Göndər" edirsən.
        </p>
      )}

      {channel === 'email' && (
        <div>
          <Label htmlFor="b-subject">Mövzu</Label>
          <TextInput id="b-subject" maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="məs. Cümə günü UNO turniri!" error={error?.fields?.subject} />
        </div>
      )}
      <div>
        <Label htmlFor="b-body" hint="{ad} — hər kəsin öz adı ilə əvəz olunur">
          Mətn
        </Label>
        <TextArea
          id="b-body"
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={'Salam {ad}!\n\nBu cümə saat 19:00-da UNO turniri keçiririk...'}
          error={error?.fields?.body}
        />
      </div>

      <div>
        <Label>Kimə</Label>
        <div className="flex flex-wrap gap-2 mb-3">
          <Button size="sm" variant={mode === 'all' ? 'dark' : 'outline'} onClick={() => setMode('all')}>
            <PiUsersThreeBold size={15} /> Bütün abunəçilər ({info.subscribers})
          </Button>
          <Button size="sm" variant={mode === 'selected' ? 'dark' : 'outline'} onClick={() => setMode('selected')}>
            Seçilmiş istifadəçilər{selected.size ? ` (${selected.size})` : ''}
          </Button>
        </div>
        {mode === 'selected' && <RecipientPicker selected={selected} onChange={setSelected} />}
      </div>

      <ErrorBox error={error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={sending} disabled={blocked || count === 0 || !body.trim()}>
          <PiPaperPlaneTiltBold size={16} /> {channel === 'email' ? `${count} nəfərə göndər` : `${count} nəfər üçün hazırla`}
        </Button>
        {channel === 'email' && sending && <span className="text-[0.85rem] text-inkdim">Göndərilir… çox alıcı varsa bir az çəkə bilər.</span>}
      </div>
    </form>
  )
}

// Yalnız abunəçilər arasında axtarıb seçmək
function RecipientPicker({ selected, onChange }) {
  const request = useAdminApi()
  const [q, setQ] = useState('')
  const [users, setUsers] = useState(null)

  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams({ newsletter: 'yes', status: 'active', limit: 100, sort: 'name' })
      if (q.trim()) params.set('q', q.trim())
      request(`/admin/users?${params}`)
        .then((d) => setUsers(d.users))
        .catch(() => setUsers([]))
    }, 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const toggle = (u) => {
    const next = new Map(selected)
    next.has(u.id) ? next.delete(u.id) : next.set(u.id, u)
    onChange(next)
  }

  return (
    <div className="rounded-2xl border border-ink/10 p-3 flex flex-col gap-2">
      <div className="relative">
        <PiMagnifyingGlassBold size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-inkdim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Abunəçilər arasında axtar"
          className="w-full bg-bg border-2 border-ink/10 rounded-full pl-10 pr-4 py-2.5 outline-none focus:border-primary"
        />
      </div>
      <div className="max-h-[280px] overflow-y-auto">
        {users === null ? (
          <Spinner />
        ) : users.length === 0 ? (
          <p className="text-[0.85rem] text-inkdim px-2 py-4 text-center">Abunəçi tapılmadı.</p>
        ) : (
          users.map((u) => (
            <label key={u.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-ink/5 cursor-pointer">
              <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u)} className="w-5 h-5 accent-[var(--color-primary)]" />
              <span className="font-semibold">
                {u.firstName} {u.lastName}
              </span>
              <span className="text-[0.82rem] text-inkdim truncate">
                {u.email} · +994 {formatPhone(u.phone)}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  )
}

function EmailSetupNote() {
  return (
    <div className="flex gap-3 rounded-xl bg-brand-yellow-soft text-brand-yellow-deep px-4 py-3 text-[0.88rem] font-semibold">
      <PiWarningCircleBold size={20} className="shrink-0 mt-0.5" />
      <div>
        Email göndərmək hələ qoşulmayıb. Qoşmaq üçün serverə (Render → dirdir-api → Environment) poçt ayarları əlavə olunmalıdır:
        <code className="block mt-1.5 font-mono text-[0.8rem] font-medium">SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM</code>
        Gmail ilə də olur — Claude-dan addım-addım kömək istə.
      </div>
    </div>
  )
}

function Result({ result, onClose }) {
  const [opened, setOpened] = useState(() => new Set())
  const { broadcast, recipients, channel } = result

  return (
    <div className={`${card} flex flex-col gap-4 max-w-[860px]`}>
      {channel === 'email' ? (
        <div className="flex items-start gap-3">
          <PiCheckCircleBold size={26} className="text-brand-teal shrink-0" />
          <div>
            <p className="font-display font-bold text-[1.2rem]">Göndərildi: {broadcast.sentCount} / {broadcast.recipientCount}</p>
            {broadcast.failedCount > 0 && (
              <p className="text-brand-pink-deep font-semibold text-[0.9rem]">{broadcast.failedCount} ünvana çatmadı (ünvan səhv ola bilər).</p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div>
            <p className="font-display font-bold text-[1.2rem]">WhatsApp mesajları hazırdır — {recipients.length} nəfər</p>
            <p className="text-[0.88rem] text-inkdim">
              Hər birinə bas → WhatsApp mətni hazır açılır → "Göndər". Göndərdiklərinin yanında ✓ qalır. Açıq: {opened.size} / {recipients.length}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto">
            {recipients.map((r) => (
              <div key={r.id} className={`flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5 ${opened.has(r.id) ? 'bg-brand-teal-soft' : 'bg-bg'}`}>
                <span className="font-semibold">
                  {r.firstName} {r.lastName}
                </span>
                <span className="text-[0.85rem] text-inkdim">+994 {formatPhone(r.phone)}</span>
                <a
                  href={`https://wa.me/994${r.phone}?text=${encodeURIComponent(r.message)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpened((s) => new Set(s).add(r.id))}
                  className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-[0.85rem] bg-[#25D366] text-white hover:brightness-95"
                >
                  {opened.has(r.id) ? <PiCheckCircleBold size={16} /> : <PiWhatsappLogoBold size={16} />} WhatsApp-da aç
                </a>
              </div>
            ))}
          </div>
        </>
      )}
      <Button onClick={onClose} className="self-start">
        Yeni mesaj yaz
      </Button>
    </div>
  )
}

function History({ broadcasts }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display font-bold text-[1.15rem]">Son göndərişlər</h2>
      {broadcasts.length === 0 ? (
        <Empty>Hələ mesaj göndərilməyib.</Empty>
      ) : (
        broadcasts.map((b) => (
          <div key={b.id} className={`${card} py-4 sm:py-4 flex flex-col gap-1`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.82rem] text-inkdim">
              <span className="inline-flex items-center gap-1 font-bold text-ink">
                {b.channel === 'email' ? <PiEnvelopeSimpleBold size={14} /> : <PiWhatsappLogoBold size={14} />}
                {b.channel === 'email' ? 'Email' : 'WhatsApp'}
              </span>
              <span>{formatDateTime(b.createdAt)}</span>
              <span>
                {b.channel === 'email' ? `${b.sentCount}/${b.recipientCount} göndərildi` : `${b.recipientCount} alıcı`}
              </span>
              {b.createdBy && (
                <span>
                  · {b.createdBy.firstName} {b.createdBy.lastName}
                </span>
              )}
            </div>
            {b.subject && <div className="font-bold">{b.subject}</div>}
            <p className="text-[0.9rem] text-inkdim line-clamp-2 whitespace-pre-line">{b.body}</p>
          </div>
        ))
      )}
    </div>
  )
}
