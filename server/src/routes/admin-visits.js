import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireAdmin } from '../auth.js'
import { HttpError } from '../middleware/error.js'
import { requirePermission } from '../permissions.js'
import { getPricing } from '../pricing.js'
import { bakuDay, visitMinutes, visitPrice, publicVisit, paymentSplit } from '../visits.js'
import { visitListQuerySchema, visitCreateSchema, visitUpdateSchema, visitEndSchema } from '../validation.js'

// Günün hesabatı: admin hər gələn müştərinin seansını başladır və bitirir.
// Qeydlər günlərə (Bakı vaxtı) bölünür və silinmir — tarixçədən istənilən günə baxmaq olur.
export const adminVisitsRouter = Router()
adminVisitsRouter.use('/visits', requireAuth, requireAdmin, requirePermission('hesabat'))

const withUser = { user: { select: { id: true, firstName: true, lastName: true, phone: true } } }

// Başlama vaxtı gələcəkdə ola bilməz (saatlar arasında kiçik fərqə 1 dəqiqə yer qoyuruq)
function assertNotFuture(date, field, label) {
  if (date.getTime() > Date.now() + 60_000) {
    throw new HttpError(400, 'VALIDATION', `${label} gələcəkdə ola bilməz.`, {
      fields: { [field]: `${label} gələcəkdə ola bilməz.` },
    })
  }
}

// Kino otağı: nəfər sayı otağın tutumundan çox olmamalıdır; otaq bir dənədir — eyni anda bir davam edən seans.
async function assertRoom({ people, exceptId, checkBusy = true }) {
  const { room } = await getPricing()
  if (people > room.maxPeople) {
    const message = `Kino otağına ən çox ${room.maxPeople} nəfər sığır.`
    throw new HttpError(400, 'VALIDATION', message, { fields: { people: message } })
  }
  if (!checkBusy) return
  const busy = await prisma.visit.findFirst({ where: { kind: 'room', endedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) } })
  if (busy) throw new HttpError(409, 'ROOM_BUSY', `Kino otağı məşğuldur — ${busy.name} adına seans davam edir.`)
}

// Tələbə sayı nəfər sayından çox ola bilməz; kino otağında tələbə endirimi yoxdur
function studentsFor({ kind, people, students }) {
  if (kind === 'room') return 0
  if (students > people) {
    const message = 'Tələbə sayı nəfər sayından çox ola bilməz.'
    throw new HttpError(400, 'VALIDATION', message, { fields: { students: message } })
  }
  return students
}

// Promokod: aktiv və vaxtı keçməmiş olmalıdır. Faizi seansa yazılır.
async function promoFor(code) {
  const promo = await prisma.promoCode.findUnique({ where: { code } })
  const usable = promo && promo.active && (!promo.expiresAt || promo.expiresAt > new Date())
  if (!usable) {
    throw new HttpError(404, 'PROMO_NOT_FOUND', 'Bu promokod tapılmadı.', {
      fields: { promoCode: 'Bu promokod tapılmadı və ya vaxtı keçib.' },
    })
  }
  return { promoCode: promo.code, promoPercent: promo.percent }
}

// Bitmiş seansın müddəti və məbləği (cari qiymətlərlə; zalda nəfər sayına vurulur və tələbə endirimi çıxılır,
// kino otağında bütün otaq üçün)
async function closing(startedAt, endedAt, visit) {
  if (endedAt <= startedAt) {
    throw new HttpError(400, 'VALIDATION', 'Bitmə vaxtı başlama vaxtından sonra olmalıdır.', {
      fields: { endedAt: 'Bitmə vaxtı başlama vaxtından sonra olmalıdır.' },
    })
  }
  const pricing = await getPricing()
  const minutes = visitMinutes(startedAt, endedAt)
  return { endedAt, minutes, amount: visitPrice(pricing, minutes, visit).amount }
}

// Xüsusi endirim → bazadakı sahələr (null — endirim yoxdur)
const discountFields = (discount) => ({ discountType: discount?.type ?? null, discountValue: discount?.value ?? null })
// Beh → bazadakı sahələr (null — beh yoxdur)
const depositFields = (deposit) => ({ deposit: deposit?.amount ?? null, depositMethod: deposit?.method ?? null })

