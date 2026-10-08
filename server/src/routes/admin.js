import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireAdmin, publicUser, hashPassword } from '../auth.js'
import { assertUnique } from './auth.js'
import { HttpError } from '../middleware/error.js'
import { processImage, rawImage, imageUrl } from '../images.js'
import { TEAM_ORDER } from './competitions.js'
import { publicSlide } from './slides.js'
import { getPricing, savePricing, DEFAULT_PRICING } from '../pricing.js'
import {
  pointsSchema,
  userListQuerySchema,
  userAdminCreateSchema,
  userAdminUpdateSchema,
  promoCreateSchema,
  promoUpdateSchema,
  competitionCreateSchema,
  competitionUpdateSchema,
  slideCreateSchema,
  slideUpdateSchema,
  slideOrderSchema,
} from '../validation.js'

export const adminRouter = Router()
adminRouter.use(requireAuth, requireAdmin)

// ---------- İstifadəçilər ----------

// Telefon bazada 9 rəqəmlə saxlanır — axtarışda da 994 və başdakı 0-ı atırıq.
const phoneDigits = (q) => q.replace(/\D/g, '').replace(/^994/, '').replace(/^0/, '')

const USER_SORT = {
  new: [{ createdAt: 'desc' }],
  old: [{ createdAt: 'asc' }],
  name: [{ firstName: 'asc' }, { lastName: 'asc' }],
}

// Axtarış: "Aysel Məm" kimi bir neçə söz — hər söz ad, soyad, email və ya telefonda olmalıdır.
function userSearchWhere(q) {
  const words = q.split(/\s+/).filter(Boolean)
  return words.map((word) => {
    // Telefonla yalnız rəqəmli sözdə axtarırıq ("user1"-dəki 1 bütün nömrələrə uyğun gəlməsin)
    const digits = /^[+\d()-]+$/.test(word) ? phoneDigits(word) : ''
    return {
      OR: [
        { firstName: { contains: word, mode: 'insensitive' } },
        { lastName: { contains: word, mode: 'insensitive' } },
        { email: { contains: word, mode: 'insensitive' } },
        ...(digits ? [{ phone: { contains: digits } }] : []),
      ],
    }
  })
}

const adminUser = (u) => ({ ...publicUser(u), blockedAt: u.blockedAt, teamCount: u._count?.teams ?? 0 })

adminRouter.get('/users', async (req, res) => {
  const { q, role, status, joined, newsletter, competitionId, sort, limit, offset } = userListQuerySchema.parse(req.query)
  const and = q ? userSearchWhere(q) : []
  if (role) and.push({ role })
  if (status === 'blocked') and.push({ blockedAt: { not: null } })
  if (status === 'active') and.push({ blockedAt: null })
  if (joined === 'yes') and.push({ teams: { some: {} } })
  if (joined === 'no') and.push({ teams: { none: {} } })
  if (competitionId) and.push({ teams: { some: { competitionId } } })
  if (newsletter) and.push({ newsletter: newsletter === 'yes' })
  const where = and.length ? { AND: and } : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: USER_SORT[sort],
      skip: offset,
      take: limit,
      include: { _count: { select: { teams: true } } },
    }),
    prisma.user.count({ where }),
  ])
  res.json({ users: users.map(adminUser), total })
})

// Bir istifadəçi: profil + qoşulduğu yarışlar
adminRouter.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      _count: { select: { teams: true } },
      teams: {
        orderBy: { createdAt: 'desc' },
        include: { competition: { select: { id: true, title: true, status: true, startsAt: true } } },
      },
    },
  })
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'İstifadəçi tapılmadı.')
  res.json({
    user: adminUser(user),
    teams: user.teams.map((t) => ({ id: t.id, name: t.name, points: t.points, competition: t.competition })),
  })
})

// Yeni hesab: admin işçi üçün hesab aça bilər (rol: USER və ya ADMIN).
adminRouter.post('/users', async (req, res) => {
  const data = userAdminCreateSchema.parse(req.body)
  await assertUnique(data)
  const { password, ...rest } = data
  const user = await prisma.user.create({
    data: { ...rest, passwordHash: await hashPassword(password) },
    include: { _count: { select: { teams: true } } },
  })
  res.status(201).json({ user: adminUser(user) })
})

// Qaydalar (panelə giriş itməsin deyə):
// - admin öz rolunu dəyişə, özünü bloklaya və silə bilməz — deməli ən azı bir admin həmişə qalır;
// - başqa admini bloklamaq/silmək üçün əvvəl adminlikdən çıxarmaq lazımdır.
async function findOtherUser(id, me) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'İstifadəçi tapılmadı.')
  if (user.id === me.id) throw new HttpError(400, 'CANNOT_MODIFY_SELF', 'Öz hesabını buradan dəyişə bilməzsən.')
  return user
}

