// İlk admin hesabını yaradır (və ya mövcud hesabı admin edir).
// İstifadə: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE .env-də olsun, sonra `npm run db:seed`.
// --if-configured: dəyişənlər yoxdursa səssizcə çıxır (canlıda hər başlanğıcda işləyir).
// Hesab artıq varsa şifrəsinə toxunulmur — ADMIN_PASSWORD-u sonradan dəyişmək şifrəni dəyişmir.
import { prisma } from '../src/db.js'
import { hashPassword } from '../src/auth.js'
import { registerSchema } from '../src/validation.js'

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE, ADMIN_FIRST_NAME = 'Admin', ADMIN_LAST_NAME = 'DırDır' } = process.env

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_PHONE) {
  if (process.argv.includes('--if-configured')) process.exit(0)
  console.error('ADMIN_EMAIL, ADMIN_PASSWORD və ADMIN_PHONE təyin olunmalıdır.')
  process.exit(1)
}

const data = registerSchema.parse({
  firstName: ADMIN_FIRST_NAME,
  lastName: ADMIN_LAST_NAME,
  email: ADMIN_EMAIL,
  phone: ADMIN_PHONE,
  password: ADMIN_PASSWORD,
})

const existing = await prisma.user.findUnique({ where: { email: data.email } })
if (existing) {
  await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } })
  console.log(`${data.email} artıq var — admin edildi.`)
} else {
  const { password, ...rest } = data
  await prisma.user.create({ data: { ...rest, role: 'ADMIN', passwordHash: await hashPassword(password) } })
  console.log(`Admin yaradıldı: ${data.email}`)
}

await prisma.$disconnect()