async function findVisit(id) {
  const visit = await prisma.visit.findUnique({ where: { id } })
  if (!visit) throw new HttpError(404, 'NOT_FOUND', 'Seans tapılmadı.')
  return visit
}

// Bir günün seansları + yekun. Davam edən seansların məbləğini klient canlı hesablayır.
adminVisitsRouter.get('/visits', async (req, res) => {
  const today = bakuDay()
  const { day = today } = visitListQuerySchema.parse(req.query)
  const visits = await prisma.visit.findMany({ where: { day }, orderBy: { startedAt: 'asc' }, include: withUser })
  res.json({ day, today, visits: visits.map(publicVisit) })
})

// Tarixçə: qeyd olan günlər (yenidən köhnəyə) — müştəri sayı (nəfərlərin cəmi), bitmiş seansların cəmi, nağd və kart ayrıca
// Beh öz üsulunda, qalıq bitəndə seçilən üsulda sayılır (paymentSplit)
adminVisitsRouter.get('/visits/days', async (req, res) => {
  const rows = await prisma.visit.findMany({
    select: { day: true, people: true, amount: true, endedAt: true, paymentMethod: true, deposit: true, depositMethod: true },
    orderBy: { day: 'desc' },
  })
  const round2 = (n) => Math.round(n * 100) / 100
  const days = new Map()
  for (const v of rows) {
    const d = days.get(v.day) ?? { day: v.day, count: 0, total: 0, cash: 0, card: 0 }
    d.count += v.people
    if (v.endedAt && v.amount != null) {
      const split = paymentSplit(v)
      d.total = round2(d.total + Number(v.amount))
      d.cash = round2(d.cash + split.cash)
      d.card = round2(d.card + split.card)
    }
    days.set(v.day, d)
  }
  res.json({ days: [...days.values()].slice(0, 120) })
})

adminVisitsRouter.post('/visits', async (req, res) => {
  const { userId, name, kind = 'hall', people = 1, students: rawStudents = 0, promoCode, discount, deposit, startedAt = new Date(), note } =
    visitCreateSchema.parse(req.body)
  const promo = promoCode ? await promoFor(promoCode) : {}
  const students = studentsFor({ kind, people, students: rawStudents })
  assertNotFuture(startedAt, 'startedAt', 'Başlama vaxtı')
  if (kind === 'room') await assertRoom({ people })

  let customerName = name
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new HttpError(404, 'NOT_FOUND', 'İstifadəçi tapılmadı.')
    const active = await prisma.visit.findFirst({ where: { userId, endedAt: null } })
    if (active) throw new HttpError(409, 'VISIT_ACTIVE', 'Bu istifadəçinin artıq davam edən seansı var.')
    customerName = `${user.firstName} ${user.lastName}`
  }

  const visit = await prisma.visit.create({
    data: {
      day: bakuDay(startedAt),
      userId: userId ?? null,
      name: customerName,
      kind,
      people,
      students,
      ...promo,
      ...discountFields(discount),
      ...depositFields(deposit),
      startedAt,
      note: note || null,
      createdById: req.user.id,
    },
    include: withUser,
  })
  res.status(201).json({ visit: publicVisit(visit) })
})

// Seansı bitir: indiki vaxtla, məbləğ cari qiymətlərlə hesablanır; ödəniş üsulu (nağd/kart) qeyd olunur
adminVisitsRouter.post('/visits/:id/end', async (req, res) => {
  const { paymentMethod } = visitEndSchema.parse(req.body ?? {})
  const visit = await findVisit(req.params.id)
  if (visit.endedAt) throw new HttpError(409, 'VISIT_ENDED', 'Bu seans artıq bitib.')
  const updated = await prisma.visit.update({
    where: { id: visit.id },
    data: { ...(await closing(visit.startedAt, new Date(), visit)), paymentMethod },
    include: withUser,
  })
  res.json({ visit: publicVisit(updated) })
})

