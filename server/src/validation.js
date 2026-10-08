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

const password = z
  .string({ error: 'Şifrəni yaz.' })
  .min(MIN_PASSWORD, `Şifrə ən azı ${MIN_PASSWORD} simvol olmalıdır.`)
  .max(72, 'Şifrə ən çox 72 simvol ola bilər.') // bcrypt 72 baytdan sonrasını nəzərə almır

export const registerSchema = z.object({
  firstName: name('Adını'),
  lastName: name('Soyadını'),
  email,
  phone,
  password,
  // Yeniliklərdən xəbərdar olmaq istəyir (formada standart olaraq açıqdır)
  newsletter: z.boolean().default(false),
})

// Giriş: email və ya telefon nömrəsi bir sahədə ("login"). Köhnə klientlər üçün "email" sahəsi də qəbul olunur.
// "@" varsa email kimi, yoxdursa telefon kimi axtarılır.
export const loginSchema = z.preprocess(
  (body) => (body && typeof body === 'object' && body.login === undefined ? { ...body, login: body.email } : body),
  z.object({
    login: z
      .string({ error: 'Email və ya telefon nömrəsini yaz.' })
      .trim()
      .min(1, 'Email və ya telefon nömrəsini yaz.')
      .max(100)
      .transform((v) =>
        v.includes('@') ? { email: v.toLowerCase() } : { phone: v.replace(/\D/g, '').replace(/^994/, '').replace(/^0/, '') },
      ),
    password: z.string({ error: 'Şifrəni yaz.' }).min(1, 'Şifrəni yaz.'),
  }),
)

export const profileUpdateSchema = z
  .object({ firstName: name('Adını'), lastName: name('Soyadını'), phone, newsletter: z.boolean() })
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Dəyişiklik yoxdur.')

export const passwordChangeSchema = z.object({
  currentPassword: z.string({ error: 'Köhnə şifrəni yaz.' }).min(1, 'Köhnə şifrəni yaz.'),
  newPassword: password,
})

// ---------- Çoxdilli mətnlər: { az, en, ru } ----------
// az məcburidir (əsas dil); en/ru boş qala bilər — sayt onda az-a qayıdır.
const optionalText = (max) => z.string().trim().max(max).default('')

const localized = (max, label) =>
  z.object({
    az: z
      .string({ error: `${label} (az) yaz.` })
      .trim()
      .min(1, `${label} (az) yaz.`)
      .max(max),
    en: optionalText(max),
    ru: optionalText(max),
  })

const localizedOptional = (max) => z.object({ az: optionalText(max), en: optionalText(max), ru: optionalText(max) })

// ---------- Yarışlar ----------
export const COMPETITION_STATUSES = ['UPCOMING', 'ONGOING', 'FINISHED']

// Hədiyyələr: hər yer üçün bir hədiyyə; yerlər təkrarlanmır, yerə görə sıralanır.
const prizes = z
  .array(
    z.object({
      place: z.number({ error: 'Yeri yaz.' }).int('Yer tam ədəd olmalıdır.').min(1, 'Yer 1-dən başlayır.').max(100),
      title: localized(120, 'Hədiyyəni'),
    }),
  )
  .max(20, 'Ən çox 20 hədiyyə.')
  .refine((list) => new Set(list.map((p) => p.place)).size === list.length, 'Eyni yer iki dəfə yazılıb.')
  .transform((list) => [...list].sort((a, b) => a.place - b.place))

export const competitionCreateSchema = z.object({
  title: localized(80, 'Yarışın adını'),
  description: localizedOptional(1000).default({ az: '', en: '', ru: '' }),
  startsAt: z.coerce.date({ error: 'Tarixi yaz.' }),
  status: z.enum(COMPETITION_STATUSES).default('UPCOMING'),
  registrationOpen: z.boolean().default(true),
  maxTeams: z.number().int().min(2).max(500).nullable().optional(),
  prizes: prizes.default([]),
})

export const competitionUpdateSchema = z
  .object({
    title: localized(80, 'Yarışın adını'),
    description: localizedOptional(1000),
    startsAt: z.coerce.date(),
    status: z.enum(COMPETITION_STATUSES),
    registrationOpen: z.boolean(),
    maxTeams: z.number().int().min(2).max(500).nullable(),
    prizes,
  })
  .partial()

export const joinSchema = z.object({
  teamName: z
    .string({ error: 'Komanda adını yaz.' })
    .trim()
    .transform((v) => v.replace(/\s+/g, ' '))
    .pipe(
      z
        .string()
        .min(2, 'Komanda adı ən azı 2 simvol olmalıdır.')
        .max(40, 'Komanda adı ən çox 40 simvol ola bilər.'),
    ),
})

export const pointsSchema = z.object({
  amount: z
    .number({ error: 'Xal miqdarını yaz.' })
    .int('Xal tam ədəd olmalıdır.')
    .min(-10000)
    .max(10000)
    .refine((n) => n !== 0, 'Xal 0 ola bilməz.'),
  reason: z.string({ error: 'Səbəbi yaz.' }).trim().min(1, 'Səbəbi yaz.').max(200),
})

