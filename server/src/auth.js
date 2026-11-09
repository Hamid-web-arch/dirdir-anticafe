import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { prisma } from './db.js'
import { HttpError } from './middleware/error.js'
import { imageUrl } from './images.js'

export const hashPassword = (password) => bcrypt.hash(password, config.BCRYPT_ROUNDS)
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash)

// Hesab tapılmayanda da eyni vaxt sərf edək ki, cavabın sürətindən "bu email var/yox" bilinməsin.
let dummyHash
export async function burnPasswordCheck(password) {
  dummyHash ??= await bcrypt.hash('dirdir-timing-guard', config.BCRYPT_ROUNDS)
  await bcrypt.compare(password, dummyHash)
}

// Alqoritm açıq yazılır: yoxlamada da yalnız HS256 qəbul olunur (başqa alqoritmli saxta token keçməsin).
const JWT_ALGORITHM = 'HS256'

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: config.JWT_EXPIRES_IN,
  })

// Şifrə dəyişmə anı — saniyəyə yuvarlaqlaşdırılır, çünki tokenin "iat" vaxtı da saniyə ilədir:
// bu andan əvvəl verilmiş bütün tokenlər (başqa cihazlardakı sessiyalar) etibarsız olur.
export const passwordChangeMoment = () => new Date(Math.floor(Date.now() / 1000) * 1000)

// Müştəri kodu: 1001 → "DD1001". Kafedə müştərini tanımaq üçün (Günün hesabatında axtarışda da işləyir).
export const customerCode = (no) => (no == null ? null : `DD${String(no).padStart(4, '0')}`)

// Klientə qaytarılan istifadəçi — şifrə hash-i heç vaxt çıxmır.
export const publicUser = (u) => ({
  id: u.id,
  customerCode: customerCode(u.customerNo),
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  phone: u.phone,
  role: u.role,
  // Admin paneldə hansı bölmələrin görünəcəyi üçün (adi istifadəçidə həmişə false / [])
  isSuperAdmin: u.role === 'ADMIN' && Boolean(u.isSuperAdmin),
  permissions: u.role === 'ADMIN' ? (u.permissions ?? []) : [],
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
    payload = jwt.verify(token, config.JWT_SECRET, { algorithms: [JWT_ALGORITHM] })
  } catch {
    throw new HttpError(401, 'SESSION_EXPIRED', 'Sessiyanın vaxtı bitib, yenidən daxil ol.')
  }
  if (typeof payload.sub !== 'string') throw new HttpError(401, 'SESSION_EXPIRED', 'Sessiyanın vaxtı bitib, yenidən daxil ol.')
  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user) throw new HttpError(401, 'SESSION_EXPIRED', 'Hesab tapılmadı.')
  // Şifrə dəyişəndən əvvəlki tokenlər işləmir
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
    throw new HttpError(401, 'SESSION_EXPIRED', 'Şifrə dəyişdirilib, yenidən daxil ol.')
  }
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
