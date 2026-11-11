import { z } from 'zod'
import { ADMIN_PERMISSIONS } from './permissions.js'

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

// Emailə gələn 6 rəqəmli kod
const emailCode = z
  .string({ error: 'Emailə gələn kodu yaz.' })
  .trim()
  .regex(/^\d{6}$/, 'Emailə gələn 6 rəqəmli kodu yaz.')
const mailLang = z.enum(['az', 'en', 'ru']).catch('az').default('az') // məktubun dili

// Saytdakı qeydiyyat forması: + təsdiq məktubunun dili (admin hesab yaradanda lazım deyil)
export const registerRequestSchema = registerSchema.extend({ lang: mailLang })

export const registerVerifySchema = z.object({ email, code: emailCode })
export const registerResendSchema = z.object({ email, lang: mailLang })
export const passwordForgotSchema = z.object({ email, lang: mailLang })
export const passwordResetSchema = z.object({ email, code: emailCode, newPassword: password })

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

// Email dəyişmək — hesabın girişi olduğu üçün hazırkı şifrə ilə təsdiqlənir
export const emailChangeSchema = z.object({
  email,
  currentPassword: z.string({ error: 'Hazırkı şifrəni yaz.' }).min(1, 'Hazırkı şifrəni yaz.'),
})

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
  // "//başqa-sayt" və "/\başqa-sayt" brauzerdə başqa sayta aparır — saytın öz yolu sayılmır
  .refine(
    (v) => v === null || (v.startsWith('/') && !v.startsWith('//') && !v.includes('\\')) || /^https:\/\/[^\s\\]+$/.test(v),
    'Link "/" (saytın öz səhifəsi) və ya "https://" ilə başlamalıdır.',
  )

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

// İstifadəçilər bölməsindən yeni hesab — həmişə adi istifadəçi (adminlər "Adminlər" bölməsindən yaradılır)
export const userAdminCreateSchema = registerSchema

export const userAdminUpdateSchema = z.object({
  blocked: z.boolean({ error: 'blocked true/false olmalıdır.' }),
})

// ---------- Adminlər (yalnız baş admin) ----------

const permissionList = z
  .array(z.enum(ADMIN_PERMISSIONS, { error: 'Belə bölmə yoxdur.' }), { error: 'İcazələr siyahı olmalıdır.' })
  .max(ADMIN_PERMISSIONS.length)
  .transform((list) => [...new Set(list)])

export const adminCreateSchema = registerSchema.extend({ permissions: permissionList.default([]) })

// Mövcud istifadəçini admin etmək
export const adminPromoteSchema = z.object({
  userId: z.string({ error: 'İstifadəçini seç.' }).trim().min(1).max(40),
  permissions: permissionList.default([]),
})

