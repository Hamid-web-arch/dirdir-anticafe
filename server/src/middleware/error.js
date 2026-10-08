import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

// Bütün xətalar eyni formada qayıdır: { error: { code, message, fields?, fieldCodes? } }
// `message` azərbaycanca, `code` isə saytın xətanı istifadəçinin dilində göstərməsi üçündür.
export class HttpError extends Error {
  constructor(status, code, message, { fields, fieldCodes } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
    this.fieldCodes = fieldCodes
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Belə ünvan yoxdur.' } })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const fields = {}
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_'
      fields[key] ??= issue.message
    }
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'Məlumatlar düzgün deyil.', fields } })
  }

  if (err instanceof HttpError) {
    const { code, message, fields, fieldCodes } = err
    return res.status(err.status).json({ error: { code, message, fields, fieldCodes } })
  }

  // Yanlış formatlı JSON və ya çox böyük fayl
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'JSON düzgün deyil.' } })
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'IMAGE_TOO_LARGE', message: 'Fayl çox böyükdür (ən çox 10 MB).' } })
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tapılmadı.' } })
    // Unikal sahə toqquşması (məs. eyni anda iki eyni email ilə qeydiyyat)
    if (err.code === 'P2002')
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Bu məlumatla artıq qeyd var.' } })
  }

  console.error(err)
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Serverdə xəta baş verdi.' } })
}
