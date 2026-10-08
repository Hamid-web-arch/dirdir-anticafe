import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireAdmin } from '../auth.js'
import { HttpError } from '../middleware/error.js'
import { processImage, rawImage } from '../images.js'
import { publicGame } from './games.js'
import { getSiteImages, siteImageSettingKey } from '../site.js'
import { emailConfigured, sendMail } from '../mail.js'
import {
  gameCreateSchema,
  gameUpdateSchema,
  orderSchema,
  feedbackUpdateSchema,
  broadcastSchema,
  SITE_IMAGE_KEYS,
} from '../validation.js'

// Admin paneldəki məzmun: oyunlar, rəylər, saytın şəkilləri, xəbər göndərmək.
export const adminContentRouter = Router()
adminContentRouter.use(requireAuth, requireAdmin)

// ---------- Oyunlar ----------

const adminGame = (g) => publicGame(g, { withHowTo: true })

async function assertImageFree(imageId, exceptGameId) {
  const image = await prisma.image.findUnique({ where: { id: imageId }, include: { slide: true, game: true, user: true } })
  if (!image) throw new HttpError(400, 'IMAGE_INVALID', 'Şəkil tapılmadı, yenidən yüklə.')
  if (image.user || image.slide || (image.game && image.game.id !== exceptGameId)) {
    throw new HttpError(400, 'IMAGE_INVALID', 'Bu şəkil artıq istifadə olunur, yenisini yüklə.')
  }
}

adminContentRouter.get('/games', async (req, res) => {
  const games = await prisma.game.findMany({ orderBy: { position: 'asc' } })
  res.json({ games: games.map(adminGame) })
})

adminContentRouter.post('/games', async (req, res) => {
  const data = gameCreateSchema.parse(req.body)
  await assertImageFree(data.imageId)
  const last = await prisma.game.aggregate({ _max: { position: true } })
  const game = await prisma.game.create({ data: { ...data, position: (last._max.position ?? -1) + 1 } })
  res.status(201).json({ game: adminGame(game) })
})

adminContentRouter.patch('/games/:id', async (req, res) => {
  const data = gameUpdateSchema.parse(req.body)
  const current = await prisma.game.findUnique({ where: { id: req.params.id } })
  if (!current) throw new HttpError(404, 'NOT_FOUND', 'Oyun tapılmadı.')
  const replacingImage = data.imageId && data.imageId !== current.imageId
  if (replacingImage) await assertImageFree(data.imageId, current.id)

  const game = await prisma.$transaction(async (tx) => {
    const updated = await tx.game.update({ where: { id: current.id }, data })
    // Şəkil əvəz olunubsa, köhnəsini saxlamırıq
    if (replacingImage) await tx.image.delete({ where: { id: current.imageId } })
    return updated
  })
  res.json({ game: adminGame(game) })
})

adminContentRouter.delete('/games/:id', async (req, res) => {
  await prisma.$transaction(async (tx) => {
    const game = await tx.game.delete({ where: { id: req.params.id } })
    await tx.image.delete({ where: { id: game.imageId } })
  })
  res.status(204).end()
})

// Bütün oyunların yeni sırası: { ids: [birinci, ikinci, ...] }
adminContentRouter.put('/games/order', async (req, res) => {
  const { ids } = orderSchema.parse(req.body)
  const existing = await prisma.game.findMany({ select: { id: true } })
  const known = new Set(existing.map((g) => g.id))
  if (ids.length !== known.size || new Set(ids).size !== ids.length || !ids.every((id) => known.has(id))) {
    throw new HttpError(400, 'VALIDATION', 'Sıra siyahısı bütün oyunları bir dəfə ehtiva etməlidir.')
  }
  await prisma.$transaction(ids.map((id, position) => prisma.game.update({ where: { id }, data: { position } })))
  const games = await prisma.game.findMany({ orderBy: { position: 'asc' } })
  res.json({ games: games.map(adminGame) })
})

// ---------- Rəy və təkliflər ----------

adminContentRouter.get('/feedback', async (req, res) => {
  const unreadOnly = req.query.status === 'unread'
  const [items, unread] = await Promise.all([
    prisma.feedback.findMany({
      where: unreadOnly ? { read: false } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
    }),
    prisma.feedback.count({ where: { read: false } }),
  ])
  res.json({ feedback: items, unread })
})

