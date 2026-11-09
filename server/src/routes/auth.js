import { Router } from 'express'
import { prisma } from '../db.js'
import {
  hashPassword,
  verifyPassword,
  burnPasswordCheck,
  signToken,
  passwordChangeMoment,
  publicUser,
  requireAuth,
} from '../auth.js'
import { HttpError } from '../middleware/error.js'
import {
  registerRequestSchema,
  registerVerifySchema,
  registerResendSchema,
  passwordForgotSchema,
  passwordResetSchema,
  loginSchema,
  profileUpdateSchema,
  passwordChangeSchema,
  emailChangeSchema,
} from '../validation.js'
import { canSendCodes } from '../mail.js'
import { issueCode, checkCode, consumeCodes, latestCode, assertCanResend } from '../emailCodes.js'
import { processImage, rawImage } from '../images.js'
import { teamRank } from './competitions.js'
import { publicVisit } from '../visits.js'

export const authRouter = Router()

// Email/telefon başqa hesabdadırsa, hansı sahə olduğunu dəqiq deyirik ki, forma düzgün sahəni qırmızı göstərsin.
export async function assertUnique({ email, phone }, exceptUserId) {
  const or = [email && { email }, phone && { phone }].filter(Boolean)
  if (or.length === 0) return
  const taken = await prisma.user.findFirst({
    where: { OR: or, ...(exceptUserId ? { NOT: { id: exceptUserId } } : {}) },
    select: { email: true, phone: true },
  })
  if (!taken) return
  const fields = {}
  const fieldCodes = {}
  if (email && taken.email === email) {
    fields.email = 'Bu email ilə artıq hesab var.'
    fieldCodes.email = 'EMAIL_TAKEN'
  }
  if (phone && taken.phone === phone) {
    fields.phone = 'Bu nömrə ilə artıq hesab var.'
    fieldCodes.phone = 'PHONE_TAKEN'
  }
  throw new HttpError(409, 'ACCOUNT_EXISTS', 'Bu məlumatlarla artıq hesab var.', { fields, fieldCodes })
}

// Qeydiyyat iki addımdır: forma → emailə 6 rəqəmli kod → kod təsdiqlənəndə hesab yaranır.
// Email göndərmə qurulmayıbsa (canlıda RESEND_API_KEY yoxdur), hesab əvvəlki kimi dərhal yaranır.
authRouter.post('/register', async (req, res) => {
  const { lang, ...data } = registerRequestSchema.parse(req.body)
  await assertUnique(data)

  const { password, ...rest } = data
  const passwordHash = await hashPassword(password)
  if (!canSendCodes()) {
    const user = await prisma.user.create({ data: { ...rest, passwordHash } })
    return res.status(201).json({ token: signToken(user), user: publicUser(user) })
  }

  // Formanı təkrar göndərəndə (məs. səhv emaili düzəldib) məktub spamı olmasın
  assertCanResend(await latestCode(rest.email, 'register'))
  await issueCode({
    email: rest.email,
    purpose: 'register',
    name: rest.firstName,
    lang,
    data: { ...rest, passwordHash, lang },
  })
  res.status(202).json({ pending: true, email: rest.email })
})

// Kod düzgündürsə hesab yaranır və istifadəçi dərhal daxil olur
authRouter.post('/register/verify', async (req, res) => {
  const { email, code } = registerVerifySchema.parse(req.body)
  const record = await checkCode({ email, purpose: 'register', code })
  const { lang, passwordHash, ...rest } = record.data
  // Kod gözləyərkən bu email/telefonla başqası qeydiyyatdan keçə bilərdi
  await assertUnique({ email, phone: rest.phone })
  const user = await prisma.user.create({ data: { ...rest, email, passwordHash } })
  await consumeCodes(email, 'register')
  res.status(201).json({ token: signToken(user), user: publicUser(user) })
})

// Kod gəlməyib — yenisini göndər (eyni məlumatlarla)
authRouter.post('/register/resend', async (req, res) => {
  const { email, lang } = registerResendSchema.parse(req.body)
  const last = await latestCode(email, 'register')
  if (!last?.data) {
    throw new HttpError(400, 'CODE_EXPIRED', 'Qeydiyyatın vaxtı bitib — formanı yenidən doldur.')
  }
  assertCanResend(last)
  await issueCode({ email, purpose: 'register', name: last.data.firstName, lang, data: last.data })
  res.json({ ok: true })
})

// ---------- Şifrə bərpası ----------
// Hesabın olub-olmadığını bildirmirik: email tapılmasa da cavab eynidir (amma məktub getmir).

authRouter.post('/password/forgot', async (req, res) => {
  const { email, lang } = passwordForgotSchema.parse(req.body)
  if (!canSendCodes()) throw new HttpError(503, 'EMAIL_OFF', 'Şifrə bərpası hələ işləmir — bizə WhatsApp-dan yaz.')
  const user = await prisma.user.findUnique({ where: { email } })
  const last = await latestCode(email, 'reset')
  // Bloklanmış hesaba və tez-tez istəyə məktub getmir — cavab yenə də eynidir
  const tooSoon = last && Date.now() - last.createdAt.getTime() < 60_000
  if (user && !user.blockedAt && !tooSoon) {
    // Gözləmirik: cavabın vaxtından da hesabın olub-olmadığı bilinməsin (xəta issueCode-da loglanır)
    issueCode({ email, purpose: 'reset', name: user.firstName, lang }).catch(() => {})
  }
  res.json({ ok: true, email })
})

