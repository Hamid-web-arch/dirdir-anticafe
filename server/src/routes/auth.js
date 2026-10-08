import { Router } from 'express'
import { prisma } from '../db.js'
import { hashPassword, verifyPassword, signToken, publicUser, requireAuth } from '../auth.js'
import { HttpError } from '../middleware/error.js'
import { registerSchema, loginSchema, profileUpdateSchema, passwordChangeSchema } from '../validation.js'
import { processImage, rawImage } from '../images.js'
import { teamRank } from './competitions.js'

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

authRouter.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body)
  await assertUnique(data)

  const { password, ...rest } = data
  const user = await prisma.user.create({
    data: { ...rest, passwordHash: await hashPassword(password) },
  })
  res.status(201).json({ token: signToken(user), user: publicUser(user) })
})

authRouter.post('/login', async (req, res) => {
  const { login, password } = loginSchema.parse(req.body)
  // login — { email } və ya { phone }; boş telefon heç kimə uyğun gəlmir
  const user = login.email || login.phone ? await prisma.user.findUnique({ where: login }) : null

  // Hesabın olub-olmamasını bildirmirik — hər iki halda eyni cavab.
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

authRouter.post('/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = passwordChangeSchema.parse(req.body)
  if (!(await verifyPassword(currentPassword, req.user.passwordHash))) {
    throw new HttpError(400, 'WRONG_PASSWORD', 'Köhnə şifrə yanlışdır.', {
      fields: { currentPassword: 'Köhnə şifrə yanlışdır.' },
      fieldCodes: { currentPassword: 'WRONG_PASSWORD' },
    })
  }
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await hashPassword(newPassword) } })
  res.status(204).end()
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