// ---------- Slider ----------
// Link: saytın öz səhifəsi ("/arena", "/#menu") və ya https ünvan; boş = "Ətraflı bax" yoxdur.
const slideLink = z
  .string()
  .trim()
  .max(300)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || v.startsWith('/') || /^https:\/\/\S+$/.test(v), 'Link "/" və ya "https://" ilə başlamalıdır.')

export const slideCreateSchema = z.object({
  imageId: z.string({ error: 'Şəkil yüklə.' }).min(1, 'Şəkil yüklə.'),
  fit: z.enum(['cover', 'contain']).default('cover'),
  title: localized(80, 'Başlığı'),
  desc: localizedOptional(300).default({ az: '', en: '', ru: '' }),
  body: localizedOptional(5000).default({ az: '', en: '', ru: '' }),
  link: slideLink,
  active: z.boolean().default(true),
})

export const slideUpdateSchema = z
  .object({
    imageId: z.string().min(1),
    fit: z.enum(['cover', 'contain']),
    title: localized(80, 'Başlığı'),
    desc: localizedOptional(300),
    body: localizedOptional(5000),
    link: slideLink,
    active: z.boolean(),
  })
  .partial()

export const slideOrderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

// ---------- Promokodlar ----------
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
  percent: z
    .number({ error: 'Faizi yaz.' })
    .int()
    .min(1, 'Faiz 1–100 arası olmalıdır.')
    .max(100, 'Faiz 1–100 arası olmalıdır.'),
  active: z.boolean().default(true),
  expiresAt: z.coerce.date().nullable().optional(),
})

export const promoUpdateSchema = promoCreateSchema.partial()


// ---------- İstifadəçilər (admin) ----------
export const userListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['USER', 'ADMIN']).optional().catch(undefined),
  status: z.enum(['active', 'blocked']).optional().catch(undefined),
  joined: z.enum(['yes', 'no']).optional().catch(undefined), // heç olmasa bir yarışa qoşulub / qoşulmayıb
  newsletter: z.enum(['yes', 'no']).optional().catch(undefined), // yeniliklərdən xəbərdar olmaq istəyir
  competitionId: z.string().trim().min(1).max(40).optional(),
  sort: z.enum(['new', 'old', 'name']).catch('new').default('new'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const ROLES = ['USER', 'ADMIN']

// Admin paneldən yeni hesab: qeydiyyat qaydaları + rol
export const userAdminCreateSchema = registerSchema.extend({
  role: z.enum(ROLES).default('USER'),
})

export const userAdminUpdateSchema = z
  .object({
    blocked: z.boolean({ error: 'blocked true/false olmalıdır.' }),
    role: z.enum(ROLES, { error: 'Rol USER və ya ADMIN olmalıdır.' }),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Dəyişiklik yoxdur.')

// ---------- Lövhə dövrü ----------
export const LEADERBOARD_PERIODS = ['week', 'month', 'all']
export const periodQuerySchema = z.object({
  period: z.enum(LEADERBOARD_PERIODS).catch('all').default('all'),
})

// ---------- Oyunlar ----------
const shortText = z
  .string()
  .trim()
  .max(30)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null))

export const gameCreateSchema = z.object({
  imageId: z.string({ error: 'Şəkil yüklə.' }).min(1, 'Şəkil yüklə.'),
  title: localized(80, 'Oyunun adını'),
  summary: localizedOptional(300).default({ az: '', en: '', ru: '' }),
  howTo: localizedOptional(5000).default({ az: '', en: '', ru: '' }),
  players: shortText,
  duration: shortText,
  age: shortText,
  active: z.boolean().default(true),
})

export const gameUpdateSchema = z
  .object({
    imageId: z.string().min(1),
    title: localized(80, 'Oyunun adını'),
    summary: localizedOptional(300),
    howTo: localizedOptional(5000),
    players: shortText,
    duration: shortText,
    age: shortText,
    active: z.boolean(),
  })
  .partial()

export const orderSchema = z.object({ ids: z.array(z.string().min(1)).min(1) })

// ---------- Rəy və təkliflər ----------
export const feedbackSchema = z.object({
  name: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  contact: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || null),
  message: z
    .string({ error: 'Mesajı yaz.' })
    .trim()
    .min(5, 'Mesaj ən azı 5 simvol olmalıdır.')
    .max(2000, 'Mesaj ən çox 2000 simvol ola bilər.'),
})

export const feedbackUpdateSchema = z.object({ read: z.boolean() })

// ---------- Xəbər göndərmək ----------
export const broadcastSchema = z
  .object({
    channel: z.enum(['email', 'whatsapp'], { error: 'Kanalı seç.' }),
    subject: z.string().trim().max(150).default(''),
    body: z.string({ error: 'Mətni yaz.' }).trim().min(1, 'Mətni yaz.').max(5000),
    // Boşdursa — bütün abunəçilər; doludursa — yalnız seçilənlər (onlar da abunəçi olmalıdır)
    userIds: z.array(z.string().min(1)).max(5000).optional(),
  })
  .refine((d) => d.channel !== 'email' || d.subject.length > 0, { message: 'Mövzunu yaz.', path: ['subject'] })

// ---------- Saytın şəkilləri ----------
export const SITE_IMAGE_KEYS = ['login', 'register']
