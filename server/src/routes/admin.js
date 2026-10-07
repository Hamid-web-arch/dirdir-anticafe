import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireAdmin, publicUser } from '../auth.js'
import { HttpError } from '../middleware/error.js'
import { pointsSchema, listQuerySchema, promoCreateSchema, promoUpdateSchema } from '../validation.js'

export const adminRouter = Router()
adminRouter.use(requireAuth, requireAdmin)

// ---------- İstifadəçilər və xallar ----------

// Telefon bazada 9 rəqəmlə saxlanır — axtarışda da 994 və başdakı 0-ı atırıq.
const phoneDigits = (q) => q.replace(/\D/g, '').replace(/^994/, '').replace(/^0/, '')

adminRouter.get('/users', async (req, res) => {
  const { q, limit } = listQuerySchema.parse(req.query)
  const digits = q ? phoneDigits(q) : ''
  const where = q
    ? {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          ...(digits ? [{ phone: { contains: digits } }] : []),
        ],
      }
    : {}
  const users = await prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit })
  res.json({ users: users.map(publicUser) })
})

// Xal əlavə et (müsbət) və ya çıx (mənfi). Cəmi 0-dan aşağı düşə bilməz.
adminRouter.post('/users/:id/points', async (req, res) => {
  const { amount, reason } = pointsSchema.parse(req.body)

  const user = await prisma.$transaction(async (tx) => {
    // Sətri kilidləyirik ki, eyni anda iki dəyişiklik bir-birini əzməsin.
    const [locked] = await tx.$queryRaw`SELECT points FROM "User" WHERE id = ${req.params.id} FOR UPDATE`
    if (!locked) throw new HttpError(404, 'İstifadəçi tapılmadı.')
    if (locked.points + amount < 0) {
      throw new HttpError(400, `İstifadəçinin cəmi ${locked.points} xalı var, bu qədər çıxmaq olmaz.`, {
        amount: 'Xal 0-dan aşağı düşə bilməz.',
      })
    }

    await tx.pointEntry.create({ data: { userId: req.params.id, amount, reason, createdById: req.user.id } })
    return tx.user.update({ where: { id: req.params.id }, data: { points: { increment: amount } } })
  })

  res.status(201).json({ user: publicUser(user) })
})

adminRouter.get('/users/:id/points', async (req, res) => {
  const entries = await prisma.pointEntry.findMany({
    where: { userId: req.params.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  })
  res.json({ entries })
})

// ---------- Promokodlar ----------

const promoConflict = (err) => {
  if (err.code === 'P2002') throw new HttpError(409, 'Bu kod artıq var.', { code: 'Bu kod artıq var.' })
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