const assertNotAdmin = (role) => {
  if (role === 'ADMIN') {
    throw new HttpError(400, 'CANNOT_MODIFY_ADMIN', 'Admini bloklamaq və ya silmək olmaz — əvvəl adminlikdən çıxar.')
  }
}

adminRouter.patch('/users/:id', async (req, res) => {
  const { blocked, role } = userAdminUpdateSchema.parse(req.body)
  const current = await findOtherUser(req.params.id, req.user)
  const nextRole = role ?? current.role
  if (blocked) assertNotAdmin(nextRole)

  const data = {}
  if (role) data.role = role
  // Admin bloklu ola bilməz; təkrar bloklananda ilk blok tarixi saxlanır
  if (nextRole === 'ADMIN') data.blockedAt = null
  else if (blocked !== undefined) data.blockedAt = blocked ? (current.blockedAt ?? new Date()) : null

  const user = await prisma.user.update({
    where: { id: current.id },
    data,
    include: { _count: { select: { teams: true } } },
  })
  res.json({ user: adminUser(user) })
})

// Hesabı tam silir: komandaları da (Cascade) — yarış lövhələrindən çıxır. Profil şəkli də silinir.
adminRouter.delete('/users/:id', async (req, res) => {
  const user = await findOtherUser(req.params.id, req.user)
  assertNotAdmin(user.role)
  await prisma.$transaction(async (tx) => {
    await tx.user.delete({ where: { id: user.id } })
    if (user.avatarId) await tx.image.delete({ where: { id: user.avatarId } })
  })
  res.status(204).end()
})

// ---------- Qiymətlər ----------

adminRouter.get('/pricing', async (req, res) => {
  res.json({ pricing: await getPricing(), defaults: DEFAULT_PRICING })
})

adminRouter.put('/pricing', async (req, res) => {
  res.json({ pricing: await savePricing(req.body) })
})

// ---------- Şəkillər ----------
// Slayd şəkli əvvəl yüklənir (fayl özü, Content-Type: image/*), sonra id-si slayda bağlanır.
adminRouter.post('/images', rawImage, async (req, res) => {
  const image = await prisma.image.create({ data: await processImage(req.body, 'slide') })
  res.status(201).json({ image: { id: image.id, url: imageUrl(image.id), width: image.width, height: image.height } })
})

// ---------- Slider ----------

adminRouter.get('/slides', async (req, res) => {
  const slides = await prisma.slide.findMany({ orderBy: { position: 'asc' } })
  res.json({ slides: slides.map((s) => publicSlide(s, { withBody: true })) })
})

// Şəkil heç yerdə işlənmir (və ya yalnız `except` id-li slayd/oyunda işlənir)
const assertFreeImage = async (imageId, except) => {
  const image = await prisma.image.findUnique({ where: { id: imageId }, include: { slide: true, game: true, user: true } })
  if (!image) throw new HttpError(400, 'IMAGE_INVALID', 'Şəkil tapılmadı, yenidən yüklə.')
  if (image.user || (image.slide && image.slide.id !== except) || (image.game && image.game.id !== except)) {
    throw new HttpError(400, 'IMAGE_INVALID', 'Bu şəkil artıq istifadə olunur, yenisini yüklə.')
  }
}

adminRouter.post('/slides', async (req, res) => {
  const data = slideCreateSchema.parse(req.body)
  await assertFreeImage(data.imageId)
  const last = await prisma.slide.aggregate({ _max: { position: true } })
  const slide = await prisma.slide.create({ data: { ...data, position: (last._max.position ?? -1) + 1 } })
  res.status(201).json({ slide: publicSlide(slide, { withBody: true }) })
})

adminRouter.patch('/slides/:id', async (req, res) => {
  const data = slideUpdateSchema.parse(req.body)
  const current = await prisma.slide.findUnique({ where: { id: req.params.id } })
  if (!current) throw new HttpError(404, 'NOT_FOUND', 'Slayd tapılmadı.')
  if (data.imageId && data.imageId !== current.imageId) await assertFreeImage(data.imageId, current.id)

  const slide = await prisma.$transaction(async (tx) => {
    const updated = await tx.slide.update({ where: { id: current.id }, data })
    // Şəkil əvəz olunubsa, köhnəsini bazada saxlamırıq.
    if (data.imageId && data.imageId !== current.imageId) await tx.image.delete({ where: { id: current.imageId } })
    return updated
  })
  res.json({ slide: publicSlide(slide, { withBody: true }) })
})

adminRouter.delete('/slides/:id', async (req, res) => {
  await prisma.$transaction(async (tx) => {
    const slide = await tx.slide.delete({ where: { id: req.params.id } })
    await tx.image.delete({ where: { id: slide.imageId } })
  })
  res.status(204).end()
})

