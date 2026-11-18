import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../db.js'
import { requireAuth, requireAdmin } from '../auth.js'
import { HttpError } from '../middleware/error.js'
import { requirePermission } from '../permissions.js'
import { getPricing } from '../pricing.js'
import { bakuDay, visitMinutes, visitPrice, publicVisit, paymentSplit } from '../visits.js'
import { visitListQuerySchema, visitCreateSchema, visitUpdateSchema, visitEndSchema } from '../validation.js'
import { clubSnapshot } from '../club.js'
import { prizeEffect, spinExpired } from '../wheel.js'

// Günün hesabatı: admin hər gələn sifarişi (seansı) başladır və bitirir.
// Bir sifarişdə bir neçə nəfər ola bilər: DırDır Club üzvləri (hər biri öz statusu ilə) və qonaqlar.
// Hər nəfər öz payını ödəyir (nağd/kart ayrıca), hər üzvə ziyarət yazılır.
// Köhnə seanslarda nəfərlər yoxdur — onlar bir nəfərin adına (userId, people, students) hesablanır.
// Qeydlər günlərə (Bakı vaxtı) bölünür və silinmir — tarixçədən istənilən günə baxmaq olur.
export const adminVisitsRouter = Router()
adminVisitsRouter.use('/visits', requireAuth, requireAdmin, requirePermission('hesabat'))

const userSelect = { select: { id: true, firstName: true, lastName: true, phone: true, customerNo: true } }
const withUser = {
  user: userSelect,
  persons: { orderBy: { position: 'asc' }, include: { user: userSelect } },
}

const fullName = (u) => `${u.firstName} ${u.lastName}`

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

// Tələbə sayı nəfər sayından çox ola bilməz; kino otağında tələbə endirimi yoxdur (köhnə seanslar üçün)
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

// Bir üzv eyni anda iki davam edən seansda ola bilməz
async function assertMembersFree(userIds, exceptVisitId) {
  if (userIds.length === 0) return
  const busy = await prisma.visit.findFirst({
    where: {
      endedAt: null,
      ...(exceptVisitId ? { id: { not: exceptVisitId } } : {}),
      OR: [{ userId: { in: userIds } }, { persons: { some: { userId: { in: userIds } } } }],
    },
  })
  if (busy) throw new HttpError(409, 'VISIT_ACTIVE', `Üzvlərdən birinin artıq davam edən seansı var (${busy.name}).`)
}

// Üzvlər mövcuddurmu, təkrarlanmırmı → Map<userId, user>
async function loadMembers(list) {
  const ids = list.map((p) => p.userId).filter(Boolean)
  if (new Set(ids).size !== ids.length) {
    throw new HttpError(400, 'VALIDATION', 'Eyni üzv sifarişə iki dəfə əlavə olunub.', { fields: { persons: 'Eyni üzv iki dəfə əlavə olunub.' } })
  }
  const users = await prisma.user.findMany({ where: { id: { in: ids } } })
  if (users.length !== ids.length) throw new HttpError(404, 'NOT_FOUND', 'İstifadəçi tapılmadı.')
  return new Map(users.map((u) => [u.id, u]))
}

// Hədiyyə çarxının hədiyyəsi nəfərə endirim kimi: üzvün özünün olmalı, istifadə olunmamış, vaxtı keçməmiş,
// başqa sifarişdə seçilməmiş və endirim növündə (faiz / pulsuz vaxt). → hədiyyənin təsiri (VisitPerson.gift)
async function giftFor(spinId, userId, visitId = null) {
  const spin = await prisma.wheelSpin.findUnique({ where: { id: spinId }, include: { visitPerson: true } })
  const fail = (message) => {
    throw new HttpError(400, 'VALIDATION', message, { fields: { persons: message } })
  }
  if (!spin || !userId || spin.userId !== userId) fail('Hədiyyə bu üzvə aid deyil.')
  if (spin.visitPerson && spin.visitPerson.visitId !== visitId) fail('Bu hədiyyə artıq başqa sifarişdə istifadə olunub.')
  if (spin.usedAt && !spin.visitPerson) fail('Bu hədiyyə artıq istifadə olunub.')
  if (spinExpired(spin) && !spin.visitPerson) fail('Bu hədiyyənin istifadə müddəti bitib.')
  const effect = prizeEffect(spin.prize)
  if (effect.kind === 'gift') fail('Bu hədiyyə endirim deyil — onu "Verildi" ilə ver.')
  return { ...effect, label: spin.prize }
}

