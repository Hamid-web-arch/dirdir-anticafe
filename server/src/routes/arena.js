import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../auth.js'

export const arenaRouter = Router()

// Lövhədə tam soyad göstərmirik: "Aysel M."
const displayName = (u) => `${u.firstName} ${u.lastName.charAt(0).toUpperCase()}.`

const leaderboardQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

// Bərabər xalda əvvəl qeydiyyatdan keçən yuxarıda durur.
const ORDER = [{ points: 'desc' }, { createdAt: 'asc' }]

arenaRouter.get('/leaderboard', async (req, res) => {
  const { limit } = leaderboardQuery.parse(req.query)
  const users = await prisma.user.findMany({
    where: { points: { gt: 0 } },
    orderBy: ORDER,
    take: limit,
    select: { id: true, firstName: true, lastName: true, points: true },
  })
  res.json({
    leaderboard: users.map((u, i) => ({ rank: i + 1, id: u.id, name: displayName(u), points: u.points })),
  })
})

// Daxil olmuş istifadəçinin öz yeri.
arenaRouter.get('/me', requireAuth, async (req, res) => {
  const { id, points, createdAt } = req.user
  const ahead = await prisma.user.count({
    where: { OR: [{ points: { gt: points } }, { points, createdAt: { lt: createdAt } }] },
  })
  res.json({ rank: points > 0 ? ahead + 1 : null, points, name: displayName(req.user), id })
})
