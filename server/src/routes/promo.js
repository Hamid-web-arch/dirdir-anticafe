import { Router } from 'express'
import { prisma } from '../db.js'
import { HttpError } from '../middleware/error.js'
import { promoValidateSchema } from '../validation.js'

export const promoRouter = Router()

// Hesablayıcı kodu yoxlayır. Kodların siyahısı heç vaxt klientə göndərilmir.
promoRouter.post('/validate', async (req, res) => {
  const { code } = promoValidateSchema.parse(req.body)
  const promo = await prisma.promoCode.findUnique({ where: { code } })

  const usable = promo && promo.active && (!promo.expiresAt || promo.expiresAt > new Date())
  if (!usable) throw new HttpError(404, 'PROMO_NOT_FOUND', 'Bu promokod tapılmadı.')

  res.json({ code: promo.code, percent: promo.percent })
})