// Hədiyyələrin "istifadə olunub" vəziyyəti sifarişə görə: bitmiş sifarişdədirsə — istifadə olunub,
// davam edən sifarişdədirsə və ya sifarişdən çıxarılıbsa — yenə istifadə oluna bilər
async function syncSpins(tx, spinIds, adminId) {
  for (const id of new Set(spinIds.filter(Boolean))) {
    const person = await tx.visitPerson.findUnique({ where: { spinId: id }, include: { visit: true } })
    const endedAt = person?.visit.endedAt
    await tx.wheelSpin.update({
      where: { id },
      data: endedAt ? { usedAt: endedAt, usedById: adminId } : { usedAt: null, usedById: null },
    })
  }
}

// Köhnə forma ({ userId, people, students }) → nəfərlər: üzv birinci, qalanları qonaq; tələbələr əvvəldən
function legacyPersons({ userId, people = 1, students = 0 }) {
  const count = Math.max(people, userId ? 1 : 0, 1)
  return Array.from({ length: count }, (_, i) => ({ userId: i === 0 ? (userId ?? null) : null, student: i < students }))
}

// Sifarişin ümumi sahələri nəfərlərdən: say, tələbə sayı, ilk üzv, göstərmək üçün ən yüksək status
function orderFields(persons, kind) {
  const percentOf = (c) => (c ? (kind === 'room' ? c.roomPercent : c.hallPercent) : -1)
  const top = persons.map((p) => p.club).filter(Boolean).reduce((a, c) => (percentOf(c) > percentOf(a) ? c : a), null)
  return {
    people: persons.length,
    students: persons.filter((p) => p.student).length,
    userId: persons.find((p) => p.userId)?.userId ?? null,
    club: top ?? null,
  }
}

// Bitmiş seansın müddəti və məbləği (cari qiymətlərlə). Nəfərlər varsa — hər nəfərin payı da.
async function closing(startedAt, endedAt, visit) {
  if (endedAt <= startedAt) {
    throw new HttpError(400, 'VALIDATION', 'Bitmə vaxtı başlama vaxtından sonra olmalıdır.', {
      fields: { endedAt: 'Bitmə vaxtı başlama vaxtından sonra olmalıdır.' },
    })
  }
  const pricing = await getPricing()
  const minutes = visitMinutes(startedAt, endedAt)
  const price = visitPrice(pricing, minutes, visit)
  return { data: { endedAt, minutes, amount: price.amount }, shares: price.persons ?? null }
}

// "Nağd + kart" (split): nağd hissə 0 ilə ödəniləcək məbləğ arasında olmalıdır, qalanı kartla.
// Hamısı nağd yazılıbsa — ödəniş "nağd", 0 yazılıbsa — "kart" kimi saxlanır. → { method, cash }
const round2 = (n) => Math.round(n * 100) / 100
function settle(method, cash, due, who = '') {
  if (method !== 'split') return { method, cash: null }
  const fail = (message) => {
    throw new HttpError(400, 'VALIDATION', who + message, { fields: { cashAmount: who + message } })
  }
  if (cash == null || Number.isNaN(Number(cash))) fail('Nağd hissəni yaz.')
  const c = round2(Number(cash))
  const total = round2(Math.max(0, due))
  if (c < 0 || c > total) fail(`Nağd hissə 0 ilə ${total}₼ arasında olmalıdır (qalanı kartla).`)
  if (c === 0) return { method: 'card', cash: null }
  if (c === total) return { method: 'cash', cash: null }
  return { method: 'split', cash: c }
}

// Ödəniş üsulu: hamısı eynidirsə — o, yoxsa "mixed" (qarışıq)
const commonMethod = (methods) => (methods.every((m) => m === methods[0]) ? methods[0] : 'mixed')

