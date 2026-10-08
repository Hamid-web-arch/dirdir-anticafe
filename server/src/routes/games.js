import { Router } from 'express'
import { prisma } from '../db.js'
import { imageUrl } from '../images.js'
import { HttpError } from '../middleware/error.js'

export const gamesRouter = Router()

export const publicGame = (g, { withHowTo = false } = {}) => ({
  id: g.id,
  position: g.position,
  imageUrl: imageUrl(g.imageId),
  title: g.title,
  summary: g.summary,
  ...(withHowTo ? { howTo: g.howTo } : {}),
  players: g.players,
  duration: g.duration,
  age: g.age,
  active: g.active,
})

// Oyunlar səhifəsi — yalnız aktiv oyunlar, sıra ilə
gamesRouter.get('/', async (req, res) => {
  const games = await prisma.game.findMany({ where: { active: true }, orderBy: { position: 'asc' } })
  res.json({ games: games.map((g) => publicGame(g)) })
})

gamesRouter.get('/:id', async (req, res) => {
  const game = await prisma.game.findFirst({ where: { id: req.params.id, active: true } })
  if (!game) throw new HttpError(404, 'NOT_FOUND', 'Oyun tapılmadı.')
  res.json({ game: publicGame(game, { withHowTo: true }) })
})
