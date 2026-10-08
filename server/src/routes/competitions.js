import { Router } from 'express'
import { prisma } from '../db.js'
import { optionalAuth, requireAuth } from '../auth.js'
import { HttpError } from '../middleware/error.js'
import { joinSchema, periodQuerySchema } from '../validation.js'

export const competitionsRouter = Router()

// Lövhə sırası: çox xal yuxarıda; bərabər xalda əvvəl qoşulan.
export const TEAM_ORDER = [{ points: 'desc' }, { createdAt: 'asc' }]

export async function teamRank(db, team) {
  const ahead = await db.team.count({
    where: {
      competitionId: team.competitionId,
      OR: [{ points: { gt: team.points } }, { points: team.points, createdAt: { lt: team.createdAt } }],
    },
  })
  return ahead + 1
}

// Lövhə dövrləri Bakı vaxtı ilə (UTC+4, yay saatı yoxdur): həftə bazar ertəsi 00:00-dan, ay ayın 1-dən.
const BAKU_OFFSET_MS = 4 * 60 * 60 * 1000

export function periodStart(period, now = new Date()) {
  if (period !== 'week' && period !== 'month') return null
  const local = new Date(now.getTime() + BAKU_OFFSET_MS)
  const y = local.getUTCFullYear()
  const m = local.getUTCMonth()
  const startLocal =
    period === 'month' ? Date.UTC(y, m, 1) : Date.UTC(y, m, local.getUTCDate() - ((local.getUTCDay() + 6) % 7))
  return new Date(startLocal - BAKU_OFFSET_MS)
}

// Lövhə: 'all' — ümumi xal; 'week'/'month' — yalnız həmin dövrdə verilən xalların cəmi.
// Dövrdə bərabər xalda ümumi sıra saxlanır (teams artıq TEAM_ORDER ilə düzülüb, sort sabitdir).
async function leaderboardRows(teams, period) {
  const since = periodStart(period)
  let rows = teams.map((t) => ({ id: t.id, name: t.name, points: t.points }))
  if (since && teams.length > 0) {
    const sums = await prisma.teamPointEntry.groupBy({
      by: ['teamId'],
      where: { teamId: { in: teams.map((t) => t.id) }, createdAt: { gte: since } },
      _sum: { amount: true },
    })
    const byTeam = new Map(sums.map((s) => [s.teamId, s._sum.amount ?? 0]))
    rows = rows.map((r) => ({ ...r, points: byTeam.get(r.id) ?? 0 })).sort((a, b) => b.points - a.points)
  }
  return { since, rows: rows.map((r, i) => ({ rank: i + 1, ...r })) }
}

// Qeydiyyat açıqdır və yarış bitməyib
const canJoin = (c) => c.registrationOpen && c.status !== 'FINISHED'
// Komandadan çıxmaq yalnız yarış başlamamış mümkündür
const canLeave = (c) => c.registrationOpen && c.status === 'UPCOMING'

const publicCompetition = (c, teamCount, myTeam) => ({
  id: c.id,
  title: c.title,
  description: c.description,
  startsAt: c.startsAt,
  status: c.status,
  registrationOpen: c.registrationOpen,
  maxTeams: c.maxTeams,
  prizes: c.prizes ?? [],
  teamCount,
  isFull: c.maxTeams != null && teamCount >= c.maxTeams,
  canJoin: canJoin(c) && !(c.maxTeams != null && teamCount >= c.maxTeams),
  canLeave: canLeave(c),
  myTeam: myTeam ? { id: myTeam.id, name: myTeam.name, points: myTeam.points } : null,
})

// Gedən → gələcək → bitmiş; daxilində tarixə görə.
const STATUS_ORDER = { ONGOING: 0, UPCOMING: 1, FINISHED: 2 }