// Səhv düzəltmək: ad, növ, nəfər sayı, qeyd, başlama/bitmə vaxtı. Bitmiş seansda məbləğ yenidən hesablanır.
adminVisitsRouter.patch('/visits/:id', async (req, res) => {
  const { name, kind, people, students, promoCode, discount, deposit, startedAt, endedAt, note, paymentMethod } =
    visitUpdateSchema.parse(req.body)
  const visit = await findVisit(req.params.id)
  if ((endedAt || paymentMethod) && !visit.endedAt) {
    throw new HttpError(400, 'VALIDATION', 'Seansı bitirmək üçün "Bitir" düyməsini işlət.')
  }
  // Davam edən seansın yeri (zal ↔ kino otağı) dəyişmir; bitmiş seansda səhv düzəltmək üçün olar
  if (kind && kind !== visit.kind && !visit.endedAt) {
    throw new HttpError(400, 'VALIDATION', 'Davam edən seansın yerini dəyişmək olmaz.', {
      fields: { kind: 'Davam edən seansın yerini dəyişmək olmaz.' },
    })
  }
  const nextKind = kind ?? visit.kind
  const nextPeople = people ?? visit.people
  const nextStudents = studentsFor({ kind: nextKind, people: nextPeople, students: students ?? visit.students })
  // Promokod: null — sil; eyni kod — olduğu kimi qalır (vaxtı keçmiş olsa da); yeni kod — yoxlanır
  let promo = { promoCode: visit.promoCode, promoPercent: visit.promoPercent }
  const promoChanged = promoCode !== undefined && promoCode !== visit.promoCode
  if (promoChanged) promo = promoCode ? await promoFor(promoCode) : { promoCode: null, promoPercent: null }
  // Bitmiş seansda otağın məşğulluğu yoxlanmır — yalnız tutum
  if (nextKind === 'room' && (kind || people)) {
    await assertRoom({ people: nextPeople, exceptId: visit.id, checkBusy: !visit.endedAt })
  }

  const data = {}
  if (name !== undefined) data.name = name
  if (note !== undefined) data.note = note || null
  if (people !== undefined) data.people = people
  if (kind) data.kind = kind
  if (nextStudents !== visit.students) data.students = nextStudents
  if (promoChanged) Object.assign(data, promo)
  // Xüsusi endirim: göndərilməyibsa — olduğu kimi qalır
  const nextDiscount =
    discount !== undefined ? discountFields(discount) : { discountType: visit.discountType, discountValue: visit.discountValue }
  if (discount !== undefined) Object.assign(data, nextDiscount)
  // Beh məbləği dəyişmir — yalnız nağd/kart bölgüsünü dəyişir
  if (deposit !== undefined) Object.assign(data, depositFields(deposit))
  if (paymentMethod) data.paymentMethod = paymentMethod
  if (startedAt) {
    assertNotFuture(startedAt, 'startedAt', 'Başlama vaxtı')
    data.startedAt = startedAt
    data.day = bakuDay(startedAt)
  }
  if (endedAt) assertNotFuture(endedAt, 'endedAt', 'Bitmə vaxtı')
  if (visit.endedAt && (startedAt || endedAt || people || kind || students !== undefined || promoChanged || discount !== undefined)) {
    Object.assign(
      data,
      await closing(startedAt ?? visit.startedAt, endedAt ?? visit.endedAt, {
        people: nextPeople,
        kind: nextKind,
        students: nextStudents,
        promoPercent: promo.promoPercent,
        ...nextDiscount,
      }),
    )
  }

  const updated = await prisma.visit.update({ where: { id: visit.id }, data, include: withUser })
  res.json({ visit: publicVisit(updated) })
})

// Bitmiş seansı yenidən davam etdir (səhvən "Bitir" basılıbsa)
adminVisitsRouter.post('/visits/:id/resume', async (req, res) => {
  const visit = await findVisit(req.params.id)
  if (!visit.endedAt) throw new HttpError(409, 'VISIT_ACTIVE', 'Bu seans onsuz da davam edir.')
  if (visit.userId) {
    const other = await prisma.visit.findFirst({ where: { userId: visit.userId, endedAt: null } })
    if (other) throw new HttpError(409, 'VISIT_ACTIVE', 'Bu istifadəçinin artıq davam edən seansı var.')
  }
  if (visit.kind === 'room') await assertRoom({ people: visit.people })
  const updated = await prisma.visit.update({
    where: { id: visit.id },
    data: { endedAt: null, minutes: null, amount: null, paymentMethod: null },
    include: withUser,
  })
  res.json({ visit: publicVisit(updated) })
})

adminVisitsRouter.delete('/visits/:id', async (req, res) => {
  await findVisit(req.params.id)
  await prisma.visit.delete({ where: { id: req.params.id } })
  res.status(204).end()
})
