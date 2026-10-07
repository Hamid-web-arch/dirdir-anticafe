import { Router } from 'express'
import { prisma } from '../db.js'
import { hashPassword, verifyPassword, signToken, publicUser, requireAuth } from '../auth.js'
import { HttpError } from '../middleware/error.js'
import { registerSchema, loginSchema } from '../validation.js'

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body)

  // Hansı sahənin artıq istifadə olunduğunu dəqiq deyirik ki, forma düzgün sahəni qırmızı göstərsin.
  const taken = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { phone: data.phone }] },
    select: { email: true, phone: true },
  })
  if (taken) {
    const fields = {}
    if (taken.email === data.email) fields.email = 'Bu email ilə artıq hesab var.'
    if (taken.phone === data.phone) fields.phone = 'Bu nömrə ilə artıq hesab var.'
    throw new HttpError(409, 'Bu məlumatlarla artıq hesab var.', fields)
  }

  const { password, ...rest } = data
  const user = await prisma.user.create({
    data: { ...rest, passwordHash: await hashPassword(password) },
  })

  res.status(201).json({ token: signToken(user), user: publicUser(user) })
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body)
  const user = await prisma.user.findUnique({ where: { email } })

  // Email olub-olmamasını bildirmirik — hər iki halda eyni cavab.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, 'Email və ya şifrə yanlışdır.')
  }

  res.json({ token: signToken(user), user: publicUser(user) })
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})
