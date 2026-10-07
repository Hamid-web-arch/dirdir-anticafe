import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { prisma } from './db.js'
import { HttpError } from './middleware/error.js'

export const hashPassword = (password) => bcrypt.hash(password, config.BCRYPT_ROUNDS)
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash)

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN })

// Klientə qaytarılan istifadəçi — şifrə hash-i heç vaxt çıxmır.
export const publicUser = (u) => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  phone: u.phone,
  role: u.role,
  points: u.points,
  createdAt: u.createdAt,
})

// Authorization: Bearer <token>. İstifadəçi hər sorğuda bazadan oxunur ki,
// silinmiş hesab və ya dəyişmiş rol köhnə tokenlə işləməsin.
export async function requireAuth(req, res, next) {
  const header = req.get('authorization') ?? ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Daxil olmaq lazımdır.')

  let payload
  try {
    payload = jwt.verify(token, config.JWT_SECRET)
  } catch {
    throw new HttpError(401, 'Sessiyanın vaxtı bitib, yenidən daxil ol.')
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user) throw new HttpError(401, 'Hesab tapılmadı.')
  req.user = user
  next()
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') throw new HttpError(403, 'Bu əməliyyat üçün icazən yoxdur.')
  next()
}