adminContentRouter.patch('/feedback/:id', async (req, res) => {
  const { read } = feedbackUpdateSchema.parse(req.body)
  const item = await prisma.feedback.update({ where: { id: req.params.id }, data: { read } })
  res.json({ feedback: item })
})

adminContentRouter.delete('/feedback/:id', async (req, res) => {
  await prisma.feedback.delete({ where: { id: req.params.id } })
  res.status(204).end()
})

// ---------- Saytın şəkilləri (giriş / qeydiyyat) ----------

const siteImageKey = (key) => {
  if (!SITE_IMAGE_KEYS.includes(key)) throw new HttpError(404, 'NOT_FOUND', 'Belə şəkil yeri yoxdur.')
  return siteImageSettingKey(key)
}

adminContentRouter.get('/site-images', async (req, res) => {
  res.json({ images: await getSiteImages() })
})

// Şəklin özü göndərilir (Content-Type: image/*); köhnə şəkil silinir.
adminContentRouter.put('/site-images/:key', rawImage, async (req, res) => {
  const settingKey = siteImageKey(req.params.key)
  const image = await processImage(req.body, 'slide')
  await prisma.$transaction(async (tx) => {
    const old = await tx.appSetting.findUnique({ where: { key: settingKey } })
    const created = await tx.image.create({ data: image })
    await tx.appSetting.upsert({
      where: { key: settingKey },
      create: { key: settingKey, value: created.id },
      update: { value: created.id },
    })
    if (old) await tx.image.deleteMany({ where: { id: old.value } })
  })
  res.json({ images: await getSiteImages() })
})

// Standart şəklə qayıt
adminContentRouter.delete('/site-images/:key', async (req, res) => {
  const settingKey = siteImageKey(req.params.key)
  await prisma.$transaction(async (tx) => {
    const old = await tx.appSetting.findUnique({ where: { key: settingKey } })
    if (!old) return
    await tx.appSetting.delete({ where: { key: settingKey } })
    await tx.image.deleteMany({ where: { id: old.value } })
  })
  res.json({ images: await getSiteImages() })
})

// ---------- Xəbər göndərmək ----------
// Yalnız "Yeniliklərdən xəbərdar ol" seçmiş və bloklanmamış istifadəçilərə.

const subscribedWhere = { newsletter: true, blockedAt: null }

adminContentRouter.get('/broadcasts', async (req, res) => {
  const [subscribers, broadcasts] = await Promise.all([
    prisma.user.count({ where: subscribedWhere }),
    prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    }),
  ])
  res.json({ emailConfigured: emailConfigured(), subscribers, broadcasts })
})

adminContentRouter.post('/broadcasts', async (req, res) => {
  const { channel, subject, body, userIds } = broadcastSchema.parse(req.body)
  if (channel === 'email' && !emailConfigured()) {
    throw new HttpError(400, 'EMAIL_NOT_CONFIGURED', 'Email göndərmək üçün serverdə SMTP ayarları yoxdur.')
  }

  const recipients = await prisma.user.findMany({
    where: { ...subscribedWhere, ...(userIds?.length ? { id: { in: userIds } } : {}) },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    orderBy: { firstName: 'asc' },
  })
  if (recipients.length === 0) {
    throw new HttpError(400, 'NO_RECIPIENTS', 'Seçilənlər arasında xəbər almaq istəyən istifadəçi yoxdur.')
  }

  let sentCount = 0
  let failedCount = 0
  if (channel === 'email') {
    // Hər kəsə ayrıca məktub — alıcılar bir-birinin ünvanını görmür
    for (const r of recipients) {
      try {
        await sendMail({ to: r.email, subject, text: body.replaceAll('{ad}', r.firstName) })
        sentCount++
      } catch (err) {
        failedCount++
        console.error(`Email göndərilmədi (${r.email}):`, err.message)
      }
    }
  }

  const broadcast = await prisma.broadcast.create({
    data: { channel, subject, body, recipientCount: recipients.length, sentCount, failedCount, createdById: req.user.id },
  })
  // WhatsApp: avtomatik göndərmək mümkün deyil — admin paneli hər alıcı üçün hazır mesajlı link göstərir
  res.status(201).json({
    broadcast,
    recipients: channel === 'whatsapp' ? recipients.map((r) => ({ ...r, message: body.replaceAll('{ad}', r.firstName) })) : [],
  })
})
