import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireAdmin } from '../auth.js'
import { requirePermission } from '../permissions.js'
import { bakuDay, publicVisit } from '../visits.js'
import { statsQuerySchema, exportQuerySchema } from '../validation.js'

// Statistika: Günün hesabatındakı seanslar günlük (bir ayın günləri) və ya aylıq (bir ilin ayları) üzrə.
// Gəlirə yalnız bitmiş seanslar daxildir (davam edənin məbləği hələ yekun deyil); müştəri sayına hamısı.
export const adminStatsRouter = Router()
adminStatsRouter.use('/stats', requireAuth, requireAdmin, requirePermission('statistika'))

const round2 = (n) => Math.round(n * 100) / 100
const pad = (n) => String(n).padStart(2, '0')

const emptyBucket = (key, future) => ({ key, future, people: 0, sessions: 0, total: 0, cash: 0, card: 0, other: 0, hall: 0, room: 0 })

adminStatsRouter.get('/stats', async (req, res) => {
  const today = bakuDay()
  const { view, month = today.slice(0, 7), year = today.slice(0, 4) } = statsQuerySchema.parse(req.query)
  const period = view === 'daily' ? month : year

  // Dövrün bütün günləri/ayları — qeyd olmasa da qrafikdə boş sütun kimi görünsün
  let keys
  if (view === 'daily') {
    const [y, m] = month.split('-').map(Number)
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
    keys = Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`)
  } else {
    keys = Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}`)
  }
  const nowKey = view === 'daily' ? today : today.slice(0, 7)
  const buckets = new Map(keys.map((k) => [k, emptyBucket(k, k > nowKey)]))

  const visits = await prisma.visit.findMany({
    where: { day: { startsWith: period } },
    select: { day: true, people: true, amount: true, paymentMethod: true, kind: true, endedAt: true },
  })
  for (const v of visits) {
    const b = buckets.get(view === 'daily' ? v.day : v.day.slice(0, 7))
    if (!b) continue
    b.people += v.people
    b.sessions += 1
    if (!v.endedAt || v.amount == null) continue
    const amount = Number(v.amount)
    b.total += amount
    if (v.paymentMethod === 'cash') b.cash += amount
    else if (v.paymentMethod === 'card') b.card += amount
    else b.other += amount
    b[v.kind === 'room' ? 'room' : 'hall'] += amount
  }

  const rows = [...buckets.values()].map((b) => ({
    ...b,
    total: round2(b.total),
    cash: round2(b.cash),
    card: round2(b.card),
    other: round2(b.other),
    hall: round2(b.hall),
    room: round2(b.room),
  }))
  const sum = (field) => round2(rows.reduce((s, r) => s + r[field], 0))
  const totals = {
    people: sum('people'),
    sessions: sum('sessions'),
    total: sum('total'),
    cash: sum('cash'),
    card: sum('card'),
    other: sum('other'),
    hall: sum('hall'),
    room: sum('room'),
  }

  res.json({ view, period, today, buckets: rows, totals })
})

// Yükləmə (PDF / Excel) üçün: tarix aralığındakı bütün seanslar, gün və giriş saatı sırası ilə
adminStatsRouter.get('/stats/export', async (req, res) => {
  const { from, to } = exportQuerySchema.parse(req.query)
  const visits = await prisma.visit.findMany({
    where: { day: { gte: from, lte: to } },
    orderBy: [{ day: 'asc' }, { startedAt: 'asc' }],
  })
  res.json({ from, to, visits: visits.map(publicVisit) })
})
