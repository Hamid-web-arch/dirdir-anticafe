import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireAdmin, publicUser, hashPassword, passwordChangeMoment } from '../auth.js'
import { HttpError } from '../middleware/error.js'
import { requireSuperAdmin } from '../permissions.js'
import { assertUnique } from './auth.js'
import { adminCreateSchema, adminPromoteSchema, adminUpdateSchema } from '../validation.js'

// "Adminlər" bölməsi: yalnız baş admin. Yeni admin yaradır, mövcud istifadəçini admin edir,
// hər adminin hansı bölmələri görəcəyini seçir, bloklayır, şifrəsini yeniləyir, adminlikdən çıxarır.
// Baş adminin özünə buradan toxunmaq olmaz — həmişə ən azı bir baş admin qalır.
export const adminAdminsRouter = Router()
adminAdminsRouter.use('/admins', requireAuth, requireAdmin, requireSuperAdmin)

const adminView = (u) => ({ ...publicUser(u), blockedAt: u.blockedAt })

// Dəyişdirilə bilən admin: mövcuddur, admindir, baş admin deyil
async function findManagedAdmin(id) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user || user.role !== 'ADMIN') throw new HttpError(404, 'NOT_FOUND', 'Admin tapılmadı.')
  if (user.isSuperAdmin) throw new HttpError(400, 'CANNOT_MODIFY_SUPER_ADMIN', 'Baş adminin hesabını buradan dəyişmək olmaz.')
  return user
}

adminAdminsRouter.get('/admins', async (req, res) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    orderBy: [{ isSuperAdmin: 'desc' }, { createdAt: 'asc' }],
  })
  res.json({ admins: admins.map(adminView) })
})

// Yeni admin hesabı
adminAdminsRouter.post('/admins', async (req, res) => {
  const { password, permissions, ...data } = adminCreateSchema.parse(req.body)
  await assertUnique(data)
  const user = await prisma.user.create({
    data: { ...data, role: 'ADMIN', isSuperAdmin: false, permissions, passwordHash: await hashPassword(password) },
  })
  res.status(201).json({ admin: adminView(user) })
})

// Saytda artıq qeydiyyatı olan istifadəçini admin etmək
adminAdminsRouter.post('/admins/promote', async (req, res) => {
  const { userId, permissions } = adminPromoteSchema.parse(req.body)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'İstifadəçi tapılmadı.')
  if (user.role === 'ADMIN') throw new HttpError(409, 'ALREADY_ADMIN', 'Bu istifadəçi artıq admindir.')
  if (user.blockedAt) throw new HttpError(400, 'USER_BLOCKED', 'Bloklanmış istifadəçini admin etmək olmaz — əvvəl bloku aç.')
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: 'ADMIN', isSuperAdmin: false, permissions },
  })
  res.json({ admin: adminView(updated) })
})

// İcazələr, blok, yeni şifrə
adminAdminsRouter.patch('/admins/:id', async (req, res) => {
  const { permissions, blocked, password } = adminUpdateSchema.parse(req.body)
  const admin = await findManagedAdmin(req.params.id)

  const data = {}
  if (permissions) data.permissions = permissions
  if (blocked !== undefined) data.blockedAt = blocked ? (admin.blockedAt ?? new Date()) : null
  if (password) {
    data.passwordHash = await hashPassword(password)
    data.passwordChangedAt = passwordChangeMoment() // köhnə sessiyaları bağlayır
  }

  const updated = await prisma.user.update({ where: { id: admin.id }, data })
  res.json({ admin: adminView(updated) })
})

// Adminlikdən çıxar: hesab adi istifadəçi kimi qalır, icazələri silinir
adminAdminsRouter.post('/admins/:id/demote', async (req, res) => {
  const admin = await findManagedAdmin(req.params.id)
  const updated = await prisma.user.update({
    where: { id: admin.id },
    data: { role: 'USER', permissions: [] },
  })
  res.json({ user: publicUser(updated) })
})

// Admin hesabını tam silmək (komandaları və profil şəkli ilə)
adminAdminsRouter.delete('/admins/:id', async (req, res) => {
  const admin = await findManagedAdmin(req.params.id)
  await prisma.$transaction(async (tx) => {
    await tx.user.delete({ where: { id: admin.id } })
    if (admin.avatarId) await tx.image.delete({ where: { id: admin.avatarId } })
  })
  res.status(204).end()
})
