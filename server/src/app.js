import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { config } from './config.js'
import { prisma } from './db.js'
import { authRouter } from './routes/auth.js'
import { arenaRouter } from './routes/arena.js'
import { promoRouter } from './routes/promo.js'
import { adminRouter } from './routes/admin.js'
import { errorHandler, notFound } from './middleware/error.js'

const limiter = (limit, windowMinutes) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => !config.RATE_LIMIT_ENABLED,
    message: { error: { message: 'Çox sayda sorğu göndərildi, bir az sonra yenidən yoxla.' } },
  })

export function createApp() {
  const app = express()

  // Render/Railway kimi hostinqlər proksi arxasındadır — real IP rate limit üçün lazımdır.
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.CORS_ORIGINS.includes(origin)),
    }),
  )
  app.use(express.json({ limit: '20kb' }))

  app.get('/api/health', async (req, res) => {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true })
  })

  // Şifrə təxmin etməyə və kod axtarmağa qarşı daha sərt limit
  app.use('/api/auth/login', limiter(10, 15))
  app.use('/api/auth/register', limiter(10, 60))
  app.use('/api/promo', limiter(20, 1))
  app.use('/api', limiter(300, 15))

  app.use('/api/auth', authRouter)
  app.use('/api/arena', arenaRouter)
  app.use('/api/promo', promoRouter)
  app.use('/api/admin', adminRouter)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
