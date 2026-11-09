import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireAdmin, optionalAuth, customerCode } from '../auth.js'
import { requirePermission } from '../permissions.js'
import { HttpError } from '../middleware/error.js'
import { getWheel, saveWheel, drawPrize, nextSpinAt, publicPrizes, publicSpin, DEFAULT_WHEEL } from '../wheel.js'

// Hədiyyə çarxı: saytda hər qeydiyyatlı istifadəçi periodDays gündə bir dəfə fırlada bilər.
// Hədiyyəni seçən serverdir — brauzer yalnız nəticəyə qədər fırlanmanı göstərir.
export const wheelRouter = Router()

// İstifadəçinin vəziyyəti: nə vaxt fırlada bilər, qazandığı hədiyyələr
async function userState(userId, wheel) {
  const spins = await prisma.wheelSpin.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 })
  return {
    nextSpinAt: nextSpinAt(spins[0]?.createdAt, wheel.periodDays),
    spins: spins.map(publicSpin),
  }
}

wheelRouter.get('/', optionalAuth, async (req, res) => {
  const wheel = await getWheel()
  res.json({
    enabled: wheel.enabled,
    periodDays: wheel.periodDays,
    prizes: publicPrizes(wheel),
    me: req.user ? await userState(req.user.id, wheel) : null,
  })
})

wheelRouter.post('/spin', requireAuth, async (req, res) => {
  const wheel = await getWheel()
  if (!wheel.enabled) throw new HttpError(409, 'WHEEL_OFF', 'Hədiyyə çarxı hazırda bağlıdır.')

  const result = await prisma.$transaction(async (tx) => {
    // Eyni anda iki sorğu ilə iki dəfə fırlatmaq olmasın — istifadəçinin sətri kilidlənir
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${req.user.id} FOR UPDATE`
    const last = await tx.wheelSpin.findFirst({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } })
    const waitUntil = nextSpinAt(last?.createdAt, wheel.periodDays)
    if (waitUntil) {
      throw new HttpError(409, 'WHEEL_WAIT', 'Çarxı artıq fırlatmısan — növbəti dəfə gözlə.')
    }
    const index = drawPrize(wheel.prizes)
    const spin = await tx.wheelSpin.create({ data: { userId: req.user.id, prize: wheel.prizes[index].label } })
    return { index, spin }
  })

  res.status(201).json({
    index: result.index,
    prizes: publicPrizes(wheel), // brauzerdəki siyahı köhnə ola bilər — çarx bununla çəkilir
    spin: publicSpin(result.spin),
    nextSpinAt: nextSpinAt(result.spin.createdAt, wheel.periodDays),
  })
})

// ---------- Admin ----------

export const adminWheelRouter = Router()
adminWheelRouter.use('/wheel', requireAuth, requireAdmin)
// Qazanılan hədiyyələrə Günün hesabatında da baxılır (müştəri gələndə hədiyyəsini vermək üçün)
adminWheelRouter.use('/wheel/spins', requirePermission('carx', 'hesabat'))

const adminSpin = (s) => ({
  ...publicSpin(s),
  user: s.user
    ? { id: s.user.id, firstName: s.user.firstName, lastName: s.user.lastName, phone: s.user.phone, customerCode: customerCode(s.user.customerNo) }
    : null,
})

adminWheelRouter.get('/wheel', requirePermission('carx'), async (req, res) => {
  res.json({ wheel: await getWheel(), defaults: DEFAULT_WHEEL })
})

adminWheelRouter.put('/wheel', requirePermission('carx'), async (req, res) => {
  res.json({ wheel: await saveWheel(req.body) })
})

const spinsQuerySchema = z.object({
  status: z.enum(['unused', 'used', 'all']).catch('all'),
  userId: z.string().trim().min(1).max(40).optional(),
})

adminWheelRouter.get('/wheel/spins', async (req, res) => {
  const { status, userId } = spinsQuerySchema.parse(req.query)
  const spins = await prisma.wheelSpin.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(status === 'unused' ? { usedAt: null } : status === 'used' ? { usedAt: { not: null } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: true },
  })
  res.json({ spins: spins.map(adminSpin) })
})

// Hədiyyə kafedə verildi (used: true) və ya səhvən qeyd olunub (false)
adminWheelRouter.patch('/wheel/spins/:id', async (req, res) => {
  const { used } = z.object({ used: z.boolean() }).parse(req.body)
  const spin = await prisma.wheelSpin.findUnique({ where: { id: req.params.id } })
  if (!spin) throw new HttpError(404, 'NOT_FOUND', 'Hədiyyə tapılmadı.')
  const updated = await prisma.wheelSpin.update({
    where: { id: spin.id },
    data: used ? { usedAt: spin.usedAt ?? new Date(), usedById: req.user.id } : { usedAt: null, usedById: null },
    include: { user: true },
  })
  res.json({ spin: adminSpin(updated) })
})
