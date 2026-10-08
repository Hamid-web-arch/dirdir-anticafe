import { useCallback, useEffect, useState } from 'react'
import { PiPlusBold, PiTrashBold } from 'react-icons/pi'
import { formatAzDate } from '../../i18n/index.jsx'
import { useAdminApi, card, Button, ConfirmButton, Label, TextInput, ErrorBox, Spinner, Empty, Checkbox } from './ui.jsx'

const formatDate = (iso) => formatAzDate(iso, { day: 'numeric', month: 'short', year: 'numeric' })

export default function AdminPromos() {
  const request = useAdminApi()
  const [codes, setCodes] = useState(null)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ code: '', percent: '', expiresAt: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    request('/admin/promo-codes')
      .then((d) => setCodes(d.promoCodes))
      .catch(setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(load, [load])

  const create = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await request('/admin/promo-codes', {
        method: 'POST',
        body: {
          code: form.code,
          percent: Number(form.percent),
          // Seçilən günün sonuna qədər keçərlidir
          expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
        },
      })
      setForm({ code: '', percent: '', expiresAt: '' })
      load()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (promo) => {
    try {
      await request(`/admin/promo-codes/${promo.id}`, { method: 'PATCH', body: { active: !promo.active } })
      load()
    } catch (err) {
      setError(err)
    }
  }

  const expired = (p) => p.expiresAt && new Date(p.expiresAt) < new Date()

  return (
    <div className="flex flex-col gap-4">
      <p className="text-inkdim">Promokodlar saytdakı hesablayıcıda yoxlanılır. Kodların siyahısı saytda görünmür.</p>

      <form onSubmit={create} className={`${card} grid sm:grid-cols-[1fr_120px_180px_auto] gap-3 items-end`}>
        <div>
          <Label htmlFor="p-code">Kod</Label>
          <TextInput
            id="p-code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="YAY2026"
            className="uppercase"
            required
          />
        </div>
        <div>
          <Label htmlFor="p-percent">Endirim %</Label>
          <TextInput
            id="p-percent"
            type="number"
            min={1}
            max={100}
            value={form.percent}
            onChange={(e) => setForm((f) => ({ ...f, percent: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="p-exp" hint="istəyə görə">
            Son tarix
          </Label>
          <TextInput id="p-exp" type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
        </div>
        <Button type="submit" variant="primary" loading={saving}>
          <PiPlusBold size={16} /> Yarat
        </Button>
      </form>

      <ErrorBox error={error} />
      {codes === null ? (
        <Spinner />
      ) : codes.length === 0 ? (
        <Empty>Hələ promokod yoxdur.</Empty>
      ) : (
        <div className={`${card} p-2 sm:p-2`}>
          {codes.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-3 border-b border-ink/5 last:border-none">
              <span className={`font-mono font-bold text-[1.05rem] ${p.active && !expired(p) ? '' : 'line-through text-inkdim'}`}>{p.code}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-brand-orange-soft text-brand-orange-deep font-bold text-[0.85rem]">−{p.percent}%</span>
              <span className="text-[0.85rem] text-inkdim flex-1">
                {p.expiresAt ? `${expired(p) ? 'bitib' : 'son tarix'}: ${formatDate(p.expiresAt)}` : 'müddətsiz'}
              </span>
              <Checkbox checked={p.active} onChange={() => toggle(p)}>
                Aktiv
              </Checkbox>
              <ConfirmButton
                question="Kod silinsin?"
                onConfirm={async () => {
                  try {
                    await request(`/admin/promo-codes/${p.id}`, { method: 'DELETE' })
                    load()
                  } catch (err) {
                    setError(err)
                  }
                }}
              >
                <PiTrashBold size={15} />
              </ConfirmButton>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
