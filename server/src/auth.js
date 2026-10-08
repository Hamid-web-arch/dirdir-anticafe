import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { prisma } from './db.js'
import { HttpError } from './middleware/error.js'
import { imageUrl } from './images.js'

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
  blocked: Boolean(u.blockedAt),
  newsletter: u.newsletter,
  avatarUrl: imageUrl(u.avatarId),
  createdAt: u.createdAt,
})

// Tokeni yoxlayır və istifadəçini bazadan oxuyur (silinmiş hesab / dəyişmiş rol köhnə tokenlə işləməsin).
// Token yoxdursa null; token var, amma etibarsızdırsa xəta.
async function userFromRequest(req) {
  const header = req.get('authorization') ?? ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return null

  let payload
  try {
    payload = jwt.verify(token, config.JWT_SECRET)
  } catch {
    throw new HttpError(401, 'SESSION_EXPIRED', 'Sessiyanın vaxtı bitib, yenidən daxil ol.')
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user) throw new HttpError(401, 'SESSION_EXPIRED', 'Hesab tapılmadı.')
  // Bloklanmış hesabın köhnə tokeni də dərhal işləməz olur.
  if (user.blockedAt) throw new HttpError(401, 'ACCOUNT_BLOCKED', 'Hesabın bloklanıb. Ətraflı məlumat üçün bizə yaz.')
  return user
}

export async function requireAuth(req, res, next) {
  req.user = await userFromRequest(req)
  if (!req.user) throw new HttpError(401, 'AUTH_REQUIRED', 'Daxil olmaq lazımdır.')
  next()
}

// Açıq səhifələr üçün: daxil olubsa req.user doldurulur (məs. "sənin komandan"), olmayıbsa da işləyir.
export async function optionalAuth(req, res, next) {
  try {
    req.user = await userFromRequest(req)
  } catch {
    req.user = null
  }
  next()
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') throw new HttpError(403, 'FORBIDDEN', 'Bu əməliyyat üçün icazən yoxdur.')
  next()
}