competitionsRouter.get('/', optionalAuth, async (req, res) => {
  const competitions = await prisma.competition.findMany({
    include: {
      _count: { select: { teams: true } },
      teams: req.user ? { where: { userId: req.user.id } } : false,
    },
  })
  competitions.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.status === 'FINISHED' ? b.startsAt - a.startsAt : a.startsAt - b.startsAt),
  )
  res.json({
    competitions: competitions.map((c) => publicCompetition(c, c._count.teams, c.teams?.[0])),
  })
})

competitionsRouter.get('/:id', optionalAuth, async (req, res) => {
  const c = await prisma.competition.findUnique({
    where: { id: req.params.id },
    include: { teams: { orderBy: TEAM_ORDER, select: { id: true, name: true, points: true, userId: true } } },
  })
  if (!c) throw new HttpError(404, 'NOT_FOUND', 'Yarış tapılmadı.')

  const { period } = periodQuerySchema.parse(req.query)
  const myTeam = req.user ? c.teams.find((t) => t.userId === req.user.id) : null
  const { since, rows } = await leaderboardRows(c.teams, period)
  res.json({
    competition: publicCompetition(c, c.teams.length, myTeam),
    period,
    periodStart: since,
    // Lövhədə yalnız komanda adı və xal — kim qeydiyyat edib, görünmür.
    leaderboard: rows,
  })
})

competitionsRouter.post('/:id/join', requireAuth, async (req, res) => {
  const { teamName } = joinSchema.parse(req.body)

  const team = await prisma.$transaction(async (tx) => {
    // Yarış sətrini kilidləyirik ki, eyni anda gələn qoşulmalar maxTeams-i aşmasın.
    const [c] = await tx.$queryRaw`
      SELECT id, status::text AS status, "registrationOpen", "maxTeams"
      FROM "Competition" WHERE id = ${req.params.id} FOR UPDATE`
    if (!c) throw new HttpError(404, 'NOT_FOUND', 'Yarış tapılmadı.')
    if (!canJoin(c)) throw new HttpError(400, 'REGISTRATION_CLOSED', 'Bu yarışa qeydiyyat bağlıdır.')

    const mine = await tx.team.findUnique({
      where: { competitionId_userId: { competitionId: c.id, userId: req.user.id } },
    })
    if (mine) throw new HttpError(409, 'ALREADY_JOINED', 'Sən artıq bu yarışa qoşulmusan.')

    if (c.maxTeams != null && (await tx.team.count({ where: { competitionId: c.id } })) >= c.maxTeams) {
      throw new HttpError(400, 'COMPETITION_FULL', 'Yarışda yer qalmayıb.')
    }

    const nameKey = teamName.toLowerCase()
    if (await tx.team.findUnique({ where: { competitionId_nameKey: { competitionId: c.id, nameKey } } })) {
      throw new HttpError(409, 'TEAM_NAME_TAKEN', 'Bu adda komanda artıq var.', {
        fields: { teamName: 'Bu adda komanda artıq var.' },
        fieldCodes: { teamName: 'TEAM_NAME_TAKEN' },
      })
    }

    return tx.team.create({ data: { competitionId: c.id, userId: req.user.id, name: teamName, nameKey } })
  })

  res.status(201).json({ team: { id: team.id, name: team.name, points: team.points } })
})

competitionsRouter.delete('/:id/join', requireAuth, async (req, res) => {
  const c = await prisma.competition.findUnique({ where: { id: req.params.id } })
  if (!c) throw new HttpError(404, 'NOT_FOUND', 'Yarış tapılmadı.')
  if (!canLeave(c)) throw new HttpError(400, 'CANNOT_LEAVE', 'Yarış başlayıb, artıq çıxmaq olmaz.')

  const { count } = await prisma.team.deleteMany({ where: { competitionId: c.id, userId: req.user.id } })
  if (count === 0) throw new HttpError(404, 'NOT_FOUND', 'Sən bu yarışa qoşulmamısan.')
  res.status(204).end()
})
