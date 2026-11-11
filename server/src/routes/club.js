import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { HttpError } from '../middleware/error.js'
import { requireAuth, requireAdmin, optionalAuth } from '../auth.js'
import { requirePermission } from '../permissions.js'
import { getClub, saveClub, clubStatus, publicClub, giveTier, clearTier, DEFAULT_CLUB } from '../club.js'
import { bakuDay } from '../visits.js'

// DırDır Club: saytda — statuslar, qaydalar və daxil olan müştərinin statusu; admin paneldə — ayarlar.
export const clubRouter = Router()

clubRouter.get('/', optionalAuth, async (req, res) => {
  const club = await getClub()
  res.json({
    club: publicClub(club),
    me: req.user && club.enabled ? await clubStatus(req.user.id, club) : null,
  })
})

export const adminClubRouter = Router()
adminClubRouter.use('/club', requireAuth, requireAdmin, requirePermission('club'))

adminClubRouter.get('/club', async (req, res) => {
  const club = await getClub()
  res.json({ club, defaults: { ...DEFAULT_CLUB, startDay: club.startDay }, today: bakuDay() })
})

adminClubRouter.put('/club', async (req, res) => {
  res.json({ club: await saveClub(req.body) })
})

// Müştəriyə status vermək ({ tier: "sakin" }) və ya verilən statusu ləğv etmək ({ tier: null }).
// Verilən status başlanğıc nöqtəsidir — sonra adi qayda ilə artıb-azalır (club.js → giveTier).
// İstifadəçilər bölməsindən edilir — "İstifadəçilər" və ya "DırDır Club" icazəsi bəsdir.
adminClubRouter.put('/club-members/:id', requireAuth, requireAdmin, requirePermission('istifadeciler', 'club'), async (req, res) => {
  const { tier } = z.object({ tier: z.string().trim().min(1).max(40).nullable() }).parse(req.body)
  const club = await getClub()
  if (tier && !club.tiers.some((t) => t.key === tier)) {
    throw new HttpError(400, 'VALIDATION', 'Belə status yoxdur.', { fields: { tier: 'Belə status yoxdur.' } })
  }
  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'İstifadəçi tapılmadı.')
  if (tier) await giveTier(user.id, tier, req.user.id, club)
  else await clearTier(user.id)
  res.json({ club: memberStatus(await clubStatus(user.id, club)) })
})

// Admin siyahılarında göstərilən status
export const memberStatus = (s) => ({ visits: s.visits, realVisits: s.realVisits, given: s.given, tier: s.tier })
