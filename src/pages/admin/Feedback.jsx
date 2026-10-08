import { useCallback, useEffect, useState } from 'react'
import { PiCheckBold, PiArrowCounterClockwiseBold, PiTrashBold, PiUserBold, PiWhatsappLogoBold, PiEnvelopeSimpleBold } from 'react-icons/pi'
import { formatPhone } from '../../lib/forms.js'
import { useAdminApi, card, Button, ConfirmButton, ErrorBox, Spinner, Empty, formatDateTime } from './ui.jsx'

// Əlaqə sahəsindən cavab linki: email → mailto, nömrə → WhatsApp
function replyLink(contact) {
  if (!contact) return null
  if (contact.includes('@')) return { href: `mailto:${contact}`, icon: PiEnvelopeSimpleBold }
  let digits = contact.replace(/\D/g, '')
  if (digits.startsWith('994')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.length === 9 ? { href: `https://wa.me/994${digits}`, icon: PiWhatsappLogoBold } : null
}

// Admin → Rəylər: saytdakı "Rəy və təkliflər" formasından gələn mesajlar
export default function AdminFeedback() {
  const request = useAdminApi()
  const [data, setData] = useState(null)
  const [filter, setFilter] = useState('unread')
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    request(`/admin/feedback${filter === 'unread' ? '?status=unread' : ''}`)
      .then(setData)
      .catch(setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])
  useEffect(load, [load])

  const setRead = async (item, read) => {
    try {
      await request(`/admin/feedback/${item.id}`, { method: 'PATCH', body: { read } })
      load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {[
          ['unread', `Oxunmamış${data ? ` (${data.unread})` : ''}`],
          ['all', 'Hamısı'],
        ].map(([value, label]) => (
          <Button key={value} size="sm" variant={filter === value ? 'dark' : 'outline'} onClick={() => setFilter(value)}>
            {label}
          </Button>
        ))}
        <p className="text-[0.85rem] text-inkdim ml-1">Saytdakı "Rəy və təkliflər" formasından gələn mesajlar.</p>
      </div>
      <ErrorBox error={error} />

      {data === null ? (
        <Spinner />
      ) : data.feedback.length === 0 ? (
        <Empty>{filter === 'unread' ? 'Oxunmamış mesaj yoxdur 🎉' : 'Hələ mesaj yoxdur.'}</Empty>
      ) : (
        data.feedback.map((f) => {
          const contact = f.user ? f.user.email : f.contact
          const reply = f.user ? { href: `https://wa.me/994${f.user.phone}`, icon: PiWhatsappLogoBold } : replyLink(f.contact)
          return (
            <div key={f.id} className={`${card} flex flex-col gap-3 ${f.read ? 'opacity-70' : 'border-l-4 border-l-primary'}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.85rem]">
                <span className="font-bold text-[0.95rem]">
                  {f.user ? `${f.user.firstName} ${f.user.lastName}` : f.name || 'Adsız'}
                </span>
                {f.user && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-teal-soft text-brand-teal-deep font-bold text-[0.72rem]">
                    <PiUserBold size={11} /> qeydiyyatlı
                  </span>
                )}
                {contact && <span className="text-inkdim">{contact}</span>}
                {f.user && <span className="text-inkdim">+994 {formatPhone(f.user.phone)}</span>}
                <span className="text-inkdim ml-auto">{formatDateTime(f.createdAt)}</span>
              </div>
              <p className="whitespace-pre-line leading-relaxed">{f.message}</p>
              <div className="flex flex-wrap gap-1.5">
                {f.read ? (
                  <Button size="sm" variant="ghost" onClick={() => setRead(f, false)}>
                    <PiArrowCounterClockwiseBold size={15} /> Oxunmamış et
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setRead(f, true)}>
                    <PiCheckBold size={15} /> Oxundu
                  </Button>
                )}
                {reply && (
                  <a
                    href={reply.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-[0.82rem] border-2 border-ink/15 hover:border-ink transition-colors"
                  >
                    <reply.icon size={15} /> Cavab yaz
                  </a>
                )}
                <ConfirmButton
                  question="Mesaj silinsin?"
                  onConfirm={async () => {
                    try {
                      await request(`/admin/feedback/${f.id}`, { method: 'DELETE' })
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
          )
        })
      )}
    </div>
  )
}