// Xüsusi endirim → bazadakı sahələr (null — endirim yoxdur)
const discountFields = (discount) => ({ discountType: discount?.type ?? null, discountValue: discount?.value ?? null })
// Beh → bazadakı sahələr (null — beh yoxdur)
const depositFields = (deposit) => ({ deposit: deposit?.amount ?? null, depositMethod: deposit?.method ?? null })

async function findVisit(id) {
  const visit = await prisma.visit.findUnique({ where: { id }, include: { persons: { orderBy: { position: 'asc' } } } })
  if (!visit) throw new HttpError(404, 'NOT_FOUND', 'Seans tapılmadı.')
  return visit
}

const loadVisit = (id) => prisma.visit.findUnique({ where: { id }, include: withUser })

// Bir günün seansları + yekun. Davam edən seansların məbləğini klient canlı hesablayır.
adminVisitsRouter.get('/visits', async (req, res) => {
  const today = bakuDay()
  const { day = today } = visitListQuerySchema.parse(req.query)
  const visits = await prisma.visit.findMany({ where: { day }, orderBy: { startedAt: 'asc' }, include: withUser })
  res.json({ day, today, visits: visits.map(publicVisit) })
})

// Tarixçə: qeyd olan günlər (yenidən köhnəyə) — müştəri sayı (nəfərlərin cəmi), bitmiş seansların cəmi, nağd və kart ayrıca
// Beh öz üsulunda, qalıq (və ya hər nəfərin payı) seçilən üsulda sayılır (paymentSplit)
adminVisitsRouter.get('/visits/days', async (req, res) => {
  const rows = await prisma.visit.findMany({
    select: {
      day: true,
      people: true,
      amount: true,
      endedAt: true,
      paymentMethod: true,
      deposit: true,
      depositMethod: true,
      cashAmount: true,
      persons: { select: { amount: true, paymentMethod: true, cashAmount: true }, orderBy: { position: 'asc' } },
    },
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
  const body = visitCreateSchema.parse(req.body)
  const { name, kind = 'hall', promoCode, discount, deposit, startedAt = new Date(), note } = body
  const promo = promoCode ? await promoFor(promoCode) : {}
  if (!body.persons) studentsFor({ kind, people: body.people ?? 1, students: body.students ?? 0 })
  const list = (body.persons ?? legacyPersons(body)).map((p) => ({
    userId: p.userId ?? null,
    student: kind !== 'room' && Boolean(p.student),
    spinId: p.spinId ?? null,
  }))
  assertNotFuture(startedAt, 'startedAt', 'Başlama vaxtı')
  if (kind === 'room') await assertRoom({ people: list.length })

  const members = await loadMembers(list)
  await assertMembersFree([...members.keys()])
  // DırDır Club: hər üzvün indiki statusu və endirimi onun sətrinə yazılır
  const persons = []
  for (const p of list) {
    persons.push({
      ...p,
      club: p.userId ? await clubSnapshot(p.userId) : null,
      gift: p.spinId ? await giftFor(p.spinId, p.userId) : null,
    })
  }

  const firstMember = persons.find((p) => p.userId)
  const customerName = name || (firstMember ? fullName(members.get(firstMember.userId)) : 'Qonaq')
  const order = orderFields(persons, kind)

  const visit = await prisma.visit.create({
    data: {
      day: bakuDay(startedAt),
      name: customerName,
      kind,
      ...order,
      club: order.club ?? undefined,
      ...promo,
      ...discountFields(discount),
      ...depositFields(deposit),
      startedAt,
      note: note || null,
      createdById: req.user.id,
      persons: {
        create: persons.map((p, i) => ({
          position: i,
          userId: p.userId,
          student: p.student,
          club: p.club ?? undefined,
          spinId: p.spinId,
          gift: p.gift ?? undefined,
        })),
      },
    },
    include: withUser,
  })
  res.status(201).json({ visit: publicVisit(visit) })
})

// Seansı bitir: indiki vaxtla, məbləğ cari qiymətlərlə hesablanır.
// Ödəniş: paymentMethod — hamısı üçün; payments — { nəfərinId: "cash" | "card" } hər nəfərə ayrıca.
adminVisitsRouter.post('/visits/:id/end', async (req, res) => {
  const { paymentMethod, payments = {}, cashAmount, cashAmounts = {} } = visitEndSchema.parse(req.body ?? {})
  const visit = await findVisit(req.params.id)
  if (visit.endedAt) throw new HttpError(409, 'VISIT_ENDED', 'Bu seans artıq bitib.')
  const { data, shares } = await closing(visit.startedAt, new Date(), visit)

  if (!visit.persons.length) {
    if (!paymentMethod) throw new HttpError(400, 'VALIDATION', 'Ödəniş üsulunu seç: nağd və ya kart.', { fields: { paymentMethod: 'Ödəniş üsulunu seç.' } })
    const pay = settle(paymentMethod, cashAmount, data.amount - Number(visit.deposit ?? 0))
    await prisma.visit.update({ where: { id: visit.id }, data: { ...data, paymentMethod: pay.method, cashAmount: pay.cash } })
  } else {
    let methods = visit.persons.map((p) => payments[p.id] ?? paymentMethod)
    if (methods.some((m) => !m)) {
      throw new HttpError(400, 'VALIDATION', 'Hər nəfər üçün ödəniş üsulunu seç: nağd və ya kart.', { fields: { payments: 'Hər nəfər üçün ödəniş üsulunu seç.' } })
    }
    const deposit = Number(visit.deposit ?? 0)
    const dues = visit.persons.map((p, i) => round2(shares[i].share - (i === 0 ? deposit : 0)))
    let cash
    let orderCash = null
    if (paymentMethod === 'split' && Object.keys(payments).length === 0 && visit.persons.length > 1) {
      // Bütün sifariş üçün bir "nağd + kart": nəfərlərə bölünmür — sifarişdə ümumi nağd hissə saxlanır,
      // qalanı kart (hamısı nağd / 0 — sadəcə "nağd" / "kart")
      const pay = settle('split', cashAmount, round2(dues.reduce((s, d) => s + d, 0)))
      orderCash = pay.cash
      methods = visit.persons.map(() => (pay.method === 'split' ? null : pay.method))
      cash = visit.persons.map(() => null)
    } else {
      const settled = visit.persons.map((p, i) => settle(methods[i], cashAmounts[p.id] ?? cashAmount, dues[i], `${i + 1}-ci nəfər: `))
      methods = settled.map((x) => x.method)
      cash = settled.map((x) => x.cash)
    }
    await prisma.$transaction(async (tx) => {
      await tx.visit.update({
        where: { id: visit.id },
        data: { ...data, paymentMethod: orderCash != null ? 'split' : commonMethod(methods), cashAmount: orderCash },
      })
      for (const [i, p] of visit.persons.entries()) {
        await tx.visitPerson.update({
          where: { id: p.id },
          data: { amount: shares[i].share, discount: shares[i].discount, paymentMethod: methods[i], cashAmount: cash[i] },
        })
      }
      // Hədiyyələr indi "istifadə olunub"
      await syncSpins(tx, visit.persons.map((p) => p.spinId), req.user.id)
    })
  }
  res.json({ visit: publicVisit(await loadVisit(visit.id)) })
})

// Səhv düzəltmək: ad, növ, nəfərlər, endirimlər, qeyd, başlama/bitmə vaxtı, ödəniş üsulları.
// Bitmiş seansda məbləğ (və hər nəfərin payı) yenidən hesablanır.
adminVisitsRouter.patch('/visits/:id', async (req, res) => {
  const body = visitUpdateSchema.parse(req.body)
  const { name, kind, people, students, promoCode, discount, deposit, startedAt, endedAt, note, paymentMethod, payments, cashAmount, cashAmounts } = body
  const visit = await findVisit(req.params.id)
  if ((endedAt || paymentMethod || payments) && !visit.endedAt) {
    throw new HttpError(400, 'VALIDATION', 'Seansı bitirmək üçün "Bitir" düyməsini işlət.')
  }
  // Davam edən seansın yeri (zal ↔ kino otağı) dəyişmir; bitmiş seansda səhv düzəltmək üçün olar
  if (kind && kind !== visit.kind && !visit.endedAt) {
    throw new HttpError(400, 'VALIDATION', 'Davam edən seansın yerini dəyişmək olmaz.', {
      fields: { kind: 'Davam edən seansın yerini dəyişmək olmaz.' },
    })
  }
  const nextKind = kind ?? visit.kind
  // Promokod: null — sil; eyni kod — olduğu kimi qalır (vaxtı keçmiş olsa da); yeni kod — yoxlanır
  let promo = { promoCode: visit.promoCode, promoPercent: visit.promoPercent }
  const promoChanged = promoCode !== undefined && promoCode !== visit.promoCode
  if (promoChanged) promo = promoCode ? await promoFor(promoCode) : { promoCode: null, promoPercent: null }

  // Nəfərlər: yeni siyahı göndərilibsə — köhnələri yenilənir/silinir, yeniləri əlavə olunur
  const grouped = visit.persons.length > 0 || Boolean(body.persons)
  let nextPersons = visit.persons
  if (body.persons) {
    const existing = new Map(visit.persons.map((p) => [p.id, p]))
    for (const p of body.persons) {
      if (p.id && !existing.has(p.id)) throw new HttpError(400, 'VALIDATION', 'Nəfər bu seansa aid deyil.')
    }
    const members = await loadMembers(body.persons)
    const added = body.persons.filter((p) => !p.id && p.userId).map((p) => p.userId)
    if (!visit.endedAt) await assertMembersFree(added, visit.id)
    nextPersons = []
    for (const p of body.persons) {
      const old = p.id ? existing.get(p.id) : null
      const sameMember = old && (old.userId ?? null) === (p.userId ?? null)
      // Hədiyyə: yazılmayıbsa — köhnəsi qalır (eyni üzvdürsə), null — götürülür, id — yoxlanıb tətbiq olunur
      const spinId = p.spinId !== undefined ? p.spinId : sameMember ? (old.spinId ?? null) : null
      const keepGift = sameMember && spinId && spinId === old.spinId
      nextPersons.push({
        spinId,
        gift: !spinId ? null : keepGift ? old.gift : await giftFor(spinId, p.userId ?? null, visit.id),
        id: sameMember ? old.id : null,
        userId: p.userId ?? null,
        student: nextKind !== 'room' && Boolean(p.student),
        club: sameMember ? old.club : p.userId && members.has(p.userId) ? await clubSnapshot(p.userId) : null,
        paymentMethod: sameMember ? old.paymentMethod : null,
      })
    }
    if (nextPersons.length === 0) throw new HttpError(400, 'VALIDATION', 'Sifarişdə ən az bir nəfər olmalıdır.')
  } else if (grouped && (people !== undefined || students !== undefined || kind === 'room')) {
    // Köhnə forma (nəfər sayı / tələbə sayı) — nəfərlərə çevrilir: say artanda qonaq əlavə olunur,
    // azalanda əvvəlcə sondakı qonaqlar çıxır; tələbə sayı — ilk N nəfər tələbə
    nextPersons = visit.persons.map((p) => ({ ...p }))
    const target = people ?? nextPersons.length
    while (nextPersons.length < target) nextPersons.push({ id: null, userId: null, student: false, club: null, paymentMethod: null, spinId: null, gift: null })
    while (nextPersons.length > target) {
      const guest = nextPersons.findLastIndex((p) => !p.userId)
      nextPersons.splice(guest >= 0 ? guest : nextPersons.length - 1, 1)
    }
    if (students !== undefined) {
      studentsFor({ kind: nextKind, people: nextPersons.length, students })
      nextPersons = nextPersons.map((p, i) => ({ ...p, student: i < students }))
    }
    if (nextKind === 'room') nextPersons = nextPersons.map((p) => ({ ...p, student: false }))
  }
  const personsChanged = Boolean(body.persons) || (grouped && (people !== undefined || students !== undefined || kind === 'room'))

  const nextPeople = grouped ? nextPersons.length : (people ?? visit.people)
  const nextStudents = grouped ? null : studentsFor({ kind: nextKind, people: nextPeople, students: students ?? visit.students })
  // Bitmiş seansda otağın məşğulluğu yoxlanmır — yalnız tutum
  if (nextKind === 'room' && (kind || people || body.persons)) {
    await assertRoom({ people: nextPeople, exceptId: visit.id, checkBusy: !visit.endedAt })
  }

  const data = {}
  if (name !== undefined) data.name = name
  if (note !== undefined) data.note = note || null
  if (kind) data.kind = kind
  if (grouped) {
    const order = orderFields(nextPersons, nextKind)
    Object.assign(data, order, { club: order.club ?? Prisma.DbNull })
  } else {
    if (people !== undefined) data.people = people
    if (nextStudents !== visit.students) data.students = nextStudents
  }
  if (promoChanged) Object.assign(data, promo)
  // Xüsusi endirim: göndərilməyibsa — olduğu kimi qalır
  const nextDiscount =
    discount !== undefined ? discountFields(discount) : { discountType: visit.discountType, discountValue: visit.discountValue }
  if (discount !== undefined) Object.assign(data, nextDiscount)
  // Beh məbləği dəyişmir — yalnız nağd/kart bölgüsünü dəyişir
  if (deposit !== undefined) Object.assign(data, depositFields(deposit))
  if (startedAt) {
    assertNotFuture(startedAt, 'startedAt', 'Başlama vaxtı')
    data.startedAt = startedAt
    data.day = bakuDay(startedAt)
  }
  if (endedAt) assertNotFuture(endedAt, 'endedAt', 'Bitmə vaxtı')

  // Sifariş ümumi "nağd + kart" ilə ödənilib (və ya indi belə seçilir) — nəfərlərə bölünmür
  const orderSplit =
    Boolean(visit.endedAt) &&
    grouped &&
    !(payments && Object.keys(payments).length) &&
    (paymentMethod === 'split' || (!paymentMethod && visit.paymentMethod === 'split' && visit.cashAmount != null))

  // Bitmiş seansın ödəniş üsulları: paymentMethod — hamısı, payments — hər nəfərə ayrıca;
  // yeni əlavə olunan nəfər birincinin üsulunu alır
  if (orderSplit) {
    nextPersons = nextPersons.map((p) => ({ ...p, paymentMethod: null, cashAmount: null }))
    data.paymentMethod = 'split'
  } else if (visit.endedAt && grouped) {
    nextPersons = nextPersons.map((p) => ({
      ...p,
      paymentMethod: (p.id && payments?.[p.id]) ?? paymentMethod ?? p.paymentMethod ?? nextPersons[0].paymentMethod ?? visit.paymentMethod,
      // split-in nağd hissəsi: göndərilibsə — yeni, yoxsa köhnəsi (eyni nəfər); aşağıda yoxlanır
      cashAmount: (p.id && cashAmounts?.[p.id]) ?? cashAmount ?? (p.id ? (visit.persons.find((o) => o.id === p.id)?.cashAmount ?? null) : null),
    }))
    data.paymentMethod = commonMethod(nextPersons.map((p) => p.paymentMethod))
  } else if (paymentMethod) {
    data.paymentMethod = paymentMethod
  }

  let shares = null
  const changed = startedAt || endedAt || people || kind || students !== undefined || promoChanged || discount !== undefined || personsChanged
  if (visit.endedAt && changed) {
    const result = await closing(startedAt ?? visit.startedAt, endedAt ?? visit.endedAt, {
      people: nextPeople,
      kind: nextKind,
      students: nextStudents ?? 0,
      promoPercent: promo.promoPercent,
      ...nextDiscount,
      club: visit.club,
      persons: grouped ? nextPersons : null,
    })
    Object.assign(data, result.data)
    shares = result.shares
  }

  // Bitmiş seansda nağd hissə (split) yenidən yoxlanır — məbləğ dəyişmiş ola bilər
  if (visit.endedAt) {
    const finalAmount = Number(data.amount ?? visit.amount ?? 0)
    const finalDeposit = Number(deposit !== undefined ? (deposit?.amount ?? 0) : (visit.deposit ?? 0))
    if (orderSplit) {
      const cash = cashAmount ?? (visit.cashAmount == null ? null : Number(visit.cashAmount))
      const pay = settle('split', cash, finalAmount - finalDeposit)
      data.paymentMethod = pay.method
      data.cashAmount = pay.cash
      if (pay.method !== 'split') nextPersons = nextPersons.map((p) => ({ ...p, paymentMethod: pay.method }))
    } else if (grouped) {
      data.cashAmount = null
      nextPersons = nextPersons.map((p, i) => {
        const share = shares ? shares[i].share : Number(visit.persons.find((o) => o.id === p.id)?.amount ?? 0)
        const pay = settle(p.paymentMethod, p.cashAmount == null ? null : Number(p.cashAmount), share - (i === 0 ? finalDeposit : 0), `${i + 1}-ci nəfər: `)
        return { ...p, paymentMethod: pay.method, cashAmount: pay.cash }
      })
      data.paymentMethod = commonMethod(nextPersons.map((p) => p.paymentMethod))
    } else {
      const method = data.paymentMethod ?? visit.paymentMethod
      const cash = cashAmount ?? (visit.cashAmount == null ? null : Number(visit.cashAmount))
      const pay = settle(method, cash, finalAmount - finalDeposit)
      if (pay.method) data.paymentMethod = pay.method
      data.cashAmount = pay.cash
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.visit.update({ where: { id: visit.id }, data })
    if (!grouped) return
    const keep = new Set(nextPersons.map((p) => p.id).filter(Boolean))
    await tx.visitPerson.deleteMany({ where: { visitId: visit.id, id: { notIn: [...keep] } } })
    // Hədiyyələr əvvəlcə köhnə nəfərlərdən ayrılır (eyni hədiyyə başqa nəfərə keçə bilsin)
    const spinIds = [...visit.persons.map((p) => p.spinId), ...nextPersons.map((p) => p.spinId)]
    await tx.visitPerson.updateMany({ where: { visitId: visit.id, spinId: { not: null } }, data: { spinId: null } })
    for (const [i, p] of nextPersons.entries()) {
      const fields = {
        position: i,
        student: p.student,
        spinId: p.spinId ?? null,
        gift: p.gift ?? Prisma.DbNull,
        paymentMethod: visit.endedAt ? p.paymentMethod : null,
        cashAmount: visit.endedAt ? (p.cashAmount ?? null) : null,
        ...(shares ? { amount: shares[i].share, discount: shares[i].discount } : {}),
      }
      if (p.id) await tx.visitPerson.update({ where: { id: p.id }, data: fields })
      else await tx.visitPerson.create({ data: { ...fields, visitId: visit.id, userId: p.userId, club: p.club ?? undefined } })
    }
    await syncSpins(tx, spinIds, req.user.id)
  })
  res.json({ visit: publicVisit(await loadVisit(visit.id)) })
})

// Bitmiş seansı yenidən davam etdir (səhvən "Bitir" basılıbsa)
adminVisitsRouter.post('/visits/:id/resume', async (req, res) => {
  const visit = await findVisit(req.params.id)
  if (!visit.endedAt) throw new HttpError(409, 'VISIT_ACTIVE', 'Bu seans onsuz da davam edir.')
  const memberIds = [...new Set([visit.userId, ...visit.persons.map((p) => p.userId)].filter(Boolean))]
  await assertMembersFree(memberIds, visit.id)
  if (visit.kind === 'room') await assertRoom({ people: visit.people })
  await prisma.$transaction(async (tx) => {
    await tx.visit.update({ where: { id: visit.id }, data: { endedAt: null, minutes: null, amount: null, paymentMethod: null, cashAmount: null } })
    await tx.visitPerson.updateMany({ where: { visitId: visit.id }, data: { amount: null, discount: null, paymentMethod: null, cashAmount: null } })
    // Hədiyyələr yenidən gözləyir — sifariş bitəndə istifadə olunacaq
    await syncSpins(tx, visit.persons.map((p) => p.spinId), req.user.id)
  })
  res.json({ visit: publicVisit(await loadVisit(visit.id)) })
})

adminVisitsRouter.delete('/visits/:id', async (req, res) => {
  const visit = await findVisit(req.params.id)
  // Silinən sifarişin hədiyyələri müştəriyə qayıdır
  await prisma.$transaction(async (tx) => {
    await tx.visit.delete({ where: { id: visit.id } })
    await syncSpins(tx, visit.persons.map((p) => p.spinId), req.user.id)
  })
  res.status(204).end()
})