authRouter.post('/password/reset', async (req, res) => {
  const { email, code, newPassword } = passwordResetSchema.parse(req.body)
  await checkCode({ email, purpose: 'reset', code })
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.blockedAt) throw new HttpError(400, 'CODE_EXPIRED', 'Kodun vaxtı bitib — yeni kod istə.')
  // Şifrə dəyişir və bütün köhnə sessiyalar bağlanır (auth.js → passwordChangedAt)
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: passwordChangeMoment() },
  })
  await consumeCodes(email, 'reset')
  res.json({ token: signToken(updated), user: publicUser(updated) })
})

authRouter.post('/login', async (req, res) => {
  const { login, password } = loginSchema.parse(req.body)
  // login — { email } və ya { phone }; boş telefon heç kimə uyğun gəlmir
  const user = login.email || login.phone ? await prisma.user.findUnique({ where: login }) : null

  // Hesabın olub-olmamasını bildirmirik — hər iki halda eyni cavab və eyni vaxt.
  if (!user) await burnPasswordCheck(password)
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email/telefon və ya şifrə yanlışdır.')
  }
  // Bloku yalnız şifrə düzgün olanda bildiririk.
  if (user.blockedAt) throw new HttpError(403, 'ACCOUNT_BLOCKED', 'Hesabın bloklanıb. Ətraflı məlumat üçün bizə yaz.')
  res.json({ token: signToken(user), user: publicUser(user) })
})

// ---------- Profil ----------

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

authRouter.patch('/me', requireAuth, async (req, res) => {
  const data = profileUpdateSchema.parse(req.body)
  await assertUnique({ phone: data.phone }, req.user.id)
  const user = await prisma.user.update({ where: { id: req.user.id }, data })
  res.json({ user: publicUser(user) })
})

// Email dəyişmək (hazırkı şifrə ilə). Token dəyişmir — sessiya istifadəçinin id-si ilədir.
authRouter.post('/me/email', requireAuth, async (req, res) => {
  const { email, currentPassword } = emailChangeSchema.parse(req.body)
  if (!(await verifyPassword(currentPassword, req.user.passwordHash))) {
    throw new HttpError(400, 'WRONG_PASSWORD', 'Şifrə yanlışdır.', {
      fields: { currentPassword: 'Şifrə yanlışdır.' },
      fieldCodes: { currentPassword: 'WRONG_PASSWORD' },
    })
  }
  await assertUnique({ email }, req.user.id)
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { email } })
  res.json({ user: publicUser(user) })
})

authRouter.post('/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = passwordChangeSchema.parse(req.body)
  if (!(await verifyPassword(currentPassword, req.user.passwordHash))) {
    throw new HttpError(400, 'WRONG_PASSWORD', 'Köhnə şifrə yanlışdır.', {
      fields: { currentPassword: 'Köhnə şifrə yanlışdır.' },
      fieldCodes: { currentPassword: 'WRONG_PASSWORD' },
    })
  }
  // Digər cihazlardakı sessiyalar bağlanır; bu cihaz yeni token alır və daxil olmuş qalır.
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: passwordChangeMoment() },
  })
  res.json({ token: signToken(user) })
})

// Şəkil faylın özü göndərilir (Content-Type: image/*), JSON yox.
authRouter.put('/me/avatar', requireAuth, rawImage, async (req, res) => {
  const image = await processImage(req.body, 'avatar')
  const oldAvatarId = req.user.avatarId

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.image.create({ data: image })
    const updated = await tx.user.update({ where: { id: req.user.id }, data: { avatarId: created.id } })
    if (oldAvatarId) await tx.image.delete({ where: { id: oldAvatarId } })
    return updated
  })
  res.json({ user: publicUser(user) })
})

authRouter.delete('/me/avatar', requireAuth, async (req, res) => {
  if (req.user.avatarId) await prisma.image.delete({ where: { id: req.user.avatarId } }) // avatarId → null (SetNull)
  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  res.json({ user: publicUser(user) })
})

// Qoşulduğu yarışlar: komanda adı, xal və yeri.
authRouter.get('/me/teams', requireAuth, async (req, res) => {
  const teams = await prisma.team.findMany({
    where: { userId: req.user.id },
    include: { competition: { select: { id: true, title: true, status: true, startsAt: true } } },
    orderBy: { competition: { startsAt: 'desc' } },
  })
  const result = await Promise.all(
    teams.map(async (t) => ({
      id: t.id,
      name: t.name,
      points: t.points,
      rank: await teamRank(prisma, t),
      competition: t.competition,
    })),
  )
  res.json({ teams: result })
})

// Anticafedəki seanslarım: davam edən (varsa) + son ziyarətlər. Davam edənin məbləğini sayt canlı hesablayır.
authRouter.get('/me/visits', requireAuth, async (req, res) => {
  const visits = await prisma.visit.findMany({
    where: { userId: req.user.id },
    orderBy: { startedAt: 'desc' },
    take: 50,
  })
  const active = visits.find((v) => !v.endedAt)
  res.json({
    active: active ? publicVisit(active) : null,
    visits: visits.filter((v) => v.endedAt).map(publicVisit),
  })
})