// Bütün slaydların yeni sırası: { ids: [birinci, ikinci, ...] }
adminRouter.put('/slides/order', async (req, res) => {
  const { ids } = slideOrderSchema.parse(req.body)
  const existing = await prisma.slide.findMany({ select: { id: true } })
  const known = new Set(existing.map((s) => s.id))
  if (ids.length !== known.size || new Set(ids).size !== ids.length || !ids.every((id) => known.has(id))) {
    throw new HttpError(400, 'VALIDATION', 'Sıra siyahısı bütün slaydları bir dəfə ehtiva etməlidir.')
  }
  await prisma.$transaction(ids.map((id, position) => prisma.slide.update({ where: { id }, data: { position } })))
  const slides = await prisma.slide.findMany({ orderBy: { position: 'asc' } })
  res.json({ slides: slides.map((s) => publicSlide(s, { withBody: true })) })
})

// ---------- Yarışlar və komandalar ----------

adminRouter.get('/competitions', async (req, res) => {
  const competitions = await prisma.competition.findMany({
    orderBy: { startsAt: 'desc' },
    include: { _count: { select: { teams: true } } },
  })
  res.json({ competitions: competitions.map(({ _count, ...c }) => ({ ...c, teamCount: _count.teams })) })
})

adminRouter.post('/competitions', async (req, res) => {
  const competition = await prisma.competition.create({ data: competitionCreateSchema.parse(req.body) })
  res.status(201).json({ competition: { ...competition, teamCount: 0 } })
})

adminRouter.patch('/competitions/:id', async (req, res) => {
  const competition = await prisma.competition.update({
    where: { id: req.params.id },
    data: competitionUpdateSchema.parse(req.body),
    include: { _count: { select: { teams: true } } },
  })
  const { _count, ...c } = competition
  res.json({ competition: { ...c, teamCount: _count.teams } })
})

adminRouter.delete('/competitions/:id', async (req, res) => {
  await prisma.competition.delete({ where: { id: req.params.id } }) // komandalar da silinir (Cascade)
  res.status(204).end()
})

// Adminə komandanı kimin qeydiyyat etdiyi də görünür (əlaqə saxlamaq üçün).
adminRouter.get('/competitions/:id/teams', async (req, res) => {
  const teams = await prisma.team.findMany({
    where: { competitionId: req.params.id },
    orderBy: TEAM_ORDER,
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, blockedAt: true } } },
  })
  res.json({ teams: teams.map((t, i) => ({ rank: i + 1, id: t.id, name: t.name, points: t.points, createdAt: t.createdAt, user: t.user })) })
})

// Xal ver (+) və ya çıx (−). Komandanın xalı 0-dan aşağı düşə bilməz.
adminRouter.post('/teams/:id/points', async (req, res) => {
  const { amount, reason } = pointsSchema.parse(req.body)

  const team = await prisma.$transaction(async (tx) => {
    // Sətri kilidləyirik ki, eyni anda iki dəyişiklik bir-birini əzməsin.
    const [locked] = await tx.$queryRaw`SELECT points FROM "Team" WHERE id = ${req.params.id} FOR UPDATE`
    if (!locked) throw new HttpError(404, 'NOT_FOUND', 'Komanda tapılmadı.')
    if (locked.points + amount < 0) {
      throw new HttpError(400, 'NEGATIVE_POINTS', `Komandanın cəmi ${locked.points} xalı var, bu qədər çıxmaq olmaz.`, {
        fields: { amount: 'Xal 0-dan aşağı düşə bilməz.' },
      })
    }
    await tx.teamPointEntry.create({ data: { teamId: req.params.id, amount, reason, createdById: req.user.id } })
    return tx.team.update({ where: { id: req.params.id }, data: { points: { increment: amount } } })
  })

  res.status(201).json({ team: { id: team.id, name: team.name, points: team.points } })
})

adminRouter.get('/teams/:id/points', async (req, res) => {
  const entries = await prisma.teamPointEntry.findMany({
    where: { teamId: req.params.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  })
  res.json({ entries })
})

adminRouter.delete('/teams/:id', async (req, res) => {
  await prisma.team.delete({ where: { id: req.params.id } })
  res.status(204).end()
})

// ---------- Promokodlar ----------

const promoConflict = (err) => {
  if (err.code === 'P2002')
    throw new HttpError(409, 'CONFLICT', 'Bu kod artıq var.', { fields: { code: 'Bu kod artıq var.' } })
  throw err
}

adminRouter.get('/promo-codes', async (req, res) => {
  const promoCodes = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } })
  res.json({ promoCodes })
})

adminRouter.post('/promo-codes', async (req, res) => {
  const data = promoCreateSchema.parse(req.body)
  const promoCode = await prisma.promoCode.create({ data }).catch(promoConflict)
  res.status(201).json({ promoCode })
})

adminRouter.patch('/promo-codes/:id', async (req, res) => {
  const data = promoUpdateSchema.parse(req.body)
  const promoCode = await prisma.promoCode.update({ where: { id: req.params.id }, data }).catch(promoConflict)
  res.json({ promoCode })
})

adminRouter.delete('/promo-codes/:id', async (req, res) => {
  await prisma.promoCode.delete({ where: { id: req.params.id } })
  res.status(204).end()
})
