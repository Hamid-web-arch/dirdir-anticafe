import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

// Bütün xətalar eyni formada qayıdır: { error: { message, fields? } }
export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: { message: 'Belə ünvan yoxdur.' } })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const fields = {}
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_'
      fields[key] ??= issue.message
    }
    return res.status(400).json({ error: { message: 'Məlumatlar düzgün deyil.', fields } })
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { message: err.message, fields: err.fields } })
  }

  // Yanlış formatlı JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'JSON düzgün deyil.' } })
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ error: { message: 'Tapılmadı.' } })
    // Unikal sahə toqquşması (məs. eyni anda iki eyni email ilə qeydiyyat)
    if (err.code === 'P2002') return res.status(409).json({ error: { message: 'Bu məlumatla artıq qeyd var.' } })
  }

  console.error(err)
  res.status(500).json({ error: { message: 'Serverdə xəta baş verdi.' } })
}