export const adminUpdateSchema = z
  .object({
    permissions: permissionList,
    blocked: z.boolean({ error: 'blocked true/false olmalıdır.' }),
    password, // yeni şifrə (admin unudubsa) — köhnə sessiyaları da bağlayır
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
  // Bot tələsi: formada gizli sahədir, insan onu görmür və doldurmur
  website: z.string().max(200).optional(),
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

// ---------- Günün hesabatı (seanslar) ----------

const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarix YYYY-MM-DD formasında olmalıdır.')

// Statistika: günlük (bir ayın günləri) və ya aylıq (bir ilin ayları)
export const statsQuerySchema = z.object({
  view: z.enum(['daily', 'monthly']).catch('daily').default('daily'),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().catch(undefined),
  year: z.string().regex(/^\d{4}$/).optional().catch(undefined),
})

// Yükləmə (PDF/Excel): tarix aralığındakı bütün seanslar
export const exportQuerySchema = z
  .object({
    from: z.string({ error: 'Başlanğıc tarixi seç.' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarix YYYY-MM-DD formasında olmalıdır.'),
    to: z.string({ error: 'Son tarixi seç.' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarix YYYY-MM-DD formasında olmalıdır.'),
  })
  .refine((q) => q.from <= q.to, { path: ['to'], message: 'Son tarix başlanğıcdan əvvəl ola bilməz.' })
  .refine((q) => (Date.parse(q.to) - Date.parse(q.from)) / 86_400_000 <= 366, {
    path: ['to'],
    message: 'Ən çox 1 illik aralıq seçmək olar.',
  })

export const visitListQuerySchema = z.object({
  day: dayString.optional().catch(undefined),
})

const visitName = z
  .string({ error: 'Müştərinin adını yaz.' })
  .trim()
  .min(1, 'Müştərinin adını yaz.')
  .max(80, 'Ad ən çox 80 simvol ola bilər.')

const visitNote = z.string().trim().max(300, 'Qeyd ən çox 300 simvol ola bilər.')

const visitPeople = z
  .number({ error: 'Nəfər sayını yaz.' })
  .int('Nəfər sayı tam ədəd olmalıdır.')
  .min(1, 'Ən az 1 nəfər.')
  .max(50, 'Ən çox 50 nəfər.')

const visitStudents = z
  .number({ error: 'Tələbə sayını yaz.' })
  .int('Tələbə sayı tam ədəd olmalıdır.')
  .min(0, 'Mənfi ola bilməz.')
  .max(50, 'Ən çox 50 nəfər.')

const visitKind = z.enum(['hall', 'room'], { error: 'Seansın növünü seç: ümumi zal və ya kino otağı.' })

const visitTime = (label) => z.coerce.date({ error: `${label} düzgün deyil.` })

// Beh: əvvəlcədən alınan məbləğ və ödəniş üsulu (nağd / kart)
const visitDeposit = z.object({
  amount: z
    .number({ error: 'Behin məbləğini yaz.' })
    .positive('Beh 0-dan böyük olmalıdır.')
    .max(1000, 'Ən çox 1000 ₼.')
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Ən çox 2 onluq rəqəm (məs. 10.50).'),
  method: z.enum(['cash', 'card'], { error: 'Behin ödəniş üsulunu seç: nağd və ya kart.' }),
})

// Admin verən xüsusi endirim: faizlə (1–100) və ya manatla
const visitDiscount = z
  .object({
    type: z.enum(['percent', 'amount'], { error: 'Endirimin növünü seç: faiz və ya manat.' }),
    value: z
      .number({ error: 'Endirimi yaz.' })
      .positive('Endirim 0-dan böyük olmalıdır.')
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Ən çox 2 onluq rəqəm (məs. 2.50).'),
  })
  .superRefine((d, ctx) => {
    if (d.type === 'percent' && d.value > 100) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Faiz ən çox 100 ola bilər.' })
    if (d.type === 'amount' && d.value > 1000) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Ən çox 1000 ₼.' })
  })

// Sifarişdəki nəfər: Club üzvü (userId) və ya qonaq (userId yoxdur); id — mövcud nəfər (düzəlişdə)
const visitPerson = z.object({
  id: z.string().trim().min(1).max(40).optional(),
  userId: z.string().trim().min(1).max(40).nullable().optional(),
  student: z.boolean().optional(),
  // Hədiyyə çarxının hədiyyəsi bu nəfərə endirim kimi (null — götür; yazılmasa — olduğu kimi qalır)
  spinId: z.string().trim().min(1).max(40).nullable().optional(),
})
const visitPersons = z.array(visitPerson).min(1, 'Sifarişdə ən az bir nəfər olmalıdır.').max(50, 'Ən çox 50 nəfər.')

// Nəfərlər (persons) — üzvlər və qonaqlar; köhnə forma: qeydiyyatlı istifadəçi (userId) və ya yalnız ad + nəfər sayı.
// startedAt yazılmasa — indi.
export const visitCreateSchema = z
  .object({
    persons: visitPersons.optional(),
    userId: z.string().trim().min(1).max(40).optional(),
    name: visitName.optional(),
    kind: visitKind.optional(),
    people: visitPeople.optional(),
    students: visitStudents.optional(),
    promoCode: promoCodeValue.optional(),
    discount: visitDiscount.optional(),
    deposit: visitDeposit.optional(),
    startedAt: visitTime('Başlama vaxtı').optional(),
    note: visitNote.optional(),
  })
  .refine((v) => v.userId || v.name || v.persons?.some((p) => p.userId), {
    path: ['name'],
    message: 'Müştərinin adını yaz və ya qeydiyyatlı istifadəçini seç.',
  })

const paymentMethod = z.enum(['cash', 'card'], { error: 'Ödəniş üsulunu seç: nağd və ya kart.' })
// Hər nəfərin ödəniş üsulu: { nəfərinId: "cash" | "card" }
const personPayments = z.record(z.string().min(1).max(40), paymentMethod)

export const visitEndSchema = z
  .object({ paymentMethod: paymentMethod.optional(), payments: personPayments.optional() })
  .refine((v) => v.paymentMethod || (v.payments && Object.keys(v.payments).length), {
    path: ['paymentMethod'],
    message: 'Ödəniş üsulunu seç: nağd və ya kart.',
  })

export const visitUpdateSchema = z.object({
  persons: visitPersons.optional(),
  payments: personPayments.optional(),
  paymentMethod: paymentMethod.optional(),
  people: visitPeople.optional(),
  kind: visitKind.optional(),
  students: visitStudents.optional(),
  promoCode: promoCodeValue.nullable().optional(),
  discount: visitDiscount.nullable().optional(), // null — sil
  deposit: visitDeposit.nullable().optional(), // null — sil
  name: visitName.optional(),
  startedAt: visitTime('Başlama vaxtı').optional(),
  endedAt: visitTime('Bitmə vaxtı').optional(),
  note: visitNote.nullable().optional(),
})
