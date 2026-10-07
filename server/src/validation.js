import { z } from 'zod'

// Qaydalar frontend-dəki formalarla eynidir (src/pages/Register.jsx).
export const OPERATOR_CODES = ['10', '50', '51', '55', '60', '70', '77', '99']
export const MIN_PASSWORD = 8

const name = (label) =>
  z
    .string({ error: `${label} yaz.` })
    .trim()
    .min(1, `${label} yaz.`)
    .max(50, `${label} ən çox 50 simvol ola bilər.`)

const email = z
  .string({ error: 'Düzgün email ünvanı yaz.' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Düzgün email ünvanı yaz.'))

// "+994 50 123 45 67", "050-123-45-67", "501234567" → "501234567"
const phone = z
  .string({ error: 'Nömrəni yaz.' })
  .transform((v) => {
    let digits = v.replace(/\D/g, '')
    if (digits.startsWith('994')) digits = digits.slice(3)
    if (digits.startsWith('0')) digits = digits.slice(1)
    return digits
  })
  .refine((d) => d.length === 9 && OPERATOR_CODES.includes(d.slice(0, 2)), 'Nömrəni tam yaz, məs. 50 123 45 67.')

export const registerSchema = z.object({
  firstName: name('Adını'),
  lastName: name('Soyadını'),
  email,
  phone,
  password: z
    .string({ error: 'Şifrəni yaz.' })
    .min(MIN_PASSWORD, `Şifrə ən azı ${MIN_PASSWORD} simvol olmalıdır.`)
    .max(72, 'Şifrə ən çox 72 simvol ola bilər.'), // bcrypt 72 baytdan sonrasını nəzərə almır
})

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Şifrəni yaz.' }).min(1, 'Şifrəni yaz.'),
})

const promoCodeValue = z
  .string({ error: 'Kodu yaz.' })
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,32}$/, 'Kod 3–32 simvol olmalıdır: hərf, rəqəm, - və _.')

export const promoValidateSchema = z.object({
  code: z.string({ error: 'Kodu yaz.' }).trim().toUpperCase().min(1, 'Kodu yaz.').max(32),
})

export const promoCreateSchema = z.object({
  code: promoCodeValue,
  percent: z.number({ error: 'Faizi yaz.' }).int().min(1, 'Faiz 1–100 arası olmalıdır.').max(100, 'Faiz 1–100 arası olmalıdır.'),
  active: z.boolean().default(true),
  expiresAt: z.coerce.date().nullable().optional(),
})

export const promoUpdateSchema = promoCreateSchema.partial()

export const pointsSchema = z.object({
  amount: z
    .number({ error: 'Xal miqdarını yaz.' })
    .int('Xal tam ədəd olmalıdır.')
    .min(-10000)
    .max(10000)
    .refine((n) => n !== 0, 'Xal 0 ola bilməz.'),
  reason: z.string({ error: 'Səbəbi yaz.' }).trim().min(1, 'Səbəbi yaz.').max(200),
})

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
