import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { config } from './config.js'
import { prisma } from './db.js'
import { serveImage } from './images.js'
import { authRouter } from './routes/auth.js'
import { competitionsRouter } from './routes/competitions.js'
import { slidesRouter } from './routes/slides.js'
import { promoRouter } from './routes/promo.js'
import { getPricing } from './pricing.js'
import { gamesRouter } from './routes/games.js'
import { adminContentRouter } from './routes/admin-content.js'
import { getSiteImages } from './site.js'
import { optionalAuth } from './auth.js'
import { feedbackSchema } from './validation.js'
import { adminRouter } from './routes/admin.js'
import { errorHandler, notFound } from './middleware/error.js'

const limiter = (limit, windowMinutes) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => !config.RATE_LIMIT_ENABLED,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Çox sayda sorğu göndərildi, bir az sonra yenidən yoxla.' },
    },
  })

export function createApp() {
  const app = express()

  // Render/Railway kimi hostinqlər proksi arxasındadır — real IP rate limit üçün lazımdır.
  app.set('trust proxy', 1)
  // Şəkillər başqa domendəki saytda (Vercel) göstərilir — helmet-in standart "same-origin" qadağası olmamalıdır.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.CORS_ORIGINS.includes(origin)),
    }),
  )
  app.use(express.json({ limit: '50kb' }))

  app.get('/api/health', async (req, res) => {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true })
  })

  // Şəkillər brauzerdə keşlənir; sorğu limitinə daxil deyil ki, şəkilli səhifələr limiti yeməsin.
  app.get('/api/images/:id', serveImage)

  // Şifrə təxmin etməyə və kod axtarmağa qarşı daha sərt limit
  app.use('/api/auth/login', limiter(10, 15))
  app.use('/api/auth/register', limiter(10, 60))
  app.use('/api/auth/me/password', limiter(10, 15))
  app.use('/api/promo', limiter(20, 1))
  app.use('/api/feedback', limiter(5, 15)) // spam olmasın
  app.use('/api', limiter(300, 15))

  // Saytdakı qiymət cədvəli və hesablayıcı (admin paneldən dəyişir)
  app.get('/api/pricing', async (req, res) => {
    res.json({ pricing: await getPricing() })
  })

  // Admin paneldən dəyişən şəkillər (giriş / qeydiyyat)
  app.get('/api/site', async (req, res) => {
    res.json({ images: await getSiteImages() })
  })

  // Rəy və təkliflər — hər kəs yaza bilər; daxil olubsa, kimin yazdığı da saxlanır
  app.post('/api/feedback', optionalAuth, async (req, res) => {
    const data = feedbackSchema.parse(req.body)
    await prisma.feedback.create({ data: { ...data, userId: req.user?.id ?? null } })
    res.status(201).json({ ok: true })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/games', gamesRouter)
  app.use('/api/competitions', competitionsRouter)
  app.use('/api/slides', slidesRouter)
  app.use('/api/promo', promoRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/admin', adminContentRouter)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
